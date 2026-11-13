<script setup lang="ts">
import { ref } from 'vue'
defineProps<{ accept?: string; disabled?: boolean; modelValue?: File | null }>()
const emit = defineEmits<{ 'update:modelValue': [File | null] }>()
const input = ref<HTMLInputElement | null>(null)
function pick(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).files?.[0] || null)
}
</script>
<template>
  <div class="file-field">
    <input ref="input" class="file-native" type="file" :accept="accept" :disabled="disabled" @change="pick" />
    <button class="button secondary" type="button" :disabled="disabled" @click="input?.click()">Choisir un fichier</button>
    <span>{{ modelValue?.name || 'Aucun fichier choisi' }}</span>
  </div>
</template>
