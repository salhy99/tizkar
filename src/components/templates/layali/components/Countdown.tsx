'use client'

import React, { useState, useEffect } from 'react'

export default function Countdown({ dateStr, timeStr }: { dateStr?: string, timeStr?: string }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null)

  useEffect(() => {
    if (!dateStr) return;
    
    // Attempt to parse standard date YYYY-MM-DD and time HH:MM
    const targetDateStr = `${dateStr}T${timeStr || '19:00'}:00`
    const targetDate = new Date(targetDateStr)

    const interval = setInterval(() => {
      const now = new Date()
      const diff = targetDate.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        clearInterval(interval)
      } else {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000)
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [dateStr, timeStr])

  if (!timeLeft) return null

  if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
    return (
      <div className="py-8 text-center animate-in fade-in duration-1000">
        <h3 className="text-2xl font-bold text-[#A88952]">اليوم موعد فرحتنا ❤️</h3>
      </div>
    )
  }

  return (
    <div className="py-8 text-center">
      <h3 className="text-[#777777] mb-6">متبقي على فرحتنا</h3>
      <div className="flex items-center justify-center gap-4 md:gap-6" dir="ltr">
        
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-[#A88952]/20 flex items-center justify-center text-2xl font-bold text-[#A88952] shadow-sm">
            {timeLeft.days}
          </div>
          <div className="text-xs text-[#777777] mt-2 font-bold">أيام</div>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-[#A88952]/20 flex items-center justify-center text-2xl font-bold text-[#A88952] shadow-sm">
            {timeLeft.hours.toString().padStart(2, '0')}
          </div>
          <div className="text-xs text-[#777777] mt-2 font-bold">ساعة</div>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-[#A88952]/20 flex items-center justify-center text-2xl font-bold text-[#A88952] shadow-sm">
            {timeLeft.minutes.toString().padStart(2, '0')}
          </div>
          <div className="text-xs text-[#777777] mt-2 font-bold">دقيقة</div>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-[#A88952]/20 flex items-center justify-center text-2xl font-bold text-[#A88952] shadow-sm">
            {timeLeft.seconds.toString().padStart(2, '0')}
          </div>
          <div className="text-xs text-[#777777] mt-2 font-bold">ثانية</div>
        </div>

      </div>
    </div>
  )
}
