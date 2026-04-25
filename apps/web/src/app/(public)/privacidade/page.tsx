// apps/web/src/app/(public)/privacidade/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidade — LicitaBR',
  description: 'Política de privacidade e proteção de dados da plataforma LicitaBR, em conformidade com a LGPD.',
}

const ULTIMA_ATUALIZACAO = '1º de janeiro de 2025'
const DPO_EMAIL          = 'privacidade@licitabr.com.br'

export default function PrivacidadePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">

      <div className="mb-10">
        <Link href="/landing" className="text-sm text-muted hover:text-brand-600 transition-colors">
          ← Voltar
        </Link>
        <h1 className="font-display text-3xl font-700 text-text mt-4 mb-2 tracking-tight">
          Política de Privacidade
        </h1>
        <p className="text-sm text-muted">Última atualização: {ULTIMA_ATUALIZACAO}</p>
        <div className="mt-4 rounded-lg bg-brand-50 border border-brand-100 px-4 py-3 text-sm text-brand-700">
          Esta política está em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </div>
      </div>

      <div className="prose-licitabr">

        <Section titulo="1. Controladora dos dados">
          <p>
            <strong>LicitaBR Tecnologia Ltda.</strong><br />
            CNPJ: 00.000.000/0001-00<br />
            E-mail do DPO: <a href={`mailto:${DPO_EMAIL}`} className="text-brand-600 hover:underline">{DPO_EMAIL}</a>
          </p>
        </Section>

        <Section titulo="2. Dados que coletamos">
          <ul>
            <li><strong>Cadastro:</strong> nome, e-mail, senha (hash bcrypt), telefone (opcional).</li>
            <li><strong>Uso:</strong> alertas configurados, favoritos, buscas realizadas, preferências de notificação.</li>
            <li><strong>Técnicos:</strong> endereço IP, user-agent, logs de acesso e sessões ativas.</li>
            <li><strong>Pagamento:</strong> somente o ID de cliente e assinatura do Stripe — dados de cartão não são armazenados pelo LicitaBR.</li>
            <li><strong>Comunicação:</strong> Chat ID do Telegram (se configurado), preferências de notificação.</li>
          </ul>
          <p className="mt-2">Não coletamos dados sensíveis (raça, religião, saúde, biometria, etc.).</p>
        </Section>

        <Section titulo="3. Como usamos seus dados">
          <ul>
            <li>Prestar o serviço contratado (alertas, busca, notificações).</li>
            <li>Autenticar e proteger sua conta.</li>
            <li>Processar pagamentos via Stripe.</li>
            <li>Enviar comunicações transacionais (confirmação de e-mail, reset de senha, alertas).</li>
            <li>Melhorar a plataforma com base em métricas agregadas e anônimas.</li>
            <li>Cumprir obrigações legais e regulatórias.</li>
          </ul>
        </Section>

        <Section titulo="4. Base legal (LGPD — art. 7º)">
          <ul>
            <li><strong>Execução de contrato</strong> — para prestar o serviço.</li>
            <li><strong>Consentimento</strong> — para comunicações de marketing (opt-in).</li>
            <li><strong>Interesse legítimo</strong> — para segurança, prevenção a fraudes e melhoria do serviço.</li>
            <li><strong>Obrigação legal</strong> — para cumprimento de exigências fiscais e regulatórias.</li>
          </ul>
        </Section>

        <Section titulo="5. Compartilhamento de dados">
          Seus dados são compartilhados apenas com:
          <ul>
            <li><strong>Stripe</strong> — processamento de pagamentos (DPA vigente).</li>
            <li><strong>SendGrid (Twilio)</strong> — envio de e-mails transacionais.</li>
            <li><strong>Telegram</strong> — entrega de notificações (somente Chat ID).</li>
            <li><strong>Sentry</strong> — monitoramento de erros (dados anonimizados).</li>
            <li><strong>Provedores de nuvem</strong> — hospedagem e armazenamento.</li>
          </ul>
          <p className="mt-2">Não vendemos, alugamos ou compartilhamos seus dados com fins comerciais ou publicitários.</p>
        </Section>

        <Section titulo="6. Retenção de dados">
          <ul>
            <li>Conta ativa: dados mantidos enquanto a conta existir.</li>
            <li>Conta excluída: dados removidos em até 30 dias, exceto os exigidos por lei (notas fiscais: 5 anos).</li>
            <li>Logs de acesso: 6 meses (Marco Civil da Internet).</li>
            <li>Backups: até 30 dias após a exclusão.</li>
          </ul>
        </Section>

        <Section titulo="7. Seus direitos (LGPD — art. 18)">
          Você tem direito a, a qualquer momento:
          <ul>
            <li><strong>Acesso</strong> — saber quais dados temos sobre você.</li>
            <li><strong>Correção</strong> — atualizar dados incompletos ou incorretos.</li>
            <li><strong>Anonimização/Exclusão</strong> — remover dados desnecessários ou excessivos.</li>
            <li><strong>Portabilidade</strong> — receber seus dados em formato estruturado.</li>
            <li><strong>Oposição</strong> — se opor a tratamentos baseados em interesse legítimo.</li>
            <li><strong>Revogação de consentimento</strong> — para comunicações de marketing.</li>
            <li><strong>Informação</strong> — sobre com quem seus dados são compartilhados.</li>
          </ul>
          <p className="mt-2">
            Para exercer esses direitos: <a href={`mailto:${DPO_EMAIL}`} className="text-brand-600 hover:underline">{DPO_EMAIL}</a>.
            Respondemos em até 15 dias úteis, conforme exigido pela LGPD.
          </p>
        </Section>

        <Section titulo="8. Segurança">
          Adotamos medidas técnicas e organizacionais para proteger seus dados:
          <ul>
            <li>Senhas armazenadas com hash bcrypt (custo 12).</li>
            <li>Comunicações criptografadas via TLS 1.3.</li>
            <li>Tokens JWT com expiração curta e invalidação por sessão.</li>
            <li>Acesso ao banco de dados restrito à rede interna.</li>
            <li>Backups diários criptografados em armazenamento separado.</li>
            <li>Monitoramento de erros e alertas de segurança via Sentry.</li>
          </ul>
        </Section>

        <Section titulo="9. Cookies">
          Utilizamos apenas cookies essenciais para autenticação e funcionamento da plataforma.
          Não utilizamos cookies de rastreamento, analytics de terceiros ou publicidade.
        </Section>

        <Section titulo="10. Transferência internacional">
          Alguns subprocessadores (Stripe, SendGrid, Sentry) processam dados fora do Brasil.
          Todas essas transferências são realizadas com garantias adequadas (cláusulas
          contratuais padrão ou certificações equivalentes), conforme exigido pela LGPD.
        </Section>

        <Section titulo="11. Alterações a esta política">
          Alterações materiais serão comunicadas por e-mail com 30 dias de antecedência.
          Alterações não materiais entram em vigor na data de publicação.
          O uso continuado após comunicação constitui aceitação.
        </Section>

        <Section titulo="12. Contato e DPO">
          <p>
            Encarregado de Proteção de Dados (DPO):<br />
            E-mail: <a href={`mailto:${DPO_EMAIL}`} className="text-brand-600 hover:underline">{DPO_EMAIL}</a><br />
            Resposta em até 15 dias úteis.
          </p>
          <p className="mt-2">
            Você também pode registrar reclamação na Autoridade Nacional de Proteção de
            Dados (ANPD): <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">gov.br/anpd</a>.
          </p>
        </Section>

      </div>

      <div className="mt-10 pt-6 border-t border-surface-border flex items-center justify-between text-sm text-muted">
        <Link href="/termos" className="hover:text-brand-600 transition-colors">
          ← Termos de Uso
        </Link>
        <Link href="/landing" className="hover:text-brand-600 transition-colors">
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-display text-lg font-600 text-text mb-3">{titulo}</h2>
      <div className="text-sm text-muted leading-relaxed space-y-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1.5 [&_a]:text-brand-600 [&_a]:hover:underline">
        {children}
      </div>
    </div>
  )
}
