export type SnapshotStatus = 'PREPARING' | 'COMPLETE' | 'FAILED' | 'INCOMPLETE';

export interface SnapshotObjectEntry {
  original_path: string;
  content_addressed_key: string;
  sha256: string;
  size: number;
  content_type?: string;
  source_bucket?: string;
  discovered_at?: string;
  source_updated_at?: string;
  source_etag?: string;
}

export interface SnapshotManifest {
  schema_version: string;
  snapshot_id: string;
  status: SnapshotStatus;
  started_at: string;
  completed_at?: string;
  source_bucket: string;
  consistency_guarantee: string;
  total_objects: number;
  total_bytes: number;
  objects: SnapshotObjectEntry[];
  failures: SnapshotFailure[];
}

export interface SnapshotMetadata {
  snapshot_id: string;
  state: SnapshotStatus;
  manifest_sha256?: string;
  total_objects: number;
  total_bytes: number;
  started_at: string;
  completed_at?: string;
}

export interface SnapshotFailure {
  snapshot_id: string;
  error_code: string;
  message?: string;
  failed_at: string;
}

// Error codes based on Phase K
export type SnapshotErrorCode =
  | 'SOURCE_LIST_FAILED'
  | 'SOURCE_DOWNLOAD_FAILED'
  | 'SOURCE_CHANGED_DURING_COPY'
  | 'SOURCE_OBJECT_INVALID'
  | 'DESTINATION_HEAD_FAILED'
  | 'DESTINATION_UPLOAD_FAILED'
  | 'DESTINATION_HASH_CONFLICT'
  | 'MANIFEST_GENERATION_FAILED'
  | 'MANIFEST_UPLOAD_FAILED'
  | 'MANIFEST_HASH_MISMATCH'
  | 'STATUS_PUBLISH_FAILED'
  | 'SNAPSHOT_INCOMPLETE'
  | 'CLEANUP_FAILED';
