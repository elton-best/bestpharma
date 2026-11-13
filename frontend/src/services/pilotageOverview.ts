import { demoMode, request } from './quality'
import { boardRequest } from './cdcBoardsDemo'

export type SalesDay = { date: string; amount: number; count: number }
export type Period = { period: '7' | '30' | 'custom'; from: string; to: string }
export function localDay(value = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)
}
export function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
}
export function readPeriod(query: Record<string, unknown>, today = localDay()): Period {
  if (query.period === 'custom' && validDate(query.from) && validDate(query.to) && query.from <= query.to && (Date.parse(query.to) - Date.parse(query.from)) / 86400000 <= 365) return { period: 'custom', from: query.from, to: query.to }
  const period = query.period === '30' ? '30' : '7'
  return { period, from: new Date(Date.parse(`${today}T12:00:00Z`) - (Number(period) - 1) * 86400000).toISOString().slice(0, 10), to: today }
}
export async function loadPeriodSales(period: Period): Promise<SalesDay[]> {
  const response = demoMode
    ? await boardRequest<{ data: Record<string, unknown>[] }>('/dispensation/sales', 'GET')
    : await request<{ data: Record<string, unknown>[] }>('/dispensation/sales')
  if (!Array.isArray(response.data)) throw new Error('Réponse des ventes indisponible.')
  const days = new Map<string, SalesDay>()
  for (let t = Date.parse(`${period.from}T12:00:00Z`); t <= Date.parse(`${period.to}T12:00:00Z`); t += 86400000) {
    const date = new Date(t).toISOString().slice(0, 10); days.set(date, { date, amount: 0, count: 0 })
  }
  for (const sale of response.data) {
    if (sale.status !== 'payee' || (demoMode && sale.payment_status !== 'confirme')) continue
    const at = demoMode ? sale.sold_at : sale.paid_at
    if (typeof at !== 'string' || !Number.isFinite(Date.parse(at))) continue
    // Demo timestamps without offsets are officine-local, not browser-local.
    const date = demoMode ? at.slice(0, 10) : localDay(new Date(/[zZ]|[+-]\d\d:\d\d$/.test(at) ? at : `${at}Z`))
    const day = days.get(date)
    if (day) {
      const amount = Number(sale.total_amount)
      if (!Number.isFinite(amount)) throw new Error('Montant de vente invalide : agrégation indisponible.')
      day.amount += amount; day.count++
    }
  }
  return [...days.values()]
}
export type Domain = { id: string; title: string; to: string; error: string; asOf: string | null; metrics: { label: string; value: number | null }[] }
const domains = [
  { id: 'stock', title: 'Stock & approvisionnement', path: '/stock/overview', to: '/stock/approvisionnements', root: 'kpis', fields: [['Produits sous seuil', 'below_threshold_products'], ['Lots en quarantaine ou rappelés', 'quarantine_lots'], ['Lots à péremption ≤ 90 jours', 'expiring_soon_lots']] },
  { id: 'quality', title: 'Non-conformités', path: '/qualite/nonconformites/overview', to: '/qualite/non-conformites', root: 'indicators', fields: [['NC ouvertes', 'nc_open'], ['NC en retard > 30 jours', 'nc_overdue_30d']] },
  { id: 'team', title: 'Équipe', path: '/personnel/overview', to: '/personnel/formations', root: 'kpis', fields: [['Membres actifs', 'active_employees'], ['Congés en attente', 'pending_leaves']] },
  { id: 'inspections', title: 'Auto-inspections', path: '/qualite/inspections/overview', to: '/qualite/inspections', root: 'indicators', fields: [['Inspections enregistrées', 'total'], ['Inspections en retard', 'overdue']] },
]
export async function loadCurrentDomains(): Promise<Domain[]> {
  const results = await Promise.allSettled(domains.map(domain => request<Record<string, any>>(domain.path)))
  return domains.map((domain, index) => {
    const result = results[index]!
    const data = result.status === 'fulfilled' ? result.value : null
    return { id: domain.id, title: domain.title, to: domain.to,
      error: result.status === 'rejected' ? (result.reason instanceof Error ? result.reason.message : 'Indisponible / accès non autorisé') : '',
      asOf: data?.meta?.as_of ?? data?.indicators?.updated_at ?? null,
      metrics: domain.fields.map(([label, key]) => ({ label: label!, value: typeof data?.[domain.root]?.[key!] === 'number' ? data[domain.root][key!] : null })),
    }
  })
}
export function safeCsv(rows: unknown[][]): string {
  return '\uFEFF' + rows.map(row => row.map(value => {
    let text = String(value ?? '')
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`
    return `"${text.replace(/"/g, '""')}"`
  }).join(';')).join('\r\n')
}
export function downloadSalesCsv(days: SalesDay[], period: Period): void {
  const url = URL.createObjectURL(new Blob([safeCsv([['Date (Africa/Porto-Novo)', 'Ventes payées FCFA', 'Tickets'], ...days.map(day => [day.date, day.amount, day.count])])], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = `pilotage-ventes-${period.from}-${period.to}.csv`
  document.body.append(anchor); anchor.click(); anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
