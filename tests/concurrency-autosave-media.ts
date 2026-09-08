
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('--- Stale Autosave Media Field Ownership Test ---')
  
  const { data: template } = await supabase.from('templates').select('id, event_type_id').limit(1).single()
  if (!template) throw new Error('No template found')
  const { data: user } = await supabase.from('profiles').select('id').limit(1).single()
  if (!user) throw new Error('No user found')

  const { data: inv, error: invErr } = await supabase
    .from('invitations')
    .insert({
      user_id: user.id,
      title: 'Stale Autosave Test',
      status: 'DRAFT',
      slug: 'stale-autosave-test-' + Date.now(),
      template_id: template.id,
      event_type_id: template.event_type_id
    })
    .select('id')
    .single()

  if (invErr || !inv) throw invErr || new Error('No inv')
  const invitationId = inv.id

  // 1. Initial State: gallery = []
  await supabase.from('invitation_versions').insert({
    invitation_id: invitationId,
    is_published: false,
    invitation_data: { gallery: [], title: 'Initial' }
  })

  // 2. Simulate Upload A committing
  const r1 = await supabase.rpc('reserve_media_upload_slot', { p_invitation_id: invitationId, p_category: 'gallery', p_max_images: 10 })
  if (!r1.data) throw new Error('r1 failed')
  const r1Data = r1.data as { reservation_id: string }
  await supabase.rpc('confirm_media_upload_slot', { p_reservation_id: r1Data.reservation_id, p_invitation_id: invitationId, p_path: 'pathA' })
  await supabase.rpc('commit_media_upload_atomic', { p_invitation_id: invitationId, p_reservation_id: r1Data.reservation_id, p_storage_path: 'pathA', p_category: 'gallery' })

  // 3. Simulate Stale Autosave
  // The client sends the entire old snapshot where gallery = []
  // But our server layer now strips it before calling update_invitation_data_atomic,
  // AND the DB layer (defense in depth) strips it as well.
  const staleData = { title: 'Updated Title', gallery: [] }
  await supabase.rpc('update_invitation_data_atomic', { p_invitation_id: invitationId, p_new_data: staleData })

  // 4. Verify Final State
  const { data: ver } = await supabase.from('invitation_versions').select('invitation_data').eq('invitation_id', invitationId).eq('is_published', false).single()
  if (!ver || !ver.invitation_data) throw new Error('No version data')
  
  const invData = ver.invitation_data as { gallery: string[], title: string }
  
  console.log('Final Data:', JSON.stringify(invData, null, 2))

  if (invData.gallery.includes('pathA') && invData.title === 'Updated Title') {
    console.log('SUCCESS: Media field ownership enforced! Stale autosave did not destroy the media commit.')
  } else {
    console.log('FAILED: Stale autosave destroyed the media commit!')
  }
  
  await supabase.from('invitations').delete().eq('id', invitationId)
}

run().catch(console.error)
