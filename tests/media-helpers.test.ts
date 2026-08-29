
import { 
  calculateRemainingImages, 
  isImageLimitReached, 
  formatQuota, 
  normalizeLegacyGallery, 
  moveGalleryItem, 
  handleCoverDeletion 
} from '../src/lib/media-helpers'

describe('Media Helpers', () => {
  it('calculateRemainingImages', () => {
    expect(calculateRemainingImages(3, 10)).toBe(7)
    expect(calculateRemainingImages(10, 10)).toBe(0)
    expect(calculateRemainingImages(12, 10)).toBe(0) // Should not be negative
  })

  it('isImageLimitReached', () => {
    expect(isImageLimitReached(3, 10)).toBe(false)
    expect(isImageLimitReached(10, 10)).toBe(true)
    expect(isImageLimitReached(12, 10)).toBe(true)
  })

  it('formatQuota', () => {
    expect(formatQuota(3, 10)).toBe('3 / 10')
  })

  it('normalizeLegacyGallery', () => {
    expect(normalizeLegacyGallery(undefined)).toEqual([])
    expect(normalizeLegacyGallery(null)).toEqual([])
    expect(normalizeLegacyGallery(['path1', 'path2'])).toEqual(['path1', 'path2'])
    expect(normalizeLegacyGallery([{ id: '1' }, 'path2'])).toEqual(['path2']) // strips out objects
  })

  it('moveGalleryItem', () => {
    const arr = ['a', 'b', 'c', 'd']
    expect(moveGalleryItem(arr, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveGalleryItem(arr, 3, 0)).toEqual(['d', 'a', 'b', 'c'])
    // Out of bounds
    expect(moveGalleryItem(arr, -1, 2)).toEqual(arr)
    expect(moveGalleryItem(arr, 0, 10)).toEqual(arr)
  })

  it('handleCoverDeletion', () => {
    expect(handleCoverDeletion('path1', 'path1')).toBe(undefined)
    expect(handleCoverDeletion('path1', 'path2')).toBe('path1')
    expect(handleCoverDeletion(undefined, 'path2')).toBe(undefined)
  })
})
