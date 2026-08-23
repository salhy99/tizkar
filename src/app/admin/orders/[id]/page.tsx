import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AdminOrderActions from './AdminOrderActions'

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params
  const { createClient: createAdmin } = await import('@supabase/supabase-js')
  const adminClient = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: order } = await adminClient
    .from('orders')
    .select(`
      *,
      profiles:user_id ( display_name, phone ),
      invitations ( title, slug, status, expires_at ),
      payments ( transaction_reference, status, created_at ),
      approver:approved_by ( display_name ),
      rejecter:rejected_by ( display_name )
    `)
    .eq('id', p.id)
    .single() as any;

  if (!order) notFound()
  
  const payment = order.payments?.[0]

  return (
    <div className="p-8 max-w-4xl mx-auto pb-24">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1C1C1C]">تفاصيل الطلب</h1>
          <p className="text-muted-foreground mt-2 font-mono text-sm">#{order.id}</p>
        </div>
        <div>
          {order.status === 'PENDING_REVIEW' && <span className="bg-orange-100 text-orange-600 px-4 py-2 rounded-full font-bold">بانتظار المراجعة</span>}
          {order.status === 'APPROVED' && <span className="bg-green-100 text-green-600 px-4 py-2 rounded-full font-bold">مقبول</span>}
          {order.status === 'REJECTED' && <span className="bg-red-100 text-red-600 px-4 py-2 rounded-full font-bold">مرفوض</span>}
          {order.status === 'PENDING_PAYMENT' && <span className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full font-bold">بانتظار الدفع</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Customer Info */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <h3 className="text-xl font-bold text-[#A88952] border-b pb-4 mb-4">بيانات العميل</h3>
          <div className="flex justify-between">
            <span className="text-muted-foreground">الاسم</span>
            <span className="font-bold">{order.profiles?.display_name || 'غير متوفر'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">رقم الهاتف</span>
            <span className="font-bold text-left" dir="ltr">{order.profiles?.phone || 'غير متوفر'}</span>
          </div>
        </div>

        {/* Order Info */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <h3 className="text-xl font-bold text-[#A88952] border-b pb-4 mb-4">بيانات الباقة</h3>
          <div className="flex justify-between">
            <span className="text-muted-foreground">الباقة</span>
            <span className="font-bold">{order.plan_snapshot?.name || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">المبلغ المدفوع</span>
            <span className="font-bold">{Number(order.amount).toLocaleString()} {order.currency === 'IQD' ? 'د.ع' : order.currency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">الصلاحية</span>
            <span className="font-bold">{order.plan_snapshot?.duration_days} يوم</span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-4 md:col-span-2">
          <h3 className="text-xl font-bold text-[#A88952] border-b pb-4 mb-4">بيانات الدفع (KICard)</h3>
          {payment ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">تاريخ تسجيل الدفعة</span>
                <span className="font-bold text-sm">{new Date(payment.created_at).toLocaleString('en-GB')}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-[#FAF8F3] rounded-xl border border-border mt-4">
                <span className="text-muted-foreground font-bold">رقم العملية (المرجع)</span>
                <span className="text-2xl font-mono tracking-wider font-bold text-[#1C1C1C] select-all">{payment.transaction_reference}</span>
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground py-4">لم يتم تقديم بيانات الدفع بعد</div>
          )}
        </div>

        {/* Status Info */}
        {order.status === 'REJECTED' && (
          <div className="bg-destructive/10 p-6 rounded-2xl border border-destructive/20 md:col-span-2 space-y-2">
            <h3 className="text-lg font-bold text-destructive mb-2">معلومات الرفض</h3>
            <div className="flex justify-between">
              <span className="font-bold">تم الرفض بواسطة:</span>
              <span>{order.rejecter?.display_name || 'مدير النظام'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">تاريخ الرفض:</span>
              <span>{order.rejected_at ? new Date(order.rejected_at).toLocaleString('en-GB') : '-'}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-destructive/20">
              <span className="font-bold block mb-2">سبب الرفض:</span>
              <p className="text-destructive font-bold">{order.rejection_reason}</p>
            </div>
          </div>
        )}

        {order.status === 'APPROVED' && (
          <div className="bg-green-50 p-6 rounded-2xl border border-green-200 md:col-span-2 space-y-2">
            <h3 className="text-lg font-bold text-green-700 mb-2">معلومات القبول</h3>
            <div className="flex justify-between">
              <span className="font-bold">تم القبول بواسطة:</span>
              <span>{order.approver?.display_name || 'مدير النظام'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">تاريخ النشر:</span>
              <span>{order.approved_at ? new Date(order.approved_at).toLocaleString('en-GB') : '-'}</span>
            </div>
            <div className="flex justify-between text-red-600 mt-2">
              <span className="font-bold">تاريخ الانتهاء:</span>
              <span>{order.invitations?.expires_at ? new Date(order.invitations.expires_at).toLocaleString('en-GB') : '-'}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-green-200 text-center">
              <a href={`/${order.invitations?.slug}`} target="_blank" rel="noopener noreferrer" className="text-green-700 font-bold underline">
                عرض الدعوة المنشورة
              </a>
            </div>
          </div>
        )}
      </div>

      {order.status === 'PENDING_REVIEW' && (
        <AdminOrderActions orderId={order.id} transactionRef={payment?.transaction_reference} />
      )}
    </div>
  )
}
