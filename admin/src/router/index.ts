import { createRouter, createWebHistory } from 'vue-router'
import InscriptionsView from '@/views/InscriptionsView.vue'
import MissionsView from '@/views/MissionsView.vue'
export default createRouter({ history: createWebHistory(), routes: [{ path: '/', redirect: '/inscriptions' }, { path: '/inscriptions', component: InscriptionsView }, { path: '/missions', component: MissionsView }] })
