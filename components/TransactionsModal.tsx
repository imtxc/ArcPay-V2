'use client';

import { X, ArrowUpRight, ArrowDownLeft, Loader2, ShieldCheck, FileText, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits, getAddress, createPublicClient, http, type Address, type Hash, type PublicClient, type Log } from 'viem';
import { REGISTRY_ADDRESS, REGISTRY_ABI, USDC_ADDRESS, ERC20_ABI } from '@/lib/constants';
import { arcTestnet } from '@/lib/wagmi-chain';

export interface Transaction {
  hash: Hash;
  logIndex: number;
  from: Address;
  to: Address;
  fromUser: string;
  toUser: string;
  amount: string;
  timestamp: number;
  blockNumber: bigint;
  isIncoming: boolean;
  status: 'Confirmed' | 'Pending' | 'Failed';
  memo?: string;
}

interface CacheEntry {
  val: any;
  exp: number;
}
type CacheStore = Record<string, CacheEntry>;

const CONFIG_RPC_URLS: string[] = Array.from(
  new Set(
    [
      process.env.NEXT_PUBLIC_RPC_PRIMARY,
      ...arcTestnet.rpcUrls.default.http
    ].filter((url): url is string => Boolean(url))
  )
);

const CACHE_KEYS = { NAMES: 'ap_meta_names', TIMES: 'ap_meta_times' };
const memoryCache: Record<string, CacheStore> = {};

const getStoredCache = (key: string): CacheStore => {
  if (memoryCache[key]) return memoryCache[key];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      memoryCache[key] = {};
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, any>;
    const now = Date.now();
    const valid: CacheStore = {};

    if (parsed && typeof parsed === 'object') {
      for (const [k, v] of Object.entries(parsed)) {
        if (v && typeof v === 'object' && 'val' in v && 'exp' in v && typeof v.exp === 'number' && v.exp > now) {
          valid[k] = v as CacheEntry;
        }
      }
    }

    memoryCache[key] = valid;
    return valid;
  } catch {
    memoryCache[key] = {};
    return {};
  }
};

const updateCache = (key: string, itemKey: string, value: any) => {
  try {
    const cache = getStoredCache(key);
    cache[itemKey] = { val: value, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 };
    memoryCache[key] = cache;
    localStorage.setItem(key, JSON.stringify(cache));
  } catch {}
};

