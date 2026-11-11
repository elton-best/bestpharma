import { defineStore } from 'pinia'
import { ref } from 'vue'
export const useTenantStore = defineStore('tenant', () => {
  const officineId = ref<number | null>(null)
  const officine = ref<any>(null)
  return { officineId, officine }
})
