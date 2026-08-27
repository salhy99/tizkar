export const VALID_EVENT_TYPES = ['INVITATION_VIEW', 'SHARE_CLICK', 'MAP_CLICK'] as const
export const VALID_CHANNELS = ['whatsapp', 'telegram', 'native', 'copy']

export type EventType = typeof VALID_EVENT_TYPES[number]

export function isValidEventType(type: string): boolean {
  return VALID_EVENT_TYPES.includes(type as EventType)
}

export function validateEventMetadata(eventType: string, metadata: unknown) {
  if (metadata && typeof metadata === 'object' && metadata !== null) {
    const md = metadata as Record<string, unknown>
    if (eventType === 'SHARE_CLICK' && md.channel && typeof md.channel === 'string' && VALID_CHANNELS.includes(md.channel)) {
      return { channel: md.channel }
    }
  }
  return null
}

export function calculateAnalyticsMetrics(
  events: { event_type: string, visitor_hash: string | null, created_at: string, metadata: unknown }[],
  rsvps: { attendance_status: string, guest_count: number }[],
  nowDate: Date = new Date()
) {
  const views = events.filter(e => e.event_type === 'INVITATION_VIEW').length
  
  const uniqueVisitorsSet = new Set(
    events
      .filter(e => e.event_type === 'INVITATION_VIEW' && e.visitor_hash)
      .map(e => e.visitor_hash)
  )
  const uniqueVisitors = uniqueVisitorsSet.size

  const rsvpResponses = rsvps.length
  
  let conversionRate = 0
  if (uniqueVisitors > 0) {
    conversionRate = Math.round((rsvpResponses / uniqueVisitors) * 100)
  }

  const shareActions = events.filter(e => e.event_type === 'SHARE_CLICK').length
  const mapClicks = events.filter(e => e.event_type === 'MAP_CLICK').length

  const sevenDaysAgo = new Date(nowDate)
  sevenDaysAgo.setUTCDate(nowDate.getUTCDate() - 6)
  sevenDaysAgo.setUTCHours(0, 0, 0, 0)

  const viewsPerDay = new Map<string, number>()
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo)
    d.setUTCDate(d.getUTCDate() + i)
    viewsPerDay.set(d.toISOString().split('T')[0], 0)
  }

  events
    .filter(e => e.event_type === 'INVITATION_VIEW')
    .forEach(e => {
      const dateStr = new Date(e.created_at).toISOString().split('T')[0]
      if (viewsPerDay.has(dateStr)) {
        viewsPerDay.set(dateStr, viewsPerDay.get(dateStr)! + 1)
      }
    })

  const timeSeries = Array.from(viewsPerDay.entries()).map(([date, count]) => ({ date, count }))

  return {
    views,
    uniqueVisitors,
    rsvpResponses,
    conversionRate,
    shareActions,
    mapClicks,
    timeSeries
  }
}
