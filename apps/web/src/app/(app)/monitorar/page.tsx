'use client'
// apps/web/src/app/(app)/monitorar/page.tsx
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { licitacoesApi, alertasApi, monitorarApi } from '@/lib/api'
import { formatMoedaCompacta, formatDataHora, MODALIDADE_LABEL, PORTAL_LABEL, situacaoBadgeClass, SITUACAO_LABEL } from '@/lib/format'
import Link from 'next/link'
import {
  Search, Plus, X, ExternalLink, Bell, Tag,
  Loader2, AlertCircle, Bookmark, Trash2,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function MonitorarPage() {
  const [palavraInput, setPalavraInput]     = useState('')
  const [buscando, setBuscando]             = useState(false)
  const [resultados, setResultados]         = useState<any[] | null>(null)
  const [criandoAlerta, setCriandoAlerta]   = useState(false)
  const [salvando, setSalvando]             = useState(false)

  // Carregar palavras salvas do servidor
  const { data: config, mutate } = useSWR('monitorar-config', monitorarApi.buscar)
  const palavras: string[] = config?.palavras ?? []

  // Buscar automaticamente quando carregar se houver palavras salvas
  useEffect(() => {
    if (palavras.length > 0 && resultados === null) {
      buscarEditais(palavras)
    }
  }, [config])

  async function adicionarPalavra() {
    const p = palavraInput.trim().toLowerCase()
    if (!p) return
    if (palavras.includes(p)) { toast.error('Palavra já adicionada'); return }

    const novasPalavras = [...palavras, p]
    setSalvando(true)
    try {
      await monitorarApi.salvar(novasPalavras)
      mutate()
      setPalavraInput('')
    } catch {
      toast.error('Erro ao salvar palavra')
    } finally {
      setSalvando(false)
    }
  }

  async function removerPalavra(p: string) {
    try {
      await monitorarApi.removerPalavra(p)
      mutate()
      setResultados(null)
    } catch {
      toast.error('Erro ao remover palavra')
    }
  }

  async function buscarEditais(pals = palavras) {
    if (pals.length === 0) { toast.error('Adicione pelo menos uma palavra-chave'); return }
    setBuscando(true)
    try {
      // Busca com todas as palavras juntas usando ElasticSearch (mais preciso)
      const query = pals.map(p => `"${p}"`).join(' OR ')
      const res = await licitacoesApi.buscar({ q: query, situacao: 'ABERTA', limit: 30, sort: 'recentes' })
      setResultados(res.data ?? [])
    } catch {
      toast.error('Erro ao buscar licitações')
    } finally {
      setBuscando(false)
    }
  }

  async function criarAlerta() {
    if (palavras.length === 0) return
    setCriandoAlerta(true)
    try {
      await alertasApi.criar({
        nome:         palavras.slice(0, 3).join(', '),
        palavrasChave: palavras,
        canal:        ['EMAIL'],
        frequencia:   'IMEDIATO',
        modalidades:  [],
        portais:      [],
        ufs:          [],
      })
      toast.success('Alerta criado! Você será notificado por e-mail.')
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao criar alerta')
    } finally {
      setCriandoAlerta(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-700 text-text tracking-tight mb-1">Monitorar por palavras-chave</h1>
        <p className="text-sm text-muted">Suas palavras ficam salvas. Adicione ou remova quando quiser.</p>
      </div>

      {/* Card de palavras */}
      <div className="card p-5 mb-6">
        <label className="block text-xs font-600 text-muted uppercase tracking-wide mb-3">
          Palavras-chave salvas
        </label>

        {/* Input */}
        <div className="flex gap-2 mb-4">
          <input
            value={palavraInput}
            onChange={(e) => setPalavraInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarPalavra())}
            placeholder="Ex: pavimentação, equipamentos, limpeza..."
            className="input flex-1"
            disabled={salvando}
          />
          <button
            onClick={adicionarPalavra}
            disabled={salvando || !palavraInput.trim()}
            className="btn-secondary gap-2 px-4 shrink-0 disabled:opacity-50">
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
            Adicionar
          </button>
        </div>

        {/* Tags salvas */}
        {palavras.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-5">
            {palavras.map((p) => (
              <span key={p}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-500 animate-scale-in"
                style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', border: '1px solid var(--brand-200)' }}>
                <Tag size={11} />
                {p}
                <button
                  onClick={() => removerPalavra(p)}
                  className="opacity-50 hover:opacity-100 transition-opacity ml-0.5">
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-3 mb-4 text-sm text-muted">
            <Bookmark size={15} />
            Nenhuma palavra-chave salva ainda. Adicione acima.
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => buscarEditais()}
            disabled={palavras.length === 0 || buscando}
            className="btn-primary gap-2 px-6 disabled:opacity-60"
            style={{ background: 'var(--brand-600)' }}>
            {buscando
              ? <><Loader2 size={14} className="animate-spin" />Buscando...</>
              : <><Search size={14} />Buscar editais</>}
          </button>

          {palavras.length > 0 && (
            <button
              onClick={criarAlerta}
              disabled={criandoAlerta}
              className="btn-secondary gap-2 px-5 disabled:opacity-60">
              {criandoAlerta
                ? <><Loader2 size={14} className="animate-spin" />Criando...</>
                : <><Bell size={14} />Criar alerta automático</>}
            </button>
          )}
        </div>

        {palavras.length > 0 && (
          <p className="text-xs text-muted mt-3 flex items-center gap-1.5">
            <Bell size={11} />
            O alerta notifica por e-mail quando sair novos editais com essas palavras
          </p>
        )}
      </div>

      {/* Resultados */}
      {resultados !== null && (
        <div className="animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-600 text-text">
              {resultados.length === 0
                ? 'Nenhum edital encontrado para essas palavras'
                : `${resultados.length} edita${resultados.length !== 1 ? 'is' : 'l'} encontrado${resultados.length !== 1 ? 's' : ''}`}
            </p>
            <button
              onClick={() => buscarEditais()}
              className="btn-ghost text-xs gap-1.5">
              <Search size={12} /> Atualizar
            </button>
          </div>

          {resultados.length === 0 ? (
            <div className="card p-12 flex flex-col items-center gap-3 text-center">
              <AlertCircle size={32} className="text-muted" />
              <p className="font-500 text-text">Nenhum edital aberto encontrado</p>
              <p className="text-sm text-muted">Crie um alerta para ser notificado quando surgir um edital com essas palavras</p>
              <button
                onClick={criarAlerta}
                className="btn-primary gap-2 px-5 mt-2"
                style={{ background: 'var(--brand-600)' }}>
                <Bell size={14} />Criar alerta
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {resultados.map((l) => (
                <Link key={l.id} href={`/licitacoes/${l.id}`}
                  className="card p-5 flex items-start gap-4 hover:border-brand-200 hover:shadow-md transition-all duration-200 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2 flex-wrap">
                      <span className={clsx('text-[11px] font-600 px-2 py-0.5 rounded-full', situacaoBadgeClass(l.situacao))}>
                        {SITUACAO_LABEL[l.situacao] ?? l.situacao}
                      </span>
                      <span className="text-[11px] text-muted font-500">{PORTAL_LABEL[l.portalOrigem] ?? l.portalOrigem}</span>
                      <span className="text-[11px] text-muted">{l.uf}</span>
                    </div>
                    <p className="font-600 text-text text-sm leading-snug mb-1 group-hover:text-brand-700 transition-colors line-clamp-2">
                      {l.titulo}
                    </p>
                    <p className="text-xs text-muted mb-2">{l.orgao?.razaoSocial}</p>
                    <div className="flex items-center gap-4 text-xs text-muted">
                      {l.valorEstimado && (
                        <span className="font-600 text-text">{formatMoedaCompacta(l.valorEstimado)}</span>
                      )}
                      <span>Abertura: {formatDataHora(l.dataAbertura)}</span>
                      <span>{MODALIDADE_LABEL[l.modalidade] ?? l.modalidade}</span>
                    </div>
                  </div>
                  <ExternalLink size={15} className="text-muted shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
