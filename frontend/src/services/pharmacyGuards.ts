import { demoMode, request } from './quality'
import { currentOffice } from './supportDemo'

/** Manual guard declarations. A guard is a local planning entry, never an official calendar. */
export interface Guard {
  id: number
  pharmacy_name: string
  phone: string | null
  address: string | null
  starts_at: string
  ends_at: string
  reason: string | null
}
export interface GuardDraft {
  pharmacy_name: string
  phone: string
  address: string
  starts_at: string
  ends_at: string
  reason: string
}
export type GuardPeriod = 'all' | 'current' | 'upcoming' | 'past'
export interface GuardList { data: Guard[]; can_write: boolean }

const storagePrefix = 'bestpharma.demo.guards.v1.'
const zone = 'Africa/Porto-Novo'
const pad = (value: number) => String(value).padStart(2, '0')

export function officeDay(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) throw new Error('Date de garde invalide.')
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
export function officeMonth(value = new Date()): string {
  return officeDay(value).slice(0, 7)
}
export function isoToInput(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date).replace(' ', 'T')
}
/** datetime-local values are officine wall-clock time (UTC+1 year-round in Benin). */
export function inputToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return null
  const date = new Date(`${value.slice(0, 16)}:00+01:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function dayAt(offset: number, hour: number, minute = 0): string {
  const day = officeDay(new Date(Date.parse(`${officeDay(new Date())}T12:00:00Z`) + offset * 86400000))
  return `${day}T${pad(hour)}:${pad(minute)}:00+01:00`
}

function seed(): Guard[] {
  const office = currentOffice.value
  const now = Date.now()
  const own = { pharmacy_name: office.name, phone: null, address: `${office.address} · ${office.city}` }
  if (office.id === 'off-2') {
    return [
      { ...own, id: 1, starts_at: new Date(now - 5 * 3600000).toISOString(), ends_at: new Date(now + 3 * 3600000).toISOString(), reason: 'Garde de nuit en cours — exemple fictif' },
      { id: 2, pharmacy_name: 'Pharmacie du Fleuve — démonstration', phone: null, address: 'Boulevard du Fleuve, Cotonou — démonstration', starts_at: dayAt(2, 8), ends_at: dayAt(2, 20), reason: 'Garde dominicale — exemple fictif' },
      { id: 3, pharmacy_name: 'Pharmacie Sainte-Rita — démonstration', phone: null, address: 'Rue Sainte-Rita, Cotonou — démonstration', starts_at: dayAt(4, 20), ends_at: dayAt(5, 8), reason: 'Nuit programmée — exemple fictif' },
      { ...own, id: 4, starts_at: dayAt(7, 8), ends_at: dayAt(7, 20), reason: 'Week-end de garde — exemple fictif' },
      { id: 5, pharmacy_name: 'Pharmacie du Port — démonstration', phone: null, address: 'Zone portuaire, Cotonou — démonstration', starts_at: dayAt(-2, 8), ends_at: dayAt(-2, 20), reason: 'Garde passée — exemple fictif' },
      { id: 6, pharmacy_name: 'Pharmacie Akpakpa — démonstration', phone: null, address: 'Akpakpa, Cotonou — démonstration', starts_at: dayAt(-4, 20), ends_at: dayAt(-3, 8), reason: 'Nuit passée — exemple fictif' },
      { id: 7, pharmacy_name: 'Pharmacie de la Cathédrale — démonstration', phone: null, address: 'Cathédrale, Cotonou — démonstration', starts_at: dayAt(-7, 8), ends_at: dayAt(-7, 20), reason: 'Garde passée — exemple fictif' },
    ]
  }
  return [
    { ...own, id: 1, starts_at: new Date(now - 2 * 3600000).toISOString(), ends_at: new Date(now + 4 * 3600000).toISOString(), reason: 'Garde en cours — exemple fictif' },
    { id: 2, pharmacy_name: 'Pharmacie de la Lagune — démonstration', phone: null, address: 'Avenue de la Lagune, Cotonou — démonstration', starts_at: dayAt(1, 8), ends_at: dayAt(1, 20), reason: 'Planning de garde — exemple fictif' },
    { id: 3, pharmacy_name: 'Pharmacie du Marché — démonstration', phone: null, address: 'Marché central, Porto-Novo — démonstration', starts_at: dayAt(3, 20), ends_at: dayAt(4, 8), reason: 'Garde de nuit — exemple fictif' },
    { ...own, id: 4, starts_at: dayAt(6, 8), ends_at: dayAt(6, 20), reason: 'Week-end de garde — exemple fictif' },
    { id: 5, pharmacy_name: 'Pharmacie Sainte-Marie — démonstration', phone: null, address: 'Rue Sainte-Marie, Porto-Novo — démonstration', starts_at: dayAt(-1, 8), ends_at: dayAt(-1, 20), reason: 'Garde passée — exemple fictif' },
    { id: 6, pharmacy_name: 'Pharmacie du Plateau — démonstration', phone: null, address: 'Rue du Plateau, Abomey-Calavi — démonstration', starts_at: dayAt(-3, 20), ends_at: dayAt(-2, 8), reason: 'Nuit passée — exemple fictif' },
    { id: 7, pharmacy_name: 'Pharmacie des Palmiers', phone: null, address: 'Quartier des Palmiers, Porto-Novo — démonstration', starts_at: dayAt(-6, 8), ends_at: dayAt(-6, 20), reason: 'Garde passée — exemple fictif' },
  ]
}

function key(): string {
  return storagePrefix + encodeURIComponent(currentOffice.value.id)
}

function validGuard(row: unknown): row is Guard {
  if (!row || typeof row !== 'object') return false
  const guard = row as Guard
  return Number.isSafeInteger(guard.id) && typeof guard.pharmacy_name === 'string' && guard.pharmacy_name.trim().length > 0
    && (guard.phone === null || typeof guard.phone === 'string')
    && (guard.address === null || typeof guard.address === 'string')
    && typeof guard.starts_at === 'string' && Number.isFinite(Date.parse(guard.starts_at))
    && typeof guard.ends_at === 'string' && Number.isFinite(Date.parse(guard.ends_at))
    && (guard.reason === null || typeof guard.reason === 'string')
}

function readDemo(): Guard[] {
  const raw = localStorage.getItem(key())
  if (!raw) {
    const rows = seed()
    localStorage.setItem(key(), JSON.stringify(rows))
    return rows
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every(validGuard)) throw new Error()
    return parsed
  } catch {
    throw new Error('Les gardes de démonstration sont illisibles. Utilisez « Réinitialiser les exemples » pour repartir des données d’origine.')
  }
}

export async function loadGuards(): Promise<GuardList> {
  if (!demoMode) return request<GuardList>('/gardes')
  return { data: readDemo().sort((a, b) => a.starts_at.localeCompare(b.starts_at)), can_write: true }
}

export function resetGuards(): void {
  localStorage.removeItem(key())
}

function normalize(draft: GuardDraft, rows: Guard[], id?: number): Guard {
  const name = draft.pharmacy_name.trim()
  if (!name) throw new Error('Le nom de la pharmacie est requis.')
  const start = inputToIso(draft.starts_at)
  const end = inputToIso(draft.ends_at)
  if (!start || !end) throw new Error('Renseignez un début et une fin valides.')
  if (Date.parse(end) <= Date.parse(start)) throw new Error('La fin doit être postérieure au début.')
  if (rows.some(row => row.id !== id && Date.parse(row.starts_at) < Date.parse(end) && Date.parse(row.ends_at) > Date.parse(start))) {
    throw new Error('Cette période chevauche une garde déjà déclarée pour cette officine.')
  }
  return {
    id: id ?? Math.max(0, ...rows.map(row => row.id)) + 1,
    pharmacy_name: name,
    phone: draft.phone.trim() || null,
    address: draft.address.trim() || null,
    starts_at: start,
    ends_at: end,
    reason: draft.reason.trim() || null,
  }
}

export async function saveGuard(draft: GuardDraft, id?: number): Promise<Guard> {
  if (!demoMode) {
    const start = inputToIso(draft.starts_at)
    const end = inputToIso(draft.ends_at)
    if (!start || !end) throw new Error('Renseignez un début et une fin valides.')
    const result = await request<{ data: Guard }>(`/gardes${id ? `/${id}` : ''}`, id ? 'PUT' : 'POST', {
      ...draft, pharmacy_name: draft.pharmacy_name.trim(), phone: draft.phone.trim() || null,
      address: draft.address.trim() || null, reason: draft.reason.trim() || null, starts_at: start, ends_at: end,
    })
    return result.data
  }
  const rows = readDemo()
  const guard = normalize(draft, rows, id)
  const next = id ? rows.map(row => row.id === id ? guard : row) : [...rows, guard]
  localStorage.setItem(key(), JSON.stringify(next.sort((a, b) => a.starts_at.localeCompare(b.starts_at))))
  return guard
}

export async function deleteGuard(id: number): Promise<void> {
  if (!demoMode) { await request(`/gardes/${id}`, 'DELETE'); return }
  const rows = readDemo()
  if (!rows.some(row => row.id === id)) throw new Error('Garde de démonstration introuvable.')
  localStorage.setItem(key(), JSON.stringify(rows.filter(row => row.id !== id)))
}

function csvCell(value: unknown): string {
  let text = String(value ?? '')
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}
export function guardsCsv(rows: Guard[]): string {
  const header = ['Pharmacie', 'Téléphone', 'Adresse', 'Début (Africa/Porto-Novo)', 'Fin (Africa/Porto-Novo)', 'Motif', 'Source']
  const body = rows.map(row => [row.pharmacy_name, row.phone || '', row.address || '', isoToInput(row.starts_at).replace('T', ' '), isoToInput(row.ends_at).replace('T', ' '), row.reason || '', 'Déclaration manuelle de l’officine'])
  return '\uFEFF' + [header, ...body].map(line => line.map(csvCell).join(';')).join('\r\n')
}

function icalText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}
function icalDate(value: string): string {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}
export function guardsICal(rows: Guard[], officeName: string): string {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BestPharma//Pharmacies de garde//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${icalText(`Gardes — ${officeName}`)}`,
  ]
  for (const row of rows) {
    lines.push('BEGIN:VEVENT', `UID:garde-${row.id}@bestpharma.local`, `DTSTAMP:${icalDate(new Date().toISOString())}`,
      `DTSTART:${icalDate(row.starts_at)}`, `DTEND:${icalDate(row.ends_at)}`,
      `SUMMARY:${icalText(row.pharmacy_name)}`, `LOCATION:${icalText(row.address || '')}`,
      `DESCRIPTION:${icalText(`${row.reason || 'Garde déclarée manuellement'} — source manuelle, non officielle.`)}`, 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadText(content: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
