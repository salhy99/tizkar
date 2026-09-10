/**
 * Production Environment Guard
 * 
 * Verifies that the current execution environment is not accidentally bound
 * to Production resources during a Disaster Recovery drill.
 */

export function assertIsolatedEnvironment() {
  const isDrill = process.env.DR_DRILL_MODE === 'true';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const r2Bucket = process.env.RESTORE_S3_BUCKET || process.env.BACKUP_S3_BUCKET || '';
  
  // Replace this with the actual known production ref when available
  const productionProjectRef = 'hnjfxdyterpbmkisaiiw';
  const productionBucket = 'invitations_assets';

  if (isDrill) {
    if (supabaseUrl.includes(productionProjectRef)) {
      console.error('FATAL: Production Supabase URL detected in DR Drill environment.');
      process.exit(1);
    }
    if (r2Bucket === productionBucket) {
      console.error('FATAL: Production Storage Bucket detected in DR Drill environment.');
      process.exit(1);
    }
    console.log('[DR_GUARD] Isolation verified. Target is not production.');
  }
}
