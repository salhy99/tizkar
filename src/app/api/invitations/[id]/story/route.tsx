import { ImageResponse } from 'next/og';
import { requireInvitationEditAccess } from '@/lib/auth/invitation-auth';
import { getShareVisualAdapter, loadLocalFont } from '@/components/share';
import { requireInvitationFeature } from '@/lib/entitlements/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const p = await params;
    // 1. Authorize owner
    const authorizedInv = await requireInvitationEditAccess(p.id);
    if (!authorizedInv) {
      return new Response('Unauthorized', { status: 401 });
    }

    const hasStoryExport = await requireInvitationFeature(p.id, 'storyExport');
    if (!hasStoryExport) {
      return new Response('Story Export is not included in your current package.', { status: 403 });
    }

    // 3. Fetch full data (admin client to bypass RLS for token users)
    const { createClient } = await import('@supabase/supabase-js');
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: inv } = await adminClient
      .from('invitations')
      .select('*, templates(slug), invitation_versions(*)')
      .eq('id', p.id)
      .single();

    if (!inv) {
      return new Response('Not Found', { status: 404 });
    }

    if (inv.status !== 'PUBLISHED') {
      return new Response('Invitation must be published to generate a Story image.', { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeVersion = inv.invitation_versions?.find((v: any) => v.is_published) || inv.invitation_versions?.[0];
    const invData = activeVersion?.invitation_data || {};
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
    const content = adapter.renderStory(shareData);

    const fontData = await loadLocalFont('700');

    return new ImageResponse(content, {
      width: 1080,
      height: 1920,
      fonts: fontData ? [
        {
          name: 'Cairo',
          data: fontData,
          style: 'normal',
        }
      ] : undefined,
    });
  } catch (e) {
    console.error('Story Image Generation Error:', e);
    return new Response('Error', { status: 500 });
  }
}
