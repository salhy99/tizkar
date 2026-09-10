import { createClient } from '@supabase/supabase-js';
import { assertIsolatedEnvironment } from './dr-environment-guard';

async function crosscheck() {
  assertIsolatedEnvironment();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabase = createClient(supabaseUrl, serviceKey);

  console.log('[DR_CROSSCHECK] Starting Database / Storage Cross-check');

  // Check 1: Query all invitations and ensure cover/audio media exists in storage
  const { data: invitations, error } = await supabase.from('invitations').select('id, cover_image_path, audio_path');
  if (error) {
    console.error('[DR_CROSSCHECK] Failed to fetch invitations:', error.message);
    process.exit(1);
  }

  let missingMedia = 0;
  let totalMediaReferences = 0;

  // Assuming all invitations_assets objects can be listed
  const { data: storageList, error: storageError } = await supabase.storage.from('invitations_assets').list();
  if (storageError) {
    console.error('[DR_CROSSCHECK] Failed to list storage:', storageError.message);
    process.exit(1);
  }
  const storageFiles = new Set(storageList.map(f => f.name));

  for (const inv of invitations) {
    if (inv.cover_image_path) {
      totalMediaReferences++;
      if (!storageFiles.has(inv.cover_image_path.split('/').pop() || '')) {
        console.error(`[DR_CROSSCHECK] Missing cover image: ${inv.cover_image_path}`);
        missingMedia++;
      }
    }
    if (inv.audio_path) {
      totalMediaReferences++;
      if (!storageFiles.has(inv.audio_path.split('/').pop() || '')) {
        console.error(`[DR_CROSSCHECK] Missing audio: ${inv.audio_path}`);
        missingMedia++;
      }
    }
  }

  console.log(`REFERENCED_MEDIA_COUNT: ${totalMediaReferences}`);
  console.log(`MISSING_REFERENCED_MEDIA: ${missingMedia}`);
  // In a full cross-check we would also detect orphans
  console.log(`ORPHAN_MEDIA_COUNT: N/A (Dry run)`);
  
  if (missingMedia > 0) {
    console.log(`MEDIA_INTEGRITY_STATUS: FAILED`);
    process.exit(1);
  } else {
    console.log(`MEDIA_INTEGRITY_STATUS: PASS`);
  }
}

if (require.main === module) {
  crosscheck().catch(console.error);
}
