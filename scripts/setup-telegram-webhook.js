#!/usr/bin/env node
// scripts/setup-telegram-webhook.js
//
// Registra a URL do webhook no Telegram para que o bot receba mensagens.
// Execute UMA VEZ após o deploy:
//
//   node scripts/setup-telegram-webhook.js
//   node scripts/setup-telegram-webhook.js --remove   (remove o webhook)
//   node scripts/setup-telegram-webhook.js --info     (mostra configuração atual)

const TOKEN    = process.env.TELEGRAM_BOT_TOKEN
const API_URL  = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'https://api.licitabr.com.br'
const WEBHOOK  = `${API_URL}/v1/webhooks/telegram`
const TG_BASE  = `https://api.telegram.org/bot${TOKEN}`

async function main() {
  if (!TOKEN) {
    console.error('❌  TELEGRAM_BOT_TOKEN não definido no ambiente.')
    console.error('    Exporte a variável e tente novamente:\n')
    console.error('    TELEGRAM_BOT_TOKEN=xxx node scripts/setup-telegram-webhook.js\n')
    process.exit(1)
  }

  const arg = process.argv[2]

  if (arg === '--remove') {
    const resp = await fetch(`${TG_BASE}/deleteWebhook`)
    const data = await resp.json()
    console.log(data.ok ? '✅  Webhook removido.' : `❌  Erro: ${data.description}`)
    return
  }

  if (arg === '--info') {
    const resp = await fetch(`${TG_BASE}/getWebhookInfo`)
    const data = await resp.json()
    console.log('ℹ️   Configuração atual:\n')
    console.log(JSON.stringify(data.result, null, 2))
    return
  }

  // Registra o webhook
  console.log(`🔗  Registrando webhook: ${WEBHOOK}\n`)

  const resp = await fetch(`${TG_BASE}/setWebhook`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url:             WEBHOOK,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: true,  // ignora mensagens acumuladas antes do webhook
    }),
  })

  const data = await resp.json()

  if (data.ok) {
    console.log('✅  Webhook registrado com sucesso!\n')
    console.log(`    URL:    ${WEBHOOK}`)
    console.log(`    Bot ID: ${TOKEN.split(':')[0]}`)

    // Verifica para confirmar
    const info = await fetch(`${TG_BASE}/getWebhookInfo`)
    const infoData = await info.json()
    if (infoData.result?.last_error_message) {
      console.warn(`\n⚠️   Último erro: ${infoData.result.last_error_message}`)
      console.warn('    Verifique se a URL é acessível publicamente (HTTPS).')
    }
  } else {
    console.error(`❌  Erro ao registrar: ${data.description}`)
    process.exit(1)
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
