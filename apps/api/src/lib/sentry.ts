// apps/api/src/lib/sentry.ts
import * as Sentry from '@sentry/node'

export function initSentry() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn || process.env.NODE_ENV === 'test') return

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.nativeNodeFetchIntegration(),
    ],
    beforeSend(event) {
      // Remove dados sensíveis antes de enviar
      if (event.request?.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
      }
      return event
    },
  })
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, { extra: context })
  }
  console.error('[Error]', err, context)
}

export function captureMessage(msg: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(msg, level)
  }
}

export { Sentry }
