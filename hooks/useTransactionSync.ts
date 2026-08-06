import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits, getAddress, createPublicClient, http, type Address, type Hash, type PublicClient, type Log } from 'viem';
import { REGISTRY_ADDRESS, REGISTRY_ABI, USDC_ADDRESS, ERC20_ABI } from '@/lib/constants';
import { CACHE_KEYS, getStoredCache, updateCache } from '@/lib/cache';
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

interface TransferLogArgs {
  from?: Address;
  to?: Address;
  value?: bigint;
}

interface CustomLog extends Log {
  args: TransferLogArgs;
}

const CONFIG_RPC_URLS: string[] = Array.from(
  new Set(
    [
      process.env.NEXT_PUBLIC_RPC_PRIMARY,
      ...arcTestnet.rpcUrls.default.http,
    ].filter((url): url is string => Boolean(url))
  )
);

const fallbackClients: PublicClient[] = CONFIG_RPC_URLS.map((url) =>
  createPublicClient({
    chain: arcTestnet,
    transport: http(url, { timeout: 12000 }),
  })
);

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

export function useTransactionSync(userAddress: string | undefined, isOpen: boolean) {
  const [allTxs, setAllTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const wagmiPublicClient = usePublicClient();
  const syncInProgress = useRef(false);
  const currentRpcIndex = useRef(0);

  const rpcPool = useMemo<PublicClient[]>(() => {
    const list: PublicClient[] = [];
    if (wagmiPublicClient) list.push(wagmiPublicClient as unknown as PublicClient);
    list.push(...fallbackClients);
    return list;
  }, [wagmiPublicClient]);

  const runCall = useCallback(
    async <T,>(fn: (client: PublicClient) => Promise<T>, timeoutMs = 12000): Promise<T> => {
      let lastError: Error | null = null;
      const poolLength = rpcPool.length;

      for (let attempt = 0; attempt < poolLength; attempt++) {
        const index = (currentRpcIndex.current + attempt) % poolLength;
        try {
          const res = await Promise.race([
            fn(rpcPool[index]),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('RPC Timeout')), timeoutMs)
            ),
          ]);
          currentRpcIndex.current = index;
          return res;
        } catch (err: unknown) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.warn(
            `[RPC Failover] Client ${index + 1}/${poolLength} failed. Rotating... Reason:`,
            lastError.message
          );
        }
      }
      throw lastError || new Error('All RPC endpoints failed.');
    },
    [rpcPool]
  );

  const resolveId = async (addr: Address): Promise<string> => {
    const key = addr.toLowerCase();
    const cache = getStoredCache<string>(CACHE_KEYS.NAMES);
    if (cache[key]) return cache[key].val;
    if (key === '0x0000000000000000000000000000000000000000') return 'Network';

    try {
      const name = (await runCall((client) =>
        client.readContract({
          address: REGISTRY_ADDRESS as Address,
          abi: REGISTRY_ABI as any,
          functionName: 'getUsername',
          args: [key],
        })
      )) as string;

      const res = name ? `@${name.toUpperCase()}` : `${addr.slice(0, 6)}...${addr.slice(-4)}`;
      updateCache(CACHE_KEYS.NAMES, key, res);
      return res;
    } catch {
      return `${addr.slice(0, 6)}...`;
    }
  };

  const getTs = async (blockNumber: bigint): Promise<number> => {
    const bStr = blockNumber.toString();
    const cache = getStoredCache<number>(CACHE_KEYS.TIMES);
    if (cache[bStr]) return cache[bStr].val;

    try {
      const block = await runCall((client) => client.getBlock({ blockNumber }));
      const ts = Number(block?.timestamp || 0);
      if (ts > 0) updateCache(CACHE_KEYS.TIMES, bStr, ts);
      return ts || Math.floor(Date.now() / 1000);
    } catch {
      return Math.floor(Date.now() / 1000);
    }
  };

  const runSync = useCallback(
    async (isDeep = false) => {
      if (!userAddress || syncInProgress.current) return;

      syncInProgress.current = true;
      setError(null);
      setLoading(true);

      const historyKey = `ap_h_${userAddress.toLowerCase()}`;
      const lastBlockKey = `ap_lb_${userAddress.toLowerCase()}`;
      const wallet = getAddress(userAddress);

      try {
        const accumulatedTxsMap = new Map<string, Transaction>();
        const cachedHistory = localStorage.getItem(historyKey);

        if (cachedHistory) {
          try {
            const parsed = JSON.parse(cachedHistory) as Array<Record<string, unknown>>;
            if (Array.isArray(parsed)) {
              parsed.forEach((t) => {
                if (
                  t &&
                  typeof t === 'object' &&
                  typeof t.hash === 'string' &&
                  typeof t.from === 'string' &&
                  typeof t.to === 'string' &&
                  typeof t.timestamp === 'number'
                ) {
                  const txObj: Transaction = {
                    ...(t as unknown as Transaction),
                    blockNumber: BigInt(String(t.blockNumber || 0)),
                  };
                  accumulatedTxsMap.set(`${txObj.hash}-${txObj.logIndex}`, txObj);
                }
              });
              setAllTxs(Array.from(accumulatedTxsMap.values()));
            }
          } catch {
            localStorage.removeItem(historyKey);
          }
        }

        const latest = await runCall((client) => client.getBlockNumber());
        const lastBlock = BigInt(localStorage.getItem(lastBlockKey) || '0');

        let current = isDeep
          ? (latest > 20000n ? latest - 20000n : 0n)
          : (lastBlock === 0n ? (latest > 10000n ? latest - 10000n : 0n) : lastBlock + 1n);

        let chunkSize = 500n;
        const MAX_CHUNK_SIZE = 800n;
        let highestScannedBlock = lastBlock;

        while (current <= latest) {
          const toBlock = current + chunkSize > latest ? latest : current + chunkSize;
          setStatus(`Scanning ${current.toString()} to ${toBlock.toString()}...`);

          try {
            const [logsOut, logsIn] = await runCall((client) =>
              Promise.all([
                client.getContractEvents({
                  address: USDC_ADDRESS as Address,
                  abi: ERC20_ABI as any,
                  eventName: 'Transfer',
                  args: { from: wallet },
                  fromBlock: current,
                  toBlock: toBlock,
                }),
                client.getContractEvents({
                  address: USDC_ADDRESS as Address,
                  abi: ERC20_ABI as any,
                  eventName: 'Transfer',
                  args: { to: wallet },
                  fromBlock: current,
                  toBlock: toBlock,
                }),
              ])
            );

            const rawLogs = [...logsOut, ...logsIn] as unknown as CustomLog[];
            const uniqueLogsMap = new Map<string, CustomLog>();
            rawLogs.forEach((l) => uniqueLogsMap.set(`${l.transactionHash}-${l.logIndex}`, l));
            const logs = Array.from(uniqueLogsMap.values());

            if (logs.length > 0) {
              const uniqueAddressList = Array.from(
                new Set<Address>(
                  logs
                    .flatMap((l) => [l.args?.from, l.args?.to])
                    .filter((a): a is Address => Boolean(a))
                    .map((a) => getAddress(a))
                )
              );

              const uniqueBlockList = Array.from(
                new Set<string>(
                  logs.filter((l) => l.blockNumber !== null).map((l) => l.blockNumber!.toString())
                )
              ).map((bStr) => BigInt(bStr));

              const addressNameMap = new Map<string, string>();
              const blockTimestampMap = new Map<string, number>();

              await Promise.all([
                runWithConcurrencyLimit(uniqueAddressList, 8, async (addr: Address) => {
                  const name = await resolveId(addr);
                  addressNameMap.set(addr, name);
                }),
                runWithConcurrencyLimit(uniqueBlockList, 8, async (bNum: bigint) => {
                  const ts = await getTs(bNum);
                  blockTimestampMap.set(bNum.toString(), ts);
                }),
              ]);

              logs.forEach((l) => {
                if (!l.args?.from || !l.args?.to) return;
                const from = getAddress(l.args.from);
                const to = getAddress(l.args.to);
                const fU = addressNameMap.get(from) || `${from.slice(0, 6)}...`;
                const tU = addressNameMap.get(to) || `${to.slice(0, 6)}...`;
                const ts = blockTimestampMap.get(l.blockNumber?.toString() || '') || Math.floor(Date.now() / 1000);

                const tx: Transaction = {
                  hash: l.transactionHash!,
                  logIndex: l.logIndex!,
                  from,
                  to,
                  fromUser: fU,
                  toUser: tU,
                  amount: formatUnits(l.args.value || 0n, 6),
                  timestamp: ts,
                  blockNumber: l.blockNumber!,
                  isIncoming: to === wallet,
                  status: 'Confirmed',
                };

                accumulatedTxsMap.set(`${tx.hash}-${tx.logIndex}`, tx);
              });
            }

            highestScannedBlock = toBlock;

            if (chunkSize < MAX_CHUNK_SIZE) {
              chunkSize = chunkSize * 2n > MAX_CHUNK_SIZE ? MAX_CHUNK_SIZE : chunkSize * 2n;
            }

            current = toBlock + 1n;
          } catch (err: unknown) {
            console.error(`Chunk error on range ${current.toString()}-${toBlock.toString()}:`, err);

            if (chunkSize > 100n) {
              chunkSize = chunkSize / 2n;
              console.warn(`Reducing sync chunk size to ${chunkSize.toString()} and retrying range...`);
              await new Promise((res) => setTimeout(res, 300));
            } else {
              setError('Synchronizer encountered a network bottleneck.');
              break;
            }
          }
        }

        if (highestScannedBlock > lastBlock) {
          localStorage.setItem(lastBlockKey, highestScannedBlock.toString());
        }

        const finalSortedTxs = Array.from(accumulatedTxsMap.values())
          .sort((a, b) => {
            if (b.blockNumber !== a.blockNumber) return Number(b.blockNumber - a.blockNumber);
            if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
            return b.logIndex - a.logIndex;
          })
          .slice(0, 1000);

        try {
          const serializableFinal = finalSortedTxs.map((t) => ({
            ...t,
            blockNumber: t.blockNumber.toString(),
          }));
          localStorage.setItem(historyKey, JSON.stringify(serializableFinal));
        } catch {
          console.warn('Storage quota limit reached while saving tx history.');
        }

        setAllTxs(finalSortedTxs);
        setStatus('Sync Complete');
        window.dispatchEvent(
          new CustomEvent('ap_sync_done', { detail: { wallet: wallet.toLowerCase() } })
        );
      } catch {
        setError('Synchronizer encountered a network bottleneck.');
      } finally {
        setLoading(false);
        syncInProgress.current = false;
      }
    },
    [userAddress, runCall]
  );

  useEffect(() => {
    if (isOpen) runSync();
    const handleRemoteSync = () => runSync();
    window.addEventListener('arcpay_request_sync', handleRemoteSync);
    return () => window.removeEventListener('arcpay_request_sync', handleRemoteSync);
  }, [isOpen, runSync]);

  return { allTxs, loading, status, error, runSync };
}