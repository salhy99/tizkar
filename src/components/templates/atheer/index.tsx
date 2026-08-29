'use client'

import React, { useState, useEffect, useRef } from 'react'
import { TemplateRendererProps } from '../types'
import { getMediaUrl } from '../../../lib/media-helpers'

/* ─── Intersection-based reveal ────────────────────────────────────────────── */
function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay)
          obs.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(24px)',
        transition: `opacity 0.8s ease, transform 0.8s ease`,
      }}
    >
      {children}
    </div>
  )
}

/* ─── Music Player ─────────────────────────────────────────────────────────── */
function AtheerMusicPlayer({ url, type }: { url?: string; type?: string }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  if (!url || type !== 'MP3') return null
  const resolvedUrl = getMediaUrl(url)

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause() } else { audioRef.current.play().catch(() => {}) }
    setPlaying(!playing)
  }

  return (
    <>
      <audio ref={audioRef} src={resolvedUrl} loop />
      <button
        onClick={toggle}
        aria-label={playing ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى'}
        className="fixed bottom-6 left-6 z-50 w-11 h-11 rounded flex items-center justify-center shadow-xl border transition-all hover:scale-105"
        style={{
          background: 'rgba(240,238,235,0.9)',
          borderColor: 'rgba(30,25,20,0.12)',
          color: '#1E1914',
          backdropFilter: 'blur(12px)',
        }}
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        )}
      </button>
    </>
  )
}

/* ─── Gallery — Asymmetric Strip ───────────────────────────────────────────── */
function AtheerGallery({ images }: { images: string[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  if (!images || images.length === 0) return null

  // Two-column asymmetric grid
  const left = images.filter((_, i) => i % 2 === 0)
  const right = images.filter((_, i) => i % 2 === 1)

  return (
    <section className="py-20 px-5" style={{ background: '#F7F5F2' }}>
      <Reveal>
        <div className="max-w-sm mx-auto mb-10 flex items-end justify-between">
          <div>
            <div className="text-xs tracking-[0.3em] mb-1" style={{ color: '#8A7A6A' }}>GALLERY</div>
            <h2 className="text-2xl font-bold" style={{ color: '#1E1914', fontFamily: 'Cairo, sans-serif' }}>معرض اللحظات</h2>
          </div>
          <div className="h-px flex-1 mx-4 mb-2" style={{ background: 'rgba(30,25,20,0.12)' }} />
        </div>
      </Reveal>

      <div className="max-w-sm mx-auto flex gap-2">
        {/* Left column — taller */}
        <div className="flex flex-col gap-2 flex-1">
          {left.map((src, i) => (
            <button
              key={i}
              onClick={() => setSelected(src)}
              className="relative overflow-hidden rounded focus:outline-none"
              style={{ aspectRatio: '2/3', background: '#E8E4DF' }}
              aria-label={`صورة ${i * 2 + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getMediaUrl(src)}
                alt={`صورة ${i + 1}`}
                loading="lazy"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              />
            </button>
          ))}
        </div>
        {/* Right column — square + offset */}
        <div className="flex flex-col gap-2 flex-1 mt-8">
          {right.map((src, i) => (
            <button
              key={i}
              onClick={() => setSelected(src)}
              className="relative overflow-hidden rounded focus:outline-none"
              style={{ aspectRatio: '1/1', background: '#E8E4DF' }}
              aria-label={`صورة ${i * 2 + 2}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getMediaUrl(src)}
                alt={`صورة ${i + 1}`}
                loading="lazy"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(30,25,20,0.96)' }}
          onClick={() => setSelected(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getMediaUrl(selected)}
            alt="صورة مكبرة"
            className="max-w-full max-h-full object-contain"
          />
          <button
            className="absolute top-4 right-4 text-3xl leading-none"
            style={{ color: '#F7F5F2' }}
            onClick={() => setSelected(null)}
            aria-label="إغلاق"
          >×</button>
        </div>
      )}
    </section>
  )
}

/* ─── Glass Card ───────────────────────────────────────────────────────────── */
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: 'rgba(255,255,255,0.55)',
        border: '1px solid rgba(30,25,20,0.08)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 4px 40px rgba(30,25,20,0.06)',
      }}
    >
      {children}
    </div>
  )
}

