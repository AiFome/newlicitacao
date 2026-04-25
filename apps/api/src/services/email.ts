// apps/api/src/services/email.ts
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

interface LicitacaoResumida {
  id: string
  titulo: string
  objeto: string
  modalidade: string
  valorEstimado: unknown
  dataAbertura: Date
  uf: string
  linkEdital: string
  orgao: { razaoSocial: string }
}

function formatMoeda(valor: unknown): string {
  if (!valor) return 'Não informado'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor))
}

function formatData(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(data))
}

function templateAlerta(licitacao: LicitacaoResumida): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Novo Edital — LicitaBR</title>
</head>
<body style="margin:0;padding:0;background:#f4f3ef;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e0d8">

          <!-- Header -->
          <tr>
            <td style="background:#1a4731;padding:24px 32px">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:600;letter-spacing:-0.3px">LicitaBR</p>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px">Novo edital encontrado para seu alerta</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px">
              <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#1a1a18;line-height:1.4">
                ${licitacao.titulo}
              </h2>
              <p style="margin:0 0 24px;font-size:14px;color:#6b6960;line-height:1.6">
                ${licitacao.objeto.substring(0, 300)}${licitacao.objeto.length > 300 ? '...' : ''}
              </p>

              <!-- Dados grid -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3ef;border-radius:8px;overflow:hidden">
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #e2e0d8">
                    <p style="margin:0;font-size:11px;color:#6b6960;text-transform:uppercase;letter-spacing:.6px">Órgão</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#1a1a18;font-weight:500">${licitacao.orgao.razaoSocial}</p>
                  </td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e2e0d8;border-left:1px solid #e2e0d8">
                    <p style="margin:0;font-size:11px;color:#6b6960;text-transform:uppercase;letter-spacing:.6px">Modalidade</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#1a1a18;font-weight:500">${licitacao.modalidade.replace(/_/g, ' ')}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px">
                    <p style="margin:0;font-size:11px;color:#6b6960;text-transform:uppercase;letter-spacing:.6px">Valor estimado</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#1a1a18;font-weight:500">${formatMoeda(licitacao.valorEstimado)}</p>
                  </td>
                  <td style="padding:12px 16px;border-left:1px solid #e2e0d8">
                    <p style="margin:0;font-size:11px;color:#6b6960;text-transform:uppercase;letter-spacing:.6px">Abertura</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#1a1a18;font-weight:500">${formatData(licitacao.dataAbertura)} — ${licitacao.uf}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <div style="margin-top:24px;text-align:center">
                <a href="${process.env.NEXT_PUBLIC_API_URL?.replace('3001', '3000')}/licitacoes/${licitacao.id}"
                   style="display:inline-block;background:#1a4731;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:500">
                  Ver edital completo
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e2e0d8;background:#f4f3ef">
              <p style="margin:0;font-size:12px;color:#6b6960;text-align:center">
                Você recebeu este e-mail porque configurou um alerta no LicitaBR.<br>
                <a href="${process.env.NEXT_PUBLIC_API_URL?.replace('3001', '3000')}/configuracoes/alertas"
                   style="color:#1a4731">Gerenciar alertas</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

