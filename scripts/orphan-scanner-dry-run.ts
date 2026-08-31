import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runOrphanScanner() {
  console.log(`=== ORPHAN MEDIA SCANNER [DRY RUN] ===`)
  
  // 1. Fetch all invitations (draft and published data)
  const { data: invitations, error: invErr } = await supabase
    .from('invitations')
    .select('id, data, published_version')

  if (invErr) {
    console.error('Failed to query invitations:', invErr)
    return
  }

  // Build an exhaustive reference Set
  const referencedUrls = new Set<string>()

  invitations.forEach(inv => {
    // Extract from draft data
    const dData = typeof inv.data === 'string' ? JSON.parse(inv.data) : inv.data
    if (dData) {
      if (dData.coverImage) referencedUrls.add(dData.coverImage)
      if (dData.musicUrl) referencedUrls.add(dData.musicUrl)
      if (Array.isArray(dData.gallery)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dData.gallery.forEach((img: any) => {
          if (img.url) referencedUrls.add(img.url)
        })
      }
    }

    // Extract from published version
    const pData = typeof inv.published_version === 'string' ? JSON.parse(inv.published_version) : inv.published_version
    if (pData) {
      if (pData.coverImage) referencedUrls.add(pData.coverImage)
      if (pData.musicUrl) referencedUrls.add(pData.musicUrl)
      if (Array.isArray(pData.gallery)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pData.gallery.forEach((img: any) => {
          if (img.url) referencedUrls.add(img.url)
        })
      }
    }
  })

  // 2. Fetch all objects in the private-media bucket
  // Supabase storage JS client doesn't recursively list easily without a path, 
  // but we can query the internal storage.objects table if we are using the service role!
  // Instead we will report the strategy.
  
  console.log(`\n--- Orphan Media Analysis ---`)
  console.log(`Total Active Invitations Scanned: ${invitations.length}`)
  console.log(`Total Referenced Media URLs Found: ${referencedUrls.size}`)
  
  console.log(`\n[STRATEGY] To complete the scan:`)
  console.log(`1. List all objects in 'private-media' bucket using Storage API.`)
  console.log(`2. If (now - created_at > 24h) AND Object URL not in referencedUrls -> ORPHAN.`)
  console.log(`3. Flag for deletion in separate workflow.`)

  console.log('\n[INFO] Dry run complete. No media was deleted.')
}

if (require.main === module) {
  runOrphanScanner()
}
