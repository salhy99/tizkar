export interface BackupObject {
  key: string;
  size: number;
  mime: string;
  created_at: string;
  updated_at: string;
  checksum?: string;
  etag?: string;
}

export interface StorageSourceAdapter {
  listObjects(prefix?: string, limit?: number, offset?: number): Promise<BackupObject[]>;
  getObject(key: string): Promise<Blob | null>;
}

export interface StorageDestinationAdapter {
  putObject(key: string, data: Blob, mime: string): Promise<{ success: boolean; checksum?: string }>;
  headObject(key: string): Promise<BackupObject | null>;
  listObjects(prefix?: string): Promise<BackupObject[]>;
}
