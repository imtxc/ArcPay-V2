import { defineChain } from 'viem';

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { 
    name: 'USDC', 
    symbol: 'USDC', 
    decimals: 18 
  },
  rpcUrls: {
    default: { 
      http: [
        'https://5042002.rpc.thirdweb.com', // Best for Email Wallets
        'https://rpc.quicknode.testnet.arc.network',
        'https://rpc.drpc.testnet.arc.network',
        'https://rpc.testnet.arc.network'
      ] 
    },
    public: { 
      http: ['https://5042002.rpc.thirdweb.com'] 
    }
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' }
  },
  testnet: true
});