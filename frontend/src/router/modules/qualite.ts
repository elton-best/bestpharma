import IndexView from '@/views/qualite/IndexView.vue'
import ActionsModule4View from '@/views/qualite/ActionsModule4View.vue'
import InspectionsModule5View from '@/views/qualite/InspectionsModule5View.vue'

export default [
  { path: '/qualite', name: 'qualite', component: IndexView, meta: { title: 'Qualité & actions' } },
  { path: '/qualite/plans-actions', name: 'qualite-plans', component: ActionsModule4View, meta: { title: 'Plans & actions M4' } },
  { path: '/qualite/inspections', name: 'qualite-inspections', component: InspectionsModule5View, meta: { title: 'Auto-inspections BPD M5' } },
]
