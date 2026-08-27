'use client'

import React, { useState, useRef } from 'react'

export default function GlassMusicPlayer({ url, type }: { url?: string; type?: 'YOUTUBE' | 'MP3' }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [interacted, setInteracted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  if (!url) return null

  const toggle = () => {
    setInteracted(true)
    if (type === 'MP3' && audioRef.current) {
      if (isPlaying) audioRef.current.pause()
      else audioRef.current.play().catch(() => null)
      setIsPlaying(!isPlaying)
    } else if (type === 'YOUTUBE' && iframeRef.current?.contentWindow) {
      const cmd = isPlaying ? 'pauseVideo' : 'playVideo'
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: cmd, args: '' }), '*')
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <>
      {type === 'MP3' && <audio ref={audioRef} src={url} loop preload="none" />}
      {type === 'YOUTUBE' && (
        <div style={{ display: 'none' }}>
          <iframe
            ref={iframeRef}
            src={`${url.replace('watch?v=', 'embed/')}?enablejsapi=1&autoplay=0&loop=1&controls=0`}
            allow="autoplay"
            title="خلفية موسيقية"
          />
        </div>
      )}
      <div style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 100 }}>
        {!interacted ? (
          <button
            onClick={toggle}
            aria-label="تشغيل الموسيقى"
            style={{
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(184,150,90,0.3)',
              borderRadius: '100px',
              padding: '12px 20px',
              display: 'flex', alignItems: 'center', gap: 8,
              color: '#1A1A1A', fontWeight: 600, fontSize: '0.85rem',
              cursor: 'pointer', boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
            }}
          >
            <span>🎵</span> موسيقى
          </button>
        ) : (
          <button
            onClick={toggle}
            aria-label={isPlaying ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى'}
            style={{
              width: 48, height: 48,
              borderRadius: '50%',
              background: isPlaying ? '#B8965A' : 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(184,150,90,0.3)',
              color: isPlaying ? '#fff' : '#B8965A',
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
            }}
          >
            {isPlaying ? '🔊' : '🔈'}
          </button>
        )}
      </div>
    </>
  )
}
