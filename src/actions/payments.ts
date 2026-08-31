'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requireInvitationEditAccess } from '@/lib/auth/invitation-auth'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function generateTrackingCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // No O,0,I,1,L
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  
  return `TZK-${yy}${mm}${dd}-${result}`;
}

export async function createOrGetPaymentOrder(invitationId: string, planId: string) {
  try {
    // 1. Authorization
    const authorizedInv = await requireInvitationEditAccess(invitationId)
    if (!authorizedInv) {
      return { success: false, error: 'Unauthorized' }
    }

    const adminClient = getAdminClient()

    // 2. Validate Package / Plan
    const { data: plan, error: planError } = await adminClient
      .from('plans')
      .select('*')
      .eq('id', planId)
      .eq('status', 'ACTIVE')
      .single()

    if (planError || !plan) {
      return { success: false, error: 'Invalid or inactive plan' }
    }

    // 3. Check for existing PENDING_PAYMENT order for this invitation
    // Note: We use Admin Client to ensure we can read all orders, since anon users 
    // might not have RLS permission to read orders if we haven't updated RLS perfectly.
    const { data: existingOrder } = await adminClient
      .from('orders')
      .select('id, tracking_code, amount, currency, status, plan_snapshot')
      .eq('invitation_id', invitationId)
      .eq('status', 'PENDING_PAYMENT')
      .limit(1)
      .single()

    if (existingOrder) {
      // 4. Handle Package Change
      const snapshot = existingOrder.plan_snapshot;
      if (snapshot?.id !== plan.id) {
        // Cancel the old one safely and create a new one
        await adminClient
          .from('orders')
          .update({ status: 'CANCELLED' })
          .eq('id', existingOrder.id);
        
        // We will fall through to create a NEW order below
      } else {
        // If same plan, return existing
        return {
          success: true,
          data: {
            id: existingOrder.id,
            trackingCode: existingOrder.tracking_code,
            amount: existingOrder.amount,
            currency: existingOrder.currency,
            status: existingOrder.status,
            packageName: snapshot?.name || plan.name
          }
        }
      }
    }

    // 5. Create New Order (Collision retry loop)
    let retries = 3;
    while (retries > 0) {
      try {
        const trackingCode = generateTrackingCode();
        
        const { data: newOrder, error: insertError } = await adminClient
          .from('orders')
          .insert({
            user_id: authorizedInv.user_id, // NULL for anonymous
            invitation_id: invitationId,
            plan_id: plan.id,
            amount: plan.price,
            currency: plan.currency,
            status: 'PENDING_PAYMENT',
            tracking_code: trackingCode,
            payment_method: 'WHATSAPP_MANUAL',
            plan_snapshot: plan
          })
          .select()
          .single()
          
        if (insertError) {
          if (insertError.code === '23505') { // Unique violation
            retries--;
            continue;
          }
          throw insertError;
        }

        const { trackServerFunnelEvent } = await import('@/lib/funnel/server');
        await trackServerFunnelEvent({
          eventName: 'FUNNEL_PAYMENT_ORDER_CREATED',
          invitationId: invitationId,
          packageCode: plan.name,
          eventKey: `payment_order_${newOrder.id}`
        });

        return {
          success: true,
          data: {
            id: newOrder.id,
            trackingCode: newOrder.tracking_code,
            amount: newOrder.amount,
            currency: newOrder.currency,
            status: newOrder.status,
            packageName: plan.name
          }
        }

      } catch (err) {
        if (retries === 1) throw err;
        retries--;
      }
    }

    return { success: false, error: 'Failed to generate tracking code' }

  } catch (err: unknown) {
    console.error('Order creation error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Internal server error' }
  }
}

export async function checkPaymentStatus(orderId: string, invitationId: string) {
  try {
    const authorizedInv = await requireInvitationEditAccess(invitationId)
    if (!authorizedInv) {
      return { success: false, error: 'Unauthorized' }
    }

    const adminClient = getAdminClient()
    const { data: order, error } = await adminClient
      .from('orders')
      .select('status, tracking_code')
      .eq('id', orderId)
      .eq('invitation_id', invitationId)
      .single()

    if (error || !order) {
      return { success: false, error: 'Order not found' }
    }

    return { success: true, status: order.status, trackingCode: order.tracking_code }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function adminConfirmManualPayment(orderId: string) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Unauthorized' }

    const adminClient = getAdminClient()
    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized admin' }
    }

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('status, tracking_code, invitation_id, plan_snapshot')
      .eq('id', orderId)
      .single()

    if (orderError || !order) return { success: false, error: 'Order not found' }
    
    if (order.status === 'PAID') {
      return { success: true, message: 'Already paid' }
    }

    if (order.status !== 'PENDING_PAYMENT') {
      return { success: false, error: 'Order is not pending payment' }
    }

    const { error: updateError } = await adminClient
      .from('orders')
      .update({
        status: 'PAID',
        paid_at: new Date().toISOString(),
        approved_by: user.id
      })
      .eq('id', orderId)

    if (updateError) throw updateError
    
    // Audit Log
    try {
      await adminClient.from('admin_audit_log').insert({
        admin_user_id: user.id,
        action: 'PAYMENT_CONFIRMED',
        entity_type: 'order',
        entity_id: orderId,
        metadata: { previous_status: 'PENDING_PAYMENT', new_status: 'PAID', tracking_code: order.tracking_code }
      })
    } catch (e) {
      console.error('[Audit Log] Failed to insert', e)
    }

    // Best-effort Funnel Telemetry for PAYMENT_CONFIRMED
    try {
      // Find the original session_id that created the order
      const { data: previousEvent } = await adminClient
        .from('product_funnel_events')
        .select('session_id')
        .eq('event_key', `payment_order_${orderId}`)
        .limit(1)
        .single();
        
      if (previousEvent?.session_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const planSnapshot = order.plan_snapshot as any;
        const { trackServerFunnelEvent } = await import('@/lib/funnel/server');
        await trackServerFunnelEvent({
          eventName: 'FUNNEL_PAYMENT_CONFIRMED',
          sessionId: previousEvent.session_id,
          invitationId: order.invitation_id,
          packageCode: planSnapshot?.name,
          eventKey: `payment_confirmed_${orderId}`
        });
      }
    } catch (e) {
      console.error('[Funnel] Failed to track payment confirmation telemetry', e)
    }

    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
