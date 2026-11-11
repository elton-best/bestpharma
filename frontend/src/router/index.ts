import { createRouter, createWebHistory } from 'vue-router'
import { demoMode } from '@/services/quality'
import ventesCaisseRoutes from './modules/ventes-caisse'
import dispensationRoutes from './modules/dispensation'
import devicesRoutes from './modules/devices'
const router = createRouter({
 history: createWebHistory(),
 routes: [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', name: 'login', component: () => import('@/views/auth/LoginView.vue'), meta: { public: true, title: 'Connexion' } },
  ...['forgot-password','reset-password','verify-email','google-callback'].map(path=>({path:'/'+path,component:()=>import('@/views/auth/RecoveryView.vue'),meta:{public:true,title:'Sécurité du compte'}})),
  { path: '/notifications',component:()=>import('@/views/security/NotificationsView.vue'),meta:{title:'Notifications',applicant:true}},
   { path: '/dashboard/securite',component:()=>import('@/views/security/SecurityView.vue'),meta:{title:'Sécurité & MFA',applicant:true}},
    ...ventesCaisseRoutes,
    ...dispensationRoutes,
    ...devicesRoutes,
  { path: '/register', component: () => import('@/views/auth/RegisterView.vue'), meta: { public: true, title: 'Inscription officine' } },
  { path: '/application', component: () => import('@/views/onboarding/OnboardingModuleView.vue'), meta: { title: 'Suivi du dossier', applicant: true } },
  { path: '/beg/inscriptions', component: () => import('@/views/onboarding/OnboardingModuleView.vue'), meta: { title: 'Instruction BEG', platform: true } },
  {path:'/internal-invitation',component:()=>import('@/views/auth/InternalInvitationView.vue'),meta:{public:true,title:'Invitation interne'}},
  {path:'/beg/equipe-interne',component:()=>import('@/views/officine/InternalTeamView.vue'),meta:{platform:true,title:'Équipe interne'}},
  { path: '/invitation', component: () => import('@/views/team/InvitationView.vue'), meta: { public: true, title: 'Invitation officine' } },
  { path: '/equipe', component: () => import('@/views/team/TeamView.vue'), meta: { title: 'Équipe & droits' } },
  ...['/dashboard/acces','/dashboard/journal','/beg/synthese','/beg/journal'].map(path=>({path,component:()=>import('@/views/access/AccessOperationsView.vue'),meta:{title:path.endsWith('/journal')?'Journal des accès':'Tableau des accès',...(path.startsWith('/beg')?{platform:true}:{})}})),
    {path:'/dashboard/stock',component:()=>import('@/views/stock/IndexView.vue'),meta:{title:'Stock & lots'}},
    {path:'/dashboard/gardes',component:()=>import('@/views/pharmacies/GuardsView.vue'),meta:{title:'Pharmacies de garde'}},
     {path:'/dashboard/chaine-froid',component:()=>import('@/views/locaux-equipements/TemperaturesView.vue'),meta:{title:'Températures & chaîne du froid'}},
   { path: '/dashboard/consolidation', component: () => import('@/views/dashboard/ConsolidationView.vue'), meta: { title: 'Consolidation Groupe' } },
   { path: '/dashboard', component: () => import('@/views/dashboard/OverviewView.vue'), meta: { title: 'Vue d’ensemble' } },
   { path: '/qualite', component: () => import('@/views/qualite/IndexView.vue'), meta: { title: 'Qualité & actions' } },
   { path: '/qualite/plans-actions', component: () => import('@/views/qualite/ActionsModule4View.vue'), meta: { title: 'Plans & actions M4' } },
   { path: '/qualite/inspections', component: () => import('@/views/qualite/InspectionsModule5View.vue'), meta: { title: 'Auto-inspections BPD M5' } },
  { path: '/documents', component: () => import('@/views/documents/IndexView.vue'), meta: { title: 'Documents' } },
  { path: '/dashboard/officine', component: () => import('@/views/officine/OfficineModuleView.vue'), meta: { title: 'Paramètres Officine' } },
  { path: '/dashboard/profil', component: () => import('@/views/officine/OfficineModuleView.vue'), meta: { title: 'Mon profil & rôle', applicant: true } },
  { path: '/dashboard/accompagnateurs', component: () => import('@/views/officine/OfficineModuleView.vue'), meta: { title: 'Accompagnateurs' } },
  {path:'/dashboard/missions-accompagnement',component:()=>import('@/views/support/MissionsApiView.vue'),meta:{title:'Missions d’accompagnement'}},
  { path: '/dashboard/accompagnement', component: () => import('@/views/support/SupportModuleView.vue'), meta: { title: 'Mon accompagnement' } },
  { path: '/dashboard/portefeuille-accompagnement', component: () => import('@/views/support/SupportModuleView.vue'), meta: { title: 'Demandes de prestation' } },
  { path: '/choose-officine', component: () => import('@/views/officine/ChooseOfficeView.vue'), meta: { title: 'Choisir une officine', applicant: true } },
  {path:'/beg/comptes',component:()=>import('@/views/officine/AccountStatesView.vue'),meta:{title:'État des comptes',platform:true}},
  {path:'/beg/officines',component:()=>import('@/views/officine/OfficeStatesView.vue'),meta:{title:'États des officines',platform:true}},
  {path:'/beg/demandes-accompagnement',component:()=>import('@/views/support/IntakeView.vue'),meta:{title:'Guichet accompagnement BEG',applicant:true}},
  { path: '/beg/accompagnateurs', component: () => import('@/views/officine/SupportCoordinationView.vue'), meta: { title: 'Coordination des accès', applicant: true } },
  { path: '/dashboard/:section', component: () => import('@/views/PlannedView.vue'), meta: { title: 'Module prévu' } },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
 ],
})
router.beforeEach(to => {
 document.title = `${to.meta.title || 'Officine'} · BestPharma`
 if (!to.meta.public && !demoMode) {
  if (!sessionStorage.getItem('bestpharma.token')) return '/login'
  if (to.meta.platform && sessionStorage.getItem('bestpharma.platform') !== 'true') return '/application'
  if (!to.meta.applicant && !to.meta.platform && !sessionStorage.getItem('bestpharma.officine')) return '/application'
 }
})
export default router
