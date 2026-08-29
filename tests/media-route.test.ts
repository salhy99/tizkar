import { isStructurallyValid, authorizeMediaRequest } from '../src/lib/auth/media-auth'
import { InvitationData } from '../src/components/templates/types'

describe('Media Route Utilities', () => {
  describe('isStructurallyValid', () => {
    it('ALLOW: valid cover path', () => {
      expect(isStructurallyValid('user123/inv123/12345678-1234-4321-8123-1234567890ab.jpg')).toBe(true)
    })
    it('DENY: wrong segments count', () => {
      expect(isStructurallyValid('user123/inv123/nested/12345678-1234-4321-8123-1234567890ab.jpg')).toBe(false)
    })
    it('DENY: bad extension', () => {
      expect(isStructurallyValid('user123/inv123/12345678-1234-4321-8123-1234567890ab.exe')).toBe(false)
    })
    it('DENY: directory traversal', () => {
      expect(isStructurallyValid('user123/inv123/../../12345678-1234-4321-8123-1234567890ab.jpg')).toBe(false)
    })
    it('DENY: invalid uuid', () => {
      expect(isStructurallyValid('user123/inv123/not-a-uuid.jpg')).toBe(false)
    })
  })

  describe('authorizeMediaRequest', () => {
    const validData: InvitationData = {
      coverImage: 'user123/inv123/11111111-1234-4321-8123-1234567890ab.jpg',
      gallery: ['user123/inv123/22222222-1234-4321-8123-1234567890ab.jpg'],
      music: {
        type: 'MP3',
        url: 'user123/inv123/33333333-1234-4321-8123-1234567890ab.mp3'
      }
    }

    const mockInv = (status = 'PUBLISHED', is_published = true, expires_at: string | null = null, data = validData) => ({
      status,
      expires_at,
      invitation_versions: [
        { is_published, invitation_data: data as unknown as Record<string, unknown> }
      ]
    })

    it('ALLOW: editor access', () => {
      expect(authorizeMediaRequest('any/path.jpg', 'inv123', true, null)).toBe(true)
    })

    it('DENY: no editor, no inv', () => {
      expect(authorizeMediaRequest('any/path.jpg', 'inv123', false, null)).toBe(false)
    })

    it('DENY: draft invitation for guest', () => {
      expect(authorizeMediaRequest(validData.coverImage!, 'inv123', false, mockInv('DRAFT', false))).toBe(false)
    })

    it('ALLOW: published cover image', () => {
      expect(authorizeMediaRequest(validData.coverImage!, 'inv123', false, mockInv())).toBe(true)
    })

    it('ALLOW: published gallery image', () => {
      expect(authorizeMediaRequest(validData.gallery![0], 'inv123', false, mockInv())).toBe(true)
    })

    it('ALLOW: published music mp3', () => {
      expect(authorizeMediaRequest(validData.music!.url!, 'inv123', false, mockInv())).toBe(true)
    })

    it('DENY: orphan object in published invitation', () => {
      expect(authorizeMediaRequest('user123/inv123/44444444-1234-4321-8123-1234567890ab.jpg', 'inv123', false, mockInv())).toBe(false)
    })

    it('DENY: expired invitation', () => {
      const past = new Date(Date.now() - 10000).toISOString()
      expect(authorizeMediaRequest(validData.coverImage!, 'inv123', false, mockInv('PUBLISHED', true, past))).toBe(false)
    })
  })
})
