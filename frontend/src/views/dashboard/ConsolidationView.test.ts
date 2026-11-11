// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ConsolidationView from './ConsolidationView.vue'

describe('Consolidation Groupe', () => {
  it('explique honnêtement l’indisponibilité sans afficher de montants inventés', () => {
    const wrapper = mount(ConsolidationView, { global: { stubs: { AppIcon: true, RouterLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } } } })

    expect(wrapper.get('[role="status"]').text()).toContain('Consolidation indisponible')
    expect(wrapper.text()).toContain('ni d’une API de consolidation')
    expect(wrapper.text()).toContain('ni d’une autorisation définissant le périmètre')
    expect(wrapper.text()).toContain('Aucun indicateur, montant ou total')
    expect(wrapper.find('a[href="/dashboard"]').text()).toContain('Retour au tableau de bord')
    expect(wrapper.text()).toContain('Prérequis avant toute consolidation')
    expect(wrapper.text()).not.toMatch(/\d[\d\s.,]*\s?(€|FCFA|XOF|USD)/i)
    wrapper.unmount()
  })
})
