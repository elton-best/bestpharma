import { beforeEach, describe, expect, it, vi } from 'vitest'
import { qualityService, readDemo, resetDemo, type ActionInput } from '../quality'
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) })
const input: ActionInput = { title: 'Test action', chapter: 'Personnel', severity: 'low', owner: 'Tester', due_date: '2026-12-01', status: 'open', description: 'Fictional finding', resolution: '' }
beforeEach(() => storage.clear())
describe('local demonstration repository', () => {
 it('loads an independent copy of fictitious examples', () => { const records = readDemo(); records[0].title = 'Changed'; expect(readDemo()[0].title).not.toBe('Changed') })
 it('creates an action and persists it', async () => { const item = await qualityService.save(input); expect((await qualityService.list()).find(x => x.id === item.id)?.title).toBe(input.title) })
 it('edits an action without adding a duplicate', async () => { const item = await qualityService.save(input); const count = readDemo().length; await qualityService.save({ ...input, status: 'closed', resolution: 'Corrected' }, item.id); expect(readDemo()).toHaveLength(count); expect(readDemo().find(x => x.id === item.id)?.status).toBe('closed') })
 it('rejects an update to an unknown action', async () => { await expect(qualityService.save(input, 999)).rejects.toThrow('introuvable') })
 it('reports corrupt local data instead of silently overwriting it', () => { storage.set('bestpharma.demo.quality.v1', '{}'); expect(() => readDemo()).toThrow('illisibles') })
 it('reports storage failure', async () => { const set = localStorage.setItem; localStorage.setItem = () => { throw new Error('Quota exceeded') }; await expect(qualityService.save(input)).rejects.toThrow('Quota'); localStorage.setItem = set })
 it('can reset fictitious data explicitly', async () => { await qualityService.save(input); resetDemo(); expect(readDemo()).toHaveLength(4) })
})
