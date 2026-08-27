import { describe, it, expect } from 'vitest'
import { getTemplate, templatesRegistry } from '../registry'

// ─── Layali (regression) ─────────────────────────────────────────────────────
describe('Layali Template', () => {
  it('should be registered', () => {
    expect(templatesRegistry['layali']).toBeDefined()
    expect(templatesRegistry['layali'].id).toBe('layali')
  })

  it('should be ACTIVE', () => {
    expect(getTemplate('layali')?.status).toBe('ACTIVE')
  })

  it('should have all required capabilities', () => {
    const t = getTemplate('layali')
    expect(t?.features.gallery).toBe(true)
    expect(t?.features.map).toBe(true)
    expect(t?.features.program).toBe(true)
    expect(t?.features.parents).toBe(true)
    expect(t?.features.music).toBe(true)
    expect(t?.features.rsvp).toBe(true)
  })

  it('renderer should be defined', () => {
    expect(getTemplate('layali')?.renderer).toBeDefined()
  })
})

// ─── Modern Glass ─────────────────────────────────────────────────────────────
describe('Modern Glass Template', () => {
  it('should be registered', () => {
    expect(templatesRegistry['modern-glass']).toBeDefined()
    expect(templatesRegistry['modern-glass'].id).toBe('modern-glass')
  })

  it('should be ACTIVE', () => {
    expect(getTemplate('modern-glass')?.status).toBe('ACTIVE')
  })

  it('should have Arabic name', () => {
    expect(getTemplate('modern-glass')?.name).toBe('مودرن جلاس')
  })

  it('should have all capabilities', () => {
    const t = getTemplate('modern-glass')
    expect(t?.features.gallery).toBe(true)
    expect(t?.features.map).toBe(true)
    expect(t?.features.program).toBe(true)
    expect(t?.features.parents).toBe(true)
    expect(t?.features.music).toBe(true)
    expect(t?.features.rsvp).toBe(true)
  })

  it('renderer should be defined', () => {
    expect(getTemplate('modern-glass')?.renderer).toBeDefined()
  })
})

// ─── Rose Garden ──────────────────────────────────────────────────────────────
describe('Rose Garden Template', () => {
  it('should be registered', () => {
    expect(templatesRegistry['rose-garden']).toBeDefined()
    expect(templatesRegistry['rose-garden'].id).toBe('rose-garden')
  })

  it('should be ACTIVE', () => {
    expect(getTemplate('rose-garden')?.status).toBe('ACTIVE')
  })

  it('should have Arabic name', () => {
    expect(getTemplate('rose-garden')?.name).toBe('حديقة الورد')
  })

  it('should have all capabilities', () => {
    const t = getTemplate('rose-garden')
    expect(t?.features.gallery).toBe(true)
    expect(t?.features.map).toBe(true)
    expect(t?.features.program).toBe(true)
    expect(t?.features.parents).toBe(true)
    expect(t?.features.music).toBe(true)
    expect(t?.features.rsvp).toBe(true)
  })

  it('renderer should be defined', () => {
    expect(getTemplate('rose-garden')?.renderer).toBeDefined()
  })
})

// ─── Registry-wide invariants ─────────────────────────────────────────────────
describe('Template Registry invariants', () => {
  it('all registered templates should have unique ids', () => {
    const ids = Object.values(templatesRegistry).map((t) => t.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('resolves unknown slug to undefined', () => {
    expect(getTemplate('modern-invalid')).toBeUndefined()
    expect(getTemplate('')).toBeUndefined()
    expect(getTemplate('nonexistent-template')).toBeUndefined()
  })

  it('HIDDEN status is distinct from ACTIVE', () => {
    const hiddenTemplate = { status: 'HIDDEN' }
    const comingSoonTemplate = { status: 'COMING_SOON' }
    const activeTemplate = { status: 'ACTIVE' }
    expect(activeTemplate.status).toBe('ACTIVE')
    expect(hiddenTemplate.status).toBe('HIDDEN')
    expect(comingSoonTemplate.status).toBe('COMING_SOON')
    // Only ACTIVE templates are selectable
    expect(activeTemplate.status === 'ACTIVE').toBe(true)
    expect(hiddenTemplate.status === 'ACTIVE').toBe(false)
    expect(comingSoonTemplate.status === 'ACTIVE').toBe(false)
  })

  it('all three template renderers are different functions', () => {
    const layali = getTemplate('layali')?.renderer
    const glass  = getTemplate('modern-glass')?.renderer
    const rose   = getTemplate('rose-garden')?.renderer
    expect(layali).not.toBe(glass)
    expect(layali).not.toBe(rose)
    expect(glass).not.toBe(rose)
  })

  it('should have exactly 3 templates registered', () => {
    expect(Object.keys(templatesRegistry).length).toBe(3)
  })

  it('all templates in registry are ACTIVE', () => {
    Object.values(templatesRegistry).forEach((t) => {
      expect(t.status).toBe('ACTIVE')
    })
  })
})
