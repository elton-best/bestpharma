// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest'
import {mount,flushPromises,type VueWrapper} from '@vue/test-utils'
const api=vi.hoisted(()=>vi.fn())
vi.mock('../quality',()=>({request:api,demoMode:false}))
import IntakeView from '@/views/support/IntakeView.vue'
let w:VueWrapper|undefined
const row={id:7,reference:'ACC-TEST',title:'Besoin fictif',description:'Besoin partagé',contact:'Titulaire fictif',officine_name:'Officine fictive',version:2,qualification:null}
function button(text:string){return [...document.querySelectorAll('button')].find(b=>b.textContent?.trim()===text)!}
afterEach(()=>{w?.unmount();document.body.innerHTML='';api.mockReset()})
describe('guichet central M2',()=>{
 it('opens details then confirms qualification in a separate modal',async()=>{
  api.mockResolvedValue({data:[row],last_page:1});w=mount(IntakeView,{attachTo:document.body});await flushPromises()
  button('Voir la demande').click();await flushPromises();expect(document.querySelector('[role=dialog]')!.textContent).toContain('Besoin partagé')
  button('Qualifier').click();await flushPromises();expect(document.querySelectorAll('[role=dialog]')).toHaveLength(2)
  expect(api.mock.calls.some(c=>c[1]==='POST')).toBe(false)
  const area=document.querySelector('textarea')!;area.value='Proposition à préparer';area.dispatchEvent(new Event('input',{bubbles:true}))
  document.querySelector('#intake-qualification')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await flushPromises()
  expect(api.mock.calls.find(c=>c[1]==='POST')).toEqual(['/support/intake/7/qualify','POST',{version:2,qualification:'ready',note:'Proposition à préparer'}])
  expect(w.text()).toContain('Aucune mission démarrée')
 })
 it('shows denial without data or a qualification action',async()=>{
  api.mockRejectedValue(new Error('Coordination BEG avec MFA requise.'));w=mount(IntakeView,{attachTo:document.body});await flushPromises()
  expect(w.text()).toContain('Coordination BEG avec MFA requise.');expect(w.find('table').exists()).toBe(false)
 })
})
