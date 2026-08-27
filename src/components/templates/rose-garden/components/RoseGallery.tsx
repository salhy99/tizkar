'use client'

import React, { useState } from 'react'

const dustyRose = '#C8938A'
const sage = '#7E9B84'

export default function RoseGallery({ images }: { images: string[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (!images || images.length === 0) return null

  const prev = () => setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : 0))
  const next = () => setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : 0))

  return (
    <section style={{
      padding: '72px 24px',
      background: '#FAF6EE',
      borderTop: '1px solid rgba(200,147,138,0.25)',
    }}>
      {/* Header with botanical divider */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{ width: 40, height: 1, background: `linear-gradient(to left, ${dustyRose}, transparent)` }} />
          <svg viewBox="0 0 24 12" width="24" height="12" fill="none" aria-hidden="true">
            <path d="M12 6 Q6 0 0 6 Q6 12 12 6Z" fill={sage} opacity="0.7" />
            <path d="M12 6 Q18 0 24 6 Q18 12 12 6Z" fill={sage} opacity="0.7" />
            <circle cx="12" cy="6" r="1.5" fill={dustyRose} />
          </svg>
          <div style={{ width: 40, height: 1, background: `linear-gradient(to right, ${dustyRose}, transparent)` }} />
        </div>
        <div style={{ fontSize: '0.7rem', letterSpacing: '3px', color: dustyRose, fontWeight: 700, marginTop: 16 }}>
          لَحَظَاتٌ لَا تُنْسَى
        </div>
      </div>

      {/* Gallery grid — soft, balanced */}
      <div style={{
        maxWidth: 340, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: images.length === 1 ? '1fr' : 'repeat(2, 1fr)',
        gap: 10,
      }}>
        {images.map((src, i) => (
          <div
            key={i}
            style={{
              borderRadius: '4px',
              overflow: 'hidden',
              cursor: 'pointer',
              border: '1px solid rgba(200,147,138,0.2)',
              boxShadow: '0 2px 12px rgba(200,147,138,0.12)',
              // Make first image span both columns if odd number
              ...(images.length % 2 !== 0 && i === images.length - 1 ? { gridColumn: '1 / -1' } : {}),
            }}
            onClick={() => setLightboxIndex(i)}
          >
              {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`صورة ${i + 1}`}
              style={{
                width: '100%',
                aspectRatio: images.length === 1 ? '4/5' : '1/1',
                objectFit: 'cover',
                display: 'block',
                transition: 'transform 0.4s ease',
              }}
              loading="lazy"
              onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)' }}
            />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(44,36,32,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setLightboxIndex(null)}
        >
          <button
            aria-label="إغلاق"
            onClick={() => setLightboxIndex(null)}
            style={{
              position: 'absolute', top: 20, right: 20,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(200,147,138,0.4)',
              borderRadius: '50%', width: 44, height: 44, color: '#fff',
              fontSize: '1.4rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>

          {images.length > 1 && (
            <button aria-label="السابق" onClick={(e) => { e.stopPropagation(); prev() }}
              style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(200,147,138,0.2)', border: '1px solid rgba(200,147,138,0.3)', borderRadius: '50%', width: 44, height: 44, color: '#fff', fontSize: '1.4rem', cursor: 'pointer' }}>‹</button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[lightboxIndex]}
            alt={`صورة ${lightboxIndex + 1}`}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '4px' }}
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <button aria-label="التالي" onClick={(e) => { e.stopPropagation(); next() }}
              style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(200,147,138,0.2)', border: '1px solid rgba(200,147,138,0.3)', borderRadius: '50%', width: 44, height: 44, color: '#fff', fontSize: '1.4rem', cursor: 'pointer' }}>›</button>
          )}

          <div style={{ position: 'absolute', bottom: 20, color: `${dustyRose}88`, fontSize: '0.8rem' }}>
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </section>
  )
}
