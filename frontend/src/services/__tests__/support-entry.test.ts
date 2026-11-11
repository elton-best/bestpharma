// @vitest-environment jsdom
import {describe,it,expect,vi} from 'vitest'
import {mount} from '@vue/test-utils'
const mode=vi.hoisted(()=>({demoMode:false}))
vi.mock('../quality',()=>mode)
vi.mock('@/views/support/RequestsApiView.vue',()=>({default:{template:'<div>Demandes connectées</div>'}}))
vi.mock('@/views/support/SupportView.vue',()=>({default:{template:'<div>Tableau de démonstration</div>'}}))
import SupportModuleView from '@/views/support/SupportModuleView.vue'
describe('entrée principale M2',()=>{
 it('ouvre directement les demandes en mode API, sans écran aperçu',()=>{
  mode.demoMode=false
  const w=mount(SupportModuleView)
  expect(w.text()).toBe('Demandes connectées');w.unmount()
 })
 it('conserve le tableau de démonstration en mode démo',()=>{
  mode.demoMode=true
  const w=mount(SupportModuleView)
  expect(w.text()).toBe('Tableau de démonstration');w.unmount()
 })
})
