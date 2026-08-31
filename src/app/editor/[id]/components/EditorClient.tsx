'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { updateInvitationData, updateInvitationTitle, publishInvitationOwner } from '@/actions/invitations'
import { getTemplate } from '@/components/templates/registry'
import { PhoneFrame } from '@/components/ui/phone-frame'
import { TemplateRenderer } from '@/components/templates/TemplateRenderer'
import { InvitationData } from '@/components/templates/types'
import { Button } from '@/components/ui/button'
import { PackageEntitlements } from '@/lib/entitlements'
import Sidebar from './Sidebar'
import { FunnelTracker } from '@/components/funnel/FunnelTracker'
import { trackFunnelEvent } from '@/lib/funnel/client'

export default function EditorClient({ 
  invitationId, 
  initialTitle, 
  initialData,
  invitationStatus,
  paymentOrder,
  hasRecoveryKey,
  templateSlug,
  entitlements,
  planName
}: { 
  invitationId: string, 
  initialTitle: string, 
  initialData: InvitationData,
  invitationStatus: string,
  paymentOrder: { id: string, status: string } | null,
  hasRecoveryKey: boolean,
  templateSlug: string,
  entitlements: PackageEntitlements,
  planName: string
}) {
  const router = useRouter()
  const [data, setData] = useState<InvitationData>(initialData)
  const [title, setTitle] = useState(initialTitle)
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>('IDLE')
  const [publishing, setPublishing] = useState(false)
  const [mobileMode, setMobileMode] = useState<'EDITOR' | 'PREVIEW'>('EDITOR')

  // Calculate completion percentage
  const calcCompletion = () => {
    const total = 4;
    let completed = 0;
    if (data.groomName) completed++;
    if (data.brideName) completed++;
    if (data.date) completed++;
    if (data.time) completed++;
    return Math.round((completed / total) * 100);
  }

  const completion = calcCompletion()

  const handlePublish = async () => {
    trackFunnelEvent('FUNNEL_PUBLISH_ATTEMPTED', { invitationId }, `publish_attempt_${invitationId}_${Date.now()}`)
    
    if (completion < 100) {
      alert('يرجى إكمال البيانات الأساسية قبل النشر.')
      return
    }
    
    setPublishing(true)
    const res = await publishInvitationOwner(invitationId)
    if (res.success) {
      alert('تم نشر الدعوة بنجاح!')
      router.push(`/editor/${invitationId}/share`)
    } else {
      alert(res.error || 'حدث خطأ أثناء النشر')
      setPublishing(false)
    }
  }

  const handleContinue = () => {
    if (completion < 100) {
      alert('يرجى إكمال البيانات الأساسية أولاً.')
      return
    }
    if (paymentOrder?.status === 'PENDING_PAYMENT') {
      router.push(`/dashboard/payment/${paymentOrder.id}?invitationId=${invitationId}`)
    } else {
      router.push(`/dashboard/plans/${invitationId}`)
    }
  }

  // Robust serialized autosave
  const pendingDataRef = React.useRef<InvitationData | null>(null)
  const isSavingRef = React.useRef(false)

  const performSave = useCallback(async function performSaveFn(dataToSave: InvitationData) {
    isSavingRef.current = true
    setSaveStatus('SAVING')
    
    const res = await updateInvitationData(invitationId, dataToSave)
    
    if (res.success) {
      setSaveStatus('SAVED')
      // Track first edit
      trackFunnelEvent('FUNNEL_EDITOR_EDITED', { invitationId }, `editor_edited_${invitationId}`)
      setTimeout(() => setSaveStatus('IDLE'), 2000)
    } else {
      setSaveStatus('ERROR')
    }

    isSavingRef.current = false
    
    // If more changes happened while we were saving, save again immediately
    if (pendingDataRef.current) {
      const nextData = pendingDataRef.current
      pendingDataRef.current = null
      performSaveFn(nextData)
    }
  }, [invitationId])

  useEffect(() => {
    if (saveStatus === 'SAVING') {
      if (isSavingRef.current) {
        pendingDataRef.current = data
        return
      }

      const handler = setTimeout(() => {
        performSave(data)
      }, 1000)
      
      return () => clearTimeout(handler)
    }
  }, [data, saveStatus, performSave])

  const handleDataChange = useCallback((newData: InvitationData) => {
    setData(newData)
    setSaveStatus('SAVING') // This tells the UI we have unsaved/saving changes
  }, [])

  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    await updateInvitationTitle(invitationId, newTitle)
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#FAF8F3]">
      <FunnelTracker eventName="FUNNEL_EDITOR_OPENED" invitationId={invitationId} sourcePage="editor" dedupKey={`editor_opened_${invitationId}`} />
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
            className="font-bold text-lg bg-transparent border-none focus:outline-none focus:ring-0 w-32 md:w-48"
            placeholder="اسم الدعوة..."
          />
          {getTemplate(templateSlug)?.requiredEntitlement === 'premiumTemplates' && (
            <div className="hidden md:flex flex-col gap-0.5 mr-2">
              <span className="text-[10px] font-bold text-white bg-black px-2 py-0.5 rounded-full w-fit">قالب مميز</span>
              {!(paymentOrder?.status === 'PAID' && entitlements.premiumTemplates) && (
                <span className="text-[10px] text-red-500 font-medium">يتطلب Premium للنشر</span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm hidden md:block text-muted-foreground">
            {saveStatus === 'SAVING' && 'جاري الحفظ...'}
            {saveStatus === 'SAVED' && 'تم الحفظ ✓'}
            {saveStatus === 'ERROR' && (
              <div className="flex items-center gap-2 text-destructive">
                <span>تعذر الحفظ</span>
                <Button variant="link" className="p-0 h-auto text-destructive text-sm" onClick={() => performSave(data)}>إعادة المحاولة</Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" className="hidden lg:flex" onClick={() => router.push(`/editor/${invitationId}/analytics`)}>
              إحصائيات
            </Button>
            <Button variant="outline" className="hidden lg:flex" onClick={() => router.push(`/editor/${invitationId}/guests`)}>
              سجل الحضور
            </Button>
            <Button variant="outline" className="hidden lg:flex" onClick={() => window.open(`/api/preview/${invitationId}`, '_blank')}>
              معاينة
            </Button>
          </div>
          
          {invitationStatus === 'PUBLISHED' ? (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-block text-green-600 font-bold px-4 py-2 bg-green-50 rounded-lg">الدعوة منشورة ✓</span>
              <Button className="bg-primary text-white hover:bg-primary/90 font-bold" onClick={() => router.push(`/editor/${invitationId}/share`)}>
                مشاركة الدعوة
              </Button>
            </div>
          ) : paymentOrder?.status === 'PAID' ? (
            <Button className="bg-green-600 text-white hover:bg-green-700" onClick={handlePublish} disabled={publishing}>
              {publishing ? 'جاري النشر...' : 'نشر الدعوة الآن'}
            </Button>
          ) : (
            <Button className="bg-primary text-white hover:bg-primary/90" onClick={handleContinue}>
              {paymentOrder?.status === 'PENDING_PAYMENT' ? 'متابعة الدفع' : 'اختيار الباقة'}
            </Button>
          )}
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
            <Sidebar invitationId={invitationId} data={data} onChange={handleDataChange} hasRecoveryKey={hasRecoveryKey} features={getTemplate(templateSlug)?.features || { gallery: true, map: true, program: true, parents: true, music: true, rsvp: true }} entitlements={entitlements} planName={planName} />
          </div>
        </aside>

        {/* Live Preview Area */}
        <main className={`
          flex-1 bg-[#FAF8F3] relative overflow-y-auto lg:overflow-hidden
          ${mobileMode === 'EDITOR' ? 'hidden lg:flex lg:items-center lg:justify-center lg:p-8' : 'block p-4 pb-24'}
        `}>
          <div className="lg:h-full lg:w-full flex items-center justify-center">
            <PhoneFrame>
              <TemplateRenderer templateSlug={templateSlug} data={data} mode="editor-preview">
                <div className="py-12 px-6 sm:px-8 text-center bg-white border-t border-[#A88952]/20 opacity-80 pointer-events-none relative" dir="rtl">
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                    معاينة قسم تأكيد الحضور
                  </div>
                  <h3 className="text-2xl font-bold text-[#A88952] mb-6 mt-4">هل ستشاركنا فرحتنا؟</h3>
                  <div className="space-y-6 text-right opacity-50 grayscale">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#777777]">الاسم الكريم</label>
                      <div className="h-12 border-2 border-border rounded-xl bg-gray-50"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-12 rounded-xl border-2 border-[#A88952] bg-[#A88952]/10 text-[#A88952] flex items-center justify-center font-bold text-sm">سأحضر بالتأكيد</div>
                      <div className="h-12 rounded-xl border-2 border-border flex items-center justify-center font-bold text-sm">أعتذر عن الحضور</div>
                    </div>
                    <div className="h-14 bg-[#A88952] text-white flex items-center justify-center font-bold text-lg rounded-xl mt-4">
                      تأكيد الرد
                    </div>
                  </div>
                </div>
              </TemplateRenderer>
            </PhoneFrame>
          </div>
        </main>
      </div>
    </div>
  )
}
