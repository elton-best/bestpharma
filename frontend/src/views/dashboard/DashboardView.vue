<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useQualityStore } from '@/stores/qualityStore'
import { demoMode } from '@/services/quality'
import AppIcon from '@/components/AppIcon.vue'
const store = useQualityStore()
const refreshedAt = ref<Date | null>(null)
async function refresh() {
  if (demoMode) return
  await store.load()
  if (!store.error) refreshedAt.value = new Date()
}
onMounted(refresh)
const date = new Intl.DateTimeFormat('fr-BJ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Porto-Novo' }).format(new Date())
const refreshedLabel = () => refreshedAt.value
  ? new Intl.DateTimeFormat('fr-BJ', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Porto-Novo' }).format(refreshedAt.value)
  : null
</script>
<template>
  <div class="page">
    <div class="page-heading"><div><p class="eyebrow">VOTRE ESPACE DE PILOTAGE</p><h1>Une officine sereine,<br><span class="accent-serif">jour après jour.</span></h1><p class="page-subtitle">Retrouvez les indicateurs qualité réellement disponibles pour votre officine.</p></div><div class="date-chip"><AppIcon name="clock" :size="16" />{{ date }}</div></div>
    <div class="dashboard-refresh"><span>{{ refreshedLabel() ? `Données actualisées à ${refreshedLabel()}` : 'Actualisation à la demande' }}</span><button class="button secondary" :disabled="store.loading" @click="refresh">{{ store.loading ? 'Actualisation…' : 'Actualiser' }}</button></div>
    <div v-if="store.error" class="alert error" role="alert">{{ store.error }} <button @click="refresh">Réessayer</button></div>
    <div v-if="store.loading && !store.loaded" class="loading" role="status">Chargement des indicateurs…</div>
    <div v-else-if="demoMode" class="empty-state" role="status"><h3>Indicateurs indisponibles</h3><p>Les données de démonstration ne sont pas utilisées sur ce tableau de bord. Connectez l’API pour afficher des compteurs vérifiés.</p></div>
    <template v-else-if="store.loaded">
    <section class="stats-grid" aria-label="Indicateurs qualité">
      <article class="stat-card"><div class="stat-top"><span>Actions à suivre</span><span class="stat-icon"><AppIcon name="quality" /></span></div><strong>{{ store.open.length.toString().padStart(2, '0') }}</strong><span class="stat-note">Ouvertes ou en cours de traitement</span></article>
      <article class="stat-card"><div class="stat-top"><span>Échéances dépassées</span><span class="stat-icon amber"><AppIcon name="clock" /></span></div><strong>{{ store.overdue.length.toString().padStart(2, '0') }}</strong><span class="stat-note">Actions non clôturées à reprendre</span></article>
      <article class="stat-card"><div class="stat-top"><span>Actions clôturées</span><span class="stat-icon"><AppIcon name="check" /></span></div><strong>{{ store.closed.length.toString().padStart(2, '0') }}</strong><span class="stat-note">Avec un bilan de résolution renseigné</span></article>
    </section>
     <div class="dashboard-columns"><section class="panel"><div class="panel-heading"><div><span class="eyebrow">LE BON RÉFLEXE</span><h2>Suivi qualité</h2></div><RouterLink to="/qualite" class="text-link">Tout voir <AppIcon name="arrow" :size="16" /></RouterLink></div><div class="empty-state"><AppIcon name="info" :size="32" /><h3>Détails non affichés</h3><p>Le tableau de bord présente uniquement des compteurs. Consultez l’espace qualité pour le suivi détaillé.</p></div><div class="panel-foot"><AppIcon name="info" :size="15" />Aucune donnée nominative n’est affichée ici.</div></section>
    <aside class="journey-card"><span class="eyebrow">VOTRE DÉMARCHE QUALITÉ</span><div class="journey-art" aria-hidden="true"><div class="orbit"></div><div class="art-cross">+</div><span class="art-leaf"></span></div><h2>Progresser,<br><em class="accent-serif">module par module.</em></h2><p>Identifiez un constat, désignez un responsable et suivez l’action jusqu’à sa résolution.</p><RouterLink class="button light" to="/qualite?create=1">Créer une action <AppIcon name="plus" :size="17" /></RouterLink></aside></div>
     </template>
     <section v-else-if="!store.loading && !store.error" class="empty-state" role="status"><h3>Indicateurs indisponibles</h3><p>Aucune donnée qualité n’a pu être chargée depuis l’API.</p><button class="button secondary" @click="refresh">Réessayer</button></section>
    <section class="documents-teaser"><div class="teaser-icon"><AppIcon name="documents" :size="25" /></div><div><span class="eyebrow">LES BONS SUPPORTS, AU BON ENDROIT</span><h2>Vos documents BestPharma arrivent bientôt.</h2><p>Les modèles et supports seront intégrés à partir de vos fichiers, sans reprendre ceux de l’ERP.</p></div><RouterLink class="button secondary" to="/documents">Voir l’espace <AppIcon name="arrow" :size="16" /></RouterLink></section>
  </div>
</template>
