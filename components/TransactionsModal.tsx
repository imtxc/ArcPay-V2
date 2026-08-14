'use client';

import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  FileText,
  Clock,
  ExternalLink,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePublicClient } from 'wagmi';
import { getAddress } from 'viem';
import { REGISTRY_ADDRESS, REGISTRY_ABI } from '@/lib/constants';

export type Transaction = {
  hash: string;
  amount: string;
  timestamp: number;
  from_addr: string;
  to_addr: string;
  isIncoming: boolean;
  username?: string; 
  displayUser?: string; // Resolved name
  proof?: string;
  type?: string;
};

interface TransactionsModalProps {
  isOpen: boolean;
  onClose: () => void | Promise<void>;
  userAddress: string | undefined;
  onShowReceipt: (tx: Transaction) => void | Promise<void>;
}

export default function TransactionsModal({
  isOpen,
  onClose,
  userAddress,
  onShowReceipt
}: TransactionsModalProps) {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  
  const publicClient = usePublicClient();
  const nameCache = useRef<Record<string, string>>({});

  // 1. Logic to resolve username from Blockchain
  const resolveUsername = useCallback(async (address: string) => {
    try {
      const cleanAddr = getAddress(address);
      
      // Check cache first
      if (nameCache.current[cleanAddr]) return nameCache.current[cleanAddr];

      const name = await publicClient?.readContract({
        address: REGISTRY_ADDRESS as `0x${string}`,
        abi: REGISTRY_ABI,
        functionName: 'getUsername',
        args: [cleanAddr]
      }) as string;

      const finalName = name ? `@${name.toUpperCase()}` : `${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)}`;
      nameCache.current[cleanAddr] = finalName;
      return finalName;
    } catch (e) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
  }, [publicClient]);

  // 2. Fetch data and enrich with Usernames
  const fetchData = useCallback(
    async (showLoader = false) => {
      if (!userAddress) return;

      try {
        if (showLoader) setLoading(true);

        const res = await fetch(
          `/api/insights?address=${userAddress.toLowerCase()}&t=${Date.now()}`
        );

        if (!res.ok) throw new Error('Network error');

        const data = await res.json();
        const raw = data?.transactions || [];

        // Filter: Sirf transfers dikhao
        const filtered = raw.filter((tx: any) => tx.type === 'transfer');

        // Resolve names for all other parties
        const enriched = await Promise.all(filtered.map(async (tx: Transaction) => {
          const otherParty = tx.isIncoming ? tx.from_addr : tx.to_addr;
          const resolvedName = await resolveUsername(otherParty);
          return { ...tx, displayUser: resolvedName };
        }));

        setTxs(enriched);
      } catch (e) {
        console.error('Fetch ledger error:', e);
      } finally {
        setLoading(false);
      }
    },
    [userAddress, resolveUsername]
  );

  useEffect(() => {
    if (!isOpen) return;
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 10000);
    return () => clearInterval(interval);
  }, [isOpen, fetchData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 backdrop-blur-3xl bg-black/60 font-sans leading-none text-white">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#0c0e14] border border-white/10 rounded-[44px] shadow-3xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/20">
          <div className="text-left space-y-2">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Transaction Ledger</h2>
            <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em]">
              <ShieldCheck size={12} /> Confirmed On-Chain Transfers
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => fetchData(true)} disabled={loading} className="p-3 bg-blue-600/10 rounded-2xl text-blue-500 border border-blue-500/10 hover:bg-blue-600 hover:text-white transition-all active:scale-90">
              {loading ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
            </button>
            <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:text-rose-500 transition-all border border-white/5">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-4 bg-black/20">
          {loading && txs.length === 0 ? (
            <div className="py-24 text-center">
              <Loader2 className="animate-spin mx-auto text-blue-500" size={48} />
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Syncing with blockchain...</p>
            </div>
          ) : txs.length === 0 ? (
            <div className="py-24 text-center opacity-20 uppercase font-black text-xs italic flex flex-col items-center gap-6">
              <FileText size={64} />
              <p className="tracking-[0.4em]">No Confirmed Transfers Found</p>
            </div>
          ) : (
            txs.map((tx, i) => (
              <div key={`${tx.hash}-${i}`} onClick={() => onShowReceipt(tx)} className="bg-white/5 border border-white/5 p-6 rounded-[36px] flex justify-between items-center group hover:bg-white/[0.08] cursor-pointer transition-all border-t-white/10 shadow-2xl">
                <div className="flex items-center gap-6 flex-1 min-w-0">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner flex-shrink-0 ${tx.isIncoming ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {tx.isIncoming ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                  </div>

                  <div className="text-left space-y-2 overflow-hidden flex-1 min-w-0">
                    <p className="text-base font-black uppercase italic leading-none truncate text-white">
                      {tx.isIncoming ? 'Received from' : 'Sent to'} <span className="text-blue-400">{tx.displayUser}</span>
                    </p>

                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                        <Clock size={10} />
                        {tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : 'Pending...'}
                      </span>
                      <a href={`https://testnet.arcscan.app/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[8px] bg-white/5 px-2 py-1 rounded-lg text-blue-400 font-bold uppercase border border-white/5 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1">
                        Proof <ExternalLink size={8} />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-1 ml-4">
                  <p className={`text-2xl font-black italic leading-none ${tx.isIncoming ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {tx.isIncoming ? '+' : '-'}{tx.amount}
                  </p>
                  <p className="text-[10px] font-bold opacity-20 uppercase tracking-widest">USDC</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-black/40 border-t border-white/5 text-center">
          <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.4em]">Confirmed Ledger Sync Active</p>
        </div>
      </div>
    </div>
  );
}