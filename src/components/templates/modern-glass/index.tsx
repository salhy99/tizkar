'use client'

import React from 'react'
import { TemplateRendererProps } from '../types'
import GlassCountdown from './components/GlassCountdown'
import GlassGallery from './components/GlassGallery'
import GlassMusicPlayer from './components/GlassMusicPlayer'
import { getMediaUrl } from '../../../lib/media-helpers'

// ─── Centralized Theme ────────────────────────────────────────────────────────
const T = {
  bg: '#F5F3EF',           // warm pearl base
  bgAlt: '#FFFFFF',
  charcoal: '#1A1A1A',     // primary text
  mid: '#5A5A5A',          // secondary text
  muted: '#9A9A9A',        // muted text
  accent: '#B8965A',       // champagne gold
  accentLight: '#D4B47C',  // lighter gold
  glass: 'rgba(255,255,255,0.65)',
  glassBorder: 'rgba(184,150,90,0.18)',
  glassShadow: '0 8px 32px rgba(26,26,26,0.08)',
}

const glassPanel = {
  background: T.glass,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: `1px solid ${T.glassBorder}`,
  boxShadow: T.glassShadow,
}

// ─── Decorative Separator ─────────────────────────────────────────────────────
function GeoSeparator({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', ...style }}>
      <div style={{ width: 40, height: 1, background: `linear-gradient(to left, ${T.accent}, transparent)` }} />
      <div style={{ width: 6, height: 6, border: `1px solid ${T.accent}`, transform: 'rotate(45deg)', flexShrink: 0 }} />
      <div style={{ width: 40, height: 1, background: `linear-gradient(to right, ${T.accent}, transparent)` }} />
    </div>
  )
}

