'use client';
import { X, ArrowUpRight, ArrowDownLeft, Loader2, FileText, Clock, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getAddress } from 'viem';
import { usePublicClient } from 'wagmi';
import { REGISTRY_ADDRESS, REGISTRY_ABI } from '@/lib/constants';

export default function TransactionsModal({ isOpen, onClose, userAddress, onShowReceipt }: any) {
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const nameCache = useRef<Record<string, string>>({});
  const publicClient = usePublicClient();

  const resolveNames = async (data: any[]) => {
    if (!publicClient) return data;
    
    return await Promise.all(data.map(async (tx) => {
      const target = tx.isIncoming ? tx.from_addr : tx.to_addr;
      const cleanAddr = getAddress(target);

      if (nameCache.current[cleanAddr]) {
        return { ...tx, displayUser: nameCache.current[cleanAddr] };
      }

      try {
        const name = await publicClient.readContract({
          address: REGISTRY_ADDRESS as `0x${string}`,
          abi: REGISTRY_ABI,
          functionName: 'getUsername',
          args: [cleanAddr],
        }) as string;
        
        const finalName = name ? `@${name.toUpperCase()}` : `${cleanAddr.slice(0, 6)}...`;
        nameCache.current[cleanAddr] = finalName;
        return { ...tx, displayUser: finalName };
      } catch {
        return { ...tx, displayUser: `${cleanAddr.slice(0, 6)}...` };
      }
    }));
  };

  const fetchData = useCallback(async () => {
    if (!userAddress) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/insights?address=${userAddress.toLowerCase()}`);
      const data = await res.json();
      
      if (data && data.requests) {
        const enrichedTxs = await resolveNames(data.requests);
        setTxs(enrichedTxs);
      }
    } catch (e) {
      console.error("Fetch Error");
    } finally {
      setLoading(false);
    }
  }, [userAddress, publicClient]);

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen, fetchData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 backdrop-blur-3xl bg-black/60 font-sans leading-none">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#0c0e14] border border-white/10 rounded-[44px] shadow-3xl flex flex-col max-h-[85vh] overflow-hidden text-white">
        
        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/20">
          <div className="text-left">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Identity Ledger</h2>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
               <ShieldCheck size={12}/> Verified Activity
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchData} className="p-3 bg-blue-600/10 rounded-2xl text-blue-500 border border-blue-500/10 hover:bg-blue-600 hover:text-white transition-all">
              {loading ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
            </button>
            <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:text-rose-500 transition-all border border-white/5"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-4 bg-black/20">
          {loading && txs.length === 0 ? (
            <div className="py-24 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={40} /></div>
          ) : txs.length === 0 ? (
            <div className="py-24 text-center opacity-20 uppercase font-black text-xs italic flex flex-col items-center gap-4">
               <FileText size={48} /> Empty Ledger
            </div>
          ) : (
            txs.map((tx, i) => (
              <div key={i} onClick={() => onShowReceipt(tx)} className="bg-white/5 border border-white/5 p-6 rounded-[36px] flex justify-between items-center group hover:bg-white/[0.08] cursor-pointer transition-all">
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${tx.isIncoming ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {tx.isIncoming ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                  </div>
                  <div className="text-left space-y-2">
                    <p className="text-base font-black uppercase italic leading-none">{tx.displayUser || 'Resolving...'}</p>
                    <div className="flex items-center gap-3">
                       <span className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><Clock size={10} /> {new Date(tx.timestamp * 1000).toLocaleTimeString()}</span>
                       <a href={`https://testnet.arcscan.app/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[8px] bg-white/5 px-2 py-1 rounded text-blue-500 font-bold uppercase flex items-center gap-1 hover:bg-blue-600 hover:text-white transition-all">Proof <ExternalLink size={8}/></a>
                    </div>
                  </div>
                </div>
                <p className={`text-2xl font-black italic ${tx.isIncoming ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {tx.isIncoming ? '+' : '-'}{tx.amount} <span className="text-[10px] opacity-20 font-bold">USDC</span>
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}