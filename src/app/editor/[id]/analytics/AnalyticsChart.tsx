'use client'

import React from 'react'

type TimeSeriesData = {
  date: string
  count: number
}

export default function AnalyticsChart({ data }: { data: TimeSeriesData[] }) {
  // Find maximum count for scaling
  const maxCount = Math.max(...data.map(d => d.count), 1)

  // Reverse so oldest is left, newest is right (or based on RTL/LTR)
  // Our data comes as [7 days ago, ..., today]
  
  return (
    <div className="flex h-full w-full items-end justify-between gap-2 px-2 pb-6 pt-4 relative">
      {/* Background horizontal lines for scale */}
      <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none pb-6">
        <div className="w-full border-b border-gray-500"></div>
        <div className="w-full border-b border-gray-500"></div>
        <div className="w-full border-b border-gray-500"></div>
        <div className="w-full border-b border-gray-500"></div>
      </div>

      {data.map((item) => {
        const heightPercent = (item.count / maxCount) * 100
        const dateObj = new Date(item.date)
        const dayName = dateObj.toLocaleDateString('ar-IQ', { weekday: 'short' })
        
        return (
          <div key={item.date} className="relative flex flex-col items-center flex-1 h-full justify-end group">
            {/* Tooltip */}
            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10 pointer-events-none">
              {item.count} زيارة
            </div>
            
            {/* Bar */}
            <div 
              className="w-full max-w-[40px] bg-[#A88952] rounded-t-sm transition-all duration-500 ease-out hover:bg-[#8f7445]"
              style={{ height: `${heightPercent}%`, minHeight: item.count > 0 ? '4px' : '0px' }}
              aria-label={`${item.count} زيارة في ${dayName}`}
            ></div>
            
            {/* Label */}
            <div className="absolute -bottom-6 text-xs text-muted-foreground whitespace-nowrap">
              {dayName}
            </div>
          </div>
        )
      })}
    </div>
  )
}
