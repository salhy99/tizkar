'use client'

import React, { useState } from 'react'
import { adminRotateInvitationCredentials } from '@/actions/admin'
import { Button } from '@/components/ui/button'

export default function AdminRecoveryAction({ invitationId }: { invitationId: string }) {
  const [loading, setLoading] = useState(false)
  const [credentials, setCredentials] = useState<{ editLink: string, recoveryKey: string } | null>(null)

  const handleRotate = async () => {
    if (!confirm('تحذير: سيؤدي هذا إلى إلغاء رابط التعديل ورمز الاسترداد الحاليين وإصدار بيانات جديدة. هل تريد الاستمرار وإرسالها للعميل؟')) return;
    
    setLoading(true)
    
    const res = await adminRotateInvitationCredentials(invitationId)
    
    if (res.success && res.newEditToken && res.newRecoveryKey) {
      const editLink = `${window.location.origin}/edit/${invitationId}?token=${res.newEditToken}`
      setCredentials({ editLink, recoveryKey: res.newRecoveryKey })
    } else {
      alert(res.error || 'حدث خطأ')
    }
    setLoading(false)
  }

  if (credentials) {
    return (
      <div className="mt-8 bg-amber-50 p-6 rounded-2xl border border-amber-200">
        <h3 className="text-xl font-bold mb-4 text-amber-800">بيانات الاسترداد الجديدة (عرض لمرة واحدة)</h3>
        <p className="text-sm font-bold text-destructive mb-4">انسخ هذه البيانات وأرسلها للعميل عبر واتساب. لن تظهر هذه الشاشة مرة أخرى.</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">رابط التعديل الجديد</label>
            <div className="bg-white p-3 rounded-xl break-all font-mono text-sm select-all border border-amber-200">
              {credentials.editLink}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">رمز الاسترداد الجديد</label>
            <div className="bg-white p-3 rounded-xl font-mono text-center tracking-wider text-sm font-bold text-primary select-all border border-amber-200">
              {credentials.recoveryKey}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8 bg-white p-6 rounded-2xl border border-border shadow-sm space-y-4">
      <h3 className="text-xl font-bold text-destructive border-b pb-4">المساعدة في الاسترداد (Admin-Assisted Recovery)</h3>
      <p className="text-sm text-muted-foreground">
        استخدم هذا الخيار فقط في حالة فقدان العميل لرابط التعديل ورمز الاسترداد الخاصين به، وبعد التأكد يدوياً من هويته عبر واتساب.
      </p>
      <Button 
        onClick={handleRotate}
        disabled={loading}
        variant="outline"
        className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white"
      >
        {loading ? 'جاري المعالجة...' : 'إصدار بيانات استرداد جديدة'}
      </Button>
    </div>
  )
}
