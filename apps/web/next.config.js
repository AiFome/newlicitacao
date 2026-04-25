/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Impede que a página seja embutida em iframes externos (proteção contra clickjacking)
  { key: 'X-Frame-Options',        value: 'SAMEORIGIN' },
  // Impede sniffing de MIME type
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Controla informações enviadas no Referer
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  // HSTS — força HTTPS por 1 ano em produção
  ...(process.env.NODE_ENV === 'production' ? [{
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  }] : []),
  // Permissions Policy — desativa features não usadas
  {
    key: 'Permissions-Policy',
    value: [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'interest-cohort=()',  // desativa FLoC
    ].join(', '),
  },
  // Content Security Policy básico
  // Nota: ajuste os domínios conforme os serviços que você usa
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // Next.js requer unsafe-eval em dev
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' ws: wss: https://api.stripe.com https://sentry.io https://*.sentry.io",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@licitabr/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'pncp.gov.br' },
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
    ],
  },
  async headers() {
    return [
      {
        // Aplica os security headers em todas as rotas
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  async redirects() {
    return [
      { source: '/', destination: '/landing', permanent: false },
    ]
  },
  async rewrites() {
    return [
      {
        source:      '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
