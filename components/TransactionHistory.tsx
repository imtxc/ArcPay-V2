'use client';
import { useState, useEffect, useCallback } from 'react';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Loader2, History, Clock } from 'lucide-react';

export default function TransactionHistory({ userAddress, onShowReceipt }: any) {
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!userAddress) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/insights?address=${userAddress.toLowerCase()}`);
      const data = await res.json();
      if (data && data.requests) {
        setTxs(data.requests.slice(0, 4)); // Only show top 4
      }
    } catch (e) {
      console.error("History Load Error");
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    loadData();
    // Auto sync har 30 second mein
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div className="bg-white/5 border border-white/5 rounded-[32px] p-6 text-white font-sans leading-none">
      <div className="flex items-center justify-between mb-6 px-2">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] italic text-slate-400">Recent Activity</h3>
        <button onClick={loadData} disabled={loading} className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-500">
          {loading ? <Loader2 size={14} className="animate-spin text-blue-500" /> : <RefreshCw size={14} />}
        </button>
      </div>

      <div className="space-y-3">
        {txs.length === 0 && !loading ? (
          <div className="py-10 text-center opacity-20 uppercase font-black text-[9px] flex flex-col items-center gap-2">
            <History size={24} /> No Activity Found
          </div>
        ) : (
          txs.map((tx, i) => (
            <button 
              key={i} 
              onClick={() => onShowReceipt(tx)} 
              className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-[22px] group hover:border-blue-500/40 transition-all"
            >
              <div className="flex items-center gap-3 text-left">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  tx.isIncoming ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                }`}>
                  {tx.isIncoming ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase italic leading-none">{tx.isIncoming ? 'Incoming' : 'Outgoing'}</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 flex items-center gap-1">
                    <Clock size={8} /> {new Date(tx.timestamp * 1000).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p className={`text-[13px] font-black italic ${tx.isIncoming ? 'text-emerald-500' : 'text-rose-500'}`}>
                {tx.isIncoming ? '+' : '-'}{tx.amount}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}