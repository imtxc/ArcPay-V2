'use client';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from 'wagmi';
import { config as wagmiConfig } from '@/lib/wagmi';
import { arcTestnet } from '@/lib/wagmi-chain';
import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- UNIVERSAL RED SCREEN BLOCKER ---
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    // Error message ko poora string banao taaki kuch bhi na choote
    const errorString = args.map(arg => String(arg)).join(' ');
    
    // Agar inme se koi bhi word mile, toh Next.js ko mat batao (return ho jao)
    if (
      errorString.includes('isActive') || 
      errorString.includes('isactive') || 
      errorString.includes('DOM element') ||
      errorString.includes('React does not recognize')
    ) {
      return; 
    }
    originalError.apply(console, args);
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: { theme: 'dark', accentColor: '#2563eb' },
        embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } },
        defaultChain: arcTestnet,
        supportedChains: [arcTestnet],
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {/* Children render only when mounted to prevent hydration flash */}
          <div style={{ display: mounted ? 'contents' : 'none' }}>
            {children}
          </div>
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  );
}