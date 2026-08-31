import { requireAdminAccess } from '@/lib/auth/admin-auth'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import PaymentConfirmClient from './PaymentConfirmClient'

export default async function AdminPaymentConfirmPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const auth = await requireAdminAccess()
  if (!auth) return redirect('/dashboard')

  const resolvedParams = await params
  const { id } = resolvedParams

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: order } = await adminClient
    .from('orders')
    .select(`*`)
    .eq('id', id)
    .single()

  if (!order) {
    return <div className="p-8">لم يتم العثور على الطلب.</div>
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold">تأكيد الدفع (Confirm Payment)</h1>
        <Link href="/admin/operations/payments" className="text-slate-500 hover:text-slate-900">إلغاء والعودة</Link>
      </div>

      <div className="bg-white p-8 rounded-lg shadow">
        <div className="space-y-4 mb-8">
          <div className="flex justify-between border-b pb-2">
            <span className="text-slate-500">رقم التتبع:</span>
            <span className="font-mono font-bold" dir="ltr">{order.tracking_code}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-slate-500">الدعوة:</span>
            <span className="font-mono text-slate-800" dir="ltr">{order.invitation_id}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-slate-500">الباقة:</span>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <span className="font-bold">{(order.plan_snapshot as any)?.title || 'Unknown'}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-slate-500">المبلغ المطلوب:</span>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <span className="font-bold text-emerald-600 text-lg">{(order.plan_snapshot as any)?.price || 0} ر.س</span>
          </div>
          <div className="flex justify-between pb-2">
            <span className="text-slate-500">الحالة الحالية:</span>
            <span className={`font-bold ${order.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>{order.status}</span>
          </div>
        </div>

        {order.status === 'PENDING_PAYMENT' ? (
          <PaymentConfirmClient orderId={order.id} />
        ) : (
          <div className="bg-emerald-50 text-emerald-800 p-4 rounded text-center font-bold">
            هذا الطلب مؤكد مسبقاً (PAID).
          </div>
        )}
      </div>
    </div>
  )
}
