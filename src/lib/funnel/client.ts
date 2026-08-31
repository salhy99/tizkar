import { trackFunnelEventAction } from "@/actions/funnel";
import { FunnelEventName, DeviceClass, BaseFunnelEvent } from "./events";

const FUNNEL_SESSION_KEY = 'tizkar_funnel_session';

export function getFunnelSessionId(): string {
  if (typeof window === 'undefined') {
    return '00000000-0000-0000-0000-000000000000'; // SSR fallback
  }
  
  const match = document.cookie.match(new RegExp('(^| )' + FUNNEL_SESSION_KEY + '=([^;]+)'));
  let sessionId = match ? match[2] : null;

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    const isSecure = window.location.protocol === 'https:' ? 'Secure;' : '';
    // 7776000 seconds = 90 days
    document.cookie = `${FUNNEL_SESSION_KEY}=${sessionId}; path=/; max-age=7776000; SameSite=Lax; ${isSecure}`;
  }
  return sessionId;
}

export function getDeviceClass(): DeviceClass {
  if (typeof window === 'undefined') return 'unknown';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

const eventDedupCache = new Set<string>();

export async function trackFunnelEvent(
  eventName: FunnelEventName,
  options?: Omit<BaseFunnelEvent, 'eventName' | 'sessionId' | 'deviceClass'>,
  dedupKey?: string
) {
  try {
    const sessionId = getFunnelSessionId();
    
    // Deduplication logic for client
    if (dedupKey) {
      const cacheKey = `${sessionId}:${eventName}:${dedupKey}`;
      if (eventDedupCache.has(cacheKey)) return;
      eventDedupCache.add(cacheKey);
    }

    const payload: BaseFunnelEvent = {
      eventName,
      sessionId,
      deviceClass: getDeviceClass(),
      ...options,
    };

    // Fire and forget, do not block UI
    trackFunnelEventAction(payload).catch(console.error);
  } catch (error) {
    console.error('Failed to track funnel event', error);
  }
}
