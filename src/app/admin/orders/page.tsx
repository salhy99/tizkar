import Link from 'next/link'
import { Button } from '@/components/ui/button'

type AdminOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  plan_snapshot: { name: string } | null;
  tracking_code: string;
  payment_method: string;
  paid_at: string | null;
  profiles: { display_name: string; phone: string } | null;
  invitations: { title: string } | null;
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ search?: string, status?: string }> }) {
  const s = await searchParams
  const { createClient: createAdmin } = await import('@supabase/supabase-js')
  const adminClient = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  let query = adminClient
    .from('orders')
    .select(`
      id,
      amount,
      currency,
      status,
      created_at,
      plan_snapshot,
      tracking_code,
      payment_method,
      paid_at,
      profiles:user_id ( display_name, phone ),
      invitations ( title )
    `)
    .order('created_at', { ascending: false })
    
  if (s.search) {
    query = query.ilike('tracking_code', `%${s.search}%`)
  }
  
  if (s.status && s.status !== 'ALL') {
    query = query.eq('status', s.status)
  }

  const { data: orders } = await query.limit(50);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1C1C1C]">الطلبات والمدفوعات</h1>
          <p className="text-muted-foreground mt-2">إدارة مراجعة المدفوعات ونشر الدعوات</p>
        </div>
        
        <form className="flex gap-2 w-full md:w-auto">
          <input 
            name="search" 
            defaultValue={s.search} 
            placeholder="بحث برمز الطلب..." 
            className="border border-border rounded-lg px-3 py-2 text-sm w-full md:w-64"
          />
          <select name="status" defaultValue={s.status || 'ALL'} className="border border-border rounded-lg px-3 py-2 text-sm bg-white">
            <option value="ALL">الكل</option>
            <option value="PENDING_PAYMENT">بانتظار الدفع</option>
            <option value="PAID">مدفوع</option>
          </select>
          <Button type="submit" variant="outline">بحث</Button>
          {(s.search || s.status) && (
            <Link href="/admin/orders"><Button variant="ghost">إلغاء</Button></Link>
          )}
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-[#FAF8F3] border-b border-border text-sm text-muted-foreground">
              <tr>
                <th className="p-4 font-normal">رمز الطلب</th>
                <th className="p-4 font-normal">الدعوة</th>
                <th className="p-4 font-normal">الباقة</th>
                <th className="p-4 font-normal">المبلغ</th>
                <th className="p-4 font-normal">الحالة</th>
                <th className="p-4 font-normal">طريقة الدفع</th>
                <th className="p-4 font-normal">تاريخ الطلب</th>
                <th className="p-4 font-normal text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders && (orders as unknown as AdminOrder[]).map((order) => {
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm font-bold font-mono text-[#A88952]">{order.tracking_code || '-'}</td>
                    <td className="p-4">
                      <div>{order.invitations?.title || 'دعوة بدون عنوان'}</div>
                      {order.profiles?.phone && <div className="text-xs text-muted-foreground">{order.profiles.phone}</div>}
                      {!order.profiles?.phone && <div className="text-xs text-muted-foreground">زائر مجهول</div>}
                    </td>
                    <td className="p-4 text-sm">{order.plan_snapshot?.name || '-'}</td>
                    <td className="p-4 font-bold">{Number(order.amount).toLocaleString()} {order.currency === 'IQD' ? 'د.ع' : order.currency}</td>
                    <td className="p-4">
                      {order.status === 'PAID' && <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-bold">مدفوع</span>}
                      {order.status === 'PENDING_PAYMENT' && <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">بانتظار الدفع</span>}
                    </td>
                    <td className="p-4 text-xs">{order.payment_method === 'WHATSAPP_MANUAL' ? 'واتساب يديوي' : order.payment_method}</td>
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
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">لا توجد طلبات مطابقة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
