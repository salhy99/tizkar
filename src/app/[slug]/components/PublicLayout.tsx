'use client'

import React, { useState } from 'react'
import { InvitationData } from '@/components/templates/layali'
import { submitRSVP } from '@/actions/publicInvitation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

// We wrap the renderer to provide centered desktop view and inject the RSVP/Story interactive parts.
export default function PublicLayout({ 
  data, 
  invitationId,
  children 
}: { 
  data: InvitationData, 
  invitationId: string,
  children: React.ReactNode 
}) {
  const [rsvpState, setRsvpState] = useState<'IDLE' | 'SUBMITTING' | 'SUCCESS' | 'ERROR'>('IDLE')
  const [guestName, setGuestName] = useState('')
  const [companions, setCompanions] = useState(0)
  const [status, setStatus] = useState<'CONFIRMED' | 'MAYBE' | 'DECLINED'>('CONFIRMED')
  const [message, setMessage] = useState('')

  const handleRSVPSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestName) return
    setRsvpState('SUBMITTING')
    
    const res = await submitRSVP(invitationId, {
      name: guestName,
      companions,
      status,
      message
    })

    if (res.success) {
      setRsvpState('SUCCESS')
    } else {
      setRsvpState('ERROR')
    }
  }

  const shareOnWhatsApp = () => {
    const text = `السلام عليكم ورحمة الله وبركاته ❤️\n\nبكل حب نتشرف بدعوتكم لمشاركتنا فرحتنا في زفاف ${data.groomName} و${data.brideName} 💍\n\n📅 ${data.dateText || data.date}\n⏰ ${data.timeText || data.time}\n📍 ${data.venue?.name || 'قاعة الحفل'}\n\nحضوركم يسعدنا ويكمل فرحتنا ❤️\n\n🔗 الدعوة:\n${window.location.href}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    alert('تم نسخ الرابط بنجاح ✓')
  }

  const generateStory = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = '#FAF8F3'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Top/Bottom decorative borders
    ctx.fillStyle = '#A88952'
    ctx.globalAlpha = 0.1
    ctx.fillRect(0, 0, canvas.width, 300)
    ctx.fillRect(0, canvas.height - 300, canvas.width, 300)
    ctx.globalAlpha = 1.0

    // Text configuration
    ctx.textAlign = 'center'
    
    // Guest text
    ctx.font = 'bold 60px "Cairo", sans-serif'
    ctx.fillStyle = '#1C1C1C'
    ctx.fillText('يتشرف', canvas.width / 2, 600)
    
    ctx.font = 'bold 80px "Cairo", sans-serif'
    ctx.fillStyle = '#A88952'
    ctx.fillText(guestName, canvas.width / 2, 720)
    
    ctx.font = 'bold 60px "Cairo", sans-serif'
    ctx.fillStyle = '#1C1C1C'
    ctx.fillText('بتلبية دعوة', canvas.width / 2, 900)

    // Couple names
    ctx.font = 'bold 120px "Cairo", sans-serif'
    ctx.fillStyle = '#A88952'
    ctx.fillText(`${data.groomName} & ${data.brideName}`, canvas.width / 2, 1100)

    // Branding
    ctx.font = '40px "Cairo", sans-serif'
    ctx.fillStyle = '#777777'
    ctx.fillText('تِذكار - Tidkar.com', canvas.width / 2, 1750)

    // Download
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    const link = document.createElement('a')
    link.download = `story-${data.groomName}-${data.brideName}.jpg`
    link.href = dataUrl
    link.click()
  }

  // Inject RSVP and Share as children into the LayaliRenderer
  const rsvpAndShare = (
    <div className="bg-[#FAF8F3] px-6 py-16 border-t border-[#A88952]/10" dir="rtl">
      {/* RSVP Section */}
      <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-sm border border-border mb-12">
        <h3 className="text-2xl font-bold text-[#A88952] text-center mb-6">تأكيد الحضور</h3>
        
        {rsvpState === 'SUCCESS' ? (
          <div className="text-center space-y-6 animate-in zoom-in fade-in">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl">✓</div>
            <h4 className="text-xl font-bold">شكراً لك ❤️</h4>
            <p className="text-muted-foreground">تم تسجيل ردك بنجاح.</p>
            <Button variant="outline" className="w-full mt-4 border-[#A88952] text-[#A88952] hover:bg-[#A88952] hover:text-white" onClick={generateStory}>
              📸 إنشاء وتحميل ستوري للمناسبة
            </Button>
          </div>
        ) : (
          <form onSubmit={handleRSVPSubmit} className="space-y-6 text-right">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#1C1C1C]">الاسم الكريم</label>
              <Input required value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="اسمك الثنائي..." />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#1C1C1C]">هل ستتمكن من الحضور؟</label>
              <div className="grid grid-cols-3 gap-2">
                <Button type="button" variant={status === 'CONFIRMED' ? 'default' : 'outline'} className={status === 'CONFIRMED' ? 'bg-[#A88952] hover:bg-[#A88952]/90' : ''} onClick={() => setStatus('CONFIRMED')}>نعم</Button>
                <Button type="button" variant={status === 'MAYBE' ? 'default' : 'outline'} className={status === 'MAYBE' ? 'bg-[#A88952] hover:bg-[#A88952]/90' : ''} onClick={() => setStatus('MAYBE')}>ربما</Button>
                <Button type="button" variant={status === 'DECLINED' ? 'default' : 'outline'} className={status === 'DECLINED' ? 'bg-destructive hover:bg-destructive/90 text-white' : ''} onClick={() => setStatus('DECLINED')}>أعتذر</Button>
              </div>
            </div>

            {status !== 'DECLINED' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#1C1C1C]">عدد المرافقين (إن وجد)</label>
                <Input type="number" min="0" max="5" value={companions} onChange={e => setCompanions(parseInt(e.target.value) || 0)} />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#1C1C1C]">رسالة للعروسين (اختياري)</label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="ألف مبروك..." className="resize-none" rows={3} />
            </div>

            {rsvpState === 'ERROR' && (
              <div className="text-destructive text-sm text-center">حدث خطأ أثناء الإرسال. حاول مرة أخرى.</div>
            )}

            <Button type="submit" disabled={rsvpState === 'SUBMITTING'} className="w-full bg-[#A88952] hover:bg-[#A88952]/90 text-white h-12 text-lg rounded-xl">
              {rsvpState === 'SUBMITTING' ? 'جاري الإرسال...' : 'تأكيد'}
            </Button>
          </form>
        )}
      </div>

      {/* Share Section */}
      <div className="max-w-md mx-auto text-center space-y-4">
        <h3 className="text-xl font-bold text-[#1C1C1C]">مشاركة الدعوة</h3>
        <div className="flex flex-col gap-3">
          <Button onClick={shareOnWhatsApp} className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white h-12 rounded-xl text-lg">
            مشاركة عبر واتساب
          </Button>
          <Button onClick={copyLink} variant="outline" className="w-full h-12 rounded-xl text-lg border-border">
            نسخ الرابط
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#222] flex justify-center">
      <div className="w-full max-w-[480px] bg-white min-h-screen shadow-2xl relative overflow-x-hidden">
        {/* We use React.cloneElement to pass the rsvpAndShare as children if children is LayaliRenderer */}
        {React.isValidElement(children) 
          ? React.cloneElement(children as React.ReactElement<any>, { children: rsvpAndShare })
          : children}
      </div>
    </div>
  )
}
