import { demoMode, request } from './quality'
export const permissionLabels: Record<string, string> = { 'qualite.read': 'Consulter les actions qualité', 'qualite.write': 'Créer et modifier les actions qualité', 'dispensation.dispense': 'Valider une délivrance (pharmacien habilité)', 'gardes.read': 'Consulter les déclarations de garde', 'gardes.write': 'Gérer les déclarations de garde', 'caisse.read': 'Consulter les journaux de caisse', 'caisse.sell': 'Enregistrer une vente comptoir', 'caisse.session.manage': 'Ouvrir et clôturer une session de caisse', 'caisse.mouvements.write': 'Saisir les mouvements hors vente' }
export interface TeamRole { id: number; name: string; permissions: string[];description?:string;is_active?:boolean;version?:number;member_count?:number }
export interface Member { id: number; name: string; email: string; is_admin: boolean; is_active: boolean; role_ids: number[] }
export interface Invite { id: number; email: string; roles: { is_admin: boolean; role_ids: number[] }; expires_at: string; accepted_at: string | null; revoked_at: string | null }
export interface Team { members: Member[]; roles: TeamRole[]; invitations: Invite[] }
export interface Grants { is_admin: boolean; role_ids: number[] }
interface DemoTeam extends Team { tokens: Record<string, number> }
const key = 'bestpharma.demo.team.v1'
const initial: DemoTeam = { members: [
 { id: 1, name: 'Administrateur démo', email: 'admin@example.test', is_admin: true, is_active: true, role_ids: [] },
 { id: 2, name: 'Membre démo', email: 'membre@example.test', is_admin: false, is_active: true, role_ids: [1] },
], roles: [{ id: 1, name: 'Consultation qualité', permissions: ['qualite.read'] }, { id: 2, name: 'Suivi qualité', permissions: ['qualite.read','qualite.write'] }], invitations: [], tokens: {} }
export function resetTeam() { localStorage.removeItem(key) }
function read(): DemoTeam { const raw = localStorage.getItem(key); if (!raw) return structuredClone(initial); const data = JSON.parse(raw); if (!Array.isArray(data.members) || !Array.isArray(data.roles) || !Array.isArray(data.invitations) || !data.tokens) throw new Error('Données équipe illisibles. Réinitialisez la démonstration équipe.'); return data }
function persist(t: DemoTeam) { localStorage.setItem(key, JSON.stringify(t)) }
function validateRoles(t: Team, ids: number[]) { if (new Set(ids).size !== ids.length || ids.some(id => !t.roles.some(r => r.id === id))) throw new Error('Un rôle est invalide pour cette officine.') }
function nextId(items: {id: number}[]) { return Math.max(0, ...items.map(x => x.id)) + 1 }
export function inviteStatus(i: Invite) { return i.revoked_at ? 'Révoquée' : i.accepted_at ? 'Acceptée' : new Date(i.expires_at).getTime() <= Date.now() ? 'Expirée' : 'En attente' }
export const teamService = {
 async list(): Promise<Team> { if (!demoMode) return request<Team>('/team'); const { tokens: _tokens, ...team } = read(); return team },
 async saveRole(input: Omit<TeamRole, 'id'>, id?: number) {
  if (!demoMode) { await request(`/team/roles${id ? `/${id}` : ''}`, id ? 'PUT' : 'POST', input); return }
  const t = read(); if (!input.name.trim()) throw new Error('Nommez ce rôle.')
  if (input.permissions.some(p => !(p in permissionLabels))) throw new Error('Permission non autorisée.')
  if (t.roles.some(r => r.id !== id && r.name === input.name.trim())) throw new Error('Ce nom de rôle existe déjà.')
  if (id && !t.roles.some(r => r.id === id)) throw new Error('Rôle introuvable.')
  const role = { ...input, name: input.name.trim(), id: id ?? nextId(t.roles) }; t.roles = id ? t.roles.map(r => r.id === id ? role : r) : [...t.roles, role]; persist(t)
 },
 async updateMember(id: number, input: Grants & { is_active: boolean;reason?:string }) {
  if (!demoMode) { await request(`/team/members/${id}`, 'PUT', input); return }
  const t = read(); validateRoles(t, input.role_ids); const m = t.members.find(x => x.id === id); if (!m) throw new Error('Membre introuvable.')
  if (m.is_admin && m.is_active && (!input.is_admin || !input.is_active) && t.members.filter(x => x.is_admin && x.is_active).length <= 1) throw new Error('Le dernier administrateur actif doit être conservé.')
  Object.assign(m, input); persist(t)
 },
 async invite(email: string, grants: Grants): Promise<string> {
  if (!demoMode) return (await request<{invite_token: string}>('/team/invitations', 'POST', { email, ...grants })).invite_token
  const t = read(); validateRoles(t, grants.role_ids); email = email.trim().toLowerCase()
  if (t.members.some(m => m.email === email)) throw new Error('Cette personne est déjà membre de l’officine.')
  if (t.invitations.some(i => i.email === email && inviteStatus(i) === 'En attente')) throw new Error('Une invitation est déjà en attente pour cette adresse.')
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,'0')).join(''); const id = nextId(t.invitations)
  t.invitations.unshift({ id, email, roles: structuredClone(grants), expires_at: new Date(Date.now()+7*86400000).toISOString(), accepted_at: null, revoked_at: null }); t.tokens[token] = id; persist(t); return token
 },
 async duplicateRole(id:number,name:string){if(!demoMode)return request(`/team/roles/${id}/duplicate`,'POST',{name});const t=read();const r=t.roles.find(r=>r.id===id);if(!r)throw new Error('Rôle introuvable.');await this.saveRole({name,permissions:[...r.permissions]})},
 async roleState(r:TeamRole,is_active:boolean){if(!demoMode)return request(`/team/roles/${r.id}/state`,'POST',{is_active,version:r.version});throw new Error('État des rôles disponible en mode API.');},
 async resend(id:number):Promise<string>{if(!demoMode)return (await request<{invite_token:string}>(`/team/invitations/${id}/resend`,'POST')).invite_token;throw new Error('Renvoi disponible en mode API.');},
 async revoke(id: number) {
  if (!demoMode) { await request(`/team/invitations/${id}`, 'DELETE'); return }
  const t = read(); const i = t.invitations.find(x => x.id === id); if (!i) throw new Error('Invitation introuvable.'); if (i.accepted_at || i.revoked_at) throw new Error('Cette invitation n’est plus en attente.'); i.revoked_at = new Date().toISOString(); persist(t)
 },
 async accept(input: { token: string; email: string; name: string; password?: string; password_confirmation?: string }) {
  if (!demoMode) { const data = await request<{ token: string; officine_id: number }>('/invitations/accept', 'POST', input); sessionStorage.setItem('bestpharma.token', data.token); sessionStorage.setItem('bestpharma.officine', String(data.officine_id)); return }
  const t = read(); const invite = t.invitations.find(i => i.id === t.tokens[input.token]); if (!invite || inviteStatus(invite) !== 'En attente') throw new Error('Invitation invalide ou indisponible.')
  if (invite.email !== input.email.trim().toLowerCase()) throw new Error('Cette adresse ne correspond pas à l’invitation.')
  validateRoles(t, invite.roles.role_ids)
  if (t.members.some(m => m.email === invite.email)) throw new Error('Ce compte est déjà membre.')
  if (!input.name.trim()) throw new Error('Renseignez votre nom fictif.')
  t.members.push({ id: nextId(t.members), name: input.name, email: invite.email, is_admin: invite.roles.is_admin, is_active: true, role_ids: invite.roles.role_ids }); invite.accepted_at = new Date().toISOString(); delete t.tokens[input.token]; persist(t)
 },
}
