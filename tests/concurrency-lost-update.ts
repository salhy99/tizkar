// @ts-nocheck
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('--- JSON Lost Update Test ---')
  
  const { data: template } = await supabase.from('templates').select('id, event_type_id').limit(1).single()
  const { data: user } = await supabase.from('profiles').select('id').limit(1).single()

  // 1. Create a draft invitation
  const { data: inv, error: invErr } = await supabase
    .from('invitations')
    .insert({
      user_id: user.id,
      title: 'Lost Update Test',
      status: 'DRAFT',
      slug: 'lost-update-test-' + Date.now(),
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

  // 2. Insert draft version with empty gallery
  await supabase.from('invitation_versions').insert({
    invitation_id: invitationId,
    is_published: false,
    invitation_data: { gallery: [], title: 'Initial' }
  })

  // 3. Setup Reservations
  const r1 = await supabase.rpc('reserve_media_upload_slot', { p_invitation_id: invitationId, p_category: 'gallery', p_max_images: 10 })
  const r2 = await supabase.rpc('reserve_media_upload_slot', { p_invitation_id: invitationId, p_category: 'gallery', p_max_images: 10 })
  
  await supabase.rpc('confirm_media_upload_slot', { p_reservation_id: r1.data.reservation_id, p_invitation_id: invitationId, p_path: 'pathA' })
  await supabase.rpc('confirm_media_upload_slot', { p_reservation_id: r2.data.reservation_id, p_invitation_id: invitationId, p_path: 'pathB' })

  // 4. Concurrently commit uploads and autosave title
  console.log('Launching concurrent operations...')
  const p1 = supabase.rpc('commit_media_upload_atomic', { p_invitation_id: invitationId, p_reservation_id: r1.data.reservation_id, p_storage_path: 'pathA', p_category: 'gallery' })
  const p2 = supabase.rpc('commit_media_upload_atomic', { p_invitation_id: invitationId, p_reservation_id: r2.data.reservation_id, p_storage_path: 'pathB', p_category: 'gallery' })
  const p3 = supabase.rpc('update_invitation_data_atomic', { p_invitation_id: invitationId, p_new_data: { title: 'Updated Title' } })

  await Promise.all([p1, p2, p3])

  // 5. Verify final state
  const { data: ver } = await supabase.from('invitation_versions').select('invitation_data').eq('invitation_id', invitationId).eq('is_published', false).single()
  
  console.log('Final Data:', JSON.stringify(ver.invitation_data, null, 2))

  if (ver.invitation_data.gallery.includes('pathA') && ver.invitation_data.gallery.includes('pathB') && ver.invitation_data.title === 'Updated Title') {
    console.log('SUCCESS: All changes survived!')
  } else {
    console.log('FAILED: Lost update occurred!')
  }
  
  await supabase.from('invitations').delete().eq('id', invitationId)
}

run().catch(console.error)
