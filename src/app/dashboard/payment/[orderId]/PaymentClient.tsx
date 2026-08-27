'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type PaymentOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  tracking_code: string | null;
  plan_snapshot: { name: string } | null;
  created_at: string;
}

export default function PaymentClient({ order, invitationId }: { order: PaymentOrder, invitationId: string }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const trackingCode = order.tracking_code
  const packageName = order.plan_snapshot?.name || 'Unknown'
  const currencyLabel = order.currency === 'IQD' ? 'د.ع' : order.currency
  const formattedAmount = Number(order.amount).toLocaleString()

  const handleCopy = () => {
    navigator.clipboard.writeText(order.tracking_code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const message = `مرحبا TIZKAR 👋
أريد إكمال دفع وتفعيل دعوتي.

رمز الطلب:
${trackingCode}

الباقة:
${packageName}

المبلغ:
${formattedAmount} ${currencyLabel}

الرجاء تزويدي بتفاصيل الدفع.`

  const encodedMessage = encodeURIComponent(message)
  const whatsappNumber = process.env.NEXT_PUBLIC_PAYMENT_WHATSAPP_NUMBER || '9647839073682'
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`

  return (
    <div className="bg-white rounded-3xl p-8 border border-border shadow-sm max-w-lg mx-auto text-center">
      <h2 className="text-3xl font-bold mb-8">إكمال الدفع</h2>

      <div className="space-y-4 mb-8 text-right bg-[#FAF8F3] p-6 rounded-2xl">
        <div className="flex justify-between items-center border-b border-border py-2">
          <span className="text-muted-foreground">الباقة</span>
          <span className="font-bold">{packageName}</span>
        </div>
        <div className="flex justify-between items-center border-b border-border py-2">
          <span className="text-muted-foreground">المبلغ</span>
          <span className="font-bold text-[#A88952]">{formattedAmount} {currencyLabel}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-muted-foreground">رمز الطلب</span>
          <span className="font-bold font-mono text-lg">{trackingCode}</span>
        </div>
      </div>

      <div className="mb-8">
        <Button 
          variant="outline" 
          onClick={handleCopy}
          className="w-full mb-4 rounded-xl"
        >
          {copied ? 'تم النسخ ✓' : 'نسخ رمز الطلب'}
        </Button>

        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          <Button className="w-full h-14 text-lg bg-[#25D366] hover:bg-[#25D366]/90 text-white rounded-xl shadow-lg shadow-[#25D366]/20 flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
            </svg>
            الدفع عبر واتساب
          </Button>
        </a>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        بعد إتمام الدفع، سيقوم فريق TIZKAR بمراجعة الطلب وتأكيده يدوياً.
      </p>

      <Button variant="ghost" onClick={() => router.push(`/editor/${invitationId}`)}>
        العودة للمحرر
      </Button>
    </div>
  )
}
