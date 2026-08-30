import React from 'react'

export function TizkarAttribution({ 
  show, 
  className = '', 
  style = {} 
}: { 
  show: boolean
  className?: string
  style?: React.CSSProperties 
}) {
  if (!show) return null

  return (
    <div 
      className={`text-xs flex items-center justify-center gap-1.5 ${className}`}
      style={style}
      dir="rtl"
    >
      <span>صُممت عبر</span>
      <a 
        href={process.env.NEXT_PUBLIC_APP_URL || "https://tizkar.vercel.app"} 
        target="_blank" 
        rel="noopener noreferrer"
        className="font-bold hover:opacity-80 transition-opacity"
        aria-label="زيارة موقع تذكار"
      >
        تِذكار
      </a>
    </div>
  )
}
