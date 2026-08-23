'use client'

import React, { useState } from 'react'
import Image from 'next/image'

export default function Gallery({ images }: { images: string[] }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!images || images.length === 0) return null

  const openLightbox = (index: number) => {
    setCurrentIndex(index)
    setLightboxOpen(true)
  }

  const next = () => setCurrentIndex((prev) => (prev + 1) % images.length)
  const prev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)

  return (
    <section className="py-16 px-8 bg-white border-t border-[#A88952]/10">
      <h2 className="text-2xl font-bold text-center text-[#A88952] mb-10">معرض الصور</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {images.map((src, i) => (
          <div key={i} className="relative aspect-[3/4] overflow-hidden rounded-xl cursor-pointer shadow-sm border border-[#A88952]/20" onClick={() => openLightbox(i)}>
            {/* For Phase 3, we just use standard img, but Next Image is required for optimization.
                Since URLs might be external or from Supabase storage, unoptimized=true might be needed if no domains are configured, but for a real app we'd configure next.config.ts */}
            <img src={src} alt={`صورة ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" />
          </div>
        ))}
      </div>

      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-md">
          <button onClick={() => setLightboxOpen(false)} className="absolute top-6 right-6 text-white text-3xl w-12 h-12 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            ×
          </button>
          
          {images.length > 1 && (
            <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl w-12 h-12 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-colors">
              ‹
            </button>
          )}

          <div className="relative w-full max-w-[90vw] max-h-[80vh] aspect-auto">
            <img src={images[currentIndex]} alt={`صورة ${currentIndex + 1}`} className="max-w-full max-h-[80vh] object-contain mx-auto" />
          </div>

          {images.length > 1 && (
            <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl w-12 h-12 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-colors">
              ›
            </button>
          )}
          
          <div className="absolute bottom-6 left-0 w-full text-center text-white/50 text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </section>
  )
}
