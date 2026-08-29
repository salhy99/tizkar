// Removed unused InvitationData import

export function isStructurallyValid(path: string): boolean {
  if (!path || typeof path !== 'string') return false
  if (path.includes('..') || path.startsWith('/') || path.includes('?') || path.includes('#') || path.includes('\\')) return false
  if (path.includes('%2e%2e') || path.includes('%2f')) return false
  
  const segments = path.split('/')
  if (segments.length !== 3) return false
  
  const filename = segments[2]
  const parts = filename.split('.')
  if (parts.length !== 2) return false
  
  const [uuid, ext] = parts
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(uuid)) return false
  
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'mp3']
  if (!allowedExts.includes(ext.toLowerCase())) return false
  
  return true
}

export type MediaInvitationData = {
  coverImage?: string | null;
  gallery?: string[] | null;
  music?: { type: string; url: string } | null;
};

export function authorizeMediaRequest(
  path: string, 
  invitationId: string, 
  isEditor: boolean, 
  inv: { user_id?: string | null; status: string | null; expires_at: string | null; invitation_versions: { is_published: boolean | null; invitation_data: MediaInvitationData }[] } | null
): boolean {
  if (isEditor) return true

  if (!inv) return false
  if (inv.status !== 'PUBLISHED') return false
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) return false

  const publishedVersion = inv.invitation_versions.find(v => v.is_published)
  if (!publishedVersion) return false

  const data = publishedVersion.invitation_data
  
  const isReferenced = 
    data.coverImage === path ||
    (Array.isArray(data.gallery) && data.gallery.includes(path)) ||
    (data.music?.type === 'MP3' && data.music.url === path)

  return !!isReferenced
}
