// apps/web/src/app/(public)/termos/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Termos de Uso — LicitaBR',
  description: 'Termos e condições de uso da plataforma LicitaBR.',
}

const ULTIMA_ATUALIZACAO = '1º de janeiro de 2025'

export default function TermosPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">

      <div className="mb-10">
        <Link href="/landing" className="text-sm text-muted hover:text-brand-600 transition-colors">
          ← Voltar
        </Link>
        <h1 className="font-display text-3xl font-700 text-text mt-4 mb-2 tracking-tight">
          Termos de Uso
        </h1>
        <p className="text-sm text-muted">Última atualização: {ULTIMA_ATUALIZACAO}</p>
      </div>

      <div className="prose-licitabr">

        <Section titulo="1. Aceitação dos termos">
          Ao acessar ou usar a plataforma LicitaBR, você concorda com estes Termos de Uso.
          Se não concordar com qualquer disposição, não utilize o serviço.
          O uso continuado após alterações constitui aceitação das novas condições.
        </Section>

        <Section titulo="2. Descrição do serviço">
          O LicitaBR é uma plataforma SaaS que agrega, indexa e notifica sobre editais de
          licitações públicas brasileiras provenientes de portais oficiais como PNCP, BLL, BNC e
          Comprasnet. Os dados exibidos são coletados de fontes públicas e oficiais, sendo o
          LicitaBR um agregador informativo, não o órgão emissor dos editais.
        </Section>

        <Section titulo="3. Cadastro e conta">
          <ul>
            <li>Você deve ter pelo menos 18 anos para criar uma conta.</li>
            <li>As informações fornecidas no cadastro devem ser verdadeiras e atualizadas.</li>
            <li>Você é responsável pela confidencialidade da sua senha e por todas as atividades
                realizadas com sua conta.</li>
            <li>É proibido compartilhar credenciais de acesso com terceiros.</li>
            <li>Notifique-nos imediatamente em caso de uso não autorizado da sua conta pelo
                e-mail suporte@licitabr.com.br.</li>
          </ul>
        </Section>

        <Section titulo="4. Planos e pagamentos">
          <ul>
            <li><strong>Trial:</strong> planos pagos incluem 14 dias de teste gratuito, sem cobrança até o encerramento do período.</li>
            <li><strong>Cobrança:</strong> realizada mensalmente no cartão de crédito cadastrado via Stripe.</li>
            <li><strong>Cancelamento:</strong> pode ser feito a qualquer momento; o acesso continua até o fim do período já pago.</li>
            <li><strong>Reembolso:</strong> não oferecemos reembolso proporcional por cancelamento antecipado, exceto nos casos previstos no Código de Defesa do Consumidor.</li>
            <li><strong>Inadimplência:</strong> em caso de falha de pagamento, o plano é revertido para Free automaticamente após tentativas frustradas.</li>
          </ul>
        </Section>

        <Section titulo="5. Uso aceitável">
          É expressamente proibido:
          <ul>
            <li>Usar a plataforma para fins ilegais ou que violem direitos de terceiros.</li>
            <li>Tentar acessar dados de outros usuários ou áreas restritas do sistema.</li>
            <li>Realizar engenharia reversa, descompilar ou extrair código-fonte da plataforma.</li>
            <li>Usar bots ou scrapers automatizados para extrair dados em volume além do permitido pela API.</li>
            <li>Revender ou sublicenciar o acesso à plataforma sem autorização expressa.</li>
            <li>Enviar conteúdo malicioso, spam ou que viole a legislação vigente.</li>
          </ul>
        </Section>

        <Section titulo="6. Propriedade intelectual">
          O código-fonte, design, marca LicitaBR e demais elementos da plataforma são de
          propriedade exclusiva da LicitaBR Tecnologia Ltda. Os dados de editais são de domínio
          público, provenientes de órgãos governamentais, e não são de propriedade do LicitaBR.
        </Section>

        <Section titulo="7. Disponibilidade">
          O LicitaBR se esforça para manter disponibilidade de 99,5% mensais, mas não garante
          acesso ininterrupto. Manutenções programadas serão comunicadas com antecedência mínima
          de 24 horas. Não nos responsabilizamos por indisponibilidades decorrentes de terceiros
          (portais governamentais, provedores de nuvem, etc.).
        </Section>

        <Section titulo="8. Limitação de responsabilidade">
          O LicitaBR não se responsabiliza por:
          <ul>
            <li>Decisões de negócio tomadas com base nos dados exibidos na plataforma.</li>
            <li>Imprecisões ou desatualizações nos dados coletados dos portais governamentais.</li>
            <li>Perdas decorrentes de alertas não entregues por falhas em serviços de terceiros
                (SendGrid, Telegram, etc.).</li>
            <li>Danos indiretos, lucros cessantes ou danos especiais.</li>
          </ul>
        </Section>

        <Section titulo="9. Rescisão">
          Podemos suspender ou encerrar sua conta, sem aviso prévio, em caso de violação destes
          Termos. Você pode encerrar sua conta a qualquer momento em Configurações → Excluir conta.
          Após o encerramento, seus dados são mantidos por 30 dias antes da exclusão definitiva,
          conforme nossa Política de Privacidade.
        </Section>

        <Section titulo="10. Privacidade e proteção de dados (LGPD)">
          O tratamento de dados pessoais realizado pelo LicitaBR está em conformidade com a
          Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Para informações
          detalhadas sobre como coletamos, usamos e protegemos seus dados, consulte nossa{' '}
          <a href="/privacidade" className="text-brand-600 hover:underline">Política de Privacidade</a>.
        </Section>

        <Section titulo="11. Legislação aplicável">
          Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da Comarca de
          São Paulo/SP para dirimir quaisquer controvérsias decorrentes deste instrumento,
          com renúncia expressa a qualquer outro.
        </Section>

        <Section titulo="12. Contato">
          Dúvidas sobre estes Termos: <a href="mailto:juridico@licitabr.com.br" className="text-brand-600 hover:underline">juridico@licitabr.com.br</a>
        </Section>

      </div>

      <div className="mt-10 pt-6 border-t border-surface-border flex items-center justify-between text-sm text-muted">
        <Link href="/privacidade" className="hover:text-brand-600 transition-colors">
          Política de Privacidade →
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
      <div className="text-sm text-muted leading-relaxed space-y-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1.5">
        {children}
      </div>
    </div>
  )
}
