// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import router from '@/router'
import { navigation } from '@/config/navigation'

describe('ported operational routes', () => {
  it('exposes POS from the main navigation instead of the planned placeholder', () => {
    const cash = navigation.find(group => group.id === 'caisse')?.children.find(link => link.label === 'Caisse POS')
    expect(cash?.to).toBe('/ventes-caisse')
    expect(cash?.planned).toBeUndefined()
    expect(router.getRoutes().some(route => route.path === cash?.to)).toBe(true)
  })

  it('links dispensation and authorized devices to their implemented workspaces', () => {
    expect(navigation.find(group => group.id === 'caisse')?.children.find(link => link.to === '/dispensation')?.planned).toBeUndefined()
    expect(navigation.find(group => group.id === 'finance')?.children.find(link => link.to === '/dashboard/appareils')?.planned).toBeUndefined()
    expect(router.getRoutes().some(route => route.path === '/dispensation')).toBe(true)
    expect(router.getRoutes().some(route => route.path === '/dashboard/appareils')).toBe(true)
  })

  it('keeps temperature and documents on their dedicated views', () => {
    expect(router.getRoutes().some(route => route.path === '/dashboard/chaine-froid')).toBe(true)
    expect(router.getRoutes().some(route => route.path === '/documents')).toBe(true)
  })
})
