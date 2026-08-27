'use client'

import React, { useState } from 'react'

export default function GlassGallery({ images }: { images: string[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (!images || images.length === 0) return null

  const prev = () => setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : 0))
  const next = () => setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : 0))

  // Editorial grid layout: first image large, rest smaller
  const isSingle = images.length === 1
  const isTwo    = images.length === 2

  return (
    <section
      style={{
        padding: '80px 24px',
        background: '#F5F3EF',
        borderTop: '1px solid rgba(184,150,90,0.1)',
      }}
    >
      <p style={{ fontSize: '0.7rem', letterSpacing: '3px', color: '#B8965A', fontWeight: 700, textAlign: 'center', marginBottom: 40 }}>
        لَحَظَاتٌ مِنَ الذِّكْرَيَات
      </p>

      {isSingle && (
        <div style={{ maxWidth: 320, margin: '0 auto', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setLightboxIndex(0)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[0]} alt="صورة 1" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} loading="lazy" />
        </div>
      )}

      {isTwo && (
        <div style={{ maxWidth: 340, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {images.map((src, i) => (
            <div key={i} style={{ borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setLightboxIndex(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`صورة ${i + 1}`} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} loading="lazy" />
            </div>
          ))}
        </div>
      )}

      {!isSingle && !isTwo && (
        <div style={{ maxWidth: 360, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: 'auto auto', gap: 10 }}>
          {images.map((src, i) => {
            const isFirst = i === 0
            const isSecond = i === 1
            const isThird = i === 2
            const isExtra = i > 2

            if (isFirst) return (
              <div key={i} style={{ gridRow: '1 / 3', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setLightboxIndex(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`صورة ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: 280 }} loading="lazy" />
              </div>
            )
            if (isSecond || isThird) return (
              <div key={i} style={{ borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', position: 'relative' }} onClick={() => setLightboxIndex(i)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`صورة ${i + 1}`} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }} loading="lazy" />
                {isThird && images.length > 4 && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(26,26,26,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '1.2rem', fontWeight: 700,
                  }}>
                    +{images.length - 3}
                  </div>
                )}
              </div>
            )
            if (isExtra) return null
            return null
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(10,10,10,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={() => setLightboxIndex(null)}
        >
          <button
            aria-label="إغلاق"
            onClick={() => setLightboxIndex(null)}
            style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >×</button>

          {images.length > 1 && (
            <button aria-label="السابق" onClick={(e) => { e.stopPropagation(); prev() }}
              style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>‹</button>
          )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[lightboxIndex]}
            alt={`صورة ${lightboxIndex + 1}`}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }}
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <button aria-label="التالي" onClick={(e) => { e.stopPropagation(); next() }}
              style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>›</button>
          )}

          <div style={{ position: 'absolute', bottom: 24, color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </section>
  )
}
