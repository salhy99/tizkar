import { SnapshotManifest } from './types';

/**
 * Validates a storage path to ensure it is safe for restoration to a local filesystem
 * or a disposable target. Rejects path traversal, absolute paths, empty paths,
 * and Windows/POSIX dangerous path elements.
 */
export function isSafeStoragePath(filepath: string): boolean {
  if (!filepath || typeof filepath !== 'string') return false;

  // Reject absolute paths
  if (filepath.startsWith('/') || filepath.startsWith('\\')) return false;

  // Reject Windows drive letters
  if (/^[a-zA-Z]:/.test(filepath)) return false;

  const normalized = filepath.replace(/\\/g, '/');
  const segments = normalized.split('/');

  for (const segment of segments) {
    // Reject path traversal and empty segments
    if (segment === '.' || segment === '..' || segment === '') return false;
    // Reject suspicious characters (NUL byte, etc.)
    if (segment.includes('\0')) return false;
  }

  return true;
}

/**
 * Validates the schema of a Snapshot Manifest to ensure it has all required
 * fields before executing a restore operation.
 */
export function validateManifestSchema(manifest: any): manifest is SnapshotManifest {
  if (!manifest || typeof manifest !== 'object') return false;
  
  if (manifest.schema_version !== '1.0') return false;
  if (!manifest.snapshot_id || typeof manifest.snapshot_id !== 'string') return false;
  if (!manifest.source_bucket || typeof manifest.source_bucket !== 'string') return false;
  
  if (!manifest.started_at || isNaN(Date.parse(manifest.started_at))) return false;
  if (!manifest.completed_at || isNaN(Date.parse(manifest.completed_at))) return false;
  
  if (manifest.status !== 'COMPLETE' && manifest.status !== 'PARTIAL' && manifest.status !== 'FAILED') return false;
  
  if (typeof manifest.total_objects !== 'number') return false;
  if (typeof manifest.total_bytes !== 'number') return false;
  
  if (!Array.isArray(manifest.objects)) return false;
  if (!Array.isArray(manifest.failures)) return false;

  // Sample check for object format to avoid deep traversal overhead in huge manifests,
  // but a robust implementation might validate every object.
  for (const obj of manifest.objects) {
    if (!obj.path || typeof obj.path !== 'string' || !isSafeStoragePath(obj.path)) return false;
    if (typeof obj.size !== 'number' || obj.size < 0) return false;
    if (!obj.sha256 || typeof obj.sha256 !== 'string') return false;
    if (!obj.destination_key || typeof obj.destination_key !== 'string') return false;
  }

  return true;
}
