'use client';

import { useState, useEffect, useCallback } from 'react';
import {
ArrowUpRight,
ArrowDownLeft,
RefreshCw,
Loader2,
History,
Clock,
ExternalLink,
ShieldCheck
} from 'lucide-react';

type TxItem = {
hash: string;
amount: string;
isIncoming: boolean;
username?: string;
proof?: string;
timestamp: number;
type?: string;
};

export default function TransactionHistory({
userAddress,
onShowReceipt
}: any) {
const [txs, setTxs] = useState<TxItem[]>([]);
const [loading, setLoading] = useState(false);

const loadData = useCallback(async () => {
if (!userAddress) return;

try {
  setLoading(true);

  const res = await fetch(
    `/api/insights?address=${userAddress.toLowerCase()}`
  );

  const data = await res.json();

  // IMPORTANT:
  // Sirf confirmed transfer records rakho
  const raw = data?.transactions || data?.requests || [];

  const filtered = raw
    .filter((tx: any) => {
      // Request workflow ko hata do
      if (
        tx.type === 'request' ||
        tx.type === 'payment_request' ||
        tx.type === 'pending_request'
      ) {
        return false;
      }

      // Sirf confirmed transfers
      return tx.hash && tx.amount;
    })
    .slice(0, 4)
    .map((tx: any) => ({
      hash: tx.hash,
      amount: tx.amount,
      isIncoming: tx.isIncoming,
      username:
        tx.username ||
        tx.displayUser ||
        (tx.isIncoming ? 'Unknown Sender' : 'Unknown Receiver'),
      proof: tx.proof || tx.hash,
      timestamp: tx.timestamp
    }));

  setTxs(filtered);
} catch (e) {
  console.error('History load error:', e);
} finally {
  setLoading(false);
}

}, [userAddress]);

useEffect(() => {
loadData();

const interval = setInterval(loadData, 30000);

return () => clearInterval(interval);

}, [loadData]);

return (
<div className="bg-white/5 border border-white/5 rounded-[32px] p-6 text-white font-sans leading-none">
{/* Header */}
<div className="flex items-center justify-between mb-6 px-2">
<div>
<h3 className="text-xs font-black uppercase tracking-[0.2em] italic text-slate-400">
Transaction History
</h3>

      <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1">
        Confirmed Blockchain Transfers
      </p>
    </div>

    <button
      onClick={loadData}
      disabled={loading}
      className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-500"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin text-blue-500" />
      ) : (
        <RefreshCw size={14} />
      )}
    </button>
  </div>

  {/* List */}
  <div className="space-y-3">
    {txs.length === 0 && !loading ? (
      <div className="py-10 text-center opacity-20 uppercase font-black text-[9px] flex flex-col items-center gap-3">
        <History size={28} />

        <p>No Confirmed Transfers</p>
      </div>
    ) : (
      txs.map((tx, i) => (
        <div
          key={`${tx.hash}-${i}`}
          className="w-full p-4 bg-white/5 border border-white/5 rounded-[22px] group hover:border-blue-500/40 transition-all"
        >
          <div className="flex items-center justify-between">
            {/* Left */}
            <div className="flex items-center gap-3 text-left">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  tx.isIncoming
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-rose-500/10 text-rose-500'
                }`}
              >
                {tx.isIncoming ? (
                  <ArrowDownLeft size={18} />
                ) : (
                  <ArrowUpRight size={18} />
                )}
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase italic leading-none">
                  {tx.isIncoming
                    ? `Received from ${tx.username}`
                    : `Sent to ${tx.username}`}
                </p>

                <p className="text-[8px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Clock size={8} />

                  {new Date(tx.timestamp * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Amount */}
            <p
              className={`text-[13px] font-black italic ${
                tx.isIncoming ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {tx.isIncoming ? '+' : '-'}
              {tx.amount}

              <span className="text-[9px] opacity-40 uppercase ml-1">
                USDC
              </span>
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
            {/* Proof */}
            <a
              href={`https://testnet.arcscan.app/tx/${tx.proof}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[8px] bg-white/5 px-2 py-1.5 rounded-lg text-blue-400 font-black uppercase hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1 border border-white/5"
            >
              Proof

              <ExternalLink size={8} />
            </a>

            {/* Receipt button */}
            <button
              onClick={() => onShowReceipt?.(tx)}
              className="text-[8px] bg-emerald-500/10 px-2 py-1.5 rounded-lg text-emerald-400 font-black uppercase hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/10 flex items-center gap-1"
            >
              <ShieldCheck size={8} />

              Receipt
            </button>
          </div>
        </div>
      ))
    )}
  </div>
</div>

);
}