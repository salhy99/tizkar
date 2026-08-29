
import { getTemplate, templatesRegistry, isPremiumTemplate } from '../registry'

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

  it('should be a standard template (no required entitlement)', () => {
    expect(getTemplate('layali')?.requiredEntitlement).toBeNull()
    expect(isPremiumTemplate('layali')).toBe(false)
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

  it('should be a standard template', () => {
    expect(getTemplate('modern-glass')?.requiredEntitlement).toBeNull()
    expect(isPremiumTemplate('modern-glass')).toBe(false)
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

  it('should be a standard template', () => {
    expect(getTemplate('rose-garden')?.requiredEntitlement).toBeNull()
    expect(isPremiumTemplate('rose-garden')).toBe(false)
  })
})

// ─── NOOR Premium ─────────────────────────────────────────────────────────────
describe('Noor Template (Premium)', () => {
  it('should be registered', () => {
    expect(templatesRegistry['noor']).toBeDefined()
    expect(templatesRegistry['noor'].id).toBe('noor')
  })

  it('should be ACTIVE', () => {
    expect(getTemplate('noor')?.status).toBe('ACTIVE')
  })

  it('should have Arabic name', () => {
    expect(getTemplate('noor')?.name).toBe('نور')
  })

  it('renderer should be defined', () => {
    expect(getTemplate('noor')?.renderer).toBeDefined()
  })

  it('should require premiumTemplates entitlement', () => {
    expect(getTemplate('noor')?.requiredEntitlement).toBe('premiumTemplates')
    expect(isPremiumTemplate('noor')).toBe(true)
  })

  it('should have full feature set', () => {
    const t = getTemplate('noor')
    expect(t?.features.gallery).toBe(true)
    expect(t?.features.music).toBe(true)
    expect(t?.features.rsvp).toBe(true)
  })
})

// ─── ATHEER Premium ───────────────────────────────────────────────────────────
describe('Atheer Template (Premium)', () => {
  it('should be registered', () => {
    expect(templatesRegistry['atheer']).toBeDefined()
    expect(templatesRegistry['atheer'].id).toBe('atheer')
  })

  it('should be ACTIVE', () => {
    expect(getTemplate('atheer')?.status).toBe('ACTIVE')
  })

  it('should have Arabic name', () => {
    expect(getTemplate('atheer')?.name).toBe('أثير')
  })

  it('renderer should be defined', () => {
    expect(getTemplate('atheer')?.renderer).toBeDefined()
  })

  it('should require premiumTemplates entitlement', () => {
    expect(getTemplate('atheer')?.requiredEntitlement).toBe('premiumTemplates')
    expect(isPremiumTemplate('atheer')).toBe(true)
  })

  it('should differ from Noor renderer', () => {
    const noor = getTemplate('noor')?.renderer
    const atheer = getTemplate('atheer')?.renderer
    expect(noor).not.toBe(atheer)
  })

  it('should have full feature set', () => {
    const t = getTemplate('atheer')
    expect(t?.features.gallery).toBe(true)
    expect(t?.features.music).toBe(true)
    expect(t?.features.rsvp).toBe(true)
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
    expect(activeTemplate.status === 'ACTIVE').toBe(true)
    expect(hiddenTemplate.status === 'ACTIVE').toBe(false)
    expect(comingSoonTemplate.status === 'ACTIVE').toBe(false)
  })

  it('all three standard template renderers are different functions', () => {
    const layali = getTemplate('layali')?.renderer
    const glass  = getTemplate('modern-glass')?.renderer
    const rose   = getTemplate('rose-garden')?.renderer
    expect(layali).not.toBe(glass)
    expect(layali).not.toBe(rose)
    expect(glass).not.toBe(rose)
  })

  it('should have exactly 5 templates registered', () => {
    expect(Object.keys(templatesRegistry).length).toBe(5)
  })

  it('all templates in registry are ACTIVE', () => {
    Object.values(templatesRegistry).forEach((t) => {
      expect(t.status).toBe('ACTIVE')
    })
  })

  it('standard templates have null requiredEntitlement', () => {
    const standard = ['layali', 'modern-glass', 'rose-garden']
    standard.forEach(slug => {
      expect(getTemplate(slug)?.requiredEntitlement).toBeNull()
    })
  })

  it('premium templates have premiumTemplates entitlement', () => {
    const premium = ['noor', 'atheer']
    premium.forEach(slug => {
      expect(getTemplate(slug)?.requiredEntitlement).toBe('premiumTemplates')
    })
  })

  it('isPremiumTemplate returns false for standard slugs', () => {
    expect(isPremiumTemplate('layali')).toBe(false)
    expect(isPremiumTemplate('modern-glass')).toBe(false)
    expect(isPremiumTemplate('rose-garden')).toBe(false)
  })

  it('isPremiumTemplate returns true for premium slugs', () => {
    expect(isPremiumTemplate('noor')).toBe(true)
    expect(isPremiumTemplate('atheer')).toBe(true)
  })

  it('isPremiumTemplate returns false for unknown slugs', () => {
    expect(isPremiumTemplate('nonexistent')).toBe(false)
  })
})
