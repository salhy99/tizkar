'use client'

import React from 'react'
import Countdown from './components/Countdown'
import Gallery from './components/Gallery'
import MusicPlayer from './components/MusicPlayer'

import { TemplateRendererProps } from '../types'

export function LayaliRenderer(props: TemplateRendererProps) {
  const { data, children } = props
  // Default fallbacks for visual presentation if empty
  const groomName = data.groomName || 'العريس'
  const brideName = data.brideName || 'العروس'
  const quote = data.quote || 'بكل حب نتشرف بدعوتكم لمشاركتنا فرحتنا'
  
  const dateStr = data.date || '2026-10-20'
  const timeStr = data.time || '19:00'
  const dateText = data.dateText || 'الثلاثاء العشرون من أكتوبر'
  const timeText = data.timeText || 'الساعة السابعة مساءً'
  
  const invitationText = data.invitationText || 'حضوركم يسعدنا ويكمل فرحتنا'
  const venueName = data.venue?.name || 'قاعة النخيل'
  const venueAddress = data.venue?.address || 'العراق - بغداد'

  return (
    <div className="w-full min-h-full bg-[#FAF8F3] text-[#1C1C1C] flex flex-col font-cairo">
      
      {/* Hero / Names */}
      <section className="flex flex-col items-center justify-center p-8 text-center min-h-screen relative overflow-hidden">
        {/* Subtle decorative elements for luxury vibe */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#A88952]/10 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#A88952]/10 to-transparent"></div>
        
        <div className="z-10 flex flex-col items-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="text-sm font-bold tracking-widest text-[#A88952] border border-[#A88952]/30 px-6 py-2 rounded-full">بسم الله الرحمن الرحيم</div>
          
          <div className="py-8">
            <h1 className="text-5xl md:text-6xl font-bold text-[#A88952] leading-tight mb-2">
              {groomName}
            </h1>
            <div className="text-3xl text-[#1C1C1C]/50 my-2">&amp;</div>
            <h1 className="text-5xl md:text-6xl font-bold text-[#A88952] leading-tight">
              {brideName}
            </h1>
          </div>
          
          <div className="w-16 h-px bg-[#A88952]/50"></div>
          
          <p className="text-xl leading-relaxed max-w-[280px] text-[#777777] italic">
            &ldquo;{quote}&rdquo;
          </p>
        </div>
      </section>

      {/* Date & Time */}
      <section className="py-16 px-8 text-center bg-white border-y border-[#A88952]/10">
        <div className="space-y-6">
          <div className="text-3xl font-bold text-[#A88952]">{dateStr}</div>
          <div className="text-xl text-[#777777]">{dateText}</div>
          <div className="w-8 h-px bg-[#A88952]/30 mx-auto"></div>
          <div className="text-3xl font-bold text-[#A88952]">{timeStr}</div>
          <div className="text-xl text-[#777777]">{timeText}</div>
        </div>
        
        {/* Render Countdown */}
        {data.date && <Countdown dateStr={data.date} timeStr={data.time} />}
      </section>

      {/* Invitation Text */}
      {data.invitationText && (
        <section className="py-16 px-8 text-center">
          <div className="max-w-[300px] mx-auto text-lg leading-loose text-[#1C1C1C] whitespace-pre-wrap">
            {invitationText}
          </div>
        </section>
      )}

      {/* Parents */}
      {(data.parents?.groomFatherEnabled || data.parents?.groomMotherEnabled || data.parents?.brideFatherEnabled || data.parents?.brideMotherEnabled) && (
        <section className="py-12 px-8 text-center bg-[#A88952]/5">
          <h2 className="text-2xl font-bold text-[#A88952] mb-8">بدعوة من</h2>
          <div className="grid grid-cols-2 gap-8 text-lg">
            <div className="space-y-4">
              <div className="text-sm text-[#777777] font-bold">عائلة العريس</div>
              {data.parents?.groomFatherEnabled && <div>{data.parents?.groomFather || 'والد العريس'}</div>}
              {data.parents?.groomMotherEnabled && <div>{data.parents?.groomMother || 'والدة العريس'}</div>}
            </div>
            <div className="space-y-4">
              <div className="text-sm text-[#777777] font-bold">عائلة العروس</div>
              {data.parents?.brideFatherEnabled && <div>{data.parents?.brideFather || 'والد العروس'}</div>}
              {data.parents?.brideMotherEnabled && <div>{data.parents?.brideMother || 'والدة العروس'}</div>}
            </div>
          </div>
        </section>
      )}

      {/* Venue */}
      <section className="py-16 px-8 text-center bg-white">
        <div className="w-12 h-12 mx-auto border border-[#A88952] rounded-full flex items-center justify-center text-[#A88952] mb-6">
          📍
        </div>
        <h2 className="text-3xl font-bold text-[#A88952] mb-4">{venueName}</h2>
        <p className="text-[#777777] mb-8">{venueAddress}</p>
        
        {data.venue?.url && (
          <a href={data.venue.url} target="_blank" rel="noopener noreferrer" className="inline-block border border-[#A88952] text-[#A88952] px-8 py-3 rounded-full hover:bg-[#A88952] hover:text-white transition-colors">
            فتح خريطة الموقع
          </a>
        )}
      </section>

      {/* Program */}
      {data.program && data.program.length > 0 && (
        <section className="py-16 px-8 bg-[#FAF8F3]">
          <h2 className="text-2xl font-bold text-center text-[#A88952] mb-10">برنامج الحفل</h2>
          <div className="space-y-8 max-w-[300px] mx-auto relative before:absolute before:inset-0 before:ml-[1.2rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#A88952]/30 before:to-transparent">
            {data.program.map((item) => (
              <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-[#A88952]/10 text-[#A88952] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <div className="w-2 h-2 bg-[#A88952] rounded-full"></div>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-[#A88952]/10 bg-white shadow-sm">
                  <div className="text-[#A88952] font-bold mb-1">{item.time}</div>
                  <div className="text-[#1C1C1C]">{item.title}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gallery */}
      {data.gallery && <Gallery images={data.gallery} />}

      {/* Notes */}
      {data.notes && data.notes.length > 0 && (
        <section className="py-12 px-8 text-center bg-white border-t border-[#A88952]/10">
          <h2 className="text-xl font-bold text-[#A88952] mb-6">ملاحظات هامة</h2>
          <ul className="space-y-4 text-[#777777] max-w-[300px] mx-auto text-sm leading-relaxed">
            {data.notes.map((note) => (
              <li key={note.id}>• {note.text}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Render additional children (RSVP, Share, Story) */}
      {children}
      
      {/* Footer / Closing */}
      <section className="py-20 px-8 text-center bg-[#A88952] text-white">
        <h2 className="text-3xl font-bold mb-4">{data.closing?.text || 'وجودكم يزيد فرحتنا'}</h2>
        {data.closing?.hashtag && (
          <div className="text-xl opacity-80 mb-8">{data.closing.hashtag}</div>
        )}
        
        {data.contact?.whatsapp && (
          <div className="mt-8 pt-8 border-t border-white/20">
            <div className="mb-4">للتواصل أو الاستفسار:</div>
            <a href={`https://wa.me/${data.contact.whatsapp.replace(/\+/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-block bg-white text-[#A88952] px-8 py-3 rounded-full hover:bg-white/90 transition-colors font-bold">
              {data.contact.name ? `تواصل مع ${data.contact.name}` : 'تواصل معنا عبر واتساب'}
            </a>
          </div>
        )}
        
        <div className="mt-16 text-xs opacity-50 flex items-center justify-center gap-2">
          <span>تم التصميم بواسطة</span>
          <span className="font-bold">تِذكار</span>
        </div>
      </section>
      
      {/* Music Player */}
      {data.music && <MusicPlayer url={data.music.url} type={data.music.type} />}
      
    </div>
  )
}
