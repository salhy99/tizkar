'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createMediaUploadToken, confirmMediaUpload, deleteMedia } from '@/actions/storage'
import { Button } from '@/components/ui/button'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getMediaUrl } from '../../../lib/media-helpers'

type UploadItem = {
  id: string
  file: File
  status: 'PENDING' | 'UPLOADING' | 'CONFIRMING' | 'SUCCESS' | 'ERROR'
  progress: number
  errorMsg: string | null
  previewUrl: string
  path: string | null
}

type MediaGalleryManagerProps = {
  invitationId: string
  gallery: string[]
  coverImage?: string
  onChangeGallery: (gallery: string[]) => void
  onChangeCover: (coverImage: string | undefined) => void
  maxImages: number
}

const MAX_SIZE_MB = 5
const MAX_CONCURRENT = 2

function SortableGalleryItem({ id, path, isCover, onSetCover, onRemove, disabled }: { id: string, path: string, isCover: boolean, onSetCover: () => void, onRemove: () => void, disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  }

  // Use the raw path for now. The public viewer uses this raw path to construct the Supabase storage URL.
  // We need to resolve it for the editor preview if necessary, but typically Next config handles it or we use raw Supabase URL.
  // For safety, we just show a preview text or standard image if we can construct the URL.
  const imageUrl = getMediaUrl(path)

  return (
    <div ref={setNodeRef} style={style} className={`relative aspect-[3/4] bg-muted rounded-xl border-2 overflow-hidden flex flex-col group ${isCover ? 'border-[#A88952] shadow-md' : 'border-border'}`}>
      <div {...attributes} {...listeners} className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} className="w-full h-full object-cover pointer-events-none" alt="Gallery item" />
      </div>
      
      {isCover && (
        <div className="absolute top-2 right-2 bg-[#A88952] text-white text-[10px] font-bold px-2 py-1 rounded-full z-10 pointer-events-none shadow">
          الصورة الرئيسية
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {!isCover && (
          <Button variant="secondary" size="sm" className="h-7 text-xs bg-white/20 text-white hover:bg-white/40 border-none" onClick={(e) => { e.stopPropagation(); onSetCover(); }}>
            تعيين كرئيسية
          </Button>
        )}
        {isCover && <div />}
        <Button variant="destructive" size="sm" className="h-7 w-7 p-0 rounded-full bg-red-500/80 hover:bg-red-600" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          ×
        </Button>
      </div>
    </div>
  )
}

export default function MediaGalleryManager({ invitationId, gallery, coverImage, onChangeGallery, onChangeCover, maxImages }: MediaGalleryManagerProps) {
  const [queue, setQueue] = useState<UploadItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    return () => {
      queue.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      })
    }
  }, [queue])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = gallery.indexOf(active.id as string)
      const newIndex = gallery.indexOf(over.id as string)
      onChangeGallery(arrayMove(gallery, oldIndex, newIndex))
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const totalCount = gallery.length + queue.filter(q => q.status !== 'ERROR').length + files.length
    if (totalCount > maxImages) {
      alert(`عذراً، تبقت لك ${Math.max(0, maxImages - (gallery.length + queue.length))} صورة فقط في باقتك الحالية.`)
      return
    }

    const newItems: UploadItem[] = []
    
    files.forEach(file => {
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

  const updateItem = useCallback((id: string, updates: Partial<UploadItem>) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
  }, [])

  useEffect(() => {
    const processQueue = async () => {
      const activeUploads = queue.filter(q => q.status === 'UPLOADING' || q.status === 'CONFIRMING').length
      if (activeUploads >= MAX_CONCURRENT) return

      const nextItem = queue.find(q => q.status === 'PENDING')
      if (!nextItem) return

      updateItem(nextItem.id, { status: 'UPLOADING' })

      try {
        const tokenRes = await createMediaUploadToken(invitationId, nextItem.file.type, 'gallery')
        if (!tokenRes.success || !tokenRes.signedUrl || !tokenRes.path) {
          throw new Error(tokenRes.error || 'فشل الحصول على إذن الرفع')
        }

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

        updateItem(nextItem.id, { status: 'CONFIRMING' })
        const confirmRes = await confirmMediaUpload(invitationId, tokenRes.path, 'gallery')
        if (!confirmRes.success || !confirmRes.path) {
          throw new Error(confirmRes.error || 'فشل تأكيد الملف')
        }

        updateItem(nextItem.id, { status: 'SUCCESS', path: confirmRes.path })
        
        // Remove from queue visually after a short delay and add to gallery
        setTimeout(() => {
          onChangeGallery([...gallery, confirmRes.path!])
          setQueue(prev => prev.filter(q => q.id !== nextItem.id))
        }, 1000)

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'حدث خطأ'
        updateItem(nextItem.id, { status: 'ERROR', errorMsg: msg })
      }
    }

    processQueue()
  }, [queue, invitationId, gallery, onChangeGallery, updateItem])

  const handleRemoveExisting = async (pathToRemove: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الصورة نهائياً؟')) return

    // Optimitic update
    const newGallery = gallery.filter(p => p !== pathToRemove)
    onChangeGallery(newGallery)
    if (coverImage === pathToRemove) {
      onChangeCover(undefined)
    }

    // Server cleanup
    await deleteMedia(invitationId, pathToRemove)
  }

  const handleRemoveQueueItem = (id: string) => {
    const item = queue.find(q => q.id === id)
    if (item && item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    setQueue(prev => prev.filter(q => q.id !== id))
  }

  const isLimitReached = gallery.length + queue.filter(q => q.status !== 'ERROR').length >= maxImages

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border">
        <div className="text-sm">
          <span className="font-bold text-[#A88952]">الصور</span>
          <div className="text-xs text-muted-foreground mt-1">
            {gallery.length} مستخدمة / {maxImages} مسموحة
          </div>
        </div>
        <Button 
          variant={isLimitReached ? "secondary" : "default"}
          size="sm" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isLimitReached}
          className={!isLimitReached ? 'bg-[#A88952] hover:bg-[#A88952]/90 text-white' : ''}
        >
          {isLimitReached ? 'اكتمل العدد' : '+ إضافة صور'}
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

      <div className="text-xs text-muted-foreground">
        يمكنك سحب وإفلات الصور لترتيبها. الصورة الأولى ستكون في بداية المعرض.
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <SortableContext items={gallery} strategy={rectSortingStrategy}>
            {gallery.map((path) => (
              <SortableGalleryItem 
                key={path} 
                id={path} 
                path={path} 
                isCover={coverImage === path}
                onSetCover={() => onChangeCover(path)}
                onRemove={() => handleRemoveExisting(path)}
                disabled={queue.length > 0} // disable reordering while uploading to avoid state conflicts
              />
            ))}
          </SortableContext>

          {queue.map(item => (
            <div key={item.id} className="relative aspect-[3/4] bg-muted rounded-xl border-2 border-dashed border-primary/50 overflow-hidden flex flex-col">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.previewUrl} className="object-cover w-full h-full opacity-30" alt="Preview" />
              
              <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-primary text-xs text-center font-bold">
                {item.status === 'PENDING' && <span>في الانتظار...</span>}
                {item.status === 'UPLOADING' && <span>{item.progress}%</span>}
                {item.status === 'CONFIRMING' && <span>جاري التأكيد...</span>}
                {item.status === 'SUCCESS' && <span className="text-green-500">✓ تم الرفع</span>}
                {item.status === 'ERROR' && (
                  <div className="text-red-500 flex flex-col gap-1 items-center">
                    <span className="truncate w-full block">{item.errorMsg}</span>
                    <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => updateItem(item.id, { status: 'PENDING', errorMsg: null, progress: 0 })}>
                      إعادة المحاولة
                    </Button>
                  </div>
                )}
              </div>

              {(item.status === 'ERROR' || item.status === 'PENDING') && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="absolute top-1 left-1 w-6 h-6 p-0 rounded-full opacity-80 hover:opacity-100 z-10" 
                  onClick={() => handleRemoveQueueItem(item.id)}
                >
                  ×
                </Button>
              )}
            </div>
          ))}
        </div>
      </DndContext>

      {gallery.length === 0 && queue.length === 0 && (
        <div className="text-center py-10 bg-muted/30 rounded-xl border-2 border-dashed border-border text-muted-foreground">
          لا توجد صور في المعرض
        </div>
      )}
    </div>
  )
}
