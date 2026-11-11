<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
    <RouterLink to="/dashboard" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700">
      <AppIcon name="chevron" :size="14" class="rotate-180" />
      Retour au tableau de bord
    </RouterLink>

    <header class="mt-8 max-w-3xl">
      <p class="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Pilotage · Périmètre groupe</p>
      <h1 class="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Consolidation Groupe</h1>
      <p class="mt-4 text-base leading-7 text-slate-600">Cette vue n’est pas disponible. BestPharma ne dispose actuellement ni d’une API de consolidation, ni d’une autorisation définissant le périmètre des officines du groupe.</p>
    </header>

    <section class="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-7" role="status" aria-live="polite">
      <div class="flex items-start gap-4">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800"><AppIcon name="info" :size="20" /></span>
        <div>
          <h2 class="text-lg font-bold text-slate-900">Consolidation indisponible</h2>
          <p class="mt-2 leading-6 text-slate-700">Aucun indicateur, montant ou total n’est présenté : aucune donnée d’officine ou de groupe n’est chargée ou estimée sur cette page.</p>
        </div>
      </div>
    </section>

    <section class="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="requirements-title">
      <h2 id="requirements-title" class="text-lg font-bold text-slate-900">Prérequis avant toute consolidation</h2>
      <ul class="mt-4 grid gap-4 sm:grid-cols-2">
        <li class="rounded-xl bg-slate-50 p-4"><strong class="block text-sm text-slate-900">Périmètre explicite</strong><span class="mt-1 block text-sm leading-6 text-slate-600">Définir les officines rattachées au groupe et les règles d’évolution de ce périmètre.</span></li>
        <li class="rounded-xl bg-slate-50 p-4"><strong class="block text-sm text-slate-900">Autorisations dédiées</strong><span class="mt-1 block text-sm leading-6 text-slate-600">Établir qui peut consulter les données agrégées et selon quels droits.</span></li>
        <li class="rounded-xl bg-slate-50 p-4"><strong class="block text-sm text-slate-900">API et sources fiables</strong><span class="mt-1 block text-sm leading-6 text-slate-600">Fournir des données disponibles, cohérentes et traçables pour chaque officine.</span></li>
        <li class="rounded-xl bg-slate-50 p-4"><strong class="block text-sm text-slate-900">Règles de calcul validées</strong><span class="mt-1 block text-sm leading-6 text-slate-600">Préciser les indicateurs, périodes et règles d’agrégation avant leur affichage.</span></li>
      </ul>
    </section>
  </div>
</template>
