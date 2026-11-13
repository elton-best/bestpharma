<script setup lang="ts">
import AppIcon from './AppIcon.vue'

withDefaults(defineProps<{
  eyebrow: string
  title: string
  subtitle?: string
  office?: string
  source?: string
  tone?: 'demo' | 'api'
  tour?: string
}>(), { subtitle: '', office: '', source: '', tone: 'api', tour: '' })
</script>

<template>
  <header class="pilotage-page-header" :data-tour="tour || undefined">
    <div class="pilotage-header-copy">
      <div v-if="office || source" class="pilotage-header-meta">
        <span v-if="office" class="pilotage-office"><AppIcon name="pin" :size="14" />{{ office }}</span>
        <span v-if="source" class="pilotage-source" :class="tone">{{ source }}</span>
      </div>
      <p class="eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="pilotage-header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>
