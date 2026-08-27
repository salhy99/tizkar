/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getAdminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Verify role
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const profile = profileRaw as { role: string } | null;

  if (!profile || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
    return null
  }

  // We need service role client to bypass user RLS for updating orders/payments 
  // since users can't approve their own things, and admins might need to bypass constraints.
  // Wait, if admin role is enough for RLS policies, standard client might work.
  // But our triggers explicitly check `public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN')`.
  // Standard client is safer if RLS allows it. Let's return both.
  
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const adminAuthClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  return { supabase, adminAuthClient, adminId: user.id }
}

export async function approveOrder(orderId: string) {
  const adminCtx = await getAdminClient()
  if (!adminCtx) return { error: 'Unauthorized' }
  const { adminAuthClient, adminId } = adminCtx

  // 1. Fetch order, payment, and invitation
  const { data: order } = await adminAuthClient
    .from('orders')
    .select('id, user_id, invitation_id, status, plan_snapshot')
    .eq('id', orderId)
    .single() as any;

  if (!order) return { error: 'Order not found' }
  if (order.status === 'APPROVED') return { error: 'تمت معالجة هذا الطلب مسبقاً' }
  if (order.status !== 'PENDING_REVIEW') return { error: 'الطلب ليس قيد المراجعة' }

  const { data: inv } = await adminAuthClient
    .from('invitations')
    .select('id, status')
    .eq('id', order.invitation_id)
    .single() as any;

  if (!inv) return { error: 'Invitation not found' }
  if (inv.status === 'PUBLISHED') return { error: 'الدعوة منشورة مسبقاً' }
  if (inv.status === 'SUSPENDED') return { error: 'الدعوة موقوفة' }

  // 2. Perform atomic approval
  const now = new Date().toISOString();
  const duration = order.plan_snapshot?.duration_days || 120;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + duration);

  // Since Supabase JS client doesn't have multi-table transactions natively without RPC,
  // we use the admin client and execute them sequentially but carefully.
  // Ideally, this should be an RPC, but we'll do sequential updates since it's an MVP.
  
  // a. Update Payment
  const { error: pErr } = await (adminAuthClient.from('payments') as any)
    .update({ 
      status: 'APPROVED',
      updated_at: now
    })
    .eq('order_id', order.id)
    .eq('status', 'PENDING');

  if (pErr) return { error: 'Failed to update payment' }

  // b. Update Order
  const { error: oErr } = await (adminAuthClient.from('orders') as any)
    .update({ 
      status: 'APPROVED',
      approved_by: adminId,
      approved_at: now,
      updated_at: now
    })
    .eq('id', order.id);

  if (oErr) return { error: 'Failed to update order' }

  // c. Publish Invitation
  const { error: iErr } = await (adminAuthClient.from('invitations') as any)
    .update({ 
      status: 'PUBLISHED',
      published_at: now,
      expires_at: expiresAt.toISOString(),
      updated_at: now
    })
    .eq('id', order.invitation_id);

  if (iErr) return { error: 'Failed to publish invitation' }
  
  // Also mark the active version as published
  await (adminAuthClient.from('invitation_versions') as any)
    .update({ is_published: true })
    .eq('invitation_id', order.invitation_id)
    .eq('is_published', false);

  // Send Notification to user
  await adminAuthClient.from('notifications').insert({
    user_id: order.user_id,
    type: 'ORDER_APPROVED',
    title: 'تم نشر دعوتك بنجاح 🎉',
    message: `تم قبول الدفعة للطلب ${orderId.split('-')[0].toUpperCase()} ودعوتك الآن متاحة للعامة.`
  } as any)

  // d. Audit Log
  await (adminAuthClient.from('admin_logs') as any)
    .insert({
      admin_id: adminId,
      action: 'ORDER_APPROVED',
      entity_type: 'ORDER',
      entity_id: order.id,
      metadata: { invitation_id: order.invitation_id }
    });

  revalidatePath('/admin/orders')
  return { success: true }
}

