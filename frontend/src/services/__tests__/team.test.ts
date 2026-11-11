import { beforeEach, describe, expect, it, vi } from 'vitest'
import { teamService, resetTeam, inviteStatus } from '../team'
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string,v: string) => storage.set(k,v), removeItem: (k: string) => storage.delete(k) })
beforeEach(() => storage.clear())
describe('team demonstration', () => {
 it('keeps at least one active administrator', async () => {
  await expect(teamService.updateMember(1,{is_admin:false,is_active:true,role_ids:[]})).rejects.toThrow('dernier administrateur')
  await expect(teamService.updateMember(1,{is_admin:true,is_active:false,role_ids:[]})).rejects.toThrow('dernier administrateur')
 })
 it('allows several administrators and protects the final one', async () => {
  await teamService.updateMember(2,{is_admin:true,is_active:true,role_ids:[1,2]})
  await teamService.updateMember(1,{is_admin:false,is_active:false,role_ids:[]})
  await expect(teamService.updateMember(2,{is_admin:false,is_active:true,role_ids:[1]})).rejects.toThrow('dernier administrateur')
 })
 it('supports custom roles and changing their permissions', async () => {
  await teamService.saveRole({name:'Custom role',permissions:['qualite.read']})
  const role = (await teamService.list()).roles.find(r => r.name === 'Custom role')!
  await teamService.saveRole({name:'Custom role',permissions:['qualite.read','qualite.write']}, role.id)
  expect((await teamService.list()).roles.find(r => r.id === role.id)?.permissions).toHaveLength(2)
 })
 it('rejects duplicate names, unknown roles and permissions', async () => {
  await expect(teamService.saveRole({name:'Consultation qualité',permissions:[]})).rejects.toThrow('existe déjà')
  await expect(teamService.saveRole({name:'Unsafe',permissions:['clinical.read']})).rejects.toThrow('non autorisée')
  await expect(teamService.updateMember(2,{is_admin:false,is_active:true,role_ids:[999]})).rejects.toThrow('invalide')
 })
 it('accepts a one-time invitation with multiple roles, without persisting passwords', async () => {
  const token = await teamService.invite('invite@example.test',{is_admin:false,role_ids:[1,2]})
  expect(token).toHaveLength(64)
  await teamService.accept({token,email:'invite@example.test',name:'Invité fictif',password:'NeverPersist123'})
  const team = await teamService.list()
  expect(team.members.find(m => m.email === 'invite@example.test')?.role_ids).toEqual([1,2])
  expect(inviteStatus(team.invitations[0])).toBe('Acceptée')
  expect([...storage.values()].join('')).not.toContain('NeverPersist123')
  await expect(teamService.accept({token,email:'invite@example.test',name:'Repeat'})).rejects.toThrow('indisponible')
 })
 it('does not expose tokens in the team listing', async () => {
  const token = await teamService.invite('invite@example.test',{is_admin:false,role_ids:[]})
  expect(JSON.stringify(await teamService.list())).not.toContain(token)
 })
 it('rejects wrong-email and revoked invitations', async () => {
  const token = await teamService.invite('invite@example.test',{is_admin:false,role_ids:[1]})
  await expect(teamService.accept({token,email:'other@example.test',name:'Other'})).rejects.toThrow('adresse')
  const id = (await teamService.list()).invitations[0].id
  await teamService.revoke(id)
  await expect(teamService.accept({token,email:'invite@example.test',name:'Invité'})).rejects.toThrow('indisponible')
 })
 it('rejects duplicate members and pending invitations', async () => {
  await expect(teamService.invite('admin@example.test',{is_admin:false,role_ids:[]})).rejects.toThrow('déjà membre')
  await teamService.invite('invite@example.test',{is_admin:false,role_ids:[]})
  await expect(teamService.invite('invite@example.test',{is_admin:false,role_ids:[]})).rejects.toThrow('déjà en attente')
 })
 it('does not count invitations as active administrators', async () => {
  await teamService.invite('admin2@example.test',{is_admin:true,role_ids:[]})
  await expect(teamService.updateMember(1,{is_admin:false,is_active:true,role_ids:[]})).rejects.toThrow('dernier administrateur')
 })
 it('expires invitations after seven days', async () => {
  const token = await teamService.invite('invite@example.test',{is_admin:false,role_ids:[]})
  vi.useFakeTimers(); vi.setSystemTime(new Date(Date.now()+8*86400000))
  try { await expect(teamService.accept({token,email:'invite@example.test',name:'Invité'})).rejects.toThrow('indisponible') } finally { vi.useRealTimers() }
 })
 it('can reset only the fictitious team data', async () => {
  await teamService.saveRole({name:'Extra',permissions:[]}); resetTeam(); expect((await teamService.list()).roles).toHaveLength(2)
 })
})
