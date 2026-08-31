import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { BackupObject, StorageDestinationAdapter } from './interfaces';

export class LocalFsDestination implements StorageDestinationAdapter {
  constructor(private basePath: string) {}

  private async ensureDir(filePath: string) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  async putObject(key: string, data: Blob, mime: string): Promise<{ success: boolean; checksum?: string }> {
    const filePath = path.join(this.basePath, key);
    await this.ensureDir(filePath);
    
    const buffer = Buffer.from(await data.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    
    // Save metadata
    const metadata = { mime, size: buffer.length, created_at: new Date().toISOString() };
    await fs.writeFile(`${filePath}.meta.json`, JSON.stringify(metadata));

    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    return { success: true, checksum: hash };
  }

  async headObject(key: string): Promise<BackupObject | null> {
    const filePath = path.join(this.basePath, key);
    try {
      const stats = await fs.stat(filePath);
      let mime = 'application/octet-stream';
      try {
        const metaFile = await fs.readFile(`${filePath}.meta.json`, 'utf-8');
        const meta = JSON.parse(metaFile);
        mime = meta.mime || mime;
      } catch {
        // No meta file
      }

      // Compute checksum
      const buffer = await fs.readFile(filePath);
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');

      return {
        key,
        size: stats.size,
        mime,
        created_at: stats.birthtime.toISOString(),
        updated_at: stats.mtime.toISOString(),
        checksum: hash
      };
    } catch (e: unknown) {
      if ((e as Error & { code?: string }).code === 'ENOENT') return null;
      throw e;
    }
  }

  async listObjects(prefix: string = ''): Promise<BackupObject[]> {
    const objects: BackupObject[] = [];
    const rootDir = path.join(this.basePath, prefix);
    
    async function walk(dir: string) {
      let entries: string[] = [];
      try {
        entries = await fs.readdir(dir);
      } catch (e: unknown) {
        if ((e as Error & { code?: string }).code === 'ENOENT') return;
        throw e;
      }
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        if (entry.endsWith('.meta.json')) continue;
        
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          await walk(fullPath);
        } else {
          // It's a file, get meta
          const relPath = path.relative(rootDir, fullPath);
          const key = prefix ? path.join(prefix, relPath).replace(/\\/g, '/') : relPath.replace(/\\/g, '/');
          
          let mime = 'application/octet-stream';
          try {
            const metaFile = await fs.readFile(`${fullPath}.meta.json`, 'utf-8');
            const meta = JSON.parse(metaFile);
            mime = meta.mime || mime;
          } catch {
            // Ignore
          }
          
          const buffer = await fs.readFile(fullPath);
          const hash = crypto.createHash('sha256').update(buffer).digest('hex');

          objects.push({
            key,
            size: stat.size,
            mime,
            created_at: stat.birthtime.toISOString(),
            updated_at: stat.mtime.toISOString(),
            checksum: hash
          });
        }
      }
    }

    await walk(rootDir);
    return objects;
  }
}
