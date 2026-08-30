'use client'

import React, { useState, useEffect } from 'react'
import { TemplateRendererProps } from '../types'
import { TizkarAttribution } from '../TizkarAttribution'
import { getMediaUrl } from '../../../lib/media-helpers'

/* ─── Shared Motion Primitive ─────────────────────────────────────────────── */
function FadeIn({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(18px)',
        transition: 'opacity 0.9s cubic-bezier(.22,1,.36,1), transform 0.9s cubic-bezier(.22,1,.36,1)',
      }}
    >
      {children}
    </div>
  )
}

/* ─── Music Player ─────────────────────────────────────────────────────────── */
function NoorMusicPlayer({ url, type }: { url?: string; type?: string }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  if (!url || type !== 'MP3') return null
  const resolvedUrl = getMediaUrl(url)

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {})
    }
    setPlaying(!playing)
  }

  return (
    <>
      <audio ref={audioRef} src={resolvedUrl} loop />
      <button
        onClick={toggle}
        aria-label={playing ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى'}
        className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-xl border"
        style={{
          background: 'rgba(18, 14, 10, 0.85)',
          borderColor: 'rgba(192,160,98,0.4)',
          color: '#C0A062',
          backdropFilter: 'blur(12px)',
        }}
      >
        {playing ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        )}
      </button>
    </>
  )
}

