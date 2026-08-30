'use server'

import { requireInvitationEditAccess } from '@/lib/auth/invitation-auth'
import { requireInvitationLimit } from '@/lib/entitlements/server'

export async function submitRsvp(
  invitationId: string, 
  data: { guest_name: string; attendance_status: 'ATTENDING' | 'DECLINED'; guest_count: number; message?: string }
) {
  if (!invitationId) return { error: 'معرف الدعوة غير صحيح' }

  // 1. Rate Limit
  const { checkRsvpRateLimit } = await import('@/lib/security/rate-limit')
  const rateLimit = await checkRsvpRateLimit(invitationId)
  if (!rateLimit.success) return { error: rateLimit.error }

  // 2. Input Validation
  const name = data.guest_name?.trim()
  if (!name || name.length < 2) return { error: 'الرجاء إدخال اسم صحيح' }
  if (name.length > 50) return { error: 'الاسم طويل جداً' }

  const status = data.attendance_status
  if (status !== 'ATTENDING' && status !== 'DECLINED') return { error: 'حالة الحضور غير صحيحة' }

  let count = Number(data.guest_count)
  if (isNaN(count)) return { error: 'عدد الحضور غير صحيح' }

  if (status === 'DECLINED') {
    count = 0
  } else {
    if (count < 1) count = 1
    if (count > 10) return { error: 'الحد الأقصى لعدد المرافقين هو 10' }
  }

  const message = data.message?.trim() || ''
  if (message.length > 500) return { error: 'رسالة التهنئة طويلة جداً (الحد الأقصى 500 حرف)' }

  // 3. Verify Invitation is Published and not expired
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: inv, error: invError } = await adminClient
    .from('invitations')
    .select('status, expires_at')
    .eq('id', invitationId)
    .single()

  if (invError || !inv) return { error: 'حدث خطأ أثناء الوصول للدعوة' }

  if (inv.status !== 'PUBLISHED') return { error: 'هذه الدعوة غير متاحة لتسجيل الحضور' }
  
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    return { error: 'انتهت صلاحية هذه الدعوة' }
  }

  // 3b. Verify Entitlement Limit for RSVP Responses
  const { count: currentRsvpsCount, error: countError } = await adminClient
    .from('invitation_rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('invitation_id', invitationId)

  if (countError) return { error: 'حدث خطأ أثناء فحص البيانات' }
  
  const isWithinLimit = await requireInvitationLimit(invitationId, 'maxGuestResponses', (currentRsvpsCount || 0) + 1)
  
  if (!isWithinLimit) {
    return { error: 'عذراً، لا يمكن تسجيل الحضور حيث وصلت هذه الدعوة إلى الحد الأقصى من الردود المسموحة للباقة الحالية.' }
  }

  // 4. Narrow Insert using Service Role
  const { error: insertError } = await adminClient
    .from('invitation_rsvps')
    .insert({
      invitation_id: invitationId,
      guest_name: name,
      attendance_status: status,
      guest_count: count,
      message: message === '' ? null : message
    })

  if (insertError) {
    console.error('RSVP Insert Error:', insertError)
    return { error: 'حدث خطأ أثناء تسجيل الرد. الرجاء المحاولة لاحقاً.' }
  }

  return { success: true }
}

export async function getInvitationRsvps(invitationId: string) {
  // 1. Authorize Owner and Feature
  const authorizedInv = await requireInvitationEditAccess(invitationId)
  if (!authorizedInv) return { error: 'غير مصرح لك بعرض هذه البيانات' }
  
  const { requireInvitationFeature } = await import('@/lib/entitlements/server')
  const hasGuestPro = await requireInvitationFeature(invitationId, 'guestManagementPro')

  // 2. Fetch using Service Role
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const query = adminClient
    .from('invitation_rsvps')
    .select(hasGuestPro ? '*' : 'attendance_status, guest_count')
    .eq('invitation_id', invitationId)
    .order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Fetch RSVPs Error:', error)
    return { error: 'حدث خطأ أثناء جلب الردود' }
  }

  if (!hasGuestPro) {
    return { locked: true, data: (data as any[]) || [] }
  }

  return { success: true, data: (data as any[]) || [] }
}

export async function deleteRsvp(invitationId: string, rsvpId: string) {
  // 1. Authorize Owner and Feature
  const authorizedInv = await requireInvitationEditAccess(invitationId)
  if (!authorizedInv) return { error: 'غير مصرح' }

  const { requireInvitationFeature } = await import('@/lib/entitlements/server')
  const hasGuestPro = await requireInvitationFeature(invitationId, 'guestManagementPro')
  if (!hasGuestPro) return { error: 'هذه الميزة غير متاحة في باقتك الحالية' }

  // 2. Delete using Service Role (matching invitationId to prevent deleting other rsvps)
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { error } = await adminClient
    .from('invitation_rsvps')
    .delete()
    .eq('id', rsvpId)
    .eq('invitation_id', invitationId)

  if (error) return { error: 'حدث خطأ أثناء حذف الرد' }

  return { success: true }
}
