'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getInvitationEntitlements } from '@/lib/entitlements/server'

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/mpeg': 'mp3'
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

import { requireInvitationEditAccess } from '@/lib/auth/invitation-auth'

async function verifyAuthAndOwnership(invitationId: string) {
  // 1. Centralized Dual Authorization Check (supports both Legacy and Token sessions)
  const authorizedInv = await requireInvitationEditAccess(invitationId)
  
  if (!authorizedInv) {
    throw new Error('Invitation not found or access denied')
  }

  const supabase = await createServerClient()
  return { userId: authorizedInv.user_id, supabase }
}

// Quota check moved to atomic RPC

export async function createMediaUploadToken(
  invitationId: string,
  mimeType: string,
  category: 'gallery' | 'music'
) {
  try {
    // 1. Verify Authentication and Ownership
    const { userId } = await verifyAuthAndOwnership(invitationId)

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

    // 3. Atomic Quota Reservation
    const { getInvitationEntitlements } = await import('@/lib/entitlements/server')
    const { entitlements } = await getInvitationEntitlements(invitationId)
    
    if (category === 'music') {
      if (!entitlements.audioAllowed) {
        return { success: false, error: 'ميزة الموسيقى الخلفية غير متاحة في باقتك الحالية' }
      }
    }

    const maxLimit = category === 'gallery' ? entitlements.maxImages : 1

    const adminClient = getAdminClient()
    const { data: resData, error: resError } = await adminClient
      .rpc('reserve_media_upload_slot', {
        p_invitation_id: invitationId,
        p_category: category,
        p_max_images: maxLimit
      })

    if (resError) {
      console.error('Reservation error:', resError)
      return { success: false, error: 'حدث خطأ أثناء حجز مساحة الرفع' }
    }

    if (!resData.success) {
      if (resData.error === 'MEDIA_QUOTA_EXCEEDED') {
        return { success: false, error: 'تم الوصول للحد الأقصى للصور المسموح بها في باقتك الحالية' }
      }
      return { success: false, error: resData.error || 'فشل حجز المساحة' }
    }

    const reservationId = resData.reservation_id;

    // 4. Generate strict path (Dual Path Compatibility: Legacy uses userId, Token-based uses 'anon')
    const extension = ALLOWED_MIME_TYPES[mimeType]
    const uuid = reservationId // Use the reservation UUID as the filename UUID
    const pathPrefix = userId || 'anon'
    const path = `${pathPrefix}/${invitationId}/${uuid}.${extension}`

    // 5. Generate Signed Upload URL via Admin Client
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return { success: false, error: msg }
  }
}

export async function confirmMediaUpload(
  invitationId: string,
  path: string,
  category: 'gallery' | 'music'
) {
  try {
    // 1 & 2 & 3. Authenticate and verify ownership
    const { userId } = await verifyAuthAndOwnership(invitationId)

    // 4. Validate category
    if (category !== 'gallery' && category !== 'music') {
      return { success: false, error: 'Invalid category' }
    }

    // 5. Strictly parse and validate the supplied path structure
    // Expected: [user_id_or_anon]/[invitation_id]/[uuid].[extension]
    const segments = path.split('/')
    if (segments.length !== 3) {
      return { success: false, error: 'Invalid path structure' }
    }

    const [pathPrefix, pathInvId, filename] = segments
    const expectedPrefix = userId || 'anon'

    // 6 & 7. Verify folder segments match strictly
    if (pathPrefix !== expectedPrefix) {
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
      .list(`${expectedPrefix}/${invitationId}`, {
        search: filename,
        limit: 1
      })

    if (listError || !files || files.length === 0 || files[0].name !== filename) {
      return { success: false, error: 'File does not exist in storage' }
    }

    const fileMeta = files[0]

    // 13 & 14. Verify actual file size
    const actualSize = fileMeta.metadata?.size || 0
    let maxSize = CATEGORY_SIZE_LIMITS[category]
    
    // Apply stricter package limit if applicable
    if (category === 'music') {
      const { entitlements } = await getInvitationEntitlements(invitationId)
      if (entitlements.maxAudioBytes > 0 && entitlements.maxAudioBytes < maxSize) {
        maxSize = entitlements.maxAudioBytes
      }
    }

    if (actualSize === 0) {
      return { success: false, error: 'File is empty' }
    }
    if (actualSize > maxSize) {
      // Clean up the oversized file immediately as defense-in-depth
      await adminClient.storage.from('invitations_assets').remove([path])
      return { success: false, error: 'حجم الملف يتجاوز الحد الأقصى المسموح به' }
    }

    // 15. Confirm and Commit slot in database atomically
    const { data: confData, error: confError } = await adminClient
      .rpc('commit_media_upload_atomic', {
        p_invitation_id: invitationId,
        p_reservation_id: fileUuid,
        p_storage_path: path,
        p_category: category
      })

    if (confError || !confData.success) {
      return { success: false, error: confData?.error || 'حدث خطأ أثناء تأكيد الرفع' }
    }

    // 16. Return the validated raw Storage path
    // We only return success and the safe path. We do NOT return a Signed URL here.
    return { success: true, path }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Confirmation failed'
    return { success: false, error: msg }
  }
}

export async function deleteMedia(invitationId: string, path: string) {
  try {
    const { userId } = await verifyAuthAndOwnership(invitationId)
    
    // Validate path structure
    if (!path || path.includes('..') || path.startsWith('/')) {
      return { success: false, error: 'Invalid path' }
    }

    const segments = path.split('/')
    if (segments.length !== 3) {
      return { success: false, error: 'Invalid path structure' }
    }
    
    const [pathPrefix, pathInvId] = segments
    const expectedPrefix = userId || 'anon'
    
    if (pathPrefix !== expectedPrefix || pathInvId !== invitationId) {
      return { success: false, error: 'Path mismatch' }
    }
    
    const adminClient = getAdminClient()
    
    const { error: removeError } = await adminClient.storage
      .from('invitations_assets')
      .remove([path])
      
    if (removeError) {
      console.error('Delete Media Error:', removeError)
      return { success: false, error: 'Failed to delete file from storage' }
    }
    
    // Also cancel the reservation if it exists
    await adminClient.rpc('cancel_media_upload_slot', {
      p_invitation_id: invitationId,
      p_path: path
    })
    
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Delete failed'
    return { success: false, error: msg }
  }
}
