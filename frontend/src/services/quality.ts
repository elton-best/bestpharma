export type Status = 'open' | 'in_progress' | 'closed'
export interface QualityAction {
  id: number; title: string; chapter: string; severity: 'low' | 'medium' | 'high';
  owner: string; due_date: string; status: Status; description: string; resolution: string;
}
export type ActionInput = Omit<QualityAction, 'id'>
export const demoMode = import.meta.env.VITE_DATA_MODE !== 'api'
const key = 'bestpharma.demo.quality.v1'
const initial: QualityAction[] = [
  { id: 1, title: 'Revoir la traçabilité des relevés de température', chapter: 'Locaux et équipements', severity: 'high', owner: 'Responsable qualité', due_date: '2026-11-12', status: 'in_progress', description: 'Exemple fictif : compléter la procédure de contrôle quotidien et identifier le responsable de chaque relevé.', resolution: '' },
  { id: 2, title: 'Planifier la revue des procédures de réception', chapter: 'Approvisionnement', severity: 'medium', owner: 'Pharmacien titulaire', due_date: '2026-11-18', status: 'open', description: 'Exemple fictif : organiser une revue avec les personnes habilitées.', resolution: '' },
  { id: 3, title: 'Formaliser le parcours d’accueil du personnel', chapter: 'Personnel', severity: 'low', owner: 'Responsable qualité', due_date: '2026-11-25', status: 'open', description: 'Exemple fictif : définir les étapes de prise de poste et les formations requises.', resolution: '' },
  { id: 4, title: 'Mettre à jour le registre de nettoyage', chapter: 'Locaux et équipements', severity: 'medium', owner: 'Responsable qualité', due_date: '2026-11-05', status: 'closed', description: 'Exemple fictif de suivi qualité.', resolution: 'Exemple : registre révisé et partagé avec l’équipe.' },
]
export function readDemo(): QualityAction[] {
  const raw = localStorage.getItem(key)
  if (!raw) return structuredClone(initial)
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every(x => x && Number.isInteger(x.id) && typeof x.title === 'string' && ['open', 'in_progress', 'closed'].includes(x.status))) throw new Error()
    return parsed
  } catch { throw new Error('Les données locales sont illisibles. Réinitialisez la démonstration pour continuer.') }
}
export function resetDemo() { localStorage.removeItem(key) }
export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = sessionStorage.getItem('bestpharma.token')
  const tenant = sessionStorage.getItem('bestpharma.officine')
  const res = await fetch(`/api/v1${path}`, { method, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(tenant ? { 'X-Officine-ID': tenant } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) { sessionStorage.removeItem('bestpharma.token'); sessionStorage.removeItem('bestpharma.officine'); sessionStorage.removeItem('bestpharma.platform'); window.location.assign('/login') }
  if (res.status===403&&data.code==='mfa_enrollment_required'&&window.location.pathname!=='/dashboard/securite') window.location.assign('/dashboard/securite')
  if (!res.ok) throw new Error(Object.values(data.errors || {}).flat().join(' ') || data.message || 'Le service est indisponible. Veuillez réessayer.')
  return data as T
}
export const qualityService = {
  async autoEvaluation(): Promise<{ status: string; available: boolean; reason: string | null }> {
    return request('/qualite/auto-evaluations')
  },
  async list(): Promise<QualityAction[]> {
    return demoMode ? readDemo() : (await request<{ data: QualityAction[] }>('/qualite/actions')).data
  },
  async save(input: ActionInput, id?: number): Promise<QualityAction> {
    if (!demoMode) return (await request<{ data: QualityAction }>(`/qualite/actions${id ? `/${id}` : ''}`, id ? 'PUT' : 'POST', input)).data
    const records = readDemo()
    const item = { ...input, id: id ?? Math.max(0, ...records.map(x => x.id)) + 1 }
    if (id && !records.some(x => x.id === id)) throw new Error('Action introuvable.')
    const next = id ? records.map(x => x.id === id ? item : x) : [item, ...records]
    localStorage.setItem(key, JSON.stringify(next))
    return item
  },
}
