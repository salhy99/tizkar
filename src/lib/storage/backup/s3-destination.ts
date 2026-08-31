import { S3Client, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command, ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import { BackupObject, StorageDestinationAdapter } from './interfaces';
import crypto from 'crypto';

export class S3CompatibleDestination implements StorageDestinationAdapter {
  private client: S3Client;

  constructor(
    private endpoint: string,
    private region: string,
    private accessKeyId: string,
    private secretAccessKey: string,
    private bucketName: string
  ) {
    this.client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async putObject(key: string, data: Blob, mime: string): Promise<{ success: boolean; checksum?: string }> {
    const buffer = Buffer.from(await data.arrayBuffer());
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    try {
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mime,
        Metadata: {
          'x-tizkar-sha256': hash,
        }
      }));
      return { success: true, checksum: hash };
    } catch (e) {
      console.error(`[S3Destination] Error putting object ${key}:`, e);
      throw e;
    }
  }

  async headObject(key: string): Promise<BackupObject | null> {
    try {
      const response = await this.client.send(new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key
      }));
      
      return {
        key,
        size: response.ContentLength || 0,
        mime: response.ContentType || 'application/octet-stream',
        created_at: response.LastModified ? response.LastModified.toISOString() : new Date().toISOString(),
        updated_at: response.LastModified ? response.LastModified.toISOString() : new Date().toISOString(),
        checksum: response.Metadata?.['x-tizkar-sha256'] || undefined,
        etag: response.ETag?.replace(/"/g, '')
      };
    } catch (e: unknown) {
      if ((e as Error & { name?: string }).name === 'NotFound' || (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw e;
    }
  }

  async listObjects(prefix: string = ''): Promise<BackupObject[]> {
    const objects: BackupObject[] = [];
    let continuationToken: string | undefined = undefined;

    do {
      const resp: ListObjectsV2CommandOutput = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }));

      for (const item of resp.Contents || []) {
        if (!item.Key) continue;
        
        objects.push({
          key: item.Key,
          size: item.Size || 0,
          mime: 'application/octet-stream', // List doesn't return MIME usually, Head is needed for full meta
          created_at: item.LastModified ? item.LastModified.toISOString() : new Date().toISOString(),
          updated_at: item.LastModified ? item.LastModified.toISOString() : new Date().toISOString(),
          etag: item.ETag?.replace(/"/g, '')
        });
      }

      continuationToken = resp.NextContinuationToken;
    } while (continuationToken);

    return objects;
  }
}
