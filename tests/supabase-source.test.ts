import { describe, it, expect, vi } from 'vitest';
import { SupabaseStorageSource } from '../src/lib/storage/backup/supabase-source';
import { SupabaseClient } from '@supabase/supabase-js';

describe('SupabaseStorageSource', () => {
  it('should paginate correctly beyond the limit', async () => {
    // Generate 150 items
    const items = Array.from({ length: 150 }).map((_, i) => ({
      id: `id-${i}`,
      name: `file-${i}.txt`,
      metadata: { size: 100, mimetype: 'text/plain' },
    }));

    const mockList = vi.fn().mockImplementation((prefix, options) => {
      const { limit, offset } = options;
      const sliced = items.slice(offset, offset + limit);
      return Promise.resolve({ data: sliced, error: null });
    });

    const mockSupabase = {
      storage: {
        from: vi.fn().mockReturnValue({ list: mockList }),
      },
    } as unknown as SupabaseClient;

    const source = new SupabaseStorageSource(mockSupabase, 'test-bucket');
    const result = await source.listObjects('', 100);

    expect(result).toHaveLength(150);
    expect(mockList).toHaveBeenCalledTimes(2); // One for 0-100, one for 100-150
  });

  it('should list recursive folders without infinite loops', async () => {
    const mockList = vi.fn().mockImplementation((prefix, options) => {
      if (prefix === '') {
        return Promise.resolve({
          data: [{ id: null, name: 'folder1' }, { id: '1', name: 'file1.txt' }],
          error: null,
        });
      } else if (prefix === 'folder1') {
        return Promise.resolve({
          data: [{ id: '2', name: 'file2.txt' }],
          error: null,
        });
      }
      return Promise.resolve({ data: [], error: null });
    });

    const mockSupabase = {
      storage: {
        from: vi.fn().mockReturnValue({ list: mockList }),
      },
    } as unknown as SupabaseClient;

    const source = new SupabaseStorageSource(mockSupabase, 'test-bucket');
    const result = await source.listObjects('', 100);

    expect(result).toHaveLength(2);
    expect(result.map(r => r.key)).toEqual(['file1.txt', 'folder1/file2.txt']);
  });
});