/* ─── Main Renderer ────────────────────────────────────────────────────────── */
export function AtheerRenderer({ data, children }: TemplateRendererProps) {
  const groomName = data.groomName || 'العريس'
  const brideName = data.brideName || 'العروس'
  const quote = data.quote || 'بكل حب نتشرف بدعوتكم لمشاركتنا فرحتنا'
  const dateStr = data.date || '2026-10-20'
  const dateText = data.dateText || 'العشرون من أكتوبر'
  const timeStr = data.time || '19:00'
  const timeText = data.timeText || 'الساعة السابعة مساءً'
  const venueName = data.venue?.name || 'قاعة النخيل'
  const venueAddress = data.venue?.address || 'العراق - بغداد'

  /* Palette — light architectural */
  const ink = '#1E1914'
  const stone = '#8A7A6A'
  const sand = '#F7F5F2'
  const warm = '#EDE8E1'
  const accent = '#2C2319'

  return (
    <div
      className="w-full min-h-full flex flex-col font-cairo"
      dir="rtl"
      style={{ background: sand, color: ink }}
    >
      {/* ── HERO ── asymmetric split */}
      <section
        className="relative min-h-screen overflow-hidden"
        style={{ background: warm }}
      >
        {/* Cover — fills 60% height on right side of layout */}
        {data.coverImage && (
          <div
            className="absolute inset-0 z-0"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 100% 85%, 65% 100%, 0 100%)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getMediaUrl(data.coverImage)}
              alt="صورة الغلاف"
              className="w-full h-full object-cover"
              style={{ opacity: 0.18 }}
            />
          </div>
        )}

        {/* No-cover: geometric accent */}
        {!data.coverImage && (
          <div
            className="absolute top-0 left-0 w-2/3 h-64 z-0 opacity-30"
            style={{
              background: `linear-gradient(135deg, ${warm} 0%, rgba(200,190,175,0.5) 100%)`,
            }}
          />
        )}

        {/* Thin vertical rule — architectural detail */}
        <div
          className="absolute top-0 bottom-0 z-10"
          style={{ right: '20%', width: '1px', background: `linear-gradient(to bottom, transparent, rgba(30,25,20,0.1), transparent)` }}
        />

        {/* Content — left-aligned for asymmetry */}
        <div className="relative z-10 min-h-screen flex flex-col justify-end pb-20 px-8 pt-24">
          <Reveal delay={100}>
            <div
              className="text-xs tracking-[0.5em] uppercase mb-8"
              style={{ color: stone }}
            >
              دعوة زفاف
            </div>
          </Reveal>

          <Reveal delay={350}>
            <div className="space-y-1 mb-10">
              <h1
                className="font-bold leading-none"
                style={{ fontSize: 'clamp(3.5rem, 12vw, 5.5rem)', color: ink, letterSpacing: '-0.02em' }}
              >
                {groomName}
              </h1>
              {/* Fine connector line */}
              <div className="flex items-center gap-3 py-3">
                <div className="h-px flex-1" style={{ background: `rgba(30,25,20,0.15)` }} />
                <span style={{ color: stone, fontSize: '0.8rem' }}>و</span>
                <div className="h-px flex-1" style={{ background: `rgba(30,25,20,0.15)` }} />
              </div>
              <h1
                className="font-bold leading-none"
                style={{ fontSize: 'clamp(3.5rem, 12vw, 5.5rem)', color: ink, letterSpacing: '-0.02em' }}
              >
                {brideName}
              </h1>
            </div>
          </Reveal>

          <Reveal delay={650}>
            <p className="text-base leading-loose max-w-[260px]" style={{ color: stone }}>
              {quote}
            </p>
          </Reveal>
        </div>

        {/* Diagonal slice bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16 z-10"
          style={{ background: sand, clipPath: 'polygon(0 100%, 100% 0, 100% 100%)' }}
        />
      </section>

      {/* ── DATE & TIME — glass card ── */}
      <section className="py-20 px-8" style={{ background: sand }}>
        <Reveal>
          <GlassCard className="max-w-sm mx-auto p-8 text-center">
            <div className="text-xs tracking-[0.35em] mb-5" style={{ color: stone }}>موعد الاحتفال</div>
            <div className="grid grid-cols-2 divide-x divide-x-reverse" style={{ color: ink }}>
              <div className="px-4 flex flex-col items-center gap-2">
                <div className="text-3xl font-bold" style={{ color: accent }}>{dateStr}</div>
                <div className="text-xs" style={{ color: stone }}>{dateText}</div>
              </div>
              <div className="px-4 flex flex-col items-center gap-2 border-r" style={{ borderColor: 'rgba(30,25,20,0.08)' }}>
                <div className="text-3xl font-bold" style={{ color: accent }}>{timeStr}</div>
                <div className="text-xs" style={{ color: stone }}>{timeText}</div>
              </div>
            </div>
          </GlassCard>
        </Reveal>
      </section>

      {/* ── INVITATION TEXT ── */}
      {data.invitationText && (
        <section className="py-16 px-8" style={{ background: warm }}>
          <Reveal>
            <div
              className="max-w-sm mx-auto text-base leading-loose text-center"
              style={{ color: stone, whiteSpace: 'pre-wrap' }}
            >
              {data.invitationText}
            </div>
          </Reveal>
        </section>
      )}

      {/* ── PARENTS ── minimal grid ── */}
      {(data.parents?.groomFatherEnabled || data.parents?.groomMotherEnabled || data.parents?.brideFatherEnabled || data.parents?.brideMotherEnabled) && (
        <section className="py-16 px-8" style={{ background: sand }}>
          <Reveal>
            <div className="max-w-sm mx-auto">
              <div className="text-xs tracking-[0.3em] mb-8 text-center" style={{ color: stone }}>بدعوة من</div>
              <div className="grid grid-cols-2 gap-6 text-sm text-center" style={{ color: ink }}>
                <div className="space-y-2">
                  <div className="text-xs" style={{ color: stone }}>عائلة العريس</div>
                  {data.parents?.groomFatherEnabled && <div>{data.parents?.groomFather}</div>}
                  {data.parents?.groomMotherEnabled && <div>{data.parents?.groomMother}</div>}
                </div>
                <div className="space-y-2">
                  <div className="text-xs" style={{ color: stone }}>عائلة العروس</div>
                  {data.parents?.brideFatherEnabled && <div>{data.parents?.brideFather}</div>}
                  {data.parents?.brideMotherEnabled && <div>{data.parents?.brideMother}</div>}
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* ── VENUE — full glass treatment ── */}
      <section className="py-20 px-8" style={{ background: warm }}>
        <Reveal>
          <GlassCard className="max-w-sm mx-auto p-8">
            <div className="text-xs tracking-[0.3em] mb-5" style={{ color: stone }}>مكان الاحتفال</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: ink }}>{venueName}</h2>
            <p className="text-sm mb-6" style={{ color: stone }}>{venueAddress}</p>
            {data.venue?.url && (
              <a
                href={data.venue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs px-5 py-2.5 rounded-full transition-all hover:opacity-80"
                style={{
                  background: ink,
                  color: sand,
                  letterSpacing: '0.05em',
                }}
              >
                📍 الخريطة
              </a>
            )}
          </GlassCard>
        </Reveal>
      </section>

      {/* ── PROGRAM — numbered minimal ── */}
      {data.program && data.program.length > 0 && (
        <section className="py-20 px-8" style={{ background: sand }}>
          <Reveal>
            <div className="max-w-sm mx-auto">
              <div className="text-xs tracking-[0.3em] mb-10" style={{ color: stone }}>برنامج الحفل</div>
              <div className="space-y-6">
                {data.program.map((item, i) => (
                  <div key={item.id} className="flex items-start gap-5">
                    <div
                      className="text-xs font-bold w-6 shrink-0 mt-1 text-center tabular-nums"
                      style={{ color: stone }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="h-px flex-1 mt-2.5" style={{ background: 'rgba(30,25,20,0.1)' }} />
                    <div className="flex-1">
                      <div className="text-xs mb-1" style={{ color: stone }}>{item.time}</div>
                      <div className="text-sm font-medium" style={{ color: ink }}>{item.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* ── GALLERY ── */}
      {data.gallery && data.gallery.length > 0 && <AtheerGallery images={data.gallery} />}

      {/* ── NOTES ── */}
      {data.notes && data.notes.length > 0 && (
        <section className="py-14 px-8" style={{ background: warm }}>
          <Reveal>
            <div className="max-w-sm mx-auto">
              <div className="text-xs tracking-[0.3em] mb-6" style={{ color: stone }}>ملاحظات</div>
              <ul className="space-y-3 text-sm" style={{ color: stone }}>
                {data.notes.map(n => <li key={n.id} className="flex gap-2"><span>—</span><span>{n.text}</span></li>)}
              </ul>
            </div>
          </Reveal>
        </section>
      )}

      {/* ── RSVP / SHARE / STORY SLOT ── */}
      {children}

      {/* ── CLOSING ── */}
      <section className="py-24 px-8" style={{ background: sand }}>
        <Reveal>
          <div className="max-w-sm mx-auto">
            {/* Fine rule */}
            <div className="h-px mb-12" style={{ background: 'rgba(30,25,20,0.1)' }} />
            <h2 className="text-3xl font-bold mb-4" style={{ color: ink }}>{data.closing?.text || 'وجودكم يزيد فرحتنا'}</h2>
            {data.closing?.hashtag && (
              <div className="text-sm mb-8" style={{ color: stone }}>{data.closing.hashtag}</div>
            )}
            {data.contact?.whatsapp && (
              <a
                href={`https://wa.me/${data.contact.whatsapp.replace(/\+/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm px-6 py-3 rounded transition-all hover:opacity-80"
                style={{ background: ink, color: sand }}
              >
                {data.contact.name ? `تواصل مع ${data.contact.name}` : 'تواصل معنا'}
              </a>
            )}
            <div className="mt-16 text-xs" style={{ color: 'rgba(30,25,20,0.3)' }}>تِذكار — دعوة تبقى بالذكرى</div>
          </div>
        </Reveal>
      </section>

      {/* ── MUSIC ── */}
      {data.music && <AtheerMusicPlayer url={data.music.url} type={data.music.type} />}
    </div>
  )
}
