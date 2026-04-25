// apps/api/src/services/telegram.ts

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const API_BASE  = `https://api.telegram.org/bot${BOT_TOKEN}`

async function send(method: string, body: Record<string, unknown>) {
  const resp = await fetch(`${API_BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Telegram API error: ${err}`)
  }
  return resp.json()
}

function formatMoeda(valor: unknown): string {
  if (!valor) return 'Não informado'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Number(valor))
}

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

export const telegramService = {
  async enviarAlerta(chatId: string, licitacao: LicitacaoResumida) {
    const data = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(licitacao.dataAbertura))

    const texto = [
      `📋 *Novo Edital — LicitaBR*`,
      ``,
      `*${licitacao.titulo}*`,
      ``,
      `🏛 ${licitacao.orgao.razaoSocial}`,
      `📌 ${licitacao.modalidade.replace(/_/g, ' ')} · ${licitacao.uf}`,
      `💰 ${formatMoeda(licitacao.valorEstimado)}`,
      `📅 Abertura: ${data}`,
      ``,
      `🔗 [Ver edital completo](${process.env.NEXT_PUBLIC_API_URL?.replace('3001', '3000')}/licitacoes/${licitacao.id})`,
    ].join('\n')

    await send('sendMessage', {
      chat_id: chatId,
      text: texto,
      parse_mode: 'Markdown',
      disable_web_page_preview: false,
    })
  },

  async enviarMensagemSimples(chatId: string, texto: string) {
    await send('sendMessage', {
      chat_id: chatId,
      text: texto,
      parse_mode: 'Markdown',
    })
  },

  /** Processa updates recebidos via webhook do Telegram */
  async processarUpdate(update: Record<string, unknown>) {
    const message = update.message as { chat?: { id: number }; text?: string } | undefined
    if (!message?.chat?.id || !message.text) return

    const chatId  = String(message.chat.id)
    const comando = message.text.trim()

    if (comando === '/start' || comando.startsWith('/start ')) {
      await send('sendMessage', {
        chat_id: chatId,
        text: [
          '👋 Olá! Sou o bot do *LicitaBR*.',
          '',
          'Para receber alertas aqui, acesse o painel e informe seu Chat ID: `' + chatId + '`',
          '',
          'Acesse: [licitabr.com.br/configuracoes](https://licitabr.com.br/configuracoes)',
        ].join('\n'),
        parse_mode: 'Markdown',
      })
    }
  },
}
