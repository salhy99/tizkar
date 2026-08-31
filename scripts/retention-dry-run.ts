import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runRetentionDryRun(dryRun: boolean = true) {
  console.log(`=== TELEMETRY RETENTION TOOL [DRY RUN: ${dryRun}] ===`)
  
  const now = new Date()
  const unconvertedThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const convertedThreshold = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  // 1. Identify Converted Sessions
  // Definition: contains FUNNEL_PAYMENT_CONFIRMED OR FUNNEL_PUBLISHED
  const { data: convertedEvents, error: convErr } = await supabase
    .from('product_funnel_events')
    .select('session_id')
    .in('event_name', ['FUNNEL_PAYMENT_CONFIRMED', 'FUNNEL_PUBLISHED'])

  if (convErr) {
    console.error('Failed to query converted sessions:', convErr)
    return
  }

  const convertedSessionIds = new Set(convertedEvents.map(e => e.session_id))

  // 2. Fetch all events to classify candidates
  const { data: allEvents, error: allErr } = await supabase
    .from('product_funnel_events')
    .select('id, session_id, created_at, event_name')

  if (allErr) {
    console.error('Failed to fetch events:', allErr)
    return
  }

  let unconvertedCandidates = 0
  let convertedCandidates = 0
  const totalRows = allEvents.length

  const sessionsToDelete = new Set<string>()

  for (const event of allEvents) {
    const eventDate = new Date(event.created_at)
    const isConverted = convertedSessionIds.has(event.session_id)

    if (isConverted) {
      if (eventDate < convertedThreshold) {
        convertedCandidates++
        sessionsToDelete.add(event.session_id)
      }
    } else {
      if (eventDate < unconvertedThreshold) {
        unconvertedCandidates++
        sessionsToDelete.add(event.session_id)
      }
    }
  }

  console.log(`\n--- Retention Analysis ---`)
  console.log(`Total Telemetry Rows: ${totalRows}`)
  console.log(`Total Converted Sessions: ${convertedSessionIds.size}`)
  console.log(`\n--- Candidates for Pruning ---`)
  console.log(`Unconverted Rows (> 30 days): ${unconvertedCandidates}`)
  console.log(`Converted Rows (> 90 days): ${convertedCandidates}`)
  console.log(`Unique Sessions to Prune: ${sessionsToDelete.size}`)

  if (!dryRun) {
    console.log('\n[WARNING] dryRun is false, but actual deletion is NOT implemented in this phase for safety.')
    // Implementation would be: DELETE FROM product_funnel_events WHERE session_id IN (...)
  } else {
    console.log('\n[INFO] Dry run complete. No rows were deleted.')
  }
}

// Ensure execution is safe
if (require.main === module) {
  runRetentionDryRun(true)
}
