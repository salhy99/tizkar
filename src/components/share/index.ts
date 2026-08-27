import { ShareVisualAdapter } from './types';
import { LayaliAdapter } from './adapters/layali';
import { ModernGlassAdapter } from './adapters/modern-glass';
import { RoseGardenAdapter } from './adapters/rose-garden';

export function getShareVisualAdapter(templateSlug: string): ShareVisualAdapter {
  switch (templateSlug) {
    case 'modern-glass':
      return ModernGlassAdapter;
    case 'rose-garden':
      return RoseGardenAdapter;
    case 'layali':
    default:
      return LayaliAdapter;
  }
}

export * from './types';
export * from './fontLoader';
