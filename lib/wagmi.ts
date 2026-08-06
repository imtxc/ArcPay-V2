import { createConfig } from 'wagmi';
import { http, fallback } from 'viem';
import { arcTestnet } from './wagmi-chain';

export const config = createConfig({
  chains: [arcTestnet],
  pollingInterval: 60000,
  transports: {
    [arcTestnet.id]: fallback([
      http(process.env.NEXT_PUBLIC_RPC_PRIMARY, { timeout: 25000 }),
      http(process.env.NEXT_PUBLIC_RPC_THIRDWEB, { timeout: 25000 }),
      http(process.env.NEXT_PUBLIC_RPC_DRPC, { timeout: 25000 }),
    ], {
      rank: { interval: 60000 }, 
      retryCount: 5
    }),
  },
});