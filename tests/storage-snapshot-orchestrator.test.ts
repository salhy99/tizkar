import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SnapshotOrchestrator } from '../src/lib/storage/backup/snapshot/orchestrator';
import { StorageSourceAdapter } from '../src/lib/storage/backup/interfaces';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

// Simple mock for orchestrator test
describe('SnapshotOrchestrator', () => {
  let mockS3Client: S3Client;
  let mockSourceAdapter: StorageSourceAdapter;
  let orchestrator: SnapshotOrchestrator;
  let s3Commands: unknown[] = [];

  beforeEach(() => {
    s3Commands = [];
    mockS3Client = {
      send: vi.fn().mockImplementation(async (command) => {
        s3Commands.push(command);
        if (command instanceof HeadObjectCommand) {
           const err = new Error('NotFound');
           err.name = 'NotFound';
           throw err;
        }
        if (command instanceof PutObjectCommand) {
           return {};
        }
      })
    } as unknown as S3Client;

    mockSourceAdapter = {
      listObjects: vi.fn().mockResolvedValue([
        { key: 'file1.txt', size: 11, mime: 'text/plain', updated_at: '2026-01-01' }
      ]),
      getObject: vi.fn().mockResolvedValue(new Blob(['hello world'], { type: 'text/plain' }))
    } as unknown as StorageSourceAdapter;

    orchestrator = new SnapshotOrchestrator(mockS3Client, mockSourceAdapter, 'test-bucket', 'source-bucket');
  });

  it('should create a complete snapshot successfully', async () => {
    const meta = await orchestrator.runSnapshot();
    expect(meta.state).toBe('COMPLETE');
    expect(meta.total_objects).toBe(1);
    expect(meta.total_bytes).toBe(11);
    expect(meta.manifest_sha256).toBeDefined();
  });
});
