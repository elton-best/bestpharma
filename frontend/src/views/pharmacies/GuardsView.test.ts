// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { route } = vi.hoisted(() => ({ route: { query: {} as Record<string, string> } }))
const { loadGuards, saveGuard, deleteGuard } = vi.hoisted(() => ({
  loadGuards: vi.fn(), saveGuard: vi.fn(), deleteGuard: vi.fn(),
}))
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('@/services/pharmacyGuards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/pharmacyGuards')>()
  return { ...actual, loadGuards, saveGuard, deleteGuard }
})

import GuardsView from './GuardsView.vue'

const now = Date.now()
const rows = [
  { id: 1, pharmacy_name: 'Pharmacie en cours — démonstration', phone: null, address: 'Quartier A — démonstration', starts_at: new Date(now - 3600000).toISOString(), ends_at: new Date(now + 3600000).toISOString(), reason: 'Exemple fictif' },
  { id: 2, pharmacy_name: 'Pharmacie à venir — démonstration', phone: null, address: 'Quartier B — démonstration', starts_at: new Date(now + 86400000).toISOString(), ends_at: new Date(now + 86400000 + 3600000).toISOString(), reason: 'Exemple fictif' },
  { id: 3, pharmacy_name: 'Pharmacie passée — démonstration', phone: null, address: 'Quartier C — démonstration', starts_at: new Date(now - 2 * 86400000).toISOString(), ends_at: new Date(now - 2 * 86400000 + 3600000).toISOString(), reason: 'Exemple fictif' },
]
const AppModalStub = {
  props: ['modelValue', 'title', 'busy'],
  template: '<div v-if="modelValue" class="modal-stub"><h2>{{ title }}</h2><slot /><slot name="footer" /></div>',
}
function mountView() {
  return mount(GuardsView, {
    global: {
      stubs: {
        AppModal: AppModalStub,
        RouterLink: { template: '<a><slot /></a>' },
        AppIcon: true,
      },
    },
  })
}

beforeEach(() => {
  route.query = {}
  loadGuards.mockResolvedValue({ data: rows, can_write: true })
  saveGuard.mockResolvedValue(rows[0])
  deleteGuard.mockResolvedValue(undefined)
  Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:demo'), configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true })
})
afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks() })

describe('Pharmacies de garde — interface', () => {
  it('affiche les gardes, les filtres et les compteurs', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.get('[data-testid="guards-page"]').text()).toContain('Pharmacies de garde')
    expect(wrapper.findAll('[data-testid="guards-table"] tbody tr')).toHaveLength(3)
    expect(wrapper.get('[data-testid="guards-table"]').text()).toContain('Pharmacie en cours — démonstration')
    expect(wrapper.get('[data-testid="guards-table"]').text()).toContain('Non communiqué')
    expect(wrapper.get('[data-testid="guards-calendar"]').text()).toContain('Pharmacie à venir — démonstration')
    wrapper.unmount()
  })

  it('filtre par période sans perdre la recherche', async () => {
    const wrapper = mountView()
    await flushPromises()
    await wrapper.get('[data-testid="guards-period"]').setValue('upcoming')
    expect(wrapper.findAll('[data-testid="guards-table"] tbody tr')).toHaveLength(1)
    expect(wrapper.get('[data-testid="guards-table"]').text()).toContain('Pharmacie à venir')
    await wrapper.get('[data-testid="guards-search"]').setValue('passée')
    await wrapper.get('[data-testid="guards-search"]').trigger('change')
    expect(wrapper.findAll('[data-testid="guards-table"] tbody tr')).toHaveLength(0)
    expect(wrapper.get('[data-testid="guards-table"]').text()).toContain('Aucune garde')
    wrapper.unmount()
  })

  it('ouvre le formulaire sur un créneau libre, sans chevaucher les gardes affichées', async () => {
    const wrapper = mountView()
    await flushPromises()
    await wrapper.get('[data-testid="guards-create"]').trigger('click')
    const inputs = wrapper.get('[data-testid="guards-form"]').findAll('input')
    const start = new Date(inputs[3]!.element.value), end = new Date(inputs[4]!.element.value)
    expect(start.getTime()).toBeLessThan(end.getTime())
    for (const row of rows) {
      expect(start.getTime() < Date.parse(row.ends_at) && end.getTime() > Date.parse(row.starts_at)).toBe(false)
    }
    wrapper.unmount()
  })

  it('déclare une garde et conserve la modale ouverte en cas de refus', async () => {
    saveGuard.mockRejectedValueOnce(new Error('Créneau refusé par le serveur.'))
    const wrapper = mountView()
    await flushPromises()
    await wrapper.get('[data-testid="guards-create"]').trigger('click')
    const form = wrapper.get('[data-testid="guards-form"]')
    const inputs = form.findAll('input')
    await inputs[0]!.setValue('Nouvelle pharmacie — démonstration')
    await inputs[3]!.setValue('2027-04-07T08:00')
    await inputs[4]!.setValue('2027-04-07T12:00')
    await form.trigger('submit')
    await flushPromises()
    expect(saveGuard).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="guards-form"]').text()).toContain('Créneau refusé')
    expect(wrapper.find('[data-testid="guards-form"]').exists()).toBe(true)

    saveGuard.mockResolvedValueOnce(rows[0])
    await form.trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Garde déclarée et enregistrée')
    expect(wrapper.find('[data-testid="guards-form"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('passe en consultation seule sans bouton de création', async () => {
    loadGuards.mockResolvedValue({ data: rows, can_write: false })
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('[data-testid="guards-create"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="guards-readonly"]').text()).toContain('Consultation seule')
    expect(wrapper.findAll('[data-testid="guards-table"] tbody tr')).toHaveLength(3)
    wrapper.unmount()
  })

  it('signale une panne et permet de réessayer', async () => {
    loadGuards.mockRejectedValueOnce(new Error('Réseau indisponible.'))
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.get('[data-testid="guards-error"]').text()).toContain('Réseau indisponible')
    await wrapper.get('[data-testid="guards-retry"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="guards-error"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="guards-table"] tbody tr')).toHaveLength(3)
    wrapper.unmount()
  })

  it('exporte la vue en CSV sans lien téléphonique fictif', async () => {
    const wrapper = mountView()
    await flushPromises()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await wrapper.get('[data-testid="guards-export-csv"]').trigger('click')
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(wrapper.get('[data-testid="guards-feedback"]').text()).toContain('3 garde(s) exportée(s)')
    expect(wrapper.html()).not.toContain('href="tel:')
    wrapper.unmount()
  })
})
