'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { suspendInvitation } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function AdminInvitationsClient({ invitations }: { invitations: any[] }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [suspendId, setSuspendId] = useState<string | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filtered = invitations.filter(i => 
    i.title?.includes(searchTerm) || 
    i.profiles?.display_name?.includes(searchTerm) || 
    i.profiles?.phone?.includes(searchTerm)
  )

  const handleSuspend = async () => {
    if (!suspendReason.trim() || suspendReason.length < 5) {
      setError('يرجى كتابة سبب الإيقاف')
      return
    }

    setLoading(true)
    setError('')
    
    const res = await suspendInvitation(suspendId!, suspendReason)
    if (res.success) {
      alert('تم إيقاف الدعوة بنجاح')
      setSuspendId(null)
      setSuspendReason('')
      router.refresh()
    } else {
      setError(res.error || 'حدث خطأ')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      
      <div className="flex gap-4 mb-6 max-w-md">
        <Input 
          placeholder="بحث عن دعوة، اسم العميل، أو الهاتف..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          className="bg-white rounded-xl h-12"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-[#FAF8F3] border-b border-border text-sm text-muted-foreground">
              <tr>
                <th className="p-4 font-normal">عنوان الدعوة</th>
                <th className="p-4 font-normal">العميل</th>
                <th className="p-4 font-normal">الحالة</th>
                <th className="p-4 font-normal text-center">الرابط</th>
                <th className="p-4 font-normal">تاريخ الإنشاء</th>
                <th className="p-4 font-normal text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold text-[#1C1C1C] truncate max-w-[200px]" title={inv.title}>{inv.title}</td>
                  <td className="p-4">
                    <div className="font-bold">{inv.profiles?.display_name || 'بدون اسم'}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">{inv.profiles?.phone}</div>
                  </td>
                  <td className="p-4">
                    {inv.status === 'PUBLISHED' && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">منشورة</span>}
                    {inv.status === 'DRAFT' && <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">مسودة</span>}
                    {inv.status === 'PENDING_APPROVAL' && <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">للمراجعة</span>}
                    {inv.status === 'PENDING_PAYMENT' && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">للدفع</span>}
                    {inv.status === 'SUSPENDED' && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">موقوفة</span>}
                    {inv.status === 'REJECTED' && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">مرفوضة</span>}
                  </td>
                  <td className="p-4 text-center">
                    {(inv.status === 'PUBLISHED' || inv.status === 'SUSPENDED') && (
                      <a href={`/${inv.slug}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                        عرض
                      </a>
                    )}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{new Date(inv.created_at).toLocaleDateString('en-GB')}</td>
                  <td className="p-4 text-center">
                    {inv.status !== 'SUSPENDED' && (
                      <Button variant="outline" size="sm" onClick={() => setSuspendId(inv.id)} className="text-red-600 border-red-200 hover:bg-red-50">
                        إيقاف
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">لا توجد نتائج</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {suspendId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-2 text-destructive">إيقاف الدعوة</h3>
            <p className="text-sm text-muted-foreground mb-6">سيتم إيقاف ظهور هذه الدعوة للعامة فوراً. يرجى كتابة السبب للإدارة (أو للعميل).</p>
            
            {error && <div className="bg-destructive/10 text-destructive text-sm font-bold p-3 rounded-lg mb-4">{error}</div>}

            <Textarea 
              placeholder="اكتب سبب الإيقاف هنا..." 
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              className="mb-6 h-24 resize-none"
            />
            
            <div className="flex gap-4">
              <Button onClick={handleSuspend} disabled={loading} className="flex-1 bg-destructive hover:bg-destructive/90 text-white rounded-xl">
                {loading ? 'جاري الإيقاف...' : 'تأكيد الإيقاف'}
              </Button>
              <Button onClick={() => {setSuspendId(null); setError(''); setSuspendReason('');}} variant="outline" className="flex-1 rounded-xl">
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
