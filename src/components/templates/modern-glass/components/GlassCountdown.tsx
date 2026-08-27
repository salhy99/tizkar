'use client'

import React, { useState, useEffect } from 'react'

const accent = '#B8965A'
const charcoal = '#1A1A1A'
const muted = '#9A9A9A'

export default function GlassCountdown({ dateStr, timeStr }: { dateStr?: string; timeStr?: string }) {
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
    return <div style={{ padding: '24px 0', textAlign: 'center', color: accent, fontWeight: 700, fontSize: '1.2rem' }}>اليوم موعد فرحتنا ❤️</div>
  }

  const units = [
    { v: timeLeft.days,                 l: 'يوم' },
    { v: timeLeft.hours,                l: 'ساعة' },
    { v: timeLeft.minutes,              l: 'دقيقة' },
    { v: timeLeft.seconds,              l: 'ثانية' },
  ]

  return (
    <div style={{ marginTop: 32, textAlign: 'center' }}>
      <div style={{ fontSize: '0.7rem', letterSpacing: '3px', color: muted, marginBottom: 16 }}>متبقي على موعد الفرح</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }} dir="ltr">
        {units.map((u) => (
          <div key={u.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              minWidth: 56, height: 56,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', fontWeight: 700, color: charcoal,
              background: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(184,150,90,0.2)',
              borderRadius: '10px',
            }}>
              {u.v.toString().padStart(2, '0')}
            </div>
            <div style={{ fontSize: '0.65rem', color: muted, marginTop: 6, letterSpacing: '1px' }}>{u.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
