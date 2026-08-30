

vi.mock('@/lib/supabase/server', () => {
  return {
    createClient: vi.fn(),
  }
})

vi.mock('@/lib/entitlements/server', () => {
  return {
    requireInvitationLimit: vi.fn(),
    requireInvitationFeature: vi.fn(),
    getInvitationEntitlements: vi.fn(),
  }
})

vi.mock('@/lib/auth/invitation-auth', () => {
  return {
    requireInvitationEditAccess: vi.fn(),
  }
})

const mockRemove = vi.fn().mockResolvedValue({ data: {} })

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => ({
      storage: {
        from: vi.fn(() => ({
          remove: mockRemove
        }))
      }
    }))
  }
})

import { deleteMedia } from '../src/actions/storage'
import { requireInvitationEditAccess } from '@/lib/auth/invitation-auth'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key'

describe('deleteMedia Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({})
    })
  })

  it('validates invitationId and path ownership for authenticated user', async () => {
    // @ts-expect-error mock
    requireInvitationEditAccess.mockResolvedValue({ user_id: 'user123' })
    
    const res = await deleteMedia('inv123', 'user123/inv123/uuid.jpg')
    
    expect(requireInvitationEditAccess).toHaveBeenCalledWith('inv123')
    expect(res).toEqual({ success: true })
  })

  it('validates invitationId and path ownership for anonymous user', async () => {
    // @ts-expect-error mock
    requireInvitationEditAccess.mockResolvedValue({ user_id: null })
    
    const res = await deleteMedia('inv123', 'anon/inv123/uuid.jpg')
    
    expect(res).toEqual({ success: true })
  })

  it('rejects foreign anon path (wrong invitation id)', async () => {
    // @ts-expect-error mock
    requireInvitationEditAccess.mockResolvedValue({ user_id: null })
    
    const res = await deleteMedia('inv123', 'anon/inv999/uuid.jpg')
    
    expect(res).toEqual({ success: false, error: 'Path mismatch' })
  })

  it('rejects foreign user path (wrong invitation id)', async () => {
    // @ts-expect-error mock
    requireInvitationEditAccess.mockResolvedValue({ user_id: 'user123' })
    
    const res = await deleteMedia('inv123', 'user123/inv999/uuid.jpg')
    
    expect(res).toEqual({ success: false, error: 'Path mismatch' })
  })

  it('rejects foreign user path (wrong user id)', async () => {
    // @ts-expect-error mock
    requireInvitationEditAccess.mockResolvedValue({ user_id: 'user123' })
    
    const res = await deleteMedia('inv123', 'otheruser/inv123/uuid.jpg')
    
    expect(res).toEqual({ success: false, error: 'Path mismatch' })
  })

  it('rejects malformed path', async () => {
    // @ts-expect-error mock
    requireInvitationEditAccess.mockResolvedValue({ user_id: 'user123' })
    
    const res = await deleteMedia('inv123', 'user123/inv123/folder/uuid.jpg')
    
    expect(res).toEqual({ success: false, error: 'Invalid path structure' })
  })

  it('rejects path traversal attempts', async () => {
    // @ts-expect-error mock
    requireInvitationEditAccess.mockResolvedValue({ user_id: 'user123' })
    
    const res = await deleteMedia('inv123', 'user123/inv123/../uuid.jpg')
    
    expect(res).toEqual({ success: false, error: 'Invalid path' })
  })

  it('rejects absolute paths', async () => {
    // @ts-expect-error mock
    requireInvitationEditAccess.mockResolvedValue({ user_id: 'user123' })
    
    const res = await deleteMedia('inv123', '/user123/inv123/uuid.jpg')
    
    expect(res).toEqual({ success: false, error: 'Invalid path' })
  })

  it('handles storage deletion failure', async () => {
    // @ts-expect-error mock
    requireInvitationEditAccess.mockResolvedValue({ user_id: 'user123' })
    
    mockRemove.mockResolvedValueOnce({ error: 'Storage Error' })
    
    const res = await deleteMedia('inv123', 'user123/inv123/uuid.jpg')
    
    expect(res).toEqual({ success: false, error: 'Failed to delete file from storage' })
  })
})
