// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest'
import {mount,flushPromises,type VueWrapper} from '@vue/test-utils'
const api=vi.hoisted(()=>vi.fn())
vi.mock('../quality',()=>({request:api,demoMode:false}))
import MissionsApiView from '@/views/support/MissionsApiView.vue'
let w:VueWrapper|undefined
const mission={id:7,title:'Mission fictive',scope:'Périmètre partagé',starts_on:'2026-11-01',ends_on:'2026-12-01',status:'accepted',version:3}
const member={id:4,name:'Intervenant fictif',role:'lead',status:'pending',version:1,assignment_status:'approved',starts_on:'2026-11-01',ends_on:'2026-12-01'}
function button(text:string){return [...document.querySelectorAll('button')].find(b=>b.textContent?.trim()===text)!}
async function render(lead:boolean,admin=false){api.mockResolvedValueOnce({data:[mission],last_page:1}).mockResolvedValueOnce({mission,team:[member],events:[],can_lead:lead,can_admin:admin});w=mount(MissionsApiView,{attachTo:document.body,global:{stubs:{RouterLink:true}}});await flushPromises();button('Voir la mission').click();await flushPromises()}
afterEach(()=>{w?.unmount();document.body.innerHTML='';api.mockReset()})
describe('mission workspace permissions and modals',()=>{
 it('does not show operational controls to an office admin without lead status',async()=>{await render(false,true);expect(button('Démarrer la mission')).toBeUndefined();expect(button('Approuver la participation')).toBeTruthy();expect(document.querySelector('[role=dialog]')!.textContent).toContain('Intervenant fictif')})
 it('requires reason and confirmation in a second modal before starting',async()=>{await render(true);button('Démarrer la mission').click();await flushPromises();expect(document.querySelectorAll('[role=dialog]')).toHaveLength(2);expect(api.mock.calls.some(c=>c[1]==='POST')).toBe(false);const d=document.querySelectorAll('[role=dialog]')[1];expect(d.querySelector('textarea')!.required).toBe(true);expect(d.querySelector('input[type=checkbox]')!.hasAttribute('required')).toBe(true)})
 it('keeps a stale-write decision open without claiming success',async()=>{await render(true);api.mockRejectedValue(new Error('Version périmée.'));button('Démarrer la mission').click();await flushPromises();document.querySelector('#mission-workspace-decision')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await flushPromises();expect(document.body.textContent).toContain('Version périmée');expect(document.querySelectorAll('[role=dialog]')).toHaveLength(2);expect(w!.text()).not.toContain('Décision enregistrée')})
 it('shows access errors without mission contents or demo fallback',async()=>{api.mockRejectedValue(new Error('Accès officine non autorisé.'));w=mount(MissionsApiView,{global:{stubs:{RouterLink:true}}});await flushPromises();expect(w.text()).toContain('Accès officine non autorisé');expect(w.find('table').exists()).toBe(false);expect(w.text()).not.toContain('Mission fictive')})
})
