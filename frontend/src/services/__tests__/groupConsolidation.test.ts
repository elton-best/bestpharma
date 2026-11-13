// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let group: typeof import('../groupConsolidation')
const today = '2027-04-05'
const start = '2027-03-07'

beforeEach(async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2027-04-05T09:00:00Z'))
  localStorage.clear()
  sessionStorage.clear()
  vi.resetModules()
  group = await import('../groupConsolidation')
})
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

describe('Consolidation Groupe — agrégation et couverture', () => {
  it('liste uniquement les officines actives du périmètre démo', async () => {
    const offices = await group.listGroupOffices()
    expect(offices.map(office => office.id)).toEqual(['off-1', 'off-2'])
    expect(offices.every(office => office.name.length > 0)).toBe(true)
  })

  it('consolide des indicateurs réels par officine et pondère les ratios', async () => {
    const result = await group.loadGroupConsolidation(['off-1', 'off-2'], { start, end: today })
    expect(result.complete).toBe(true)
    expect(result.offices).toHaveLength(2)
    expect(result.metrics.length).toBeGreaterThan(0)
    expect(result.offices[0]!.metrics).not.toEqual(result.offices[1]!.metrics)
    for (const metric of result.metrics) {
      const sources = result.offices.flatMap(office => office.metrics.filter(item => item.code === metric.code))
      expect(metric.numerator).toBe(sources.reduce((sum, item) => sum + item.numerator, 0))
      expect(metric.denominator).toBe(sources.reduce((sum, item) => sum + item.denominator, 0))
      expect(metric.covered).toBe(2)
      expect(metric.expected).toBe(2)
      if (metric.unit === '%' && metric.denominator > 0) expect(metric.value).toBeCloseTo(metric.numerator / metric.denominator * 100, 1)
    }
  })

  it('n’invente aucune valeur quand une source manque ou change de définition', () => {
    const base = {
      code: 'x', title: 'Indicateur X', definition: 'Même définition', unit: '%',
      numerator: 1, denominator: 2, value: 50, display_value: '50 %', computed_at: today,
    }
    const offices: import('../groupConsolidation').OfficeIndicators[] = [
      { office: { id: 'a', name: 'A' }, available: true, metrics: [base], asOf: today, error: null },
      { office: { id: 'b', name: 'B' }, available: false, metrics: [], asOf: null, error: 'Accès refusé' },
    ]
    const partial = group.aggregateGroupIndicators(offices)
    expect(partial[0]!.complete).toBe(false)
    expect(partial[0]!.covered).toBe(1)
    expect(partial[0]!.display_value).toBe('Périmètre incomplet')

    const mismatch = group.aggregateGroupIndicators([
      offices[0]!,
      { office: { id: 'b', name: 'B' }, available: true, metrics: [{ ...base, definition: 'Autre définition' }], asOf: today, error: null },
    ])
    expect(mismatch[0]!.complete).toBe(false)
    expect(mismatch[0]!.value).toBeNull()
  })

  it('valide la période et le périmètre avant toute lecture', async () => {
    expect(() => group.validateGroupPeriod({ start: '2027-04-05', end: '2027-04-01' })).toThrow('période valide')
    expect(() => group.validateGroupPeriod({ start: '2026-01-01', end: '2027-04-01' })).toThrow('un an')
    await expect(group.loadGroupConsolidation([], { start, end: today })).rejects.toThrow('entre une et vingt officines')
    await expect(group.loadGroupConsolidation(['off-3'], { start, end: today })).rejects.toThrow('périmètre autorisé')
  })

  it('exporte les sources indisponibles et neutralise les formules CSV', () => {
    const result: import('../groupConsolidation').GroupResult = {
      period: { start, end: today }, complete: false, generatedAt: new Date().toISOString(),
      metrics: [{ code: 'x', title: 'Indicateur X', definition: 'Même définition', unit: '%', numerator: 1, denominator: 2, value: null, display_value: 'Périmètre incomplet', covered: 0, expected: 1, complete: false }],
      offices: [{ office: { id: 'a', name: '=CMD' }, available: false, metrics: [], asOf: null, error: '=ERREUR' }],
    }
    const csv = group.groupCsv(result)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"\'=CMD"')
    expect(csv).toContain('"\'=ERREUR"')
    expect(csv).toContain('Périmètre sélectionné')
  })
})
