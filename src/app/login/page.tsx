'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { sendLoginOtp, verifyLoginOtp } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

function LoginContent() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [cooldown, setCooldown] = useState(0)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams?.get('redirect') || '/dashboard'

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cooldown > 0) return
    
    setError('')
    setSuccessMsg('')
    setLoading(true)
    
    // basic validation
    if (!phone || phone.length < 10) {
      setError('يرجى إدخال رقم هاتف صحيح')
      setLoading(false)
      return
    }

    try {
      const res = await sendLoginOtp(phone)
      if (res.success) {
        setStep(2)
        setCooldown(60)
        setSuccessMsg('تم إرسال رمز التحقق إلى رقمك')
      } else {
        setError(res.error || 'حدث خطأ أثناء إرسال الرمز')
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع')
    }
    setLoading(false)
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    if (!otp || otp.length !== 6) {
      setError('يرجى إدخال رمز التحقق المكون من 6 أرقام')
      setLoading(false)
      return
    }

    try {
      const res = await verifyLoginOtp(phone, otp)
      if (res.success) {
        router.push(redirect)
        router.refresh()
      } else {
        setError(res.error || 'رمز التحقق غير صحيح')
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع')
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-border">
      <div className="text-center mb-8">
        <Link href="/" className="inline-block text-3xl font-bold text-primary mb-2">تِذكار</Link>
        <h1 className="text-2xl font-bold">تسجيل الدخول</h1>
        <p className="text-muted-foreground mt-2">
          {step === 1 ? 'أدخل رقم هاتفك للمتابعة' : 'أدخل رمز التحقق المرسل إليك'}
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm mb-6 text-center">
          {error}
        </div>
      )}
      
      {successMsg && (
        <div className="bg-green-100 text-green-700 p-3 rounded-lg text-sm mb-6 text-center font-medium">
          {successMsg}
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleSendOtp} className="space-y-6">
          <div className="space-y-2 text-right">
            <label className="text-sm font-medium">رقم الهاتف</label>
            <Input 
              type="tel" 
              placeholder="مثال: +9647701234567" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)}
              className="text-left"
              dir="ltr"
            />
          </div>
          <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 text-white" disabled={loading || cooldown > 0}>
            {loading ? 'جاري الإرسال...' : (cooldown > 0 ? `يمكنك إعادة الإرسال بعد ${cooldown} ثانية` : 'إرسال رمز التحقق')}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div className="space-y-2 text-right">
            <label className="text-sm font-medium">رمز التحقق</label>
            <Input 
              type="text" 
              placeholder="123456" 
              value={otp} 
              onChange={(e) => setOtp(e.target.value)}
              className="text-center text-xl tracking-[0.5em]"
              dir="ltr"
              maxLength={6}
            />
          </div>
          <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 text-white" disabled={loading}>
            {loading ? 'جاري التحقق...' : 'تأكيد الرمز'}
          </Button>
          <div className="text-center space-y-3">
            <div>
              <button 
                type="button" 
                onClick={handleSendOtp} 
                disabled={cooldown > 0 || loading}
                className="text-sm text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {cooldown > 0 ? `يمكنك إعادة إرسال الرمز بعد ${cooldown} ثانية` : 'إعادة إرسال الرمز'}
              </button>
            </div>
            <div>
              <button type="button" onClick={() => { setStep(1); setOtp(''); setSuccessMsg(''); setError(''); }} className="text-sm text-muted-foreground hover:underline">
                تغيير رقم الهاتف
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#FAF8F3] flex items-center justify-center p-4">
      <Suspense fallback={<div>جاري التحميل...</div>}>
        <LoginContent />
      </Suspense>
    </main>
  )
}
