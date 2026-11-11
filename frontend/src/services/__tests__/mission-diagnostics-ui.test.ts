// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest'
import {mount,flushPromises,type VueWrapper} from '@vue/test-utils'
const api=vi.hoisted(()=>vi.fn())
vi.mock('../quality',()=>({request:api}))
import MissionDiagnosticsPanel from '@/components/MissionDiagnosticsPanel.vue'
let w:VueWrapper|undefined
const question={key:'q-1',label:'Question fictive',required:true,source:'Source fictive',choices:['conform','gap','not_applicable','not_evaluated']}
const model={id:2,parent_id:null,revision:1,version:2,title:'Modèle fictif',questions:[question],status:'published'}
const diagnostic={id:3,template_id:2,previous_id:null,revision:1,version:1,type:'initial',assessed_on:'2026-11-10',template_snapshot:{title:'Modèle fictif',revision:1,questions:[question]},answers:[],status:'draft'}
function button(text:string){return [...document.querySelectorAll('button')].find(b=>b.textContent?.trim()===text)!}
async function render(lead:boolean,diagnostics:unknown[]=[],templates:unknown[]=[]){api.mockResolvedValue({templates,diagnostics,can_lead:lead});w=mount(MissionDiagnosticsPanel,{attachTo:document.body,props:{missionId:7,active:true}});button('Diagnostics & modèles').click();await flushPromises()}
afterEach(()=>{w?.unmount();document.body.innerHTML='';api.mockReset()})
describe('diagnostics configurables',()=>{
 it('starts with no invented grid and creates questions in a modal',async()=>{await render(true);expect(document.body.textContent).toContain('Aucun modèle configuré');button('Créer un modèle').click();await flushPromises();expect(document.querySelectorAll('[role=dialog]')).toHaveLength(2);expect(document.querySelectorAll('fieldset')).toHaveLength(0);button('Ajouter une question').click();await flushPromises();expect(document.querySelectorAll('fieldset')).toHaveLength(1);expect(api.mock.calls.some(c=>c[1]==='POST')).toBe(false)})
 it('requires a justification for not applicable and preserves the frozen question',async()=>{await render(true,[diagnostic],[model]);button('Renseigner les réponses').click();await flushPromises();const select=document.querySelector('select')!;select.value='not_applicable';select.dispatchEvent(new Event('change',{bubbles:true}));await flushPromises();expect(document.querySelector('textarea')!.required).toBe(true);expect(document.body.textContent).toContain('Question fictive');expect(document.body.textContent).toContain('Non évalué')})
 it('keeps stale forms open without publishing',async()=>{await render(true,[diagnostic],[model]);button('Soumettre le diagnostic').click();await flushPromises();api.mockRejectedValue(new Error('Diagnostic figé ou périmé.'));document.querySelector('#mission-diagnostic-form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await flushPromises();expect(document.body.textContent).toContain('périmé');expect(document.querySelectorAll('[role=dialog]')).toHaveLength(2);expect(w!.emitted('changed')).toBeUndefined();expect(api.mock.calls.some(c=>c[2]?.action==='share')).toBe(false)})
 it('keeps the editor busy until refreshed versions are available after saving',async()=>{
  await render(true,[diagnostic],[model]);button('Renseigner les réponses').click();await flushPromises()
  let release!:(value:unknown)=>void;const reload=new Promise(resolve=>{release=resolve})
  api.mockResolvedValueOnce({}).mockImplementationOnce(()=>reload)
  document.querySelector('#mission-diagnostic-form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await flushPromises()
  expect(document.querySelectorAll('[role=dialog]')).toHaveLength(2);expect(w!.emitted('changed')).toBeUndefined()
  release({templates:[model],diagnostics:[{...diagnostic,version:2}],can_lead:true});await flushPromises()
  expect(document.querySelectorAll('[role=dialog]')).toHaveLength(1);expect(w!.emitted('changed')).toHaveLength(1)
 })
 it('shows the shared version read-only to the office without a score',async()=>{await render(false,[{...diagnostic,status:'shared',answers:[{key:'q-1',answer:'not_evaluated',note:'À examiner'}]}],[model]);expect(button('Créer un modèle')).toBeUndefined();expect(button('Partager le diagnostic')).toBeUndefined();button('Voir le diagnostic').click();await flushPromises();expect(document.body.textContent).toContain('Non évalué');expect(document.body.textContent).toContain('À examiner');expect(document.body.textContent).toContain('Aucun score')})
})
