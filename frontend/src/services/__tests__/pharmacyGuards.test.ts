// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let guards: typeof import('../pharmacyGuards')
let support: typeof import('../supportDemo')

const tomorrow = () => new Date(Date.now() + 10 * 86400000)
function draft(name = 'Pharmacie test — démonstration') {
  const start = tomorrow()
  const end = new Date(start.getTime() + 3600000)
  return {
    pharmacy_name: name, phone: '', address: 'Rue test — démonstration',
    starts_at: guards.isoToInput(start.toISOString()), ends_at: guards.isoToInput(end.toISOString()), reason: 'Exemple fictif',
  }
}

beforeEach(async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2027-04-05T09:00:00Z'))
  localStorage.clear()
  sessionStorage.clear()
  vi.resetModules()
  support = await import('../supportDemo')
  guards = await import('../pharmacyGuards')
})
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

describe('Pharmacies de garde — démonstration et validation', () => {
  it('fournit un planning varié, fictif et sans téléphone inventé', async () => {
    const result = await guards.loadGuards()
    expect(result.can_write).toBe(true)
    expect(result.data.length).toBeGreaterThanOrEqual(6)
    expect(new Set(result.data.map(row => row.id)).size).toBe(result.data.length)
    expect(result.data.every(row => row.phone === null)).toBe(true)
    expect(result.data.some(row => Date.parse(row.starts_at) <= Date.now() && Date.parse(row.ends_at) > Date.now())).toBe(true)
    expect(result.data.some(row => Date.parse(row.starts_at) > Date.now())).toBe(true)
    expect(result.data.some(row => Date.parse(row.ends_at) <= Date.now())).toBe(true)
  })

  it('persiste par officine et restaure les exemples sans toucher aux autres officines', async () => {
    const created = await guards.saveGuard(draft())
    expect(created.id).toBeGreaterThan(0)
    const firstOffice = await guards.loadGuards()
    expect(firstOffice.data.some(row => row.pharmacy_name === 'Pharmacie test — démonstration')).toBe(true)

    support.selectOffice('off-2')
    const secondOffice = await guards.loadGuards()
    expect(secondOffice.data.some(row => row.pharmacy_name === 'Pharmacie test — démonstration')).toBe(false)
    expect(secondOffice.data.some(row => row.pharmacy_name === 'Pharmacie du Fleuve — démonstration')).toBe(true)
    expect(secondOffice.data.map(row => row.pharmacy_name)).not.toEqual(firstOffice.data.map(row => row.pharmacy_name))

    support.selectOffice('off-1')
    expect((await guards.loadGuards()).data.some(row => row.pharmacy_name === 'Pharmacie test — démonstration')).toBe(true)
    guards.resetGuards()
    expect((await guards.loadGuards()).data.some(row => row.pharmacy_name === 'Pharmacie test — démonstration')).toBe(false)
  })

  it('refuse une fin antérieure et un chevauchement', async () => {
    const existing = (await guards.loadGuards()).data[0]!
    await expect(guards.saveGuard({ ...draft(), starts_at: guards.isoToInput(existing.starts_at), ends_at: guards.isoToInput(existing.ends_at) })).rejects.toThrow('chevauche')
    await expect(guards.saveGuard({ ...draft(), starts_at: '2027-04-06T10:00', ends_at: '2027-04-06T09:00' })).rejects.toThrow('postérieure')
    await expect(guards.saveGuard({ ...draft(), starts_at: 'invalide', ends_at: '2027-04-06T09:00' })).rejects.toThrow('valides')
  })

  it('modifie et supprime une garde enregistrée', async () => {
    const created = await guards.saveGuard(draft())
    const updated = await guards.saveGuard({ ...draft('Pharmacie modifiée — démonstration') }, created.id)
    expect(updated.pharmacy_name).toBe('Pharmacie modifiée — démonstration')
    await guards.deleteGuard(created.id)
    expect((await guards.loadGuards()).data.some(row => row.id === created.id)).toBe(false)
    await expect(guards.deleteGuard(999999)).rejects.toThrow('introuvable')
  })

  it('ne confirme rien si le stockage local refuse l’écriture', async () => {
    const before = (await guards.loadGuards()).data.length
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota dépassé') })
    await expect(guards.saveGuard(draft())).rejects.toThrow('Quota')
    spy.mockRestore()
    expect((await guards.loadGuards()).data.length).toBe(before)
  })

  it('convertit les heures de Porto-Novo et produit des exports sûrs', async () => {
    expect(guards.officeDay('2027-04-05T23:30:00Z')).toBe('2027-04-06')
    expect(guards.inputToIso('2027-04-06T08:30')).toBe('2027-04-06T07:30:00.000Z')
    expect(guards.isoToInput('2027-04-06T07:30:00.000Z')).toBe('2027-04-06T08:30')

    const rows = [{ id: 1, pharmacy_name: '=CMD', phone: null, address: 'A;B', starts_at: '2027-04-05T08:00:00+01:00', ends_at: '2027-04-05T20:00:00+01:00', reason: 'a,b' }]
    const csv = guards.guardsCsv(rows)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"\'=CMD"')
    expect(csv).toContain('"A;B"')
    const ics = guards.guardsICal(rows, 'Officine démo')
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('DTSTART:20270405T070000Z')
    expect(ics).toContain('DESCRIPTION:a\\,b')
    expect(ics).toContain('UID:garde-1@bestpharma.local')
  })
})