export async function rejectOrder(orderId: string, reason: string) {
  const adminCtx = await getAdminClient()
  if (!adminCtx) return { error: 'Unauthorized' }
  const { adminAuthClient, adminId } = adminCtx

  if (!reason || reason.length < 5) return { error: 'يرجى كتابة سبب واضح للرفض' }

  const { data: order } = await adminAuthClient
    .from('orders')
    .select('id, user_id, invitation_id, status')
    .eq('id', orderId)
    .single() as any;

  if (!order) return { error: 'Order not found' }
  if (order.status === 'REJECTED') return { error: 'الطلب مرفوض مسبقاً' }

  const now = new Date().toISOString();

  // Update Payment
  await (adminAuthClient.from('payments') as any)
    .update({ status: 'REJECTED', updated_at: now })
    .eq('order_id', order.id)
    .eq('status', 'PENDING');

  // Update Order
  await (adminAuthClient.from('orders') as any)
    .update({ 
      status: 'REJECTED',
      rejection_reason: reason,
      rejected_by: adminId,
      rejected_at: now,
      updated_at: now
    })
    .eq('id', order.id);

  // Revert Invitation to Draft
  await (adminAuthClient.from('invitations') as any)
    .update({ 
      status: 'DRAFT',
      updated_at: now
    })
    .eq('id', order.invitation_id);

  // Send Notification to user
  await adminAuthClient.from('notifications').insert({
    user_id: order.user_id,
    type: 'ORDER_REJECTED',
    title: 'تحديث بخصوص طلبك',
    message: `نأسف، تم رفض طلبك رقم ${orderId.split('-')[0].toUpperCase()}. السبب: ${reason}`
  } as any)

  // Audit Log
  await (adminAuthClient.from('admin_logs') as any)
    .insert({
      admin_id: adminId,
      action: 'ORDER_REJECTED',
      entity_type: 'ORDER',
      entity_id: order.id,
      metadata: { reason }
    });

  revalidatePath('/admin/orders')
  return { success: true }
}

export async function suspendInvitation(invitationId: string, reason: string) {
  const adminCtx = await getAdminClient()
  if (!adminCtx) return { error: 'Unauthorized' }
  const { adminAuthClient, adminId } = adminCtx

  if (!reason || reason.length < 5) return { error: 'يرجى كتابة سبب الإيقاف' }

  const now = new Date().toISOString()

  const { data: inv } = await adminAuthClient
    .from('invitations')
    .select('id, user_id, status, title')
    .eq('id', invitationId)
    .single() as any;

  if (!inv) return { error: 'Invitation not found' }
  if (inv.status === 'SUSPENDED') return { error: 'الدعوة موقوفة مسبقاً' }

  const { error } = await (adminAuthClient.from('invitations') as any)
    .update({ 
      status: 'SUSPENDED',
      updated_at: now
    })
    .eq('id', invitationId);

  if (error) return { error: 'فشل إيقاف الدعوة' }

  // Send Notification to user
  await adminAuthClient.from('notifications').insert({
    user_id: inv.user_id,
    type: 'INVITATION_SUSPENDED',
    title: 'تنبيه: إيقاف الدعوة',
    message: `تم إيقاف ظهور دعوتك "${inv.title}" مؤقتاً. السبب: ${reason}`
  } as any)

  await (adminAuthClient.from('admin_logs') as any)
    .insert({
      admin_id: adminId,
      action: 'INVITATION_SUSPENDED',
      entity_type: 'INVITATION',
      entity_id: invitationId,
      metadata: { reason }
    });

  revalidatePath('/admin/invitations')
  return { success: true }
}

export async function adminRotateInvitationCredentials(invitationId: string) {
  const adminCtx = await getAdminClient()
  if (!adminCtx) return { error: 'Unauthorized' }
  const { adminAuthClient, adminId } = adminCtx

  const { data: inv } = await adminAuthClient
    .from('invitations')
    .select('id, user_id, status, title')
    .eq('id', invitationId)
    .single() as any;

  if (!inv) return { error: 'Invitation not found' }

  const { generateEditToken, hashEditToken, generateRecoveryKey, hashRecoveryKey } = await import('@/lib/auth/editor-session');
  
  const newEditToken = generateEditToken();
  const newEditTokenHash = hashEditToken(newEditToken);
  
  const newRecoveryKey = generateRecoveryKey();
  const newRecoveryKeyHash = hashRecoveryKey(newRecoveryKey);

  const { error } = await adminAuthClient
    .from('invitations')
    .update({ 
      edit_token_hash: newEditTokenHash,
      recovery_key_hash: newRecoveryKeyHash,
      last_recovered_at: new Date().toISOString()
    })
    .eq('id', invitationId) as any;

  if (error) return { error: 'فشل إصدار بيانات جديدة' }

  await (adminAuthClient.from('admin_logs') as any)
    .insert({
      admin_id: adminId,
      action: 'ADMIN_RECOVERY',
      entity_type: 'INVITATION',
      entity_id: invitationId,
      metadata: { reason: 'Admin assisted recovery requested by user' }
    });

  return { 
    success: true, 
    newEditToken, 
    newRecoveryKey 
  }
}

