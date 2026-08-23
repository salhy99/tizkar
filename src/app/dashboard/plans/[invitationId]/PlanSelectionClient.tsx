'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrder } from '@/actions/payments'
import { Button } from '@/components/ui/button'

export default function PlanSelectionClient({ invitationId, plans }: { invitationId: string, plans: any[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleSelectPlan = async (plan: any) => {
    if (plan.price === 0) {
      alert('تم استخدام هذه الباقة للمعاينة مسبقاً في المحرر.')
      return
    }

    setLoadingId(plan.id)
    setError('')
    
    const res = await createOrder(invitationId, plan.id)
    
    if (res.success && res.orderId) {
      router.push(`/dashboard/payment/${res.orderId}`)
    } else {
      setError(res.error || 'حدث خطأ غير متوقع')
      setLoadingId(null)
    }
  }

  return (
    <div>
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-xl mb-8 text-center font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Mock Free Preview Plan for Display */}
        <div className="bg-white border border-border rounded-3xl p-6 flex flex-col shadow-sm opacity-70 relative">
          <div className="mb-4">
            <h3 className="text-xl font-bold">المعاينة المجانية</h3>
            <p className="text-sm text-muted-foreground mt-2">للتجربة والمعاينة فقط</p>
          </div>
          <div className="my-6">
            <span className="text-3xl font-bold">0</span>
            <span className="text-muted-foreground mr-1">د.ع</span>
          </div>
          <ul className="space-y-3 mb-8 flex-1 text-sm text-muted-foreground">
            <li>✓ استخدام المحرر</li>
            <li>✓ معاينة حية (مؤقتة)</li>
            <li>✗ لا يوجد نشر</li>
            <li>✗ لا يوجد رابط دعوة</li>
          </ul>
          <Button variant="outline" className="w-full rounded-xl cursor-not-allowed text-muted-foreground">
            مستخدمة حالياً
          </Button>
        </div>

        {plans.filter(p => p.price > 0).map((plan) => (
          <div key={plan.id} className={`bg-white border rounded-3xl p-6 flex flex-col shadow-sm relative transition-all hover:shadow-md ${plan.price === 60000 ? 'border-[#A88952] ring-2 ring-[#A88952]/20' : 'border-border'}`}>
            {plan.price === 60000 && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#A88952] text-white text-xs font-bold px-4 py-1 rounded-full">
                الأكثر اختياراً
              </div>
            )}
            <div className="mb-4">
              <h3 className="text-xl font-bold text-[#A88952]">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-2">يشمل نشر الدعوة لمدة {plan.duration_days} يوماً</p>
            </div>
            <div className="my-6">
              <span className="text-3xl font-bold">{plan.price.toLocaleString()}</span>
              <span className="text-muted-foreground mr-1">{plan.currency === 'IQD' ? 'د.ع' : plan.currency}</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1 text-sm text-[#1C1C1C]">
              <li>✓ جميع ميزات التصميم</li>
              <li>✓ رابط دعوة خاص</li>
              <li>✓ تأكيد الحضور (RSVP)</li>
              <li>✓ صور المعرض</li>
              {plan.price >= 40000 && <li>✓ الموسيقى الخلفية</li>}
              {plan.price >= 60000 && <li>✓ دعم فني مخصص</li>}
            </ul>
            <Button 
              onClick={() => handleSelectPlan(plan)}
              disabled={loadingId !== null}
              className={`w-full h-12 text-lg rounded-xl ${plan.price === 60000 ? 'bg-[#A88952] hover:bg-[#A88952]/90 text-white shadow-lg shadow-[#A88952]/20' : 'bg-primary hover:bg-primary/90 text-white'}`}
            >
              {loadingId === plan.id ? 'جاري التحضير...' : 'اختيار الباقة'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
