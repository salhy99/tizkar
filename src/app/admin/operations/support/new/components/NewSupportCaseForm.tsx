'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupportCase } from '@/actions/support'

export default function NewSupportCaseForm({ defaultInvitationId, defaultOrderId }: { defaultInvitationId: string, defaultOrderId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    subject: '',
    category: 'OTHER',
    priority: 'NORMAL',
    invitation_id: defaultInvitationId,
    order_id: defaultOrderId,
    initialNote: ''
  })
  
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await createSupportCase(formData as any)
    if (res.success && res.case) {
      router.push(`/admin/operations/support/${res.case.id}`)
    } else {
      setError(res.error || 'حدث خطأ غير متوقع')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-semibold mb-1">الموضوع (Subject) <span className="text-red-500">*</span></label>
        <input 
          required 
          maxLength={200}
          type="text" 
          value={formData.subject}
          onChange={e => setFormData({ ...formData, subject: e.target.value })}
          className="w-full border p-2 rounded text-slate-800"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">التصنيف (Category) <span className="text-red-500">*</span></label>
          <select 
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
            className="w-full border p-2 rounded text-slate-800"
          >
            <option value="PAYMENT">PAYMENT</option>
            <option value="RECOVERY">RECOVERY</option>
            <option value="EDITOR">EDITOR</option>
            <option value="MEDIA">MEDIA</option>
            <option value="PUBLISH">PUBLISH</option>
            <option value="RSVP">RSVP</option>
            <option value="ACCOUNT">ACCOUNT</option>
            <option value="TECHNICAL">TECHNICAL</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">الأولوية (Priority) <span className="text-red-500">*</span></label>
          <select 
            value={formData.priority}
            onChange={e => setFormData({ ...formData, priority: e.target.value })}
            className="w-full border p-2 rounded text-slate-800"
          >
            <option value="LOW">LOW</option>
            <option value="NORMAL">NORMAL</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">معرف الدعوة (اختياري)</label>
          <input 
            type="text" 
            placeholder="UUID..."
            value={formData.invitation_id}
            onChange={e => setFormData({ ...formData, invitation_id: e.target.value })}
            className="w-full border p-2 rounded text-slate-800 font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">معرف الطلب (اختياري)</label>
          <input 
            type="text" 
            placeholder="UUID..."
            value={formData.order_id}
            onChange={e => setFormData({ ...formData, order_id: e.target.value })}
            className="w-full border p-2 rounded text-slate-800 font-mono text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">تفاصيل أولية (Initial Note)</label>
        <div className="text-xs text-red-500 mb-2 font-semibold">تنبيه الخصوصية: لا تضع مفاتيح الاستعادة أو رموز التعديل أو كلمات المرور داخل الملاحظات.</div>
        <textarea 
          rows={5}
          value={formData.initialNote}
          onChange={e => setFormData({ ...formData, initialNote: e.target.value })}
          className="w-full border p-2 rounded text-slate-800 text-sm"
        />
      </div>

      <div className="flex justify-end pt-4">
        <button 
          type="submit" 
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-6 rounded disabled:opacity-50"
        >
          {loading ? 'جاري الإنشاء...' : 'إنشاء التذكرة'}
        </button>
      </div>
    </form>
  )
}
