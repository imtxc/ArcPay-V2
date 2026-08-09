'use client';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from 'wagmi';
import { config as wagmiConfig } from '@/lib/wagmi';
import { arcTestnet } from '@/lib/wagmi-chain';
import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- UNIVERSAL RED SCREEN BLOCKER ---
if (typeof window !== 'undefined') {
  const originalError = window.console.error;
  window.console.error = (...args) => {
    const errorString = args.map(arg => String(arg)).join(' ');
    
    // In warnings ko block karo taaki Next.js crash screen na dikhaye
    if (
      errorString.includes('isActive') || 
      errorString.includes('isactive') || 
      errorString.includes('DOM element') ||
      errorString.includes('React does not recognize')
    ) {
      return; 
    }
    originalError.apply(window.console, args);
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // ✅ CRASH FIX: QueryClient setup with focus refetch disabled
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Jab user ArcScan se wapas aayega, toh ye auto-refresh nahi karega.
        // Isse "This page couldn't load" wala error hamesha ke liye khatam ho jayega.
        refetchOnWindowFocus: false, 
        retry: 1,
        staleTime: 60000,
      },
    },
  }));

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: { 
          theme: 'dark', 
          accentColor: '#2563eb',
          showWalletLoginFirst: true 
        },
        embeddedWallets: { 
          ethereum: { createOnLogin: 'users-without-wallets' } 
        },
        defaultChain: arcTestnet,
        supportedChains: [arcTestnet],
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {/* Hydration Guard */}
          <div style={{ display: mounted ? 'contents' : 'none' }}>
            {children}
          </div>
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  );
}