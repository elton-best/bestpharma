// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import OverviewView from './OverviewView.vue'
import { supportState } from '@/services/supportDemo'
import type { DemoDashboard } from '@/services/cdcBoardsDemo'

const mock = vi.hoisted(() => ({ demo: true, dashboard: vi.fn(), reset: vi.fn() }))
vi.mock('@/services/quality', () => ({ get demoMode() { return mock.demo } }))
vi.mock('@/services/cdcBoardsDemo', () => ({ getDemoDashboard: mock.dashboard, resetBoardsDemo: mock.reset }))
vi.mock('./DashboardView.vue', () => ({ default: { template: '<section data-testid="api-dashboard">Tableau qualité API</section>' } }))
vi.mock('@/services/supportDemo', async () => {
  const { reactive, computed } = await import('vue')
  const supportState = reactive({ selectedOffice: 'test-1', persona: 'office', offices: [
    { id: 'test-1', name: 'Officine synthétique A', city: 'Ville A' },
    { id: 'test-2', name: 'Officine synthétique B', city: 'Ville B' },
  ] })
  return { supportState, currentOffice: computed(() => supportState.offices.find(office => office.id === supportState.selectedOffice)) }
})

// Synthetic fixtures only; production indicators come exclusively from the adapter.
function fixture(officeId = 'test-1'): DemoDashboard {
  return {
    officeId, officeName: `Officine ${officeId}`, generatedAt: '2026-11-12T10:00:00Z',
    sales: { todayAmount: 12345, todayCount: 7, series: [
      { date: '2026-11-11', amount: 1000, count: 2 }, { date: '2026-11-12', amount: 12345, count: 7 },
    ] },
    stock: { products: 19, availableLots: 8, quarantineLots: 3, lowStock: 4, expiringLots: 2 },
    quality: { openNc: 6, overdueActions: 2, plannedInspections: 1 },
    team: { activeEmployees: 5, plannedTrainings: 3 },
    alerts: [{ id: 'alert-1', title: 'Vigilance synthétique', detail: 'Lot de test à contrôler', severity: 'critical', to: '/stock/approvisionnements' }],
    activity: [{ id: 'event-1', title: 'Vente synthétique payée', detail: 'Ticket de test', at: '2026-11-12T09:00:00Z', to: '/dispensation/ventes' }],
  }
}
const wrappers: VueWrapper[] = []
async function render() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push('/dashboard')
  await router.isReady()
  const wrapper = mount(OverviewView, { attachTo: document.body, global: { plugins: [router] } })
  wrappers.push(wrapper)
  return { wrapper, router }
}
beforeEach(() => {
  mock.demo = true
  mock.dashboard.mockReset().mockImplementation((officeId: string) => fixture(officeId))
  mock.reset.mockReset()
  supportState.selectedOffice = 'test-1'
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  document.body.innerHTML = ''
})
function dialog() {
  const element = document.querySelector('[role="dialog"]')
  expect(element).not.toBeNull()
  return new DOMWrapper(element!)
}

