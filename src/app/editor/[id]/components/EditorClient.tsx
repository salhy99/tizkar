'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { updateInvitationData, updateInvitationTitle } from '@/actions/invitations'
import { PhoneFrame } from '@/components/ui/phone-frame'
import { LayaliRenderer, InvitationData } from '@/components/templates/layali'
import { Button } from '@/components/ui/button'
import Sidebar from './Sidebar'

export default function EditorClient({ 
  invitationId, 
  initialTitle, 
  initialData 
}: { 
  invitationId: string, 
  initialTitle: string, 
  initialData: InvitationData 
}) {
  const router = useRouter()
  const [data, setData] = useState<InvitationData>(initialData)
  const [title, setTitle] = useState(initialTitle)
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>('IDLE')
  
  // Track mobile view mode (editor vs preview)
  const [mobileMode, setMobileMode] = useState<'EDITOR' | 'PREVIEW'>('EDITOR')

  // Debounced auto-save for data
  useEffect(() => {
    const handler = setTimeout(async () => {
      // Don't save if it hasn't really changed from initial (basic check) or if we just loaded
      // In a real app we'd deep compare, but for now we just save if it's not IDLE
      if (saveStatus !== 'IDLE') {
        setSaveStatus('SAVING')
        const res = await updateInvitationData(invitationId, data)
        if (res.success) {
          setSaveStatus('SAVED')
          setTimeout(() => setSaveStatus('IDLE'), 2000)
        } else {
          setSaveStatus('ERROR')
        }
      }
    }, 1000)

    return () => clearTimeout(handler)
  }, [data])

  const handleDataChange = useCallback((newData: InvitationData) => {
    setData(newData)
    setSaveStatus('SAVING') // Trigger effect
  }, [])

  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    // Save title immediately (or debounce it too)
    await updateInvitationTitle(invitationId, newTitle)
  }

  // Calculate completion percentage
  const calcCompletion = () => {
    let total = 4;
    let completed = 0;
    if (data.groomName) completed++;
    if (data.brideName) completed++;
    if (data.date) completed++;
    if (data.time) completed++;
    return Math.round((completed / total) * 100);
  }

  const completion = calcCompletion()

  return (
    <div className="flex flex-col h-screen w-full bg-[#FAF8F3]">
      {/* Top Action Bar */}
      <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 lg:px-8 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>
            ← لوحة التحكم
          </Button>
          <div className="h-8 w-px bg-border hidden md:block"></div>
          <input 
            type="text" 
            value={title} 
            onChange={handleTitleChange}
            className="font-bold text-lg bg-transparent border-none focus:outline-none focus:ring-0 w-32 md:w-64"
            placeholder="اسم الدعوة..."
          />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm hidden md:block text-muted-foreground">
            {saveStatus === 'SAVING' && 'جاري الحفظ...'}
            {saveStatus === 'SAVED' && 'تم الحفظ ✓'}
            {saveStatus === 'ERROR' && <span className="text-destructive">تعذر الحفظ</span>}
          </div>
          
          <Button variant="outline" className="hidden lg:flex" onClick={() => alert('معاينة عامة (Phase 3)')}>
            معاينة
          </Button>
          <Button className="bg-primary text-white hover:bg-primary/90" onClick={() => alert('نظام اختيار الباقات والدفع سيتم تطبيقه في المرحلة الرابعة (Phase 4)')}>
            متابعة
          </Button>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Mobile Toggle (Visible only on small screens) */}
        <div className="lg:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white p-1 rounded-full shadow-lg border border-border flex gap-1">
          <Button 
            variant={mobileMode === 'EDITOR' ? 'default' : 'ghost'} 
            className="rounded-full px-6"
            onClick={() => setMobileMode('EDITOR')}
          >
            المحتوى
          </Button>
          <Button 
            variant={mobileMode === 'PREVIEW' ? 'default' : 'ghost'} 
            className="rounded-full px-6"
            onClick={() => setMobileMode('PREVIEW')}
          >
            المعاينة
          </Button>
        </div>

        {/* Sidebar Controls */}
        <aside className={`
          w-full lg:w-[400px] xl:w-[450px] bg-white border-l border-border flex flex-col
          ${mobileMode === 'PREVIEW' ? 'hidden lg:flex' : 'flex'}
        `}>
          <div className="p-6 border-b border-border bg-[#FAF8F3]/50">
            <h2 className="font-bold mb-2">اكتمال دعوتك</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{ width: `${completion}%` }}
                ></div>
              </div>
              <span className="text-sm font-bold text-primary">{completion}%</span>
            </div>
            {completion < 100 && (
              <p className="text-xs text-muted-foreground mt-2">
                يرجى إكمال البيانات الأساسية (الأسماء، التاريخ، والوقت)
              </p>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <Sidebar invitationId={invitationId} data={data} onChange={handleDataChange} />
          </div>
        </aside>

        {/* Live Preview Area */}
        <main className={`
          flex-1 bg-[#FAF8F3] relative overflow-y-auto lg:overflow-hidden
          ${mobileMode === 'EDITOR' ? 'hidden lg:flex lg:items-center lg:justify-center lg:p-8' : 'block p-4 pb-24'}
        `}>
          <div className="lg:h-full lg:w-full flex items-center justify-center">
            <PhoneFrame>
              <LayaliRenderer data={data} />
            </PhoneFrame>
          </div>
        </main>
      </div>
    </div>
  )
}
