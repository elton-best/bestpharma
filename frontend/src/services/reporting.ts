import { demoMode, request } from './quality'
import { boardRequest } from './cdcBoardsDemo'

export interface Metric { code: string; module_key: string; title: string; definition: string; unit: string; numerator: number; denominator: number; value: number | null; display_value: string; computed_at: string }
export interface ReportTemplate { id: number; code: string; title: string; category: string; metric_codes: string[]; default_format: string; is_scheduled: boolean; cron_schedule: string | null; consent_confirmed: boolean; recipients?: number[] }
export interface ReportExport { id: number; export_ref: string; format: string; file_checksum_sha256?: string; exported_at?: string }
export interface ReportRun { id: number; reference: string; title: string; period_start: string; period_end: string; status: string; generated_at: string; computed_metrics: Metric[]; template?: { code: string; title: string } | null; exports?: ReportExport[] }
export interface NotificationJob { id: number; channel: string; status: string; attempts: number; last_error: string | null; scheduled_for: string; template?: { title: string; code: string } }
export interface Overview { meta?: { period_start: string; period_end: string; as_of: string }; kpis: { templates_count: number; runs_count: number; exports_count: number; failed_notifications: number }; metrics: Metric[] }
export interface Recipient { id: number; name: string; email: string; is_active?: boolean }
export interface RunInput { reference: string; title: string; period_start: string; period_end: string; template_id?: number | null; metric_codes: string[] }
export interface TemplateInput { code: string; title: string; category: string; metric_codes: string[]; default_format: 'csv'; is_scheduled: boolean; cron_schedule: string | null; consent_confirmed: boolean; recipients: number[] }
const send = <T>(path: string, method = 'GET', body?: unknown): Promise<T> => demoMode ? boardRequest<T>(path, method, body) : request<T>(path, method, body)
export const officeToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
export function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value }
export function validatePeriod(start: string, end: string) { if (!validDate(start) || !validDate(end) || start > end) throw new Error('Choisissez une période valide : début antérieur ou égal à la fin.') }
export function previousPeriod(start: string, end: string) {
  validatePeriod(start, end)
  const a = Date.parse(start), days = (Date.parse(end) - a) / 86400000 + 1
  return { start: new Date(a - days * 86400000).toISOString().slice(0, 10), end: new Date(a - 86400000).toISOString().slice(0, 10) }
}
export function metricDisplay(m?: Metric) { return !m || m.value === null || !Number.isFinite(m.value) || (m.unit === '%' && m.denominator <= 0) ? 'N/D' : m.display_value }
export function metricDelta(current: Metric, previous?: Metric) {
  if (metricDisplay(current) === 'N/D' || metricDisplay(previous) === 'N/D' || !previous || previous.unit !== current.unit) return 'N/D'
  const delta = Math.round((current.value! - previous.value!) * 10) / 10
  return `${delta > 0 ? '+' : ''}${delta} ${current.unit === '%' ? 'points' : current.unit}`
}
export function validateSchedule(input: TemplateInput) {
  if (!input.code.trim() || !input.title.trim() || !input.metric_codes.length) throw new Error('Code, titre et au moins un indicateur sont requis.')
  if (input.is_scheduled && (!input.consent_confirmed || !input.recipients.length || !['0 8 * * 1', '0 8 1 * *'].includes(input.cron_schedule || ''))) throw new Error('La planification exige une fréquence, des destinataires et le consentement métier.')
}

// Parse the returned CSV rather than rebuilding an export from live indicators.
export function safeCsv(content: string) {
  const text = content.replace(/^\uFEFF/, '')
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted }
    else if (c === ';' && !quoted) { row.push(cell); cell = '' }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  if (quoted) throw new Error('Le CSV retourné est mal formé.')
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return '\uFEFF' + rows.map(r => r.map(v => '"' + (/^[\s\u0000-\u001f]*[=+@-]/.test(v) ? "'" + v : v).replace(/"/g, '""') + '"').join(';')).join('\r\n')
}
export async function downloadCsv(content: string, reference: string) {
  if (typeof content !== 'string' || !content.trim()) throw new Error('Le serveur n’a retourné aucun contenu CSV.')
  const safe = safeCsv(content), blob = new Blob([safe], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob), a = document.createElement('a')
  a.href = url; a.download = reference.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) + '.csv'
  document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  // This checksum describes the actual downloaded bytes, not the server's unsanitized CSV.
  if (!globalThis.crypto?.subtle) return null
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(safe))
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}
export const reportingService = {
  overview(start: string, end: string) { validatePeriod(start, end); return send<Overview>(`/reporting/overview?period_start=${start}&period_end=${end}`) },
  async compare(start: string, end: string) { const prev = previousPeriod(start, end); const [current, previous] = await Promise.all([this.overview(start, end), this.overview(prev.start, prev.end)]); return { current, previous, period: prev } },
  async runs() { return (await send<{ data: ReportRun[] }>('/reporting/runs')).data },
  async templates() { return (await send<{ data: ReportTemplate[] }>('/reporting/templates')).data },
  async jobs() { return (await send<{ data: NotificationJob[] }>('/reporting/notification-jobs')).data },
  async recipients() { return (await send<{ members: Recipient[] }>('/team')).members.filter(m => m.is_active !== false && m.email) },
  async generate(input: RunInput) { validatePeriod(input.period_start, input.period_end); if (!input.reference.trim() || !input.title.trim() || !input.metric_codes.length) throw new Error('Référence, titre et indicateurs requis.'); return (await send<{ data: ReportRun }>('/reporting/runs', 'POST', input)).data },
  async createTemplate(input: TemplateInput) { validateSchedule(input); return (await send<{ data: ReportTemplate }>('/reporting/templates', 'POST', input)).data },
  export(id: number) { return send<{ data: ReportExport; content: string }>(`/reporting/runs/${id}/export`, 'POST', { format: 'csv' }) },
  async retry(id: number) { return (await send<{ data: NotificationJob }>(`/reporting/notification-jobs/${id}/retry`, 'POST', {})).data },
}
