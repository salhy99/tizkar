'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/mpeg': 'mp3'
}

const CATEGORY_LIMITS = {
  gallery: 20,
  music: 1
}

const CATEGORY_MIME_MAP = {
  gallery: ['image/jpeg', 'image/png', 'image/webp'],
  music: ['audio/mpeg']
}

// 5MB for images, 10MB for audio
const CATEGORY_SIZE_LIMITS = {
  gallery: 5 * 1024 * 1024,
  music: 10 * 1024 * 1024
}

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verifyAuthAndOwnership(invitationId: string) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Verify invitation ownership
  const { data: invitation, error: invError } = await supabase
    .from('invitations')
    .select('id')
    .eq('id', invitationId)
    .eq('user_id', user.id)
    .single()

  if (invError || !invitation) {
    throw new Error('Invitation not found or access denied')
  }

  return { user, supabase }
}

async function checkQuota(supabase: any, invitationId: string, category: 'gallery' | 'music') {
  // Fetch latest version data
  const { data: latestVersion, error: verError } = await supabase
    .from('invitation_versions')
    .select('invitation_data')
    .eq('invitation_id', invitationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (verError && verError.code !== 'PGRST116') {
    throw new Error('Failed to fetch invitation data for quota check')
  }

  const data = latestVersion?.invitation_data || {}
  
  if (category === 'gallery') {
    const images = Array.isArray(data.gallery) ? data.gallery : []
    if (images.length >= CATEGORY_LIMITS.gallery) {
      throw new Error(`Exceeded maximum limit of ${CATEGORY_LIMITS.gallery} images`)
    }
  } else if (category === 'music') {
    // If music already has a valid path string, it's 1. 
    // Usually music is stored as a string URL or object.
    const music = typeof data.music === 'string' ? data.music : data.music?.path
    if (music) {
      throw new Error(`Exceeded maximum limit of ${CATEGORY_LIMITS.music} audio file`)
    }
  }
}

export async function createMediaUploadToken(
  invitationId: string,
  mimeType: string,
  category: 'gallery' | 'music'
) {
  try {
    // 1. Verify Authentication and Ownership
    const { user, supabase } = await verifyAuthAndOwnership(invitationId)

    // 2. Validate Category and MIME type
    if (category !== 'gallery' && category !== 'music') {
      return { success: false, error: 'Invalid category' }
    }

    if (!ALLOWED_MIME_TYPES[mimeType]) {
      return { success: false, error: 'Unsupported file type' }
    }

    if (!CATEGORY_MIME_MAP[category].includes(mimeType)) {
      return { success: false, error: 'File type does not match category' }
    }

    // 3. Check Quotas (Read-then-check is not absolute concurrency protection but adequate for MVP limits)
    await checkQuota(supabase, invitationId, category)

    // 4. Generate strict path
    const extension = ALLOWED_MIME_TYPES[mimeType]
    const uuid = globalThis.crypto.randomUUID()
    const path = `${user.id}/${invitationId}/${uuid}.${extension}`

    // 5. Generate Signed Upload URL via Admin Client
    const adminClient = getAdminClient()
    const { data: uploadData, error: uploadError } = await adminClient
      .storage
      .from('invitations_assets')
      .createSignedUploadUrl(path)

    if (uploadError || !uploadData) {
      console.error('Signed URL Error:', uploadError)
      return { success: false, error: 'Failed to generate upload token' }
    }

    return { 
      success: true, 
      signedUrl: uploadData.signedUrl, 
      path 
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Internal server error' }
  }
}

export async function confirmMediaUpload(
  invitationId: string,
  path: string,
  category: 'gallery' | 'music'
) {
  try {
    // 1 & 2 & 3. Authenticate and verify ownership
    const { user, supabase } = await verifyAuthAndOwnership(invitationId)

    // 4. Validate category
    if (category !== 'gallery' && category !== 'music') {
      return { success: false, error: 'Invalid category' }
    }

    // 5. Strictly parse and validate the supplied path structure
    // Expected: [user_id]/[invitation_id]/[uuid].[extension]
    const segments = path.split('/')
    if (segments.length !== 3) {
      return { success: false, error: 'Invalid path structure' }
    }

    const [pathUserId, pathInvId, filename] = segments

    // 6 & 7. Verify folder segments match strictly
    if (pathUserId !== user.id) {
      return { success: false, error: 'Path user mismatch' }
    }
    if (pathInvId !== invitationId) {
      return { success: false, error: 'Path invitation mismatch' }
    }

    // 8 & 9. Verify filename is UUID-based and extension is valid
    // Expected format: UUIDv4.ext
    const filenameParts = filename.split('.')
    if (filenameParts.length !== 2) {
      return { success: false, error: 'Invalid filename structure' }
    }

    const [fileUuid, fileExt] = filenameParts
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(fileUuid)) {
      return { success: false, error: 'Filename is not a valid UUID' }
    }

    // 10. Verify extension matches category and is approved
    const isApprovedExt = Object.values(ALLOWED_MIME_TYPES).includes(fileExt)
    if (!isApprovedExt) {
      return { success: false, error: 'Unapproved extension' }
    }

    const isCorrectCategoryExt = CATEGORY_MIME_MAP[category].some(mime => ALLOWED_MIME_TYPES[mime] === fileExt)
    if (!isCorrectCategoryExt) {
      return { success: false, error: 'Extension does not match category' }
    }

    // 11 & 12. Verify object exists and retrieve metadata via Admin Client
    const adminClient = getAdminClient()
    const { data: files, error: listError } = await adminClient
      .storage
      .from('invitations_assets')
      .list(`${user.id}/${invitationId}`, {
        search: filename,
        limit: 1
      })

    if (listError || !files || files.length === 0 || files[0].name !== filename) {
      return { success: false, error: 'File does not exist in storage' }
    }

    const fileMeta = files[0]

    // 13 & 14. Verify actual file size
    const actualSize = fileMeta.metadata?.size || 0
    const maxSize = CATEGORY_SIZE_LIMITS[category]
    if (actualSize === 0) {
      return { success: false, error: 'File is empty' }
    }
    if (actualSize > maxSize) {
      // Clean up the oversized file immediately as defense-in-depth
      await adminClient.storage.from('invitations_assets').remove([path])
      return { success: false, error: 'File exceeds maximum allowed size' }
    }

    // 15. Re-check media quota before final approval
    await checkQuota(supabase, invitationId, category)

    // 16. Return the validated raw Storage path
    // We only return success and the safe path. We do NOT return a Signed URL here.
    return { success: true, path }

  } catch (err: any) {
    return { success: false, error: err.message || 'Confirmation failed' }
  }
}
