import { SupabaseClient } from '@supabase/supabase-js';
import { BackupObject, StorageSourceAdapter } from './interfaces';

export class SupabaseStorageSource implements StorageSourceAdapter {
  constructor(private supabase: SupabaseClient, private bucketName: string) {}

  async listObjects(prefix: string = '', limit: number = 100, offset: number = 0): Promise<BackupObject[]> {
    const { data, error } = await this.supabase.storage.from(this.bucketName).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      console.error(`[SupabaseSource] Error listing objects in ${prefix}:`, error);
      throw error;
    }

    if (!data) return [];

    const objects: BackupObject[] = [];
    for (const item of data) {
      // Supabase returns folders as items without an ID but with a name
      if (!item.id && item.name) {
        // Recursive call to list subfolder contents
        const subfolderPrefix = prefix ? `${prefix}/${item.name}` : item.name;
        const subObjects = await this.listObjects(subfolderPrefix, limit, 0); // we might need pagination here too later
        objects.push(...subObjects);
      } else if (item.id) {
        objects.push({
          key: prefix ? `${prefix}/${item.name}` : item.name,
          size: item.metadata?.size || 0,
          mime: item.metadata?.mimetype || 'application/octet-stream',
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
        });
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
}
