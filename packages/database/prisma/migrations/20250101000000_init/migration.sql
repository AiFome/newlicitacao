-- Migration: 20250101000000_init
-- Gerada automaticamente pelo Prisma a partir do schema.prisma
-- Para regenerar: npx prisma migrate dev --name init

-- Enums
CREATE TYPE "Modalidade" AS ENUM (
  'PREGAO_ELETRONICO', 'PREGAO_PRESENCIAL', 'CONCORRENCIA',
  'TOMADA_DE_PRECOS', 'CONVITE', 'LEILAO', 'CONCURSO',
  'DISPENSA', 'INEXIGIBILIDADE', 'RDC', 'CREDENCIAMENTO',
  'MANIFESTACAO_INTERESSE'
);

CREATE TYPE "Situacao" AS ENUM (
  'ABERTA', 'SUSPENSA', 'REVOGADA', 'ANULADA',
  'HOMOLOGADA', 'DESERTA', 'FRACASSADA', 'ENCERRADA'
);

CREATE TYPE "Portal" AS ENUM (
  'PNCP', 'COMPRASNET', 'LICITACOES_E', 'BLL', 'BNC',
  'LICITANET', 'PORTAL_COMPRAS_PUBLICAS', 'LICITARDIGITAL',
  'BBMNET', 'NEGOCIOS_PUBLICOS', 'SOL_LICITACOES',
  'EQUIPLANO', 'CITACON', 'LICITACON', 'OUTROS'
);

CREATE TYPE "Esfera" AS ENUM (
  'FEDERAL', 'ESTADUAL', 'MUNICIPAL', 'DISTRITAL'
);

CREATE TYPE "Poder" AS ENUM (
  'EXECUTIVO', 'LEGISLATIVO', 'JUDICIARIO',
  'MINISTERIO_PUBLICO', 'TCU_TCE'
);

CREATE TYPE "Role" AS ENUM (
  'USER', 'ADMIN', 'SUPER_ADMIN'
);

CREATE TYPE "Plano" AS ENUM (
  'FREE', 'BASICO', 'PROFISSIONAL', 'ENTERPRISE'
);

CREATE TYPE "CanalAlerta" AS ENUM (
  'EMAIL', 'TELEGRAM', 'PUSH', 'WEBHOOK'
);

CREATE TYPE "FreqAlerta" AS ENUM (
  'IMEDIATO', 'DIARIO', 'SEMANAL'
);

CREATE TYPE "StatusNotif" AS ENUM (
  'PENDENTE', 'ENVIADO', 'FALHOU', 'CANCELADO'
);

CREATE TYPE "StatusColeta" AS ENUM (
  'INICIADO', 'CONCLUIDO', 'PARCIAL', 'FALHOU'
);

-- Tabela: orgaos
CREATE TABLE "orgaos" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "cnpj"        TEXT NOT NULL,
  "razaoSocial" TEXT NOT NULL,
  "nomeFantasia" TEXT,
  "esfera"      "Esfera" NOT NULL,
  "poder"       "Poder" NOT NULL,
  "uf"          CHAR(2) NOT NULL,
  "municipio"   TEXT,
  "uasg"        TEXT,
  "codigoPncp"  TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "orgaos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "orgaos_cnpj_key"       ON "orgaos"("cnpj");
CREATE UNIQUE INDEX "orgaos_uasg_key"        ON "orgaos"("uasg") WHERE "uasg" IS NOT NULL;
CREATE UNIQUE INDEX "orgaos_codigoPncp_key"  ON "orgaos"("codigoPncp") WHERE "codigoPncp" IS NOT NULL;
CREATE INDEX "orgaos_uf_idx"    ON "orgaos"("uf");
CREATE INDEX "orgaos_esfera_idx" ON "orgaos"("esfera");

