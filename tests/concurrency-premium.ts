import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('--- Premium Unlimited RSVP Test ---')
  
  const { data: template } = await supabase.from('templates').select('id, event_type_id').limit(1).single()
  const { data: user } = await supabase.from('profiles').select('id').limit(1).single()

  const { data: inv, error: invErr } = await supabase
    .from('invitations')
    .insert({
      user_id: user.id,
      title: 'Premium Test',
      status: 'PUBLISHED',
      slug: 'premium-test-' + Date.now(),
      template_id: template.id,
      event_type_id: template.event_type_id
    })
    .select('id')
    .single()

  if (invErr) {
    console.error('Failed to create invitation:', invErr)
    return
  }
  
  const invitationId = inv.id
  const maxRsvps = -1 // Unlimited
  
  console.log('Launching 20 concurrent RSVP submissions...')
  const promises = []
  for (let i = 0; i < 20; i++) {
    promises.push(
      supabase.rpc('submit_invitation_rsvp_atomic', {
        p_invitation_id: invitationId,
        p_guest_name: `Contender ${i}`,
        p_attendance_status: 'ATTENDING',
        p_guest_count: 1,
        p_message: null,
        p_max_rsvps: maxRsvps
      })
    )
  }

  const results = await Promise.all(promises)
  
  let successes = 0
  let denials = 0
  results.forEach(r => {
    if (r.data && r.data.success) successes++
    else denials++
  })

  const { count: finalUsage } = await supabase
    .from('invitation_rsvps')
    .select('*', { count: 'exact', head: true })
    .eq('invitation_id', invitationId)

  console.log('Configured limit:', 'UNLIMITED (-1)')
  console.log('Existing usage:', 0)
  console.log('Parallel submissions:', 20)
  console.log('Successes:', successes)
  console.log('Denials:', denials)
  console.log('Final usage:', finalUsage)
  
  await supabase.from('invitations').delete().eq('id', invitationId)
}

run().catch(console.error)
