'use server'

import { createClient } from '@supabase/supabase-js'
import { requireAdminAccess } from '@/lib/auth/admin-auth'
import { revalidatePath } from 'next/cache'

async function logAdminAction(action: string, metadata: any) {
  const admin = await requireAdminAccess()
  if (!admin) return
  const client = getAdminClient()
  await client.from('admin_audit_log').insert({
    admin_user_id: admin.user.id,
    action,
    entity_type: 'SUPPORT_CASE',
    entity_id: metadata.case_id,
    metadata
  })
}

type CaseStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'WAITING_INTERNAL' | 'RESOLVED' | 'CLOSED'
type CasePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
type CaseCategory = 'PAYMENT' | 'RECOVERY' | 'EDITOR' | 'MEDIA' | 'PUBLISH' | 'RSVP' | 'ACCOUNT' | 'TECHNICAL' | 'OTHER'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function createSupportCase(data: {
  subject: string
  category: CaseCategory
  priority: CasePriority
  invitation_id?: string
  order_id?: string
  initialNote?: string
}) {
  const admin = await requireAdminAccess()
  if (!admin) return { success: false, error: 'SUPPORT_FORBIDDEN' }

  if (!data.subject || data.subject.trim().length === 0 || data.subject.length > 200) {
    return { success: false, error: 'INVALID_SUBJECT' }
  }

  const supabase = getAdminClient()

  let finalInvitationId = data.invitation_id || null;
  const finalOrderId = data.order_id || null;

  // 1. Validate Order and Invitation Consistency
  if (finalOrderId) {
    const { data: orderData } = await supabase
      .from('orders')
      .select('id, invitation_id')
      .eq('id', finalOrderId)
      .single()

    if (!orderData) {
      return { success: false, error: 'SUPPORT_ENTITY_MISMATCH', message: 'Order not found' }
    }
    
    if (finalInvitationId && finalInvitationId !== orderData.invitation_id) {
      return { success: false, error: 'SUPPORT_ENTITY_MISMATCH', message: 'Order does not belong to this invitation' }
    }
    
    // Auto-derive invitation if missing
    finalInvitationId = orderData.invitation_id;
  }

  if (finalInvitationId) {
    const { data: invData } = await supabase
      .from('invitations')
      .select('id')
      .eq('id', finalInvitationId)
      .single()
      
    if (!invData) {
      return { success: false, error: 'SUPPORT_ENTITY_MISMATCH', message: 'Invitation not found' }
    }
  }

  const { data: newCase, error: caseError } = await supabase
    .from('support_cases')
    .insert({
      subject: data.subject.trim(),
      category: data.category,
      priority: data.priority,
      status: 'OPEN',
      invitation_id: finalInvitationId,
      order_id: finalOrderId,
      created_by_admin_id: null,
      created_by_admin_identifier: admin.user.email,
    })
    .select()
    .single()

  if (caseError) {
    console.error('Case creation error:', caseError)
    return { success: false, error: 'DB_ERROR' }
  }

  await logAdminAction('SUPPORT_CASE_CREATED', {
    case_id: newCase.id,
    invitation_id: finalInvitationId,
    order_id: finalOrderId,
    category: data.category
  })

  if (data.initialNote && data.initialNote.trim().length > 0) {
    await supabase
      .from('support_case_notes')
      .insert({
        case_id: newCase.id,
        author_admin_identifier: admin.user.email,
        body: data.initialNote.trim()
      })
    
    await logAdminAction('SUPPORT_NOTE_ADDED', { case_id: newCase.id })
  }

  revalidatePath('/admin/operations/support')
  if (finalInvitationId) revalidatePath(`/admin/operations/invitations/${finalInvitationId}`)
  
  return { success: true, case: newCase }
}

export async function addSupportNote(caseId: string, body: string) {
  const admin = await requireAdminAccess()
  if (!admin) return { success: false, error: 'SUPPORT_FORBIDDEN' }

  if (!body || body.trim().length === 0 || body.length > 10000) {
    return { success: false, error: 'INVALID_NOTE' }
  }

  const supabase = getAdminClient()

  const { data: note, error } = await supabase
    .from('support_case_notes')
    .insert({
      case_id: caseId,
      author_admin_identifier: admin.user.email,
      body: body.trim()
    })
    .select()
    .single()

  if (error) return { success: false, error: 'DB_ERROR' }

  await supabase
    .from('support_cases')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', caseId)

  await logAdminAction('SUPPORT_NOTE_ADDED', { case_id: caseId })
  revalidatePath(`/admin/operations/support/${caseId}`)
  
  return { success: true, note }
}

export async function updateSupportCaseStatus(caseId: string, newStatus: CaseStatus, summary?: string) {
  const admin = await requireAdminAccess()
  if (!admin) return { success: false, error: 'SUPPORT_FORBIDDEN' }

  const supabase = getAdminClient()
  
  const updates: any = { 
    status: newStatus, 
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString() 
  }
  
  if (newStatus === 'RESOLVED') updates.resolved_at = new Date().toISOString()
  if (newStatus === 'CLOSED') updates.closed_at = new Date().toISOString()

  const { error } = await supabase
    .from('support_cases')
    .update(updates)
    .eq('id', caseId)

  if (error) return { success: false, error: 'DB_ERROR' }

  if (summary && summary.trim().length > 0) {
    await supabase.from('support_case_notes').insert({
      case_id: caseId,
      author_admin_identifier: admin.user.email,
      body: summary.trim()
    })
  }

  const actionName = newStatus === 'RESOLVED' ? 'SUPPORT_RESOLVED' 
                   : newStatus === 'CLOSED' ? 'SUPPORT_CLOSED' 
                   : newStatus === 'OPEN' || newStatus === 'IN_PROGRESS' ? 'SUPPORT_REOPENED'
                   : 'SUPPORT_STATUS_CHANGED'

  await logAdminAction(actionName, { case_id: caseId, new_status: newStatus })
  revalidatePath(`/admin/operations/support/${caseId}`)
  
  return { success: true }
}

export async function updateSupportCasePriority(caseId: string, newPriority: CasePriority) {
  const admin = await requireAdminAccess()
  if (!admin) return { success: false, error: 'SUPPORT_FORBIDDEN' }

  const supabase = getAdminClient()
  const { error } = await supabase
    .from('support_cases')
    .update({ 
      priority: newPriority, 
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', caseId)

  if (error) return { success: false, error: 'DB_ERROR' }

  await logAdminAction('SUPPORT_PRIORITY_CHANGED', { case_id: caseId, new_priority: newPriority })
  revalidatePath(`/admin/operations/support/${caseId}`)
  
  return { success: true }
}
