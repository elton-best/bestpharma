// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let reporting: typeof import('../reporting')
let boards: typeof import('../cdcBoardsDemo')
let support: typeof import('../supportDemo')
const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
let downloaded = ''

beforeEach(async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2027-04-05T09:00:00Z'))
  localStorage.clear()
  sessionStorage.clear()
  vi.resetModules()
  reporting = await import('../reporting')
  boards = await import('../cdcBoardsDemo')
  support = await import('../supportDemo')
  downloaded = ''
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { subtle: { digest: vi.fn(async () => new Uint8Array(32).fill(0xab).buffer) } },
  })
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:report') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloaded = this.download })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  if (cryptoDescriptor) Object.defineProperty(globalThis, 'crypto', cryptoDescriptor)
  else delete (globalThis as { crypto?: unknown }).crypto
})

describe('Reporting M14 — périodes et indicateurs', () => {
  it('valide les périodes et calcule la période précédente de même durée', () => {
    expect(() => reporting.validatePeriod('2027-04-05', '2027-04-01')).toThrow('période valide')
    expect(() => reporting.validatePeriod('2027-02-30', '2027-03-01')).toThrow('période valide')
    expect(reporting.previousPeriod('2027-03-07', '2027-04-05')).toEqual({ start: '2027-02-05', end: '2027-03-06' })
    expect(reporting.previousPeriod('2027-03-01', '2027-03-31')).toEqual({ start: '2027-01-29', end: '2027-02-28' })
  })

  it('affiche N/D sans faux zéro et calcule un écart seulement sur des unités comparables', () => {
    const base = { code: 'X', module_key: 'qualite', title: 'X', definition: 'X', unit: '%', numerator: 0, denominator: 0, value: null, display_value: 'non disponible', computed_at: '2027-04-05' }
    expect(reporting.metricDisplay(base)).toBe('N/D')
    expect(reporting.metricDisplay({ ...base, denominator: 2, value: 0, display_value: '0 %' })).toBe('0 %')
    expect(reporting.metricDelta({ ...base, denominator: 2, value: 75, display_value: '75 %' }, { ...base, denominator: 2, value: 50, display_value: '50 %' })).toBe('+25 points')
    expect(reporting.metricDelta({ ...base, unit: 'jours', value: 3, display_value: '3 jours' }, { ...base, unit: '%', value: 50, display_value: '50 %' })).toBe('N/D')
  })

  it('lit les indicateurs de la période et isole réellement les officines', async () => {
    const first = await reporting.reportingService.overview('2027-01-01', '2027-12-31')
    expect(first.metrics).toHaveLength(3)
    expect(first.meta?.period_start).toBe('2027-01-01')
    expect(first.metrics[0]!.code).toBe('CAPA_CLOSURE_RATE')

    support.selectOffice('off-2')
    const second = await reporting.reportingService.overview('2027-01-01', '2027-12-31')
    expect(second.metrics).not.toEqual(first.metrics)

    support.selectOffice('off-1')
    const restored = await reporting.reportingService.overview('2027-01-01', '2027-12-31')
    expect(restored.metrics.map(metric => [metric.code, metric.numerator, metric.denominator])).toEqual(first.metrics.map(metric => [metric.code, metric.numerator, metric.denominator]))
  })
})

