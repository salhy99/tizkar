import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { StorageSourceAdapter } from '../interfaces';
import { ContentAddressedWriter } from './writer';
import { generateSnapshotId } from './id';
import { SnapshotManifest, SnapshotStatus, SnapshotObjectEntry, SnapshotMetadata } from './types';
import crypto from 'crypto';

export class SnapshotOrchestrator {
  private writer: ContentAddressedWriter;
  
  constructor(
    private s3Client: S3Client,
    private sourceAdapter: StorageSourceAdapter,
    private destinationBucket: string,
    private sourceBucketName: string
  ) {
    this.writer = new ContentAddressedWriter(s3Client, destinationBucket, sourceAdapter);
  }

  async runSnapshot(prefix: string = ''): Promise<SnapshotMetadata> {
    const startTime = new Date().toISOString();
    const snapshotId = generateSnapshotId();

    // Enforce snapshot ID non-reuse explicitly
    try {
       await this.s3Client.send(new HeadObjectCommand({ Bucket: this.destinationBucket, Key: `snapshots/${snapshotId}/status.json` }));
       throw new Error(`SNAPSHOT_ID_COLLISION: Status already exists for ${snapshotId}`);
    } catch (err: any) {
       if (err.name !== 'NotFound' && err.name !== 'NoSuchKey') throw err;
    }

    try {
       await this.s3Client.send(new HeadObjectCommand({ Bucket: this.destinationBucket, Key: `snapshots/${snapshotId}/manifest.json` }));
       throw new Error(`SNAPSHOT_ID_COLLISION: Manifest already exists for ${snapshotId}`);
    } catch (err: any) {
       if (err.name !== 'NotFound' && err.name !== 'NoSuchKey') throw err;
    }

    // 1. Write PREPARING status
    await this.uploadStatus(snapshotId, 'PREPARING', 0, 0, startTime);

    try {
      // 2. Enumerate source
      const sourceObjects = await this.sourceAdapter.listObjects(prefix, 100);

      // Sort by original path for deterministic output
      sourceObjects.sort((a, b) => a.key.localeCompare(b.key));

      const entries: SnapshotObjectEntry[] = [];
      let totalBytes = 0;
      let hasFailures = false;

      // 3. Process each object with bounded concurrency (e.g. 5)
      const CONCURRENCY_LIMIT = 5;
      for (let i = 0; i < sourceObjects.length; i += CONCURRENCY_LIMIT) {
        const batch = sourceObjects.slice(i, i + CONCURRENCY_LIMIT);
        
        const results = await Promise.all(batch.map(async obj => {
          const res = await this.writer.processObject(obj);
          if (res.status === 'FAILED') {
             console.error(`[Orchestrator] FAILED to process ${obj.key}: ${res.error_code}`);
             return { obj, res, success: false };
          }
          return { obj, res, success: true };
        }));

        for (const { obj, res, success } of results) {
           if (!success) {
              hasFailures = true;
           } else {
              entries.push({
                original_path: obj.key,
                content_addressed_key: res.object_key,
                sha256: res.sha256,
                size: res.size,
                content_type: obj.mime,
                source_bucket: this.sourceBucketName,
                discovered_at: startTime,
                source_updated_at: obj.updated_at,
                source_etag: obj.etag
              });
              totalBytes += res.size;
           }
        }
      }

      if (hasFailures) {
         // Publish INCOMPLETE
         await this.uploadStatus(snapshotId, 'INCOMPLETE', entries.length, totalBytes, startTime);
         throw new Error('SNAPSHOT_INCOMPLETE: Failures occurred during content backup.');
      }

      // 4. Build deterministic manifest
      const manifest: SnapshotManifest = {
        schema_version: '1.1',
        snapshot_id: snapshotId,
        status: 'COMPLETE',
        started_at: startTime,
        completed_at: new Date().toISOString(),
        source_bucket: this.sourceBucketName,
        consistency_guarantee: 'POINT_IN_TIME',
        total_objects: entries.length,
        total_bytes: totalBytes,
        objects: entries,
        failures: []
      };

      // 5. Serialize deterministically
      const manifestJson = JSON.stringify(manifest); // Since entries are pre-sorted, JSON is deterministic
      const manifestSha256 = crypto.createHash('sha256').update(manifestJson).digest('hex');

      // 6. Upload manifest
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.destinationBucket,
        Key: `snapshots/${snapshotId}/manifest.json`,
        Body: manifestJson,
        ContentType: 'application/json',
      }));

      // 7. Write manifest.sha256
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.destinationBucket,
        Key: `snapshots/${snapshotId}/manifest.sha256`,
        Body: manifestSha256,
        ContentType: 'text/plain',
      }));

      // 8. Publish COMPLETE status
      const metadata = await this.uploadStatus(snapshotId, 'COMPLETE', entries.length, totalBytes, startTime, manifestSha256);
      return metadata;

    } catch (err: any) {
      await this.uploadStatus(snapshotId, 'FAILED', 0, 0, startTime);
      throw err;
    }
  }

  private async uploadStatus(
    snapshotId: string, 
    state: SnapshotStatus, 
    objectCount: number, 
    totalBytes: number, 
    startTime: string,
    manifestSha256?: string
  ): Promise<SnapshotMetadata> {
    const meta: SnapshotMetadata = {
      snapshot_id: snapshotId,
      state,
      total_objects: objectCount,
      total_bytes: totalBytes,
      started_at: startTime,
      manifest_sha256: manifestSha256
    };
    if (state === 'COMPLETE' || state === 'FAILED' || state === 'INCOMPLETE') {
      meta.completed_at = new Date().toISOString();
    }

    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.destinationBucket,
      Key: `snapshots/${snapshotId}/status.json`,
      Body: JSON.stringify(meta, null, 2),
      ContentType: 'application/json',
    }));

    return meta;
  }
}
