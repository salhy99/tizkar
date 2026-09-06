import { requireAdminAccess } from '@/lib/auth/admin-auth'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

export default async function AdminInvitationDetailsPage({
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

  const { data: inv } = await adminClient
    .from('invitations')
    .select(`
      *,
      template:templates(title, slug)
    `)
    .eq('id', id)
    .single()

  if (!inv) {
    return <div className="p-8">لم يتم العثور على الدعوة.</div>
  }

  const { data: order } = await adminClient
    .from('orders')
    .select('*')
    .eq('invitation_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Calculate Operational Status
  let computedState = 'DRAFT'
  if (order) {
    if (order.status === 'PAID') {
      computedState = inv.status === 'PUBLISHED' ? 'PUBLISHED' : 'PAID_NOT_PUBLISHED'
    } else if (order.status === 'PENDING_PAYMENT') {
      computedState = 'PENDING_PAYMENT'
    }
  } else if (inv.status === 'PUBLISHED') {
    computedState = 'PUBLISHED' // fallback
  }

  // Analytics Health
  const { data: funnelEvents } = await adminClient
    .from('product_funnel_events')
    .select('event_name, created_at')
    .eq('invitation_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    
  const lastEvent = funnelEvents && funnelEvents.length > 0 ? funnelEvents[0] : null

  return (
    <div>
      <div className="mb-6 flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold">تفاصيل الدعوة (Invitation Details)</h1>
        <Link href="/admin/operations/invitations" className="text-slate-500 hover:text-slate-900">العودة للبحث</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overview */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-bold mb-4 border-b pb-2">نظرة عامة (Overview)</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">ID:</span>
              <span className="font-mono text-slate-800" dir="ltr">{inv.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">القالب (Template):</span>
              <span className="font-bold">{inv.template?.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الحالة التشغيلية:</span>
              <span className="font-bold text-amber-600">{computedState}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">نوع الملكية:</span>
              <span className="font-bold">{inv.user_id ? 'Legacy Auth (Owner)' : 'Anonymous Editor Session'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">تاريخ الإنشاء:</span>
              <span className="text-slate-800" dir="ltr">{new Date(inv.created_at).toLocaleString('en-US')}</span>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-bold mb-4 border-b pb-2">الدفع (Payment)</h2>
          {order ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">حالة الطلب:</span>
                <span className={`font-bold ${order.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>{order.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">رقم التتبع (Tracking Code):</span>
                <span className="font-mono" dir="ltr">{order.tracking_code || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الباقة (Package):</span>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <span className="font-bold">{(order.plan_snapshot as any)?.title || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">تاريخ الدفع:</span>
                <span className="text-slate-800" dir="ltr">{order.paid_at ? new Date(order.paid_at).toLocaleString('en-US') : 'لم يتم الدفع'}</span>
              </div>
              {order.status === 'PENDING_PAYMENT' && (
                <div className="mt-4 pt-4 border-t">
                  <Link href={`/admin/operations/payments/confirm/${order.id}`} className="bg-emerald-600 text-white px-4 py-2 rounded text-center block hover:bg-emerald-700">
                    مراجعة وتأكيد الدفع
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 text-sm">لا توجد سجلات دفع لهذه الدعوة (نسخة مسودة).</div>
          )}
        </div>

        {/* Analytics & Media Summary */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-bold mb-4 border-b pb-2">البيانات والحالة (Health)</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">آخر حدث في مسار التحويل:</span>
              <span className="font-bold text-slate-800">{lastEvent ? lastEvent.event_name : 'No Telemetry'}</span>
            </div>
            {lastEvent && (
              <div className="flex justify-between">
                <span className="text-slate-500">وقت الحدث:</span>
                <span className="text-slate-800" dir="ltr">{new Date(lastEvent.created_at).toLocaleString('en-US')}</span>
              </div>
            )}
            <div className="mt-4 pt-4 border-t flex justify-between">
              <span className="text-slate-500">الصور / الوسائط المرفوعة:</span>
              <span className="font-bold text-slate-800">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {inv.data ? (Array.isArray((inv.data as any).gallery) ? (inv.data as any).gallery.length : 0) : 0} صور
              </span>
            </div>
          </div>
        </div>

        {/* Support Notes */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-lg font-bold">تذاكر الدعم (Support Cases)</h2>
            <Link href={`/admin/operations/support/new?invitation_id=${inv.id}${order ? `&order_id=${order.id}` : ''}`} className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded">
              إنشاء تذكرة
            </Link>
          </div>
          
          <SupportCasesList invitationId={inv.id} />
        </div>
      </div>
    </div>
  )
}

async function SupportCasesList({ invitationId }: { invitationId: string }) {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: cases } = await adminClient
    .from('support_cases')
    .select('id, subject, status, priority, last_activity_at')
    .eq('invitation_id', invitationId)
    .order('last_activity_at', { ascending: false })

  if (!cases || cases.length === 0) {
    return <div className="text-slate-500 text-sm">لا توجد تذاكر دعم فني مفتوحة لهذه الدعوة.</div>
  }

  return (
    <div className="space-y-3">
      {cases.map((c: any) => (
        <div key={c.id} className="border p-3 rounded-lg flex justify-between items-center text-sm">
          <div>
            <div className="font-semibold text-slate-800">{c.subject}</div>
            <div className="text-slate-500 text-xs mt-1">
              {c.status} • {c.priority} • {new Date(c.last_activity_at).toLocaleDateString('ar-SA')}
            </div>
          </div>
          <Link href={`/admin/operations/support/${c.id}`} className="text-amber-600 hover:underline">
            عرض
          </Link>
        </div>
      ))}
    </div>
  )
}
