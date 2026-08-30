import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'no-referrer', // Prevents secret token leaking in external links
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          {
            key: 'Content-Security-Policy-Report-Only',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://zxrzqyvlydsdczngxxst.supabase.co https://hnjfxdyterpbmkisaiiw.supabase.co; media-src 'self' blob: https://zxrzqyvlydsdczngxxst.supabase.co https://hnjfxdyterpbmkisaiiw.supabase.co; connect-src 'self' https://zxrzqyvlydsdczngxxst.supabase.co https://hnjfxdyterpbmkisaiiw.supabase.co wss://ws-us3.pusher.com; frame-ancestors 'none'; form-action 'self';"
          }
        ],
      },
    ];
  },
};

export default nextConfig;
