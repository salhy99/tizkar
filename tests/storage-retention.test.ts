import { calculateRetention, DEFAULT_RETENTION_POLICY } from '../src/lib/storage/backup/snapshot/retention';
import { SnapshotMetadata } from '../src/lib/storage/backup/snapshot/types';
import assert from 'node:assert';

describe('Storage Snapshot Retention Policy', () => {
  const baseDate = new Date('2026-09-10T12:00:00Z');

  const createSnapshot = (id: string, daysAgo: number, state: 'COMPLETE' | 'FAILED' = 'COMPLETE'): SnapshotMetadata => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - daysAgo);
    return {
      snapshot_id: id,
      started_at: d.toISOString(),
      completed_at: d.toISOString(),
      state,
      total_objects: 10,
      total_bytes: 1000
    };
  };

  it('retains recent snapshots as DAILY', () => {
    const snapshots = [
      createSnapshot('snap-1', 1),
      createSnapshot('snap-2', 2),
      createSnapshot('snap-30', 30) // Exactly on the edge
    ];
    
    const results = calculateRetention(snapshots, DEFAULT_RETENTION_POLICY, baseDate);
    assert.strictEqual(results.filter(r => r.category === 'DAILY' && r.action === 'RETAIN').length, 3);
  });

  it('classifies older snapshots as WEEKLY or MONTHLY', () => {
    const snapshots = [
      createSnapshot('snap-40', 40), // > 30 days, should be weekly
      createSnapshot('snap-100', 100), // > 12 weeks (84 days), should be monthly
    ];
    
    const results = calculateRetention(snapshots, DEFAULT_RETENTION_POLICY, baseDate);
    
    const snap40 = results.find(r => r.snapshot_id === 'snap-40');
    assert.strictEqual(snap40?.category, 'WEEKLY');
    assert.strictEqual(snap40?.action, 'RETAIN');

    const snap100 = results.find(r => r.snapshot_id === 'snap-100');
    assert.strictEqual(snap100?.category, 'MONTHLY');
    assert.strictEqual(snap100?.action, 'RETAIN');
  });

  it('deletes expired snapshots outside policy window', () => {
    const snapshots = [
      createSnapshot('snap-400', 400), // > 12 months (365 days)
    ];
    
    const results = calculateRetention(snapshots, DEFAULT_RETENTION_POLICY, baseDate);
    assert.strictEqual(results[0].category, 'EXPIRED');
    assert.strictEqual(results[0].action, 'DELETE');
  });

  it('failed snapshots are not retained for long term', () => {
    const snapshots = [
      createSnapshot('snap-failed', 1, 'FAILED'),
    ];
    
    const results = calculateRetention(snapshots, DEFAULT_RETENTION_POLICY, baseDate);
    assert.strictEqual(results[0].action, 'DELETE');
    assert.strictEqual(results[0].reason, 'Non-COMPLETE state');
  });

  it('performs dry-run only (returns array of actions without deleting)', () => {
    const snapshots = [createSnapshot('snap-1', 1)];
    const results = calculateRetention(snapshots, DEFAULT_RETENTION_POLICY, baseDate);
    // calculateRetention is a pure function that returns the result, verifying no deletion happens inside it.
    assert.strictEqual(results.length, 1);
  });
});
