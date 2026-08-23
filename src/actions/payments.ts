'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Create a new order
export async function createOrder(invitationId: string, planId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 1. Validate invitation
  const { data: inv } = await supabase
    .from('invitations')
    .select('id, user_id, status, title')
    .eq('id', invitationId)
    .single() as any;

  if (!inv || inv.user_id !== user.id) return { error: 'الدعوة غير موجودة' }
  if (inv.status === 'PUBLISHED') return { error: 'الدعوة منشورة بالفعل' }
  if (inv.status === 'SUSPENDED') return { error: 'الدعوة موقوفة' }

  // Check if invitation has required fields
  const { data: activeVersion } = await supabase
    .from('invitation_versions')
    .select('invitation_data')
    .eq('invitation_id', invitationId)
    .eq('is_published', false)
    .single() as any;

  if (!activeVersion || !activeVersion.invitation_data) {
    return { error: 'بيانات الدعوة غير مكتملة' }
  }

  const data = activeVersion.invitation_data;
  if (!data.groomName || !data.brideName || !data.date || !data.time) {
    return { error: 'أكمل البيانات الأساسية (الأسماء، التاريخ، الوقت) قبل المتابعة' }
  }

  // 2. Validate plan
  const { data: plan } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .eq('status', 'ACTIVE')
    .single() as any;

  if (!plan || plan.price === 0) return { error: 'الباقة غير صالحة للنشر' }

  // 3. Prevent duplicate active orders
  const { data: existingOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('invitation_id', invitationId)
    .in('status', ['PENDING_PAYMENT', 'PENDING_REVIEW']) as any;

  if (existingOrders && existingOrders.length > 0) {
    return { error: 'لديك طلب قيد الانتظار أو المراجعة بالفعل' }
  }

  // 4. Create Order
  const planSnapshot = {
    id: plan.id,
    name: plan.name,
    price: plan.price,
    currency: plan.currency,
    duration_days: plan.duration_days
  };

  const { data: order, error: orderError } = await (supabase.from('orders') as any)
    .insert({
      user_id: user.id,
      invitation_id: invitationId,
      plan_id: plan.id,
      amount: plan.price,
      currency: plan.currency,
      status: 'PENDING_PAYMENT',
      plan_snapshot: planSnapshot
    })
    .select()
    .single();

  if (orderError) {
    console.error('Order Error:', orderError)
    return { error: 'حدث خطأ أثناء إنشاء الطلب' }
  }

  // Update invitation status
  await (supabase.from('invitations') as any)
    .update({ status: 'PENDING_PAYMENT' })
    .eq('id', invitationId);

  return { success: true, orderId: order.id }
}

// Submit payment reference
export async function submitPayment(orderId: string, reference: string) {
  const supabase = await createClient()
  const ref = reference.trim();

  if (!ref || ref.length > 50) return { error: 'رقم العملية غير صحيح' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Get order
  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, status, invitation_id')
    .eq('id', orderId)
    .single() as any;

  if (!order || order.user_id !== user.id) return { error: 'الطلب غير موجود' }
  if (order.status !== 'PENDING_PAYMENT' && order.status !== 'REJECTED') {
    return { error: 'لا يمكن إرسال دفعة لهذا الطلب' }
  }

  // Verify reference isn't already used for an approved payment
  // Requires service role since users can't read all payments
  const { createClient: createAdmin } = await import('@supabase/supabase-js')
  const adminClient = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  
  const { data: existingPayment } = await adminClient
    .from('payments')
    .select('id')
    .eq('transaction_reference', ref)
    .eq('status', 'APPROVED')
    .single() as any;

  if (existingPayment) {
    return { error: 'رقم العملية مستخدم مسبقاً' }
  }

  // Create payment record
  const { error: paymentError } = await (supabase.from('payments') as any)
    .insert({
      order_id: orderId,
      payment_method: 'KICARD',
      transaction_reference: ref,
      status: 'PENDING'
    });

  if (paymentError) {
    // Handling duplicate reference via unique constraint on table
    if (paymentError.code === '23505') {
      return { error: 'رقم العملية مستخدم مسبقاً' }
    }
    return { error: 'حدث خطأ أثناء حفظ الدفعة' }
  }

  // Update order status
  await (supabase.from('orders') as any)
    .update({ status: 'PENDING_REVIEW' })
    .eq('id', orderId);

  // Update invitation status
  await (supabase.from('invitations') as any)
    .update({ status: 'PENDING_APPROVAL' })
    .eq('id', order.invitation_id);

  // Send Notification
  await adminClient.from('notifications').insert({
    user_id: user.id,
    type: 'PAYMENT_RECEIVED',
    title: 'تم استلام الدفعة',
    message: `تم استلام رقم العملية للطلب ${orderId.split('-')[0].toUpperCase()}. جاري مراجعتها من قبل الإدارة.`
  } as any)

  revalidatePath('/dashboard')
  return { success: true }
}
