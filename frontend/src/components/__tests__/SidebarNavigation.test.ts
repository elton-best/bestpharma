// @vitest-environment jsdom
import {describe,it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import {createRouter,createMemoryHistory} from 'vue-router'
import SidebarNavigation from '../SidebarNavigation.vue'
import {navigation} from '@/config/navigation'
describe('ERPSAAS-style navigation',()=>{
 it('covers all nine groups and keeps stock tab URLs distinct',()=>{expect(navigation).toHaveLength(9);expect(navigation.find(g=>g.id==='stock')!.children).toHaveLength(13);expect(new Set(navigation.flatMap(g=>g.children.map(c=>c.to))).size).toBe(navigation.flatMap(g=>g.children).length)})
 it('expands the active group and identifies the exact query tab',async()=>{const router=createRouter({history:createMemoryHistory(),routes:[{path:'/:pathMatch(.*)*',component:{template:'<div/>'}}]});await router.push('/dashboard/stock?tab=valorisation');await router.isReady();const w=mount(SidebarNavigation,{props:{collapsed:false},global:{plugins:[router]}});expect(w.find('#nav-stock').isVisible()).toBe(true);expect(w.find('a.selected').text()).toBe('Valorisation');await w.findAll('button').find(b=>b.attributes('aria-label')==='Stock')!.trigger('click');expect(w.find('#nav-stock').attributes('style')).toContain('display: none');w.unmount()})
 it('requests expansion when a group is clicked in collapsed mode',async()=>{const router=createRouter({history:createMemoryHistory(),routes:[{path:'/:pathMatch(.*)*',component:{template:'<div/>'}}]});await router.push('/');const w=mount(SidebarNavigation,{props:{collapsed:true},global:{plugins:[router]}});await w.findAll('button')[0].trigger('click');expect(w.emitted('expand')).toHaveLength(1);expect(w.findAll('.parent-label')).toHaveLength(0);w.unmount()})
})
