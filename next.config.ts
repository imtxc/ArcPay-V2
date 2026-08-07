/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // TypeScript errors ko ignore karega build ke waqt
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint errors ko ignore karega build ke waqt
    ignoreDuringBuilds: true,
  },
  // Privy aur standard compatibility
  transpilePackages: ['@privy-io/react-auth'],
};

export default nextConfig;