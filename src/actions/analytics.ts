'use server'

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { checkAnalyticsRateLimit } from '@/lib/security/rate-limit'
import { requireInvitationEditAccess } from '@/lib/auth/invitation-auth'
import { isValidEventType, validateEventMetadata, calculateAnalyticsMetrics } from '@/lib/analytics/helpers'

export async function recordAnalyticsEvent(
  invitationId: string,
  eventType: string,
  visitorHash: string,
  metadata?: unknown
) {
  try {
    // 0. Validate Invitation ID format (prevent oversized/malformed strings reaching Redis/DB)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(invitationId)) {
      return { success: false, error: 'Invalid invitation ID' }
    }

    // 1. Validate Event Type
    if (!isValidEventType(eventType)) {
      return { success: false, error: 'Invalid event type' }
    }

    // 2. Validate Metadata
    const safeMetadata = validateEventMetadata(eventType, metadata)

    // 3. Rate Limit (Fail Open for UX, but bounded for DB)
    const rateLimit = await checkAnalyticsRateLimit(invitationId)
    if (!rateLimit.success) {
      if (rateLimit.drop) {
        return { success: true } // Silently drop event, preserving UX without unbounded DB ingest
      }
      return { success: false, error: rateLimit.error }
    }

    // 4. Validate Invitation State (Public, Published, Unexpired)
    // We use Service Role because the user is anonymous
    const adminClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: inv, error: invError } = await adminClient
      .from('invitations')
      .select('status, expires_at')
      .eq('id', invitationId)
      .single()

    if (invError || !inv) {
      return { success: false, error: 'Invitation not found' }
    }

    if (inv.status !== 'PUBLISHED') {
      return { success: false, error: 'Invitation is not published' }
    }

    if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
      return { success: false, error: 'Invitation is expired' }
    }

    // 5. Insert Event (Service Role Insert)
    const { error: insertError } = await adminClient
      .from('invitation_analytics_events')
      .insert({
        invitation_id: invitationId,
        event_type: eventType,
        visitor_hash: visitorHash,
        metadata: safeMetadata
      })

    if (insertError) {
      console.error('Analytics Insert Error:', insertError)
      return { success: false, error: 'Internal error' } // Failing softly
    }

    return { success: true }
  } catch (err) {
    console.error('Analytics Exception:', err)
    return { success: false, error: 'Internal error' } // Always fail open / softly
  }
}

export async function getAnalyticsMetrics(invitationId: string) {
  // 1. Authorize Owner and Feature
  const authorizedInv = await requireInvitationEditAccess(invitationId)
  if (!authorizedInv) return { error: 'غير مصرح' }

  const { requireInvitationFeature } = await import('@/lib/entitlements/server')
  const hasAnalytics = await requireInvitationFeature(invitationId, 'analytics')
  if (!hasAnalytics) return { locked: true }

  const adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. Fetch Events
  const { data: events, error } = await adminClient
    .from('invitation_analytics_events')
    .select('event_type, visitor_hash, created_at, metadata')
    .eq('invitation_id', invitationId)

  if (error) {
    console.error('Fetch Analytics Error:', error)
    return { error: 'حدث خطأ أثناء جلب الإحصائيات' }
  }

  // 3. Fetch RSVPs to derive RSVP metrics
  const { data: rsvps, error: rsvpError } = await adminClient
    .from('invitation_rsvps')
    .select('attendance_status, guest_count')
    .eq('invitation_id', invitationId)

  if (rsvpError) {
    console.error('Fetch RSVPs for Analytics Error:', rsvpError)
    return { error: 'حدث خطأ أثناء جلب الإحصائيات' }
  }

  // 4. Calculate Aggregations
  const metrics = calculateAnalyticsMetrics(events || [], rsvps || [])

  return {
    success: true,
    metrics
  }
}
