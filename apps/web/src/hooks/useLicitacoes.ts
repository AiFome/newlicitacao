// apps/web/src/hooks/useLicitacoes.ts
'use client'
import useSWR from 'swr'
import { licitacoesApi, type PaginatedResult, type Licitacao } from '@/lib/api'

export interface FiltrosLicitacao {
  q?: string
  modalidade?: string
  portal?: string
  uf?: string
  situacao?: string
  valorMin?: number
  valorMax?: number
  dataAberturaDe?: string
  dataAberturaAte?: string
  page?: number
  limit?: number
  sort?: string
}

export function useLicitacoes(filtros: FiltrosLicitacao) {
  const key = ['licitacoes', JSON.stringify(filtros)]

  const { data, error, isLoading, mutate } = useSWR<PaginatedResult<Licitacao>>(
    key,
    () => licitacoesApi.buscar(filtros as Record<string, string | number | undefined>),
    { keepPreviousData: true, revalidateOnFocus: false }
  )

  return { data, error, isLoading, mutate }
}

export function useLicitacao(id: string | null) {
  const { data, error, isLoading } = useSWR<Licitacao>(
    id ? ['licitacao', id] : null,
    () => licitacoesApi.get(id!),
    { revalidateOnFocus: false }
  )
  return { licitacao: data, error, isLoading }
}
