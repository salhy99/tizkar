// @ts-nocheck
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function testRsvpConcurrency() {
  console.log('--- RSVP Concurrency Test ---')
  
  const { data: template } = await supabase.from('templates').select('id, event_type_id').limit(1).single()
  const { data: user } = await supabase.from('profiles').select('id').limit(1).single()

  // 1. Create a draft invitation
  const { data: inv, error: invErr } = await supabase
    .from('invitations')
    .insert({
      user_id: user.id,
      title: 'Concurrency Test',
      status: 'PUBLISHED',
      slug: 'concurrency-test-' + Date.now(),
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

  // 2. Set maxRsvps = 5
  const maxRsvps = 5
  
  // 3. Seed usage: 4 (so capacity is 1)
  console.log('Seeding 4 RSVPs (Capacity: 1)')
  for (let i = 0; i < 4; i++) {
    await supabase.rpc('submit_invitation_rsvp_atomic', {
      p_invitation_id: invitationId,
      p_guest_name: `Seed ${i}`,
      p_attendance_status: 'ATTENDING',
      p_guest_count: 1,
      p_message: null,
      p_max_rsvps: maxRsvps
    })
  }

  // 4. Launch 20 concurrent submissions
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

  console.log('Configured limit:', maxRsvps)
  console.log('Existing usage:', 4)
  console.log('Parallel submissions:', 20)
  console.log('Successes:', successes)
  console.log('Denials:', denials)
  console.log('Final usage:', finalUsage)
  
  // Clean up
  await supabase.from('invitations').delete().eq('id', invitationId)
}

async function testMediaConcurrency() {
  console.log('\n--- Media Concurrency Test ---')
  
  const { data: template } = await supabase.from('templates').select('id, event_type_id').limit(1).single()
  const { data: user } = await supabase.from('profiles').select('id').limit(1).single()

  // 1. Create a draft invitation
  const { data: inv, error: invErr } = await supabase
    .from('invitations')
    .insert({
      user_id: user.id,
      title: 'Concurrency Test Media',
      status: 'DRAFT',
      slug: 'concurrency-test-media-' + Date.now(),
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

  // 2. Set maxImages = 10
  const maxImages = 10
  
  // 3. Seed usage: 9 via JSON (Capacity: 1)
  console.log('Seeding 9 images in JSON (Capacity: 1)')
  await supabase.from('invitation_versions').insert({
    invitation_id: invitationId,
    is_published: false,
    invitation_data: { gallery: Array(9).fill('seeded.jpg') }
  })

  // 4. Launch 10 concurrent reservations
  console.log('Launching 10 concurrent media slot reservations...')
  const promises = []
  for (let i = 0; i < 10; i++) {
    promises.push(
      supabase.rpc('reserve_media_upload_slot', {
        p_invitation_id: invitationId,
        p_category: 'gallery',
        p_max_images: maxImages
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

  const { count: finalReservations } = await supabase
    .from('invitation_media_reservations')
    .select('*', { count: 'exact', head: true })
    .eq('invitation_id', invitationId)

  console.log('Configured limit:', maxImages)
  console.log('Existing usage:', 9)
  console.log('Parallel requests:', 10)
  console.log('Successes:', successes)
  console.log('Denials:', denials)
  console.log('Final reservation usage (DB):', finalReservations)
  
  // Clean up
  await supabase.from('invitations').delete().eq('id', invitationId)
}

async function run() {
  await testRsvpConcurrency()
  await testMediaConcurrency()
}

run().catch(console.error)
