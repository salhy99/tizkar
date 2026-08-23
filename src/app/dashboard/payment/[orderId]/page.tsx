import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PaymentClient from './PaymentClient'

export default async function PaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  const p = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch Order
  const { data: order } = await supabase
    .from('orders')
    .select('*, invitations(title)')
    .eq('id', p.orderId)
    .single() as any;

  if (!order || order.user_id !== user.id) {
    notFound()
  }

  // If already under review, approved, or cancelled, redirect to dashboard or order status
  if (order.status !== 'PENDING_PAYMENT' && order.status !== 'REJECTED') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#FAF8F3] py-16 px-4" dir="rtl">
      <div className="container mx-auto max-w-4xl">
        
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-[#1C1C1C] mb-2">الدفع وتفعيل الدعوة</h1>
          <p className="text-muted-foreground">قم بإتمام الدفع لطلبك رقم #{order.id.split('-')[0].toUpperCase()}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          
          {/* Order Summary */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-border shadow-sm">
            <h3 className="text-xl font-bold text-[#A88952] mb-6">ملخص الطلب</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">الدعوة</span>
                <span className="font-bold">{order.invitations?.title}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">الباقة المختارة</span>
                <span className="font-bold">{order.plan_snapshot?.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">الصلاحية</span>
                <span className="font-bold">{order.plan_snapshot?.duration_days} يوماً</span>
              </div>
              <div className="flex justify-between items-center py-4 text-lg">
                <span className="font-bold">المبلغ الإجمالي</span>
                <span className="font-bold text-[#A88952]">{Number(order.amount).toLocaleString()} {order.currency === 'IQD' ? 'د.ع' : order.currency}</span>
              </div>
            </div>

            {order.status === 'REJECTED' && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-sm mb-4">
                <div className="font-bold mb-1">سبب رفض الدفعة السابقة:</div>
                {order.rejection_reason || 'غير محدد'}
              </div>
            )}
          </div>

          {/* Payment Form */}
          <div className="lg:col-span-3 bg-white rounded-3xl p-8 border border-[#A88952]/30 shadow-lg shadow-[#A88952]/5">
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-4">الدفع عبر بطاقة كي كارد (KICard)</h3>
              <p className="text-muted-foreground mb-6">يرجى تحويل المبلغ المذكور إلى رقم البطاقة أدناه، ثم إدخال رقم العملية (المرجع) لتأكيد الدفع.</p>
              
              <div className="bg-[#FAF8F3] p-6 rounded-2xl border border-border text-center">
                <div className="text-sm text-muted-foreground mb-2">رقم البطاقة (ZainCash / KICard)</div>
                <div className="text-3xl font-bold tracking-widest text-[#1C1C1C] mb-2 font-mono" dir="ltr">6032 1234 5678 9012</div>
                <div className="text-sm font-bold text-[#A88952]">باسم: شركة تذكار للخدمات الرقمية</div>
              </div>
            </div>

            <PaymentClient orderId={order.id} />
            
          </div>
        </div>

      </div>
    </div>
  )
}
