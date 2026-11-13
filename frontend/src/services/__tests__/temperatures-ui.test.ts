// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from 'vitest'
import {flushPromises,mount} from '@vue/test-utils'
import type {VueWrapper} from '@vue/test-utils'
vi.mock('../quality',async importOriginal=>({
 ...await importOriginal<typeof import('../quality')>(),
 demoMode:false,
}))
import TemperaturesView from '@/views/locaux-equipements/TemperaturesView.vue'
let wrapper:VueWrapper|undefined
afterEach(()=>{wrapper?.unmount();wrapper=undefined;vi.unstubAllGlobals();vi.restoreAllMocks()})
describe('temperature register interface',()=>{
 it('loads empty API history without demo readings and explains that thresholds need validation',async()=>{
  const fetch=vi.fn().mockResolvedValue({ok:true,status:200,text:async()=>JSON.stringify({data:[]})})
  vi.stubGlobal('fetch',fetch)
  wrapper=mount(TemperaturesView);await flushPromises()
  expect(fetch).toHaveBeenCalledWith('/api/v1/locauxequipements/temperatures',expect.objectContaining({method:'GET'}))
  expect(wrapper.text()).toContain('Aucun relevé enregistré')
  expect(wrapper.text()).toContain('Seuils à configurer après validation.')
  expect(wrapper.findAll('tbody tr')).toHaveLength(0)
  expect(wrapper.find('[data-tour="temp-courbe"] svg').exists()).toBe(false)
  expect(wrapper.find('input[type="datetime-local"]').exists()).toBe(true)
 })
 it.each([
  {status:403,payload:{message:'Accès refusé.'},message:'Accès refusé.'},
  {status:500,payload:{},message:'Le service est indisponible. Veuillez réessayer.'},
 ])('displays API errors ($status) without allowing entry or showing an empty success state',async({status,payload,message})=>{
  const fetch=vi.fn().mockResolvedValue({ok:false,status,text:async()=>JSON.stringify(payload)})
  vi.stubGlobal('fetch',fetch)
  wrapper=mount(TemperaturesView);await flushPromises()
  expect(fetch).toHaveBeenCalledWith('/api/v1/locauxequipements/temperatures',expect.objectContaining({method:'GET'}))
  expect(wrapper.get('[role="alert"]').text()).toContain(message)
  expect(wrapper.find('form').exists()).toBe(false)
  expect(wrapper.find('input[type="file"]').exists()).toBe(false)
  expect(wrapper.findAll('tbody tr')).toHaveLength(0)
  expect(wrapper.text()).not.toContain('Aucun relevé enregistré')
 })
 it('reports network failure without using demo readings',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  wrapper=mount(TemperaturesView);await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('Le service est indisponible. Veuillez réessayer.')
  expect(wrapper.find('form').exists()).toBe(false)
  expect(wrapper.findAll('tbody tr')).toHaveLength(0)
 })
})
