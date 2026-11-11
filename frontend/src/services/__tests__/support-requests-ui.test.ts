// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest'
import {mount,flushPromises,type VueWrapper} from '@vue/test-utils'
const api=vi.hoisted(()=>vi.fn())
vi.mock('../quality',()=>({request:api}))
import RequestsApiView from '@/views/support/RequestsApiView.vue'
let w:VueWrapper|undefined
afterEach(()=>{w?.unmount();document.body.innerHTML='';api.mockReset()})
async function render(){w=mount(RequestsApiView,{attachTo:document.body});await flushPromises();return w}
function button(text:string){return [...document.querySelectorAll('button')].find(b=>b.textContent?.trim()===text)!}
describe('connected module 02 requests',()=>{
 it('shows server-wide visible counts and filters from the dashboard cards',async()=>{
  api.mockResolvedValue({data:[],last_page:1,summary:{draft:7,submitted:28,withdrawn:3}})
  const v=await render()
  expect(v.find('[aria-label="Synthèse des demandes visibles"]').text()).toContain('28')
  expect(v.text()).toContain('Mes brouillons')
  button('Afficher soumise').click();await flushPromises()
  expect(api.mock.calls.at(-1)![0]).toContain('status=submitted')
  expect(api.mock.calls.at(-1)![0]).toContain('page=1')
 })

 it('opens a partial draft in a modal without submitting it',async()=>{api.mockResolvedValue({data:[],last_page:1});const v=await render();expect(v.text()).toContain('Aucune demande');button('Demander un accompagnement').click();await flushPromises();expect(document.querySelector('[role=dialog]')!.textContent).toContain('Brouillon de demande');document.querySelector('#support-request-form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await flushPromises();const write=api.mock.calls.find(c=>c[1]==='POST')!;expect(write[0]).toBe('/support/requests');expect(write[2].request_key).toBeTruthy();expect(api.mock.calls.some(c=>String(c[0]).endsWith('/submit'))).toBe(false)})
 it('requires a reason in a second modal before withdrawal',async()=>{api.mockResolvedValue({data:[{id:1,reference:'ACC-FICTIF',title:'Besoin fictif',status:'submitted',version:2}],last_page:1});await render();button('Ouvrir').click();await flushPromises();button('Retirer la demande').click();await flushPromises();const dialogs=document.querySelectorAll('[role=dialog]');expect(dialogs).toHaveLength(2);expect(dialogs[1].querySelector('textarea')!.required).toBe(true);expect(api.mock.calls.some(c=>c[1]==='POST')).toBe(false)})
 it('shows authorization errors without displaying demo data or a creation action',async()=>{api.mockRejectedValue(new Error('Administration de l’officine requise.'));const v=await render();expect(v.text()).toContain('Administration de l’officine requise');expect(v.findAll('button').some(b=>b.text()==='Demander un accompagnement')).toBe(false);expect(v.text()).not.toContain('Palmiers');expect(v.find('[aria-label="Synthèse des demandes visibles"]').exists()).toBe(false)})
})
