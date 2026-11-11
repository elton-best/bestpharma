// Shared scroll/background lock for dialog transitions.
const stack: HTMLElement[] = []
let overflow = ''
let app: HTMLElement | null = null
let inert: string | null = null
export function lockModal(element: HTMLElement) {
 if (!stack.length) {
  overflow = document.body.style.overflow
  app = document.getElementById('app'); inert = app?.getAttribute('inert') ?? null
  app?.setAttribute('inert', '')
  document.body.style.overflow = 'hidden'
 }
 stack.push(element)
}
export function isTopModal(element: HTMLElement) { return stack[stack.length - 1] === element }
export function unlockModal(element: HTMLElement) {
 const index = stack.indexOf(element)
 if (index < 0) return
 stack.splice(index, 1)
 if (!stack.length) {
  document.body.style.overflow = overflow
  if (inert === null) app?.removeAttribute('inert'); else app?.setAttribute('inert', inert)
  app = null
 }
}
// Keep the original trigger when a view dialog is replaced by an edit dialog.
let externalTrigger: HTMLElement | null = null
export function rememberModalTrigger(candidate: HTMLElement | null) {
 if (candidate?.isConnected && candidate !== document.body && !candidate.closest('[role="dialog"]')) externalTrigger = candidate
}
export function modalReturnFocus(candidate: HTMLElement | null): HTMLElement | null {
 if (candidate?.isConnected && candidate !== document.body && !candidate.closest('[inert]')) return candidate
 return externalTrigger?.isConnected && !externalTrigger.closest('[inert]') ? externalTrigger : null
}
