// @vitest-environment jsdom
import {describe,it,expect,vi} from 'vitest'
import {mount} from '@vue/test-utils'
import {createRouter,createMemoryHistory} from 'vue-router'
vi.mock('../quality',()=>({demoMode:false}))
import SupportView from '@/views/support/SupportView.vue'
import {supportState,missionTransition,decideAssignment,requestTransition} from '../supportDemo'
describe('no demo fallback in API mode for module 02',()=>{
 it('does not show or allow simulation data in the module 02 API view',async()=>{for(const [path,component] of [['/dashboard/accompagnement',SupportView]] as const){const router=createRouter({history:createMemoryHistory(),routes:[{path:'/:pathMatch(.*)*',component:{template:'<div/>'}}]});await router.push(path);await router.isReady();const w=mount(component,{global:{plugins:[router]}});expect(w.text()).not.toContain('Palmiers');expect(w.find('.module-context').exists()).toBe(false);expect(w.find('tbody').exists()).toBe(false);expect(w.text()).toMatch(/pas encore/);w.unmount()}})
 it('rejects transitions before modifying state when API mode is active',()=>{expect(()=>missionTransition(supportState.missions[1],'accepted')).toThrow('Démonstration');expect(()=>requestTransition(supportState.requests[1],'submitted','Réponse')).toThrow('Démonstration');expect(()=>decideAssignment('acc-2','approved','')).toThrow('Démonstration');expect(supportState.missions[1].status).toBe('proposed')})
})
