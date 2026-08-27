import { requireInvitationEditAccess } from '@/lib/auth/invitation-auth'
import { notFound } from 'next/navigation'
import { getInvitationRsvps } from '@/actions/rsvps'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import RsvpListClient from './RsvpListClient'

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default async function GuestsPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params
  
  // 1. Authorize Owner
  const authorizedInv = await requireInvitationEditAccess(p.id)
  if (!authorizedInv) {
    notFound()
  }

  // 2. Fetch RSVPs
  const { data: rsvps, error } = await getInvitationRsvps(p.id)

  if (error || !rsvps) {
    return (
      <div className="p-8 text-center text-red-500 font-bold">
        حدث خطأ أثناء تحميل سجل الحضور.
      </div>
    )
  }

  // 3. Compute Metrics
  const totalResponses = rsvps.length
  const attendingResponses = rsvps.filter(r => r.attendance_status === 'ATTENDING').length
  const declinedResponses = rsvps.filter(r => r.attendance_status === 'DECLINED').length
  const totalExpectedAttendees = rsvps.reduce((acc, curr) => acc + (curr.guest_count || 0), 0)

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8 space-y-8" dir="rtl">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#A88952] mb-2">سجل الحضور والتهاني</h1>
          <p className="text-muted-foreground">قائمة بجميع ردود ضيوفك</p>
        </div>
        <Link href={`/editor/${p.id}`}>
          <Button variant="outline">العودة للمحرر</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#A88952]/20 rounded-2xl p-6 text-center shadow-sm">
          <div className="text-sm text-muted-foreground mb-1">إجمالي الردود</div>
          <div className="text-3xl font-bold text-[#1C1C1C]">{totalResponses}</div>
        </div>
        <div className="bg-white border border-green-500/20 rounded-2xl p-6 text-center shadow-sm">
          <div className="text-sm text-muted-foreground mb-1">المؤكد حضورهم</div>
          <div className="text-3xl font-bold text-green-600">{attendingResponses}</div>
        </div>
        <div className="bg-white border border-red-500/20 rounded-2xl p-6 text-center shadow-sm">
          <div className="text-sm text-muted-foreground mb-1">المعتذرون</div>
          <div className="text-3xl font-bold text-red-500">{declinedResponses}</div>
        </div>
        <div className="bg-[#A88952] rounded-2xl p-6 text-center shadow-md text-white">
          <div className="text-sm opacity-90 mb-1">العدد الإجمالي للحضور</div>
          <div className="text-3xl font-bold">{totalExpectedAttendees}</div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-border overflow-hidden">
        <RsvpListClient initialData={rsvps} invitationId={p.id} />
      </div>
    </div>
  )
}
