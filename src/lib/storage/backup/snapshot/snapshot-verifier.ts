import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { SnapshotManifest, SnapshotMetadata, SnapshotStatus } from './types';
import crypto from 'crypto';
import path from 'path';
import { createWriteStream, createReadStream, promises as fsPromises } from 'fs';
import { pipeline } from 'stream/promises';
import { computeStreamHash } from './hasher';

export interface RestoreVerificationResult {
  snapshot_id: string;
  status: 'PASS' | 'FAILED';
  objects_verified: number;
  bytes_verified: number;
  reason?: string;
}

export class SnapshotRestoreVerifier {
  constructor(private s3Client: S3Client, private bucketName: string, private restoreDir: string) {}

  async verifySnapshot(snapshotId: string, maxObjects: number = 5, syntheticOnly: boolean = true): Promise<RestoreVerificationResult> {
    try {
      // 1. Fetch status
      const statusObj = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: `snapshots/${snapshotId}/status.json`
      }));
      
      const statusBody = await statusObj.Body?.transformToString();
      if (!statusBody) throw new Error('Empty status.json');
      
      const statusMeta: SnapshotMetadata = JSON.parse(statusBody);

      // 2. Require COMPLETE
      if (statusMeta.state !== 'COMPLETE') {
        return { snapshot_id: snapshotId, status: 'FAILED', objects_verified: 0, bytes_verified: 0, reason: `Snapshot state is ${statusMeta.state}, expected COMPLETE` };
      }

      // 3. Fetch manifest and checksum
      const manifestShaObj = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: `snapshots/${snapshotId}/manifest.sha256`
      }));
      const expectedManifestSha = (await manifestShaObj.Body?.transformToString())?.trim();
      if (!expectedManifestSha) throw new Error('Missing manifest.sha256 content');

      const manifestObj = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: `snapshots/${snapshotId}/manifest.json`
      }));
      const manifestBody = await manifestObj.Body?.transformToString();
      if (!manifestBody) throw new Error('Empty manifest.json');

      // 4. Verify manifest integrity
      const computedManifestSha = crypto.createHash('sha256').update(manifestBody).digest('hex');
      if (computedManifestSha !== expectedManifestSha) {
        return { snapshot_id: snapshotId, status: 'FAILED', objects_verified: 0, bytes_verified: 0, reason: 'Manifest SHA256 mismatch' };
      }

      const manifest: SnapshotManifest = JSON.parse(manifestBody);

      // 5. Select sample
      let sample = manifest.objects;
      if (syntheticOnly) {
        sample = sample.filter(o => o.original_path.startsWith('synthetic/') || o.original_path.startsWith('test/'));
      }
      
      if (sample.length === 0) {
        return { snapshot_id: snapshotId, status: 'FAILED', objects_verified: 0, bytes_verified: 0, reason: 'No eligible objects found for verification' };
      }

      sample = sample.slice(0, maxObjects);

      let bytesVerified = 0;
      let objectsVerified = 0;

      await fsPromises.mkdir(this.restoreDir, { recursive: true });

      for (const obj of sample) {
        // 6. HeadObject
        const head = await this.s3Client.send(new HeadObjectCommand({ Bucket: this.bucketName, Key: obj.content_addressed_key }));
        
        if (head.ContentLength !== obj.size) {
           return { snapshot_id: snapshotId, status: 'FAILED', objects_verified: objectsVerified, bytes_verified: bytesVerified, reason: `Size mismatch for ${obj.content_addressed_key}` };
        }
        
        const storedSha = head.Metadata?.['x-tizkar-sha256'];
        if (storedSha !== obj.sha256) {
           return { snapshot_id: snapshotId, status: 'FAILED', objects_verified: objectsVerified, bytes_verified: bytesVerified, reason: `SHA metadata mismatch for ${obj.content_addressed_key}` };
        }

        // 7. Download
        const get = await this.s3Client.send(new GetObjectCommand({ Bucket: this.bucketName, Key: obj.content_addressed_key }));
        if (!get.Body) throw new Error(`Empty body for ${obj.content_addressed_key}`);

        const destPath = path.join(this.restoreDir, `restore_${crypto.randomBytes(4).toString('hex')}.bin`);
        const fileStream = createWriteStream(destPath);
        await pipeline(get.Body as NodeJS.ReadableStream, fileStream);

        // 8. Verify size & SHA of downloaded file
        const stat = await fsPromises.stat(destPath);
        if (stat.size !== obj.size) {
           return { snapshot_id: snapshotId, status: 'FAILED', objects_verified: objectsVerified, bytes_verified: bytesVerified, reason: `Downloaded size mismatch for ${obj.content_addressed_key}` };
        }

        const readStream = createReadStream(destPath);
        const computedSha = await computeStreamHash(readStream);
        if (computedSha !== obj.sha256) {
           return { snapshot_id: snapshotId, status: 'FAILED', objects_verified: objectsVerified, bytes_verified: bytesVerified, reason: `Downloaded content SHA mismatch for ${obj.content_addressed_key}` };
        }

        bytesVerified += obj.size;
        objectsVerified++;
        
        // Cleanup file
        await fsPromises.unlink(destPath);
      }

      return { snapshot_id: snapshotId, status: 'PASS', objects_verified: objectsVerified, bytes_verified: bytesVerified };

    } catch (err: any) {
      console.error(`[SnapshotRestoreVerifier] Error:`, err);
      return { snapshot_id: snapshotId, status: 'FAILED', objects_verified: 0, bytes_verified: 0, reason: err.message };
    }
  }
}
