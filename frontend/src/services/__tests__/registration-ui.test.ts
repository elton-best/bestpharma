// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import RegisterView from '@/views/auth/RegisterView.vue'
import { readApplications } from '../applications'
beforeEach(() => { localStorage.clear(); sessionStorage.clear() })
async function render() {
 const router = createRouter({ history: createMemoryHistory(), routes: [
  { path: '/register', component: RegisterView },
  { path: '/application', component: { template: '<div>Suivi du dossier</div>' } },
  { path: '/login', component: { template: '<div>Login</div>' } },
 ] })
 await router.push('/register'); await router.isReady()
 return { router, wrapper: mount(RegisterView, { global: { plugins: [router] } }) }
}
describe('registration form', () => {
 it('rejects mismatched passwords before advancing', async () => {
  const { wrapper } = await render()
  const passwords = wrapper.findAll('input[type="password"]')
  await passwords[0].setValue('Fictional12345'); await passwords[1].setValue('Different12345')
  await wrapper.get('form').trigger('submit')
  expect(wrapper.text()).toContain('mots de passe doivent être identiques')
  expect(wrapper.text()).toContain('Créons votre compte')
  wrapper.unmount()
 })
 it('submits the three-step form and redirects to dossier tracking', async () => {
  const { wrapper, router } = await render()
  const inputs = wrapper.findAll('.form-body input')
  await inputs[0].setValue('Personne fictive'); await inputs[1].setValue('demo@example.test')
  await inputs[2].setValue('Fictional12345'); await inputs[3].setValue('Fictional12345')
  await wrapper.get('form').trigger('submit')
  expect(wrapper.text()).toContain('Présentez votre officine')
  const office = wrapper.findAll('.form-body input')
  await office[0].setValue('Officine fictive'); await office[1].setValue('Ville fictive')
  await office[2].setValue('+2290100000000'); await office[3].setValue('Adresse fictive')
  await wrapper.get('form').trigger('submit')
  expect(wrapper.text()).toContain('Vérifiez votre dossier')
  expect(wrapper.text()).not.toContain('Fictional12345')
  await wrapper.get('input[type="checkbox"]').setValue(true)
  await wrapper.get('form').trigger('submit'); await flushPromises()
  expect(router.currentRoute.value.path).toBe('/application')
  expect(readApplications()[0]).toMatchObject({ name: 'Officine fictive', status: 'pending' })
  wrapper.unmount()
 })
})
