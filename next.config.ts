/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // TypeScript errors ignore honge deployment ke waqt
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint errors ignore honge deployment ke waqt
    ignoreDuringBuilds: true,
  },
  // Privy compatibility fix
  transpilePackages: ['@privy-io/react-auth', '@stripe/stripe-js'],
};

export default nextConfig;
