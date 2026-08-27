import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';
import { getShareVisualAdapter, loadLocalFont } from '@/components/share';

export const alt = 'دعوة زفاف';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const p = await params;
    const supabase = await createClient();
    
    // Fetch invitation strictly by slug
    const { data: invRaw, error } = await supabase
      .from('invitations')
      .select('*, templates(slug), invitation_versions!inner(*)')
      .eq('slug', p.slug)
      .eq('status', 'PUBLISHED')
      .eq('invitation_versions.is_published', true)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inv = invRaw as any;

    if (error || !inv || !inv.invitation_versions[0]) {
      return new Response('Not Found', { status: 404 });
    }

    // Check expiration
    if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
      return new Response('Expired', { status: 404 });
    }

    const invData = inv.invitation_versions[0].invitation_data || {};
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const shareData = {
      title: inv.title,
      groomName: invData.groomName,
      brideName: invData.brideName,
      dateText: invData.dateText || invData.date,
      timeText: invData.timeText || invData.time,
      venueName: invData.venue?.name,
      publicUrl: `${baseUrl}/${inv.slug}`,
      templateSlug: inv.templates?.slug || 'layali',
    };

    const adapter = getShareVisualAdapter(shareData.templateSlug);
    const content = adapter.renderOg(shareData);

    // Load font
    const fontData = await loadLocalFont('700');

    return new ImageResponse(content, {
      ...size,
      fonts: fontData ? [
        {
          name: 'Cairo',
          data: fontData,
          style: 'normal',
        }
      ] : undefined,
    });
  } catch (e) {
    console.error('OG Image Generation Error:', e);
    return new Response('Error', { status: 500 });
  }
}
