import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { requireInvitationEditAccess } from '@/lib/auth/invitation-auth'
import PaymentClient from './PaymentClient'

export default async function PaymentPage({ params, searchParams }: { params: Promise<{ orderId: string }>, searchParams: Promise<{ invitationId?: string }> }) {
  const p = await params
  const s = await searchParams
  
  if (!s.invitationId) {
    notFound()
  }

  const authorizedInv = await requireInvitationEditAccess(s.invitationId)
  if (!authorizedInv) {
    notFound()
  }

  const supabase = await createClient()

  // Fetch Order
  const { data: orderRaw } = await supabase
    .from('orders')
    .select('*, invitations(title)')
    .eq('id', p.orderId)
    .single();

  const order = orderRaw as { id: string; status: string; amount: number; currency: string; payment_method: string; tracking_code: string | null; plan_snapshot: { name: string }; created_at: string; invitation_id: string } | null;

  if (!order || order.invitation_id !== s.invitationId) {
    notFound()
  }

  // If already under review, approved, or cancelled, redirect to dashboard or order status
  if (order.status !== 'PENDING_PAYMENT' && order.status !== 'REJECTED') {
    if (order.status === 'PAID') {
      redirect(`/editor/${s.invitationId}`)
    }
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#FAF8F3] py-16 px-4" dir="rtl">
      <div className="container mx-auto max-w-4xl">
        <PaymentClient order={order} invitationId={s.invitationId} />
      </div>
    </div>
  )
}
