// apps/web/src/lib/sentry.ts
'use client'
import * as Sentry from '@sentry/nextjs'

export function initSentryClient() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment:      process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    integrations: [Sentry.replayIntegration()],
    beforeSend(event) {
      // Ignora erros de extensões de browser
      if (event.exception?.values?.some((v) =>
        v.stacktrace?.frames?.some((f) => f.filename?.includes('extension'))
      )) return null
      return event
    },
  })
}

export function captureFrontendError(err: unknown, context?: Record<string, unknown>) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(err, { extra: context })
  }
  console.error('[FrontendError]', err, context)
}
