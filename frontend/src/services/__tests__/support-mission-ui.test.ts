// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest'
import {mount,flushPromises,type VueWrapper} from '@vue/test-utils'
const api=vi.hoisted(()=>vi.fn())
vi.mock('../quality',()=>({request:api}))
import SupportMissionPanel from '@/components/SupportMissionPanel.vue'
let w:VueWrapper|undefined
const mission={id:1,title:'Mission fictive',scope:'Périmètre',starts_on:'2026-12-01',ends_on:'2026-12-15',status:'proposed',version:1,decision_reason:null}
function click(text:string){[...document.querySelectorAll('button')].find(b=>b.textContent?.trim()===text)!.click()}
afterEach(()=>{w?.unmount();api.mockReset();document.body.innerHTML=''})
describe('proposition et accord de mission',()=>{
 it('requires explicit office confirmation in a modal',async()=>{
  api.mockResolvedValue({});w=mount(SupportMissionPanel,{props:{requestId:7,requestVersion:4,mission,submitted:true},attachTo:document.body})
  click('Accepter la proposition');await flushPromises();expect(api).not.toHaveBeenCalled()
  const box=document.querySelector('input[type=checkbox]')! as HTMLInputElement;expect(box.required).toBe(true);box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));await flushPromises()
  document.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await flushPromises()
  expect(api).toHaveBeenCalledWith('/support/requests/7/mission-decision','POST',{version:1,decision:'accepted',confirmed:true});expect(w.emitted('saved')).toHaveLength(1)
 })
 it('requires a refusal reason and keeps the modal on conflicts',async()=>{
  api.mockRejectedValue(new Error('Version périmée'));w=mount(SupportMissionPanel,{props:{requestId:7,requestVersion:4,mission,submitted:true},attachTo:document.body});click('Refuser la proposition');await flushPromises()
  expect(document.querySelector('textarea')!.required).toBe(true)
  document.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await flushPromises();expect(document.body.textContent).toContain('Version périmée');expect(document.querySelector('[role=dialog]')).not.toBeNull();expect(w.emitted('saved')).toBeUndefined()
 })
 it('does not show office decisions to coordination and only proposes after qualification',()=>{
  w=mount(SupportMissionPanel,{props:{requestId:7,requestVersion:4,mission,submitted:true,coordinator:true},attachTo:document.body})
  expect(w.text()).not.toContain('Accepter la proposition');expect(w.text()).toContain('En attente de l’accord')
 })
})
