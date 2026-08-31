'use client'

import { useState, useTransition, useEffect } from 'react'
import { submitRsvp } from '@/actions/rsvps'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function RsvpForm({ invitationId }: { invitationId: string }) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'IDLE' | 'SUCCESS_ATTENDING' | 'SUCCESS_DECLINED'>('IDLE')
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Form State
  const [name, setName] = useState('')
  const [attendance, setAttendance] = useState<'ATTENDING' | 'DECLINED'>('ATTENDING')
  const [guestCount, setGuestCount] = useState('1')
  const [message, setMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      const res = await submitRsvp(invitationId, {
        guest_name: name,
        attendance_status: attendance,
        guest_count: attendance === 'ATTENDING' ? parseInt(guestCount) : 0,
        message
      })

      if (res.error) {
        setError(res.error)
      } else {
        if (attendance === 'ATTENDING') {
          setStatus('SUCCESS_ATTENDING')
        } else {
          setStatus('SUCCESS_DECLINED')
        }
      }
    })
  }

  if (status === 'SUCCESS_ATTENDING') {
    return (
      <div className="py-12 px-8 text-center bg-white rounded-3xl shadow-sm border border-[#A88952]/20 max-w-md mx-auto my-12 animate-in fade-in zoom-in">
        <div className="text-5xl mb-4">🤍</div>
        <h3 className="text-2xl font-bold text-[#A88952] mb-2">شكراً لك</h3>
        <p className="text-[#1C1C1C]">تم تسجيل حضورك بنجاح، ننتظرك بكل حب.</p>
      </div>
    )
  }

  if (status === 'SUCCESS_DECLINED') {
    return (
      <div className="py-12 px-8 text-center bg-white rounded-3xl shadow-sm border border-[#A88952]/20 max-w-md mx-auto my-12 animate-in fade-in zoom-in">
        <div className="text-5xl mb-4">✨</div>
        <h3 className="text-2xl font-bold text-[#A88952] mb-2">شكراً لإبلاغنا</h3>
        <p className="text-[#1C1C1C]">نتمنى أن نراك في مناسباتنا القادمة.</p>
      </div>
    )
  }

  return (
    <div className="py-12 px-6 sm:px-8 text-center bg-white rounded-3xl shadow-sm border border-[#A88952]/20 max-w-md mx-auto my-12" id="rsvp" data-hydrated={mounted}>
      <h3 className="text-2xl font-bold text-[#A88952] mb-6">هل ستشاركنا فرحتنا؟</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6 text-right">
        <div className="space-y-2">
          <label className="text-sm font-bold text-[#777777]">الاسم الكريم</label>
          <Input 
            required 
            placeholder="مثال: أحمد محمد" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="h-12 border-[#A88952]/30 focus-visible:ring-[#A88952]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-[#777777]">الحضور</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setAttendance('ATTENDING')}
              className={`h-12 rounded-xl border-2 transition-all font-bold ${
                attendance === 'ATTENDING' 
                  ? 'border-[#A88952] bg-[#A88952]/10 text-[#A88952]' 
                  : 'border-border text-muted-foreground hover:border-[#A88952]/30'
              }`}
            >
              سأحضر بالتأكيد
            </button>
            <button
              type="button"
              onClick={() => setAttendance('DECLINED')}
              className={`h-12 rounded-xl border-2 transition-all font-bold ${
                attendance === 'DECLINED' 
                  ? 'border-red-500 bg-red-50 text-red-600' 
                  : 'border-border text-muted-foreground hover:border-red-200'
              }`}
            >
              أعتذر عن الحضور
            </button>
          </div>
        </div>

        {attendance === 'ATTENDING' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
            <label className="text-sm font-bold text-[#777777]">عدد الحضور الإجمالي (بمن فيهم أنت)</label>
            <Input 
              type="number" 
              min="1" 
              max="10" 
              required 
              value={guestCount} 
              onChange={e => setGuestCount(e.target.value)} 
              className="h-12 border-[#A88952]/30 focus-visible:ring-[#A88952]"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-bold text-[#777777]">رسالة تهنئة (اختياري)</label>
          <Textarea 
            placeholder="اكتب أمنياتك أو تهنئتك هنا..." 
            value={message} 
            onChange={e => setMessage(e.target.value)}
            className="min-h-[100px] resize-none border-[#A88952]/30 focus-visible:ring-[#A88952]"
            maxLength={500}
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm font-bold text-center bg-red-50 p-3 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <Button 
          type="submit" 
          disabled={isPending}
          className="w-full h-14 bg-[#A88952] hover:bg-[#A88952]/90 text-white font-bold text-lg rounded-xl shadow-lg"
        >
          {isPending ? 'جاري الإرسال...' : 'تأكيد الرد'}
        </Button>
      </form>
    </div>
  )
}
