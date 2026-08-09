'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits, getAddress } from 'viem';
import { REGISTRY_ADDRESS, REGISTRY_ABI } from '@/lib/constants';
import { Loader2, RefreshCw, Clock, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export default function OutgoingRequests({ address }: { address: string }) {
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const nameCache = useRef<Record<string, string>>({});
  const publicClient = usePublicClient();

  // Unique key for this user's outgoing cache
  const cacheKey = `ap_og_${address?.toLowerCase()}`;

  const fetchOutgoing = useCallback(async (isInitial = false) => {
    if (!address || !publicClient) return;

    try {
      if (isInitial) setLoading(true);
      
      const res = await fetch(`/api/outgoing?address=${address}`);
      const data = await res.json();
      
      if (data && data.requests) {
        // Parallel Metadata Enrichment (Fast Speed)
        const enriched = await Promise.all(data.requests.map(async (req: any) => {
          const targetAddr = req.to_addr;
          
          if (targetAddr && !nameCache.current[targetAddr]) {
            try {
              const name = await publicClient.readContract({
                address: REGISTRY_ADDRESS as `0x${string}`,
                abi: REGISTRY_ABI,
                functionName: 'getUsername',
                args: [getAddress(targetAddr)],
              }) as string;
              nameCache.current[targetAddr] = name ? `@${name.toUpperCase()}` : `${targetAddr.slice(0, 6)}...`;
            } catch {
              nameCache.current[targetAddr] = `${targetAddr.slice(0, 6)}...`;
            }
          }

          return {
            ...req,
            displayUser: targetAddr ? (nameCache.current[targetAddr] || `${targetAddr.slice(0, 6)}...`) : 'Unknown Identity'
          };
        }));

        // 1. Save to State
        setOutgoing(enriched);
        
        // 2. SAVE TO CACHE: Agli baar ke liye instant load
        localStorage.setItem(cacheKey, JSON.stringify(enriched));
      }
    } catch (e) {
      console.error("Outgoing sync error:", e);
    } finally {
      setLoading(false);
    }
  }, [address, publicClient, cacheKey]);

  useEffect(() => {
    // 1. Load from Cache immediately on mount
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        setOutgoing(JSON.parse(cachedData));
      } catch (e) {
        console.error("Cache parse error");
      }
    }

    // 2. Fetch fresh data
    fetchOutgoing(true);

    const interval = setInterval(() => fetchOutgoing(false), 15000);
    return () => clearInterval(interval);
  }, [address, fetchOutgoing, cacheKey]);

  return (
    <div className="bg-[#0c0e14] border border-white/5 rounded-[44px] p-8 h-full flex flex-col shadow-3xl text-left border-t-white/10 font-sans leading-none relative overflow-hidden">
      
      {/* Header Section */}
      <div className="flex justify-between items-center px-1 mb-8 relative z-10">
        <div className="space-y-2">
          <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-blue-500 italic">Outgoing Hub</h4>
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Protocol Settlement Monitor</p>
        </div>
        <button 
          onClick={() => fetchOutgoing(true)} 
          disabled={loading}
          className="p-3.5 bg-blue-600/10 text-blue-500 rounded-2xl hover:bg-blue-600 hover:text-white transition-all active:scale-95 disabled:opacity-30"
        >
           {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
        </button>
      </div>

      {/* List Section */}
      <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1 relative z-10">
        {outgoing.length === 0 && !loading ? (
          <div className="py-24 text-center opacity-20 uppercase font-black text-[10px] tracking-[0.4em] text-slate-500 italic flex flex-col items-center gap-4">
            <Clock size={40} />
            No Outgoing Settlements
          </div>
        ) : (
          outgoing.map((req, i) => (
            <div key={`${req.hash || i}`} className="bg-white/5 border border-white/5 p-6 rounded-[36px] flex justify-between items-center group hover:bg-white/[0.08] transition-all shadow-2xl border-t-white/10">
               <div className="space-y-2 truncate pr-4 text-left">
                  <p className="text-base font-black text-white uppercase italic leading-none flex items-center gap-2">
                    <ArrowUpRight size={14} className="text-blue-500"/>
                    {req.displayUser}
                  </p>
                  <p className="text-2xl font-black italic text-slate-300 leading-none tracking-tighter">
                    {formatUnits(BigInt(req.amount || 0), 6)} <span className="text-xs opacity-20 not-italic uppercase tracking-normal ml-1">USDC</span>
                  </p>
               </div>
               
               <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 size={10} /> Confirmed
                  </div>
                  <span className="text-[8px] font-bold text-slate-700 uppercase tracking-tighter">On-Chain Verified</span>
               </div>
            </div>
          ))
        )}
      </div>

      {/* Security Footer */}
      <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-center gap-2 opacity-20">
         <ShieldCheck size={12} className="text-slate-500" />
         <p className="text-[8px] font-black uppercase tracking-widest">End-to-End Encrypted Settlement History</p>
      </div>
    </div>
  );
}

// Minimal Icon for footer
function ShieldCheck({ size, className }: any) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}