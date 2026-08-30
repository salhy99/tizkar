'use server'

import { createClient } from '@/lib/supabase/server'

export async function createInvitation(templateId: string) {
  const supabase = await createClient();
  
  // 1. Try to get user, but do not block if user is not authenticated
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user ? user.id : null;

  // 1.5 Durable Rate Limiting (Upstash Redis)
  if (!user) {
    const { checkCreationRateLimit } = await import('@/lib/security/rate-limit');
    const rateLimit = await checkCreationRateLimit();
    if (!rateLimit.success) {
      return { error: rateLimit.error };
    }
  }

  // 2. Get the template to ensure it exists and to get its event_type_id
  const { data: template } = await supabase
    .from('templates')
    .select('*, template_versions(*)')
    .eq('id', templateId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .single() as any;

  if (!template) {
    return { error: 'القالب غير موجود' };
  }

  // 3. Validate template status in DB
  if (template.status !== 'ACTIVE') {
    return { error: 'هذا القالب غير متاح حالياً' };
  }

  // 4. Validate template against the Frontend Registry
  const { getTemplate } = await import('@/components/templates/registry')
  const registryTemplate = getTemplate(template.slug)
  
  if (!registryTemplate || registryTemplate.status !== 'ACTIVE') {
    return { error: 'هذا القالب قيد التطوير وغير متاح للاستخدام' }
  }

  // 5. Get active template version
  const activeVersion = template.template_versions.find((v: { status: string }) => v.status === 'ACTIVE') || template.template_versions[0];
  if (!activeVersion) {
    return { error: 'لا يوجد إصدار متاح لهذا القالب' };
  }

  // 4. Generate Secret Edit Token, Recovery Key and their Hashes
  const { generateEditToken, hashEditToken, setEditorSession, generateRecoveryKey, hashRecoveryKey } = await import('@/lib/auth/editor-session');
  const editToken = generateEditToken();
  const editTokenHash = hashEditToken(editToken);
  
  const recoveryKey = generateRecoveryKey();
  const recoveryKeyHash = hashRecoveryKey(recoveryKey);

  // 5. Generate a random unique slug for draft
  const randomSlug = `draft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // 6. Create invitation (Server-side privileged creation via admin client to bypass RLS for anon)
  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: invitation, error: invError } = await adminClient
    .from('invitations')
    .insert({
      user_id: userId,
      template_id: template.id,
      event_type_id: template.event_type_id,
      title: 'دعوة جديدة',
      slug: randomSlug,
      status: 'DRAFT',
      edit_token_hash: editTokenHash,
      recovery_key_hash: recoveryKeyHash
    })
    .select()
    .single();

  if (invError || !invitation) {
    console.error('Create invitation error', invError);
    return { error: 'حدث خطأ أثناء إنشاء الدعوة. حاول مرة أخرى.' }; // Generic safe error
  }

  // 7. Create initial invitation version
  const { error: verError } = await adminClient
    .from('invitation_versions')
    .insert({
      invitation_id: invitation.id,
      template_version_id: activeVersion.id,
      is_published: false,
      invitation_data: {}
    });

  if (verError) {
    console.error('Create version error', verError);
    // Cleanup the orphan invitation since version creation failed
    await adminClient.from('invitations').delete().eq('id', invitation.id);
    return { error: 'حدث خطأ أثناء إعداد بيانات الدعوة. حاول مرة أخرى.' };
  }

  // 8. Immediately establish the Editor Session cookie
  await setEditorSession(invitation.id, editToken);

  // 9. Return success with the token and recovery key so the client can display the secret link ONCE
  return { success: true, invitationId: invitation.id, editToken, recoveryKey };
}

export async function updateInvitationData(invitationId: string, data: import('@/components/templates/types').InvitationData) {
  const { requireInvitationEditAccess } = await import('@/lib/auth/invitation-auth');
  
  // 1. Centralized Dual Authorization Check
  const authorizedInv = await requireInvitationEditAccess(invitationId);
  if (!authorizedInv) {
    return { error: 'Unauthorized or not found' }
  }

  if (authorizedInv.status === 'PUBLISHED') {
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

  // Use service role to bypass RLS for token users, strictly constrained to the authorized invitationId
  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Strip any client-supplied presentation data to prevent tampering
  const safeData = { ...data };
  delete safeData.presentation;

  // We only allow updating the draft version
  const { data: updatedData, error } = await adminClient
    .from('invitation_versions')
    .update({ invitation_data: safeData })
    .eq('invitation_id', invitationId)
    .eq('is_published', false)
    .select('id');

  if (error || !updatedData || updatedData.length === 0) {
    console.error('Update data error or no rows affected', error)
    return { error: 'Failed to update' }
  }

  return { success: true }
}

export async function updateInvitationTitle(invitationId: string, title: string) {
  const { requireInvitationEditAccess } = await import('@/lib/auth/invitation-auth');
  const authorizedInv = await requireInvitationEditAccess(invitationId);
  if (!authorizedInv) return { error: 'Unauthorized' }
  if (authorizedInv.status === 'PUBLISHED') return { error: 'لا يمكن تعديل دعوة منشورة' }

  if (!title || title.trim().length === 0 || title.length > 50) return { error: 'عنوان غير صالح' }

  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { error } = await adminClient
    .from('invitations')
    .update({ title: title.trim() })
    .eq('id', invitationId)

  if (error) return { error: 'Failed to update title' }
  return { success: true }
}

export async function publishInvitationOwner(invitationId: string) {
  const { requireInvitationEditAccess } = await import('@/lib/auth/invitation-auth');
  const authorizedInv = await requireInvitationEditAccess(invitationId);
  if (!authorizedInv) return { error: 'Unauthorized' }
  if (authorizedInv.status === 'PUBLISHED') return { error: 'الدعوة منشورة بالفعل' }

  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Check order status
  const { data: order } = await adminClient
    .from('orders')
    .select('id, status, plan_snapshot')
    .eq('invitation_id', invitationId)
    .eq('status', 'PAID')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!order) {
    return { error: 'لا يوجد طلب دفع مؤكد (PAID) مرتبط بهذه الدعوة' }
  }

  // ─── PREMIUM TEMPLATE PUBLICATION GATE ───
  // 1. Fetch the invitation's template slug
  const { data: invData } = await adminClient
    .from('invitations')
    .select('templates(slug)')
    .eq('id', invitationId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tData = invData?.templates as any;
  const templateSlug = Array.isArray(tData) ? tData[0]?.slug : tData?.slug;

  if (templateSlug) {
    const { getTemplate } = await import('@/components/templates/registry');
    const registryTemplate = getTemplate(templateSlug);
    
    if (registryTemplate?.requiredEntitlement === 'premiumTemplates') {
      const { requireInvitationFeature } = await import('@/lib/entitlements/server');
      const hasPremium = await requireInvitationFeature(invitationId, 'premiumTemplates');
      if (!hasPremium) {
        return { error: 'هذا القالب متاح للنشر ضمن باقة Premium.' }
      }
    }
  }
  // ─────────────────────────────────────────

  // Generate unique clean slug if still draft slug
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invMeta = authorizedInv as any;
  let slug = invMeta.slug as string;
  if (!slug || slug.startsWith('draft-')) {
    slug = (invMeta.title as string || 'wedding')
      .trim()
      .replace(/[^a-zA-Z0-9\u0621-\u064A\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
    slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
  }

  // Calculate expiration date from plan
  const durationDays = order.plan_snapshot?.duration_days || 30;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  // Update invitation
  const { error: invErr } = await adminClient
    .from('invitations')
    .update({
      status: 'PUBLISHED',
      slug,
      published_at: now.toISOString(),
      expires_at: expiresAt
    })
    .eq('id', invitationId);

  if (invErr) return { error: 'حدث خطأ أثناء النشر' }

  // Evaluate branding entitlement
  let showTizkarAttribution = true; // Safe fallback
  if (templateSlug) {
    const { requireInvitationFeature } = await import('@/lib/entitlements/server');
    const canRemoveBranding = await requireInvitationFeature(invitationId, 'removeBranding');
    showTizkarAttribution = !canRemoveBranding;
  }

  // Fetch current draft data to inject presentation snapshot
  const { data: draftVer } = await adminClient
    .from('invitation_versions')
    .select('invitation_data')
    .eq('invitation_id', invitationId)
    .eq('is_published', false)
    .single();

  const finalData = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...((draftVer?.invitation_data as any) || {}),
    presentation: { showTizkarAttribution }
  };

  // Update version
  const { error: verErr } = await adminClient
    .from('invitation_versions')
    .update({ 
      is_published: true,
      invitation_data: finalData
    })
    .eq('invitation_id', invitationId)
    .eq('is_published', false);

  if (verErr) return { error: 'حدث خطأ أثناء نشر النسخة' }

  return { success: true, slug }
}

export async function regenerateRecoveryKey(invitationId: string) {
  const { requireInvitationEditAccess } = await import('@/lib/auth/invitation-auth');
  const authorizedInv = await requireInvitationEditAccess(invitationId);
  if (!authorizedInv) return { error: 'Unauthorized' }

  const { generateRecoveryKey, hashRecoveryKey } = await import('@/lib/auth/editor-session');
  const newRecoveryKey = generateRecoveryKey();
  const newHash = hashRecoveryKey(newRecoveryKey);

  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { error } = await adminClient
    .from('invitations')
    .update({ recovery_key_hash: newHash })
    .eq('id', invitationId);

  if (error) return { error: 'حدث خطأ أثناء إصدار رمز الاسترداد' };
  
  return { success: true, recoveryKey: newRecoveryKey };
}

export async function recoverInvitation(recoveryKey: string) {
  if (!recoveryKey || typeof recoveryKey !== 'string') return { error: 'رمز الاسترداد غير صحيح أو لم يعد صالحاً.' };

  const { checkRecoveryRateLimit } = await import('@/lib/security/rate-limit');
  const rateLimit = await checkRecoveryRateLimit();
  if (!rateLimit.success) {
    return { error: rateLimit.error };
  }

  const { hashRecoveryKey, generateEditToken, hashEditToken, generateRecoveryKey, setEditorSession } = await import('@/lib/auth/editor-session');
  
  // 1. Hash the provided key to lookup securely
  const inputHash = hashRecoveryKey(recoveryKey);

  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // 2. Locate invitation by recovery_key_hash
  const { data: inv, error: findError } = await adminClient
    .from('invitations')
    .select('id, status')
    .eq('recovery_key_hash', inputHash)
    .single();

  if (findError || !inv) {
    return { error: 'رمز الاسترداد غير صحيح أو لم يعد صالحاً.' };
  }

  // 3. Generate New Credentials
  const newEditToken = generateEditToken();
  const newEditTokenHash = hashEditToken(newEditToken);
  
  const newRecoveryKey = generateRecoveryKey();
  const newRecoveryKeyHash = hashRecoveryKey(newRecoveryKey);

  // 4. Update the invitation with new hashes
  const { error: updateError } = await adminClient
    .from('invitations')
    .update({
      edit_token_hash: newEditTokenHash,
      recovery_key_hash: newRecoveryKeyHash,
      last_recovered_at: new Date().toISOString()
    })
    .eq('id', inv.id);

  if (updateError) {
    return { error: 'حدث خطأ أثناء عملية الاسترداد. حاول مرة أخرى.' };
  }

  // 5. Establish new Editor Session
  await setEditorSession(inv.id, newEditToken);

  // 6. Return new credentials ONE TIME
  return { 
    success: true, 
    invitationId: inv.id, 
    newEditToken: newEditToken, 
    newRecoveryKey: newRecoveryKey 
  };
}
