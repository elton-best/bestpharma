// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import AppModal from '../AppModal.vue'
let wrappers: VueWrapper[] = []
beforeEach(() => { document.body.innerHTML = '<div id="app"><button id="trigger">Ouvrir</button></div>'; document.body.style.overflow = 'auto' })
afterEach(() => { wrappers.forEach(w => w.unmount()); wrappers = []; document.body.innerHTML = ''; document.body.style.overflow = '' })
async function render(busy = false) {
 document.getElementById('trigger')!.focus()
 const wrapper = mount(AppModal, { attachTo: document.getElementById('app')!, props: { modelValue: false, title: 'Modifier une fiche', busy }, slots: { default: '<div><label>Nom<input id="name" /></label><button id="save">Enregistrer</button></div>' } })
 wrappers.push(wrapper)
 await wrapper.setProps({ modelValue: true }); await flushPromises()
 return wrapper
}
function press(key: string, shiftKey = false) { document.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true })) }
describe('shared modal', () => {
 it('labels the dialog and teleports it outside the inert application', async () => {
  await render()
  const dialog = document.querySelector('[role="dialog"]')!
  expect(dialog.getAttribute('aria-modal')).toBe('true')
  expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Modifier une fiche')
  expect(document.getElementById('app')!.contains(dialog)).toBe(false)
  expect(document.getElementById('app')!.hasAttribute('inert')).toBe(true)
  expect(document.body.style.overflow).toBe('hidden')
 })
 it('focuses the first field and restores the trigger on close', async () => {
  const w = await render()
  expect(document.activeElement?.id).toBe('name')
  await w.setProps({ modelValue: false }); await flushPromises()
  expect(document.activeElement?.id).toBe('trigger')
  expect(document.getElementById('app')!.hasAttribute('inert')).toBe(false)
  expect(document.body.style.overflow).toBe('auto')
 })
 it('loops keyboard focus in both directions', async () => {
  await render()
  document.getElementById('save')!.focus(); press('Tab')
  expect(document.activeElement?.classList.contains('modal-close')).toBe(true)
  press('Tab', true)
  expect(document.activeElement?.id).toBe('save')
 })
 it('requests closure with Escape', async () => {
  const w = await render(); press('Escape')
  expect(w.emitted('update:modelValue')).toEqual([[false]])
 })
 it('requests closure through the backdrop, but not the dialog content', async () => {
  const w = await render()
  document.querySelector('[role="dialog"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(w.emitted('update:modelValue')).toBeUndefined()
  document.querySelector('.modal-backdrop')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(w.emitted('update:modelValue')).toEqual([[false]])
 })
 it('prevents closing while saving', async () => {
  const w = await render(true)
  press('Escape'); document.querySelector('.modal-backdrop')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect((document.querySelector('.modal-close') as HTMLButtonElement).disabled).toBe(true)
  expect(w.emitted('update:modelValue')).toBeUndefined()
  expect(document.querySelector('[role="dialog"]')!.getAttribute('aria-busy')).toBe('true')
  await w.setProps({ busy: false }); press('Escape')
  expect(w.emitted('update:modelValue')).toEqual([[false]])
 })
 it('cleans up the scroll lock when navigating away with the dialog open', async () => {
  const w = await render(); w.unmount(); wrappers = []
  expect(document.body.style.overflow).toBe('auto')
  expect(document.getElementById('app')!.hasAttribute('inert')).toBe(false)
 })
})
