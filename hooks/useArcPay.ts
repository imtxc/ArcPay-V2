'use client';
import { useReadContracts } from 'wagmi';
import { REGISTRY_ADDRESS, REGISTRY_ABI, USDC_ADDRESS, ERC20_ABI } from '@/lib/constants';
import { formatUnits } from 'viem';
import { useMemo } from 'react';

export function useArcPay(address: string | undefined) {
  const cleanAddr = address?.toLowerCase() as `0x${string}`;

  // BATCH CALL: Relying on Wagmi's internal address-sensitive cache
  const { data, refetch, isLoading } = useReadContracts({
    contracts: [
      { 
        address: USDC_ADDRESS as `0x${string}`, 
        abi: ERC20_ABI, 
        functionName: 'balanceOf', 
        args: [cleanAddr] 
      },
      { 
        address: REGISTRY_ADDRESS as `0x${string}`, 
        abi: REGISTRY_ABI, 
        functionName: 'getUsername', 
        args: [cleanAddr] 
      }
    ],
    query: {
      enabled: !!cleanAddr,
      staleTime: 5000, // 5 seconds fresh data
    }
  });

  // REACTIVE FORMATTING: Data badalte hi balance automatically update hoga
  const usdcBalance = useMemo(() => {
    if (!data || !data[0]?.result) return '0.00';
    try {
      return parseFloat(formatUnits(data[0].result as bigint, 6)).toFixed(2);
    } catch {
      return '0.00';
    }
  }, [data]);

  // REACTIVE USERNAME: Address change hote hi purana username gayab ho jayega
  const username = useMemo(() => {
    if (!data || !data[1]?.result) return null;
    const result = data[1].result as string;
    return result && result.length > 0 ? result : null;
  }, [data]);

  return { 
    usdcBalance, 
    username,
    isLoading,
    refetch: () => refetch()
  };
}