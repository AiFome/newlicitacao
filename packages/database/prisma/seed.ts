// packages/database/prisma/seed.ts
import { PrismaClient, Modalidade, Portal, Situacao, Esfera, Poder } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ── Órgãos ─────────────────────────────────────────
  const orgaos = await Promise.all([
    prisma.orgao.upsert({
      where: { cnpj: '00.394.460/0001-41' },
      update: {},
      create: {
        cnpj: '00.394.460/0001-41',
        razaoSocial: 'Ministério da Gestão e da Inovação em Serviços Públicos',
        esfera: Esfera.FEDERAL,
        poder: Poder.EXECUTIVO,
        uf: 'DF',
        municipio: 'Brasília',
        uasg: '110001',
      },
    }),
    prisma.orgao.upsert({
      where: { cnpj: '46.392.130/0001-69' },
      update: {},
      create: {
        cnpj: '46.392.130/0001-69',
        razaoSocial: 'Prefeitura Municipal de Campinas',
        esfera: Esfera.MUNICIPAL,
        poder: Poder.EXECUTIVO,
        uf: 'SP',
        municipio: 'Campinas',
      },
    }),
    prisma.orgao.upsert({
      where: { cnpj: '71.590.249/0001-45' },
      update: {},
      create: {
        cnpj: '71.590.249/0001-45',
        razaoSocial: 'Secretaria de Estado de Saúde de Minas Gerais',
        esfera: Esfera.ESTADUAL,
        poder: Poder.EXECUTIVO,
        uf: 'MG',
        municipio: 'Belo Horizonte',
      },
    }),
  ])

  console.log(`✓ ${orgaos.length} órgãos criados`)

  // ── Licitações de exemplo ──────────────────────────
  const licitacoes = [
    {
      numeroEdital: '001/2025',
      titulo: 'Pregão Eletrônico — Aquisição de material de escritório',
      objeto: 'Aquisição de materiais de escritório e suprimentos de informática para atender às necessidades da administração pública federal, incluindo papéis, canetas, cartuchos de impressora e periféricos de computador.',
      modalidade: Modalidade.PREGAO_ELETRONICO,
      situacao: Situacao.ABERTA,
      valorEstimado: 248500.00,
      dataPublicacao: new Date('2025-04-10'),
      dataAbertura: new Date('2025-04-30T10:00:00'),
      dataEncerramento: new Date('2025-04-30T12:00:00'),
      linkEdital: 'https://pncp.gov.br/app/editais/001-2025',
      portalOrigem: Portal.PNCP,
      codigoExterno: 'PNCP-2025-001',
      anoCompra: 2025,
      uf: 'DF',
      municipio: 'Brasília',
      orgaoId: orgaos[0]!.id,
    },
    {
      numeroEdital: '015/2025',
      titulo: 'Concorrência — Obras de pavimentação e recapeamento asfáltico',
      objeto: 'Contratação de empresa especializada para execução de obras de pavimentação, recapeamento asfáltico e drenagem superficial em vias urbanas do município de Campinas, conforme projeto básico e planilhas em anexo.',
      modalidade: Modalidade.CONCORRENCIA,
      situacao: Situacao.ABERTA,
      valorEstimado: 8400000.00,
      dataPublicacao: new Date('2025-04-01'),
      dataAbertura: new Date('2025-05-15T09:00:00'),
      linkEdital: 'https://campinas.sp.gov.br/licitacoes/015-2025',
      portalOrigem: Portal.COMPRASNET,
      codigoExterno: 'CAMP-2025-015',
      anoCompra: 2025,
      uf: 'SP',
      municipio: 'Campinas',
      orgaoId: orgaos[1]!.id,
    },
    {
      numeroEdital: '032/2025',
      titulo: 'Pregão Eletrônico — Fornecimento de medicamentos e materiais hospitalares',
      objeto: 'Registro de preços para fornecimento de medicamentos, materiais e equipamentos hospitalares para a rede estadual de saúde de Minas Gerais, conforme especificações técnicas do Termo de Referência.',
      modalidade: Modalidade.PREGAO_ELETRONICO,
      situacao: Situacao.ABERTA,
      valorEstimado: 3200000.00,
      dataPublicacao: new Date('2025-04-15'),
      dataAbertura: new Date('2025-05-05T10:00:00'),
      linkEdital: 'https://www.compras.mg.gov.br/licitacoes/032-2025',
      portalOrigem: Portal.BLL,
      codigoExterno: 'MG-SES-2025-032',
      anoCompra: 2025,
      uf: 'MG',
      municipio: 'Belo Horizonte',
      orgaoId: orgaos[2]!.id,
    },
  ]

  for (const lic of licitacoes) {
    await prisma.licitacao.upsert({
      where: { portalOrigem_codigoExterno: { portalOrigem: lic.portalOrigem, codigoExterno: lic.codigoExterno } },
      update: {},
      create: lic,
    })
  }

  console.log(`✓ ${licitacoes.length} licitações criadas`)

  // ── Usuário de desenvolvimento ─────────────────────
  const senhaHash = await bcrypt.hash('senha123', 12)
  const usuario = await prisma.usuario.upsert({
    where: { email: 'dev@licitabr.com.br' },
    update: {},
    create: {
      email: 'dev@licitabr.com.br',
      nome: 'Dev Admin',
      senhaHash,
      plano: 'PROFISSIONAL',
      ativo: true,
      emailVerificado: true,
    },
  })

  console.log(`✓ Usuário dev criado: ${usuario.email} / senha123`)

  // ── Alerta de exemplo ──────────────────────────────
  await prisma.alertaConfig.upsert({
    where: { id: 'seed-alerta-001' },
    update: {},
    create: {
      id: 'seed-alerta-001',
      usuarioId: usuario.id,
      nome: 'Material de escritório SP/DF',
      palavrasChave: ['material de escritório', 'suprimentos', 'informática'],
      modalidades: ['PREGAO_ELETRONICO'] as any[],
      portais: ['PNCP', 'COMPRASNET'] as any[],
      ufs: ['SP', 'DF'],
      canal: ['EMAIL'] as any[],
      frequencia: 'IMEDIATO',
      ativo: true,
    },
  })

  console.log('✓ Alerta de exemplo criado')

  // Admin padrão
  const adminHash = await bcrypt.hash('admin123', 10)
  await prisma.usuario.upsert({
    where:  { email: 'admin@licitabr.com.br' },
    create: {
      nome:            'Admin LicitaBR',
      email:           'admin@licitabr.com.br',
      senhaHash:       adminHash,
      plano:           'ENTERPRISE' as any,
      role:            'SUPER_ADMIN' as any,
      emailVerificado: true,
      ativo:           true,
    },
    update: { role: 'SUPER_ADMIN' as any, plano: 'ENTERPRISE' as any },
  })
  console.log('✓ Admin criado: admin@licitabr.com.br / admin123')

  console.log('\n✅ Seed concluído!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
