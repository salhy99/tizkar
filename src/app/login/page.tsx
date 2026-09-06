'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginWithName } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

function LoginContent() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams?.get('redirect') || '/dashboard'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    
    setError('')
    setLoading(true)
    
    if (!name.trim() || !password) {
      setError('يرجى إدخال الاسم وكلمة المرور')
      setLoading(false)
      return
    }

    try {
      const res = await loginWithName(name, password)
      if (res.success) {
        router.push(redirect)
        router.refresh()
      } else {
        setError(res.error || 'الاسم أو كلمة المرور غير صحيحة')
      }
    } catch {
      setError('حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-border">
      <div className="text-center mb-8">
        <Link href="/" className="inline-block text-3xl font-bold text-primary mb-2">تِذكار</Link>
        <h1 className="text-2xl font-bold">تسجيل الدخول</h1>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm mb-6 text-center" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-2 text-right">
          <label htmlFor="name" className="text-sm font-medium">الاسم</label>
          <Input 
            id="name"
            type="text" 
            placeholder="أدخل اسمك" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            className="text-right"
            dir="rtl"
            autoComplete="name"
            disabled={loading}
            required
          />
        </div>
        
        <div className="space-y-2 text-right">
          <label htmlFor="password" className="text-sm font-medium">كلمة المرور</label>
          <div className="relative">
            <Input 
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="text-left pr-10"
              dir="ltr"
              autoComplete="current-password"
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="text-right">
          <button 
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => alert('يرجى التواصل مع الإدارة لاستعادة كلمة المرور.')}
          >
            نسيت كلمة المرور؟
          </button>
        </div>

        <Button 
          type="submit" 
          className="w-full h-12 bg-primary hover:bg-primary/90 text-white" 
          disabled={loading}
        >
          {loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
        </Button>

        <div className="text-center">
          <Link href="/register" className="text-sm text-primary hover:underline">
            ليس لديك حساب؟ إنشاء حساب جديد
          </Link>
        </div>
      </form>
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
