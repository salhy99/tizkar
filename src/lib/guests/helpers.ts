import { Rsvp } from '@/app/editor/[id]/guests/RsvpListClient'

export type SortOption = 'NEWEST' | 'OLDEST' | 'COUNT_DESC' | 'COUNT_ASC' | 'NAME'
export type FilterOption = 'ALL' | 'ATTENDING' | 'DECLINED'

export function filterAndSortRsvps(
  rsvps: Rsvp[],
  searchQuery: string,
  filter: FilterOption,
  sort: SortOption
): Rsvp[] {
  let result = [...rsvps]

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase()
    result = result.filter(r => r.guest_name.toLowerCase().includes(q))
  }

  if (filter !== 'ALL') {
    result = result.filter(r => r.attendance_status === filter)
  }

  result.sort((a, b) => {
    if (sort === 'NEWEST') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    if (sort === 'OLDEST') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    if (sort === 'COUNT_DESC') {
      return b.guest_count - a.guest_count
    }
    if (sort === 'COUNT_ASC') {
      return a.guest_count - b.guest_count
    }
    if (sort === 'NAME') {
      return a.guest_name.localeCompare(b.guest_name, 'ar')
    }
    return 0
  })

  return result
}

export function generateCSVContent(rsvps: Rsvp[]): string {
  const BOM = '\uFEFF'
  const headers = ['اسم الضيف', 'الحالة', 'العدد', 'رسالة التهنئة', 'تاريخ التسجيل'].join(',')
  
  const rows = rsvps.map(r => {
    const status = r.attendance_status === 'ATTENDING' ? 'حاضر' : 'معتذر'
    const count = r.attendance_status === 'ATTENDING' ? r.guest_count : 0
    // Escape quotes by doubling them, and wrap the whole message in quotes
    const message = r.message ? `"${r.message.replace(/"/g, '""')}"` : ''
    const date = new Date(r.created_at).toLocaleDateString('ar-IQ')
    
    return `"${r.guest_name.replace(/"/g, '""')}","${status}","${count}",${message},"${date}"`
  })

  return BOM + [headers, ...rows].join('\n')
}

export function generateCSVFilename(invitationId: string, date: Date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0]
  // Sanitize the ID if it contains weird characters, though it's typically a UUID
  const safeId = invitationId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 8)
  return `tizkar-guests-${safeId}-${dateStr}.csv`
}

export function calculateMetrics(rsvps: Rsvp[]) {
  const totalResponses = rsvps.length
  const attendingResponses = rsvps.filter(r => r.attendance_status === 'ATTENDING').length
  const declinedResponses = rsvps.filter(r => r.attendance_status === 'DECLINED').length
  const totalExpectedAttendees = rsvps
    .filter(r => r.attendance_status === 'ATTENDING')
    .reduce((acc, curr) => acc + (curr.guest_count || 0), 0)

  return {
    totalResponses,
    attendingResponses,
    declinedResponses,
    totalExpectedAttendees
  }
}