describe('Pilotage officinal', () => {
  it('affiche les indicateurs du service, le contexte courant et les liens métier', async () => {
    const { wrapper, router } = await render()
    expect(mock.dashboard).toHaveBeenCalledExactlyOnceWith('test-1')
    expect(wrapper.text()).toContain('Officine synthétique A · Ville A')
    expect(wrapper.text()).toContain('DÉMONSTRATION · DONNÉES FICTIVES')
    expect(wrapper.text()).not.toContain('Bienvenue, Alex')
    expect(wrapper.find('[data-tour="dashboard"]').exists()).toBe(true)
    expect(wrapper.find('[data-tour3]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="dashboard-kpi-sales"]').text().replace(/\s/g, '')).toContain('12345FCFA7ticket(s)payé(s)')
    expect(wrapper.get('[data-testid="dashboard-kpi-stock"]').text()).toContain('4')
    expect(wrapper.get('[data-testid="dashboard-kpi-stock"]').text()).toContain('19 produits')
    expect(wrapper.text()).toContain('NC ouvertes 6')
    expect(wrapper.text()).toContain('Équipe active 5')
    expect(wrapper.get('[data-testid="dashboard-alerts"]').text()).toContain('Vigilance synthétique')
    expect(wrapper.get('[data-testid="dashboard-alerts"]').text()).toContain('Prioritaire')
    expect(wrapper.get('[data-testid="dashboard-activity"] time').attributes('datetime')).toBe('2026-11-12T09:00:00Z')
    const links = wrapper.findAll('a').map(link => link.attributes('href'))
    for (const target of ['/tresorerie/caisse', '/stock/approvisionnements', '/qualite/non-conformites', '/personnel/formations', '/documents', '/dashboard/accompagnement']) expect(links).toContain(target)
    await wrapper.get('[data-testid="dashboard-kpi-sales"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/dispensation/ventes')
  })

  it('fournit un graphique nommé, un résumé et un tableau des valeurs datées', async () => {
    const { wrapper } = await render()
    const chart = wrapper.get('[data-testid="dashboard-sales-chart"]')
    expect(chart.get('[role="img"]').attributes('aria-labelledby')).toBe('sales-chart-title sales-chart-desc')
    expect(chart.get('#sales-chart-title').text()).toContain('FCFA')
    expect(chart.get('#sales-chart-desc').text().replace(/\s/g, '')).toContain('13345FCFA')
    expect(chart.findAll('rect')).toHaveLength(2)
    expect(chart.get('details summary').text()).toContain('données du graphique')
    expect(chart.get('table caption').text()).toContain('Ventes payées')
    expect(chart.findAll('tbody tr')).toHaveLength(2)
    expect(chart.get('tbody tr th').attributes('scope')).toBe('row')
    expect(chart.text()).toContain('11 novembre 2026')
    expect(chart.text()).toContain('12 novembre 2026')
  })

  it('recalcule à l’actualisation sans conserver les anciens chiffres', async () => {
    const { wrapper } = await render()
    const updated = fixture()
    updated.sales.todayAmount = 678
    mock.dashboard.mockReturnValueOnce(updated)
    await wrapper.get('.officine-heading-actions button').trigger('click')
    expect(mock.dashboard).toHaveBeenCalledTimes(2)
    expect(wrapper.get('[data-testid="dashboard-kpi-sales"]').text()).toContain('678 FCFA')
    expect(wrapper.get('[role="status"]').text()).toContain('11:00')
  })

  it('affiche les sept dates dans une grille HTML lisible sans texte SVG rétréci', async () => {
    const data = fixture()
    data.sales.series = Array.from({ length: 7 }, (_, index) => ({ date: `2026-11-${index + 10}`, amount: index * 100, count: index }))
    mock.dashboard.mockReturnValueOnce(data)
    const { wrapper } = await render()
    const chart = wrapper.get('[data-testid="dashboard-sales-chart"]')
    expect(chart.findAll('rect')).toHaveLength(7)
    expect(chart.findAll('svg text')).toHaveLength(0)
    expect(chart.get('.officine-chart-labels').attributes('style')).toContain('repeat(7, minmax(0, 1fr))')
    expect(chart.findAll('.officine-chart-labels span').map(label => label.text())).toEqual(['10 nov.', '11 nov.', '12 nov.', '13 nov.', '14 nov.', '15 nov.', '16 nov.'])
    expect(chart.findAll('tbody tr')).toHaveLength(7)
    expect(chart.get('[role="img"]').attributes('aria-labelledby')).toBe('sales-chart-title sales-chart-desc')
  })

  it('limite la liste initiale aux cinq priorités et permet de retrouver chaque vigilance et lien', async () => {
    const data = fixture()
    data.alerts = Array.from({ length: 10 }, (_, index) => ({ id: `test-alert-${index}`, title: `Alerte ${index}`, detail: `Détail ${index}`, severity: index === 9 ? 'critical' : 'info', to: `/stock/approvisionnements?test=${index}` }))
    mock.dashboard.mockReturnValueOnce(data)
    const { wrapper } = await render()
    const alerts = wrapper.get('[data-testid="dashboard-alerts"]')
    expect(alerts.findAll('li')).toHaveLength(5)
    expect(alerts.get('li strong').text()).toBe('Alerte 9')
    const toggle = alerts.get('.officine-alert-toggle')
    expect(toggle.text()).toBe('Voir les 10 vigilances')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.attributes('aria-controls')).toBe('dashboard-vigilance-list')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(alerts.findAll('li')).toHaveLength(10)
    for (const alert of data.alerts) expect(alerts.findAll('li a').map(link => link.attributes('href'))).toContain(alert.to)
    await toggle.trigger('click')
    expect(alerts.findAll('li')).toHaveLength(5)
  })

  it('isole le changement d’officine et remplace les activités précédentes', async () => {
    const { wrapper } = await render()
    const second = fixture('test-2')
    second.sales.todayAmount = 90
    second.activity = []
    second.alerts = []
    mock.dashboard.mockReturnValueOnce(second)
    supportState.selectedOffice = 'test-2'
    await nextTick()
    expect(mock.dashboard).toHaveBeenLastCalledWith('test-2')
    expect(wrapper.text()).toContain('Officine synthétique B · Ville B')
    expect(wrapper.get('[data-testid="dashboard-kpi-sales"]').text()).toContain('90 FCFA')
    expect(wrapper.get('[data-testid="dashboard-activity"]').text()).toContain('Aucune activité')
    expect(wrapper.get('[data-testid="dashboard-alerts"]').text()).toContain('Aucun point de vigilance')
    expect(wrapper.text()).not.toContain('Vente synthétique payée')
  })

  it('ne lit aucune donnée démo en branche API et conserve le dashboard qualité', async () => {
    mock.demo = false
    const { wrapper } = await render()
    expect(wrapper.get('[data-testid="api-dashboard"]').text()).toBe('Tableau qualité API')
    expect(wrapper.find('[data-testid="dashboard-kpi-sales"]').exists()).toBe(false)
    expect(mock.dashboard).not.toHaveBeenCalled()
    expect(mock.reset).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="dashboard-restore"]').exists()).toBe(false)
    supportState.selectedOffice = 'test-2'
    await nextTick()
    expect(mock.dashboard).not.toHaveBeenCalled()
    expect(wrapper.findAll('a').map(link => link.attributes('href'))).toEqual(['/dashboard/acces', '/dashboard/accompagnement'])
  })

  it('signale une erreur de stockage, masque les anciens KPI et permet une reprise', async () => {
    const { wrapper } = await render()
    mock.dashboard.mockImplementationOnce(() => { throw new Error('Stockage synthétique illisible') })
    await wrapper.get('.officine-heading-actions button').trigger('click')
    expect(wrapper.get('[role="alert"]').text()).toContain('Stockage synthétique illisible')
    expect(wrapper.find('[data-testid="dashboard-kpi-sales"]').exists()).toBe(false)
    await wrapper.get('[role="alert"] button').trigger('click')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="dashboard-kpi-sales"]').text()).toContain('Ventes du jour')
  })

  it('distingue une période sans ventes d’une erreur et conserve le tableau accessible', async () => {
    const empty = fixture()
    empty.sales = { todayAmount: 0, todayCount: 0, series: [{ date: '2026-11-12', amount: 0, count: 0 }] }
    mock.dashboard.mockReturnValueOnce(empty)
    const { wrapper } = await render()
    expect(wrapper.text()).toContain('Aucune vente payée sur cette période')
    expect(wrapper.get('rect').attributes('height')).toBe('0')
    expect(wrapper.get('[data-testid="dashboard-kpi-sales"]').text()).toContain('0 FCFA')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('présente une confirmation accessible et annule sans modifier les tableaux', async () => {
    const { wrapper } = await render()
    await wrapper.get('[data-testid="dashboard-restore"]').trigger('click')
    const modal = dialog()
    expect(modal.attributes('aria-modal')).toBe('true')
    expect(document.getElementById(modal.attributes('aria-labelledby')!)?.textContent).toBe('Restaurer les exemples ?')
    expect(modal.text()).toContain('modules 3 à 15')
    expect(modal.text()).toContain('Officine synthétique A')
    expect(modal.text()).toContain('modules 1 et 2')
    expect(modal.text()).toContain('données réelles ne seront pas modifiés')
    expect(mock.reset).not.toHaveBeenCalled()
    await modal.get('[data-testid="dashboard-restore-cancel"]').trigger('click')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(mock.reset).not.toHaveBeenCalled()
    expect(mock.dashboard).toHaveBeenCalledTimes(1)
  })

  it('restaure uniquement l’identifiant courant après confirmation puis recalcule', async () => {
    const { wrapper } = await render()
    supportState.selectedOffice = 'test-2'
    await nextTick()
    await wrapper.get('[data-testid="dashboard-restore"]').trigger('click')
    expect(dialog().text()).toContain('Officine synthétique B')
    const restored = fixture('test-2')
    restored.stock.lowStock = 9
    mock.dashboard.mockReturnValueOnce(restored)
    await dialog().get('[data-testid="dashboard-restore-confirm"]').trigger('click')
    expect(mock.reset).toHaveBeenCalledExactlyOnceWith('test-2')
    expect(mock.dashboard).toHaveBeenLastCalledWith('test-2')
    expect(mock.reset.mock.invocationCallOrder[0]).toBeLessThan(mock.dashboard.mock.invocationCallOrder.at(-1)!)
    expect(wrapper.get('[data-testid="dashboard-kpi-stock"] strong').text()).toBe('9')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('offre la restauration même quand le stockage corrompu empêche tout indicateur', async () => {
    mock.dashboard.mockImplementationOnce(() => { throw new Error('Données illisibles') })
    const { wrapper } = await render()
    expect(wrapper.find('[data-testid="dashboard-kpi-sales"]').exists()).toBe(false)
    await wrapper.get('[data-testid="dashboard-error-restore"]').trigger('click')
    await dialog().get('[data-testid="dashboard-restore-confirm"]').trigger('click')
    expect(mock.reset).toHaveBeenCalledExactlyOnceWith('test-1')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="dashboard-kpi-sales"]').exists()).toBe(true)
  })

  it.each(['QuotaExceededError', 'SecurityError'])('garde la confirmation ouverte sur refus de stockage (%s)', async errorName => {
    const { wrapper } = await render()
    await wrapper.get('[data-testid="dashboard-restore"]').trigger('click')
    mock.reset.mockImplementationOnce(() => { throw new DOMException('Stockage refusé pour le test', errorName) })
    await dialog().get('[data-testid="dashboard-restore-confirm"]').trigger('click')
    expect(dialog().get('[role="alert"]').text()).toContain(errorName === 'QuotaExceededError'
      ? 'Restauration impossible : Le quota de stockage du navigateur est dépassé.'
      : 'Restauration impossible : Le navigateur refuse l’accès au stockage des exemples.')
    expect(mock.dashboard).toHaveBeenCalledTimes(1)
    expect(mock.reset).toHaveBeenCalledExactlyOnceWith('test-1')
    await dialog().get('[data-testid="dashboard-restore-confirm"]').trigger('click')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(mock.dashboard).toHaveBeenCalledTimes(2)
  })

  it('ne ferme pas la confirmation si le recalcul après restauration échoue', async () => {
    const { wrapper } = await render()
    await wrapper.get('[data-testid="dashboard-restore"]').trigger('click')
    mock.dashboard.mockImplementationOnce(() => { throw new Error('Lecture refusée après restauration') })
    await dialog().get('[data-testid="dashboard-restore-confirm"]').trigger('click')
    expect(dialog().get('[role="alert"]').text()).toContain('Lecture refusée après restauration')
    expect(wrapper.find('[data-testid="dashboard-kpi-sales"]').exists()).toBe(false)
    await dialog().get('[data-testid="dashboard-restore-cancel"]').trigger('click')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(wrapper.get('[role="alert"]').text()).toContain('Lecture refusée après restauration')
  })

  it('annule la confirmation si l’officine change pour éviter une restauration non confirmée', async () => {
    const { wrapper } = await render()
    await wrapper.get('[data-testid="dashboard-restore"]').trigger('click')
    supportState.selectedOffice = 'test-2'
    await nextTick()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(mock.reset).not.toHaveBeenCalled()
    expect(mock.dashboard).toHaveBeenLastCalledWith('test-2')
  })
})
