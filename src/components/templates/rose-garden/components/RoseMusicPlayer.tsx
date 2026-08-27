'use client'

import React, { useState, useRef } from 'react'

const dustyRose = '#C8938A'

export default function RoseMusicPlayer({ url, type }: { url?: string; type?: 'YOUTUBE' | 'MP3' }) {
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
              background: '#FAF6EE',
              border: `1px solid rgba(200,147,138,0.5)`,
              borderRadius: '4px',
              padding: '10px 18px',
              display: 'flex', alignItems: 'center', gap: 8,
              color: '#2C2420', fontWeight: 600, fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(200,147,138,0.2)',
            }}
          >
            <span>✿</span> موسيقى
          </button>
        ) : (
          <button
            onClick={toggle}
            aria-label={isPlaying ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى'}
            style={{
              width: 48, height: 48,
              borderRadius: '50%',
              background: isPlaying ? dustyRose : '#FAF6EE',
              border: `1px solid rgba(200,147,138,0.4)`,
              color: isPlaying ? '#fff' : dustyRose,
              fontSize: '1.1rem',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(200,147,138,0.2)',
            }}
          >
            {isPlaying ? '🔊' : '🔈'}
          </button>
        )}
      </div>
    </>
  )
}
