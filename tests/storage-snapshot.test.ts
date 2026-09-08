import { isSafeStoragePath, validateManifestSchema } from '../src/lib/storage/backup/snapshot/validation';
import { SnapshotManifest } from '../src/lib/storage/backup/snapshot/types';
import { computeStreamHash } from '../src/lib/storage/backup/snapshot/hasher';
import { Readable } from 'stream';
import test, { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Storage Snapshot Path Validation', () => {
  it('allows safe relative paths', () => {
    assert.strictEqual(isSafeStoragePath('user_123/invitation_456/uuid.jpg'), true);
    assert.strictEqual(isSafeStoragePath('anon/abc/123.mp3'), true);
  });

  it('rejects path traversal attempts', () => {
    assert.strictEqual(isSafeStoragePath('../user_123/file.jpg'), false);
    assert.strictEqual(isSafeStoragePath('user_123/../../etc/passwd'), false);
  });

  it('rejects absolute paths', () => {
    assert.strictEqual(isSafeStoragePath('/etc/passwd'), false);
    assert.strictEqual(isSafeStoragePath('C:\\Windows\\System32'), false);
  });

  it('rejects empty or null paths', () => {
    assert.strictEqual(isSafeStoragePath(''), false);
    assert.strictEqual(isSafeStoragePath(null as any), false);
    assert.strictEqual(isSafeStoragePath(undefined as any), false);
  });

  it('rejects empty segments', () => {
    assert.strictEqual(isSafeStoragePath('user_123//uuid.jpg'), false);
  });
});

describe('Snapshot Manifest Validation', () => {
  it('accepts a valid manifest', () => {
    const manifest: SnapshotManifest = {
      snapshot_id: 'snap-2026',
      schema_version: '1.0',
      source_bucket: 'invitations_assets',
      started_at: '2026-09-08T12:00:00.000Z',
      completed_at: '2026-09-08T12:05:00.000Z',
      status: 'COMPLETE',
      total_objects: 1,
      total_bytes: 1024,
      objects: [
        {
          path: 'user/file.jpg',
          size: 1024,
          mime_type: 'image/jpeg',
          sha256: 'deadbeef',
          destination_key: 'tizkar-production/storage/snap-2026/user/file.jpg'
        }
      ],
      failures: []
    };

    assert.strictEqual(validateManifestSchema(manifest), true);
  });

  it('rejects an invalid schema version', () => {
    const manifest = {
      schema_version: '2.0', // wrong
      snapshot_id: 'snap-1',
      source_bucket: 'b',
      started_at: '2026-09-08T12:00:00.000Z',
      completed_at: '2026-09-08T12:05:00.000Z',
      status: 'COMPLETE',
      total_objects: 0,
      total_bytes: 0,
      objects: [],
      failures: []
    };

    assert.strictEqual(validateManifestSchema(manifest), false);
  });

  it('rejects objects with unsafe paths', () => {
    const manifest: any = {
      snapshot_id: 'snap-2026',
      schema_version: '1.0',
      source_bucket: 'b',
      started_at: '2026-09-08T12:00:00.000Z',
      completed_at: '2026-09-08T12:05:00.000Z',
      status: 'COMPLETE',
      total_objects: 1,
      total_bytes: 10,
      objects: [
        {
          path: '/unsafe/path.jpg',
          size: 10,
          mime_type: 'image/jpeg',
          sha256: 'deadbeef',
          destination_key: 'dest'
        }
      ],
      failures: []
    };

    assert.strictEqual(validateManifestSchema(manifest), false);
  });
});

describe('Streaming Hasher', () => {
  it('correctly computes a SHA-256 for a stream', async () => {
    const stream = Readable.from(['hello', ' ', 'world']);
    const hash = await computeStreamHash(stream);
    assert.strictEqual(hash, 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });
});