describe('Reporting M14 — snapshots, exports et diffusions', () => {
  it('fige les indicateurs à la génération et refuse les doublons ou codes inconnus', async () => {
    const before = await reporting.reportingService.overview('2027-01-01', '2027-12-31')
    const run = await reporting.reportingService.generate({
      reference: 'RPT-TEST-1', title: 'Bilan de démonstration', period_start: '2027-01-01', period_end: '2027-12-31',
      metric_codes: before.metrics.map(metric => metric.code),
    })
    expect(run.status).toBe('fige')
    expect(run.computed_metrics).toHaveLength(3)
    const snapshot = run.computed_metrics.map(metric => [metric.code, metric.numerator, metric.denominator])

    await boards.boardRequest('/qualite/actions-v2/actions/21', 'PATCH', { due_date: '2028-01-15' })
    const after = await reporting.reportingService.overview('2027-01-01', '2027-12-31')
    expect(after.metrics[0]!.denominator).toBe(before.metrics[0]!.denominator - 1)
    expect(run.computed_metrics.map(metric => [metric.code, metric.numerator, metric.denominator])).toEqual(snapshot)

    await expect(reporting.reportingService.generate({
      reference: 'RPT-TEST-1', title: 'Doublon', period_start: '2027-01-01', period_end: '2027-12-31', metric_codes: ['CAPA_CLOSURE_RATE'],
    })).rejects.toThrow('existe déjà')
    await expect(reporting.reportingService.generate({
      reference: 'RPT-TEST-2', title: 'Code inconnu', period_start: '2027-01-01', period_end: '2027-12-31', metric_codes: ['INCONNU'],
    })).rejects.toThrow('inconnue')
  })

  it('télécharge le CSV figé, neutralise les formules et renvoie l’empreinte des octets téléchargés', async () => {
    const run = await reporting.reportingService.generate({
      reference: 'RPT/Export démo', title: 'Bilan', period_start: '2027-01-01', period_end: '2027-12-31',
      metric_codes: ['CAPA_CLOSURE_RATE'],
    })
    const exported = await reporting.reportingService.export(run.id)
    expect(exported.data.format).toBe('csv')
    const checksum = await reporting.downloadCsv(exported.content, run.reference)
    expect(downloaded).toBe('RPT_Export_d_mo.csv')
    expect(checksum).toMatch(/^[a-f0-9]{64}$/)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)

    const safe = reporting.safeCsv('Code;Valeur\r\n=1+1;"a;b"')
    expect(safe.startsWith('\uFEFF')).toBe(true)
    expect(safe).toContain('"\'=1+1"')
    expect(safe).toContain('"a;b"')
    expect(() => reporting.safeCsv('a;"b')).toThrow('mal formé')
    await expect(reporting.downloadCsv('   ', 'vide')).rejects.toThrow('aucun contenu CSV')
  })

  it('reprend uniquement une diffusion en échec et met à jour ses tentatives', async () => {
    const jobs = await reporting.reportingService.jobs()
    const failed = jobs.find(job => job.status === 'echec')
    expect(failed).toBeTruthy()
    const retried = await reporting.reportingService.retry(failed!.id)
    expect(retried.status).toBe('en_attente')
    expect(retried.attempts).toBe(failed!.attempts + 1)
    expect(retried.last_error).toBeNull()
    await expect(reporting.reportingService.retry(failed!.id)).rejects.toThrow('Seules les notifications en échec')
    await expect(reporting.reportingService.retry(999999)).rejects.toThrow('introuvable')
  })

  it('exige fréquence, consentement et destinataires pour une diffusion planifiée', async () => {
    const base = {
      code: 'TPL-TEST', title: 'Modèle test', category: 'smq_bpd', metric_codes: ['CAPA_CLOSURE_RATE'],
      default_format: 'csv' as const, is_scheduled: true, cron_schedule: '0 8 * * 1', consent_confirmed: false, recipients: [1],
    }
    expect(() => reporting.validateSchedule(base)).toThrow('consentement')
    expect(() => reporting.validateSchedule({ ...base, consent_confirmed: true, recipients: [] })).toThrow('destinataires')
    const created = await reporting.reportingService.createTemplate({ ...base, consent_confirmed: true })
    expect(created.code).toBe('TPL-TEST')
    expect(created.default_format).toBe('csv')
    await expect(reporting.reportingService.createTemplate({ ...base, code: 'TPL-TEST', consent_confirmed: true })).rejects.toThrow('existe déjà')
    await expect(reporting.reportingService.createTemplate({ ...base, code: 'TPL-PDF', consent_confirmed: true, default_format: 'pdf' as 'csv' })).rejects.toThrow('Seul le format CSV')
  })
})
