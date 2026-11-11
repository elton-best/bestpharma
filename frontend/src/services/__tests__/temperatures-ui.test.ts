// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from 'vitest'
import {flushPromises,mount} from '@vue/test-utils'
import TemperaturesView from '@/views/locaux-equipements/TemperaturesView.vue'
afterEach(()=>vi.restoreAllMocks())
describe('temperature register interface',()=>{
 it('shows empty history and explains that no threshold or follow-up is presumed',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({data:[]})}))
  const wrapper=mount(TemperaturesView);await flushPromises()
  expect(wrapper.text()).toContain('Aucun relevé enregistré')
  expect(wrapper.text()).toContain('Aucun seuil réglementaire n’est présumé')
  expect(wrapper.find('input[type="datetime-local"]').exists()).toBe(true)
  wrapper.unmount()
 })
 it('displays permission and service errors',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:403,json:async()=>({message:'Accès refusé.'})}))
  const wrapper=mount(TemperaturesView);await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('Accès refusé.')
  expect(wrapper.text()).toContain('permissions')
  wrapper.unmount()
 })
})
