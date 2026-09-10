import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { StorageSourceAdapter, BackupObject } from '../interfaces';
import crypto from 'crypto';

export interface WriterResult {
  object_key: string;
  sha256: string;
  size: number;
  status: 'UPLOADED' | 'DEDUPLICATED' | 'FAILED';
  error_code?: string;
}

export class ContentAddressedWriter {
  constructor(
    private s3Client: S3Client,
    private destinationBucket: string,
    private sourceAdapter: StorageSourceAdapter
  ) {}

  async processObject(sourceObj: BackupObject): Promise<WriterResult> {
    try {
      const data = await this.sourceAdapter.getObject(sourceObj.key);
      if (!data) {
        return { object_key: '', sha256: '', size: 0, status: 'FAILED', error_code: 'SOURCE_DOWNLOAD_FAILED' };
      }

      // Check for mutation during backup: Size mismatch
      if (data.size !== sourceObj.size) {
        return { object_key: '', sha256: '', size: data.size, status: 'FAILED', error_code: 'SOURCE_CHANGED_DURING_COPY' };
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      const contentKey = `objects/${hash}`;

      // 4. inspect destination object
      try {
        const head = await this.s3Client.send(new HeadObjectCommand({ Bucket: this.destinationBucket, Key: contentKey }));
        
        // If present, verify metadata
        const storedSha = head.Metadata?.['x-tizkar-sha256'];
        if (storedSha && storedSha !== hash) {
          // Collision or overwrite attempt
          return { object_key: contentKey, sha256: hash, size: data.size, status: 'FAILED', error_code: 'DESTINATION_HASH_CONFLICT' };
        }
        
        if (head.ContentLength !== undefined && head.ContentLength !== data.size) {
           return { object_key: contentKey, sha256: hash, size: data.size, status: 'FAILED', error_code: 'DESTINATION_HASH_CONFLICT' };
        }

        // Integrity matches, no upload needed
        return { object_key: contentKey, sha256: hash, size: data.size, status: 'DEDUPLICATED' };
      } catch (err: any) {
        if (err.name !== 'NotFound' && err.name !== 'NoSuchKey') {
           return { object_key: contentKey, sha256: hash, size: data.size, status: 'FAILED', error_code: 'DESTINATION_HEAD_FAILED' };
        }
        // Object missing, proceed to upload
      }

      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.destinationBucket,
        Key: contentKey,
        Body: buffer,
        ContentType: sourceObj.mime,
        Metadata: {
          'x-tizkar-sha256': hash,
          'x-tizkar-size': data.size.toString(),
        }
      }));

      return { object_key: contentKey, sha256: hash, size: data.size, status: 'UPLOADED' };
    } catch (err) {
       console.error(`[SnapshotWriter] Upload failed for ${sourceObj.key}`, err);
       return { object_key: '', sha256: '', size: 0, status: 'FAILED', error_code: 'DESTINATION_UPLOAD_FAILED' };
    }
  }
}
