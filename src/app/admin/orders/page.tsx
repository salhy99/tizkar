import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function AdminOrdersPage() {
  const { createClient: createAdmin } = await import('@supabase/supabase-js')
  const adminClient = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Fetch orders with related profiles and payments
  const { data: orders } = await adminClient
    .from('orders')
    .select(`
      id,
      amount,
      currency,
      status,
      created_at,
      plan_snapshot,
      profiles:user_id ( display_name, phone ),
      payments ( transaction_reference, status )
    `)
    .order('created_at', { ascending: false })
    .limit(50) as any;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1C1C1C]">الطلبات والمدفوعات</h1>
        <p className="text-muted-foreground mt-2">إدارة مراجعة المدفوعات ونشر الدعوات</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-[#FAF8F3] border-b border-border text-sm text-muted-foreground">
              <tr>
                <th className="p-4 font-normal">رقم الطلب</th>
                <th className="p-4 font-normal">العميل</th>
                <th className="p-4 font-normal">الباقة</th>
                <th className="p-4 font-normal">المبلغ</th>
                <th className="p-4 font-normal">رقم العملية</th>
                <th className="p-4 font-normal">الحالة</th>
                <th className="p-4 font-normal">تاريخ الطلب</th>
                <th className="p-4 font-normal text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders && orders.map((order: any) => {
                const payment = order.payments?.[0]
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-xs font-mono">{order.id.split('-')[0].toUpperCase()}</td>
                    <td className="p-4">
                      <div>{order.profiles?.display_name || 'غير متوفر'}</div>
                      <div className="text-xs text-muted-foreground">{order.profiles?.phone || ''}</div>
                    </td>
                    <td className="p-4 text-sm">{order.plan_snapshot?.name || '-'}</td>
                    <td className="p-4 font-bold">{Number(order.amount).toLocaleString()} {order.currency === 'IQD' ? 'د.ع' : order.currency}</td>
                    <td className="p-4 text-sm font-mono">{payment?.transaction_reference || '-'}</td>
                    <td className="p-4">
                      {order.status === 'PENDING_REVIEW' && <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold">بانتظار المراجعة</span>}
                      {order.status === 'APPROVED' && <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-bold">مقبول (منشور)</span>}
                      {order.status === 'REJECTED' && <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold">مرفوض</span>}
                      {order.status === 'PENDING_PAYMENT' && <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">بانتظار الدفع</span>}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString('en-GB')}</td>
                    <td className="p-4 text-center">
                      <Link href={`/admin/orders/${order.id}`}>
                        <Button variant="outline" size="sm" className="rounded-lg">التفاصيل</Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {(!orders || orders.length === 0) && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">لا توجد طلبات حالياً</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
