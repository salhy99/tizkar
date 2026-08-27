'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Download, Share2, Copy, Search, CheckCircle, XCircle, HelpCircle, Users, Eye, ArrowUpRight } from 'lucide-react'

type Rsvp = {
  id: string;
  guest_name: string;
  status: string;
  companions: number | null;
  message: string | null;
  created_at: string;
}

type InvitationStats = {
  totalViews: number;
  viewsToday: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
  confirmed: number;
  maybe: number;
  declined: number;
  totalGuests: number;
}

export default function InvitationDashboardClient({ inv, rsvps, stats, isExpired }: { inv: Record<string, unknown>, rsvps: Rsvp[], stats: InvitationStats, isExpired: boolean }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'CONFIRMED' | 'MAYBE' | 'DECLINED'>('ALL')
  
  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/${inv.slug}` : `https://tidkar.com/${inv.slug}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(publicUrl)}&margin=20`

  // Filter RSVPs
  const filteredRsvps = rsvps.filter(r => {
    if (filter !== 'ALL' && r.status !== filter) return false
    if (searchTerm && !r.guest_name.includes(searchTerm)) return false
    return true
  })

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl)
    alert('تم نسخ الرابط بنجاح')
  }

  const handleShareWhatsApp = () => {
    const text = `دعوة خاصة 💍\n\nيسعدنا حضوركم ومشاركتكم فرحتنا.\n\n${inv.title}\n\n${publicUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleExportCSV = () => {
    // Generate CSV string
    const headers = ['اسم الضيف', 'الحالة', 'عدد المرافقين', 'رسالة التهنئة', 'تاريخ الرد']
    const rows = rsvps.map(r => {
      const statusText = r.status === 'CONFIRMED' ? 'حاضر' : r.status === 'MAYBE' ? 'ربما' : 'يعتذر'
      const date = new Date(r.created_at).toLocaleDateString('ar-IQ')
      const msg = r.message ? r.message.replace(/,/g, '،').replace(/\n/g, ' ') : '' // sanitize for csv
      return `${r.guest_name},${statusText},${r.companions},${msg},${date}`
    })

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(',') + "\n" + rows.join('\n')
    const encodedUri = encodeURI(csvContent)
    
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `حضور_${inv.slug}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadQR = async () => {
    try {
      const response = await fetch(qrUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `QR_${inv.slug}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch {
      // Fallback
      window.open(qrUrl, '_blank')
    }
  }

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* URL & QR Card */}
        <div className="bg-white p-6 rounded-3xl border border-border shadow-sm flex flex-col items-center text-center lg:col-span-1">
          <div className="w-40 h-40 bg-gray-50 border border-gray-200 rounded-xl p-2 mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
          </div>
          
          <div className="space-y-3 w-full">
            <Button onClick={handleCopyLink} variant="outline" className="w-full justify-between h-12 rounded-xl">
              <span>نسخ الرابط</span> <Copy className="w-4 h-4" />
            </Button>
            <Button onClick={handleShareWhatsApp} className="w-full justify-between h-12 rounded-xl bg-[#25D366] hover:bg-[#25D366]/90 text-white">
              <span>مشاركة عبر واتساب</span> <Share2 className="w-4 h-4" />
            </Button>
            <Button onClick={handleDownloadQR} variant="ghost" className="w-full text-[#A88952] hover:bg-[#A88952]/10 h-12 rounded-xl">
              <Download className="w-4 h-4 ml-2" /> تحميل QR Code
            </Button>
            {!isExpired && (
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="block mt-4">
                <Button variant="link" className="w-full text-blue-600">
                  عرض الدعوة العامة <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-[#A88952]">
              <div className="p-3 bg-[#A88952]/10 rounded-xl"><Eye className="w-6 h-6" /></div>
              <h3 className="text-lg font-bold">إحصائيات الزيارات</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                <span className="text-muted-foreground">إجمالي الزيارات</span>
                <span className="text-2xl font-bold">{stats.totalViews}</span>
              </div>
              <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                <span className="text-muted-foreground">زيارات اليوم</span>
                <span className="text-lg font-bold">{stats.viewsToday}</span>
              </div>
              <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                <span className="text-muted-foreground">هذا الأسبوع</span>
                <span className="text-lg font-bold">{stats.viewsThisWeek}</span>
              </div>
              <div className="flex justify-between items-end pb-2">
                <span className="text-muted-foreground">هذا الشهر</span>
                <span className="text-lg font-bold">{stats.viewsThisMonth}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-[#A88952]">
              <div className="p-3 bg-[#A88952]/10 rounded-xl"><Users className="w-6 h-6" /></div>
              <h3 className="text-lg font-bold">ملخص الحضور</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                <span className="text-muted-foreground flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> أكد الحضور</span>
                <span className="text-xl font-bold text-green-600">{stats.confirmed}</span>
              </div>
              <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                <span className="text-muted-foreground flex items-center gap-2"><HelpCircle className="w-4 h-4 text-orange-500" /> ربما</span>
                <span className="text-xl font-bold text-orange-600">{stats.maybe}</span>
              </div>
              <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                <span className="text-muted-foreground flex items-center gap-2"><XCircle className="w-4 h-4 text-red-500" /> يعتذر</span>
                <span className="text-xl font-bold text-red-600">{stats.declined}</span>
              </div>
              <div className="flex justify-between items-end pb-2 mt-4 bg-gray-50 p-2 rounded-lg">
                <span className="font-bold">إجمالي المتوقع حضورهم</span>
                <span className="text-2xl font-bold text-[#1C1C1C]">{stats.totalGuests}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RSVP Table */}
      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col md:flex-row justify-between items-center gap-4 bg-[#FAF8F3]/50">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-[#1C1C1C]">سجل الحضور (RSVP)</h3>
            <span className="bg-[#A88952]/10 text-[#A88952] px-3 py-1 rounded-full text-sm font-bold">{rsvps.length} رد</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="بحث بالاسم..." 
                className="pr-9 w-full sm:w-64 rounded-xl"
              />
            </div>
            
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button onClick={() => setFilter('ALL')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${filter === 'ALL' ? 'bg-white shadow text-[#1C1C1C]' : 'text-muted-foreground'}`}>الكل</button>
              <button onClick={() => setFilter('CONFIRMED')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${filter === 'CONFIRMED' ? 'bg-white shadow text-green-600' : 'text-muted-foreground'}`}>حاضر</button>
              <button onClick={() => setFilter('DECLINED')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${filter === 'DECLINED' ? 'bg-white shadow text-red-600' : 'text-muted-foreground'}`}>اعتذار</button>
            </div>

            <Button onClick={handleExportCSV} variant="outline" className="rounded-xl flex gap-2 border-[#A88952] text-[#A88952] hover:bg-[#A88952] hover:text-white">
              <Download className="w-4 h-4" /> تصدير CSV
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-border text-sm text-muted-foreground">
              <tr>
                <th className="p-4 font-normal">اسم الضيف</th>
                <th className="p-4 font-normal">الحالة</th>
                <th className="p-4 font-normal text-center">المرافقين</th>
                <th className="p-4 font-normal">رسالة التهنئة</th>
                <th className="p-4 font-normal">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRsvps.map((rsvp) => (
                <tr key={rsvp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold text-[#1C1C1C]">{rsvp.guest_name}</td>
                  <td className="p-4">
                    {rsvp.status === 'CONFIRMED' && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">تأكيد حضور</span>}
                    {rsvp.status === 'MAYBE' && <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">ربما</span>}
                    {rsvp.status === 'DECLINED' && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">اعتذار</span>}
                  </td>
                  <td className="p-4 text-center font-bold text-lg">{rsvp.companions || 0}</td>
                  <td className="p-4 text-sm text-muted-foreground max-w-xs truncate" title={rsvp.message || undefined}>{rsvp.message || '-'}</td>
                  <td className="p-4 text-sm text-muted-foreground" dir="ltr">{new Date(rsvp.created_at).toLocaleString('en-GB')}</td>
                </tr>
              ))}
              
              {filteredRsvps.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground">
                    لا توجد ردود مطابقة للبحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
