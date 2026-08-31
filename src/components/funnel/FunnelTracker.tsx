'use client';

import { useEffect, useRef } from 'react';
import { trackFunnelEvent } from '@/lib/funnel/client';
import { FunnelEventName } from '@/lib/funnel/events';

interface FunnelTrackerProps {
  eventName: FunnelEventName;
  templateSlug?: string;
  packageCode?: string;
  invitationId?: string;
  sourcePage?: string;
  dedupKey?: string;
}

export function FunnelTracker({
  eventName,
  templateSlug,
  packageCode,
  invitationId,
  sourcePage,
  dedupKey
}: FunnelTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackFunnelEvent(eventName, { templateSlug, packageCode, invitationId, sourcePage }, dedupKey);
  }, [eventName, templateSlug, packageCode, invitationId, sourcePage, dedupKey]);

  return null;
}
