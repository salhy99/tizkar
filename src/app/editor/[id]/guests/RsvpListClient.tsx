'use client'

import { useState } from 'react'
import { deleteRsvp } from '@/actions/rsvps'
import { Button } from '@/components/ui/button'

type Rsvp = {
  id: string;
  guest_name: string;
  status: string;
  companions: number | null;
  message: string | null;
  created_at: string;
}

export default function RsvpListClient({ initialData, invitationId }: { initialData: Rsvp[], invitationId: string }) {
  const [rsvps, setRsvps] = useState(initialData)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleDelete = async (rsvpId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الرد؟')) return
    setIsDeleting(rsvpId)

    const res = await deleteRsvp(invitationId, rsvpId)
    if (res.success) {
      setRsvps(prev => prev.filter(r => r.id !== rsvpId))
    } else {
      alert(res.error || 'حدث خطأ أثناء الحذف')
    }
    
    setIsDeleting(null)
  }

  if (rsvps.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        لا يوجد أي ردود مسجلة حتى الآن.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right">
        <thead className="bg-gray-50 border-b border-border">
          <tr>
            <th className="p-4 font-bold text-[#777777]">اسم الضيف</th>
            <th className="p-4 font-bold text-[#777777]">الحالة</th>
            <th className="p-4 font-bold text-[#777777]">العدد</th>
            <th className="p-4 font-bold text-[#777777]">رسالة التهنئة</th>
            <th className="p-4 font-bold text-[#777777]">التاريخ</th>
            <th className="p-4 font-bold text-[#777777]">خيارات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rsvps.map(rsvp => (
            <tr key={rsvp.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="p-4 font-bold text-[#1C1C1C] whitespace-nowrap">
                {rsvp.guest_name}
              </td>
              <td className="p-4 whitespace-nowrap">
                {rsvp.status === 'CONFIRMED' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                    سيحضر
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                    مُعتذر
                  </span>
                )}
              </td>
              <td className="p-4 font-bold whitespace-nowrap">
                {rsvp.status === 'CONFIRMED' ? rsvp.companions : '-'}
              </td>
              <td className="p-4 min-w-[200px]">
                {rsvp.message ? (
                  <p className="text-sm text-[#777777] break-words whitespace-pre-wrap">{rsvp.message}</p>
                ) : (
                  <span className="text-sm text-gray-400 italic">لا يوجد رسالة</span>
                )}
              </td>
              <td className="p-4 text-sm text-[#777777] whitespace-nowrap">
                {new Date(rsvp.created_at).toLocaleDateString('ar-IQ')}
              </td>
              <td className="p-4 whitespace-nowrap">
                <Button 
                  variant="ghost" 
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  size="sm"
                  onClick={() => handleDelete(rsvp.id)}
                  disabled={isDeleting === rsvp.id}
                >
                  {isDeleting === rsvp.id ? 'جاري الحذف...' : 'حذف'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
