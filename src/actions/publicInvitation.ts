'use server'

import { createClient } from '@/lib/supabase/server'
import { InvitationData } from '@/components/templates/layali'

export type PublicInvitationDTO = {
  id: string;
  title: string;
  data: InvitationData;
  templateVersion: string;
  theme?: any;
}

function isValidStoragePath(path: string, userId: string, invId: string) {
  if (!path || typeof path !== 'string') return false;
  if (path.includes('..') || path.startsWith('/') || path.includes('?') || path.includes('#') || path.includes('\\')) return false;
  
  const segments = path.split('/');
  if (segments.length !== 3) return false;
  if (segments[0] !== userId) return false;
  if (segments[1] !== invId) return false;
  
  const filename = segments[2];
  const parts = filename.split('.');
  if (parts.length !== 2) return false;
  
  const [uuid, ext] = parts;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) return false;
  
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'mp3'];
  if (!allowedExts.includes(ext.toLowerCase())) return false;
  
  return true;
}

export async function getPublicInvitation(slug: string): Promise<{ data?: PublicInvitationDTO, error?: string }> {
  const supabase = await createClient()

  // Find published invitation by slug
  const { data: inv, error: invError } = await supabase
    .from('invitations')
    .select(`
      id,
      user_id,
      title,
      status,
      expires_at,
      invitation_versions!inner (
        is_published,
        invitation_data,
        template_version_id
      )
    `)
    .eq('slug', slug)
    .eq('status', 'PUBLISHED')
    .single() as any;

  if (invError || !inv) {
    return { error: 'NOT_FOUND' }
  }

  // Check expiration
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    return { error: 'EXPIRED' }
  }

  // Find the published version
  const publishedVersion = inv.invitation_versions?.find((v: any) => v.is_published)
  
  if (!publishedVersion) {
    return { error: 'NOT_PUBLISHED_VERSION' }
  }

  // Admin client for views and signed urls
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const adminAuthClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // Log view anonymously (non-blocking)
  adminAuthClient.from('invitation_views').insert({ invitation_id: inv.id } as any).then(() => {})

  const invData = publishedVersion.invitation_data as InvitationData;
  const pathsToSign: string[] = [];
  
  // Validate Gallery
  const validGalleryPaths: string[] = [];
  if (Array.isArray(invData.gallery)) {
    for (const p of invData.gallery) {
      if (isValidStoragePath(p, inv.user_id, inv.id)) {
        validGalleryPaths.push(p);
        pathsToSign.push(p);
      }
    }
  }

  // Validate Music
  let validMusicPath: string | null = null;
  if (invData.music?.type === 'MP3' && invData.music.url) {
    if (isValidStoragePath(invData.music.url, inv.user_id, inv.id)) {
      validMusicPath = invData.music.url;
      pathsToSign.push(invData.music.url);
    }
  }

  // Generate Signed URLs safely
  const signedUrlMap = new Map<string, string>();
  if (pathsToSign.length > 0) {
    try {
      const { data: signedUrls, error: signError } = await adminAuthClient
        .storage
        .from('invitations_assets')
        .createSignedUrls(pathsToSign, 3600); // 1 hour expiry

      if (!signError && signedUrls) {
        signedUrls.forEach(su => {
          if (su.path && su.signedUrl) {
            signedUrlMap.set(su.path, su.signedUrl);
          }
        });
      }
    } catch (err) {
      console.error('Failed to generate signed URLs', err);
      // Failsafe: Continue without signed URLs. Text and UI will still render.
    }
  }

  const safeData: InvitationData = {
    ...invData,
    gallery: validGalleryPaths.map(p => signedUrlMap.get(p)).filter(Boolean) as string[],
    music: validMusicPath ? { ...invData.music, url: signedUrlMap.get(validMusicPath) } : invData.music
  };

  return {
    data: {
      id: inv.id,
      title: inv.title,
      data: safeData,
      templateVersion: publishedVersion.template_version_id
    }
  }
}

export async function submitRSVP(invitationId: string, payload: {
  name: string,
  companions: number,
  status: 'CONFIRMED' | 'MAYBE' | 'DECLINED',
  message?: string
}) {
  // Validation
  if (!payload.name || payload.name.length > 100) return { error: 'Invalid name' }
  if (payload.companions < 0 || payload.companions > 10) return { error: 'Invalid companions' }
  if (!['CONFIRMED', 'MAYBE', 'DECLINED'].includes(payload.status)) return { error: 'Invalid status' }
  if (payload.message && payload.message.length > 500) return { error: 'Message too long' }

  // Simple string sanitization
  const safeMessage = payload.message?.replace(/</g, "&lt;").replace(/>/g, "&gt;")

  const supabase = await createClient()

  // 1. Verify invitation is published and not expired
  const { data: inv, error: invError } = await supabase
    .from('invitations')
    .select('status, expires_at')
    .eq('id', invitationId)
    .single() as any;

  if (invError || !inv) {
    return { error: 'الدعوة غير موجودة' }
  }

  if (inv.status !== 'PUBLISHED') {
    return { error: 'لا يمكن تأكيد الحضور لدعوة غير منشورة' }
  }

  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    return { error: 'انتهت صلاحية الدعوة' }
  }

  // 2. Ideally read max_companions from DB here (e.g., from invitation_data or settings)
  // For V1, we enforce a strict hard limit on the server of 10.
  if (payload.companions > 10) {
    return { error: 'عدد المرافقين يتجاوز الحد المسموح' }
  }

  // Use admin client securely to insert RSVP
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const adminAuthClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // STRICTLY SERVER SIDE
  )

  // Rate limiting / Spam protection: Check if same name submitted within last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  
  const { data: recentSubmissions } = await adminAuthClient
    .from('rsvp_responses')
    .select('id')
    .eq('invitation_id', invitationId)
    .eq('guest_name', payload.name)
    .gte('created_at', fiveMinutesAgo) as any;

  if (recentSubmissions && recentSubmissions.length > 0) {
    return { error: 'لقد قمت بإرسال رد مسبقاً مؤخراً. يرجى المحاولة لاحقاً.' }
  }

  const { error } = await adminAuthClient
    .from('rsvp_responses')
    .insert({
      invitation_id: invitationId,
      guest_name: payload.name,
      companions: payload.companions,
      status: payload.status,
      message: safeMessage
    } as any)

  if (error) {
    console.error('RSVP Error', error)
    return { error: 'Failed to submit RSVP' }
  }

  return { success: true }
}
