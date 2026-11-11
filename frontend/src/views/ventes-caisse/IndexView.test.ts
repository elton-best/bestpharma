// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('@/services/quality', () => ({ request }))
import PosView from './IndexView.vue'

function mockEmptyApis() {
  request.mockImplementation((url: string) => {
    if (url.endsWith('/catalog')) return Promise.resolve({ data: [] })
    if (url.includes('/sessions/active')) return Promise.resolve({ data: null, can_sell: true, can_manage_session: true, can_manage_movements: true })
    return Promise.resolve({ data: [], current_page: 1, last_page: 1, per_page: 8, total: 0, can_write: true })
  })
}

describe('Caisse POS', () => {
  afterEach(() => { vi.resetAllMocks(); document.body.innerHTML = '' })

  it('présente la palette verte et garde les formulaires métier dans AppModal', async () => {
    mockEmptyApis()
    const wrapper = mount(PosView)
    await flushPromises()
    expect(wrapper.text()).toContain('Comptoir & caisse')
    expect(wrapper.text()).toContain('Historique des ventes')
    expect(wrapper.text()).toContain('Aucune vente enregistrée')
    expect(wrapper.find('form').exists()).toBe(false)
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('Ouvrir la caisse')
    expect(document.body.querySelector('[role="dialog"] form')).not.toBeNull()
  })

  it('garde une erreur dans la modale et ne ferme qu’après un succès serveur', async () => {
    mockEmptyApis()
    const wrapper = mount(PosView)
    await flushPromises()
    await wrapper.get('button').trigger('click')
    await flushPromises()
    request.mockRejectedValueOnce(new Error('Fond invalide.'))
    const dialog = document.body.querySelector('[role="dialog"]')!
    const input = dialog.querySelector('input') as HTMLInputElement
    input.value = '25000'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    const form = dialog.querySelector('form')!
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain('Fond invalide.')
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()

    request.mockResolvedValueOnce({ data: { id: 9, opening_cash: 25000, cash_sales: 0 } })
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(wrapper.get('[role="status"]').text()).toContain('Caisse ouverte')
  })

  it('affiche les ventes et mouvements réels paginés, et ajoute un mouvement dans une modale', async () => {
    request.mockImplementation((url: string) => {
      if (url.endsWith('/catalog')) return Promise.resolve({ data: [] })
      if (url.includes('/sessions/active')) return Promise.resolve({ data: { id: 4, opening_cash: 10000, cash_sales: 800 }, can_sell: true, can_manage_session: true, can_manage_movements: true })
      if (url.includes('/sales?')) return Promise.resolve({ data: [{ id: 6, receipt_number: 'REC-006', customer_name: null, total: 800, sold_at: '2026-11-11T10:30:00Z' }], current_page: 1, last_page: 1, per_page: 8, total: 1 })
      if (url.includes('/cash-movements?')) return Promise.resolve({ data: [{ id: 7, direction: 'entree', category: 'apport', reason: 'Monnaie complémentaire', amount: 500, occurred_at: '2026-11-11T10:00:00Z' }], current_page: 1, last_page: 1, per_page: 8, total: 1, can_write: true })
      return Promise.resolve({ data: {} })
    })
    const wrapper = mount(PosView)
    await flushPromises()
    expect(wrapper.text()).toContain('REC-006')
    expect(wrapper.text()).toContain('Monnaie complémentaire')
    expect(wrapper.find('form').exists()).toBe(false)
    await wrapper.get('.small-button').trigger('click')
    await flushPromises()
    const dialog = document.body.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain('Enregistrer le mouvement')
    const reason = dialog.querySelector('input[maxlength="500"]') as HTMLInputElement
    reason.value = 'Achat urgent'
    reason.dispatchEvent(new Event('input', { bubbles: true }))
    const form = dialog.querySelector('form')!
    request.mockRejectedValueOnce(new Error('Catégorie incompatible avec le sens.'))
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain('Catégorie incompatible')
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()

    request.mockImplementation((url: string) => {
      if (url.includes('/cash-movements?')) return Promise.resolve({ data: [{ id: 8, direction: 'sortie', category: 'depense', reason: 'Achat urgent', amount: 120, occurred_at: '2026-11-11T11:00:00Z' }], current_page: 1, last_page: 1, per_page: 8, total: 2, can_write: true })
      if (url.endsWith('/catalog')) return Promise.resolve({ data: [] })
      if (url.includes('/sessions/active')) return Promise.resolve({ data: { id: 4, opening_cash: 10000, cash_sales: 800 }, can_sell: true, can_manage_session: true, can_manage_movements: true })
      return Promise.resolve({ data: {} })
    })
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(wrapper.text()).toContain('Mouvement de caisse enregistré')
    expect(request).toHaveBeenCalledWith('/ventescaisse/cash-movements', 'POST', expect.objectContaining({ direction: 'entree', category: 'apport', reason: 'Achat urgent', amount: 1 }))
  })

  it('distingue une réponse API en erreur des historiques réellement vides', async () => {
    request.mockImplementation((url: string) => {
      if (url.endsWith('/catalog')) return Promise.resolve({ data: [] })
      if (url.includes('/sessions/active')) return Promise.resolve({ data: null, can_sell: false, can_manage_session: false, can_manage_movements: false })
      if (url.includes('/sales?')) return Promise.reject(new Error('Erreur serveur ventes'))
      return Promise.resolve({ data: [], current_page: 1, last_page: 1, per_page: 8, total: 0, can_write: false })
    })
    const wrapper = mount(PosView)
    await flushPromises()
    expect(wrapper.text()).toContain('Erreur de chargement des ventes : Erreur serveur ventes')
    expect(wrapper.text()).toContain('Aucun mouvement enregistré')
    expect(wrapper.text()).not.toContain('Aucune vente enregistrée')
  })

  it('masque les actions selon les flags effectifs et bloque si les flags sont absents', async () => {
    request.mockImplementation((url: string) => {
      if (url.endsWith('/catalog')) return Promise.resolve({ data: [] })
      if (url.includes('/sessions/active')) return Promise.resolve({ data: { id: 2, opening_cash: 1000, cash_sales: 0 }, can_sell: false, can_manage_session: false, can_manage_movements: true })
      if (url.includes('/cash-movements?')) return Promise.resolve({ data: [], current_page: 1, last_page: 1, per_page: 8, total: 0, can_write: false })
      return Promise.resolve({ data: [], current_page: 1, last_page: 1, per_page: 8, total: 0 })
    })
    const wrapper = mount(PosView)
    await flushPromises()
    expect(wrapper.text()).not.toContain('Nouvelle vente')
    expect(wrapper.text()).not.toContain('Clôturer la caisse')
    expect(wrapper.text()).not.toContain('＋ Ajouter')
    expect(wrapper.text()).not.toContain('Ouvrir la caisse')
  })

  it('signale les droits absents de la réponse API et refuse toutes les actions métier', async () => {
    request.mockImplementation((url: string) => {
      if (url.endsWith('/catalog')) return Promise.resolve({ data: [] })
      if (url.includes('/sessions/active')) return Promise.resolve({ data: null })
      if (url.includes('/cash-movements?')) return Promise.resolve({ data: [], current_page: 1, last_page: 1, per_page: 8, total: 0 })
      return Promise.resolve({ data: [], current_page: 1, last_page: 1, per_page: 8, total: 0 })
    })
    const wrapper = mount(PosView)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('droits de caisse sont absents')
    expect(wrapper.text()).toContain('droit can_write est absent')
    expect(wrapper.text()).not.toContain('Ouvrir la caisse')
    expect(wrapper.text()).not.toContain('＋ Ajouter')
  })
})
