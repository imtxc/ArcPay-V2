'use client';
import { X, ArrowUpRight, ArrowDownLeft, Loader2, FileText, Clock, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

export interface Transaction {
  hash: string;
  from_addr: string;
  to_addr: string;
  amount: string;
  timestamp: number;
  isIncoming: boolean;
  eventName: string;
}

export default function TransactionsModal({ isOpen, onClose, userAddress, onShowReceipt }: any) {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userAddress) return;
    try {
      setLoading(true);
      // Seedha Supabase API se data mangwao (Fast & Reliable)
      const res = await fetch(`/api/insights?address=${userAddress.toLowerCase()}`);
      const data = await res.json();
      
      if (data && data.requests) {
        setTxs(data.requests);
        // Local cache update for Sidebar
        localStorage.setItem(`ap_h_${userAddress.toLowerCase()}`, JSON.stringify(data.requests));
      }
    } catch (e) {
      console.error("Ledger Fetch Error", e);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen, fetchData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 backdrop-blur-3xl bg-black/60 font-sans leading-none">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#0c0e14] border border-white/10 rounded-[44px] shadow-3xl flex flex-col max-h-[85vh] overflow-hidden text-white">
        
        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/20">
          <div className="space-y-2 text-left">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Identity Ledger</h2>
            <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-bold uppercase tracking-widest">
               <ShieldCheck size={12}/> Verified by Supabase Indexer
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchData} className="p-3 bg-blue-600/10 rounded-2xl text-blue-500 border border-blue-500/10 hover:bg-blue-600 hover:text-white transition-all">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:text-rose-500 transition-all border border-white/5"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-4 bg-black/20">
          {loading ? (
            <div className="py-24 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={40} /></div>
          ) : txs.length === 0 ? (
            <div className="py-24 text-center opacity-20 uppercase font-black text-xs italic flex flex-col items-center gap-4">
               <FileText size={48} /> No Data Found
            </div>
          ) : (
            txs.map((tx, i) => (
              <div key={i} onClick={() => onShowReceipt(tx)} className="bg-white/5 border border-white/5 p-6 rounded-[36px] flex justify-between items-center group hover:bg-white/[0.08] cursor-pointer transition-all">
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${tx.isIncoming ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {tx.isIncoming ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                  </div>
                  <div className="text-left space-y-2">
                    <p className="text-base font-black uppercase italic">{tx.isIncoming ? 'Received' : 'Sent'}</p>
                    <div className="flex items-center gap-3">
                       <span className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><Clock size={10} /> {new Date(tx.timestamp * 1000).toLocaleString()}</span>
                       <a href={`https://testnet.arcscan.app/tx/${tx.hash}`} target="_blank" className="text-[8px] bg-white/5 px-2 py-0.5 rounded text-blue-500 font-bold uppercase flex items-center gap-1">Proof <ExternalLink size={8}/></a>
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