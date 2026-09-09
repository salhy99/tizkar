import { isSafeStoragePath, validateManifestSchema, computeManifestIntegrity } from '../src/lib/storage/backup/snapshot/validation';
import { SnapshotManifest } from '../src/lib/storage/backup/snapshot/types';
import { computeStreamHash } from '../src/lib/storage/backup/snapshot/hasher';
import { Readable } from 'stream';
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

  it('rejects URL-encoded traversal attempts', () => {
    assert.strictEqual(isSafeStoragePath('%2e%2e/user_123/file.jpg'), false);
    assert.strictEqual(isSafeStoragePath('user_123/%2E%2E/file.jpg'), false);
  });

  it('rejects absolute and UNC paths', () => {
    assert.strictEqual(isSafeStoragePath('/etc/passwd'), false);
    assert.strictEqual(isSafeStoragePath('\\etc\\passwd'), false);
    assert.strictEqual(isSafeStoragePath('//server/share'), false);
    assert.strictEqual(isSafeStoragePath('C:\\Windows\\System32'), false);
    assert.strictEqual(isSafeStoragePath('d:/data/file.txt'), false);
  });

  it('rejects trailing dots and spaces (Windows vulnerability)', () => {
    assert.strictEqual(isSafeStoragePath('user_123/file.jpg.'), false);
    assert.strictEqual(isSafeStoragePath('user_123/file.jpg '), false);
  });

  it('rejects Windows reserved names', () => {
    assert.strictEqual(isSafeStoragePath('user_123/CON.txt'), false);
    assert.strictEqual(isSafeStoragePath('user_123/prn'), false);
    assert.strictEqual(isSafeStoragePath('user_123/AUX.jpg'), false);
  });

  it('rejects Unicode normalization collisions', () => {
    const nfd = 'e\u0301'; // é in NFD
    assert.strictEqual(isSafeStoragePath(`user_123/${nfd}.jpg`), false);
  });

  it('rejects null bytes and control characters', () => {
    assert.strictEqual(isSafeStoragePath('user_123/\0file.jpg'), false);
    assert.strictEqual(isSafeStoragePath('user_123/\x0Afile.jpg'), false);
  });
});

describe('Snapshot Manifest Validation', () => {
  const getValidManifest = (): SnapshotManifest => ({
    snapshot_id: 'snap-2026',
    schema_version: '1.1',
    source_bucket: 'invitations_assets',
    started_at: '2026-09-08T12:00:00.000Z',
    completed_at: '2026-09-08T12:05:00.000Z',
    status: 'COMPLETE',
    consistency_guarantee: 'POINT_IN_TIME',
    total_objects: 1,
    total_bytes: 1024,
    objects: [
      {
        original_path: 'user/file.jpg',
        size: 1024,
        mime_type: 'image/jpeg',
        sha256: 'deadbeef',
        content_addressed_key: 'objects/deadbeef'
      }
    ],
    failures: []
  });

  it('accepts a valid manifest', () => {
    const manifest = getValidManifest();
    assert.strictEqual(validateManifestSchema(manifest), true);
  });

  it('rejects incomplete snapshot labeled as COMPLETE', () => {
    const manifest = getValidManifest();
    manifest.failures.push({ original_path: 'a.jpg', error: 'e', stage: 'download' });
    assert.strictEqual(validateManifestSchema(manifest), false);
  });

  it('rejects mismatched object count labeled as COMPLETE', () => {
    const manifest = getValidManifest();
    manifest.total_objects = 2; // objects array only has 1
    assert.strictEqual(validateManifestSchema(manifest), false);
  });

  it('rejects duplicate normalized paths', () => {
    const manifest = getValidManifest();
    manifest.total_objects = 2;
    manifest.total_bytes = 2048;
    manifest.objects.push({
      original_path: 'USER/file.jpg', // Case-folding collision with 'user/file.jpg'
      size: 1024,
      mime_type: 'image/jpeg',
      sha256: 'deadbeef2',
      content_addressed_key: 'objects/deadbeef2'
    });
    assert.strictEqual(validateManifestSchema(manifest), false);
  });
});

describe('Manifest Integrity Hashing', () => {
  it('computes deterministic hash ignoring key order', () => {
    const m1: Record<string, unknown> = { a: 1, b: 2, c: [3, 4] };
    const m2: Record<string, unknown> = { b: 2, c: [3, 4], a: 1 }; // different key order
    
    const hash1 = computeManifestIntegrity(m1 as unknown as SnapshotManifest);
    const hash2 = computeManifestIntegrity(m2 as unknown as SnapshotManifest);
    assert.strictEqual(hash1, hash2);
  });
  
  it('ignores manifest_integrity_sha256 field itself', () => {
    const m1: Record<string, unknown> = { snapshot_id: 'x' };
    const m2: Record<string, unknown> = { snapshot_id: 'x', manifest_integrity_sha256: 'old_hash' };
    
    assert.strictEqual(computeManifestIntegrity(m1 as unknown as SnapshotManifest), computeManifestIntegrity(m2 as unknown as SnapshotManifest));
  });
});

describe('Streaming Hasher', () => {
  it('correctly computes a SHA-256 for a stream', async () => {
    const stream = Readable.from(['hello', ' ', 'world']);
    const hash = await computeStreamHash(stream);
    assert.strictEqual(hash, 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });
});
