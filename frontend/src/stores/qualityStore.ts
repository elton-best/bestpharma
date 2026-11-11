import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { qualityService, type QualityAction, type ActionInput } from '@/services/quality'
export const useQualityStore = defineStore('quality', () => {
  const actions = ref<QualityAction[]>([])
  const loading = ref(false)
  const error = ref('')
  const loaded = ref(false)
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const overdue = computed(() => actions.value.filter(x => x.status !== 'closed' && x.due_date < today()))
  const open = computed(() => actions.value.filter(x => x.status !== 'closed'))
  const closed = computed(() => actions.value.filter(x => x.status === 'closed'))
  async function load() {
    loading.value = true; error.value = ''
    try { actions.value = await qualityService.list(); loaded.value = true } catch (e) { error.value = (e as Error).message }
    finally { loading.value = false }
  }
  async function save(input: ActionInput, id?: number) {
    const result = await qualityService.save(input, id)
    actions.value = id ? actions.value.map(x => x.id === id ? result : x) : [result, ...actions.value]
  }
  return { actions, loading, loaded, error, overdue, open, closed, load, save }
})
