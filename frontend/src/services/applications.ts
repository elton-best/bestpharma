import { demoMode, request } from './quality'
export type ApplicationStatus = 'pending' | 'under_review' | 'corrections_requested' | 'active' | 'rejected'
export interface Application {
 id: number; name: string; email: string; phone: string; city: string; address: string;
 applicant_function: string; status: ApplicationStatus; review_note: string | null; submitted_at: string; reviewed_at: string | null;
}
export interface ApplicationInput { officine_name: string; phone: string; city: string; address: string; applicant_function: string; consent: boolean }
export interface Registration extends ApplicationInput { name: string; email: string; password: string; password_confirmation: string }
export const statusLabels: Record<ApplicationStatus, string> = { pending: 'Dossier soumis', under_review: 'En cours d’instruction', corrections_requested: 'Compléments demandés', active: 'Espace activé', rejected: 'Dossier refusé' }
const key = 'bestpharma.demo.applications.v1'
export function readApplications(): Application[] {
 const raw = localStorage.getItem(key)
 if (!raw) return []
 const data = JSON.parse(raw)
 if (!Array.isArray(data) || !data.every(x => x && Number.isInteger(x.id) && typeof x.name === 'string' && x.status in statusLabels)) throw new Error('Les dossiers de démonstration sont illisibles.')
 return data
}
export function clearApplications() { localStorage.removeItem(key) }
export function loadApplicationExamples() {
 if (!demoMode) throw new Error('Exemples disponibles uniquement en démonstration.')
 const items = readApplications()
 const examples: { name: string; status: ApplicationStatus; city: string; note: string | null }[] = [
  { name: 'Pharmacie du Jardin · Dossier fictif', status: 'pending', city: 'Porto-Novo', note: null },
  { name: 'Pharmacie des Collines · Dossier fictif', status: 'under_review', city: 'Bohicon', note: 'Instruction administrative SaaS en cours, sans validation réglementaire.' },
  { name: 'Pharmacie du Marché · Dossier fictif', status: 'corrections_requested', city: 'Cotonou', note: 'Merci de préciser l’adresse descriptive. Exemple de message partagé.' },
 ]
 let id = Math.max(0,...items.map(i=>i.id))
 for (const [i,e] of examples.entries()) {
  const email = `dossier-demo-${i+1}@example.test`
  if (items.some(item=>item.email===email)) continue
  items.push({ id: ++id, name:e.name,email,phone:'+229 01 00 00 00 00',city:e.city,address:'Adresse fictive de démonstration',applicant_function:'Responsable fictif',status:e.status,review_note:e.note,submitted_at:new Date().toISOString(),reviewed_at:null })
 }
 localStorage.setItem(key,JSON.stringify(items))
}
export const applicationService = {
 async register(input: Registration) {
  if (!demoMode) {
   const data = await request<{ token: string; application_id: number }>('/auth/register', 'POST', input)
   sessionStorage.setItem('bestpharma.token', data.token)
   sessionStorage.removeItem('bestpharma.officine')
   sessionStorage.removeItem('bestpharma.platform')
   return data.application_id
  }
  const existing = readApplications()
  const id = Math.max(0, ...existing.map(x => x.id)) + 1
  // Never persist passwords (even fictional) in local storage.
  const item: Application = { id, name: input.officine_name, email: input.email, phone: input.phone, city: input.city, address: input.address, applicant_function: input.applicant_function, status: 'pending', review_note: null, submitted_at: new Date().toISOString(), reviewed_at: null }
  localStorage.setItem(key, JSON.stringify([item, ...existing]))
  return id
 },
 async list(platform = false): Promise<Application[]> {
  return demoMode ? readApplications() : (await request<{ data: Application[] }>(platform ? '/platform/applications' : '/applications')).data
 },
 async decide(id: number, decision: ApplicationStatus, note: string) {
  if (!demoMode) { await request(`/platform/applications/${id}/decision`, 'POST', { decision, note }); return }
  const items = readApplications(); const item = items.find(x => x.id === id)
  if (!item) throw new Error('Dossier introuvable.')
  const allowed: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = { pending: ['under_review'], under_review: ['corrections_requested', 'active', 'rejected'] }
  if (!allowed[item.status]?.includes(decision)) throw new Error('Transition non autorisée. Rechargez le dossier.')
  if (['corrections_requested', 'rejected'].includes(decision) && !note.trim()) throw new Error('Un motif est obligatoire.')
  item.status = decision; item.review_note = note.trim() || null; item.reviewed_at = new Date().toISOString()
  localStorage.setItem(key, JSON.stringify(items))
 },
 async resubmit(id: number, input: ApplicationInput) {
  if (!demoMode) { await request(`/applications/${id}`, 'PUT', input); return }
  const items = readApplications(); const item = items.find(x => x.id === id)
  if (!item) throw new Error('Dossier introuvable.')
  if (item.status !== 'corrections_requested') throw new Error('Ce dossier ne peut pas être modifié dans cet état.')
  Object.assign(item, { name: input.officine_name, phone: input.phone, city: input.city, address: input.address, applicant_function: input.applicant_function, status: 'pending', submitted_at: new Date().toISOString() })
  localStorage.setItem(key, JSON.stringify(items))
 },
}
