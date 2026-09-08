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
export function validateManifestSchema(manifest: any): manifest is SnapshotManifest {
  if (!manifest || typeof manifest !== 'object') return false;
  
  if (manifest.schema_version !== '1.1') return false;
  if (!manifest.snapshot_id || typeof manifest.snapshot_id !== 'string') return false;
  if (!manifest.source_bucket || typeof manifest.source_bucket !== 'string') return false;
  
  if (!manifest.started_at || isNaN(Date.parse(manifest.started_at))) return false;
  if (!manifest.completed_at || isNaN(Date.parse(manifest.completed_at))) return false;
  
  if (manifest.status !== 'PREPARING' && manifest.status !== 'COMPLETE' && 
      manifest.status !== 'FAILED' && manifest.status !== 'INCOMPLETE') return false;
      
  if (manifest.consistency_guarantee !== 'BEST_EFFORT' && manifest.consistency_guarantee !== 'POINT_IN_TIME') return false;
  
  if (typeof manifest.total_objects !== 'number' || manifest.total_objects < 0) return false;
  if (typeof manifest.total_bytes !== 'number' || manifest.total_bytes < 0) return false;
  
  if (!Array.isArray(manifest.objects)) return false;
  if (!Array.isArray(manifest.failures)) return false;

  if (manifest.status === 'COMPLETE' && manifest.failures.length > 0) return false;
  if (manifest.status === 'COMPLETE' && manifest.total_objects !== manifest.objects.length) return false;

  const pathSet = new Set<string>();

  for (const obj of manifest.objects) {
    if (!obj.original_path || typeof obj.original_path !== 'string' || !isSafeStoragePath(obj.original_path)) return false;
    
    // Check for duplicate normalized paths (case-insensitive collision check)
    const normalized = obj.original_path.toLowerCase();
    if (pathSet.has(normalized)) return false;
    pathSet.add(normalized);

    if (typeof obj.size !== 'number' || obj.size < 0) return false;
    if (!obj.sha256 || typeof obj.sha256 !== 'string') return false;
    if (!obj.content_addressed_key || typeof obj.content_addressed_key !== 'string') return false;
  }

  return true;
}

/**
 * Deterministically serializes a manifest to compute its canonical SHA-256 integrity hash.
 */
export function computeManifestIntegrity(manifest: SnapshotManifest): string {
  const clone = { ...manifest };
  delete clone.manifest_integrity_sha256;
  
  // Deterministic JSON stringify: order keys alphabetically
  const deterministicStringify = (obj: any): string => {
    if (Array.isArray(obj)) {
      return '[' + obj.map(deterministicStringify).join(',') + ']';
    } else if (obj !== null && typeof obj === 'object') {
      const keys = Object.keys(obj).sort();
      return '{' + keys.map(k => JSON.stringify(k) + ':' + deterministicStringify(obj[k])).join(',') + '}';
    }
    return JSON.stringify(obj);
  };

  const canonicalString = deterministicStringify(clone);
  return createHash('sha256').update(canonicalString).digest('hex');
}
