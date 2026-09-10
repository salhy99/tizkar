import { SupabaseClient } from '@supabase/supabase-js';
import { BackupObject, StorageSourceAdapter } from './interfaces';

export class SupabaseStorageSource implements StorageSourceAdapter {
  constructor(private supabase: SupabaseClient, private bucketName: string) {}

  async listObjects(prefix: string = '', limit: number = 100): Promise<BackupObject[]> {
    const objects: BackupObject[] = [];
    let currentOffset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase.storage.from(this.bucketName).list(prefix, {
        limit,
        offset: currentOffset,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (error) {
        console.error(`[SupabaseSource] Error listing objects in ${prefix}:`, error);
        throw error;
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      const folders: string[] = [];

      for (const item of data) {
        if (!item.id && item.name) {
          // It's a folder, store it for recursive processing later to avoid interleaving pages with recursive calls
          folders.push(item.name);
        } else if (item.id && item.name !== '.emptyFolderPlaceholder') {
          objects.push({
            key: prefix ? `${prefix}/${item.name}` : item.name,
            size: item.metadata?.size || 0,
            mime: item.metadata?.mimetype || 'application/octet-stream',
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || new Date().toISOString(),
            etag: item.metadata?.eTag?.replace(/"/g, '') || undefined,
          });
        }
      }

      currentOffset += limit;
      if (data.length < limit) {
        hasMore = false;
      }

      // Process folders after consuming the current page
      for (const folderName of folders) {
        const subfolderPrefix = prefix ? `${prefix}/${folderName}` : folderName;
        const subObjects = await this.listObjects(subfolderPrefix, limit);
        objects.push(...subObjects);
      }
    }

    return objects;
  }

  async getObject(key: string): Promise<Blob | null> {
    const { data, error } = await this.supabase.storage.from(this.bucketName).download(key);
    if (error) {
      console.error(`[SupabaseSource] Error downloading ${key}:`, error);
      return null;
    }
    return data;
  }
  async getObjectMetadata(key: string): Promise<BackupObject | null> {
    const parts = key.split('/');
    const filename = parts.pop() || '';
    const folder = parts.join('/');
    
    const { data, error } = await this.supabase.storage.from(this.bucketName).list(folder, {
      limit: 1,
      search: filename
    });

    if (error || !data || data.length === 0) return null;

    const item = data.find(d => d.name === filename);
    if (!item || !item.id) return null;

    return {
      key,
      size: item.metadata?.size || 0,
      mime: item.metadata?.mimetype || 'application/octet-stream',
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || new Date().toISOString(),
      etag: item.metadata?.eTag?.replace(/"/g, '') || undefined,
    };
  }
}
