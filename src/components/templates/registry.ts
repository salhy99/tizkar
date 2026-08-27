import { TemplateDefinition } from './types'
import { LayaliRenderer } from './layali'
import { ModernGlassRenderer } from './modern-glass'
import { RoseGardenRenderer } from './rose-garden'

export const templatesRegistry: Record<string, TemplateDefinition> = {
  'layali': {
    id: 'layali',
    name: 'ليالي',
    description: 'تصميم كلاسيكي فاخر يجمع بين الأناقة والهدوء، مع لمسات ذهبية وتفاصيل راقية تناسب حفلات الزفاف الفاخرة.',
    thumbnail: '/templates/layali-thumb.webp',
    status: 'ACTIVE',
    features: {
      gallery: true,
      map: true,
      program: true,
      parents: true,
      music: true,
      rsvp: true
    },
    renderer: LayaliRenderer
  },

  'modern-glass': {
    id: 'modern-glass',
    name: 'مودرن جلاس',
    description: 'تصميم عصري راقٍ يعتمد لمسات الزجاج الشفاف، والطباعة الكبيرة، والتكوين المعماري النظيف لمناسبات الزفاف الاستثنائية.',
    thumbnail: '/templates/modern-glass-thumb.webp',
    status: 'ACTIVE',
    features: {
      gallery: true,
      map: true,
      program: true,
      parents: true,
      music: true,
      rsvp: true
    },
    renderer: ModernGlassRenderer
  },

  'rose-garden': {
    id: 'rose-garden',
    name: 'حديقة الورد',
    description: 'تصميم رومانسي راقٍ مستوحى من قرطاسية الأفراح الفاخرة، مع لمسات نباتية دافئة وأطر مزخرفة تعكس أناقة الطباعة الكلاسيكية.',
    thumbnail: '/templates/rose-garden-thumb.webp',
    status: 'ACTIVE',
    features: {
      gallery: true,
      map: true,
      program: true,
      parents: true,
      music: true,
      rsvp: true
    },
    renderer: RoseGardenRenderer
  }
}

export function getTemplate(slug: string): TemplateDefinition | undefined {
  return templatesRegistry[slug]
}
