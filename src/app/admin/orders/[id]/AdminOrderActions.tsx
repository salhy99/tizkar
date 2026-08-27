'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminConfirmManualPayment } from '@/actions/payments'
import { Button } from '@/components/ui/button'

export default function AdminOrderActions({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirmPayment = async () => {
    if (!confirm('هل أنت متأكد من تأكيد استلام الدفعة لهذا الطلب؟\n(هذا الإجراء سيجعل الدعوة قابلة للنشر)')) return;
    
    setLoading(true)
    setError('')
    
    const res = await adminConfirmManualPayment(orderId)
    
    if (res.success) {
      alert('تم تأكيد الدفع بنجاح.')
      router.refresh()
    } else {
      setError(res.error || 'حدث خطأ')
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 bg-white p-8 rounded-2xl border border-border shadow-lg">
      <h3 className="text-xl font-bold mb-6">إجراءات المراجعة</h3>
      
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl mb-6 font-bold">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <Button 
          onClick={handleConfirmPayment}
          disabled={loading}
          className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700 text-white rounded-xl"
        >
          {loading ? 'جاري المعالجة...' : 'تأكيد استلام الدفعة'}
        </Button>
      </div>
    </div>
  )
}
