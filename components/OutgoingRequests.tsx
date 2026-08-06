'use client';
import { useState, useEffect, useRef } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { REGISTRY_ADDRESS, REGISTRY_ABI } from '@/lib/constants';
import { Loader2, RefreshCw, Clock } from 'lucide-react';

export default function OutgoingRequests({ address }: { address: string }) {
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const nameCache = useRef<Record<string, string>>({});
  const publicClient = usePublicClient();

  const fetchOutgoing = async () => {
    try {
      if (!address) return;
      setLoading(true);
      const res = await fetch(`/api/outgoing?address=${address}`);
      const data = await res.json();
      
      if (data && data.requests && publicClient) {
        const enriched = await Promise.all(data.requests.map(async (req: any) => {
          const targetAddr = req.to_addr;
          if (targetAddr && !nameCache.current[targetAddr]) {
            try {
              const name = await publicClient.readContract({
                address: REGISTRY_ADDRESS as `0x${string}`,
                abi: REGISTRY_ABI,
                functionName: 'getUsername',
                args: [targetAddr],
              }) as string;
              nameCache.current[targetAddr] = name ? `@${name.toUpperCase()}` : `${targetAddr.slice(0, 6)}...${targetAddr.slice(-4)}`;
            } catch {
              nameCache.current[targetAddr] = `${targetAddr.slice(0, 6)}...${targetAddr.slice(-4)}`;
            }
          }
          return {
            ...req,
            displayUser: targetAddr ? (nameCache.current[targetAddr] || `${targetAddr.slice(0, 6)}...${targetAddr.slice(-4)}`) : 'Unknown'
          };
        }));
        setOutgoing(enriched);
      }
    } catch (e) {
      console.error("Failed to fetch outgoing requests:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchOutgoing();
    const interval = setInterval(fetchOutgoing, 10000);
    return () => clearInterval(interval);
  }, [address, publicClient]);

  return (
    <div className="bg-[#0c0e14] border border-white/5 rounded-[44px] p-8 h-full flex flex-col shadow-3xl text-left border-t-white/10 font-sans">
      <div className="flex justify-between items-center px-1 mb-8">
        <div>
          <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Outgoing Invoices</h4>
          <p className="text-[8px] font-bold text-slate-700 uppercase mt-1">Real-time Sent Status</p>
        </div>
        <button onClick={fetchOutgoing} className="p-3 bg-blue-600/10 text-blue-500 rounded-2xl hover:bg-blue-600/20 transition-all active:scale-95">
           {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
        {outgoing.length === 0 && !loading ? (
          <div className="py-20 text-center opacity-20 uppercase font-black text-[10px] tracking-widest text-slate-600">No Sent Requests</div>
        ) : (
          outgoing.map((req, i) => (
            <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-[32px] flex justify-between items-center group hover:bg-white/[0.08] transition-all shadow-xl">
               <div className="space-y-1 truncate pr-4 text-left">
                  <p className="text-[14px] font-black text-slate-200 uppercase italic leading-none">{req.displayUser}</p>
                  <p className="text-xl font-black italic text-slate-400 leading-none mt-2">
                    {formatUnits(BigInt(req.amount || 0), 6)} <span className="text-[10px] opacity-40 not-italic uppercase">USDC</span>
                  </p>
               </div>
               <div className="px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 shrink-0 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  PAID
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
