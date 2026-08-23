'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createMediaUploadToken, confirmMediaUpload } from '@/actions/storage'
import { Button } from '@/components/ui/button'

type UploadItem = {
  id: string
  file: File
  status: 'PENDING' | 'UPLOADING' | 'CONFIRMING' | 'SUCCESS' | 'ERROR'
  progress: number
  errorMsg: string | null
  previewUrl: string
  path: string | null
}

type GalleryUploaderProps = {
  invitationId: string
  gallery: string[]
  onChange: (gallery: string[]) => void
}

const MAX_IMAGES = 20
const MAX_SIZE_MB = 5
const MAX_CONCURRENT = 2

export default function GalleryUploader({ invitationId, gallery, onChange }: GalleryUploaderProps) {
  const [queue, setQueue] = useState<UploadItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cleanup Blob URLs when unmounting or removing items
  useEffect(() => {
    return () => {
      queue.forEach(item => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl)
        }
      })
    }
  }, [queue])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const totalCount = gallery.length + queue.length + files.length
    if (totalCount > MAX_IMAGES) {
      alert(`عذراً، الحد الأقصى هو ${MAX_IMAGES} صورة.`)
      return
    }

    const newItems: UploadItem[] = []
    
    files.forEach(file => {
      // Client validation
      const isAllowedMime = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      const isAllowedSize = file.size <= MAX_SIZE_MB * 1024 * 1024

      if (!isAllowedMime || !isAllowedSize) {
        alert(`الملف ${file.name} غير صالح. (حجمه فوق ${MAX_SIZE_MB}MB أو صيغته غير مدعومة)`)
        return
      }

      newItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        status: 'PENDING',
        progress: 0,
        errorMsg: null,
        previewUrl: URL.createObjectURL(file),
        path: null
      })
    })

    setQueue(prev => [...prev, ...newItems])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Process Queue
  useEffect(() => {
    const processQueue = async () => {
      const activeUploads = queue.filter(q => q.status === 'UPLOADING' || q.status === 'CONFIRMING').length
      
      if (activeUploads >= MAX_CONCURRENT) return

      const nextItem = queue.find(q => q.status === 'PENDING')
      if (!nextItem) return

      // Start upload
      updateItem(nextItem.id, { status: 'UPLOADING' })

      try {
        // 1. Get Token
        const tokenRes = await createMediaUploadToken(invitationId, nextItem.file.type, 'gallery')
        if (!tokenRes.success || !tokenRes.signedUrl || !tokenRes.path) {
          throw new Error(tokenRes.error || 'فشل الحصول على إذن الرفع')
        }

        // 2. Upload via XHR for progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', tokenRes.signedUrl!, true)
          xhr.setRequestHeader('Content-Type', nextItem.file.type)
          
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100)
              updateItem(nextItem.id, { progress: percent })
            }
          }
          
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve()
            else reject(new Error('فشل رفع الملف'))
          }
          
          xhr.onerror = () => reject(new Error('خطأ في الاتصال بالشبكة'))
          xhr.send(nextItem.file)
        })

        // 3. Confirm Upload
        updateItem(nextItem.id, { status: 'CONFIRMING' })
        const confirmRes = await confirmMediaUpload(invitationId, tokenRes.path, 'gallery')
        if (!confirmRes.success || !confirmRes.path) {
          throw new Error(confirmRes.error || 'فشل تأكيد الملف')
        }

        // 4. Success -> Add to Gallery state
        updateItem(nextItem.id, { status: 'SUCCESS', path: confirmRes.path })
        onChange([...gallery, confirmRes.path])

      } catch (err: any) {
        updateItem(nextItem.id, { status: 'ERROR', errorMsg: err.message })
      }
    }

    processQueue()
  }, [queue, invitationId, gallery, onChange])

  const updateItem = (id: string, updates: Partial<UploadItem>) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
  }

  const handleRemoveExisting = (pathToRemove: string) => {
    onChange(gallery.filter(p => p !== pathToRemove))
  }

  const handleRemoveQueueItem = (id: string) => {
    const item = queue.find(q => q.id === id)
    if (item && item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl)
    }
    setQueue(prev => prev.filter(q => q.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">الصور ({gallery.length + queue.filter(q => q.status === 'SUCCESS').length} / {MAX_IMAGES})</span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fileInputRef.current?.click()}
          disabled={gallery.length + queue.length >= MAX_IMAGES}
        >
          + إضافة صور
        </Button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/jpeg,image/png,image/webp" 
          multiple
          onChange={handleFileSelect} 
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* Existing Images (Using raw path logic temporarily for UI representation) */}
        {gallery.map((path, idx) => (
          <div key={`exist-${idx}`} className="relative aspect-square bg-muted rounded-md border border-border overflow-hidden flex items-center justify-center">
            {/* Note: since Phase 6.3-F is not active, raw paths won't load in <img>. We show a placeholder. */}
            <span className="text-xs text-muted-foreground text-center px-2 truncate">صورة محفوظة<br/>(Phase 6.3-F)</span>
            <Button 
              variant="destructive" 
              size="icon" 
              className="absolute top-1 left-1 w-6 h-6 rounded-full" 
              onClick={() => handleRemoveExisting(path)}
            >
              ×
            </Button>
          </div>
        ))}

        {/* Uploading/New Queue Images */}
        {queue.map(item => (
          <div key={item.id} className="relative aspect-square bg-muted rounded-md border border-border overflow-hidden">
            <img src={item.previewUrl} className="object-cover w-full h-full opacity-50" alt="Preview" />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 bg-black/40 text-white text-xs text-center font-bold">
              {item.status === 'PENDING' && <span>في الانتظار...</span>}
              {item.status === 'UPLOADING' && <span>{item.progress}%</span>}
              {item.status === 'CONFIRMING' && <span>جاري التأكيد...</span>}
              {item.status === 'SUCCESS' && <span className="text-green-400">✓ تم</span>}
              {item.status === 'ERROR' && <span className="text-red-400 truncate w-full">{item.errorMsg}</span>}
            </div>

            <Button 
              variant="destructive" 
              size="icon" 
              className="absolute top-1 left-1 w-6 h-6 rounded-full opacity-80 hover:opacity-100 z-10" 
              onClick={() => handleRemoveQueueItem(item.id)}
            >
              ×
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
