// @vitest-environment jsdom
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest'
import {mount,flushPromises,type VueWrapper} from '@vue/test-utils'
import {createRouter,createMemoryHistory} from 'vue-router'
const api=vi.hoisted(()=>vi.fn())
const mode=vi.hoisted(()=>({demoMode:true,request:api}))
vi.mock('../quality',()=>mode)
vi.mock('../supportDemo',()=>({currentOffice:{value:{id:'stock-ui',name:'Officine fictive'}}}))
import StockView from '@/views/stock/IndexView.vue'
import {stockTabs} from '../stockDemo'
let w:VueWrapper|undefined
beforeEach(()=>{localStorage.clear();mode.demoMode=true;api.mockReset()})
afterEach(()=>{w?.unmount();document.body.innerHTML=''})
async function render(tab='overview'){const router=createRouter({history:createMemoryHistory(),routes:[{path:'/dashboard/stock',component:StockView}]});await router.push('/dashboard/stock?tab='+tab);await router.isReady();w=mount(StockView,{attachTo:document.body,global:{plugins:[router],stubs:{ModuleDemoContext:true}}});await flushPromises();return router}
function button(text:string){return [...document.querySelectorAll('button')].find(b=>b.textContent?.trim()===text)!}
describe('Stock : navigation et modales',()=>{
 it('opens all thirteen tabs without a planned-module placeholder',async()=>{const r=await render();for(const [tab,title] of stockTabs){await r.push('/dashboard/stock?tab='+tab);await flushPromises();expect(w!.find('h1').text()).toBe(title);expect(w!.text()).not.toContain('Le module viendra ensuite');expect(w!.find('nav[aria-label="Rubriques du stock"]').exists()).toBe(false);expect(w!.find('[data-stock-dashboard]').attributes('data-stock-dashboard')).toBe(tab)}})
 it('creates a product only through a confirmed modal',async()=>{await render('produits');button('Ajouter un produit').click();await flushPromises();const dialog=document.querySelector('[role=dialog]')!;expect(dialog).not.toBeNull();expect(dialog.querySelector('input[type=checkbox]')!.hasAttribute('required')).toBe(true);const inputs=dialog.querySelectorAll('input');for(const [i,value] of [[0,'Produit test'],[1,'TEST-123']] as const){(inputs[i] as HTMLInputElement).value=value;inputs[i].dispatchEvent(new Event('input',{bubbles:true}))}const area=dialog.querySelector('textarea')!;area.value='Création fictive';area.dispatchEvent(new Event('input',{bubbles:true}));const box=dialog.querySelector('input[type=checkbox]') as HTMLInputElement;box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));await flushPromises();dialog.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await flushPromises();expect(w!.text()).toContain('Produit test');expect(document.querySelector('[role=dialog]')).toBeNull()})
 it('looks up a keyboard scanner code without creating an unknown product',async()=>{await render('scan');await w!.find('input[aria-label="Code produit scanné"]').setValue('UNKNOWN');await w!.find('form').trigger('submit');expect(w!.text()).toContain('Code inconnu');await w!.find('input[aria-label="Code produit scanné"]').setValue('DEMO-001');await w!.find('form').trigger('submit');expect(w!.text()).toContain('Produit Alpha')})
 it('uses distinct FEFO, location, recall and expiry workspaces instead of the shared table',async()=>{
  const r=await render('fefo');expect(w!.find('.fefo-queue').exists()).toBe(true);expect(w!.find('table').exists()).toBe(false)
  await r.push('/dashboard/stock?tab=emplacements');await flushPromises();expect(w!.findAll('.location-card')).toHaveLength(3);expect(w!.find('table').exists()).toBe(false)
  await r.push('/dashboard/stock?tab=quarantaine');await flushPromises();expect(w!.findAll('.quarantine-column')).toHaveLength(2);expect(w!.text()).toContain('Rappels internes simulés')
  await r.push('/dashboard/stock?tab=peremptions');await flushPromises();await w!.find('select[aria-label="Horizon de péremption"]').setValue('0');expect(w!.findAll('.expiry-timeline li')).toHaveLength(1)
 })
 it('opens a stock count directly from the inventory workspace in a modal',async()=>{
  await render('inventaires');button('Compter ce lot').click();await flushPromises();expect(document.querySelector('[role=dialog]')!.textContent).toContain('Enregistrer un comptage');expect(document.querySelector('select')!.value).toBe('lot-1')
 })
 it('loads server stock without local fixtures and posts a versioned operation',async()=>{
  mode.demoMode=false;api.mockResolvedValue({revision:0,products:[],locations:[],lots:[],events:[]});await render('produits');expect(api).toHaveBeenCalledWith('/stock/workspace');expect(w!.text()).not.toContain('DEMO-A01');button('Ajouter un produit').click();await flushPromises()
  const dialog=document.querySelector('[role=dialog]')!;const inputs=dialog.querySelectorAll('input');for(const [i,value] of [[0,'Produit serveur'],[1,'SERVER-001']] as const){(inputs[i] as HTMLInputElement).value=value;inputs[i].dispatchEvent(new Event('input',{bubbles:true}))}
  const area=dialog.querySelector('textarea')!;area.value='Création serveur';area.dispatchEvent(new Event('input',{bubbles:true}));const box=dialog.querySelector('input[type=checkbox]') as HTMLInputElement;box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));await flushPromises();dialog.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await flushPromises()
  const write=api.mock.calls.find(c=>c[1]==='POST')!;expect(write[0]).toBe('/stock/operations');expect(write[2].revision).toBe(0);expect(write[2].request_key).toBeTruthy();expect(write[2].command).toBe('product');expect(write[2].input.name).toBe('Produit serveur');expect(localStorage.length).toBe(0)
 })
 it('never displays fictional stock as API data',async()=>{mode.demoMode=false;api.mockRejectedValue(new Error('Administration de l’officine requise.'));await render('lots');expect(w!.text()).toContain('Administration de l’officine requise.');expect(w!.text()).not.toContain('DEMO-A01');expect(w!.find('table').exists()).toBe(false)})
})
