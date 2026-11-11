// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
vi.mock('../quality', () => ({ demoMode: false, request: vi.fn().mockResolvedValue({ data: { data: [] } }) }))
import DocumentsView from '@/views/documents/IndexView.vue'
import { request } from '../quality'

describe('GED initiale', () => {
  it('propose un brouillon sans prétendre importer les sources historiques', async () => {
    const wrapper = mount(DocumentsView)
    expect(wrapper.text()).toContain('Les exemples historiques ne sont pas importés')
    expect(wrapper.text()).toContain('Aucun document')
    await wrapper.find('input[required][maxlength="255"]').setValue('Procédure test')
    await wrapper.findAll('form').at(-1)!.trigger('submit')
    expect(request).toHaveBeenCalledWith('/documents', 'POST', expect.objectContaining({ title: 'Procédure test', kind: 'procedure' }))
    wrapper.unmount()
  })

  it('annonce le dépôt en quarantaine sans présenter une approbation comme acquise', () => {
    const wrapper = mount(DocumentsView)
    expect(wrapper.text()).toContain('Importer en quarantaine')
    expect(wrapper.text()).toContain('qualification puis une approbation humaine distinctes')
    expect(wrapper.text()).toContain('Aucune source importée')
    expect(wrapper.text()).toContain('Aucun canevas')
    wrapper.unmount()
  })
})
