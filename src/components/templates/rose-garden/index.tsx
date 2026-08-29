'use client'

import React from 'react'
import { TemplateRendererProps } from '../types'
import RoseCountdown from './components/RoseCountdown'
import RoseGallery from './components/RoseGallery'
import RoseMusicPlayer from './components/RoseMusicPlayer'

// ─── Centralized Theme ────────────────────────────────────────────────────────
const R = {
  ivory:     '#FAF6EE',     // cream background
  cream:     '#F3EDE2',     // alt section
  dustyRose: '#C8938A',     // main accent
  blush:     '#E8B4AF',     // lighter rose
  sage:      '#7E9B84',     // botanical green
  sageLight: '#A8C4AB',     // lighter sage
  champagne: '#C4A35A',     // gold accent
  ink:       '#2C2420',     // deep warm dark text
  midInk:    '#6B534D',     // secondary text
  mutedInk:  '#A89490',     // muted text
}

// ─── Floral Corner SVG (inline, decorative only) ─────────────────────────────
function FloralCorner({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 80 80"
      width="80"
      height="80"
      style={{
        transform: flip ? 'scaleX(-1)' : undefined,
        opacity: 0.55,
        flexShrink: 0,
      }}
      fill="none"
    >
      {/* Stem */}
      <path d="M4 76 Q20 60 76 4" stroke={R.sage} strokeWidth="1.5" strokeLinecap="round" />
      {/* Leaves */}
      <path d="M4 76 Q12 52 28 48 Q20 62 4 76Z" fill={R.sage} opacity="0.7" />
      <path d="M24 56 Q36 44 48 42 Q40 54 24 56Z" fill={R.sageLight} opacity="0.8" />
      {/* Rose bud top */}
      <circle cx="72" cy="8" r="5" fill={R.dustyRose} opacity="0.85" />
      <ellipse cx="72" cy="8" rx="5" ry="5" fill={R.blush} opacity="0.5" />
      {/* Small blooms */}
      <circle cx="52" cy="28" r="3.5" fill={R.blush} opacity="0.9" />
      <circle cx="38" cy="42" r="2.5" fill={R.dustyRose} opacity="0.7" />
      {/* Dot petals */}
      <circle cx="68" cy="14" r="1.5" fill={R.champagne} opacity="0.6" />
      <circle cx="60" cy="22" r="1.2" fill={R.champagne} opacity="0.5" />
    </svg>
  )
}

// ─── Botanical Divider ────────────────────────────────────────────────────────
function BotanicalDivider() {
  return (
    <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 0' }}>
      <div style={{ width: 32, height: 1, background: `linear-gradient(to left, ${R.dustyRose}, transparent)` }} />
      <svg viewBox="0 0 24 12" width="24" height="12" fill="none" aria-hidden="true">
        <path d="M12 6 Q6 0 0 6 Q6 12 12 6Z" fill={R.sage} opacity="0.7" />
        <path d="M12 6 Q18 0 24 6 Q18 12 12 6Z" fill={R.sage} opacity="0.7" />
        <circle cx="12" cy="6" r="1.5" fill={R.dustyRose} />
      </svg>
      <div style={{ width: 32, height: 1, background: `linear-gradient(to right, ${R.dustyRose}, transparent)` }} />
    </div>
  )
}

// ─── Section Frame ────────────────────────────────────────────────────────────
function RoseFrame({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        border: `1px solid ${R.blush}`,
        borderRadius: '4px',
        padding: '32px 28px',
        position: 'relative',
        ...style,
      }}
    >
      {/* corner accents */}
      {['top-2 right-2', 'top-2 left-2', 'bottom-2 right-2', 'bottom-2 left-2'].map((pos, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: 10, height: 10,
            borderColor: R.champagne,
            borderStyle: 'solid',
            borderWidth: i < 2 ? '1px 1px 0 0' : '0 0 1px 1px',
            ...(pos.includes('right') ? { right: 6 } : { left: 6 }),
            ...(pos.includes('top')   ? { top: 6 }   : { bottom: 6 }),
            ...(i % 2 === 1 && !pos.includes('right') ? { borderWidth: i < 2 ? '1px 0 0 1px' : '0 1px 1px 0' } : {}),
          }}
        />
      ))}
      {children}
    </div>
  )
}

