<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { isTopModal, lockModal, unlockModal, rememberModalTrigger, modalReturnFocus } from './modalManager'
const props = withDefaults(defineProps<{ modelValue: boolean; title: string; eyebrow?: string; busy?: boolean; size?: 'normal' | 'wide' | 'small' }>(), { busy: false, size: 'normal' })
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const titleId = useId()
const dialog = ref<HTMLElement>()
let locked: HTMLElement | null = null
let previousFocus: HTMLElement | null = null
function close() { if (!props.busy) emit('update:modelValue', false) }
function focusables() {
 return Array.from(dialog.value?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') || []).filter(e => !e.closest('[hidden], [inert]') && e.getAttribute('aria-hidden') !== 'true')
}
function keydown(event: KeyboardEvent) {
 if (!locked || !isTopModal(locked)) return
 if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
 if (event.key === 'Tab') {
  const elements = focusables(); const first = elements[0]; const last = elements[elements.length - 1]
  if (!first) { event.preventDefault(); dialog.value?.focus(); return }
  if (event.shiftKey && (document.activeElement === first || !dialog.value?.contains(document.activeElement))) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && (document.activeElement === last || !dialog.value?.contains(document.activeElement))) { event.preventDefault(); first.focus() }
 }
}
function release() {
 if (!locked) return
 unlockModal(locked); locked = null
 document.removeEventListener('keydown', keydown, true)
 modalReturnFocus(previousFocus)?.focus()
 previousFocus = null
}
watch(() => props.modelValue, async value => {
 if (!value) { release(); return }
 previousFocus = document.activeElement as HTMLElement
 rememberModalTrigger(previousFocus)
 await nextTick()
 if (!props.modelValue || !dialog.value || locked) return
 locked = dialog.value; lockModal(locked)
 document.addEventListener('keydown', keydown, true)
 const input = dialog.value.querySelector<HTMLElement>('input:not([type="hidden"]):not([disabled]),textarea:not([disabled]),select:not([disabled])')
 ;(input || dialog.value).focus()
}, { immediate: true, flush: 'post' })
onBeforeUnmount(release)
</script>
<template>
 <Teleport to="body"><div v-if="modelValue" class="modal-backdrop" @click.self="close"><section ref="dialog" class="action-modal app-modal" :class="`modal-${size}`" role="dialog" aria-modal="true" :aria-labelledby="titleId" :aria-busy="busy" tabindex="-1"><header class="modal-header"><div><p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p><h2 :id="titleId">{{ title }}</h2></div><button class="icon-button modal-close" type="button" :disabled="busy" aria-label="Fermer la fenêtre" @click="close"><AppIcon name="close" /></button></header><slot /><div v-if="$slots.footer" class="modal-footer"><slot name="footer" /></div></section></div></Teleport>
</template>
