'use client'

import React, { useState, useEffect } from 'react'

const dustyRose = '#C8938A'
const sage = '#7E9B84'
const ink = '#2C2420'
const mutedInk = '#A89490'

export default function RoseCountdown({ dateStr, timeStr }: { dateStr?: string; timeStr?: string }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)

  useEffect(() => {
    if (!dateStr) return
    const targetDate = new Date(`${dateStr}T${timeStr || '19:00'}:00`)
    const tick = () => {
      const diff = targetDate.getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      } else {
        setTimeLeft({
          days:    Math.floor(diff / 86400000),
          hours:   Math.floor((diff % 86400000) / 3600000),
          minutes: Math.floor((diff % 3600000) / 60000),
          seconds: Math.floor((diff % 60000) / 1000),
        })
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [dateStr, timeStr])

  if (!timeLeft) return null

  if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0) {
    return (
      <div style={{ padding: '28px 0', textAlign: 'center', color: dustyRose, fontWeight: 700, fontSize: '1.1rem', letterSpacing: '1px' }}>
        ✿ اليوم موعد فرحتنا ✿
      </div>
    )
  }

  const units = [
    { v: timeLeft.days,    l: 'يوم' },
    { v: timeLeft.hours,   l: 'ساعة' },
    { v: timeLeft.minutes, l: 'دقيقة' },
    { v: timeLeft.seconds, l: 'ثانية' },
  ]

  return (
    <div style={{ marginTop: 32, textAlign: 'center' }}>
      <div style={{ fontSize: '0.65rem', letterSpacing: '3px', color: sage, marginBottom: 16, fontWeight: 700 }}>
        متبقي على موعد السعادة
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }} dir="ltr">
        {units.map((u) => (
          <div key={u.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              minWidth: 52, height: 52,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.3rem', fontWeight: 700, color: ink,
              background: '#FAF6EE',
              border: `1px solid rgba(200,147,138,0.4)`,
              borderRadius: '2px',
              boxShadow: '0 2px 8px rgba(200,147,138,0.1)',
            }}>
              {u.v.toString().padStart(2, '0')}
            </div>
            <div style={{ fontSize: '0.6rem', color: mutedInk, marginTop: 6, letterSpacing: '1px' }}>{u.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
