// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import TeamView from '@/views/team/TeamView.vue'
import { teamService } from '../team'
beforeEach(() => { localStorage.clear() })
async function render() {
 const router = createRouter({ history: createMemoryHistory(), routes: [{ path:'/equipe', component:TeamView },{ path:'/invitation', component:{ template:'<div />' } }] })
 await router.push('/equipe'); await router.isReady()
 const wrapper = mount(TeamView, { global: { plugins:[router], stubs: { teleport: true } } }); await flushPromises(); return wrapper
}
describe('team controls', () => {
 it('protects the last admin through the member editor', async () => {
  const wrapper = await render()
  await wrapper.findAll('tbody tr button').find(b => b.text() === 'Modifier')!.trigger('click')
  const checkboxes = wrapper.findAll('.team-editor input[type="checkbox"]')
  await checkboxes[1].setValue(false)
  await wrapper.get('.team-editor form').trigger('submit'); await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('dernier administrateur')
  expect((await teamService.list()).members[0].is_admin).toBe(true)
  wrapper.unmount()
 })
 it('invites with multiple role checkboxes and displays a one-time link', async () => {
  const wrapper = await render()
  await wrapper.get('.page-heading button').trigger('click')
  await wrapper.get('.team-editor input[type="email"]').setValue('invite@example.test')
  const roles = wrapper.findAll('.team-editor fieldset input')
  await roles[0].setValue(true); await roles[1].setValue(true)
  await wrapper.get('.team-editor form').trigger('submit'); await flushPromises()
  expect(wrapper.get('.invitation-link input').attributes('readonly')).toBeDefined()
  expect((wrapper.get('.invitation-link input').element as HTMLInputElement).value).toContain('/invitation#token=')
  expect(wrapper.get('.invitation-link').text()).toContain('Aucun e-mail')
  expect((await teamService.list()).invitations[0].roles.role_ids).toEqual([1,2])
  wrapper.unmount()
 })
})
