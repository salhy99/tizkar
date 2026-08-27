'use client'

import { useEffect, useRef } from 'react'
import { recordAnalyticsEvent } from '@/actions/analytics'

let fallbackSessionId = ''

function getVisitorHash(): string {
  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  try {
    let hash = localStorage.getItem('tzk_visitor_hash')
    if (!hash) {
      hash = generateId()
      localStorage.setItem('tzk_visitor_hash', hash)
    }
    return hash
  } catch {
    // Fallback for incognito / localstorage disabled
    if (!fallbackSessionId) {
      fallbackSessionId = generateId()
    }
    return fallbackSessionId
  }
}

export function useAnalyticsView(invitationId: string, isPreview: boolean = false) {
  const hasFired = useRef(false)

  useEffect(() => {
    // 1. Skip if editor preview
    if (isPreview) return

    // 2. Skip if already fired in this session/render (Strict Mode dedupe)
    if (hasFired.current) return
    hasFired.current = true

    // 3. Dedupe aggressive reloads via SessionStorage (e.g., 5 min cooldown)
    const sessionKey = `tzk_viewed_${invitationId}`
    try {
      const lastView = sessionStorage.getItem(sessionKey)
      const now = Date.now()
      if (lastView && now - parseInt(lastView) < 5 * 60 * 1000) {
        return // Already counted a view in the last 5 minutes
      }
      sessionStorage.setItem(sessionKey, now.toString())
    } catch {
      // Ignore sessionStorage errors
    }

    const visitorHash = getVisitorHash()

    // Non-blocking, fire and forget
    recordAnalyticsEvent(invitationId, 'INVITATION_VIEW', visitorHash).catch(() => {})
  }, [invitationId, isPreview])
}

export function useAnalyticsInteractions(invitationId: string) {
  const trackShare = (channel: string) => {
    const visitorHash = getVisitorHash()
    recordAnalyticsEvent(invitationId, 'SHARE_CLICK', visitorHash, { channel }).catch(() => {})
  }

  const trackMapClick = () => {
    const visitorHash = getVisitorHash()
    recordAnalyticsEvent(invitationId, 'MAP_CLICK', visitorHash).catch(() => {})
  }

  return { trackShare, trackMapClick }
}
