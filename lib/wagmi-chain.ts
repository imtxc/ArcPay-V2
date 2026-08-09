import { defineChain } from 'viem';

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  network: 'arc-testnet',

  // Arc uses USDC as the native gas token (18 decimals)
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },

  rpcUrls: {
    default: {
      http: [
        // Recommended RPC for Privy / Email Wallets
        'https://5042002.rpc.thirdweb.com',

        // Official Arc RPC fallback
        'https://rpc.testnet.arc.network',
      ],
    },

    public: {
      http: [
        'https://5042002.rpc.thirdweb.com',
      ],
    },
  },

  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },

  testnet: true,
})