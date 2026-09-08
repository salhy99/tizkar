import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream, promises as fsPromises } from 'fs';
import { pipeline } from 'stream/promises';
import { computeStreamHash } from './hasher';
import { isSafeStoragePath } from './validation';
import path from 'path';

export interface DrillResult {
  key: string;
  status: 'PASS' | 'FAILED' | 'NOT_VERIFIED';
  reason?: string;
  bytesVerified?: number;
  hash?: string;
}

export async function verifyLegacyObject(
  s3: S3Client,
  bucketName: string,
  key: string,
  expectedListSize: number,
  restoreDir: string,
  maxObjectSize: number = 10 * 1024 * 1024
): Promise<DrillResult> {
  if (!isSafeStoragePath(key)) {
    return { key, status: 'FAILED', reason: 'Unsafe storage path detected' };
  }

  if (expectedListSize > maxObjectSize) {
    return { key, status: 'FAILED', reason: `Size ${expectedListSize} exceeds limit ${maxObjectSize}` };
  }

  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
    const expectedSize = head.ContentLength || 0;
    const expectedHash = head.Metadata?.['x-tizkar-sha256'];

    if (!expectedHash) {
      return { key, status: 'NOT_VERIFIED', reason: 'Missing x-tizkar-sha256 metadata' };
    }

    if (expectedSize !== expectedListSize) {
      return { key, status: 'FAILED', reason: 'Size mismatch between List and Head' };
    }

    const get = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
    if (!get.Body) {
      return { key, status: 'FAILED', reason: 'Empty body returned' };
    }

    const opaqueFilename = `object_${Buffer.from(key).toString('base64url').substring(0, 16)}_${Date.now()}.bin`;
    const destPath = path.join(restoreDir, opaqueFilename);
    const fileStream = createWriteStream(destPath);
    
    await pipeline(get.Body as NodeJS.ReadableStream, fileStream);

    const stat = await fsPromises.stat(destPath);
    if (stat.size !== expectedSize) {
      return { key, status: 'FAILED', reason: `Downloaded size (${stat.size}) does not match expected size (${expectedSize})` };
    }

    const readStream = require('fs').createReadStream(destPath);
    const computedHash = await computeStreamHash(readStream);

    if (computedHash !== expectedHash) {
      return { key, status: 'FAILED', reason: `Hash mismatch! Expected ${expectedHash}, got ${computedHash}` };
    }

    return {
      key,
      status: 'PASS',
      bytesVerified: stat.size,
      hash: computedHash
    };
  } catch (err: any) {
    if (err.name === 'AccessDenied') {
      return { key, status: 'FAILED', reason: 'AccessDenied' };
    }
    if (err.name === 'NoSuchBucket' || err.name === 'NotFound' || err.name === 'NoSuchKey') {
      return { key, status: 'FAILED', reason: err.name };
    }
    return { key, status: 'FAILED', reason: err.message };
  }
}
