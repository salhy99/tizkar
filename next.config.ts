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
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: ${process.env.NEXT_PUBLIC_SUPABASE_URL}; media-src 'self' blob: ${process.env.NEXT_PUBLIC_SUPABASE_URL}; connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL}; frame-ancestors 'none'; form-action 'self'; object-src 'none'; base-uri 'self'; font-src 'self';`
          }
        ],
      },
    ];
  },
};

export default nextConfig;
