<script setup lang="ts">
import AppIcon from './AppIcon.vue'

const links = [
  { to: '/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
  { to: '/reporting/rapports', label: 'Rapports M14', icon: 'documents' },
  { to: '/dashboard/consolidation', label: 'Consolidation groupe', icon: 'finance' },
  { to: '/dashboard/gardes', label: 'Pharmacies de garde', icon: 'calendar' },
] as const
</script>

<template>
  <nav class="pilotage-nav" aria-label="Navigation Pilotage">
    <RouterLink v-for="link in links" :key="link.to" :to="link.to" class="pilotage-nav-link">
      <AppIcon :name="link.icon" :size="16" />
      <span>{{ link.label }}</span>
    </RouterLink>
  </nav>
</template>
