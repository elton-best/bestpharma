// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import QualityView from '@/views/qualite/IndexView.vue'
beforeEach(() => { localStorage.clear(); document.body.innerHTML = '' })
async function render() {
 const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/qualite', component: QualityView }] })
 await router.push('/qualite'); await router.isReady()
 const wrapper = mount(QualityView, { attachTo: document.body, global: { plugins: [createPinia(), router] } })
 await flushPromises()
 return wrapper
}
describe('quality user journey', () => {
 it('searches and clears filters', async () => {
  const wrapper = await render()
  expect(wrapper.text()).toContain('Campagnes, évaluations et rapports')
  expect(wrapper.text()).toContain('aucun relevé réel chargé')
  expect(wrapper.text()).toContain('Aucun score, seuil ni interprétation réglementaire')
  expect(wrapper.findAll('tbody tr')).toHaveLength(4)
  await wrapper.get('input[type="search"]').setValue('température')
  expect(wrapper.findAll('tbody tr')).toHaveLength(1)
  await wrapper.get('input[type="search"]').setValue('nothingmatches')
  expect(wrapper.text()).toContain('Aucune action à afficher')
  await wrapper.get('.empty-state button').trigger('click')
  expect(wrapper.findAll('tbody tr')).toHaveLength(4)
  wrapper.unmount()
 })
 it('creates an action through the modal and updates the list', async () => {
  const wrapper = await render()
  await wrapper.get('.page-heading button').trigger('click')
  const modal = document.querySelector('[role="dialog"]')!
  const inputs = modal.querySelectorAll('input')
  inputs[0].value = 'Nouvelle action test'; inputs[0].dispatchEvent(new Event('input', { bubbles: true }))
  inputs[1].value = 'Responsable démo'; inputs[1].dispatchEvent(new Event('input', { bubbles: true }))
  inputs[2].value = '2026-12-10'; inputs[2].dispatchEvent(new Event('input', { bubbles: true }))
  const description = modal.querySelector('textarea')!; description.value = 'Constat fictif'; description.dispatchEvent(new Event('input', { bubbles: true }))
  modal.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await flushPromises()
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  expect(wrapper.findAll('tbody tr')).toHaveLength(5)
  expect(wrapper.text()).toContain('Nouvelle action test')
  wrapper.unmount()
 })
 it('requires resolution before closure and closes with Escape', async () => {
  const wrapper = await render()
  await wrapper.get('.table-title').trigger('click')
  const modal = document.querySelector('[role="dialog"]')!
  const selects = modal.querySelectorAll('select')
  selects[2].value = 'closed'; selects[2].dispatchEvent(new Event('change', { bubbles: true }))
  modal.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await flushPromises()
  expect(modal.textContent).toContain('Renseignez un bilan de résolution')
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  await flushPromises()
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  wrapper.unmount()
 })
})
