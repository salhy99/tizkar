import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { verifyLegacyObject } from '../src/lib/storage/backup/snapshot/drill-verifier';
import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { promises as fsPromises, existsSync, rmSync, mkdirSync } from 'fs';
import path from 'path';

// A mock S3 client that responds to send()
class MockS3Client extends S3Client {
  public mockResponses: any = {};

  async send(command: any): Promise<any> {
    if (command instanceof HeadObjectCommand) {
      if (this.mockResponses.headError) throw this.mockResponses.headError;
      return this.mockResponses.head || {};
    }
    if (command instanceof GetObjectCommand) {
      if (this.mockResponses.getError) throw this.mockResponses.getError;
      return this.mockResponses.get || {};
    }
    throw new Error('Unknown command in mock');
  }
}

describe('Legacy Mirror Restore Drill Verifier', () => {
  const TEST_DIR = path.join(__dirname, '.test_restore');
  
  // Create test dir
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR);
  }

  // Ensure cleanup after tests
  test.after(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('rejects an unsafe storage path', async () => {
    const s3 = new MockS3Client({});
    const res = await verifyLegacyObject(s3 as any, 'b', '../test.jpg', 10, TEST_DIR);
    assert.strictEqual(res.status, 'FAILED');
    assert.strictEqual(res.reason, 'Unsafe storage path detected');
  });

  it('rejects an object exceeding size limit', async () => {
    const s3 = new MockS3Client({});
    const res = await verifyLegacyObject(s3 as any, 'b', 'test.jpg', 200, TEST_DIR, 100);
    assert.strictEqual(res.status, 'FAILED');
    assert.match(res.reason!, /exceeds limit/);
  });

  it('reports NOT_VERIFIED if SHA-256 metadata is missing', async () => {
    const s3 = new MockS3Client({});
    s3.mockResponses.head = { ContentLength: 10, Metadata: {} }; // no x-tizkar-sha256
    const res = await verifyLegacyObject(s3 as any, 'b', 'test.jpg', 10, TEST_DIR);
    assert.strictEqual(res.status, 'NOT_VERIFIED');
    assert.match(res.reason!, /Missing x-tizkar-sha256/);
  });

  it('fails if size does not match list expected size', async () => {
    const s3 = new MockS3Client({});
    s3.mockResponses.head = { ContentLength: 15, Metadata: { 'x-tizkar-sha256': 'abc' } };
    const res = await verifyLegacyObject(s3 as any, 'b', 'test.jpg', 10, TEST_DIR); // Expected 10, got 15
    assert.strictEqual(res.status, 'FAILED');
    assert.match(res.reason!, /Size mismatch/);
  });

  it('fails if AccessDenied', async () => {
    const s3 = new MockS3Client({});
    const err = new Error('AccessDenied');
    err.name = 'AccessDenied';
    s3.mockResponses.headError = err;
    const res = await verifyLegacyObject(s3 as any, 'b', 'test.jpg', 10, TEST_DIR);
    assert.strictEqual(res.status, 'FAILED');
    assert.strictEqual(res.reason, 'AccessDenied');
  });

  it('fails if NoSuchKey', async () => {
    const s3 = new MockS3Client({});
    const err = new Error('NoSuchKey');
    err.name = 'NoSuchKey';
    s3.mockResponses.headError = err;
    const res = await verifyLegacyObject(s3 as any, 'b', 'test.jpg', 10, TEST_DIR);
    assert.strictEqual(res.status, 'FAILED');
    assert.strictEqual(res.reason, 'NoSuchKey');
  });

  it('successfully verifies a matching object', async () => {
    const content = 'hello world';
    const contentHash = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
    
    const s3 = new MockS3Client({});
    s3.mockResponses.head = { ContentLength: Buffer.byteLength(content), Metadata: { 'x-tizkar-sha256': contentHash } };
    s3.mockResponses.get = { Body: Readable.from([content]) };

    const res = await verifyLegacyObject(s3 as any, 'b', 'test.jpg', Buffer.byteLength(content), TEST_DIR);
    assert.strictEqual(res.status, 'PASS');
    assert.strictEqual(res.bytesVerified, Buffer.byteLength(content));
    assert.strictEqual(res.hash, contentHash);
  });

  it('fails if actual downloaded bytes do not match Head size', async () => {
    const content = 'short'; // 5 bytes
    const s3 = new MockS3Client({});
    s3.mockResponses.head = { ContentLength: 10, Metadata: { 'x-tizkar-sha256': 'abc' } };
    s3.mockResponses.get = { Body: Readable.from([content]) };

    const res = await verifyLegacyObject(s3 as any, 'b', 'test.jpg', 10, TEST_DIR);
    assert.strictEqual(res.status, 'FAILED');
    assert.match(res.reason!, /Downloaded size.*does not match expected/);
  });

  it('fails if downloaded content hash does not match metadata', async () => {
    const content = 'hello world';
    const s3 = new MockS3Client({});
    // correct size, wrong hash
    s3.mockResponses.head = { ContentLength: Buffer.byteLength(content), Metadata: { 'x-tizkar-sha256': 'wronghash' } };
    s3.mockResponses.get = { Body: Readable.from([content]) };

    const res = await verifyLegacyObject(s3 as any, 'b', 'test.jpg', Buffer.byteLength(content), TEST_DIR);
    assert.strictEqual(res.status, 'FAILED');
    assert.match(res.reason!, /Hash mismatch/);
  });
});