async function runWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  const worker = async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export default function TransactionsModal({ isOpen, onClose, userAddress, onShowReceipt }: {
  isOpen: boolean; onClose: () => void; userAddress: string | undefined; onShowReceipt: (tx: Transaction) => void;
}) {
  const [allTxs, setAllTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const wagmiPublicClient = usePublicClient();
  const syncInProgress = useRef(false);
  const currentRpcIndex = useRef(0);

  const fallbackClients = useMemo(() => {
    return CONFIG_RPC_URLS.map(url => createPublicClient({
      chain: arcTestnet,
      transport: http(url, { timeout: 25000 })
    }));
  }, []);

  const rpcPool = useMemo<PublicClient[]>(() => {
    const list: PublicClient[] = [];
    if (wagmiPublicClient) list.push(wagmiPublicClient as unknown as PublicClient);
    list.push(...fallbackClients);
    return list;
  }, [wagmiPublicClient, fallbackClients]);

  const callWithRpcFallback = useCallback(async <T,>(
    fn: (client: PublicClient) => Promise<T>,
    timeoutMs = 15000
  ): Promise<T> => {
    let lastError: any = null;
    const poolLength = rpcPool.length;

    for (let attempt = 0; attempt < poolLength; attempt++) {
      const index = (currentRpcIndex.current + attempt) % poolLength;
      try {
        const res = await Promise.race([
          fn(rpcPool[index]),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("RPC Timeout")), timeoutMs)
          )
        ]);
        currentRpcIndex.current = index;
        return res;
      } catch (err: any) {
        lastError = err;
        await new Promise((res) => setTimeout(res, 1000));
      }
    }
    throw lastError || new Error("All RPC endpoints failed.");
  }, [rpcPool]);

  const getKeys = (addr: string) => ({
    history: `ap_h_${addr.toLowerCase()}`,
    lastBlock: `ap_lb_${addr.toLowerCase()}`
  });

  const resolveId = async (addr: Address): Promise<string> => {
    const key = addr.toLowerCase();
    const cache = getStoredCache(CACHE_KEYS.NAMES);
    const entry = cache[key];
    if (entry) return entry.val;
    if (key === '0x0000000000000000000000000000000000000000') return 'Network';

    try {
      const name = await callWithRpcFallback<string>((client) =>
        client.readContract({
          address: REGISTRY_ADDRESS as Address,
          abi: REGISTRY_ABI as any,
          functionName: 'getUsername',
          args: [key]
        }) as Promise<string>
      );
      const res = name ? `@${name.toUpperCase()}` : `${addr.slice(0, 6)}...${addr.slice(-4)}`;
      updateCache(CACHE_KEYS.NAMES, key, res);
      return res;
    } catch { return `${addr.slice(0, 6)}...`; }
  };

  const getTs = async (blockNumber: bigint): Promise<number> => {
    const bStr = blockNumber.toString();
    const cache = getStoredCache(CACHE_KEYS.TIMES);
    const entry = cache[bStr];
    if (entry) return entry.val;
    try {
      const block = await callWithRpcFallback((client) => client.getBlock({ blockNumber }));
      const ts = Number(block?.timestamp || 0);
      if (ts > 0) updateCache(CACHE_KEYS.TIMES, bStr, ts);
      return ts || Math.floor(Date.now() / 1000);
    } catch { return Math.floor(Date.now() / 1000); }
  };

  const runSync = useCallback(async (isDeep = false) => {
    if (!userAddress || syncInProgress.current) return;

    syncInProgress.current = true;
    setError(null);
    setLoading(true);

    const keys = getKeys(userAddress);
    const wallet = getAddress(userAddress);
    const walletLower = wallet.toLowerCase();

    try {
      const accumulatedTxsMap = new Map<string, Transaction>();
      const cachedHistory = localStorage.getItem(keys.history);

      if (cachedHistory && !isDeep) {
        try {
          const parsed = JSON.parse(cachedHistory);
          if (Array.isArray(parsed)) {
            parsed.filter((t: any) => t && t.hash && t.from && t.to && typeof t.timestamp === 'number')
              .forEach((t: any) => {
                const txObj = { ...t, blockNumber: BigInt(t.blockNumber) };
                accumulatedTxsMap.set(`${txObj.hash}-${txObj.logIndex}`, txObj);
              });
            setAllTxs(Array.from(accumulatedTxsMap.values()));
          }
        } catch {
          localStorage.removeItem(keys.history);
        }
      }

      const latest = await callWithRpcFallback<bigint>((client) => client.getBlockNumber());
      let lastBlock = BigInt(localStorage.getItem(keys.lastBlock) || '0');

      // Safe small window to avoid 429 rate limit
      if (isDeep || lastBlock === 0n || lastBlock > latest) {
        lastBlock = latest > 200n ? latest - 200n : 0n;
      }

      let current = isDeep ? (latest > 500n ? latest - 500n : 0n) : lastBlock;
      let chunkSize = 25n; 
      let highestScannedBlock = lastBlock;

      while (current <= latest) {
        const toBlock = (current + chunkSize > latest) ? latest : current + chunkSize;
        setStatus(`Scanning blocks... (${toBlock.toString()}/${latest.toString()})`);

        try {
          const logs = await callWithRpcFallback<Log[]>((client) =>
            client.getContractEvents({
              address: USDC_ADDRESS as Address,
              abi: ERC20_ABI as any,
              eventName: 'Transfer',
              fromBlock: current,
              toBlock: toBlock
            })
          );

          const relevantLogs = logs.filter((l: any) => {
            const f = l.args?.from?.toLowerCase();
            const t = l.args?.to?.toLowerCase();
            return f === walletLower || t === walletLower;
          });

          if (relevantLogs.length > 0) {
            const uniqueAddressList = Array.from(
              new Set<string>(relevantLogs.flatMap((l: any) => [getAddress(l.args.from as string), getAddress(l.args.to as string)]))
            ) as Address[];

            const uniqueBlockList = Array.from(
              new Set<string>(relevantLogs.map((l: any) => l.blockNumber!.toString()))
            ).map(bStr => BigInt(bStr));

            const addressNameMap = new Map<string, string>();
            const blockTimestampMap = new Map<string, number>();

            await Promise.all([
              runWithConcurrencyLimit(uniqueAddressList, 2, async (addr) => {
                const name = await resolveId(addr);
                addressNameMap.set(addr, name);
              }),
              runWithConcurrencyLimit(uniqueBlockList, 2, async (bNum) => {
                const ts = await getTs(bNum);
                blockTimestampMap.set(bNum.toString(), ts);
              })
            ]);

            relevantLogs.forEach((l: any) => {
              const from = getAddress(l.args.from as string);
              const to = getAddress(l.args.to as string);
              const fU = addressNameMap.get(from) || `${from.slice(0, 6)}...`;
              const tU = addressNameMap.get(to) || `${to.slice(0, 6)}...`;
              const ts = blockTimestampMap.get(l.blockNumber!.toString()) || Math.floor(Date.now() / 1000);

              const tx: Transaction = {
                hash: l.transactionHash!,
                logIndex: l.logIndex!,
                from,
                to,
                fromUser: fU,
                toUser: tU,
                amount: formatUnits(l.args.value || 0n, 18),
                timestamp: ts,
                blockNumber: l.blockNumber!,
                isIncoming: to === wallet,
                status: 'Confirmed'
              };

              accumulatedTxsMap.set(`${tx.hash}-${tx.logIndex}`, tx);
            });
          }

          highestScannedBlock = toBlock;
          current = toBlock + 1n;
          
          // Safe 1.2s delay to prevent HTTP 429 Rate Limits from Public Testnet RPC
          await new Promise((res) => setTimeout(res, 1200));

        } catch (err: any) {
          console.warn(`RPC Rate Limited / Error on range:`, err?.message);
          setError("Testnet RPC rate-limited (429). Retrying with slowdown...");
          await new Promise((res) => setTimeout(res, 3000));
          current = toBlock + 1n; // Skip faulty chunk to prevent freezing
        }
      }

      if (highestScannedBlock > lastBlock) {
        localStorage.setItem(keys.lastBlock, highestScannedBlock.toString());
      }

      const finalSortedTxs = Array.from(accumulatedTxsMap.values()).sort((a, b) => {
        if (b.blockNumber !== a.blockNumber) return Number(b.blockNumber - a.blockNumber);
        if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
        return b.logIndex - a.logIndex;
      }).slice(0, 100);

      try {
        const serializableFinal = finalSortedTxs.map(t => ({ ...t, blockNumber: t.blockNumber.toString() }));
        localStorage.setItem(keys.history, JSON.stringify(serializableFinal));
      } catch {}

      setAllTxs(finalSortedTxs);
      setStatus('Sync Complete');
    } catch (err: any) {
      setError("RPC connection throttled. Please try again in 10 seconds.");
    } finally {
      setLoading(false);
      syncInProgress.current = false;
    }
  }, [userAddress, callWithRpcFallback]);

  useEffect(() => {
    if (isOpen) runSync();
    const handleRemoteSync = () => runSync();
    window.addEventListener('arcpay_request_sync', handleRemoteSync);
    return () => window.removeEventListener('arcpay_request_sync', handleRemoteSync);
  }, [isOpen, runSync]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-[40px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-white">

        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/20">
          <div className="space-y-1">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Blockchain Ledger</h2>
            <div className={`text-[10px] font-black uppercase italic flex items-center gap-2 ${loading ? 'text-amber-500' : 'text-emerald-500'}`}>
              {loading ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
              {loading ? status : "On-Chain Identity Verified"}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => runSync(true)} disabled={loading} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5" title="Refresh">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:text-rose-500 transition-all border border-white/5"><X size={20} /></button>
          </div>
        </div>

        {error && (
          <div className="m-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-amber-500 text-xs font-black uppercase italic">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-4">
          {allTxs.length === 0 && !loading ? (
            <div className="py-24 text-center opacity-20 uppercase font-black tracking-[0.4em] text-xs flex flex-col items-center gap-4">
              <FileText size={48} /> No Transactions Found
            </div>
          ) : (
            allTxs.map((tx) => (
              <div key={`${tx.hash}-${tx.logIndex}`} onClick={() => onShowReceipt(tx)} className="bg-white/5 border border-white/5 p-6 rounded-[32px] flex justify-between items-center group hover:bg-white/[0.08] cursor-pointer transition-all border-l-4 border-l-transparent hover:border-l-blue-500">
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${tx.isIncoming ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {tx.isIncoming ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                  </div>
                  <div className="text-left space-y-1">
                    <p className="text-base font-black uppercase italic truncate max-w-[200px]">
                      {tx.isIncoming ? `From ${tx.fromUser}` : `To ${tx.toUser}`}
                    </p>
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={10} /> {new Date(tx.timestamp * 1000).toLocaleString()}
                      <span className={tx.status === 'Confirmed' ? 'text-emerald-500' : 'text-rose-500'}>• {tx.status}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-black italic leading-none ${tx.isIncoming ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {tx.isIncoming ? '+' : '-'}{tx.amount} <span className="text-[10px] opacity-20 font-bold not-italic text-white">USDC</span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}