// ─── Main Renderer ────────────────────────────────────────────────────────────
export function ModernGlassRenderer({ data, mode = 'public', children }: TemplateRendererProps) {
  const groomName  = data.groomName  || 'العريس'
  const brideName  = data.brideName  || 'العروس'
  const quote      = data.quote      || 'بكل حب نتشرف بدعوتكم'
  const dateStr    = data.date       || '2026-10-20'
  const timeStr    = data.time       || '19:00'
  const dateText   = data.dateText   || 'العشرون من أكتوبر'
  const timeText   = data.timeText   || 'الساعة السابعة مساءً'
  const venueName  = data.venue?.name    || 'قاعة الفرح'
  const venueAddr  = data.venue?.address || 'العراق - بغداد'

  const hasParents = data.parents?.groomFatherEnabled ||
    data.parents?.groomMotherEnabled ||
    data.parents?.brideFatherEnabled ||
    data.parents?.brideMotherEnabled

  return (
    <div
      dir="rtl"
      style={{
        width: '100%',
        minHeight: '100%',
        background: `linear-gradient(160deg, ${T.bg} 0%, #EDE9E0 50%, ${T.bg} 100%)`,
        color: T.charcoal,
        fontFamily: "'Cairo', 'Segoe UI', sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: '100svh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 32px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background Cover Image */}
        {data.coverImage && (
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0, zIndex: 0
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={getMediaUrl(data.coverImage)}
              alt="صورة رئيسية"
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2 }}
            />
          </div>
        )}

        {/* Background geometric accent */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: '-80px', left: '-80px',
          width: '300px', height: '300px',
          border: `1px solid ${T.glassBorder}`,
          borderRadius: '50%',
          opacity: 0.5,
          zIndex: 0
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', bottom: '-60px', right: '-60px',
          width: '240px', height: '240px',
          border: `1px solid ${T.glassBorder}`,
          borderRadius: '50%',
          opacity: 0.5,
          zIndex: 0
        }} />

        {/* Bismillah badge */}
        <div style={{
          display: 'inline-block',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '3px',
          color: T.accent,
          border: `1px solid ${T.glassBorder}`,
          padding: '8px 24px',
          borderRadius: '100px',
          background: T.glass,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          marginBottom: '48px',
        }}>
          ﷽
        </div>

        {/* Names */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontSize: 'clamp(3rem, 10vw, 5rem)',
            fontWeight: 300,
            letterSpacing: '-1px',
            color: T.charcoal,
            lineHeight: 1.1,
            margin: 0,
          }}>
            {groomName}
          </h1>
          <div style={{
            fontSize: '1.5rem',
            color: T.accent,
            padding: '12px 0',
            fontWeight: 300,
          }}>
            {'&'}
          </div>
          <h1 style={{
            fontSize: 'clamp(3rem, 10vw, 5rem)',
            fontWeight: 300,
            letterSpacing: '-1px',
            color: T.charcoal,
            lineHeight: 1.1,
            margin: 0,
          }}>
            {brideName}
          </h1>
        </div>

        <GeoSeparator style={{ margin: '36px 0 24px' }} />

        <p style={{
          fontSize: '1rem',
          color: T.mid,
          maxWidth: 280,
          lineHeight: 1.9,
          fontWeight: 300,
        }}>
          {quote}
        </p>

        {/* Date preview strip */}
        <div style={{
          marginTop: 48,
          ...glassPanel,
          borderRadius: '12px',
          padding: '16px 32px',
          display: 'inline-flex',
          gap: 24,
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.8rem', color: T.muted, letterSpacing: '2px' }}>التاريخ</span>
          <span style={{ width: 1, height: 20, background: T.glassBorder }} />
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: T.charcoal }}>{dateStr}</span>
        </div>
      </section>

      {/* ── DATE & TIME ───────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 32px',
        textAlign: 'center',
        background: T.bgAlt,
        borderTop: `1px solid ${T.glassBorder}`,
        borderBottom: `1px solid ${T.glassBorder}`,
      }}>
        <p style={{ fontSize: '0.75rem', letterSpacing: '3px', color: T.accent, fontWeight: 700, marginBottom: 32 }}>
          مَوْعِدُنَا
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: 700, color: T.charcoal, lineHeight: 1 }}>
            {dateText}
          </div>
          <div style={{ fontSize: '1rem', color: T.mid, fontWeight: 300 }}>{timeText}</div>
        </div>

        <GeoSeparator style={{ margin: '32px 0' }} />

        {data.date && <GlassCountdown dateStr={data.date} timeStr={data.time} />}
      </section>

      {/* ── INVITATION TEXT ───────────────────────────────────────────── */}
      {data.invitationText && (
        <section style={{ padding: '80px 32px', textAlign: 'center' }}>
          <div style={{
            ...glassPanel,
            borderRadius: '20px',
            padding: '48px 32px',
            maxWidth: 340,
            margin: '0 auto',
          }}>
            <p style={{
              fontSize: '1.05rem',
              lineHeight: 2.2,
              color: T.charcoal,
              whiteSpace: 'pre-wrap',
              fontWeight: 300,
            }}>
              {data.invitationText}
            </p>
          </div>
        </section>
      )}

      {/* ── PARENTS ───────────────────────────────────────────────────── */}
      {hasParents && (
        <section style={{
          padding: '64px 32px',
          background: T.bgAlt,
          borderTop: `1px solid ${T.glassBorder}`,
        }}>
          <p style={{ fontSize: '0.75rem', letterSpacing: '3px', color: T.accent, fontWeight: 700, textAlign: 'center', marginBottom: 40 }}>
            بِدَعْوَةٍ مِنْ
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 360, margin: '0 auto' }}>
            {(data.parents?.groomFatherEnabled || data.parents?.groomMotherEnabled) && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', letterSpacing: '2px', color: T.muted, marginBottom: 12 }}>عائلة العريس</div>
                {data.parents?.groomFatherEnabled && (
                  <div style={{ fontSize: '1rem', color: T.charcoal, marginBottom: 6, fontWeight: 500 }}>
                    {data.parents.groomFather || 'والد العريس'}
                  </div>
                )}
                {data.parents?.groomMotherEnabled && (
                  <div style={{ fontSize: '1rem', color: T.charcoal, fontWeight: 500 }}>
                    {data.parents.groomMother || 'والدة العريس'}
                  </div>
                )}
              </div>
            )}
            {(data.parents?.brideFatherEnabled || data.parents?.brideMotherEnabled) && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', letterSpacing: '2px', color: T.muted, marginBottom: 12 }}>عائلة العروس</div>
                {data.parents?.brideFatherEnabled && (
                  <div style={{ fontSize: '1rem', color: T.charcoal, marginBottom: 6, fontWeight: 500 }}>
                    {data.parents.brideFather || 'والد العروس'}
                  </div>
                )}
                {data.parents?.brideMotherEnabled && (
                  <div style={{ fontSize: '1rem', color: T.charcoal, fontWeight: 500 }}>
                    {data.parents.brideMother || 'والدة العروس'}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── VENUE ─────────────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 32px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '0.75rem', letterSpacing: '3px', color: T.accent, fontWeight: 700, marginBottom: 40 }}>
          مَكَانُ الِاحْتِفَال
        </p>
        <div style={{
          ...glassPanel,
          borderRadius: '20px',
          padding: '48px 32px',
          maxWidth: 340,
          margin: '0 auto',
        }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 600, color: T.charcoal, marginBottom: 12 }}>{venueName}</div>
          <div style={{ fontSize: '0.9rem', color: T.mid, marginBottom: 32 }}>{venueAddr}</div>
          <div style={{ fontSize: '0.8rem', color: T.muted, marginBottom: 8 }}>
            {dateStr} — {timeStr}
          </div>
          {data.venue?.url && mode === 'public' && (
            <a
              href={data.venue.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                marginTop: 24,
                padding: '12px 32px',
                border: `1px solid ${T.accent}`,
                borderRadius: '100px',
                color: T.accent,
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: '1px',
              }}
            >
              خريطة الموقع
            </a>
          )}
        </div>
      </section>

      {/* ── PROGRAM ───────────────────────────────────────────────────── */}
      {data.program && data.program.length > 0 && (
        <section style={{
          padding: '80px 32px',
          background: T.bgAlt,
          borderTop: `1px solid ${T.glassBorder}`,
        }}>
          <p style={{ fontSize: '0.75rem', letterSpacing: '3px', color: T.accent, fontWeight: 700, textAlign: 'center', marginBottom: 48 }}>
            بَرْنَامَجُ الْحَفْل
          </p>
          <div style={{ maxWidth: 340, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {data.program.map((item, idx) => (
              <div key={item.id} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                {/* Timeline line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4, flexShrink: 0 }}>
                  <div style={{
                    width: 10, height: 10,
                    borderRadius: '50%',
                    background: T.accent,
                    border: `2px solid ${T.bg}`,
                    flexShrink: 0,
                  }} />
                  {idx < (data.program?.length ?? 0) - 1 && (
                    <div style={{ width: 1, height: 48, background: `linear-gradient(to bottom, ${T.accent}, transparent)`, marginTop: 4 }} />
                  )}
                </div>
                {/* Content */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: '0.75rem', color: T.accent, fontWeight: 700, letterSpacing: '1px', marginBottom: 4 }}>{item.time}</div>
                  <div style={{ fontSize: '1rem', color: T.charcoal, fontWeight: 500 }}>{item.title}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── GALLERY ───────────────────────────────────────────────────── */}
      {data.gallery && data.gallery.length > 0 && (
        <GlassGallery images={data.gallery} />
      )}

      {/* ── NOTES ─────────────────────────────────────────────────────── */}
      {data.notes && data.notes.length > 0 && (
        <section style={{
          padding: '64px 32px',
          background: T.bgAlt,
          borderTop: `1px solid ${T.glassBorder}`,
        }}>
          <p style={{ fontSize: '0.75rem', letterSpacing: '3px', color: T.accent, fontWeight: 700, textAlign: 'center', marginBottom: 32 }}>
            مُلَاحَظَات
          </p>
          <ul style={{ maxWidth: 320, margin: '0 auto', listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.notes.map((note) => (
              <li key={note.id} style={{
                fontSize: '0.9rem',
                color: T.mid,
                lineHeight: 1.8,
                paddingRight: 16,
                borderRight: `2px solid ${T.accent}`,
              }}>
                {note.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── RSVP / CHILDREN SLOT ──────────────────────────────────────── */}
      {children}

      {/* ── CLOSING ───────────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 32px',
        textAlign: 'center',
        background: T.charcoal,
        color: '#fff',
        marginTop: 'auto',
      }}>
        <div style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', fontWeight: 300, marginBottom: 16, lineHeight: 1.6 }}>
          {data.closing?.text || 'وجودكم يكمل فرحتنا'}
        </div>
        {data.closing?.hashtag && (
          <div style={{ fontSize: '0.9rem', color: T.accentLight, marginBottom: 40, letterSpacing: '2px' }}>
            {data.closing.hashtag}
          </div>
        )}

        {data.contact?.whatsapp && (
          <div style={{ marginTop: 40, paddingTop: 40, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>للتواصل والاستفسار</div>
            <a
              href={`https://wa.me/${data.contact.whatsapp.replace(/\+/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '14px 40px',
                background: T.accent,
                color: '#fff',
                borderRadius: '100px',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
                letterSpacing: '1px',
              }}
            >
              {data.contact.name ? `تواصل مع ${data.contact.name}` : 'تواصل معنا'}
            </a>
          </div>
        )}

        <div style={{ marginTop: 60, fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px' }}>
          تِذكار — دعوات رقمية
        </div>
      </section>

      {data.music && <GlassMusicPlayer url={data.music.url} type={data.music.type} />}
    </div>
  )
}
