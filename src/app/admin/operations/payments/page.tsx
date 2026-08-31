import { requireAdminAccess } from '@/lib/auth/admin-auth'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

export default async function AdminPaymentsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const auth = await requireAdminAccess()
  if (!auth) return redirect('/dashboard')

  const resolvedParams = await searchParams
  const statusFilter = resolvedParams.status || 'PENDING_PAYMENT'
  
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = adminClient
    .from('orders')
    .select(`
      id, tracking_code, status, created_at, paid_at, plan_snapshot,
      invitation_id
    `)
    .eq('status', statusFilter)
    
  if (statusFilter === 'PENDING_PAYMENT') {
    query = query.order('created_at', { ascending: true }) // Oldest first to help waiting customers
  } else {
    query = query.order('paid_at', { ascending: false }).limit(50) // Recently confirmed
  }

  const { data: orders } = await query

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">طابور المدفوعات (Payment Queue)</h1>
      
      <div className="flex gap-4 mb-6 border-b pb-4">
        <Link 
          href="/admin/operations/payments?status=PENDING_PAYMENT" 
          className={`px-4 py-2 rounded font-bold ${statusFilter === 'PENDING_PAYMENT' ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          بانتظار التأكيد (Pending)
        </Link>
        <Link 
          href="/admin/operations/payments?status=PAID" 
          className={`px-4 py-2 rounded font-bold ${statusFilter === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          تم التأكيد مؤخراً (Paid)
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 text-slate-600 border-b">
            <tr>
              <th className="p-4 text-sm font-semibold">رقم التتبع (Tracking)</th>
              <th className="p-4 text-sm font-semibold">تاريخ الطلب (Created)</th>
              <th className="p-4 text-sm font-semibold">الباقة (Package)</th>
              <th className="p-4 text-sm font-semibold">السعر (Price)</th>
              <th className="p-4 text-sm font-semibold">الدعوة (Invitation ID)</th>
              <th className="p-4 text-sm font-semibold text-left">إجراء (Action)</th>
            </tr>
          </thead>
          <tbody>
            {!orders || orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">لا توجد طلبات في هذه القائمة.</td>
              </tr>
            ) : (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              orders.map((order: any) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const planTitle = (order.plan_snapshot as any)?.title || 'Unknown'
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const price = (order.plan_snapshot as any)?.price || 0
                return (
                  <tr key={order.id} className="border-b hover:bg-slate-50 transition">
                    <td className="p-4 font-mono text-sm" dir="ltr">{order.tracking_code}</td>
                    <td className="p-4 text-sm" dir="ltr">{new Date(order.created_at).toLocaleString('en-US')}</td>
                    <td className="p-4 text-sm font-bold">{planTitle}</td>
                    <td className="p-4 text-sm font-bold text-emerald-700">{price} ر.س</td>
                    <td className="p-4 text-sm">
                      <Link href={`/admin/operations/invitations/${order.invitation_id}`} className="text-blue-600 hover:underline block truncate w-32" dir="ltr" title={order.invitation_id}>
                        {order.invitation_id.substring(0,8)}...
                      </Link>
                    </td>
                    <td className="p-4 text-left">
                      {order.status === 'PENDING_PAYMENT' ? (
                        <Link 
                          href={`/admin/operations/payments/confirm/${order.id}`}
                          className="bg-slate-900 text-white px-3 py-1.5 text-sm rounded hover:bg-slate-800"
                        >
                          تأكيد
                        </Link>
                      ) : (
                        <span className="text-emerald-600 font-bold text-sm">
                          تم بتاريخ {order.paid_at ? new Date(order.paid_at).toLocaleDateString() : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
