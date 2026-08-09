import { createConfig } from 'wagmi'
import { http, fallback } from 'viem'
import { arcTestnet } from './wagmi-chain'

// Stable RPCs
const PRIMARY_RPC =
  process.env.NEXT_PUBLIC_RPC_PRIMARY ||
  'https://rpc.testnet.arc.network'

const THIRDWEB_RPC =
  process.env.NEXT_PUBLIC_RPC_THIRDWEB ||
  'https://5042002.rpc.thirdweb.com'

export const config = createConfig({
  chains: [arcTestnet],

  // Wallet + Privy ke liye stable polling
  pollingInterval: 60_000,

  // Next.js hydration issues kam karta hai
  ssr: true,

  transports: {
    [arcTestnet.id]: fallback(
      [
        // Official Arc RPC
        http(PRIMARY_RPC, {
          timeout: 25_000,
          retryCount: 3,
        }),

        // Thirdweb fallback (best for embedded/email wallets)
        http(THIRDWEB_RPC, {
          timeout: 25_000,
          retryCount: 3,
        }),
      ],
      {
        // Healthy transport ranking
        rank: {
          interval: 60_000,
          sampleCount: 3,
          timeout: 1_000,
        },
        retryCount: 2,
      }
    ),
  },
})