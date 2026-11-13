import { boardRequest } from './cdcBoardsDemo'
import { demoMode, httpErrorMessage, readResponseJson, request, serviceUnavailable } from './quality'
import { supportState } from './supportDemo'

export interface GroupPeriod { start: string; end: string }
export interface GroupOffice { id: string; name: string; city?: string }
export interface GroupMetric {
  code: string; title: string; definition: string; unit: string;
  numerator: number; denominator: number; value: number | null; display_value: string; computed_at?: string;
}
export interface OfficeIndicators {
  office: GroupOffice; available: boolean; metrics: GroupMetric[]; asOf: string | null; error: string | null;
}
export interface GroupIndicator extends GroupMetric { covered: number; expected: number; complete: boolean }
export interface GroupResult {
  period: GroupPeriod; offices: OfficeIndicators[]; metrics: GroupIndicator[]; complete: boolean; generatedAt: string;
}

function validDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
export function validateGroupPeriod(period: GroupPeriod) {
  if (!validDay(period.start) || !validDay(period.end) || period.end < period.start) throw new Error('Choisissez une période valide : la fin doit suivre le début.')
  if (Date.parse(period.end) - Date.parse(period.start) > 366 * 86400000) throw new Error('La période de comparaison est limitée à un an.')
}

export async function listGroupOffices(): Promise<GroupOffice[]> {
  if (demoMode) return supportState.offices.filter(office => office.status === 'active').map(office => ({ id: office.id, name: office.name, city: office.city }))
  const response = await request<{ officines: Array<{ id: number; name: string; status: string; access_type: string }> }>('/me')
  if (!Array.isArray(response.officines)) throw new Error('Le périmètre des officines est illisible.')
  // Support assignments are not an authorization to consolidate a client's data.
  return response.officines.filter(office => office.status === 'active' && office.access_type === 'member').map(office => ({ id: String(office.id), name: office.name }))
}

async function officeOverview(office: GroupOffice, period: GroupPeriod): Promise<OfficeIndicators> {
  const query = new URLSearchParams({ period_start: period.start, period_end: period.end })
  let result: { metrics: GroupMetric[]; meta?: { as_of?: string } }
  if (demoMode) {
    const scopedDemo = boardRequest as <T>(path: string, method?: string, body?: unknown, officeId?: string) => Promise<T>
    result = await scopedDemo(`/reporting/overview?${query}`, 'GET', undefined, office.id)
  } else {
    // Never temporarily change sessionStorage: concurrent requests keep their own tenant.
    const token = sessionStorage.getItem('bestpharma.token')
    let response: Response
    try {
      response = await fetch(`/api/v1/reporting/overview?${query}`, { headers: {
        Accept: 'application/json', 'X-Officine-ID': office.id,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      } })
    } catch { throw new Error(serviceUnavailable) }
    const payload = await readResponseJson<typeof result>(response)
    if (!response.ok) throw new Error(httpErrorMessage(response, payload, response.status === 403 ? 'Accès au reporting refusé pour cette officine.' : 'Indicateurs indisponibles.'))
    result = payload
  }
  if (!Array.isArray(result?.metrics) || result.metrics.some(metric => !metric || typeof metric.code !== 'string' || typeof metric.unit !== 'string'
    || !Number.isFinite(metric.numerator) || !Number.isFinite(metric.denominator) || metric.numerator < 0 || metric.denominator < 0
    || (metric.value !== null && !Number.isFinite(metric.value)))) throw new Error('Les indicateurs de cette officine sont illisibles.')
  return { office, available: true, metrics: result.metrics, asOf: result.meta?.as_of || result.metrics[0]?.computed_at || null, error: null }
}

export function aggregateGroupIndicators(offices: OfficeIndicators[]): GroupIndicator[] {
  const codes = [...new Set(offices.flatMap(office => office.metrics.map(metric => metric.code)))]
  return codes.map(code => {
    const source = offices.flatMap(office => office.available ? office.metrics.filter(metric => metric.code === code) : [])
    const first = source[0]
    const complete = source.length === offices.length && source.every(metric => metric.unit === first.unit && metric.definition === first.definition)
    const numerator = source.reduce((sum, metric) => sum + metric.numerator, 0)
    const denominator = source.reduce((sum, metric) => sum + metric.denominator, 0)
    // Ratios are weighted by their actual denominators, never by office count.
    const value = complete && first.unit === '%' && denominator > 0 ? numerator / denominator * 100 : null
    const display = !complete ? 'Périmètre incomplet' : first.unit !== '%' ? 'Non agrégable' : value === null ? 'Non disponible' : `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value)} %`
    return { ...first, numerator, denominator, value, display_value: display, covered: source.length, expected: offices.length, complete }
  })
}

export async function loadGroupConsolidation(ids: string[], period: GroupPeriod): Promise<GroupResult> {
  validateGroupPeriod(period)
  const selected = [...new Set(ids)]
  if (!selected.length || selected.length > 20) throw new Error('Sélectionnez entre une et vingt officines.')
  const allowed = await listGroupOffices()
  const offices = selected.map(id => {
    const office = allowed.find(item => item.id === id)
    if (!office) throw new Error('Une officine sélectionnée est hors de votre périmètre autorisé.')
    return office
  })
  const results = await Promise.all(offices.map(async office => {
    try { return await officeOverview(office, period) }
    catch (cause) { return { office, available: false, metrics: [], asOf: null, error: cause instanceof Error ? cause.message : serviceUnavailable } satisfies OfficeIndicators }
  }))
  return { period: { ...period }, offices: results, metrics: aggregateGroupIndicators(results), complete: results.every(office => office.available), generatedAt: new Date().toISOString() }
}

function csvCell(value: unknown): string {
  let text = String(value ?? '')
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}
export function groupCsv(result: GroupResult): string {
  const rows: unknown[][] = [['Officine', 'Début', 'Fin', 'Code', 'Indicateur', 'Numérateur', 'Dénominateur', 'Valeur', 'État de la source']]
  for (const source of result.offices) {
    if (!source.available) rows.push([source.office.name, result.period.start, result.period.end, '', '', '', '', '', source.error])
    for (const metric of source.metrics) rows.push([source.office.name, result.period.start, result.period.end, metric.code, metric.title, metric.numerator, metric.denominator, metric.display_value, 'Disponible'])
  }
  for (const metric of result.metrics) rows.push(['Périmètre sélectionné', result.period.start, result.period.end, metric.code, metric.title, metric.numerator, metric.denominator, metric.display_value, `${metric.covered}/${metric.expected} sources`])
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n')
}

export function downloadGroupCsv(result: GroupResult): void {
  const url = URL.createObjectURL(new Blob([groupCsv(result)], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `consolidation-${result.period.start}-${result.period.end}.csv`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
