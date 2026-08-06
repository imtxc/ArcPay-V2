'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Loader2, History, Clock } from 'lucide-react';
import { type Transaction } from './TransactionsModal';

export default function TransactionHistory({ 
  userAddress, 
  onShowReceipt 
}: { 
  userAddress: string | undefined; 
  onShowReceipt: (tx: Transaction) => void; 
}) {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [syncing, setSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Local Storage Loader with Safe BigInt & JSON Handling ---
  const loadLocal = useCallback(() => {
    if (!userAddress) {
      setTxs([]);
      return;
    }
    const key = `ap_h_${userAddress.toLowerCase()}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        setTxs([]);
        return;
      }
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        const formatted: Transaction[] = data
          .filter(t => t && t.hash)
          .map(t => ({
            ...t,
            // Safely handle blockNumber whether it's stored as string, number, or missing
            blockNumber: t.blockNumber !== undefined && t.blockNumber !== null 
              ? BigInt(t.blockNumber) 
              : 0n
          }));
        setTxs(formatted.slice(0, 4));
      } else {
        setTxs([]);
      }
    } catch {
      setTxs([]);
    }
  }, [userAddress]);

  // --- Sync Request Handler with Safety Timeout ---
  const handleSync = () => {
    if (syncing) return;
    setSyncing(true);

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      setSyncing(false);
    }, 12000);

    window.dispatchEvent(new CustomEvent('arcpay_request_sync'));
  };

  useEffect(() => {
    loadLocal();

    const onDone = (e: Event) => {
      const customEvent = e as CustomEvent<{ wallet?: string }>;
      if (customEvent.detail?.wallet === userAddress?.toLowerCase()) {
        loadLocal();
        setSyncing(false);
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      }
    };

    window.addEventListener('ap_sync_done', onDone);
    window.addEventListener('storage', loadLocal);

    return () => {
      window.removeEventListener('ap_sync_done', onDone);
      window.removeEventListener('storage', loadLocal);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [userAddress, loadLocal]);

  return (
    <div className="bg-white/5 border border-white/5 rounded-[32px] p-6 text-white">
      <div className="flex items-center justify-between mb-6 px-2">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] italic text-slate-400">
          Recent Activity
        </h3>
        <button 
          onClick={handleSync} 
          disabled={syncing || !userAddress} 
          className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-500 disabled:opacity-30"
          title="Refresh History"
        >
          {syncing ? (
            <Loader2 size={14} className="animate-spin text-blue-500" />
          ) : (
            <RefreshCw size={14} />
          )}
        </button>
      </div>

      <div className="space-y-3">
        {txs.length === 0 ? (
          <div className="py-10 text-center opacity-20 uppercase font-black text-[9px] flex flex-col items-center gap-2">
            <History size={24} /> 
            {syncing ? "Syncing Blockchain..." : "No Activity Found"}
          </div>
        ) : (
          txs.map((tx) => {
            const isInc = tx.isIncoming;
            return (
              <button 
                key={`${tx.hash}-${tx.logIndex || 0}`} 
                onClick={() => onShowReceipt(tx)} 
                className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-[22px] group hover:border-blue-500/40 hover:bg-white/[0.08] transition-all text-white"
              >
                <div className="flex items-center gap-3 text-left overflow-hidden">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                    isInc ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    {isInc ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[11px] font-black uppercase italic leading-none truncate max-w-[140px]">
                      {isInc ? `From ${tx.fromUser || 'Unknown'}` : `To ${tx.toUser || 'Unknown'}`}
                    </p>
                    <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 flex items-center gap-1">
                      <Clock size={8} /> 
                      {tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleDateString() : 'Recent'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-[13px] font-black italic ${isInc ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isInc ? '+' : '-'}{tx.amount} <span className="text-[9px] opacity-40 font-normal">USDC</span>
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}