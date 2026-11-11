// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
const api = vi.hoisted(() => vi.fn())
vi.mock('../quality', () => ({ request: api }))
import MissionCommentsPanel from '@/components/MissionCommentsPanel.vue'
let wrapper: VueWrapper | undefined
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = ''; api.mockReset() })

describe('échanges de mission', () => {
  it('shows internal notes only when server grants lead visibility', async () => {
    api.mockResolvedValue({ data: [{ id: 1, user_id: 2, author: 'Équipe fictive', visibility: 'internal', message: 'Note confidentielle fictive', created_at: '2026-11-11' }], can_lead: true, can_comment: true })
    wrapper = mount(MissionCommentsPanel, { props: { missionId: 7 }, attachTo: document.body })
    await flushPromises()
    expect(document.body.textContent).toContain('Note confidentielle fictive')
    expect(document.body.textContent).toContain('Note interne')
  })
  it('never displays internal data to an office reader and offers shared visibility only', async () => {
    api.mockResolvedValue({ data: [{ id: 2, user_id: 2, author: 'Équipe fictive', visibility: 'shared', message: 'Message partagé', created_at: '2026-11-11' }], can_lead: false, can_comment: true })
    wrapper = mount(MissionCommentsPanel, { props: { missionId: 7 }, attachTo: document.body })
    await flushPromises()
    expect(document.body.textContent).toContain('Message partagé')
    expect(document.body.textContent).not.toContain('Note confidentielle')
    expect(document.querySelector('select')).toBeNull()
    expect(document.body.textContent).toContain('Partagé avec l’officine')
  })
})
