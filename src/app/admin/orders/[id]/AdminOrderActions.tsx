'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { approveOrder, rejectOrder } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export default function AdminOrderActions({ orderId, transactionRef }: { orderId: string, transactionRef?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')

  const handleApprove = async () => {
    if (!confirm('هل أنت متأكد من قبول هذا الطلب ونشر الدعوة؟\nيجب التأكد من وصول الحوالة فعلياً بهذا الرقم: ' + transactionRef)) return;
    
    setLoading(true)
    setError('')
    
    const res = await approveOrder(orderId)
    
    if (res.success) {
      alert('تم قبول الطلب ونشر الدعوة بنجاح.')
      router.refresh()
    } else {
      setError(res.error || 'حدث خطأ')
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!reason.trim() || reason.length < 5) {
      setError('يرجى كتابة سبب واضح للرفض')
      return
    }

    setLoading(true)
    setError('')
    
    const res = await rejectOrder(orderId, reason)
    
    if (res.success) {
      alert('تم رفض الطلب بنجاح.')
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

      {!showReject ? (
        <div className="flex flex-col md:flex-row gap-4">
          <Button 
            onClick={handleApprove}
            disabled={loading || !transactionRef}
            className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700 text-white rounded-xl"
          >
            {loading ? 'جاري المعالجة...' : 'قبول الطلب ونشر الدعوة'}
          </Button>
          <Button 
            onClick={() => setShowReject(true)}
            disabled={loading}
            variant="outline"
            className="flex-1 h-14 text-lg border-destructive text-destructive hover:bg-destructive hover:text-white rounded-xl"
          >
            رفض الطلب
          </Button>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
          <label className="block font-bold">سبب الرفض (سيظهر للعميل)</label>
          <Textarea 
            value={reason} 
            onChange={(e) => setReason(e.target.value)} 
            placeholder="مثال: رقم العملية غير صحيح، لم تصل الحوالة..." 
            className="resize-none h-24"
          />
          <div className="flex gap-4">
            <Button 
              onClick={handleReject}
              disabled={loading}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-white rounded-xl"
            >
              {loading ? 'جاري الرفض...' : 'تأكيد الرفض'}
            </Button>
            <Button 
              onClick={() => { setShowReject(false); setError(''); }}
              disabled={loading}
              variant="outline"
              className="flex-1 rounded-xl"
            >
              إلغاء
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
