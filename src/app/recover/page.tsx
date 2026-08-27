'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { recoverInvitation } from '@/actions/invitations'

export default function RecoverPage() {
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState<{ editLink: string, newRecoveryKey: string, invitationId: string } | null>(null)

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!key.trim()) return

    setLoading(true)
    setError('')
    
    try {
      const res = await recoverInvitation(key)
      if (res.success && res.newEditToken && res.newRecoveryKey && res.invitationId) {
        const editLink = `${window.location.origin}/edit/${res.invitationId}?token=${res.newEditToken}`
        setSuccessData({
          editLink,
          newRecoveryKey: res.newRecoveryKey,
          invitationId: res.invitationId
        })
      } else {
        setError(res.error || 'رمز الاسترداد غير صحيح أو لم يعد صالحاً.')
      }
    } catch {
      setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.')
    }
    setLoading(false)
  }

  if (successData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F3] p-4 text-right" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full space-y-6 border border-border/50">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h1 className="text-3xl font-bold text-center text-[#1C1C1C]">تم استرجاع الدعوة بنجاح</h1>
          
          <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-sm font-bold text-center">
            تم إلغاء الرابط ورمز الاسترداد القديمين.
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">رابط التعديل الجديد:</label>
              <div className="flex gap-2">
                <div className="bg-muted p-3 rounded-xl flex-1 break-all font-mono text-left text-xs select-all overflow-x-auto whitespace-nowrap">
                  {successData.editLink}
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText(successData.editLink)}
                  className="bg-primary/10 text-primary px-4 rounded-xl text-sm font-bold hover:bg-primary/20"
                >
                  نسخ
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-2">رمز الاسترداد الجديد:</label>
              <div className="flex gap-2">
                <div className="bg-muted p-3 rounded-xl flex-1 font-mono text-center text-sm select-all tracking-wider font-bold text-primary">
                  {successData.newRecoveryKey}
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText(successData.newRecoveryKey)}
                  className="bg-primary/10 text-primary px-4 rounded-xl text-sm font-bold hover:bg-primary/20"
                >
                  نسخ
                </button>
              </div>
            </div>
          </div>

          <a href={`/editor/${successData.invitationId}`} className="block w-full text-center bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary/90 transition-colors mt-6">
            فتح المحرر
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F3] p-4 text-right" dir="rtl">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">استرجاع دعوتي</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          أدخل رمز الاسترداد الخاص بدعوتك لاستعادتها والوصول إلى لوحة التحكم.
        </p>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-xl mb-6 text-sm font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleRecover} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">رمز الاسترداد</label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="مثال: TZK-RCV-XXXX-XXXX"
              className="h-12 text-center font-mono tracking-wider"
              dir="ltr"
            />
          </div>
          <Button 
            type="submit" 
            disabled={loading || !key.trim()}
            className="w-full h-12 text-lg bg-primary hover:bg-primary/90 text-white rounded-xl"
          >
            {loading ? 'جاري الاسترجاع...' : 'استرجاع الدعوة'}
          </Button>
        </form>
      </div>
    </div>
  )
}
