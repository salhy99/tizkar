import { SnapshotManifest } from './types';
import { createHash } from 'crypto';

const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
]);

/**
 * Strictly validates a storage path to prevent traversal, OS-specific injections,
 * and normalisation collisions.
 */
export function isSafeStoragePath(filepath: string): boolean {
  if (!filepath || typeof filepath !== 'string') return false;

  // Reject URL-encoded traversal ambiguity
  if (filepath.includes('%2e') || filepath.includes('%2E')) return false;
  if (filepath.includes('%2f') || filepath.includes('%2F')) return false;
  if (filepath.includes('%5c') || filepath.includes('%5C')) return false;

  // Reject absolute and UNC paths
  if (filepath.startsWith('/') || filepath.startsWith('\\')) return false;
  if (filepath.startsWith('//') || filepath.startsWith('\\\\')) return false;
  
  // Reject Windows drive letters
  if (/^[a-zA-Z]:/.test(filepath)) return false;

  const normalized = filepath.replace(/\\/g, '/');
  const segments = normalized.split('/');

  for (const segment of segments) {
    // Reject empty, current dir, and parent dir
    if (segment === '' || segment === '.' || segment === '..') return false;
    
    // Reject trailing dots and spaces (Windows vulnerability)
    if (segment.endsWith('.') || segment.endsWith(' ')) return false;
    
    // Reject NULL bytes and suspicious control characters
    if (segment.includes('\0') || /[\x00-\x1F\x7F]/.test(segment)) return false;
    
    // Reject Windows reserved names (ignoring extensions)
    const upperBasename = segment.split('.')[0].toUpperCase();
    if (WINDOWS_RESERVED_NAMES.has(upperBasename)) return false;
  }

  // Reject Unicode normalization collisions (ensure NFC)
  if (filepath !== filepath.normalize('NFC')) return false;

  return true;
}

/**
 * Validates the schema and completeness rules of a Snapshot Manifest.
 */
export function validateManifestSchema(manifest: unknown): manifest is SnapshotManifest {
  if (!manifest || typeof manifest !== 'object') return false;
  
  const m = manifest as Record<string, unknown>;

  if (m.schema_version !== '1.1') return false;
  if (!m.snapshot_id || typeof m.snapshot_id !== 'string') return false;
  if (!m.source_bucket || typeof m.source_bucket !== 'string') return false;
  
  if (!m.started_at || typeof m.started_at !== 'string' || isNaN(Date.parse(m.started_at))) return false;
  if (!m.completed_at || typeof m.completed_at !== 'string' || isNaN(Date.parse(m.completed_at))) return false;
  
  if (m.status !== 'PREPARING' && m.status !== 'COMPLETE' && 
      m.status !== 'FAILED' && m.status !== 'INCOMPLETE') return false;
      
  if (m.consistency_guarantee !== 'BEST_EFFORT' && m.consistency_guarantee !== 'POINT_IN_TIME') return false;
  
  if (typeof m.total_objects !== 'number' || m.total_objects < 0) return false;
  if (typeof m.total_bytes !== 'number' || m.total_bytes < 0) return false;
  
  if (!Array.isArray(m.objects)) return false;
  if (!Array.isArray(m.failures)) return false;

  if (m.status === 'COMPLETE' && m.failures.length > 0) return false;
  if (m.status === 'COMPLETE' && m.total_objects !== m.objects.length) return false;

  const pathSet = new Set<string>();

  for (const obj of m.objects) {
    if (!obj || typeof obj !== 'object') return false;
    const o = obj as Record<string, unknown>;

    if (!o.original_path || typeof o.original_path !== 'string' || !isSafeStoragePath(o.original_path)) return false;
    
    // Check for duplicate normalized paths (case-insensitive collision check)
    const normalized = o.original_path.toLowerCase();
    if (pathSet.has(normalized)) return false;
    pathSet.add(normalized);

    if (typeof o.size !== 'number' || o.size < 0) return false;
    if (!o.sha256 || typeof o.sha256 !== 'string') return false;
    if (!o.content_addressed_key || typeof o.content_addressed_key !== 'string') return false;
  }

  return true;
}

/**
 * Deterministically serializes a manifest to compute its canonical SHA-256 integrity hash.
 */
export function computeManifestIntegrity(manifest: SnapshotManifest): string {
  const clone: Record<string, unknown> = { ...(manifest as unknown as Record<string, unknown>) };
  delete clone.manifest_integrity_sha256;
  
  // Deterministic JSON stringify: order keys alphabetically
  const deterministicStringify = (obj: unknown): string => {
    if (Array.isArray(obj)) {
      return '[' + obj.map(deterministicStringify).join(',') + ']';
    } else if (obj !== null && typeof obj === 'object') {
      const record = obj as Record<string, unknown>;
      const keys = Object.keys(record).sort();
      return '{' + keys.map(k => JSON.stringify(k) + ':' + deterministicStringify(record[k])).join(',') + '}';
    }
    return JSON.stringify(obj);
  };

  const canonicalString = deterministicStringify(clone);
  return createHash('sha256').update(canonicalString).digest('hex');
}
