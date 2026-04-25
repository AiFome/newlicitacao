// apps/api/src/lib/formatCsv.ts

export function formatDataHoraSimples(d: Date | null | undefined): string {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  const dd  = String(dt.getDate()).padStart(2, '0')
  const mm  = String(dt.getMonth() + 1).padStart(2, '0')
  const yyyy = dt.getFullYear()
  const hh  = String(dt.getHours()).padStart(2, '0')
  const min = String(dt.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

export function formatMoedaCSV(v: unknown): string {
  if (v === null || v === undefined) return ''
  const n = typeof v === 'object' ? Number(v) : Number(v)
  if (isNaN(n)) return ''
  // Formato brasileiro sem símbolo (para Excel calcular corretamente)
  return n.toFixed(2).replace('.', ',')
}
