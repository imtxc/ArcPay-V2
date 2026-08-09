'use client';

import { X, ArrowUpRight, ArrowDownLeft, Loader2, ShieldCheck, FileText, Clock, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits, getAddress, createPublicClient, http, type Address, type Hash, type PublicClient } from 'viem';
import { REGISTRY_ADDRESS, REGISTRY_ABI, USDC_ADDRESS, ERC20_ABI } from '@/lib/constants';
import { arcTestnet } from '@/lib/wagmi-chain';

export interface Transaction {
  hash: Hash; logIndex: number; from: Address; to: Address; fromUser: string; toUser: string;
  amount: string; timestamp: number; blockNumber: bigint; isIncoming: boolean; status: 'Confirmed';
}

interface TransactionsModalProps {
  isOpen: boolean;
  onClose: () => void | Promise<void>;
  userAddress: string | undefined;
  onShowReceipt: (tx: Transaction) => void | Promise<void>;
}

const CHUNK_SIZE = 10000n; // Much larger chunks for faster scanning

export default function TransactionsModal({ isOpen, onClose, userAddress, onShowReceipt }: TransactionsModalProps) {
  const [allTxs, setAllTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const wagmiPublicClient = usePublicClient();
  const syncInProgress = useRef(false);
  const currentRpcIndex = useRef(0);

  const rpcPool = useMemo(() => {
    const urls = [
      process.env.NEXT_PUBLIC_RPC_PRIMARY,
      'https://rpc.testnet.arc.network',
      'https://rpc.drpc.testnet.arc.network',
      'https://5042002.rpc.thirdweb.com'
    ].filter(Boolean) as string[];
    const clients = urls.map(url => createPublicClient({ chain: arcTestnet, transport: http(url, { timeout: 10000 }) }));
    if (wagmiPublicClient) clients.unshift(wagmiPublicClient as any);
    return clients;
  }, [wagmiPublicClient]);

  const callWithRpc = useCallback(async <T,>(fn: (c: PublicClient) => Promise<T>): Promise<T> => {
    let lastErr;
    for (let i = 0; i < rpcPool.length; i++) {
      const idx = (currentRpcIndex.current + i) % rpcPool.length;
      try {
        return await fn(rpcPool[idx] as any);
      } catch (e) { lastErr = e; }
    }
    throw lastErr;
  }, [rpcPool]);

  // Fast resolving with memory cache
  const nameCache = useRef<Record<string, string>>({});
  const timeCache = useRef<Record<string, number>>({});

  const runSync = useCallback(async (isDeep = false) => {
    if (!userAddress || syncInProgress.current) return;
    syncInProgress.current = true;
    setLoading(true);
    setError(null);

    const walletLower = userAddress.toLowerCase();
    const historyKey = `ap_h_${walletLower}`;
    const blockKey = `ap_lb_${walletLower}`;

    try {
      const accumulatedTxsMap = new Map<string, Transaction>();
      
      const cached = localStorage.getItem(historyKey);
      if (cached) {
        try {
          JSON.parse(cached).forEach((t: any) => accumulatedTxsMap.set(`${t.hash}-${t.logIndex}`, { ...t, blockNumber: BigInt(t.blockNumber) }));
          setAllTxs(Array.from(accumulatedTxsMap.values()).sort((a,b) => Number(b.blockNumber - a.blockNumber)));
        } catch (e) { localStorage.removeItem(historyKey); }
      }

      const latest = await callWithRpc(c => c.getBlockNumber());
      let current = BigInt(localStorage.getItem(blockKey) || '0');
      
      // Optimization: Only scan last 3000 blocks for instant results if no history
      if (current === 0n || isDeep) current = latest > 3000n ? latest - 3000n : 0n;

      while (current <= latest) {
        const toBlock = (current + CHUNK_SIZE > latest) ? latest : current + CHUNK_SIZE;
        setStatus(`SCANNING: ${toBlock.toString()} / ${latest.toString()}`);

        const logs = await callWithRpc(c => c.getContractEvents({
          address: USDC_ADDRESS as Address, abi: ERC20_ABI as any, eventName: 'Transfer', fromBlock: current, toBlock: toBlock
        }));

        const relevant = logs.filter((l: any) => l.args.from?.toLowerCase() === walletLower || l.args.to?.toLowerCase() === walletLower);

        if (relevant.length > 0) {
          // Process all found logs in parallel to save time
          await Promise.all(relevant.map(async (l: any) => {
            const from = getAddress(l.args.from);
            const to = getAddress(l.args.to);
            const bNum = l.blockNumber.toString();

            // Fetch block timestamp once per unique block
            if (!timeCache.current[bNum]) {
               const block = await callWithRpc(c => c.getBlock({ blockNumber: l.blockNumber }));
               timeCache.current[bNum] = Number(block.timestamp);
            }

            // Resolve usernames
            const getU = async (addr: string) => {
              if (nameCache.current[addr]) return nameCache.current[addr];
              try {
                const n = await callWithRpc(c => c.readContract({ address: REGISTRY_ADDRESS as Address, abi: REGISTRY_ABI as any, functionName: 'getUsername', args: [addr] })) as string;
                return nameCache.current[addr] = n ? `@${n.toUpperCase()}` : `${addr.slice(0,6)}...`;
              } catch { return `${addr.slice(0,6)}...`; }
            };

            const [fUser, tUser] = await Promise.all([getU(from), getU(to)]);

            accumulatedTxsMap.set(`${l.transactionHash}-${l.logIndex}`, {
              hash: l.transactionHash!, logIndex: l.logIndex!, from, to, fromUser: fUser, toUser: tUser,
              amount: formatUnits(l.args.value || 0n, 6), timestamp: timeCache.current[bNum], blockNumber: l.blockNumber!,
              isIncoming: to.toLowerCase() === walletLower, status: 'Confirmed'
            });
          }));
        }

        current = toBlock + 1n;
        if (toBlock >= latest) break;
      }

      const finalSorted = Array.from(accumulatedTxsMap.values()).sort((a,b) => Number(b.blockNumber - a.blockNumber)).slice(0, 50);
      localStorage.setItem(blockKey, latest.toString());
      localStorage.setItem(historyKey, JSON.stringify(finalSorted.map(t => ({ ...t, blockNumber: t.blockNumber.toString() }))));
      setAllTxs(finalSorted);
      setStatus('Success');
    } catch (e: any) {
      setError("Network Lag - Using Cached History");
    } finally {
      setLoading(false);
      syncInProgress.current = false;
    }
  }, [userAddress, callWithRpc]);

  useEffect(() => { if (isOpen) runSync(); }, [isOpen, runSync]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 backdrop-blur-3xl bg-black/60 font-sans leading-none">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#0c0e14] border border-white/10 rounded-[44px] shadow-3xl flex flex-col max-h-[85vh] overflow-hidden text-white">
        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/20">
          <div className="space-y-2">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">On-Chain History</h2>
            <div className={`text-[10px] font-black uppercase italic flex items-center gap-2 ${loading ? 'text-blue-500' : 'text-emerald-500'}`}>
              {loading ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
              {loading ? status : "History Verified"}
            </div>
          </div>
          <div className="flex gap-3">
             <button onClick={() => runSync(true)} disabled={loading} className="p-3 bg-blue-600/10 rounded-2xl text-blue-500 hover:bg-blue-600 hover:text-white transition-all"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
             <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:text-rose-500 transition-all border border-white/5"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-4 bg-black/20">
          {allTxs.length === 0 && !loading ? (
             <div className="py-24 text-center opacity-20 uppercase font-black text-xs italic tracking-widest"><FileText size={48} className="mx-auto mb-4" /> No Settlements Found</div>
          ) : (
            allTxs.map((tx) => {
              const isSent = tx.from.toLowerCase() === userAddress?.toLowerCase();
              return (
                <div key={`${tx.hash}-${tx.logIndex}`} onClick={() => onShowReceipt(tx)} className="bg-white/5 border border-white/5 p-6 rounded-[36px] flex justify-between items-center group hover:bg-white/[0.08] cursor-pointer transition-all">
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${!isSent ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {!isSent ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                    </div>
                    <div className="text-left space-y-2">
                      <p className="text-base font-black uppercase italic truncate max-w-[220px]">{!isSent ? `From ${tx.fromUser}` : `To ${tx.toUser}`}</p>
                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-2"><Clock size={10} /> {new Date(tx.timestamp * 1000).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <p className={`text-2xl font-black italic ${!isSent ? 'text-emerald-500' : 'text-rose-500'}`}>{!isSent ? '+' : '-'}{tx.amount}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}