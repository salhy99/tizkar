import { describe, test, expect } from 'vitest'
import { filterAndSortRsvps, generateCSVContent, generateCSVFilename, calculateMetrics } from '../src/lib/guests/helpers'
import { Rsvp } from '../src/app/editor/[id]/guests/RsvpListClient'

const mockRsvps: Rsvp[] = [
  {
    id: '1',
    invitation_id: 'inv-1',
    guest_name: 'أحمد محمود',
    attendance_status: 'ATTENDING',
    guest_count: 2,
    message: 'ألف مبروك\nوإن شاء الله نكون حاضرين',
    created_at: '2026-08-01T10:00:00Z'
  },
  {
    id: '2',
    invitation_id: 'inv-1',
    guest_name: 'سارة',
    attendance_status: 'DECLINED',
    guest_count: 0,
    message: 'نعتذر عن الحضور',
    created_at: '2026-08-02T10:00:00Z'
  },
  {
    id: '3',
    invitation_id: 'inv-1',
    guest_name: 'عمر',
    attendance_status: 'ATTENDING',
    guest_count: 5,
    message: 'بالتوفيق يا رب "متحمسين جداً"',
    created_at: '2026-08-03T10:00:00Z'
  }
]

describe('Guests Helpers', () => {
  describe('filterAndSortRsvps', () => {
    test('filters by search query', () => {
      const res = filterAndSortRsvps(mockRsvps, 'أحمد', 'ALL', 'NEWEST')
      expect(res.length).toBe(1)
      expect(res[0].guest_name).toBe('أحمد محمود')
    })

    test('filters by status', () => {
      const res = filterAndSortRsvps(mockRsvps, '', 'ATTENDING', 'NEWEST')
      expect(res.length).toBe(2)
      expect(res.map(r => r.guest_name)).toEqual(['عمر', 'أحمد محمود'])
    })

    test('sorts by COUNT_DESC', () => {
      const res = filterAndSortRsvps(mockRsvps, '', 'ALL', 'COUNT_DESC')
      expect(res[0].guest_count).toBe(5) // عمر
      expect(res[1].guest_count).toBe(2) // أحمد
      expect(res[2].guest_count).toBe(0) // سارة
    })
  })

  describe('generateCSVContent', () => {
    test('correctly escapes quotes and includes BOM', () => {
      const csv = generateCSVContent(mockRsvps)
      expect(csv.startsWith('\uFEFF')).toBe(true)
      
      // Check quotes escaping in message
      expect(csv).toContain('""متحمسين جداً""')
      // Check newline handling
      expect(csv).toContain('ألف مبروك\nوإن شاء الله نكون حاضرين')
    })
  })

  describe('generateCSVFilename', () => {
    test('sanitizes and appends date', () => {
      const date = new Date('2026-08-15T00:00:00Z')
      const name = generateCSVFilename('weird-ID!@#123', date)
      expect(name).toBe('tizkar-guests-weird-ID-2026-08-15.csv')
    })
  })

  describe('calculateMetrics', () => {
    test('calculates totals correctly, ignoring declined guest_count', () => {
      const metrics = calculateMetrics(mockRsvps)
      expect(metrics.totalResponses).toBe(3)
      expect(metrics.attendingResponses).toBe(2)
      expect(metrics.declinedResponses).toBe(1)
      expect(metrics.totalExpectedAttendees).toBe(7) // 2 + 5 (0 from declined is ignored even if it was mistakenly set)
    })
  })
})
