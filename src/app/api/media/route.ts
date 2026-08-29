import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireInvitationEditAccess } from '@/lib/auth/invitation-auth'
import { createClient as createServerClient } from '@/lib/supabase/server'

import { isStructurallyValid, authorizeMediaRequest, MediaInvitationData } from '../../../lib/auth/media-auth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')
  
  if (!path || !isStructurallyValid(path)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const segments = path.split('/')
  const invitationId = segments[1]

  const isEditor = await requireInvitationEditAccess(invitationId)

  let inv: { user_id: string | null; status: string | null; expires_at: string | null; invitation_versions: { is_published: boolean | null; invitation_data: MediaInvitationData }[] } | null = null
  if (!isEditor) {
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('invitations')
      .select(`
        id,
        user_id,
        status,
        expires_at,
        invitation_versions!inner (
          is_published,
          invitation_data
        )
      `)
      .eq('id', invitationId)
      .single()
    inv = data as unknown as { user_id: string | null; status: string | null; expires_at: string | null; invitation_versions: { is_published: boolean | null; invitation_data: MediaInvitationData }[] } | null
  }

  const isAuthorized = authorizeMediaRequest(path, invitationId, !!isEditor, inv)
  if (!isAuthorized) {
    return new NextResponse('Not found', { status: 404 })
  }

  return generateSignedUrl(path, isEditor?.user_id || inv?.user_id || null)
}

async function generateSignedUrl(path: string, userId: string | null) {
  const prefix = path.split('/')[0]
  const allowedPrefix = userId || 'anon'
  
  if (prefix !== allowedPrefix) {
    return new NextResponse('Not found', { status: 404 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await adminClient.storage
    .from('invitations_assets')
    .createSignedUrl(path, 3600)
    
  if (error || !data?.signedUrl) {
    return new NextResponse('Not found', { status: 404 })
  }

  // Cache redirect to prevent regenerating signed URLs for every single image load.
  // 60 seconds is extremely safe and prevents hotlinking outside the immediate session.
  return NextResponse.redirect(data.signedUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'private, max-age=60'
    }
  })
}
