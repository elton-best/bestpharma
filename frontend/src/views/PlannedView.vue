<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { plannedTitle } from '@/config/navigation'
import AppIcon from '@/components/AppIcon.vue'
const route=useRoute();const title=computed(()=>plannedTitle(route.fullPath))
</script>
<template><section class="page erp-page"><div class="page-heading compact"><div><p class="eyebrow">FEUILLE DE ROUTE · BESTPHARMA</p><h1>{{title}}</h1><p class="page-subtitle">Une place prévue dans votre espace de travail.</p></div><span class="module-chip">À venir</span></div><div class="panel planned-panel"><span class="planned-icon"><AppIcon name="box" :size="36"/></span><h2>La navigation est prête.<br>Le module viendra ensuite.</h2><p>Cette rubrique est prévue dans votre tableau de bord, mais ses fonctions ne sont pas encore livrées. Nous développons d’abord les modules 01 — Officines & accès, et 02 — Accompagnement.</p><p v-if="route.path.endsWith('modeles')" class="module-disclaimer">L’intitulé « 59 » vient de votre navigation cible : aucun ensemble de 59 canevas n’est encore intégré ou validé.</p><p v-if="route.path.endsWith('audit')" class="module-disclaimer">Aucun journal chaîné SHA-256 n’est revendiqué dans cette version.</p><div class="module-links"><RouterLink to="/dashboard" class="button secondary">Ouvrir le tableau de bord</RouterLink><RouterLink to="/dashboard/officine" class="button primary">Ouvrir mon officine</RouterLink><RouterLink to="/dashboard/accompagnement" class="button secondary">Ouvrir l’accompagnement</RouterLink></div></div></section></template>
