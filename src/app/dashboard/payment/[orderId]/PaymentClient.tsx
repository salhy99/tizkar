'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitPayment } from '@/actions/payments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function PaymentClient({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const cleanRef = reference.trim()
    if (!cleanRef) {
      setError('يرجى إدخال رقم العملية')
      return
    }

    setLoading(true)
    setError('')

    const res = await submitPayment(orderId, cleanRef)

    if (res.success) {
      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)
    } else {
      setError(res.error || 'حدث خطأ غير متوقع')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8 animate-in fade-in zoom-in">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-4xl mb-6">✓</div>
        <h3 className="text-2xl font-bold mb-4">تم إرسال طلب الدفع بنجاح</h3>
        <p className="text-muted-foreground">سيتم مراجعة الدفع وتفعيل دعوتك بعد الموافقة.</p>
        <p className="text-sm text-muted-foreground mt-4">جاري تحويلك للوحة التحكم...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-xl text-sm font-bold">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-bold mb-2">رقم العملية (Reference Number) *</label>
        <Input 
          required 
          value={reference} 
          onChange={e => setReference(e.target.value)} 
          placeholder="أدخل رقم العملية المكون من أرقام أو أحرف..." 
          className="h-14 text-lg font-mono"
          dir="ltr"
        />
        <p className="text-xs text-muted-foreground mt-2">ستجده في رسالة تأكيد التحويل في تطبيق المحفظة.</p>
      </div>

      <Button 
        type="submit" 
        disabled={loading} 
        className="w-full h-14 text-lg bg-[#A88952] hover:bg-[#A88952]/90 text-white rounded-xl shadow-lg shadow-[#A88952]/20"
      >
        {loading ? 'جاري الإرسال...' : 'إرسال طلب الدفع'}
      </Button>
    </form>
  )
}