-- Tabela: licitacoes
CREATE TABLE "licitacoes" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "numeroEdital"     TEXT NOT NULL,
  "titulo"           TEXT NOT NULL,
  "objeto"           TEXT NOT NULL,
  "modalidade"       "Modalidade" NOT NULL,
  "situacao"         "Situacao" NOT NULL DEFAULT 'ABERTA',
  "valorEstimado"    DECIMAL(15,2),
  "valorHomologado"  DECIMAL(15,2),
  "dataPublicacao"   TIMESTAMP(3) NOT NULL,
  "dataAbertura"     TIMESTAMP(3) NOT NULL,
  "dataEncerramento" TIMESTAMP(3),
  "dataHomologacao"  TIMESTAMP(3),
  "linkEdital"       TEXT NOT NULL,
  "portalOrigem"     "Portal" NOT NULL,
  "codigoExterno"    TEXT NOT NULL,
  "anoCompra"        INTEGER NOT NULL,
  "uf"               CHAR(2) NOT NULL,
  "municipio"        TEXT,
  "orgaoId"          TEXT NOT NULL,
  "indexadoEm"       TIMESTAMP(3),
  "hashConteudo"     TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "licitacoes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "licitacoes_orgaoId_fkey" FOREIGN KEY ("orgaoId") REFERENCES "orgaos"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "licitacoes_portal_codigo_key" ON "licitacoes"("portalOrigem", "codigoExterno");
CREATE INDEX "licitacoes_situacao_idx"    ON "licitacoes"("situacao");
CREATE INDEX "licitacoes_modalidade_idx"  ON "licitacoes"("modalidade");
CREATE INDEX "licitacoes_uf_idx"          ON "licitacoes"("uf");
CREATE INDEX "licitacoes_dataAbertura_idx" ON "licitacoes"("dataAbertura");
CREATE INDEX "licitacoes_orgaoId_idx"     ON "licitacoes"("orgaoId");
CREATE INDEX "licitacoes_portal_idx"      ON "licitacoes"("portalOrigem");

-- Tabela: licitacao_itens
CREATE TABLE "licitacao_itens" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "licitacaoId"  TEXT NOT NULL,
  "numero"       INTEGER NOT NULL,
  "descricao"    TEXT NOT NULL,
  "quantidade"   DECIMAL(12,3) NOT NULL,
  "unidade"      TEXT NOT NULL,
  "valorUnitario" DECIMAL(15,2),
  "valorTotal"   DECIMAL(15,2),
  "codigoCatmat" TEXT,
  "codigoCatser" TEXT,
  CONSTRAINT "licitacao_itens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "licitacao_itens_licitacaoId_fkey" FOREIGN KEY ("licitacaoId") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "licitacao_itens_licitacaoId_idx" ON "licitacao_itens"("licitacaoId");

-- Tabela: edital_anexos
CREATE TABLE "edital_anexos" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "licitacaoId"  TEXT NOT NULL,
  "nomeArquivo"  TEXT NOT NULL,
  "urlOriginal"  TEXT NOT NULL,
  "urlStorage"   TEXT,
  "tipoArquivo"  TEXT NOT NULL,
  "tamanhoBytes" BIGINT,
  "checksum"     TEXT,
  "baixadoEm"    TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "edital_anexos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "edital_anexos_licitacaoId_fkey" FOREIGN KEY ("licitacaoId") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "edital_anexos_licitacaoId_idx" ON "edital_anexos"("licitacaoId");

-- Tabela: usuarios
CREATE TABLE "usuarios" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "email"           TEXT NOT NULL,
  "nome"            TEXT NOT NULL,
  "senhaHash"       TEXT NOT NULL,
  "telefone"        TEXT,
  "avatarUrl"       TEXT,
  "plano"           "Plano" NOT NULL DEFAULT 'FREE',
  "ativo"           BOOLEAN NOT NULL DEFAULT true,
  "role"            "Role" NOT NULL DEFAULT 'USER',
  "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
  "trialAte"        TIMESTAMP(3),
  "stripeCustomerId"      TEXT,
  "stripeSubscriptionId"  TEXT,
  "telegramChatId"  TEXT,
  "notifEmail"      BOOLEAN NOT NULL DEFAULT true,
  "notifTelegram"   BOOLEAN NOT NULL DEFAULT false,
  "notifPush"       BOOLEAN NOT NULL DEFAULT false,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usuarios_email_key"               ON "usuarios"("email");
CREATE UNIQUE INDEX "usuarios_stripeCustomerId_key"    ON "usuarios"("stripeCustomerId") WHERE "stripeCustomerId" IS NOT NULL;
CREATE UNIQUE INDEX "usuarios_stripeSubscriptionId_key" ON "usuarios"("stripeSubscriptionId") WHERE "stripeSubscriptionId" IS NOT NULL;

