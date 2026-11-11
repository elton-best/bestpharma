// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
const api = vi.hoisted(() => vi.fn())
vi.mock('../quality', () => ({ request: api }))
import MissionPlanPanel from '@/components/MissionPlanPanel.vue'

let wrapper: VueWrapper | undefined
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = ''; api.mockReset() })
function button(text: string) { return [...document.querySelectorAll('button')].find(item => item.textContent?.trim() === text)! }

describe('plans d’accompagnement connectés', () => {
  it('does not reveal an unpublished plan to an office administrator', async () => {
    api.mockResolvedValue({ data: null, can_approve: true, can_edit: false })
    wrapper = mount(MissionPlanPanel, { props: { missionId: 7, active: true }, attachTo: document.body })
    await flushPromises()
    expect(document.body.textContent).toContain('Aucun plan visible')
    expect(button('Créer le plan')).toBeUndefined()
  })

  it('saves a mission plan draft without creating a quality action', async () => {
    api.mockResolvedValueOnce({ data: null, can_approve: false, can_edit: true })
      .mockResolvedValueOnce({ data: { id: 3, status: 'draft', version: 1, can_edit: true, versions: [] } })
    wrapper = mount(MissionPlanPanel, { props: { missionId: 7, active: true }, attachTo: document.body })
    await flushPromises()
    button('Créer le plan').click()
    await flushPromises()
    await (document.querySelector('input[maxlength="180"]') as HTMLInputElement).focus()
    ;(document.querySelector('input[maxlength="180"]') as HTMLInputElement).value = 'Plan de recette'
    document.querySelector('input[maxlength="180"]')!.dispatchEvent(new Event('input', { bubbles: true }))
    const objective = document.querySelector('textarea[maxlength="5000"]') as HTMLTextAreaElement
    objective.value = 'Objectif fictif'; objective.dispatchEvent(new Event('input', { bubbles: true }))
    const dates = [...document.querySelectorAll('input[type="date"]')] as HTMLInputElement[]
    dates[0].value = '2026-12-01'; dates[0].dispatchEvent(new Event('input', { bubbles: true }))
    dates[1].value = '2026-12-20'; dates[1].dispatchEvent(new Event('input', { bubbles: true }))
    const fields = [...document.querySelectorAll('fieldset input')] as HTMLInputElement[]
    fields[0].value = 'Résultat fictif'; fields[0].dispatchEvent(new Event('input', { bubbles: true }))
    fields[1].value = 'Responsable qualité'; fields[1].dispatchEvent(new Event('input', { bubbles: true }))
    fields[2].value = '2026-12-10'; fields[2].dispatchEvent(new Event('input', { bubbles: true }))
    document.querySelector('#mission-plan-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(api.mock.calls.some(call => call[1] === 'PUT')).toBe(true)
    expect(api.mock.calls.some(call => String(call[0]).includes('/qualite/actions'))).toBe(false)
    expect(document.body.textContent).toContain('Brouillon du plan enregistré')
  })
})
