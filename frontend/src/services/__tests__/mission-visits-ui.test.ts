// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest'
import {mount,flushPromises,type VueWrapper} from '@vue/test-utils'
const api=vi.hoisted(()=>vi.fn())
vi.mock('../quality',()=>({request:api}))
import MissionVisitsPanel from '@/components/MissionVisitsPanel.vue'
let w:VueWrapper|undefined
const visit={id:3,title:'Atelier fictif',mode:'onsite',place:'Lieu privé',starts_at:'2026-12-01T08:00:00Z',ends_at:'2026-12-01T09:00:00Z',status:'proposed',version:2,previous_id:null,decision_reason:null,reports:[]}
function button(text:string){return [...document.querySelectorAll('button')].find(b=>b.textContent?.trim()===text)!}
async function render(lead:boolean,admin:boolean,rows:unknown[]=[]){api.mockResolvedValue({data:rows,can_lead:lead,can_admin:admin});w=mount(MissionVisitsPanel,{props:{missionId:7,active:true},attachTo:document.body});button('Planning & comptes rendus').click();await flushPromises()}
afterEach(()=>{w?.unmount();document.body.innerHTML='';api.mockReset()})
describe('planning et comptes rendus',()=>{
 it('opens a planning form in a separate modal without implicitly proposing',async()=>{await render(true,false);button('Planifier une intervention').click();await flushPromises();expect(document.querySelectorAll('[role=dialog]')).toHaveLength(2);expect(document.body.textContent).toContain('Début prévu');expect(document.querySelector('input[type=checkbox]')!.hasAttribute('required')).toBe(true);expect(api.mock.calls.some(c=>c[1]==='POST')).toBe(false)})
 it('lets the office confirm a proposed visit without giving it planning rights',async()=>{await render(false,true,[visit]);expect(button('Planifier une intervention')).toBeUndefined();button('Confirmer la visite').click();await flushPromises();expect(document.querySelector('textarea')!.required).toBe(true);expect(api.mock.calls.some(c=>c[1]==='POST')).toBe(false);expect(document.body.textContent).toContain('UTC+1')})
 it('requires a reason and new dates to reschedule, keeping the form on conflict',async()=>{await render(true,false,[visit]);button('Reporter').click();await flushPromises();expect(document.querySelectorAll('input[type=datetime-local]')).toHaveLength(2);api.mockRejectedValue(new Error('Version périmée.'));document.querySelector('#mission-visit-operation')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await flushPromises();expect(document.body.textContent).toContain('Version périmée');expect(document.querySelectorAll('[role=dialog]')).toHaveLength(2);expect(w!.emitted('changed')).toBeUndefined()})
 it('never shows a shared report edit button to the office',async()=>{await render(false,true,[{...visit,status:'completed',reports:[{id:4,revision:1,version:3,status:'shared',actual_starts_at:visit.starts_at,actual_ends_at:visit.ends_at,attendance:'Équipe',activities:'Rapport partagé',decisions:'Décisions',next_steps:'Suivi'}]}]);button('Voir le compte rendu').click();await flushPromises();expect(document.body.textContent).toContain('Rapport partagé');expect(button('Modifier le brouillon')).toBeUndefined();expect(button('Partager')).toBeUndefined()})
})
