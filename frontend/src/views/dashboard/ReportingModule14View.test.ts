// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { route, replace } = vi.hoisted(() => ({
  route: { query: {} as Record<string, string> },
  replace: vi.fn(async (location: { query?: Record<string, string> }) => { route.query = { ...(location.query || {}) } }),
}))
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => ({ replace }) }))

import ReportingModule14View from './ReportingModule14View.vue'

const AppModalStub = {
  props: ['modelValue', 'title', 'busy'],
  template: '<div v-if="modelValue" class="modal-stub"><h2>{{ title }}</h2><slot /><slot name="footer" /></div>',
}
const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')

function mountView() {
  return mount(ReportingModule14View, {
    global: { stubs: { AppModal: AppModalStub, AppIcon: true, RouterLink: { template: '<a><slot /></a>' } } },
  })
}

beforeEach(() => {
  route.query = {}
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: () => '12345678-1234-1234-1234-123456789012',
      subtle: { digest: vi.fn(async () => new Uint8Array(32).fill(0xcd).buffer) },
    },
  })
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:m14') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
  if (cryptoDescriptor) Object.defineProperty(globalThis, 'crypto', cryptoDescriptor)
  else delete (globalThis as { crypto?: unknown }).crypto
})

describe('Reporting M14 — interface', () => {
  it('affiche la vue d’ensemble démo avec les indicateurs et les définitions', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.get('[data-testid="reporting-page"]').text()).toContain('Tableaux de bord & rapports')
    expect(wrapper.get('[data-testid="reporting-page"]').text()).toContain('Démonstration · données fictives')
    expect(wrapper.get('[data-testid="reporting-kpis"]').text()).toContain('Rapports figés')
    expect(wrapper.get('[data-testid="metrics-table"]').text()).toContain('Taux de clôture des actions')
    expect(wrapper.get('[data-testid="metrics-table"]').text()).toContain('CAPA_CLOSURE_RATE')
    expect(wrapper.text()).toContain('Un dénominateur nul donne N/D, jamais 0 %')
    wrapper.unmount()
  })

  it('liste les rapports de la période et télécharge leur snapshot CSV', async () => {
    route.query = { tab: 'runs', period_start: '2026-01-01', period_end: '2027-12-31' }
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.get('[data-testid="runs-table"]').text()).toContain('Bilan Officinal Consolidé')
    await wrapper.get('[data-testid="run-export"]').trigger('click')
    await flushPromises()
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="reporting-feedback"]').text()).toContain('CSV téléchargé')
    expect(wrapper.get('[data-testid="reporting-feedback"]').text()).toContain('SHA-256 du fichier')
    expect(wrapper.get('[data-testid="runs-table"]').text()).toContain('1')
    wrapper.unmount()
  })

  it('génère un rapport figé depuis les indicateurs disponibles', async () => {
    route.query = { tab: 'runs', period_start: '2027-01-01', period_end: '2027-12-31' }
    const wrapper = mountView()
    await flushPromises()
    await wrapper.get('[data-testid="create-run"]').trigger('click')
    await flushPromises()
    expect((wrapper.get('[data-testid="run-form"] input').element as HTMLInputElement).value).toBe('RPT-12345678-1234-1234')
    expect(wrapper.get('[data-testid="run-form"]').text()).toContain('Taux de clôture des actions')
    await wrapper.get('[data-testid="run-form"]').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-testid="run-form"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="reporting-feedback"]').text()).toContain('Rapport figé enregistré')
    expect(wrapper.get('[data-testid="runs-table"]').text()).toContain('Bilan officinal')
    wrapper.unmount()
  })

  it('reprend une diffusion en échec sans prétendre à une livraison', async () => {
    route.query = { tab: 'notifications' }
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.get('[data-testid="notifications-table"]').text()).toContain('Boîte destinataire fictive refusée')
    await wrapper.get('[data-testid="retry-notification"]').trigger('click')
    await wrapper.get('[data-testid="confirm-retry"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="reporting-feedback"]').text()).toContain('en_attente')
    expect(wrapper.get('[data-testid="reporting-feedback"]').text()).toContain('Aucune preuve de livraison email')
    expect(wrapper.get('[data-testid="notifications-table"]').text()).toContain('en_attente')
    wrapper.unmount()
  })

  it('refuse une période inversée sans afficher d’indicateur', async () => {
    route.query = { period_start: '2027-04-05', period_end: '2027-04-01' }
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.get('[data-testid="reporting-error"]').text()).toContain('période valide')
    expect(wrapper.find('[data-testid="metrics-table"]').exists()).toBe(false)
    await wrapper.get('[data-testid="reporting-retry"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="reporting-error"]').text()).toContain('période valide')
    wrapper.unmount()
  })
})
