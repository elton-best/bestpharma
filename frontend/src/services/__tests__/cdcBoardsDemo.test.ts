// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let demo: typeof import('../cdcBoardsDemo')
const choose = (id: string) => localStorage.setItem('bestpharma.demo.modules12.v1', JSON.stringify({ selectedOffice: id, offices: [{ id, name: `Officine ${id} — démo` }] }))

beforeEach(async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2027-04-05T09:00:00Z'))
  localStorage.clear()
  sessionStorage.clear()
  vi.resetModules()
  demo = await import('../cdcBoardsDemo')
})
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

describe('Données métier de démonstration', () => {
  it('offre des scénarios variés et ne présente pas une AMM comme vérifiée', async () => {
    const { data: products } = await demo.boardRequest<{ data: any[] }>('/stock/products')
    const { data: lots } = await demo.boardRequest<{ data: any[] }>('/stock/lots')
    const { data: employees } = await demo.boardRequest<{ data: any[] }>('/personnel/employees')
    expect(products.length).toBeGreaterThanOrEqual(8)
    expect(employees.length).toBeGreaterThanOrEqual(6)
    expect(products.every(product => product.amm_source_verified === false)).toBe(true)
    expect(lots.map(lot => lot.status)).toEqual(expect.arrayContaining(['disponible', 'quarantaine', 'rappele', 'perime']))
    for (const lot of lots) expect(products.some(product => product.id === lot.product_id)).toBe(true)
    expect(employees.every(employee => employee.email.endsWith('@example.test'))).toBe(true)
    expect(new Set(employees.map(employee => employee.email)).size).toBe(employees.length)
  })

  it('calcule stocks, indicateurs et alertes depuis les mêmes lots', async () => {
    const { data: products } = await demo.boardRequest<{ data: any[] }>('/stock/products')
    const { data: lots } = await demo.boardRequest<{ data: any[] }>('/stock/lots')
    const overview = await demo.boardRequest<{ kpis: Record<string, number> }>('/stock/overview')
    const summary = demo.getDemoDashboard()
    for (const product of products) {
      const total = lots.filter(lot => lot.product_id === product.id && lot.status === 'disponible' && lot.is_sellable && lot.expiry_date >= '2027-04-05').reduce((sum, lot) => sum + lot.available_qty, 0)
      expect(product.sellable_stock).toBe(total)
    }
    expect(overview.kpis.total_products).toBe(products.length)
    expect(overview.kpis.quarantine_lots).toBe(lots.filter(lot => lot.available_qty > 0 && ['quarantaine', 'rappele'].includes(lot.status)).length)
    expect(summary.stock.quarantineLots).toBe(lots.filter(lot => lot.status === 'quarantaine').length)
    expect(overview.kpis.below_threshold_products).toBe(summary.stock.lowStock)
    expect(summary.alerts.some(alert => alert.title === 'Lot en quarantaine')).toBe(true)
  })

  it('reporte les dates des scénarios et calcule sept jours de ventes payées seulement', async () => {
    const { data: sales } = await demo.boardRequest<{ data: any[] }>('/dispensation/sales')
    const summary = demo.getDemoDashboard()
    expect(summary.sales.series).toHaveLength(7)
    expect(summary.sales.series.at(-1)?.date).toBe('2027-04-05')
    for (const point of summary.sales.series) {
      const paid = sales.filter(sale => sale.status === 'payee' && sale.payment_status === 'confirme' && sale.sold_at?.startsWith(point.date))
      expect(point.amount).toBe(paid.reduce((sum, sale) => sum + sale.total_amount, 0))
      expect(point.count).toBe(paid.length)
    }
    expect(summary.sales.todayCount).toBe(1)
    expect(summary.sales.todayAmount).toBe(2500)
  })

  it('enregistre les créations et les isole par officine après rechargement', async () => {
    choose('off-1')
    const initial = demo.getDemoDashboard().stock.products
    await demo.boardRequest('/stock/products', 'POST', { name: 'Produit pédagogique supplémentaire', min_stock_threshold: 5, reorder_quantity: 10 })
    vi.resetModules()
    demo = await import('../cdcBoardsDemo')
    expect(demo.getDemoDashboard().stock.products).toBe(initial + 1)
    choose('off-2')
    expect(demo.getDemoDashboard().stock.products).toBe(initial)
    choose('off-1')
    expect(demo.getDemoDashboard().stock.products).toBe(initial + 1)
    demo.resetBoardsDemo('off-2')
    expect(demo.getDemoDashboard('off-1').stock.products).toBe(initial + 1)
    demo.resetBoardsDemo('off-1')
    expect(demo.getDemoDashboard('off-1').stock.products).toBe(initial)
  })

  it('utilise la journée de Porto-Novo même avant minuit UTC', async () => {
    vi.setSystemTime(new Date('2027-04-05T23:30:00Z'))
    vi.resetModules()
    demo = await import('../cdcBoardsDemo')
    const summary = demo.getDemoDashboard()
    expect(summary.sales.series.at(-1)?.date).toBe('2027-04-06')
    expect(summary.sales.todayCount).toBe(1)
    expect(summary.sales.todayAmount).toBe(2500)
  })

  it('persiste une transition et refuse les versions périmées', async () => {
    const { data: action } = await demo.boardRequest<{ data: any }>('/qualite/actions-v2/actions', 'POST', { title: 'Action test démo', due_date: '2027-04-06' })
    await demo.boardRequest(`/qualite/actions-v2/actions/${action.id}/start`, 'POST', { version: 1 })
    const read = await demo.boardRequest<{ data: any }>(`/qualite/actions-v2/actions/${action.id}`)
    expect(read.data.status).toBe('in_progress')
    expect(read.data.version).toBe(2)
    await expect(demo.boardRequest(`/qualite/actions-v2/actions/${action.id}/complete`, 'POST', { version: 1 })).rejects.toThrow('Version périmée')
  })

  it('répercute une quarantaine dans les produits et le tableau de bord', async () => {
    const before = demo.getDemoDashboard()
    await demo.boardRequest('/stock/lots/301/quarantine', 'POST', { event_type: 'quarantaine', reason: 'Exercice pédagogique' })
    const { data: products } = await demo.boardRequest<{ data: any[] }>('/stock/products')
    expect(products.find(product => product.id === 271).sellable_stock).toBe(0)
    expect(demo.getDemoDashboard().stock.quarantineLots).toBe(before.stock.quarantineLots + 1)
    await expect(demo.boardRequest('/stock/lots/307/quarantine', 'POST', { event_type: 'levee', reason: 'Démo', proof_reference: 'DEMO-PREUVE' })).rejects.toThrow('Levée refusée')
  })

  it('ne simule ni succès inconnu, ni vide API de remplacement', async () => {
    await expect(demo.boardRequest('/inconnu')).rejects.toThrow('consultation')
    await expect(demo.boardRequest('/inconnu', 'POST', {})).rejects.toThrow('action')
    await expect(demo.boardRequest('/stock/products/271', 'DELETE')).rejects.toThrow('opération')
    const state = await demo.boardRequest<{ available: boolean }>('/documents/library/status')
    expect(state.available).toBe(false)
  })

  it('signale une corruption de stockage sans la remplacer silencieusement', () => {
    localStorage.setItem('bestpharma.demo.boards.v1.off-1', '{cassé')
    expect(() => demo.getDemoDashboard()).toThrow('illisibles')
    expect(localStorage.getItem('bestpharma.demo.boards.v1.off-1')).toBe('{cassé')
  })

  it('ne confirme aucune écriture quand le stockage local échoue', async () => {
    const before = demo.getDemoDashboard().stock.products
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota dépassé') })
    await expect(demo.boardRequest('/stock/products', 'POST', { name: 'Ne doit pas être enregistré' })).rejects.toThrow('Quota')
    spy.mockRestore()
    expect(demo.getDemoDashboard().stock.products).toBe(before)
  })
})
