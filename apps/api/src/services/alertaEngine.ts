// apps/api/src/services/alertaEngine.ts
import { prisma } from '@licitabr/database'
import { emailService } from './email.js'
import { telegramService } from './telegram.js'
import { emitirParaUsuario } from '../routes/websocket.js'

/**
 * Verifica se uma licitação recém-coletada dispara algum alerta
 * configurado por usuários. Chamado pelo scraper após cada upsert.
 */
export async function processarAlertasParaLicitacao(licitacaoId: string) {
  const licitacao = await prisma.licitacao.findUniqueOrThrow({
    where: { id: licitacaoId },
    include: { orgao: { select: { razaoSocial: true } } },
  })

  // Busca todos os alertas ativos que têm intersecção com essa licitação
  const alertas = await prisma.alertaConfig.findMany({
    where: {
      ativo: true,
      // UF: se o alerta tem filtro de UF, precisa bater com a licitação
      OR: [
        { ufs: { isEmpty: true } },
        { ufs: { has: licitacao.uf } },
      ],
      usuario: { ativo: true, plano: { not: 'FREE' } },
    },
    include: { usuario: true },
  })

  const matches: { alertaId: string; usuarioId: string; canais: string[] }[] = []

  for (const alerta of alertas) {
    // Verifica modalidade
    if (alerta.modalidades.length > 0 && !alerta.modalidades.includes(licitacao.modalidade)) {
      continue
    }

    // Verifica portal
    if (alerta.portais.length > 0 && !alerta.portais.includes(licitacao.portalOrigem)) {
      continue
    }

    // Verifica valor
    if (alerta.valorMin && licitacao.valorEstimado !== null) {
      if (Number(licitacao.valorEstimado) < Number(alerta.valorMin)) continue
    }
    if (alerta.valorMax && licitacao.valorEstimado !== null) {
      if (Number(licitacao.valorEstimado) > Number(alerta.valorMax)) continue
    }

    // Verifica palavras-chave no objeto e título (case-insensitive)
    if (alerta.palavrasChave.length > 0) {
      const texto = `${licitacao.titulo} ${licitacao.objeto}`.toLowerCase()
      const matchKw = alerta.palavrasChave.some((kw) =>
        texto.includes(kw.toLowerCase())
      )
      if (!matchKw) continue
    }

    // Verifica se já foi notificado
    const jaNotificado = await prisma.notificacao.findFirst({
      where: { alertaId: alerta.id, licitacaoId, status: 'ENVIADO' },
    })
    if (jaNotificado) continue

    matches.push({
      alertaId: alerta.id,
      usuarioId: alerta.usuarioId,
      canais: alerta.canal,
    })
  }

  // Envia notificações
  for (const match of matches) {
    for (const canal of match.canais) {
      const notif = await prisma.notificacao.create({
        data: {
          usuarioId: match.usuarioId,
          licitacaoId,
          alertaId: match.alertaId,
          canal: canal as any,
          status: 'PENDENTE',
        },
        include: { usuario: true },
      })

      try {
        if (canal === 'EMAIL' && notif.usuario.notifEmail) {
          await emailService.enviarAlertaLicitacao(notif.usuario.email, licitacao)
        }

        if (canal === 'TELEGRAM' && notif.usuario.telegramChatId) {
          await telegramService.enviarAlerta(notif.usuario.telegramChatId, licitacao)
        }

        await prisma.notificacao.update({
          where: { id: notif.id },
          data: { status: 'ENVIADO', enviadoEm: new Date() },
        })

        // Emite em tempo real via WebSocket (best-effort)
        const alertaNome = (await prisma.alertaConfig.findUnique({
          where: { id: match.alertaId },
          select: { nome: true },
        }))?.nome ?? 'Alerta'

        emitirParaUsuario(match.usuarioId, {
          tipo: 'nova_licitacao',
          alertaNome,
          licitacao: {
            id:            licitacao.id,
            titulo:        licitacao.titulo,
            objeto:        licitacao.objeto.substring(0, 200),
            modalidade:    licitacao.modalidade,
            situacao:      licitacao.situacao,
            valorEstimado: licitacao.valorEstimado ? Number(licitacao.valorEstimado) : null,
            dataAbertura:  licitacao.dataAbertura.toISOString(),
            uf:            licitacao.uf,
            portalOrigem:  licitacao.portalOrigem,
            linkEdital:    licitacao.linkEdital,
            orgao:         { razaoSocial: licitacao.orgao.razaoSocial },
          },
        })
      } catch (err) {
        await prisma.notificacao.update({
          where: { id: notif.id },
          data: { status: 'FALHOU', erro: String(err) },
        })
        console.error(`[AlertaEngine] Erro ao enviar ${canal} para ${notif.usuario.email}:`, err)
      }
    }
  }

  return matches.length
}
