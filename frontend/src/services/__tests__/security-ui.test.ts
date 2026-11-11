// @vitest-environment jsdom
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest'
import {mount,flushPromises,type VueWrapper} from '@vue/test-utils'
import {createRouter,createMemoryHistory} from 'vue-router'
const api=vi.hoisted(()=>vi.fn())
vi.mock('../quality',()=>({demoMode:false,request:api}))
import SecurityView from '@/views/security/SecurityView.vue'
import AccountStatesView from '@/views/officine/AccountStatesView.vue'
import NotificationsView from '@/views/security/NotificationsView.vue'
let wrapper:VueWrapper|undefined
async function render(component:any){const router=createRouter({history:createMemoryHistory(),routes:[{path:'/:pathMatch(.*)*',component:{template:'<div/>'}}]});await router.push('/');await router.isReady();wrapper=mount(component,{attachTo:document.body,global:{plugins:[router]}});await flushPromises();return wrapper}
function button(text:string){return [...document.querySelectorAll('button')].find(b=>b.textContent?.trim()===text)!}
beforeEach(()=>{api.mockReset();api.mockImplementation(async(path:string)=>path==='/security'?{mfa_enabled:false,pending_email:null,google_linked:false}:path==='/auth/providers'?{google_enabled:false}:{data:[],local_inbox:false})})
afterEach(()=>{wrapper?.unmount();document.body.innerHTML=''})
describe('identity API screens',()=>{
 it('keeps password editing in a modal and clears secrets on reopening',async()=>{await render(SecurityView);expect(document.querySelector('input[type=password]')).toBeNull();button('Changer le mot de passe').click();await flushPromises();expect(document.querySelectorAll('[role=dialog] input[type=password]')).toHaveLength(3);const input=document.querySelector('[role=dialog] input') as HTMLInputElement;input.value='private';input.dispatchEvent(new Event('input',{bubbles:true}));button('Annuler').click();await flushPromises();button('Changer le mot de passe').click();await flushPromises();expect((document.querySelector('[role=dialog] input') as HTMLInputElement).value).toBe('')})
 it('does not claim delivery for simulated mail or reveal preview without local opt-in',async()=>{api.mockResolvedValue({data:[{id:1,title:'Fictif',status:'simulated',attempts:1}],local_inbox:false});const w=await render(NotificationsView);expect(w.text()).toContain('Simulé — aucun email envoyé');expect(w.text()).not.toContain('Ouvrir le message de test')})
 it('keeps provider login disabled when Google is not configured',async()=>{const w=await render(SecurityView);expect(w.text()).toContain('Configuration requise');expect(w.text()).not.toContain('Associer Google')})
 it('shows recovery codes only in a modal and removes them on close',async()=>{
  const secret='abcdef0123456789abcdef0123456789';api.mockImplementation(async(path:string)=>path==='/security'?{mfa_enabled:true,recovery_codes_remaining:0}:path==='/security/mfa/recovery-codes'?{codes:[secret]}:path==='/auth/providers'?{google_enabled:false}:{data:[]});
  await render(SecurityView);button('Renouveler les codes de secours').click();await flushPromises();const form=document.querySelector('#security-form')!;const inputs=form.querySelectorAll('input');(inputs[0] as HTMLInputElement).value='Fictional12345';inputs[0].dispatchEvent(new Event('input',{bubbles:true}));(inputs[1] as HTMLInputElement).value='123456';inputs[1].dispatchEvent(new Event('input',{bubbles:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await flushPromises();expect(document.querySelector('[role=dialog]')!.textContent).toContain(secret);expect(sessionStorage.getItem('recovery_codes')).toBeNull();button('Annuler').click();await flushPromises();expect(document.body.textContent).not.toContain(secret);
 })
 it('opens global account state changes in a reasoned confirmation modal',async()=>{
  api.mockResolvedValue({data:[{id:5,name:'Compte fictif',email:'fictif@example.test',is_active:true,account_version:1}],last_page:1});await render(AccountStatesView);button('Désactiver').click();await flushPromises();const modal=document.querySelector('[role=dialog]')!;expect(modal.textContent).toContain('Les sessions existantes seront révoquées');expect(modal.querySelector('textarea')?.required).toBe(true);expect(api.mock.calls.some(c=>c[1]==='POST')).toBe(false);
 })

 it('requires enrollment for privileged accounts and never offers disabling mandatory MFA',async()=>{api.mockImplementation(async(path:string)=>path==='/security'?{mfa_enabled:true,mfa_required:true,recovery_codes_remaining:10}:path==='/auth/providers'?{google_enabled:false}:{data:[]});const v=await render(SecurityView);expect(v.text()).toContain('MFA obligatoire actif');expect(v.findAll('button').some(b=>b.text()==='Désactiver')).toBe(false);expect(v.text()).toContain('Renouveler les codes de secours')})

})
