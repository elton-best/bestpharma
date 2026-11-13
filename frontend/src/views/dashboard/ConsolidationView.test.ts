// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { route, replace, listGroupOffices, loadGroupConsolidation, downloadGroupCsv } = vi.hoisted(() => ({
  route: { query: {} as Record<string, string> },
  replace: vi.fn(),
  listGroupOffices: vi.fn(),
  loadGroupConsolidation: vi.fn(),
  downloadGroupCsv: vi.fn(),
}))
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => ({ replace }) }))
vi.mock('@/services/groupConsolidation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/groupConsolidation')>()
  return { ...actual, listGroupOffices, loadGroupConsolidation, downloadGroupCsv }
})

import ConsolidationView from './ConsolidationView.vue'

const offices = [
  { id: 'off-1', name: 'Pharmacie des Palmiers', city: 'Porto-Novo' },
  { id: 'off-2', name: 'Pharmacie du Lac', city: 'Cotonou' },
]
const metric = {
  code: 'nc_closed_rate', title: 'Non-conformités clôturées', definition: 'Actions clôturées sur actions ouvertes.',
  unit: '%', numerator: 3, denominator: 4, value: 75, display_value: '75 %', computed_at: '2027-04-05T09:00:00Z',
}
function result(overrides: Partial<import('@/services/groupConsolidation').GroupResult> = {}): import('@/services/groupConsolidation').GroupResult {
  return {
    period: { start: '2027-03-07', end: '2027-04-05' }, complete: false, generatedAt: '2027-04-05T10:00:00Z',
    metrics: [{ ...metric, covered: 1, expected: 2, complete: false, display_value: 'Périmètre incomplet' }],
    offices: [
      { office: offices[0]!, available: true, metrics: [metric], asOf: '2027-04-05T09:00:00Z', error: null },
      { office: offices[1]!, available: false, metrics: [], asOf: null, error: 'Accès au reporting refusé pour cette officine.' },
    ],
    ...overrides,
  }
}
const AppModalStub = {
  props: ['modelValue', 'title', 'busy'],
  template: '<div v-if="modelValue" class="modal-stub"><h2>{{ title }}</h2><slot /><slot name="footer" /></div>',
}
function mountView() {
  return mount(ConsolidationView, {
    global: { stubs: { AppModal: AppModalStub, AppIcon: true, RouterLink: { template: '<a><slot /></a>' } } },
  })
}

beforeEach(() => {
  route.query = {}
  listGroupOffices.mockResolvedValue(offices)
  loadGroupConsolidation.mockResolvedValue(result())
  downloadGroupCsv.mockReset()
})
afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks() })

describe('Consolidation Groupe — interface', () => {
  it('charge le périmètre, consolide les officines et montre les sources indisponibles', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(listGroupOffices).toHaveBeenCalledTimes(1)
    expect(loadGroupConsolidation).toHaveBeenCalledTimes(1)
    expect(loadGroupConsolidation.mock.calls[0]![0]).toEqual(['off-1', 'off-2'])
    expect(wrapper.get('[data-testid="consolidation-notice"]').text()).toContain('chiffres sont fictifs')
    expect(wrapper.get('[data-testid="consolidation-summary"]').text()).toContain('1 / 2')
    expect(wrapper.get('[data-testid="consolidation-metrics"]').text()).toContain('Non-conformités clôturées')
    expect(wrapper.get('[data-testid="consolidation-metrics"]').text()).toContain('Périmètre incomplet')
    expect(wrapper.get('[data-testid="consolidation-offices-results"]').text()).toContain('Accès au reporting refusé')
    expect(wrapper.text()).toContain('aucune valeur n’est inventée')
    wrapper.unmount()
  })

  it('consolide seulement les officines cochées sur la période choisie', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('[data-testid="consolidation-start"]').setValue('2027-03-01')
    await wrapper.get('[data-testid="consolidation-end"]').setValue('2027-03-31')
    const checks = wrapper.findAll('[data-testid="consolidation-offices"] input[type="checkbox"]')
    await checks[1]!.setValue(false)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(loadGroupConsolidation).toHaveBeenLastCalledWith(['off-1'], { start: '2027-03-01', end: '2027-03-31' })
    expect(replace).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('exporte la consolidation réellement affichée', async () => {
    const wrapper = mountView()
    await flushPromises()
    await wrapper.get('[data-testid="consolidation-export"]').trigger('click')
    expect(downloadGroupCsv).toHaveBeenCalledWith(expect.objectContaining({ complete: false }))
    expect(wrapper.get('[data-testid="consolidation-feedback"]').text()).toContain('sources disponibles et leurs erreurs')
    wrapper.unmount()
  })

  it('signale une panne de consolidation sans inventer de résultat et permet de réessayer', async () => {
    loadGroupConsolidation.mockRejectedValueOnce(new Error('Réseau indisponible.'))
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('[data-testid="consolidation-error"]').text()).toContain('Réseau indisponible')
    expect(wrapper.find('[data-testid="consolidation-metrics"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="consolidation-export"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="consolidation-error"] .button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="consolidation-error"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="consolidation-metrics"]').text()).toContain('Non-conformités clôturées')
    wrapper.unmount()
  })

  it('affiche une erreur de périmètre et désactive la consolidation', async () => {
    listGroupOffices.mockRejectedValueOnce(new Error('Périmètre illisible.'))
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('[data-testid="consolidation-offices"]').text()).toContain('Périmètre illisible')
    expect(wrapper.get('[data-testid="consolidation-submit"]').attributes('disabled')).toBeDefined()
    expect(loadGroupConsolidation).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
