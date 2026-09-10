import { randomBytes } from 'crypto';

export function generateSnapshotId(): string {
  const date = new Date();
  const timestamp = date.toISOString().replace(/[:.]/g, '-');
  const suffix = randomBytes(4).toString('hex');
  return `${timestamp}_${suffix}`;
}
