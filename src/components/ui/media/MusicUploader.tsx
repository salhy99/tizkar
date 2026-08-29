'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createMediaUploadToken, confirmMediaUpload, deleteMedia } from '@/actions/storage'
import { Button } from '@/components/ui/button'

type MusicUploaderProps = {
  invitationId: string
  music: { url?: string; type?: 'YOUTUBE' | 'MP3' } | undefined
  onChange: (music: { url?: string; type?: 'YOUTUBE' | 'MP3' } | undefined) => void
}

const MAX_SIZE_MB = 10

export default function MusicUploader({ invitationId, music, onChange }: MusicUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'IDLE' | 'UPLOADING' | 'CONFIRMING' | 'SUCCESS' | 'ERROR'>('IDLE')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Cleanup Blob URLs
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.type !== 'audio/mpeg') {
      alert('عذراً، المسموح فقط ملفات MP3.')
      return
    }

    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`عذراً، حجم الملف يجب أن لا يتجاوز ${MAX_SIZE_MB}MB.`)
      return
    }

    // Cleanup previous if exists
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    setStatus('IDLE')
    setProgress(0)
    setErrorMsg(null)
  }

  const handleUpload = async () => {
    if (!file) return

    setStatus('UPLOADING')
    setErrorMsg(null)

    try {
      // 1. Get Token
      const tokenRes = await createMediaUploadToken(invitationId, file.type, 'music')
      if (!tokenRes.success || !tokenRes.signedUrl || !tokenRes.path) {
        throw new Error(tokenRes.error || 'فشل الحصول على إذن الرفع')
      }

      // 2. Upload via XHR for progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', tokenRes.signedUrl!, true)
        xhr.setRequestHeader('Content-Type', file.type)
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100)
            setProgress(percent)
          }
        }
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error('فشل رفع الملف'))
        }
        
        xhr.onerror = () => reject(new Error('خطأ في الاتصال بالشبكة'))
        xhr.send(file)
      })

      // 3. Confirm Upload
      setStatus('CONFIRMING')
      const confirmRes = await confirmMediaUpload(invitationId, tokenRes.path, 'music')
      if (!confirmRes.success || !confirmRes.path) {
        throw new Error(confirmRes.error || 'فشل تأكيد الملف')
      }

      // 4. Success -> Add to Music state, then clean up old if exists
      setStatus('SUCCESS')
      const newMusic = { url: confirmRes.path, type: 'MP3' as const }
      
      const oldUrl = music?.url
      onChange(newMusic)
      
      // Best-effort cleanup of old track
      if (oldUrl && oldUrl !== confirmRes.path) {
        deleteMedia(invitationId, oldUrl).catch(console.error)
      }

    } catch (err: unknown) {
      setStatus('ERROR')
      setErrorMsg(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف الموسيقى الحالية؟')) return
    
    setFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setStatus('IDLE')
    
    const oldUrl = music?.url
    onChange(undefined)
    
    if (oldUrl) {
      await deleteMedia(invitationId, oldUrl).catch(console.error)
    }
  }

  const hasExistingMusic = music?.url && music.type === 'MP3'

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">الموسيقى الخلفية (MP3)</span>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="audio/mpeg" 
        onChange={handleFileSelect} 
      />

      {/* State: Has Existing, No New File */}
      {hasExistingMusic && !file && (
        <div className="p-4 bg-muted/30 border border-border rounded-xl flex items-center justify-between">
          <div className="text-sm">يوجد مقطع صوتي محفوظ</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              استبدال
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              حذف
            </Button>
          </div>
        </div>
      )}

      {/* State: No File Selected */}
      {!hasExistingMusic && !file && (
        <div className="text-center py-6 bg-muted/30 rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground mb-4">لم تقم بإضافة موسيقى</p>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>+ اختيار ملف MP3</Button>
        </div>
      )}

      {/* State: New File Selected */}
      {file && (
        <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-4">
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="truncate flex-1 ml-2">{file.name}</span>
            <span className="text-muted-foreground text-xs shrink-0">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>

          {previewUrl && (
            <audio ref={audioRef} controls className="w-full h-10" src={previewUrl} />
          )}

          {status === 'IDLE' && (
            <div className="flex gap-2">
              <Button onClick={handleUpload} className="flex-1">رفع الملف</Button>
              <Button variant="outline" onClick={handleDelete}>إلغاء</Button>
            </div>
          )}

          {status === 'UPLOADING' && (
            <div className="text-sm text-center font-bold text-primary">
              جاري الرفع... {progress}%
            </div>
          )}

          {status === 'CONFIRMING' && (
            <div className="text-sm text-center font-bold text-primary">
              جاري التأكيد مع الخادم...
            </div>
          )}

          {status === 'SUCCESS' && (
            <div className="text-sm text-center font-bold text-green-600 flex justify-between items-center">
              <span>تم الحفظ بنجاح ✓</span>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>تغيير</Button>
            </div>
          )}

          {status === 'ERROR' && (
            <div className="text-sm text-center font-bold text-red-600 space-y-2">
              <div>خطأ: {errorMsg}</div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={handleUpload}>إعادة المحاولة</Button>
                <Button variant="ghost" size="sm" onClick={handleDelete}>إلغاء</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
