// apps/web/src/hooks/useAlertas.ts
'use client'
import useSWR, { mutate as globalMutate } from 'swr'
import toast from 'react-hot-toast'
import { alertasApi, favoritosApi, type AlertaConfig, type Favorito } from '@/lib/api'

export function useAlertas() {
  const { data, error, isLoading, mutate } = useSWR<AlertaConfig[]>(
    'alertas',
    alertasApi.listar,
    { revalidateOnFocus: false }
  )

  async function criar(dados: Partial<AlertaConfig>) {
    const novo = await alertasApi.criar(dados)
    mutate((prev) => prev ? [...prev, novo] : [novo], false)
    toast.success('Alerta criado!')
    return novo
  }

  async function atualizar(id: string, dados: Partial<AlertaConfig>) {
    const atualizado = await alertasApi.atualizar(id, dados)
    mutate((prev) => prev?.map((a) => a.id === id ? atualizado : a), false)
    toast.success('Alerta atualizado!')
    return atualizado
  }

  async function deletar(id: string) {
    await alertasApi.deletar(id)
    mutate((prev) => prev?.filter((a) => a.id !== id), false)
    toast.success('Alerta removido.')
  }

  async function alternarAtivo(id: string, ativo: boolean) {
    return atualizar(id, { ativo })
  }

  return { alertas: data ?? [], error, isLoading, criar, atualizar, deletar, alternarAtivo }
}

export function useFavoritos() {
  // Lista completa (usada na página /favoritos)
  const { data, error, isLoading, mutate } = useSWR<Favorito[]>(
    'favoritos',
    favoritosApi.listar,
    { revalidateOnFocus: false }
  )

  // Só os IDs — requisição leve, usada para checar se está favoritado em cards
  const { data: idsData, mutate: mutateIds } = useSWR<{ id: string; licitacaoId: string }[]>(
    'favoritos/ids',
    favoritosApi.ids,
    { revalidateOnFocus: false }
  )

  const ids = new Set((idsData ?? []).map((f) => f.licitacaoId))

  // Retorna o id do favorito dado o licitacaoId (para poder deletar pelo id)
  function getFavId(licitacaoId: string): string | undefined {
    return idsData?.find((f) => f.licitacaoId === licitacaoId)?.id
  }

  async function alternar(licitacaoId: string) {
    if (ids.has(licitacaoId)) {
      // Remove — usa rota por licitacaoId (mais prática)
      await favoritosApi.removerPorLicitacao(licitacaoId)

      // Atualiza cache otimisticamente
      mutateIds((prev) => prev?.filter((f) => f.licitacaoId !== licitacaoId), false)
      mutate((prev) => prev?.filter((f) => f.licitacaoId !== licitacaoId), false)
    } else {
      // Adiciona
      const novo = await favoritosApi.adicionar(licitacaoId)

      mutateIds((prev) => prev ? [...prev, { id: novo.id, licitacaoId }] : [{ id: novo.id, licitacaoId }], false)
      mutate((prev) => prev ? [...prev, novo] : [novo], false)
    }
  }

  async function removerById(id: string) {
    const fav = data?.find((f) => f.id === id)
    await favoritosApi.remover(id)
    mutate((prev) => prev?.filter((f) => f.id !== id), false)
    if (fav) {
      mutateIds((prev) => prev?.filter((f) => f.licitacaoId !== fav.licitacaoId), false)
    }
  }

  return { favoritos: data ?? [], ids, getFavId, error, isLoading, alternar, removerById }
}
