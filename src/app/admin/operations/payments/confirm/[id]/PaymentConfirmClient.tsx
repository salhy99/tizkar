'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminConfirmManualPayment } from '@/actions/payments'

export default function PaymentConfirmClient({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleConfirm = async () => {
    if (!window.confirm('هل أنت متأكد من استلام المبلغ وتأكيد الطلب؟ هذا الإجراء لا يمكن التراجع عنه بسهولة.')) {
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const res = await adminConfirmManualPayment(orderId)
      if (res.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/admin/operations/payments')
          router.refresh()
        }, 1500)
      } else {
        setError(res.error || 'حدث خطأ غير معروف')
        setLoading(false)
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'فشل الاتصال بالخادم')
      } else {
        setError('فشل الاتصال بالخادم')
      }
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-emerald-50 text-emerald-800 p-4 rounded text-center font-bold">
        تم تأكيد الدفع بنجاح! جاري التوجيه...
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-4 text-sm">
          {error}
        </div>
      )}
      
      <button 
        onClick={handleConfirm}
        disabled={loading}
        className="w-full bg-emerald-600 text-white font-bold py-4 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
      >
        {loading ? 'جاري التأكيد...' : 'تأكيد استلام المبلغ (Confirm Payment)'}
      </button>
      
      <p className="text-xs text-slate-500 text-center mt-4">
        سيتم تحديث حالة الطلب وتسجيل الإجراء في سجل التدقيق (Audit Log).
      </p>
    </div>
  )
}
