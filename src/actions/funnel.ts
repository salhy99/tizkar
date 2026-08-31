'use server';

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { BaseFunnelEvent, isClientAllowedEvent, isValidFunnelEvent } from "@/lib/funnel/events";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function trackFunnelEventAction(payload: BaseFunnelEvent) {
  try {
    // 1. Validate payload basics
    if (!payload || !payload.eventName || !payload.sessionId) {
      return { success: false, error: 'Invalid payload' };
    }

    if (!isValidFunnelEvent(payload.eventName)) {
      return { success: false, error: 'Unknown event name' };
    }

    // 2. Enforce Client Allowlist
    if (!isClientAllowedEvent(payload.eventName)) {
      console.warn(`[Funnel] Unauthorized client attempt to track server event: ${payload.eventName}`);
      return { success: false, error: 'Unauthorized event from client' };
    }

    // 3. Write to DB using Service Role to bypass RLS for inserts
    const adminClient = getAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient.from('product_funnel_events') as any).insert({
      session_id: payload.sessionId,
      event_name: payload.eventName,
      invitation_id: payload.invitationId || null,
      template_slug: payload.templateSlug || null,
      package_code: payload.packageCode || null,
      device_class: payload.deviceClass || 'unknown',
      source_page: payload.sourcePage || null,
      event_key: payload.eventKey || null,
      is_synthetic: false // Browser must not decide this field
    });

    if (error) {
      console.error('[Funnel] DB Insert Error (Client Event):', error);
      return { success: false, error: 'Database error' };
    }

    return { success: true };
  } catch (error) {
    console.error('[Funnel] Server Action Exception:', error);
    return { success: false, error: 'Server exception' };
  }
}


