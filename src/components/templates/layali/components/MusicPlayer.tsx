'use client'

import React, { useState, useEffect, useRef } from 'react'

export default function MusicPlayer({ url, type }: { url?: string, type?: 'YOUTUBE' | 'MP3' }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [ytPlayerReady, setYtPlayerReady] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  if (!url) return null

  const togglePlay = () => {
    setHasInteracted(true)
    
    if (type === 'MP3' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play().catch(e => console.error('Audio play blocked:', e))
      }
      setIsPlaying(!isPlaying)
    } 
    else if (type === 'YOUTUBE' && iframeRef.current) {
      // Using YouTube iframe API via postMessage
      if (isPlaying) {
        iframeRef.current.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*')
      } else {
        iframeRef.current.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*')
      }
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <>
      {/* Hidden Audio/Video Elements */}
      {type === 'MP3' && (
        <audio ref={audioRef} src={url} loop preload="auto" />
      )}
      
      {type === 'YOUTUBE' && (
        <div className="hidden">
          {/* We use enablejsapi=1 to control it */}
          <iframe 
            ref={iframeRef}
            src={`${url.replace('watch?v=', 'embed/')}?enablejsapi=1&autoplay=0&loop=1&controls=0`} 
            allow="autoplay"
            title="Background Music"
          ></iframe>
        </div>
      )}

      {/* Floating Control Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!hasInteracted ? (
          <button 
            onClick={togglePlay}
            className="bg-white text-[#A88952] px-6 py-3 rounded-full shadow-xl border border-[#A88952]/20 font-bold flex items-center gap-2 animate-bounce"
          >
            <span>🎵</span> تشغيل الموسيقى
          </button>
        ) : (
          <button 
            onClick={togglePlay}
            className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-2xl transition-colors border border-[#A88952]/20 ${
              isPlaying ? 'bg-[#A88952] text-white' : 'bg-white text-[#A88952]'
            }`}
          >
            {isPlaying ? '🔊' : '🔈'}
          </button>
        )}
      </div>
    </>
  )
}
