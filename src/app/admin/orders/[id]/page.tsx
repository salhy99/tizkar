import { notFound } from 'next/navigation'
import AdminOrderActions from './AdminOrderActions'
import AdminRecoveryAction from './AdminRecoveryAction'

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
      approver:approved_by ( display_name )
    `)
    .eq('id', p.id)
    .single();

  if (!order) notFound()

  return (
    <div className="p-8 max-w-4xl mx-auto pb-24">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1C1C1C]">تفاصيل الطلب</h1>
          <p className="text-muted-foreground mt-2 font-mono text-sm">#{order.id}</p>
        </div>
        <div>
          {order.status === 'PAID' && <span className="bg-green-100 text-green-600 px-4 py-2 rounded-full font-bold">مدفوع</span>}
          {order.status === 'PENDING_PAYMENT' && <span className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full font-bold">بانتظار الدفع</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Customer Info */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <h3 className="text-xl font-bold text-[#A88952] border-b pb-4 mb-4">بيانات العميل</h3>
          <div className="flex justify-between">
            <span className="text-muted-foreground">الاسم / المالك</span>
            <span className="font-bold">{order.profiles?.display_name || 'زائر مجهول (Editor Session)'}</span>
          </div>
          {order.profiles?.phone && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">رقم الهاتف</span>
              <span className="font-bold text-left" dir="ltr">{order.profiles.phone}</span>
            </div>
          )}
          <div className="flex justify-between mt-4 border-t pt-4">
            <span className="text-muted-foreground">الدعوة المرتبطة</span>
            <span className="font-bold text-left text-sm">{order.invitations?.title || 'بدون عنوان'}</span>
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
            <span className="text-muted-foreground">المبلغ</span>
            <span className="font-bold">{Number(order.amount).toLocaleString()} {order.currency === 'IQD' ? 'د.ع' : order.currency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">الصلاحية</span>
            <span className="font-bold">{order.plan_snapshot?.duration_days} يوم</span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-4 md:col-span-2">
          <h3 className="text-xl font-bold text-[#A88952] border-b pb-4 mb-4">بيانات الدفع</h3>
          <div className="flex justify-between items-center p-4 bg-[#FAF8F3] rounded-xl border border-border mt-4">
            <span className="text-muted-foreground font-bold">رمز الطلب (Tracking Code)</span>
            <span className="text-2xl font-mono tracking-wider font-bold text-[#1C1C1C] select-all">{order.tracking_code}</span>
          </div>
          <div className="flex justify-between mt-4">
            <span className="text-muted-foreground">طريقة الدفع المسجلة</span>
            <span className="font-bold text-sm">{order.payment_method === 'WHATSAPP_MANUAL' ? 'تواصل واتساب (يدوي)' : order.payment_method}</span>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-muted-foreground">تاريخ تسجيل الطلب</span>
            <span className="font-bold text-sm">{new Date(order.created_at).toLocaleString('en-GB')}</span>
          </div>
        </div>

        {/* Status Info */}
        {order.status === 'PAID' && (
          <div className="bg-green-50 p-6 rounded-2xl border border-green-200 md:col-span-2 space-y-2">
            <h3 className="text-lg font-bold text-green-700 mb-2">معلومات تأكيد الدفع</h3>
            <div className="flex justify-between">
              <span className="font-bold">تم تأكيد الدفع بواسطة:</span>
              <span>{order.approver?.display_name || 'مدير النظام'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">تاريخ تأكيد الدفع:</span>
              <span>{order.paid_at ? new Date(order.paid_at).toLocaleString('en-GB') : '-'}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-green-200 text-center text-sm text-green-800">
              الدعوة مؤهلة للنشر الآن. النشر الفعلي يتم من قبل المالك.
            </div>
          </div>
        )}
      </div>

      {order.status === 'PENDING_PAYMENT' && (
        <AdminOrderActions orderId={order.id} />
      )}

      {/* Admin Assisted Recovery */}
      {order.invitation_id && (
        <AdminRecoveryAction invitationId={order.invitation_id} />
      )}
    </div>
  )
}
