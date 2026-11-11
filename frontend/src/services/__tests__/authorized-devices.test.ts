// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
const api = vi.hoisted(() => vi.fn())
vi.mock('../quality', () => ({ demoMode: false, request: api }))
import AuthorizedDevicesView from '@/views/devices/AuthorizedDevicesView.vue'

let wrapper: VueWrapper | undefined
async function render() { wrapper = mount(AuthorizedDevicesView, { attachTo: document.body }); await flushPromises(); return wrapper }
function button(label: string) { return [...document.querySelectorAll('button')].find(el => el.textContent?.trim() === label)! }
beforeEach(() => { api.mockReset(); api.mockResolvedValue({ data: [] }) })
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = '' })

describe('authorized devices screen', () => {
  it('registers using a secret fingerprint, clears it, then allows revocation and reactivation with versions', async () => {
    const device = { id: 8, name: 'Caisse principale', type: 'caisse', is_attendance_terminal: false, is_active: true, last_seen_at: null, version: 1 }
    api.mockImplementation(async (path: string, method = 'GET') => {
      if (path === '/tenancy/devices' && method === 'GET') return { data: [device] }
      if (path === '/tenancy/devices' && method === 'POST') return { data: device }
      if (path.endsWith('/revoke')) return { data: { ...device, is_active: false, version: 2 } }
      if (path.endsWith('/reactivate')) return { data: { ...device, is_active: true, version: 3 } }
      return { data: [] }
    })
    const view = await render(); button('Enregistrer un appareil').click(); await flushPromises()
    const inputs = document.querySelectorAll('[role="dialog"] input')
    ;(inputs[0] as HTMLInputElement).value = 'Caisse principale'; inputs[0].dispatchEvent(new Event('input', { bubbles: true }))
    ;(inputs[1] as HTMLInputElement).value = 'fingerprint-secret-12345678901234567890'; inputs[1].dispatchEvent(new Event('input', { bubbles: true }))
    button('Enregistrer').click(); await flushPromises()
    expect(api).toHaveBeenCalledWith('/tenancy/devices', 'POST', expect.objectContaining({ fingerprint: 'fingerprint-secret-12345678901234567890' }))
    expect(document.body.textContent).not.toContain('fingerprint-secret-12345678901234567890')
    expect(view.text()).toContain('Caisse principale')
    button('Révoquer').click(); await flushPromises()
    expect(api).toHaveBeenCalledWith('/tenancy/devices/8/revoke', 'POST', { version: 1 })
    button('Réactiver').click(); await flushPromises()
    expect(api).toHaveBeenCalledWith('/tenancy/devices/8/reactivate', 'POST', { version: 2 })
  })
})
