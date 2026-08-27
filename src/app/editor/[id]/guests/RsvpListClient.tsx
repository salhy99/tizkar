'use client'

import { useState } from 'react'
import { deleteRsvp } from '@/actions/rsvps'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Download, Search, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { filterAndSortRsvps, generateCSVContent, generateCSVFilename, SortOption, FilterOption } from '@/lib/guests/helpers'

export type Rsvp = {
  id: string
  invitation_id: string
  guest_name: string
  attendance_status: 'ATTENDING' | 'DECLINED'
  guest_count: number
  message: string | null
  created_at: string
}

export default function RsvpListClient({ initialData, invitationId }: { initialData: Rsvp[], invitationId: string }) {
  const [rsvps, setRsvps] = useState<Rsvp[]>(initialData)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterOption>('ALL')
  const [sort, setSort] = useState<SortOption>('NEWEST')

  const handleDelete = async (rsvpId: string, guestName: string) => {
    if (!confirm(`هل أنت متأكد من حذف رد الضيف "${guestName}"؟`)) return
    setIsDeleting(rsvpId)

    const res = await deleteRsvp(invitationId, rsvpId)
    if (res.success) {
      setRsvps(prev => prev.filter(r => r.id !== rsvpId))
    } else {
      alert(res.error || 'حدث خطأ أثناء الحذف')
    }
    
    setIsDeleting(null)
  }

  const filteredAndSorted = filterAndSortRsvps(rsvps, searchQuery, filter, sort)

  const exportCSV = () => {
    if (rsvps.length === 0) {
      alert('لا توجد بيانات للتصدير')
      return
    }

    const csvContent = generateCSVContent(filteredAndSorted)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', generateCSVFilename(invitationId))
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (rsvps.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-4 bg-white rounded-3xl shadow-sm border border-border">
        <div className="text-[#A88952] opacity-50">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-700">لا يوجد أي ردود مسجلة حتى الآن</h3>
        <p className="text-gray-500">شارك رابط الدعوة مع ضيوفك لتبدأ بتلقي الردود</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-border overflow-hidden">
      {/* Controls Bar */}
      <div className="p-4 md:p-6 border-b border-border bg-gray-50/50 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="ابحث باسم الضيف..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 w-full bg-white"
              aria-label="البحث عن ضيف"
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as FilterOption)}
              className="w-full sm:w-36 bg-white border border-input rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="تصفية حسب الحالة"
            >
              <option value="ALL">الكل</option>
              <option value="ATTENDING">مؤكد الحضور</option>
              <option value="DECLINED">معتذر</option>
            </select>

            <select 
              value={sort} 
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="w-full sm:w-48 bg-white border border-input rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="ترتيب القائمة"
            >
              <option value="NEWEST">الأحدث أولاً</option>
              <option value="OLDEST">الأقدم أولاً</option>
              <option value="COUNT_DESC">عدد الضيوف (الأكثر)</option>
              <option value="COUNT_ASC">عدد الضيوف (الأقل)</option>
              <option value="NAME">أبجدياً (الاسم)</option>
            </select>
          </div>
        </div>

        <Button onClick={exportCSV} variant="outline" className="w-full md:w-auto shrink-0 bg-white" aria-label="تصدير بصيغة CSV">
          <Download className="w-4 h-4 ml-2" />
          تصدير CSV
        </Button>
      </div>

      {/* Results */}
      <div className="p-0 md:p-0">
        {filteredAndSorted.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد ردود مطابقة للفلتر المحدد'}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-white border-b border-gray-100">
                  <tr>
                    <th className="p-4 font-bold text-gray-500 whitespace-nowrap">اسم الضيف</th>
                    <th className="p-4 font-bold text-gray-500 whitespace-nowrap">الحالة</th>
                    <th className="p-4 font-bold text-gray-500 whitespace-nowrap">العدد</th>
                    <th className="p-4 font-bold text-gray-500">الرسالة</th>
                    <th className="p-4 font-bold text-gray-500 whitespace-nowrap">التاريخ</th>
                    <th className="p-4 font-bold text-gray-500 whitespace-nowrap text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAndSorted.map(rsvp => (
                    <tr key={rsvp.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="p-4 font-bold text-[#1C1C1C] whitespace-nowrap">
                        {rsvp.guest_name}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <StatusBadge status={rsvp.attendance_status} />
                      </td>
                      <td className="p-4 font-bold whitespace-nowrap">
                        {rsvp.attendance_status === 'ATTENDING' ? rsvp.guest_count : '-'}
                      </td>
                      <td className="p-4 min-w-[200px] max-w-[300px]">
                        {rsvp.message ? (
                          <p className="text-gray-600 break-words whitespace-pre-wrap">{rsvp.message}</p>
                        ) : (
                          <span className="text-gray-300 italic">لا توجد رسالة</span>
                        )}
                      </td>
                      <td className="p-4 text-gray-500 whitespace-nowrap">
                        {new Date(rsvp.created_at).toLocaleDateString('ar-IQ')}
                      </td>
                      <td className="p-4 whitespace-nowrap text-left">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-400 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          onClick={() => handleDelete(rsvp.id, rsvp.guest_name)}
                          disabled={isDeleting === rsvp.id}
                          aria-label={`حذف رد الضيف ${rsvp.guest_name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredAndSorted.map(rsvp => (
                <div key={rsvp.id} className="p-4 space-y-3 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-[#1C1C1C] text-base mb-1">{rsvp.guest_name}</h4>
                      <StatusBadge status={rsvp.attendance_status} />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-400 hover:text-red-700 hover:bg-red-50 -mr-2"
                      onClick={() => handleDelete(rsvp.id, rsvp.guest_name)}
                      disabled={isDeleting === rsvp.id}
                      aria-label={`حذف رد الضيف ${rsvp.guest_name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {rsvp.attendance_status === 'ATTENDING' && (
                    <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                      <span className="ml-2 font-medium">عدد الضيوف:</span>
                      <span className="font-bold text-[#A88952]">{rsvp.guest_count}</span>
                    </div>
                  )}

                  {rsvp.message && (
                    <div className="text-sm text-gray-600 bg-[#A88952]/5 p-3 rounded-lg break-words whitespace-pre-wrap border border-[#A88952]/10">
                      {rsvp.message}
                    </div>
                  )}

                  <div className="text-xs text-gray-400 pt-1">
                    {new Date(rsvp.created_at).toLocaleDateString('ar-IQ')}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'ATTENDING' | 'DECLINED' }) {
  if (status === 'ATTENDING') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
        <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
        حاضر
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
      <XCircle className="w-3.5 h-3.5 ml-1" />
      مُعتذر
    </span>
  )
}
