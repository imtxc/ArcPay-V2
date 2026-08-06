/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Production mein console logs mita dena taaki data leak na ho
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // 2. Security Headers (Prompt 03 ke mutabiq)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;