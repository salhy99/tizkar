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

  async processObject(sourceObj: BackupObject, maxRetries = 3): Promise<WriterResult> {
    // Aligned with src/actions/storage.ts CATEGORY_SIZE_LIMITS (Max audio is 10MB)
    const MAX_OBJECT_BYTES = 10 * 1024 * 1024; 

    if (sourceObj.size > MAX_OBJECT_BYTES) {
      return { object_key: '', sha256: '', size: sourceObj.size, status: 'FAILED', error_code: 'OVERSIZED_OBJECT_FAILS_CLOSED' };
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const data = await this.sourceAdapter.getObject(sourceObj.key);
        if (!data) {
          return { object_key: '', sha256: '', size: 0, status: 'FAILED', error_code: 'SOURCE_DOWNLOAD_FAILED' };
        }

        // Post-download verification: get fresh metadata
        if (this.sourceAdapter.getObjectMetadata) {
          const freshMeta = await this.sourceAdapter.getObjectMetadata(sourceObj.key);
          if (!freshMeta) {
             if (attempt === maxRetries) return { object_key: '', sha256: '', size: data.size, status: 'FAILED', error_code: 'SOURCE_CHANGED_DURING_COPY' };
             continue;
          }
          if (
            freshMeta.size !== sourceObj.size ||
            freshMeta.updated_at !== sourceObj.updated_at ||
            freshMeta.etag !== sourceObj.etag
          ) {
             if (attempt === maxRetries) return { object_key: '', sha256: '', size: data.size, status: 'FAILED', error_code: 'SOURCE_CHANGED_DURING_COPY' };
             // Update our understanding of the object and retry
             sourceObj = freshMeta;
             continue; 
          }
        } else {
          // Fallback pre-check if metadata fetch isn't supported
          if (data.size !== sourceObj.size) {
             if (attempt === maxRetries) return { object_key: '', sha256: '', size: data.size, status: 'FAILED', error_code: 'SOURCE_CHANGED_DURING_COPY' };
             continue; // Retry
          }
        }

        const buffer = Buffer.from(await data.arrayBuffer());
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        const contentKey = `objects/${hash}`;

        // 4. inspect destination object
        try {
          const head = await this.s3Client.send(new HeadObjectCommand({ Bucket: this.destinationBucket, Key: contentKey }));
          
          const storedSha = head.Metadata?.['x-tizkar-sha256'];
          if (storedSha && storedSha !== hash) {
            return { object_key: contentKey, sha256: hash, size: data.size, status: 'FAILED', error_code: 'DESTINATION_HASH_CONFLICT' };
          }
          
          if (head.ContentLength !== undefined && head.ContentLength !== data.size) {
             return { object_key: contentKey, sha256: hash, size: data.size, status: 'FAILED', error_code: 'DESTINATION_HASH_CONFLICT' };
          }

          // Integrity matches, no upload needed
          return { object_key: contentKey, sha256: hash, size: data.size, status: 'DEDUPLICATED' };
        } catch (err: unknown) {
          const isS3NotFound = err instanceof Error && (err.name === 'NotFound' || err.name === 'NoSuchKey');
          if (!isS3NotFound) {
             return { object_key: contentKey, sha256: hash, size: data.size, status: 'FAILED', error_code: 'DESTINATION_HEAD_FAILED' };
          }
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
         console.error(`[SnapshotWriter] Upload failed for ${sourceObj.key} (attempt ${attempt})`, err);
         if (attempt === maxRetries) return { object_key: '', sha256: '', size: 0, status: 'FAILED', error_code: 'DESTINATION_UPLOAD_FAILED' };
      }
    }
    return { object_key: '', sha256: '', size: 0, status: 'FAILED', error_code: 'SOURCE_CHANGED_DURING_COPY' };
  }
}
