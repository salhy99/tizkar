import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

let redis: Redis | null = null;
let creationLimiter: Ratelimit | null = null;
let recoveryLimiter: Ratelimit | null = null;
let rsvpLimiter: Ratelimit | null = null;
let analyticsLimiter: Ratelimit | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // Burst: 3 requests per 10 minutes (using sliding window)
    creationLimiter = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(3, "10 m"),
      analytics: true,
      prefix: "tzk_create_burst",
    });

    // Recovery Limit: 5 requests per 15 minutes
    recoveryLimiter = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      analytics: true,
      prefix: "tzk_recover_burst",
    });

    // RSVP Limit: 10 requests per 1 hour
    rsvpLimiter = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      analytics: true,
      prefix: "tzk_rsvp_burst",
    });

    // Analytics Limit: Lightweight, high throughput per visitor per invitation
    // Example: 20 events per 10 seconds (allows for quick interaction mapping)
    analyticsLimiter = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(20, "10 s"),
      analytics: false,
      prefix: "tzk_analytics_burst",
    });
  }
} catch (error) {
  console.error("Failed to initialize Upstash Redis:", error);
}

// Fallback memory map if Redis is unavailable or unconfigured (only for development/fallback)
const fallbackCreateMap = new Map<string, { count: number, resetAt: number }>();
const fallbackRecoverMap = new Map<string, { count: number, resetAt: number }>();

export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  // Vercel / Cloudflare standard header
  const forwardedFor = headersList.get('x-forwarded-for');
  let ip = '';
  
  if (forwardedFor) {
    ip = forwardedFor.split(',')[0].trim();
  } else {
    const realIp = headersList.get('x-real-ip');
    if (realIp) {
      ip = realIp.trim();
    }
  }

  if (!ip) {
    return 'unknown_ip';
  }

  // Basic normalization for IPv6 localhost
  if (ip === '::1') {
    return '127.0.0.1';
  }

  // Remove port if present (IPv4)
  if (ip.includes(':') && ip.split(':').length === 2) {
    ip = ip.split(':')[0];
  }

  return ip;
}

export async function checkCreationRateLimit(): Promise<{ success: boolean; error?: string }> {
  const ip = await getClientIp();

  if (creationLimiter) {
    try {
      const { success } = await creationLimiter.limit(ip);
      if (!success) {
        return { success: false, error: 'تم إجراء عدة محاولات خلال وقت قصير. حاول مرة أخرى لاحقاً.' };
      }
      return { success: true };
    } catch (error) {
      console.error("Upstash RateLimit Error:", error);
      return { success: false, error: 'الخدمة غير متاحة مؤقتاً بسبب ضغط الطلبات. الرجاء المحاولة لاحقاً.' };
    }
  }

  // If we are in production and Redis is missing, FAIL CLOSED.
  if (process.env.NODE_ENV === 'production') {
    console.error("CRITICAL: Upstash Redis is missing in production environment. Failing closed for creation.");
    return { success: false, error: 'الخدمة غير متاحة حالياً. الرجاء المحاولة لاحقاً.' };
  }

  // Fallback for development (in-memory) if Redis not configured
  const now = Date.now();
  const record = fallbackCreateMap.get(ip);
  if (record && record.resetAt > now) {
    if (record.count >= 100) {
      return { success: false, error: 'تم إجراء عدة محاولات خلال وقت قصير. حاول مرة أخرى لاحقاً.' };
    }
    record.count++;
  } else {
    fallbackCreateMap.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
  }
  
  return { success: true };
}

export async function checkRecoveryRateLimit(): Promise<{ success: boolean; error?: string }> {
  const ip = await getClientIp();

  if (recoveryLimiter) {
    try {
      const { success } = await recoveryLimiter.limit(ip);
      if (!success) {
        return { success: false, error: 'تم إجراء عدة محاولات استرداد. حاول مرة أخرى بعد قليل.' };
      }
      return { success: true };
    } catch (error) {
      console.error("Upstash RateLimit Error:", error);
      return { success: false, error: 'الخدمة غير متاحة مؤقتاً. الرجاء المحاولة لاحقاً.' };
    }
  }

  // If we are in production and Redis is missing, FAIL CLOSED.
  if (process.env.NODE_ENV === 'production') {
    console.error("CRITICAL: Upstash Redis is missing in production environment. Failing closed for recovery.");
    return { success: false, error: 'الخدمة غير متاحة حالياً. الرجاء المحاولة لاحقاً.' };
  }

  // Fallback for development
  const now = Date.now();
  const record = fallbackRecoverMap.get(ip);
  if (record && record.resetAt > now) {
    if (record.count >= 5) {
      return { success: false, error: 'تم إجراء عدة محاولات استرداد. حاول مرة أخرى بعد قليل.' };
    }
    record.count++;
  } else {
    fallbackRecoverMap.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
  }
  
  return { success: true };
}

const fallbackRsvpMap = new Map<string, { count: number, resetAt: number }>();

export async function checkRsvpRateLimit(invitationId: string): Promise<{ success: boolean; error?: string }> {
  const ip = await getClientIp();
  const key = `${ip}:${invitationId}`; // specific to invitation

  if (rsvpLimiter) {
    try {
      const { success } = await rsvpLimiter.limit(key);
      if (!success) {
        return { success: false, error: 'تم إرسال عدة ردود. الرجاء المحاولة بعد قليل.' };
      }
      return { success: true };
    } catch (error) {
      console.error("Upstash RateLimit Error (RSVP):", error);
      return { success: false, error: 'الخدمة غير متاحة حالياً. الرجاء المحاولة لاحقاً.' };
    }
  }

  if (process.env.NODE_ENV === 'production') {
    console.error("CRITICAL: Upstash Redis is missing in production environment. Failing closed for RSVP.");
    return { success: false, error: 'الخدمة غير متاحة حالياً.' };
  }

  const now = Date.now();
  const record = fallbackRsvpMap.get(key);
  if (record && record.resetAt > now) {
    if (record.count >= 10) {
      return { success: false, error: 'تم إرسال عدة ردود. الرجاء المحاولة بعد قليل.' };
    }
    record.count++;
  } else {
    fallbackRsvpMap.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
  }
  
  return { success: true };
}

export async function checkAnalyticsRateLimit(invitationId: string): Promise<{ success: boolean; drop?: boolean; error?: string }> {
  const ip = await getClientIp();
  const key = `${ip}:${invitationId}`; 

  if (analyticsLimiter) {
    try {
      const { success } = await analyticsLimiter.limit(key);
      if (!success) {
        return { success: false, error: 'تم تجاوز الحد المسموح للأحداث' };
      }
      return { success: true };
    } catch (error) {
      console.error("Upstash RateLimit Error (Analytics):", error);
      // Fail-open for UX but drop event to prevent unbounded database ingestion
      return { success: false, drop: true, error: 'Rate limit infrastructure unavailable' };
    }
  }

  // If Redis is missing, Fail-open for UX but drop event
  return { success: false, drop: true, error: 'Redis unconfigured' };
}
