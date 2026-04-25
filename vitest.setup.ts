// vitest.setup.ts
import { vi } from 'vitest'

// Mock do Prisma para testes unitários (não toca no banco real)
vi.mock('@licitabr/database', () => ({
  prisma: {
    usuario:      { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    licitacao:    { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    alertaConfig: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    notificacao:  { create: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
    favorito:     { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    sessao:       { create: vi.fn(), deleteMany: vi.fn() },
    scraperLog:   { create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
    $queryRaw:    vi.fn(() => Promise.resolve([{ '?column?': 1 }])),
    $disconnect:  vi.fn(),
  },
  Portal:     { PNCP: 'PNCP', BLL: 'BLL', BNC: 'BNC', COMPRASNET: 'COMPRASNET' },
  Modalidade: { PREGAO_ELETRONICO: 'PREGAO_ELETRONICO', CONCORRENCIA: 'CONCORRENCIA' },
  Situacao:   { ABERTA: 'ABERTA', SUSPENSA: 'SUSPENSA', ENCERRADA: 'ENCERRADA' },
  Esfera:     { FEDERAL: 'FEDERAL', ESTADUAL: 'ESTADUAL', MUNICIPAL: 'MUNICIPAL' },
  Poder:      { EXECUTIVO: 'EXECUTIVO' },
}))

// Mock do SendGrid
vi.mock('@sendgrid/mail', () => ({
  default: { setApiKey: vi.fn(), send: vi.fn(() => Promise.resolve()) },
}))

// Variáveis de ambiente para testes
process.env.JWT_SECRET     = 'test-secret-vitest'
process.env.NODE_ENV       = 'test'
process.env.REDIS_URL      = 'redis://localhost:6379'
process.env.DATABASE_URL   = 'postgresql://licitabr:senha@localhost:5432/licitabr_test'
