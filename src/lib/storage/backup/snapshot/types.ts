export interface SnapshotManifest {
  snapshot_id: string;
  schema_version: '1.0';
  source_bucket: string;
  started_at: string;
  completed_at: string;
  status: 'COMPLETE' | 'PARTIAL' | 'FAILED';
  total_objects: number;
  total_bytes: number;
  objects: SnapshotObject[];
  failures: SnapshotFailure[];
}

export interface SnapshotObject {
  path: string; // Original relative path in the source bucket
  size: number;
  mime_type: string;
  sha256: string; // Hash of the object contents
  destination_key: string; // Exact key where this object is stored in the backup destination
  version_id?: string; // Destination object version, if versioning is enabled
  source_etag?: string; // Optional: ETag from source at the time of backup
}

export interface SnapshotFailure {
  path: string;
  error: string;
  stage: 'listing' | 'download' | 'upload' | 'validation';
}
