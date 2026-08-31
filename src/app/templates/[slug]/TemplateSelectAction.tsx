'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { trackFunnelEvent } from '@/lib/funnel/client';

export function TemplateSelectAction({ templateId, slug }: { templateId: string, slug: string }) {
  const router = useRouter();

  const handleSelect = () => {
    trackFunnelEvent('FUNNEL_TEMPLATE_SELECTED', { templateSlug: slug }, `template_selected_${slug}`);
    router.push(`/dashboard/create?template=${templateId}`);
  };

  return (
    <Button size="lg" onClick={handleSelect} className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-xl shadow-primary/20">
      استخدم هذا القالب
    </Button>
  );
}