// ─── Main Renderer ────────────────────────────────────────────────────────────
export function RoseGardenRenderer({ data, mode = 'public', children }: TemplateRendererProps) {
  const groomName = data.groomName  || 'العريس'
  const brideName = data.brideName  || 'العروس'
  const quote     = data.quote      || 'بكل محبة وسرور نتشرف بدعوتكم'
  const dateStr   = data.date       || '2026-10-20'
  const dateText  = data.dateText   || 'العشرون من أكتوبر'
  const timeText  = data.timeText   || 'الساعة السابعة مساءً'
  const venueName = data.venue?.name    || 'قاعة الفرح'
  const venueAddr = data.venue?.address || 'العراق - بغداد'

  const hasParents = data.parents?.groomFatherEnabled ||
    data.parents?.groomMotherEnabled ||
    data.parents?.brideFatherEnabled ||
    data.parents?.brideMotherEnabled

  const bodyStyle: React.CSSProperties = {
    width: '100%',
    minHeight: '100%',
    background: R.ivory,
    color: R.ink,
    fontFamily: "'Cairo', 'Noto Serif Arabic', serif",
    display: 'flex',
    flexDirection: 'column',
  }

  return (
    <div dir="rtl" style={bodyStyle}>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: '100svh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 28px',
          textAlign: 'center',
          position: 'relative',
          background: data.coverImage ? R.ivory : `radial-gradient(ellipse at top, ${R.cream} 0%, ${R.ivory} 60%)`,
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
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}/storage/v1/object/public/invitations_assets/${data.coverImage}`}
              alt="صورة رئيسية"
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2 }}
            />
          </div>
        )}
        {/* Floral corners — top */}
        <div style={{ position: 'absolute', top: 0, right: 0 }} aria-hidden="true">
          <FloralCorner />
        </div>
        <div style={{ position: 'absolute', top: 0, left: 0 }} aria-hidden="true">
          <FloralCorner flip />
        </div>
        {/* Floral corners — bottom */}
        <div style={{ position: 'absolute', bottom: 0, right: 0, transform: 'rotate(180deg) scaleX(-1)' }} aria-hidden="true">
          <FloralCorner />
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, transform: 'rotate(180deg)' }} aria-hidden="true">
          <FloralCorner />
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 320, width: '100%' }}>
          {/* Formal header text */}
          <div style={{
            fontSize: '0.7rem',
            letterSpacing: '4px',
            color: R.champagne,
            fontWeight: 700,
            marginBottom: 36,
          }}>
            ﷽
          </div>

          {/* Outer decorative frame */}
          <div style={{
            border: `1px solid ${R.blush}`,
            borderRadius: 2,
            padding: '40px 24px',
            position: 'relative',
          }}>
            {/* Inner frame */}
            <div style={{
              border: `1px solid rgba(200, 147, 138, 0.3)`,
              borderRadius: 1,
              padding: '32px 16px',
            }}>
              <BotanicalDivider />
              <div style={{ margin: '28px 0' }}>
                <h1 style={{
                  fontSize: 'clamp(2.2rem, 8vw, 3rem)',
                  fontWeight: 700,
                  color: R.dustyRose,
                  lineHeight: 1.2,
                  margin: 0,
                }}>
                  {groomName}
                </h1>
                <div style={{
                  fontSize: '1.2rem',
                  color: R.champagne,
                  padding: '10px 0',
                  fontWeight: 300,
                }}>
                  ♡
                </div>
                <h1 style={{
                  fontSize: 'clamp(2.2rem, 8vw, 3rem)',
                  fontWeight: 700,
                  color: R.dustyRose,
                  lineHeight: 1.2,
                  margin: 0,
                }}>
                  {brideName}
                </h1>
              </div>
              <BotanicalDivider />

              <p style={{
                marginTop: 24,
                fontSize: '0.9rem',
                lineHeight: 2,
                color: R.midInk,
                fontStyle: 'italic',
              }}>
                {quote}
              </p>

              <div style={{
                marginTop: 24,
                display: 'inline-block',
                background: R.cream,
                border: `1px solid ${R.blush}`,
                borderRadius: '4px',
                padding: '10px 20px',
                fontSize: '0.85rem',
                color: R.ink,
                fontWeight: 600,
              }}>
                {dateStr}
              </div>
            </div>
          </div>

          {/* Bottom floral detail */}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
            <BotanicalDivider />
          </div>
        </div>
      </section>

      {/* ── DATE & TIME ───────────────────────────────────────────────── */}
      <section style={{
        padding: '72px 32px',
        textAlign: 'center',
        background: R.cream,
        borderTop: `1px solid ${R.blush}`,
      }}>
        <BotanicalDivider />
        <div style={{ margin: '32px 0' }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '3px', color: R.sage, fontWeight: 700, marginBottom: 20 }}>
            مَوْعِدُ الِاحْتِفَال
          </div>
          <div style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', fontWeight: 700, color: R.ink, marginBottom: 8 }}>
            {dateText}
          </div>
          <div style={{ fontSize: '1rem', color: R.midInk, fontWeight: 400 }}>{timeText}</div>
        </div>
        <BotanicalDivider />
        {data.date && <RoseCountdown dateStr={data.date} timeStr={data.time} />}
      </section>

      {/* ── INVITATION TEXT ───────────────────────────────────────────── */}
      {data.invitationText && (
        <section style={{ padding: '72px 32px', textAlign: 'center' }}>
          <div style={{ maxWidth: 320, margin: '0 auto' }}>
            <BotanicalDivider />
            <p style={{
              margin: '28px 0',
              fontSize: '1rem',
              lineHeight: 2.4,
              color: R.ink,
              whiteSpace: 'pre-wrap',
              fontWeight: 400,
            }}>
              {data.invitationText}
            </p>
            <BotanicalDivider />
          </div>
        </section>
      )}

      {/* ── PARENTS ───────────────────────────────────────────────────── */}
      {hasParents && (
        <section style={{
          padding: '64px 32px',
          background: R.cream,
          borderTop: `1px solid ${R.blush}`,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '3px', color: R.dustyRose, fontWeight: 700, marginBottom: 40 }}>
            بِدَعْوَةٍ مِنْ أُسَر
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 340, margin: '0 auto' }}>
            {(data.parents?.groomFatherEnabled || data.parents?.groomMotherEnabled) && (
              <RoseFrame>
                <div style={{ fontSize: '0.65rem', letterSpacing: '2px', color: R.sage, marginBottom: 14, fontWeight: 700 }}>عائلة العريس</div>
                {data.parents?.groomFatherEnabled && (
                  <div style={{ fontSize: '0.95rem', color: R.ink, marginBottom: 6 }}>{data.parents.groomFather || 'والد العريس'}</div>
                )}
                {data.parents?.groomMotherEnabled && (
                  <div style={{ fontSize: '0.95rem', color: R.ink }}>{data.parents.groomMother || 'والدة العريس'}</div>
                )}
              </RoseFrame>
            )}
            {(data.parents?.brideFatherEnabled || data.parents?.brideMotherEnabled) && (
              <RoseFrame>
                <div style={{ fontSize: '0.65rem', letterSpacing: '2px', color: R.sage, marginBottom: 14, fontWeight: 700 }}>عائلة العروس</div>
                {data.parents?.brideFatherEnabled && (
                  <div style={{ fontSize: '0.95rem', color: R.ink, marginBottom: 6 }}>{data.parents.brideFather || 'والد العروس'}</div>
                )}
                {data.parents?.brideMotherEnabled && (
                  <div style={{ fontSize: '0.95rem', color: R.ink }}>{data.parents.brideMother || 'والدة العروس'}</div>
                )}
              </RoseFrame>
            )}
          </div>
        </section>
      )}

      {/* ── VENUE ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '72px 32px', textAlign: 'center' }}>
        <BotanicalDivider />
        <div style={{ margin: '36px 0' }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '3px', color: R.sage, fontWeight: 700, marginBottom: 20 }}>
            مَكَانُ الِاحْتِفَال
          </div>
          <RoseFrame style={{ maxWidth: 300, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: R.ink, marginBottom: 10 }}>{venueName}</div>
            <div style={{ fontSize: '0.9rem', color: R.midInk, marginBottom: 20, lineHeight: 1.7 }}>{venueAddr}</div>
            <BotanicalDivider />
            <div style={{ marginTop: 16, fontSize: '0.85rem', color: R.midInk }}>{dateText} — {timeText}</div>
            {data.venue?.url && mode === 'public' && (
              <a
                href={data.venue.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  marginTop: 20,
                  padding: '10px 28px',
                  background: R.dustyRose,
                  color: '#fff',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  letterSpacing: '1px',
                }}
              >
                خريطة الموقع
              </a>
            )}
          </RoseFrame>
        </div>
        <BotanicalDivider />
      </section>

      {/* ── PROGRAM ───────────────────────────────────────────────────── */}
      {data.program && data.program.length > 0 && (
        <section style={{
          padding: '72px 32px',
          background: R.cream,
          borderTop: `1px solid ${R.blush}`,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '3px', color: R.dustyRose, fontWeight: 700, marginBottom: 40 }}>
            بَرْنَامَجُ الْحَفْل
          </div>
          <div style={{ maxWidth: 320, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {data.program.map((item, i) => (
              <div key={item.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', textAlign: 'right' }}>
                {/* Botanical timeline node */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2, flexShrink: 0 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: R.cream,
                    border: `2px solid ${R.dustyRose}`,
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: R.dustyRose }} />
                  </div>
                  {i < (data.program?.length ?? 0) - 1 && (
                    <div style={{
                      width: 1, height: 44,
                      background: `linear-gradient(to bottom, ${R.blush}, ${R.sageLight})`,
                      margin: '3px 0',
                    }} />
                  )}
                </div>
                {/* Content */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.75rem', color: R.sage, fontWeight: 700, letterSpacing: '1px', marginBottom: 2 }}>{item.time}</div>
                  <div style={{ fontSize: '1rem', color: R.ink, fontWeight: 500 }}>{item.title}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── GALLERY ───────────────────────────────────────────────────── */}
      {data.gallery && data.gallery.length > 0 && (
        <RoseGallery images={data.gallery} />
      )}

      {/* ── NOTES ─────────────────────────────────────────────────────── */}
      {data.notes && data.notes.length > 0 && (
        <section style={{
          padding: '64px 32px',
          background: R.cream,
          borderTop: `1px solid ${R.blush}`,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '3px', color: R.dustyRose, fontWeight: 700, marginBottom: 28 }}>
            مُلَاحَظَات
          </div>
          <ul style={{ maxWidth: 300, margin: '0 auto', listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {data.notes.map((note) => (
              <li key={note.id} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                fontSize: '0.9rem', color: R.midInk, lineHeight: 1.8, textAlign: 'right',
              }}>
                <span style={{ color: R.blush, flexShrink: 0, marginTop: 2 }}>✿</span>
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
        background: `linear-gradient(160deg, ${R.dustyRose} 0%, #B07A73 100%)`,
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* decorative petals */}
        <div aria-hidden="true" style={{ position: 'absolute', top: -30, right: -30, opacity: 0.15 }}>
          <FloralCorner />
        </div>
        <div aria-hidden="true" style={{ position: 'absolute', top: -30, left: -30, opacity: 0.15 }}>
          <FloralCorner flip />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', fontWeight: 300, marginBottom: 12, lineHeight: 1.8 }}>
            {data.closing?.text || 'وجودكم يكمل بهجة يومنا'}
          </div>
          {data.closing?.hashtag && (
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', marginBottom: 32, letterSpacing: '2px' }}>
              {data.closing.hashtag}
            </div>
          )}

          <BotanicalDivider />

          {data.contact?.whatsapp && (
            <div style={{ marginTop: 40 }}>
              <a
                href={`https://wa.me/${data.contact.whatsapp.replace(/\+/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '14px 40px',
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                }}
              >
                {data.contact.name ? `تواصل مع ${data.contact.name}` : 'تواصل معنا'}
              </a>
            </div>
          )}

          <div style={{ marginTop: 56, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px' }}>
            تِذكار — دعوات رقمية
          </div>
        </div>
      </section>

      {data.music && <RoseMusicPlayer url={data.music.url} type={data.music.type} />}
    </div>
  )
}
