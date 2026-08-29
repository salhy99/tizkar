import { TemplateDefinition } from './types'
import { LayaliRenderer } from './layali'
import { ModernGlassRenderer } from './modern-glass'
import { RoseGardenRenderer } from './rose-garden'
import { NoorRenderer } from './noor'
import { AtheerRenderer } from './atheer'

export const templatesRegistry: Record<string, TemplateDefinition> = {
  'layali': {
    id: 'layali',
    name: 'ليالي',
    description: 'تصميم كلاسيكي فاخر يجمع بين الأناقة والهدوء، مع لمسات ذهبية وتفاصيل راقية تناسب حفلات الزفاف الفاخرة.',
    thumbnail: '/templates/layali-thumb.webp',
    status: 'ACTIVE',
    requiredEntitlement: null, // Standard
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
    requiredEntitlement: null, // Standard
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
    requiredEntitlement: null, // Standard
    features: {
      gallery: true,
      map: true,
      program: true,
      parents: true,
      music: true,
      rsvp: true
    },
    renderer: RoseGardenRenderer
  },

  'noor': {
    id: 'noor',
    name: 'نور',
    description: 'تصميم تحريري فاخر بخلفية سوداء عميقة ولمسات ذهبية، يُقدّم الدعوة كتجربة سينمائية ملكية لا تُنسى.',
    thumbnail: '/templates/noor-thumb.webp',
    status: 'ACTIVE',
    requiredEntitlement: 'premiumTemplates', // PREMIUM only
    features: {
      gallery: true,
      map: true,
      program: true,
      parents: true,
      music: true,
      rsvp: true
    },
    renderer: NoorRenderer
  },

  'atheer': {
    id: 'atheer',
    name: 'أثير',
    description: 'تصميم معماري عصري بتخطيط غير متماثل، ألوان فاتحة دافئة، وأسطح زجاجية شفافة تُبرز المحتوى بأناقة هندسية راقية.',
    thumbnail: '/templates/atheer-thumb.webp',
    status: 'ACTIVE',
    requiredEntitlement: 'premiumTemplates', // PREMIUM only
    features: {
      gallery: true,
      map: true,
      program: true,
      parents: true,
      music: true,
      rsvp: true
    },
    renderer: AtheerRenderer
  },
}

export function getTemplate(slug: string): TemplateDefinition | undefined {
  return templatesRegistry[slug]
}

export function isPremiumTemplate(slug: string): boolean {
  return templatesRegistry[slug]?.requiredEntitlement === 'premiumTemplates'
}
