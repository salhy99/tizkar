'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createInvitation(templateId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'يجب تسجيل الدخول أولاً' }
  }

  // Get the template to ensure it exists and to get its event_type_id
  const { data: template } = await supabase
    .from('templates')
    .select('*, template_versions(*)')
    .eq('id', templateId)
    .single() as any;

  if (!template) {
    return { error: 'القالب غير موجود' }
  }

  // Get active template version
  const activeVersion = template.template_versions.find((v: any) => v.status === 'ACTIVE') || template.template_versions[0];
  if (!activeVersion) {
    return { error: 'لا يوجد إصدار متاح لهذا القالب' }
  }

  // Generate a random unique slug for draft
  const randomSlug = `draft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Create invitation
  const { data: invitation, error: invError } = await supabase
    .from('invitations')
    .insert({
      user_id: user.id,
      template_id: template.id,
      event_type_id: template.event_type_id,
      title: 'دعوة جديدة',
      slug: randomSlug,
      status: 'DRAFT'
    } as any)
    .select()
    .single() as any;

  if (invError || !invitation) {
    console.error('Create invitation error', invError)
    return { error: 'حدث خطأ أثناء إنشاء الدعوة' }
  }

  // Create invitation version
  const { error: verError } = await supabase
    .from('invitation_versions')
    .insert({
      invitation_id: invitation.id,
      template_version_id: activeVersion.id,
      is_published: false,
      invitation_data: {}
    } as any);

  if (verError) {
    console.error('Create version error', verError)
    return { error: 'حدث خطأ أثناء إعداد بيانات الدعوة' }
  }

  return { success: true, invitationId: invitation.id }
}

export async function updateInvitationData(invitationId: string, data: any) {
  const supabase = await createClient()
  
  // Verify ownership
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Check if invitation exists and user owns it
  const { data: inv } = await supabase
    .from('invitations')
    .select('id, user_id, status')
    .eq('id', invitationId)
    .single() as any;

  if (!inv || inv.user_id !== user.id) {
    return { error: 'Unauthorized or not found' }
  }

  if (inv.status === 'PUBLISHED') {
    return { error: 'لا يمكن تعديل دعوة منشورة' }
  }

  // Basic validation to prevent huge payloads or script injections
  const payloadStr = JSON.stringify(data);
  if (payloadStr.length > 50000) {
    return { error: 'حجم البيانات كبير جداً' }
  }
  if (payloadStr.includes('<script>') || payloadStr.includes('javascript:')) {
    return { error: 'بيانات غير صالحة' }
  }

  // We only allow updating the draft version
  const { error } = await (supabase.from('invitation_versions') as any)
    .update({ invitation_data: data })
    .eq('invitation_id', invitationId)
    .eq('is_published', false) as any;

  if (error) {
    console.error('Update data error', error)
    return { error: 'Failed to update' }
  }

  return { success: true }
}

export async function updateInvitationTitle(invitationId: string, title: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: inv } = await supabase
    .from('invitations')
    .select('id, user_id, status')
    .eq('id', invitationId)
    .single() as any;

  if (!inv || inv.user_id !== user.id) {
    return { error: 'Unauthorized or not found' }
  }

  if (inv.status === 'PUBLISHED') {
    return { error: 'لا يمكن تعديل دعوة منشورة' }
  }

  const { error } = await (supabase.from('invitations') as any)
    .update({ title })
    .eq('id', invitationId)
    .eq('user_id', user.id) as any;

  if (error) return { error: 'Failed to update title' }
  
  return { success: true }
}
