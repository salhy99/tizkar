import { SnapshotOrchestrator } from '../src/lib/storage/backup/snapshot/orchestrator';
import { S3Client } from '@aws-sdk/client-s3';
import { StorageSourceAdapter } from '../src/lib/storage/backup/interfaces';
import assert from 'node:assert';

describe('SnapshotOrchestrator Empty Snapshot Guard', () => {
  const dummyS3Client = { 
    send: async (cmd: unknown) => {
      if ((cmd as { constructor: { name: string } }).constructor.name === 'HeadObjectCommand') {
        const err = new Error('Not found');
        err.name = 'NotFound';
        throw err;
      }
      return {};
    }
  } as unknown as S3Client;
  
  const createMockAdapter = (numObjects: number): StorageSourceAdapter => ({
    listObjects: async () => {
      const objects = [];
      for (let i = 0; i < numObjects; i++) {
        objects.push({
          key: `file_${i}.txt`,
          size: 10,
          mime: 'text/plain',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      return objects;
    },
    getObject: async () => new Blob(['dummy']),
    getObjectMetadata: async () => null,
  });

  // Mock ContentAddressedWriter to avoid actual S3 writes during test

  it('fails closed when production + 0 objects + no override', async () => {
    const orchestrator = new SnapshotOrchestrator(dummyS3Client, createMockAdapter(0), 'dest', 'source', { environment: 'production', allowEmptySource: false });

    orchestrator['writer']['processObject'] = async () => ({ status: 'UPLOADED', object_key: 'objects/x', sha256: 'x', size: 10 }); // Stub writer
    
    await assert.rejects(
      orchestrator.runSnapshot(),
      (err: Error) => err.message.includes('EMPTY_SOURCE_REJECTED')
    );
  });

  it('fails closed when production + 0 objects + false override', async () => {
    const orchestrator = new SnapshotOrchestrator(dummyS3Client, createMockAdapter(0), 'dest', 'source', { environment: 'production', allowEmptySource: false });

    
    await assert.rejects(
      orchestrator.runSnapshot(),
      (err: Error) => err.message.includes('EMPTY_SOURCE_REJECTED')
    );
  });

  it('completes when production + 0 objects + true override', async () => {
    const orchestrator = new SnapshotOrchestrator(dummyS3Client, createMockAdapter(0), 'dest', 'source', { environment: 'production', allowEmptySource: true });


    
    const result = await orchestrator.runSnapshot();
    assert.strictEqual(result.total_objects, 0);
  });

  it('completes when non-production + 0 objects', async () => {
    const orchestrator = new SnapshotOrchestrator(dummyS3Client, createMockAdapter(0), 'dest', 'source', { environment: 'development', allowEmptySource: false });


    
    const result = await orchestrator.runSnapshot();
    assert.strictEqual(result.total_objects, 0);
  });

  it('completes when production + 1 object', async () => {
    const orchestrator = new SnapshotOrchestrator(dummyS3Client, createMockAdapter(1), 'dest', 'source', { environment: 'production', allowEmptySource: false });

    orchestrator['writer']['processObject'] = async () => ({ status: 'UPLOADED', object_key: 'objects/x', sha256: 'x', size: 10 }); // Stub writer
    
    const result = await orchestrator.runSnapshot();
    assert.strictEqual(result.total_objects, 1);
  });

  it('fails when enumeration API error occurs', async () => {
    const errorAdapter: StorageSourceAdapter = {
      listObjects: async () => { throw new Error('API_ERROR'); },
      getObject: async () => new Blob(),
      getObjectMetadata: async () => null,
    };
    const orchestrator = new SnapshotOrchestrator(dummyS3Client, errorAdapter, 'dest', 'source', { environment: 'production', allowEmptySource: true });

    
    await assert.rejects(
      orchestrator.runSnapshot(),
      (err: Error) => err.message.includes('API_ERROR')
    );
  });
});
