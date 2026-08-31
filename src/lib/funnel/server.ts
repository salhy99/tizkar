import { createClient as createAdminClient } from "@supabase/supabase-js";
import { BaseFunnelEvent, isValidFunnelEvent } from "./events";
import { cookies } from "next/headers";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Server-only helper for trusted events (called by other Server Actions or API routes)
// DO NOT ADD 'use server' to this file, it should remain an internal function.
export async function trackServerFunnelEvent(payload: Omit<BaseFunnelEvent, 'sessionId'> & { sessionId?: string }) {
  try {
    const cookieStore = await cookies();
    const sessionId = payload.sessionId || cookieStore.get('tizkar_funnel_session')?.value;

    if (!payload || !payload.eventName || !sessionId) {
      return;
    }

    if (!isValidFunnelEvent(payload.eventName)) {
      return;
    }

    const adminClient = getAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient.from('product_funnel_events') as any).insert({
      session_id: sessionId,
      event_name: payload.eventName,
      invitation_id: payload.invitationId || null,
      template_slug: payload.templateSlug || null,
      package_code: payload.packageCode || null,
      device_class: payload.deviceClass || 'unknown',
      source_page: payload.sourcePage || null,
      event_key: payload.eventKey || null,
      is_synthetic: payload.isSynthetic || false
    });

    if (error) {
      // Handle unique constraint violation on event_key gracefully (idempotency)
      if (error.code === '23505') {
        return; // It's fine, deduplicated
      }
      console.error('[Funnel] DB Insert Error (Server Event):', error);
    }
  } catch (error) {
    console.error('[Funnel] Server Exception (Server Event):', error);
  }
}
