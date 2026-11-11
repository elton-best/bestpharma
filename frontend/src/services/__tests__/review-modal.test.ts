// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import ReviewView from '@/views/onboarding/ReviewView.vue'
import { applicationService } from '../applications'
let wrapper: VueWrapper | undefined
beforeEach(async () => {
 localStorage.clear(); document.body.innerHTML = ''
 await applicationService.register({ name: 'Fictif', email: 'fictif@example.test', password: 'Fictional12345', password_confirmation: 'Fictional12345', officine_name: 'Officine fictive', phone: '+2290100000000', city: 'Ville démo', address: 'Adresse démo', applicant_function: 'Titulaire', consent: true })
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined; document.body.innerHTML = '' })
describe('BEG dossier modal', () => {
 it('opens consultation in a dialog and closes after the decision is saved', async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/beg/inscriptions', component: ReviewView }] })
  await router.push('/beg/inscriptions'); await router.isReady()
  wrapper = mount(ReviewView, { attachTo: document.body, global: { plugins: [router] } }); await flushPromises()
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  await wrapper.get('tbody button').trigger('click'); await flushPromises()
  const dialog = document.querySelector('[role="dialog"]')!
  expect(dialog.textContent).toContain('Officine fictive')
  expect(dialog.textContent).toContain('Commencer l’instruction')
  dialog.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await flushPromises()
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  expect((await applicationService.list(true))[0].status).toBe('under_review')
 })
})
