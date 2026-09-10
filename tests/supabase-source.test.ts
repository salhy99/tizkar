import { describe, it, expect, vi } from 'vitest';
import { SupabaseStorageSource } from '../src/lib/storage/backup/supabase-source';
import { SupabaseClient } from '@supabase/supabase-js';

describe('SupabaseStorageSource Enumeration', () => {
  it('discovers synthetic/restore-drill-v1/sample.png and paginates correctly', async () => {
    // Mock the pagination behavior:
    // First call to list('') returns 100 folders
    // Second call to list('') returns the 'synthetic' folder (hasMore = false)
    const mockList = vi.fn().mockImplementation(async (prefix, options) => {
      if (prefix === '') {
        if (options.offset === 0) {
          return {
            data: Array.from({ length: 100 }).map((_, i) => ({
              name: `user_folder_${i}`,
              id: null
            })),
            error: null
          };
        } else if (options.offset === 100) {
          return {
            data: [
              { name: 'synthetic', id: null }
            ],
            error: null
          };
        }
        return { data: [], error: null };
      }
      
      if (prefix === 'synthetic') {
        return { data: [{ name: 'restore-drill-v1', id: null }], error: null };
      }
      if (prefix === 'synthetic/restore-drill-v1') {
        return {
          data: [{
            name: 'sample.png',
            id: 'file-id-1',
            metadata: { size: 68, mimetype: 'image/png' },
            created_at: '2026-09-09T00:00:00.000Z',
            updated_at: '2026-09-09T00:00:00.000Z'
          }],
          error: null
        };
      }
      return { data: [], error: null };
    });

    const mockSupabase = {
      storage: {
        from: vi.fn().mockReturnValue({
          list: mockList
        })
      }
    } as unknown as SupabaseClient;

    const source = new SupabaseStorageSource(mockSupabase, 'invitations_assets');
    const objects = await source.listObjects('', 100, 0);

    const syntheticObj = objects.find(o => o.key === 'synthetic/restore-drill-v1/sample.png');
    expect(syntheticObj).toBeDefined();
    expect(syntheticObj?.size).toBe(68);
    expect(syntheticObj?.mime).toBe('image/png');
    
    // Verify that the pagination loop was exercised
    // The first call to list('') is limit: 100, offset: 0
    // The second call to list('') is limit: 100, offset: 100
    expect(mockList).toHaveBeenCalledWith('', expect.objectContaining({ limit: 100, offset: 0 }));
    expect(mockList).toHaveBeenCalledWith('', expect.objectContaining({ limit: 100, offset: 100 }));
  });
});