/* ─── Gallery ──────────────────────────────────────────────────────────────── */
function NoorGallery({ images }: { images: string[] }) {
  const [selected, setSelected] = useState<string | null>(null)

  if (!images || images.length === 0) return null

  return (
    <section className="py-20 px-4" style={{ background: '#0E0B08' }}>
      <div className="text-center mb-12">
        <div className="text-xs tracking-[0.35em] mb-3" style={{ color: '#C0A062' }}>اللحظات</div>
        <h2 className="text-3xl font-bold" style={{ color: '#FAF4EC', fontFamily: 'Cairo, sans-serif' }}>ذكريات لا تُنسى</h2>
      </div>

      {/* Editorial mosaic grid */}
      <div
        className="max-w-2xl mx-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '3px',
        }}
      >
        {images.map((src, i) => (
          <button
            key={i}
            onClick={() => setSelected(src)}
            className="relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-1"
            style={{
              aspectRatio: i === 0 ? '1 / 1.5' : '1 / 1',
              gridRow: i === 0 ? 'span 2' : undefined,
              background: '#1a1410',
            }}
            aria-label={`صورة ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getMediaUrl(src)}
              alt={`لحظة ${i + 1}`}
              loading="lazy"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.95)' }}
          onClick={() => setSelected(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getMediaUrl(selected)}
            alt="صورة مكبرة"
            className="max-w-full max-h-full object-contain rounded"
          />
          <button
            className="absolute top-4 right-4 text-white text-3xl leading-none"
            onClick={() => setSelected(null)}
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>
      )}
    </section>
  )
}

/* ─── Main Renderer ────────────────────────────────────────────────────────── */
export function NoorRenderer({ data, children }: TemplateRendererProps) {
  const groomName = data.groomName || 'العريس'
  const brideName = data.brideName || 'العروس'
  const quote = data.quote || 'بكل حب نتشرف بدعوتكم لمشاركتنا فرحتنا'
  const dateStr = data.date || '2026-10-20'
  const dateText = data.dateText || 'العشرون من أكتوبر'
  const timeStr = data.time || '19:00'
  const timeText = data.timeText || 'الساعة السابعة مساءً'
  const invitationText = data.invitationText
  const venueName = data.venue?.name || 'قاعة النخيل'
  const venueAddress = data.venue?.address || 'العراق - بغداد'

  /* Palette */
  const gold = '#C0A062'
  const goldLight = '#D4BA7E'
  const cream = '#FAF4EC'
  const dark = '#0E0B08'
  const darkMid = '#1A1410'
  const muted = '#8A7A62'

  return (
    <div
      className="w-full min-h-full flex flex-col font-cairo"
      dir="rtl"
      style={{ background: dark, color: cream }}
    >
      {/* ── HERO ── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{ background: dark }}
      >
        {/* Cover image — full bleed with deep overlay */}
        {data.coverImage ? (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getMediaUrl(data.coverImage)}
              alt="صورة الغلاف"
              className="w-full h-full object-cover"
              style={{ opacity: 0.35 }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(14,11,8,0.6) 0%, rgba(14,11,8,0.2) 40%, rgba(14,11,8,0.5) 70%, rgba(14,11,8,0.95) 100%)',
              }}
            />
          </div>
        ) : (
          /* Decorative no-cover fallback */
          <div className="absolute inset-0 z-0">
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse at 50% 30%, ${gold}18 0%, transparent 65%)`,
              }}
            />
          </div>
        )}

        {/* Fine horizontal rule accent top */}
        <div className="absolute top-0 left-0 right-0 h-px z-10" style={{ background: `linear-gradient(to right, transparent, ${gold}60, transparent)` }} />

        <div className="relative z-10 text-center px-8 flex flex-col items-center gap-8 py-24">
          <FadeIn delay={200}>
            <div
              className="text-xs tracking-[0.4em] uppercase"
              style={{ color: gold, letterSpacing: '0.4em' }}
            >
              بسم الله الرحمن الرحيم
            </div>
          </FadeIn>

          <FadeIn delay={500}>
            <div className="flex flex-col items-center gap-2">
              <h1
                className="text-6xl md:text-7xl font-bold leading-tight"
                style={{ color: cream, textShadow: `0 2px 30px ${gold}40` }}
              >
                {groomName}
              </h1>
              {/* Gold ornamental divider */}
              <div className="flex items-center gap-4 my-3">
                <div className="h-px w-16" style={{ background: `linear-gradient(to left, ${gold}, transparent)` }} />
                <div style={{ color: gold, fontSize: '1.4rem' }}>✦</div>
                <div className="h-px w-16" style={{ background: `linear-gradient(to right, ${gold}, transparent)` }} />
              </div>
              <h1
                className="text-6xl md:text-7xl font-bold leading-tight"
                style={{ color: cream, textShadow: `0 2px 30px ${gold}40` }}
              >
                {brideName}
              </h1>
            </div>
          </FadeIn>

          <FadeIn delay={900}>
            <p
              className="text-lg max-w-[280px] mx-auto leading-loose italic"
              style={{ color: muted }}
            >
              &ldquo;{quote}&rdquo;
            </p>
          </FadeIn>

          {/* Scroll cue */}
          <FadeIn delay={1200}>
            <div
              className="flex flex-col items-center gap-2 mt-8"
              style={{ color: gold, opacity: 0.6 }}
            >
              <div className="w-px h-12 mx-auto" style={{ background: `linear-gradient(to bottom, transparent, ${gold})` }} />
              <div className="text-xs tracking-widest">مرّر للأسفل</div>
            </div>
          </FadeIn>
        </div>

        {/* Fine horizontal rule accent bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-px z-10" style={{ background: `linear-gradient(to right, transparent, ${gold}60, transparent)` }} />
      </section>

      {/* ── DATE & TIME ── */}
      <section className="py-24 px-8 text-center" style={{ background: darkMid }}>
        <FadeIn>
          <div className="flex flex-col items-center gap-6">
            <div className="text-xs tracking-[0.35em]" style={{ color: gold }}>موعد الفرح</div>
            <div
              className="text-5xl font-bold"
              style={{ color: cream, fontVariantNumeric: 'tabular-nums' }}
            >
              {dateStr}
            </div>
            <div className="text-base" style={{ color: muted }}>{dateText}</div>
            <div className="w-px h-10" style={{ background: `linear-gradient(to bottom, ${gold}60, transparent)` }} />
            <div className="text-3xl font-bold" style={{ color: goldLight }}>{timeStr}</div>
            <div className="text-base" style={{ color: muted }}>{timeText}</div>
          </div>
        </FadeIn>
      </section>

      {/* ── INVITATION TEXT ── */}
      {invitationText && (
        <section className="py-20 px-8 text-center" style={{ background: dark }}>
          <div
            className="max-w-sm mx-auto text-lg leading-loose"
            style={{ color: muted, whiteSpace: 'pre-wrap' }}
          >
            {invitationText}
          </div>
        </section>
      )}

      {/* ── PARENTS ── */}
      {(data.parents?.groomFatherEnabled || data.parents?.groomMotherEnabled || data.parents?.brideFatherEnabled || data.parents?.brideMotherEnabled) && (
        <section className="py-16 px-8 text-center" style={{ background: darkMid }}>
          <div className="text-xs tracking-[0.35em] mb-8" style={{ color: gold }}>بدعوة من</div>
          <div className="grid grid-cols-2 gap-8 max-w-xs mx-auto text-sm" style={{ color: cream }}>
            <div className="space-y-3">
              <div className="text-xs" style={{ color: muted }}>عائلة العريس</div>
              {data.parents?.groomFatherEnabled && <div>{data.parents?.groomFather || 'والد العريس'}</div>}
              {data.parents?.groomMotherEnabled && <div>{data.parents?.groomMother || 'والدة العريس'}</div>}
            </div>
            <div className="space-y-3">
              <div className="text-xs" style={{ color: muted }}>عائلة العروس</div>
              {data.parents?.brideFatherEnabled && <div>{data.parents?.brideFather || 'والد العروس'}</div>}
              {data.parents?.brideMotherEnabled && <div>{data.parents?.brideMother || 'والدة العروس'}</div>}
            </div>
          </div>
        </section>
      )}

      {/* ── VENUE ── */}
      <section className="py-24 px-8 text-center" style={{ background: dark }}>
        <FadeIn>
          <div className="flex flex-col items-center gap-4">
            <div className="text-xs tracking-[0.35em]" style={{ color: gold }}>مكان الاحتفال</div>
            <h2 className="text-4xl font-bold" style={{ color: cream }}>{venueName}</h2>
            <p className="text-base" style={{ color: muted }}>{venueAddress}</p>
            {data.venue?.url && (
              <a
                href={data.venue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 border px-8 py-3 rounded-full text-sm transition-all hover:bg-white/5"
                style={{ borderColor: `${gold}60`, color: gold }}
                onClick={() => {}}
              >
                📍 فتح خريطة الموقع
              </a>
            )}
          </div>
        </FadeIn>
      </section>

      {/* ── PROGRAM ── */}
      {data.program && data.program.length > 0 && (
        <section className="py-20 px-8" style={{ background: darkMid }}>
          <div className="text-xs tracking-[0.35em] mb-10 text-center" style={{ color: gold }}>برنامج الحفل</div>
          <div className="max-w-xs mx-auto space-y-0">
            {data.program.map((item, i) => (
              <div key={item.id} className="flex gap-6 items-start">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: gold }} />
                  {i < data.program!.length - 1 && (
                    <div className="w-px flex-1 mt-1" style={{ background: `${gold}30`, minHeight: '40px' }} />
                  )}
                </div>
                <div className="pb-8">
                  <div className="text-xs mb-1" style={{ color: gold }}>{item.time}</div>
                  <div className="text-base" style={{ color: cream }}>{item.title}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── GALLERY ── */}
      {data.gallery && data.gallery.length > 0 && <NoorGallery images={data.gallery} />}

      {/* ── NOTES ── */}
      {data.notes && data.notes.length > 0 && (
        <section className="py-14 px-8 text-center" style={{ background: darkMid }}>
          <div className="text-xs tracking-[0.35em] mb-6" style={{ color: gold }}>ملاحظات</div>
          <ul className="space-y-3 max-w-xs mx-auto text-sm" style={{ color: muted }}>
            {data.notes.map(n => <li key={n.id}>• {n.text}</li>)}
          </ul>
        </section>
      )}

      {/* ── RSVP / SHARE / STORY SLOT ── */}
      {children}

      {/* ── CLOSING ── */}
      <section className="py-24 px-8 text-center relative overflow-hidden" style={{ background: dark }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 50%, ${gold}12 0%, transparent 70%)` }}
        />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div style={{ color: gold, fontSize: '2rem' }}>✦</div>
          <h2 className="text-3xl font-bold" style={{ color: cream }}>{data.closing?.text || 'وجودكم يزيد فرحتنا'}</h2>
          {data.closing?.hashtag && (
            <div className="text-base" style={{ color: muted }}>{data.closing.hashtag}</div>
          )}
          {data.contact?.whatsapp && (
            <a
              href={`https://wa.me/${data.contact.whatsapp.replace(/\+/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 border px-8 py-3 rounded-full text-sm transition-all hover:bg-white/5"
              style={{ borderColor: `${gold}50`, color: gold }}
            >
              {data.contact.name ? `تواصل مع ${data.contact.name}` : 'تواصل معنا عبر واتساب'}
            </a>
          )}
          <div className="mt-12 h-px w-24" style={{ background: `linear-gradient(to right, transparent, ${gold}50, transparent)` }} />
          <TizkarAttribution 
            show={data.presentation?.showTizkarAttribution !== false} 
            className="mt-12"
            style={{ color: `${muted}80` }}
          />
        </div>
      </section>

      {/* ── MUSIC ── */}
      {data.music && <NoorMusicPlayer url={data.music.url} type={data.music.type} />}
    </div>
  )
}
