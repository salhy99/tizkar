'use client'

import React from 'react'
import { InvitationData } from '@/components/templates/layali'
import GalleryUploader from '@/components/ui/media/GalleryUploader'
import MusicUploader from '@/components/ui/media/MusicUploader'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'

type SidebarProps = {
  invitationId: string;
  data: InvitationData;
  onChange: (data: InvitationData) => void;
}

export default function Sidebar({ invitationId, data, onChange }: SidebarProps) {
  
  const update = (key: keyof InvitationData, value: any) => {
    onChange({ ...data, [key]: value })
  }

  const updateNested = (parent: keyof InvitationData, key: string, value: any) => {
    const parentObj = (data[parent] as any) || {}
    onChange({ ...data, [parent]: { ...parentObj, [key]: value } })
  }

  const addProgram = () => {
    const p = data.program || []
    onChange({
      ...data,
      program: [...p, { id: Date.now().toString(), time: '8:00 مساءً', title: 'فقرة جديدة' }]
    })
  }

  const updateProgram = (id: string, key: string, value: string) => {
    const p = data.program || []
    onChange({
      ...data,
      program: p.map(item => item.id === id ? { ...item, [key]: value } : item)
    })
  }

  const removeProgram = (id: string) => {
    const p = data.program || []
    onChange({
      ...data,
      program: p.filter(item => item.id !== id)
    })
  }

  const addNote = () => {
    const n = data.notes || []
    onChange({
      ...data,
      notes: [...n, { id: Date.now().toString(), text: 'ملاحظة جديدة' }]
    })
  }

  const updateNote = (id: string, text: string) => {
    const n = data.notes || []
    onChange({
      ...data,
      notes: n.map(item => item.id === id ? { ...item, text } : item)
    })
  }

  const removeNote = (id: string) => {
    const n = data.notes || []
    onChange({
      ...data,
      notes: n.filter(item => item.id !== id)
    })
  }

  return (
    <Accordion className="w-full space-y-4">
      
      {/* 1. Event Info */}
      <AccordionItem value="event-info" className="border border-border rounded-xl bg-white px-4">
        <AccordionTrigger className="hover:no-underline font-bold text-right py-4">
          معلومات المناسبة
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2 pb-4 text-right">
          <div className="space-y-2">
            <label className="text-sm font-medium">اسم العريس <span className="text-destructive">*</span></label>
            <Input value={data.groomName || ''} onChange={(e) => update('groomName', e.target.value)} placeholder="مثال: أحمد محمد" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">اسم العروس <span className="text-destructive">*</span></label>
            <Input value={data.brideName || ''} onChange={(e) => update('brideName', e.target.value)} placeholder="مثال: زهراء علي" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">العبارة تحت الأسماء</label>
            <Input value={data.quote || ''} onChange={(e) => update('quote', e.target.value)} placeholder="مثال: بكل حب نتشرف بدعوتكم..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">التاريخ <span className="text-destructive">*</span></label>
              <Input type="date" value={data.date || ''} onChange={(e) => update('date', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">الوقت <span className="text-destructive">*</span></label>
              <Input type="time" value={data.time || ''} onChange={(e) => update('time', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">نص التاريخ (اختياري)</label>
            <Input value={data.dateText || ''} onChange={(e) => update('dateText', e.target.value)} placeholder="مثال: الثلاثاء العشرون من أكتوبر" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">نص الوقت (اختياري)</label>
            <Input value={data.timeText || ''} onChange={(e) => update('timeText', e.target.value)} placeholder="مثال: الساعة السابعة مساءً" />
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* 2. Invitation Text */}
      <AccordionItem value="invitation-text" className="border border-border rounded-xl bg-white px-4">
        <AccordionTrigger className="hover:no-underline font-bold text-right py-4">
          نص الدعوة
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2 pb-4 text-right">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">اكتب نص الدعوة الأساسي هنا</label>
            <Textarea 
              rows={4}
              value={data.invitationText || ''} 
              onChange={(e) => update('invitationText', e.target.value)} 
              placeholder="حضوركم يسعدنا ويكمل فرحتنا..."
              className="resize-none"
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* 3. Parents */}
      <AccordionItem value="parents" className="border border-border rounded-xl bg-white px-4">
        <AccordionTrigger className="hover:no-underline font-bold text-right py-4">
          الأهل
        </AccordionTrigger>
        <AccordionContent className="space-y-6 pt-2 pb-4 text-right">
          
          <div className="space-y-4 border-b border-border pb-4">
            <h4 className="font-bold text-sm text-primary">عائلة العريس</h4>
            <div className="flex items-center justify-between">
              <label className="text-sm">إضافة والد العريس</label>
              <Switch checked={data.parents?.groomFatherEnabled || false} onCheckedChange={(c) => updateNested('parents', 'groomFatherEnabled', c)} />
            </div>
            {data.parents?.groomFatherEnabled && (
              <Input value={data.parents?.groomFather || ''} onChange={(e) => updateNested('parents', 'groomFather', e.target.value)} placeholder="اسم والد العريس" />
            )}
            
            <div className="flex items-center justify-between">
              <label className="text-sm">إضافة والدة العريس</label>
              <Switch checked={data.parents?.groomMotherEnabled || false} onCheckedChange={(c) => updateNested('parents', 'groomMotherEnabled', c)} />
            </div>
            {data.parents?.groomMotherEnabled && (
              <Input value={data.parents?.groomMother || ''} onChange={(e) => updateNested('parents', 'groomMother', e.target.value)} placeholder="اسم والدة العريس" />
            )}
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm text-primary">عائلة العروس</h4>
            <div className="flex items-center justify-between">
              <label className="text-sm">إضافة والد العروس</label>
              <Switch checked={data.parents?.brideFatherEnabled || false} onCheckedChange={(c) => updateNested('parents', 'brideFatherEnabled', c)} />
            </div>
            {data.parents?.brideFatherEnabled && (
              <Input value={data.parents?.brideFather || ''} onChange={(e) => updateNested('parents', 'brideFather', e.target.value)} placeholder="اسم والد العروس" />
            )}
            
            <div className="flex items-center justify-between">
              <label className="text-sm">إضافة والدة العروس</label>
              <Switch checked={data.parents?.brideMotherEnabled || false} onCheckedChange={(c) => updateNested('parents', 'brideMotherEnabled', c)} />
            </div>
            {data.parents?.brideMotherEnabled && (
              <Input value={data.parents?.brideMother || ''} onChange={(e) => updateNested('parents', 'brideMother', e.target.value)} placeholder="اسم والدة العروس" />
            )}
          </div>

        </AccordionContent>
      </AccordionItem>

      {/* 4. Venue */}
      <AccordionItem value="venue" className="border border-border rounded-xl bg-white px-4">
        <AccordionTrigger className="hover:no-underline font-bold text-right py-4">
          القاعة والموقع
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2 pb-4 text-right">
          <div className="space-y-2">
            <label className="text-sm font-medium">اسم القاعة</label>
            <Input value={data.venue?.name || ''} onChange={(e) => updateNested('venue', 'name', e.target.value)} placeholder="مثال: قاعة النخيل" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">العنوان</label>
            <Input value={data.venue?.address || ''} onChange={(e) => updateNested('venue', 'address', e.target.value)} placeholder="مثال: بغداد - المنصور" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">رابط خرائط جوجل (Google Maps URL)</label>
            <Input type="url" dir="ltr" value={data.venue?.url || ''} onChange={(e) => updateNested('venue', 'url', e.target.value)} placeholder="https://maps.google.com/..." className="text-left" />
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* 5. Program */}
      <AccordionItem value="program" className="border border-border rounded-xl bg-white px-4">
        <AccordionTrigger className="hover:no-underline font-bold text-right py-4">
          برنامج الحفل
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2 pb-4 text-right">
          {(!data.program || data.program.length === 0) ? (
            <div className="text-center py-6 bg-muted/30 rounded-xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground mb-4">لم تضف أي فقرات بعد</p>
              <Button variant="outline" size="sm" onClick={addProgram}>+ إضافة فقرة</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {data.program.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-start bg-muted/20 p-3 rounded-lg border border-border">
                  <div className="flex flex-col gap-2 flex-1">
                    <Input value={item.title} onChange={(e) => updateProgram(item.id, 'title', e.target.value)} placeholder="اسم الفقرة (مثال: الزفة)" />
                    <Input value={item.time} onChange={(e) => updateProgram(item.id, 'time', e.target.value)} placeholder="الوقت (مثال: 9:00 مساءً)" />
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeProgram(item.id)}>
                    🗑️
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={addProgram}>+ إضافة فقرة أخرى</Button>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* 6. Notes */}
      <AccordionItem value="notes" className="border border-border rounded-xl bg-white px-4">
        <AccordionTrigger className="hover:no-underline font-bold text-right py-4">
          ملاحظات هامة
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2 pb-4 text-right">
          {(!data.notes || data.notes.length === 0) ? (
            <div className="text-center py-6 bg-muted/30 rounded-xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground mb-4">أضف ملاحظات لضيوفك</p>
              <Button variant="outline" size="sm" onClick={addNote}>+ إضافة ملاحظة</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {data.notes.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-center bg-muted/20 p-2 rounded-lg border border-border">
                  <Input value={item.text} onChange={(e) => updateNote(item.id, e.target.value)} placeholder="مثال: نعتذر عن اصطحاب الأطفال" className="flex-1" />
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeNote(item.id)}>
                    🗑️
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={addNote}>+ إضافة ملاحظة أخرى</Button>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* 7. Closing & Contact */}
      <AccordionItem value="closing" className="border border-border rounded-xl bg-white px-4">
        <AccordionTrigger className="hover:no-underline font-bold text-right py-4">
          الخاتمة والتواصل
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2 pb-4 text-right">
          <div className="space-y-2">
            <label className="text-sm font-medium">كلمة الختام</label>
            <Input value={data.closing?.text || ''} onChange={(e) => updateNested('closing', 'text', e.target.value)} placeholder="مثال: وجودكم يزيد فرحتنا" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">الهاشتاك (Hashtag)</label>
            <Input value={data.closing?.hashtag || ''} onChange={(e) => updateNested('closing', 'hashtag', e.target.value)} placeholder="مثال: #أحمد_وزهراء" />
          </div>
          
          <div className="pt-4 border-t border-border space-y-4">
            <h4 className="font-bold text-sm">التواصل عبر الواتساب (اختياري)</h4>
            <div className="space-y-2">
              <label className="text-sm font-medium">اسم جهة التواصل</label>
              <Input value={data.contact?.name || ''} onChange={(e) => updateNested('contact', 'name', e.target.value)} placeholder="مثال: أحمد" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">رقم الواتساب</label>
              <Input dir="ltr" value={data.contact?.whatsapp || ''} onChange={(e) => updateNested('contact', 'whatsapp', e.target.value)} placeholder="مثال: +9647701234567" className="text-left" />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* 8. Gallery (Media Upload) */}
      <AccordionItem value="gallery" className="border border-border rounded-xl bg-white px-4">
        <AccordionTrigger className="hover:no-underline font-bold text-right py-4">
          معرض الصور
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2 pb-4 text-right">
          <GalleryUploader 
            invitationId={invitationId} 
            gallery={data.gallery || []} 
            onChange={(newGallery) => update('gallery', newGallery)} 
          />
        </AccordionContent>
      </AccordionItem>

      {/* 9. Music (Media Upload) */}
      <AccordionItem value="music" className="border border-border rounded-xl bg-white px-4">
        <AccordionTrigger className="hover:no-underline font-bold text-right py-4">
          الموسيقى
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2 pb-4 text-right">
          <MusicUploader 
            invitationId={invitationId} 
            music={data.music} 
            onChange={(newMusic) => update('music', newMusic)} 
          />
        </AccordionContent>
      </AccordionItem>

      {/* Placeholders for Future Phases */}
      <AccordionItem value="future-features" className="border border-border rounded-xl bg-muted/50 px-4 opacity-70">
        <AccordionTrigger className="hover:no-underline font-bold text-right py-4 text-muted-foreground">
          ميزات قادمة (المراحل القادمة)
        </AccordionTrigger>
        <AccordionContent className="space-y-2 pt-2 pb-4 text-right text-sm text-muted-foreground">
          <p>• نظام تأكيد الحضور (RSVP)</p>
          <p>• إنشاء قصة (Story Generator)</p>
        </AccordionContent>
      </AccordionItem>

    </Accordion>
  )
}
