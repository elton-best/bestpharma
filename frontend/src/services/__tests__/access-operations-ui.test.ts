// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest'
import {mount,flushPromises,type VueWrapper} from '@vue/test-utils'
import {createRouter,createMemoryHistory} from 'vue-router'
const api=vi.hoisted(()=>vi.fn())
vi.mock('../quality',()=>({demoMode:false,request:api}))
import AccessOperationsView from '@/views/access/AccessOperationsView.vue'
import NotificationsView from '@/views/security/NotificationsView.vue'
let w:VueWrapper|undefined
afterEach(()=>{w?.unmount();document.body.innerHTML='';api.mockReset()})
async function render(path:string,component:any){const router=createRouter({history:createMemoryHistory(),routes:[{path:'/:pathMatch(.*)*',component:{template:'<div/>'}}]});await router.push(path);await router.isReady();w=mount(component,{attachTo:document.body,global:{plugins:[router]}});await flushPromises();return w}
describe('access operations API UI',()=>{
 it('loads platform stock counts separately from period metrics',async()=>{api.mockResolvedValue({counts:{active:2,period_submitted:3},as_of:'2026-11-10',period:{from:'2026-10-11',to:'2026-11-10'}});const v=await render('/beg/synthese',AccessOperationsView);expect(api).toHaveBeenCalledWith('/platform/summary?days=30');expect(v.text()).toContain('Officines actives');expect(v.text()).toContain('Période sélectionnée')})
 it('shows journal event details in a modal and encodes filters',async()=>{api.mockResolvedValue({data:[{id:1,action:'team.role.saved',actor:'Fictif',officine_id:2,details:{role_id:7},created_at:'2026-11-10'}],last_page:1});const v=await render('/dashboard/journal',AccessOperationsView);await v.findAll('button').find(b=>b.text()==='Voir l’événement')!.trigger('click');await flushPromises();expect(document.querySelector('[role=dialog]')!.textContent).toContain('role_id');expect(document.querySelector('[role=dialog]')!.textContent).toContain('Fictif');await v.get('input').setValue('team.role.saved');await v.get('form').trigger('submit');expect(api.mock.calls.at(-1)![0]).toContain('action=team.role.saved')})
 it('requires modal confirmation before scheduling a retry',async()=>{api.mockResolvedValue({data:[{id:4,title:'Échec fictif',status:'failed',attempts:2}],last_page:1,local_inbox:false});const v=await render('/notifications',NotificationsView);await v.findAll('button').find(b=>b.text()==='Planifier une reprise')!.trigger('click');await flushPromises();expect(api.mock.calls.some(c=>c[1]==='POST')).toBe(false);expect(document.querySelector('[role=dialog]')!.textContent).toContain('cinq tentatives')})
 it('requires explicit confirmation before exporting the current authorized journal',async()=>{api.mockResolvedValue({data:[],last_page:1});const v=await render('/dashboard/journal',AccessOperationsView);await v.findAll('button').find(b=>b.text()==='Exporter le journal')!.trigger('click');await flushPromises();expect(document.querySelector('[role=dialog]')!.textContent).toContain('5 000 événements');expect(document.querySelector('[role=dialog]')!.textContent).toContain('L’opération sera journalisée');expect(api.mock.calls.some(c=>c[1]==='POST')).toBe(false)})

})
