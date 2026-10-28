import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Ikke fortell omverdenen hvilket rammeverk som kjører.
  poweredByHeader: false,

  // Grunnleggende sikkerhetshoder på alle sider.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
