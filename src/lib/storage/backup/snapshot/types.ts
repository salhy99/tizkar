export interface SnapshotManifest {
  snapshot_id: string; // e.g., snap-YYYYMMDD-HHMMSS
  schema_version: '1.1';
  source_bucket: string;
  started_at: string; // ISO8601
  completed_at: string; // ISO8601
  status: 'PREPARING' | 'COMPLETE' | 'FAILED' | 'INCOMPLETE';
  consistency_guarantee: 'BEST_EFFORT' | 'POINT_IN_TIME';
  total_objects: number;
  total_bytes: number;
  objects: SnapshotObject[];
  failures: SnapshotFailure[];
  manifest_integrity_sha256?: string; // Deterministic hash of the manifest without this field
}

export interface SnapshotObject {
  original_path: string; // Relative path in the source bucket
  content_addressed_key: string; // Immutable key based on SHA-256 (e.g., objects/<sha256>)
  size: number;
  mime_type: string;
  sha256: string; // Cryptographic hash of object contents
}

export interface SnapshotFailure {
  original_path: string;
  error: string;
  stage: 'listing' | 'download' | 'upload' | 'validation';
}

export interface SnapshotStateContext {
  required_objects: Map<string, { size: number, etag?: string }>;
  verified_objects: Set<string>;
  failed_objects: Set<string>;
}
