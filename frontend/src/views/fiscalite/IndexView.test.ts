// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('@/services/quality', () => ({ request }))
import FiscaliteView from './IndexView.vue'

describe('Facturation DGI safe UI', () => {
  afterEach(() => vi.resetAllMocks())

  it('distingue une réponse API valide sans factures et interdit toute impression fiscale', async () => {
    request.mockResolvedValue({ data: [] })
    const wrapper = mount(FiscaliteView)
    await flushPromises()

    expect(wrapper.get('[role="status"]').text()).toContain('Aucune facture enregistrée')
    expect(wrapper.text()).toContain('Certification DGI / e-MECEF')
    expect(wrapper.text()).toContain('Paiement FeexPay')
    expect(wrapper.text()).toContain('Désactivé')
    expect(wrapper.text()).toContain('ne permet ni de créer, ni d’imprimer')
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.findAll('button')).toHaveLength(1)
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('signale une API indisponible sans la présenter comme une liste vide', async () => {
    request.mockRejectedValue(new Error('Service indisponible.'))
    const wrapper = mount(FiscaliteView)
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('API de facturation indisponible')
    expect(wrapper.text()).not.toContain('Aucune facture enregistrée')
    expect(wrapper.findAll('button')).toHaveLength(1)
  })
})
