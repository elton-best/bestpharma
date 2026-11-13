import { reactive } from 'vue'

export type ToastKind = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: number
  kind: ToastKind
  title: string
  testId: string
}

const state = reactive<{ items: ToastItem[] }>({ items: [] })
const timers = new Map<number, number>()
let seq = 1

export const toasts = state

export function dismiss(id: number) {
  const timer = timers.get(id)
  if (timer) window.clearTimeout(timer)
  timers.delete(id)
  const index = state.items.findIndex(item => item.id === id)
  if (index >= 0) state.items.splice(index, 1)
}

export function clearToasts() {
  for (const item of [...state.items]) dismiss(item.id)
}

export function notify(kind: ToastKind, title: string, testId = '') {
  const id = seq++
  state.items.push({ id, kind, title, testId })
  const life = kind === 'error' ? 7000 : 4500
  timers.set(id, window.setTimeout(() => dismiss(id), life))
  return id
}