export const emailService = {
  async enviarAlertaLicitacao(emailDestino: string, licitacao: LicitacaoResumida) {
    await sgMail.send({
      to: emailDestino,
      from: {
        email: process.env.EMAIL_FROM ?? 'alertas@licitabr.com.br',
        name:  process.env.EMAIL_FROM_NAME ?? 'LicitaBR',
      },
      subject: `📋 Novo edital: ${licitacao.titulo.substring(0, 60)}`,
      html: templateAlerta(licitacao),
    })
  },

  async enviarPagamentoRecusado(emailDestino: string, nome: string, tentativa: number) {
    const plural = tentativa > 1 ? `Esta é a ${tentativa}ª tentativa.` : ''
    await sgMail.send({
      to: emailDestino,
      from: { email: process.env.EMAIL_FROM ?? 'alertas@licitabr.com.br', name: process.env.EMAIL_FROM_NAME ?? 'LicitaBR' },
      subject: 'Problema com seu pagamento — LicitaBR',
      html: `
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f3ef;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e0d8">
      <tr><td style="background:#b45309;padding:24px 32px">
        <p style="margin:0;color:#fff;font-size:18px;font-weight:600">LicitaBR</p>
        <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px">Aviso de pagamento</p>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="font-size:15px;color:#1a1a18;margin:0 0 12px">Olá, ${nome}</p>
        <p style="font-size:14px;color:#6b6960;line-height:1.6;margin:0 0 16px">
          Não conseguimos processar o pagamento da sua assinatura LicitaBR. ${plural}
        </p>
        <p style="font-size:14px;color:#6b6960;line-height:1.6;margin:0 0 24px">
          Para evitar a interrupção do seu acesso, atualize seu método de pagamento clicando no botão abaixo.
        </p>
        <div style="text-align:center;margin-bottom:24px">
          <a href="${process.env.NEXT_PUBLIC_API_URL?.replace(':3001',':3000') ?? 'https://licitabr.com.br'}/configuracoes" 
             style="display:inline-block;background:#1a4731;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:500">
            Atualizar forma de pagamento
          </a>
        </div>
        <p style="font-size:12px;color:#6b6960;text-align:center;margin:0">
          Se precisar de ajuda, entre em contato: <a href="mailto:suporte@licitabr.com.br" style="color:#1a4731">suporte@licitabr.com.br</a>
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
    })
  },

  async enviarBoasVindas(emailDestino: string, nome: string) {
    await sgMail.send({
      to: emailDestino,
      from: { email: process.env.EMAIL_FROM ?? 'alertas@licitabr.com.br', name: process.env.EMAIL_FROM_NAME ?? 'LicitaBR' },
      subject: `Bem-vindo ao LicitaBR, ${nome}!`,
      html: `<p>Olá, ${nome}! Sua conta foi criada com sucesso. Acesse o painel e configure seus primeiros alertas.</p>`,
    })
  },

  async enviarResetSenha(emailDestino: string, nome: string, token: string) {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(':3001', ':3000') ?? 'http://localhost:3000'
    const link = `${base}/redefinir-senha?token=${token}`

    await sgMail.send({
      to: emailDestino,
      from: { email: process.env.EMAIL_FROM ?? 'alertas@licitabr.com.br', name: process.env.EMAIL_FROM_NAME ?? 'LicitaBR' },
      subject: 'Redefinição de senha — LicitaBR',
      html: `
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f3ef;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e0d8">
      <tr><td style="background:#1a4731;padding:24px 32px">
        <p style="margin:0;color:#fff;font-size:18px;font-weight:600">LicitaBR</p>
        <p style="margin:4px 0 0;color:rgba(255,255,255,.7);font-size:13px">Redefinição de senha</p>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="font-size:15px;color:#1a1a18;margin:0 0 12px">Olá, ${nome}</p>
        <p style="font-size:14px;color:#6b6960;line-height:1.6;margin:0 0 24px">
          Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.
          Este link expira em <strong>1 hora</strong>.
        </p>
        <div style="text-align:center;margin-bottom:24px">
          <a href="${link}" style="display:inline-block;background:#1a4731;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:500">
            Redefinir minha senha
          </a>
        </div>
        <p style="font-size:12px;color:#6b6960;text-align:center;margin:0">
          Se você não solicitou isso, ignore este e-mail. Sua senha não será alterada.
        </p>
        <p style="font-size:11px;color:#9a9890;text-align:center;margin:12px 0 0;word-break:break-all">
          Ou copie: ${link}
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
    })
  },

  async enviarVerificacaoEmail(emailDestino: string, nome: string, token: string) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('3000', '3001') ?? 'http://localhost:3001'
    const link    = `${apiBase}/v1/auth/verificar-email?token=${token}`

    await sgMail.send({
      to: emailDestino,
      from: { email: process.env.EMAIL_FROM ?? 'alertas@licitabr.com.br', name: process.env.EMAIL_FROM_NAME ?? 'LicitaBR' },
      subject: 'Confirme seu e-mail — LicitaBR',
      html: `
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f3ef;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e0d8">
      <tr><td style="background:#1a4731;padding:24px 32px">
        <p style="margin:0;color:#fff;font-size:18px;font-weight:600">LicitaBR</p>
        <p style="margin:4px 0 0;color:rgba(255,255,255,.7);font-size:13px">Confirme seu e-mail</p>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="font-size:15px;color:#1a1a18;margin:0 0 12px">Olá, ${nome} 👋</p>
        <p style="font-size:14px;color:#6b6960;line-height:1.6;margin:0 0 24px">
          Obrigado por criar sua conta no LicitaBR! Para começar a usar a plataforma, confirme seu e-mail clicando no botão abaixo.
        </p>
        <div style="text-align:center;margin-bottom:24px">
          <a href="${link}" style="display:inline-block;background:#1a4731;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:500">
            Confirmar meu e-mail
          </a>
        </div>
        <p style="font-size:12px;color:#6b6960;text-align:center;margin:0">
          Este link expira em 24 horas.
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
    })
  },
}
