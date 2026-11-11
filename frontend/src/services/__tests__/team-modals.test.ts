// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import TeamView from '@/views/team/TeamView.vue'
import { teamService, inviteStatus } from '../team'
let wrapper: VueWrapper | undefined
beforeEach(() => { localStorage.clear(); document.body.innerHTML = '<div id="app"></div>' })
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.restoreAllMocks(); document.body.innerHTML = '' })
async function render() {
 const router = createRouter({ history:createMemoryHistory(), routes:[{path:'/equipe',component:TeamView},{path:'/invitation',component:{template:'<div />'}}] })
 await router.push('/equipe'); await router.isReady()
 wrapper = mount(TeamView,{attachTo:document.getElementById('app')!,global:{plugins:[router]}})
 await flushPromises()
 return wrapper
}
function clickButton(root: Element, text: string) { const button = Array.from(root.querySelectorAll('button')).find(b => b.textContent?.trim() === text); expect(button).toBeDefined(); button!.click() }
describe('team dialogs in the actual Teleport target', () => {
 it('opens read-only details then editing in a modal and restores focus', async () => {
  const w = await render()
  const trigger = w.findAll('tbody tr button').find(b => b.text() === 'Voir')!
  ;(trigger.element as HTMLButtonElement).focus(); await trigger.trigger('click'); await flushPromises()
  let dialog = document.querySelector('[role="dialog"]')!
  expect(dialog.textContent).toContain('Administrateur démo')
  expect(dialog.querySelector('input')).toBeNull()
  clickButton(dialog,'Modifier'); await flushPromises()
  dialog = document.querySelector('[role="dialog"]')!
  expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1)
  expect(dialog.textContent).toContain('Modifier le membre')
  expect(dialog.querySelector('input[type="checkbox"]')).not.toBeNull()
  clickButton(dialog,'Annuler'); await flushPromises()
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  expect(document.activeElement).toBe(trigger.element)
 })
 it('confirms invitation revocation in a modal rather than a native prompt', async () => {
  const native = vi.spyOn(window,'confirm').mockReturnValue(false)
  await teamService.invite('fictif@example.test',{is_admin:false,role_ids:[]})
  const w = await render()
  await w.findAll('.tabs button').find(b => b.text() === 'Invitations')!.trigger('click')
  await w.findAll('tbody button').find(b => b.text() === 'Révoquer')!.trigger('click'); await flushPromises()
  expect(inviteStatus((await teamService.list()).invitations[0])).toBe('En attente')
  let dialog = document.querySelector('[role="dialog"]')!
  clickButton(dialog,'Annuler'); await flushPromises()
  expect(inviteStatus((await teamService.list()).invitations[0])).toBe('En attente')
  await w.findAll('tbody button').find(b => b.text() === 'Révoquer')!.trigger('click'); await flushPromises()
  dialog = document.querySelector('[role="dialog"]')!; clickButton(dialog,'Confirmer'); await flushPromises()
  expect(inviteStatus((await teamService.list()).invitations[0])).toBe('Révoquée')
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  expect(native).not.toHaveBeenCalled()
 })
})