-- Tabela: sessoes
CREATE TABLE "sessoes" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "usuarioId" TEXT NOT NULL,
  "token"     TEXT NOT NULL,
  "userAgent" TEXT,
  "ip"        TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sessoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "sessoes_token_key"     ON "sessoes"("token");
CREATE INDEX "sessoes_usuarioId_idx"        ON "sessoes"("usuarioId");
CREATE INDEX "sessoes_token_idx"            ON "sessoes"("token");

-- Tabela: alerta_configs
CREATE TABLE "alerta_configs" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "usuarioId"     TEXT NOT NULL,
  "nome"          TEXT NOT NULL,
  "palavrasChave" TEXT[] NOT NULL DEFAULT '{}',
  "modalidades"   "Modalidade"[] NOT NULL DEFAULT '{}',
  "portais"       "Portal"[] NOT NULL DEFAULT '{}',
  "ufs"           CHAR(2)[] NOT NULL DEFAULT '{}',
  "valorMin"      DECIMAL(15,2),
  "valorMax"      DECIMAL(15,2),
  "canal"         "CanalAlerta"[] NOT NULL DEFAULT '{}',
  "frequencia"    "FreqAlerta" NOT NULL DEFAULT 'IMEDIATO',
  "ativo"         BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "alerta_configs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "alerta_configs_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "alerta_configs_usuarioId_idx" ON "alerta_configs"("usuarioId");

-- Tabela: favoritos
CREATE TABLE "favoritos" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "usuarioId"    TEXT NOT NULL,
  "licitacaoId"  TEXT NOT NULL,
  "nota"         TEXT,
  "tags"         TEXT[] NOT NULL DEFAULT '{}',
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "favoritos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "favoritos_usuarioId_licitacaoId_key" UNIQUE ("usuarioId", "licitacaoId"),
  CONSTRAINT "favoritos_usuarioId_fkey"   FOREIGN KEY ("usuarioId")   REFERENCES "usuarios"("id")   ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "favoritos_licitacaoId_fkey" FOREIGN KEY ("licitacaoId") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabela: notificacoes
CREATE TABLE "notificacoes" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "usuarioId"    TEXT NOT NULL,
  "licitacaoId"  TEXT NOT NULL,
  "alertaId"     TEXT,
  "canal"        "CanalAlerta" NOT NULL,
  "status"       "StatusNotif" NOT NULL DEFAULT 'PENDENTE',
  "erro"         TEXT,
  "enviadoEm"    TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notificacoes_usuarioId_fkey"   FOREIGN KEY ("usuarioId")   REFERENCES "usuarios"("id")   ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notificacoes_licitacaoId_fkey" FOREIGN KEY ("licitacaoId") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notificacoes_alertaId_fkey"    FOREIGN KEY ("alertaId")    REFERENCES "alerta_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "notificacoes_usuarioId_idx" ON "notificacoes"("usuarioId");
CREATE INDEX "notificacoes_status_idx"    ON "notificacoes"("status");

-- Tabela: scraper_logs
CREATE TABLE "scraper_logs" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "portal"           "Portal" NOT NULL,
  "status"           "StatusColeta" NOT NULL,
  "totalColetados"   INTEGER NOT NULL DEFAULT 0,
  "totalNovos"       INTEGER NOT NULL DEFAULT 0,
  "totalAtualizados" INTEGER NOT NULL DEFAULT 0,
  "totalErros"       INTEGER NOT NULL DEFAULT 0,
  "duracao"          INTEGER,
  "erro"             TEXT,
  "iniciadoEm"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finalizadoEm"     TIMESTAMP(3),
  CONSTRAINT "scraper_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scraper_logs_portal_idx"     ON "scraper_logs"("portal");
CREATE INDEX "scraper_logs_iniciadoEm_idx" ON "scraper_logs"("iniciadoEm");

-- Trigger: atualiza updatedAt automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW."updatedAt" = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orgaos_updated_at    BEFORE UPDATE ON "orgaos"    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER licitacoes_updated_at BEFORE UPDATE ON "licitacoes" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER usuarios_updated_at  BEFORE UPDATE ON "usuarios"  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER alertas_updated_at   BEFORE UPDATE ON "alerta_configs" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
