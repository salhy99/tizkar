import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminOverview() {
  // Use admin client securely inside admin route (layout already protects it)
  const { createClient: createAdmin } = await import('@supabase/supabase-js')
  const adminClient = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Overview stats
  const { count: usersCount } = await adminClient.from('profiles').select('*', { count: 'exact', head: true })
  const { count: invitationsCount } = await adminClient.from('invitations').select('*', { count: 'exact', head: true })
  const { count: publishedCount } = await adminClient.from('invitations').select('*', { count: 'exact', head: true }).eq('status', 'PUBLISHED')
  const { count: pendingOrders } = await adminClient.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'PENDING_REVIEW')

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1C1C1C]">نظرة عامة</h1>
          <p className="text-muted-foreground mt-2">إحصائيات المنصة السريعة</p>
        </div>
      </div>

      {pendingOrders && pendingOrders > 0 && (
        <div className="bg-[#A88952]/10 border border-[#A88952]/30 text-[#A88952] p-6 rounded-2xl mb-8 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold mb-1">طلبات تحتاج للمراجعة</h3>
            <p>يوجد {pendingOrders} طلبات بانتظار مراجعة الدفع.</p>
          </div>
          <Link href="/admin/orders" className="bg-[#A88952] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#A88952]/90">
            المراجعة الآن
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
          <div className="text-sm text-muted-foreground mb-2">إجمالي المستخدمين</div>
          <div className="text-3xl font-bold">{usersCount || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
          <div className="text-sm text-muted-foreground mb-2">إجمالي الدعوات</div>
          <div className="text-3xl font-bold">{invitationsCount || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
          <div className="text-sm text-muted-foreground mb-2">الدعوات المنشورة</div>
          <div className="text-3xl font-bold text-green-600">{publishedCount || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
          <div className="text-sm text-muted-foreground mb-2">الطلبات المعلقة</div>
          <div className="text-3xl font-bold text-orange-500">{pendingOrders || 0}</div>
        </div>
      </div>
    </div>
  )
}
