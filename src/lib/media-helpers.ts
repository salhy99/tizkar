export function calculateRemainingImages(galleryLength: number, maxImages: number): number {
  return Math.max(0, maxImages - galleryLength)
}

export function isImageLimitReached(galleryLength: number, maxImages: number): boolean {
  return galleryLength >= maxImages
}

export function formatQuota(galleryLength: number, maxImages: number): string {
  return `${galleryLength} / ${maxImages}`
}

export function normalizeLegacyGallery(gallery: unknown): string[] {
  if (!gallery) return []
  if (Array.isArray(gallery)) {
    return gallery.filter(item => typeof item === 'string')
  }
  return []
}

export function moveGalleryItem(gallery: string[], oldIndex: number, newIndex: number): string[] {
  if (oldIndex < 0 || oldIndex >= gallery.length || newIndex < 0 || newIndex >= gallery.length) {
    return [...gallery]
  }
  const newGallery = [...gallery]
  const [movedItem] = newGallery.splice(oldIndex, 1)
  newGallery.splice(newIndex, 0, movedItem)
  return newGallery
}

export function handleCoverDeletion(coverImage: string | undefined, deletedPath: string): string | undefined {
  if (coverImage === deletedPath) return undefined
  return coverImage
}
