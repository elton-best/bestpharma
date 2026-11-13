// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('@/services/quality', () => ({ request, demoMode: false }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() }),
}))

import InspectionsModule5View from '../qualite/InspectionsModule5View.vue'
import NonConformitesModule6View from '../qualite/NonConformitesModule6View.vue'
import RisquesContinuiteModule7View from '../qualite/RisquesContinuiteModule7View.vue'
import PersonnelFormationsModule8View from '../personnel/PersonnelFormationsModule8View.vue'
import EquipementsLocauxModule9View from '../locaux-equipements/EquipementsLocauxModule9View.vue'
import PrestatairesFournisseursModule10View from '../achats/PrestatairesFournisseursModule10View.vue'
import ApprovisionnementsModule11View from '../stock/ApprovisionnementsModule11View.vue'
import DispensationVenteModule12View from '../dispensation/DispensationVenteModule12View.vue'
import CaisseFinancesModule13View from '../tresorerie/CaisseFinancesModule13View.vue'
import ReportingModule14View from '../dashboard/ReportingModule14View.vue'
import AdministrationSaasModule15View from '../officine/AdministrationSaasModule15View.vue'

const VIEWS = [
  { name: 'Module 5 — Inspections', component: InspectionsModule5View },
  { name: 'Module 6 — Non-conformités', component: NonConformitesModule6View },
  { name: 'Module 7 — Risques & Continuité', component: RisquesContinuiteModule7View },
  { name: 'Module 8 — Personnel & Formations', component: PersonnelFormationsModule8View },
  { name: 'Module 9 — Équipements & Locaux', component: EquipementsLocauxModule9View },
  { name: 'Module 10 — Prestataires & Fournisseurs', component: PrestatairesFournisseursModule10View },
  { name: 'Module 11 — Produits, Stocks & Chaîne du froid', component: ApprovisionnementsModule11View },
  { name: 'Module 12 — Dispensation, Retours & Vigilance', component: DispensationVenteModule12View },
  { name: 'Module 13 — Caisse, Finances & Passations', component: CaisseFinancesModule13View },
  { name: 'Module 14 — Reporting & Tableaux de Bord', component: ReportingModule14View },
  { name: 'Module 15 — Administration SaaS & Support', component: AdministrationSaasModule15View },
]

describe('Modules 5 à 15 — Rendu UI et appels initiaux', () => {
  afterEach(() => vi.resetAllMocks())

  it.each(VIEWS)('monte $name sans erreur avec des données API valides', async ({ component }) => {
    request.mockImplementation(async (url: string) => {
      if (url.includes('per_page=')) {
        return { data: { data: [] } }
      }
      return {
        kpis: {},
        indicators: {
          total: 0,
          overdue: 0,
          by_status: { in_progress: 0, planned: 0, completed: 0, closed: 0 },
          inspections_total: 0,
          inspections_planned: 0,
          inspections_in_progress: 0,
          inspections_completed: 0,
          open_actions: 0,
          nc_total: 0,
          nc_open: 0,
          nc_overdue_30d: 0,
          by_severity: { critique: 0, haute: 0, moyenne: 0, faible: 0 },
          total_risks: 0,
          total_opportunities: 0,
          by_criticality: { critique: 0, elevee: 0, moderee: 0, faible: 0 },
        },
        data: [],
        metrics: [],
        covered_processes: [],
        expiring_credentials: [],
      }
    })

    const wrapper = mount(component, {
      global: {
        plugins: [createPinia()],
        stubs: {
          RouterLink: true,
        },
      },
    })
    await flushPromises()

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text().trim().length).toBeGreaterThan(20)
    expect(request).toHaveBeenCalled()
  })
})
