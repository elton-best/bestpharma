<script setup lang="ts">
import { dismiss, toasts } from '@/services/notify'
</script>

<template>
  <div class="toast-stack">
    <article
      v-for="item in toasts.items"
      :key="item.id"
      class="app-toast"
      :class="item.kind"
      :role="item.kind === 'error' ? 'alert' : 'status'"
      :data-testid="item.testId || undefined"
    >
      <p>{{ item.title }}</p>
      <button type="button" aria-label="Fermer la notification" @click="dismiss(item.id)">×</button>
    </article>
  </div>
</template>
