// apps/api/src/routes/__tests__/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { authRoutes } from '../auth.js'
import { prisma } from '@licitabr/database'
import bcrypt from 'bcryptjs'

// Mock bcrypt para acelerar os testes (não precisamos de hash real)
vi.mock('bcryptjs', () => ({
  default: {
    hash:    vi.fn(() => Promise.resolve('$hashed$')),
    compare: vi.fn(() => Promise.resolve(true)),
  },
}))

// Mock do emailService
vi.mock('../../services/email.js', () => ({
  emailService: {
    enviarVerificacaoEmail: vi.fn(() => Promise.resolve()),
    enviarResetSenha:       vi.fn(() => Promise.resolve()),
  },
}))

async function buildApp() {
  const app = Fastify({ logger: false })
  await app.register(jwt, { secret: 'test-secret' })

  // Mock do Redis para os testes de reset/verificação
  app.decorate('redis', {
    setex:    vi.fn(() => Promise.resolve('OK')),
    get:      vi.fn(() => Promise.resolve(null)),
    getdel:   vi.fn(() => Promise.resolve(null)),
    exists:   vi.fn(() => Promise.resolve(0)),
    ping:     vi.fn(() => Promise.resolve('PONG')),
  })

  await app.register(authRoutes, { prefix: '/v1/auth' })
  await app.ready()
  return app
}

describe('POST /v1/auth/register', () => {
  beforeEach(() => vi.clearAllMocks())

  it('cria usuário e retorna token', async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.usuario.create).mockResolvedValue({
      id: 'usr-001', email: 'novo@test.com', nome: 'Novo', plano: 'FREE',
    } as any)

    const app  = await buildApp()
    const resp = await app.inject({
      method:  'POST',
      url:     '/v1/auth/register',
      payload: { nome: 'Novo', email: 'novo@test.com', senha: 'Senha123!' },
    })

    expect(resp.statusCode).toBe(201)
    const body = resp.json()
    expect(body).toHaveProperty('token')
    expect(body.usuario.email).toBe('novo@test.com')
  })

  it('retorna 409 se e-mail já existe', async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id: 'usr-001' } as any)

    const app  = await buildApp()
    const resp = await app.inject({
      method:  'POST',
      url:     '/v1/auth/register',
      payload: { nome: 'Teste', email: 'existente@test.com', senha: 'Senha123!' },
    })

    expect(resp.statusCode).toBe(409)
    expect(resp.json().error).toMatch(/cadastrado/i)
  })

  it('retorna 422 se payload inválido', async () => {
    const app  = await buildApp()
    const resp = await app.inject({
      method:  'POST',
      url:     '/v1/auth/register',
      payload: { email: 'invalido' }, // falta nome e senha curta
    })

    expect(resp.statusCode).toBe(422)
  })
})

describe('POST /v1/auth/login', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna token com credenciais válidas', async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
      id: 'usr-001', email: 'joao@test.com', nome: 'João',
      plano: 'FREE', senhaHash: '$hashed$', ativo: true,
    } as any)
    vi.mocked(prisma.sessao.create).mockResolvedValue({} as any)

    const app  = await buildApp()
    const resp = await app.inject({
      method:  'POST',
      url:     '/v1/auth/login',
      payload: { email: 'joao@test.com', senha: 'Senha123!' },
    })

    expect(resp.statusCode).toBe(200)
    expect(resp.json()).toHaveProperty('token')
  })

  it('retorna 401 com senha errada', async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
      id: 'usr-001', email: 'joao@test.com', senhaHash: '$hashed$', ativo: true,
    } as any)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const app  = await buildApp()
    const resp = await app.inject({
      method:  'POST',
      url:     '/v1/auth/login',
      payload: { email: 'joao@test.com', senha: 'errada' },
    })

    expect(resp.statusCode).toBe(401)
  })

  it('retorna 401 com usuário inexistente', async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue(null)

    const app  = await buildApp()
    const resp = await app.inject({
      method:  'POST',
      url:     '/v1/auth/login',
      payload: { email: 'nao@existe.com', senha: 'qualquer' },
    })

    expect(resp.statusCode).toBe(401)
  })

  it('retorna 401 com usuário inativo', async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
      id: 'usr-001', email: 'inativo@test.com', ativo: false, senhaHash: '$hashed$',
    } as any)

    const app  = await buildApp()
    const resp = await app.inject({
      method:  'POST',
      url:     '/v1/auth/login',
      payload: { email: 'inativo@test.com', senha: 'Senha123!' },
    })

    expect(resp.statusCode).toBe(401)
  })
})

describe('POST /v1/auth/esqueci-senha', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna 200 mesmo quando e-mail não existe (timing-safe)', async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue(null)

    const app  = await buildApp()
    const resp = await app.inject({
      method:  'POST',
      url:     '/v1/auth/esqueci-senha',
      payload: { email: 'nao@existe.com' },
    })

    // Sempre 200 para não vazar se o email existe
    expect(resp.statusCode).toBe(200)
    expect(resp.json().ok).toBe(true)
  })

  it('gera token e envia e-mail quando usuário existe', async () => {
    const { emailService } = await import('../../services/email.js')
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
      id: 'usr-001', nome: 'João', ativo: true,
    } as any)

    const app  = await buildApp()
    await app.inject({
      method:  'POST',
      url:     '/v1/auth/esqueci-senha',
      payload: { email: 'joao@test.com' },
    })

    expect(emailService.enviarResetSenha).toHaveBeenCalledOnce()
  })

  it('retorna 429 quando rate limit ativo', async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({
      id: 'usr-001', nome: 'João', ativo: true,
    } as any)

    // Simula rate limit já ativo
    const app = await buildApp()
    ;(app as any).redis.exists = vi.fn(() => Promise.resolve(1))

    const resp = await app.inject({
      method:  'POST',
      url:     '/v1/auth/esqueci-senha',
      payload: { email: 'joao@test.com' },
    })

    expect(resp.statusCode).toBe(429)
  })
})

describe('POST /v1/auth/redefinir-senha', () => {
  beforeEach(() => vi.clearAllMocks())

  it('redefine senha com token válido', async () => {
    vi.mocked(prisma.usuario.update).mockResolvedValue({} as any)
    vi.mocked(prisma.sessao.deleteMany).mockResolvedValue({ count: 1 } as any)

    const app = await buildApp()
    ;(app as any).redis.getdel = vi.fn(() => Promise.resolve('usr-001'))

    const resp = await app.inject({
      method:  'POST',
      url:     '/v1/auth/redefinir-senha',
      payload: { token: 'token-valido', novaSenha: 'NovaSenha123!' },
    })

    expect(resp.statusCode).toBe(200)
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 'usr-001' },
      data:  expect.objectContaining({ senhaHash: '$hashed$' }),
    })
    // Deve invalidar sessões antigas
    expect(prisma.sessao.deleteMany).toHaveBeenCalledWith({ where: { usuarioId: 'usr-001' } })
  })

  it('retorna 400 com token inválido/expirado', async () => {
    const app = await buildApp()
    // getdel retorna null = token não existe
    ;(app as any).redis.getdel = vi.fn(() => Promise.resolve(null))

    const resp = await app.inject({
      method:  'POST',
      url:     '/v1/auth/redefinir-senha',
      payload: { token: 'token-invalido', novaSenha: 'NovaSenha123!' },
    })

    expect(resp.statusCode).toBe(400)
    expect(prisma.usuario.update).not.toHaveBeenCalled()
  })
})
