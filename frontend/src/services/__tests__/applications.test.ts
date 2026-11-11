import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applicationService, readApplications, type Registration } from '../applications'
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) })
const input: Registration = { name: 'Demandeur fictif', email: 'test@example.test', password: 'Fictional12345', password_confirmation: 'Fictional12345', officine_name: 'Pharmacie démo', phone: '+229 0100000000', city: 'Ville fictive', address: 'Adresse fictive', applicant_function: 'Pharmacien titulaire', consent: true }
beforeEach(() => storage.clear())
describe('application lifecycle in demonstration mode', () => {
 it('submits a pending dossier without persisting credentials', async () => {
  const id = await applicationService.register(input)
  expect(readApplications()[0]).toMatchObject({ id, status: 'pending' })
  expect([...storage.values()].join('')).not.toContain(input.password)
  expect(readApplications()[0]).not.toHaveProperty('password')
 })
 it('does not allow immediate activation before review', async () => {
  const id = await applicationService.register(input)
  await expect(applicationService.decide(id, 'active', '')).rejects.toThrow('Transition')
 })
 it('allows review then activation and prevents a second decision', async () => {
  const id = await applicationService.register(input)
  await applicationService.decide(id, 'under_review', '')
  await applicationService.decide(id, 'active', 'Dossier examiné')
  expect(readApplications()[0].status).toBe('active')
  await expect(applicationService.decide(id, 'rejected', 'Autre')).rejects.toThrow('Transition')
 })
 it('requires a reason for corrections or refusal', async () => {
  const id = await applicationService.register(input)
  await applicationService.decide(id, 'under_review', '')
  await expect(applicationService.decide(id, 'rejected', ' ')).rejects.toThrow('motif')
  await expect(applicationService.decide(id, 'corrections_requested', '')).rejects.toThrow('motif')
 })
 it('can request corrections, resubmit and review again', async () => {
  const id = await applicationService.register(input)
  await applicationService.decide(id, 'under_review', '')
  await applicationService.decide(id, 'corrections_requested', 'Précisez l’adresse')
  await applicationService.resubmit(id, { ...input, address: 'Nouvelle adresse' })
  expect(readApplications()[0]).toMatchObject({ status: 'pending', address: 'Nouvelle adresse', review_note: 'Précisez l’adresse' })
  await applicationService.decide(id, 'under_review', '')
  expect(readApplications()[0].status).toBe('under_review')
 })
 it('rejects resubmission outside the corrections state', async () => {
  const id = await applicationService.register(input)
  await expect(applicationService.resubmit(id, input)).rejects.toThrow('cet état')
 })
 it('rejects decisions about nonexistent dossiers', async () => {
  await expect(applicationService.decide(999, 'under_review', '')).rejects.toThrow('introuvable')
 })
})
