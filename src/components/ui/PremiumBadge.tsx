'use client'

import React from 'react'

/**
 * Restrained premium badge used in the template catalog.
 * Intentionally not gold/gaudy — elegant and minimal.
 */
export function PremiumBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${className}`}
      style={{
        background: 'rgba(192,160,98,0.12)',
        color: '#9A7A42',
        border: '1px solid rgba(192,160,98,0.3)',
        letterSpacing: '0.04em',
      }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      مميز
    </span>
  )
}
