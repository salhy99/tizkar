import { describe, test, expect } from 'vitest'
import { 
  isValidEventType, 
  validateEventMetadata, 
  calculateAnalyticsMetrics 
} from '../src/lib/analytics/helpers'

describe('Analytics Helpers', () => {
  describe('isValidEventType', () => {
    test('returns true for known types', () => {
      expect(isValidEventType('INVITATION_VIEW')).toBe(true)
      expect(isValidEventType('SHARE_CLICK')).toBe(true)
      expect(isValidEventType('MAP_CLICK')).toBe(true)
    })

    test('returns false for unknown types', () => {
      expect(isValidEventType('INVALID_EVENT')).toBe(false)
      expect(isValidEventType('')).toBe(false)
    })
  })

  describe('validateEventMetadata', () => {
    test('validates SHARE_CLICK channels', () => {
      expect(validateEventMetadata('SHARE_CLICK', { channel: 'whatsapp' })).toEqual({ channel: 'whatsapp' })
      expect(validateEventMetadata('SHARE_CLICK', { channel: 'invalid' })).toBeNull()
    })

    test('ignores irrelevant metadata', () => {
      expect(validateEventMetadata('MAP_CLICK', { channel: 'whatsapp' })).toBeNull()
      expect(validateEventMetadata('INVITATION_VIEW', { random: 'data' })).toBeNull()
    })
  })

  describe('calculateAnalyticsMetrics', () => {
    test('calculates metrics correctly', () => {
      const now = new Date('2026-08-27T12:00:00Z')
      
      const events = [
        { event_type: 'INVITATION_VIEW', visitor_hash: 'visitor1', created_at: '2026-08-27T10:00:00Z', metadata: null },
        { event_type: 'INVITATION_VIEW', visitor_hash: 'visitor1', created_at: '2026-08-27T11:00:00Z', metadata: null }, // same visitor
        { event_type: 'INVITATION_VIEW', visitor_hash: 'visitor2', created_at: '2026-08-26T10:00:00Z', metadata: null }, // yesterday
        { event_type: 'SHARE_CLICK', visitor_hash: 'visitor1', created_at: '2026-08-27T10:05:00Z', metadata: { channel: 'whatsapp' } },
        { event_type: 'MAP_CLICK', visitor_hash: 'visitor2', created_at: '2026-08-26T10:05:00Z', metadata: null }
      ]

      const rsvps = [
        { attendance_status: 'ATTENDING', guest_count: 2 }
      ]

      const metrics = calculateAnalyticsMetrics(events, rsvps, now)

      expect(metrics.views).toBe(3)
      expect(metrics.uniqueVisitors).toBe(2)
      expect(metrics.rsvpResponses).toBe(1)
      expect(metrics.conversionRate).toBe(50) // 1 rsvp / 2 unique visitors = 50%
      expect(metrics.shareActions).toBe(1)
      expect(metrics.mapClicks).toBe(1)
      
      // Check time series format
      expect(metrics.timeSeries.length).toBe(7)
      const todaySeries = metrics.timeSeries.find(s => s.date === '2026-08-27')
      expect(todaySeries?.count).toBe(2)
      const yesterdaySeries = metrics.timeSeries.find(s => s.date === '2026-08-26')
      expect(yesterdaySeries?.count).toBe(1)
    })

    test('handles zero visitors gracefully', () => {
      const metrics = calculateAnalyticsMetrics([], [])
      expect(metrics.uniqueVisitors).toBe(0)
      expect(metrics.conversionRate).toBe(0)
    })
  })
})
