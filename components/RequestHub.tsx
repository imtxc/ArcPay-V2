'use client';
import { useReadContract, usePublicClient } from 'wagmi';
import { useWallets } from '@privy-io/react-auth';
import { useState, useEffect, useCallback, useRef } from 'react';
import { formatUnits, encodeFunctionData } from 'viem';
import { REQUEST_ADDRESS, REQUEST_ABI, REGISTRY_ADDRESS, REGISTRY_ABI, USDC_ADDRESS, ERC20_ABI } from '@/lib/constants';
import { Check, X, RefreshCw, Loader2, Clock, Hourglass, Database, ArrowDownLeft, Zap, ChevronDown, Lock } from 'lucide-react';

export default function RequestHub({ address, refetchBalance }: any) {
  const [incoming, setIncoming] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(2);
  const [actionId, setActionId] = useState<string | null>(null);
  
  const nameCache = useRef<Record<string, string>>({});
  const { wallets } = useWallets();
  const publicClient = usePublicClient();

  const { data: inIds, refetch: refetchIds } = useReadContract({
    address: REQUEST_ADDRESS as `0x${string}`,
    abi: REQUEST_ABI,
    functionName: 'getIncomingRequests',
    args: [address],
  });

  const syncHub = useCallback(async () => {
    if (!publicClient || !address || isSyncing) return;
    try {
      setIsSyncing(true);
      const { data: ids } = await refetchIds();
      if (!ids || (ids as any).length === 0) { setIncoming([]); return; }
      
      const currentTime = Math.floor(Date.now() / 1000);
      const targetIds = [...(ids as any[])].reverse().slice(0, 100);
      
      const results = await Promise.allSettled(targetIds.map(async (id) => {
        const d = await publicClient.readContract({
          address: REQUEST_ADDRESS as `0x${string}`,
          abi: REQUEST_ABI,
          functionName: 'getRequestDetails',
          args: [id]
        }) as any;

        if (!nameCache.current[d.requester]) {
           try {
             const name = await publicClient.readContract({ address: REGISTRY_ADDRESS as `0x${string}`, abi: REGISTRY_ABI, functionName: 'getUsername', args: [d.requester] }) as string;
             nameCache.current[d.requester] = name ? `@${name.toUpperCase()}` : `${d.requester.slice(0,6)}...`;
           } catch { nameCache.current[d.requester] = `${d.requester.slice(0,6)}...`; }
        }
        return { ...d, id, displayUser: nameCache.current[d.requester] };
      }));

      const final = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter(req => Number(req.status) === 0 && (currentTime - Number(req.timestamp)) < 86400);

      setIncoming(final);
    } finally { setIsSyncing(false); }
  }, [address, publicClient, refetchIds]);

  useEffect(() => { syncHub(); }, [address, inIds]);

  const handleAction = async (req: any, action: 'pay' | 'reject') => {
    const wallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
    try {
      setActionId(req.id.toString());
      const provider = await wallet.getEthereumProvider();
      if (action === 'pay') {
        const appData = encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [REQUEST_ADDRESS, req.amount] });
        await provider.request({ method: 'eth_sendTransaction', params: [{ from: wallet.address, to: USDC_ADDRESS, data: appData, value: '0x0' }] });
        const payData = encodeFunctionData({ abi: REQUEST_ABI, functionName: 'acceptAndPay', args: [req.id] });
        await provider.request({ method: 'eth_sendTransaction', params: [{ from: wallet.address, to: REQUEST_ADDRESS, data: payData, value: '0x0' }] });
      } else {
        const rejData = encodeFunctionData({ abi: REQUEST_ABI, functionName: 'rejectRequest', args: [req.id] });
        await provider.request({ method: 'eth_sendTransaction', params: [{ from: wallet.address, to: REQUEST_ADDRESS, data: rejData, value: '0x0' }] });
      }
      syncHub(); if (refetchBalance) refetchBalance();
    } catch (e) {} finally { setActionId(null); }
  };

  return (
    <div className="bg-[#0c0e14]/80 border border-white/5 rounded-[44px] p-10 shadow-3xl w-full border-t-white/10 relative flex flex-col backdrop-blur-2xl">
      <div className="flex justify-between items-start mb-12">
        <div className="flex items-center gap-5 text-left">
           <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-blue-500 border border-white/5 shadow-inner"><Database size={28}/></div>
           <div><h3 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">Payment Hub</h3><p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] italic mt-2">Protocol Live</p></div>
        </div>
        <button onClick={syncHub} disabled={isSyncing} className="p-3 bg-blue-600/10 text-blue-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
          {isSyncing ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
        </button>
      </div>

      <div className="flex items-center justify-between px-2 mb-8"><h4 className="text-[12px] font-black text-blue-400 uppercase tracking-[0.4em] italic">Incoming Requests</h4><div className="w-7 h-7 bg-blue-600/10 rounded-full flex items-center justify-center text-[11px] font-black text-blue-500 border border-blue-500/20">{incoming.length}</div></div>

      <div className="space-y-6">
        {incoming.slice(0, displayLimit).map((req) => (
          <div key={req.id.toString()} className="bg-white/5 border border-white/5 p-8 rounded-[40px] flex items-center justify-between group hover:bg-white/[0.08] transition-all shadow-2xl">
             <div className="flex items-center gap-8 text-left">
                <div className="w-20 h-20 bg-slate-800 rounded-full border-4 border-black/20 overflow-hidden shrink-0 shadow-2xl"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.displayUser}`} className="w-full h-full object-cover" /></div>
                <div className="space-y-2">
                   <p className="text-xl font-black text-white italic uppercase tracking-tighter leading-none">{req.displayUser}</p>
                   <p className="text-4xl font-black italic text-blue-400 leading-none tracking-tighter">{formatUnits(req.amount, 6)} <span className="text-xl not-italic uppercase tracking-normal">USDC</span></p>
                     <p className="text-[9px] font-bold text-amber-500/80 uppercase tracking-widest mt-3 flex items-center gap-2 animate-pulse"><Clock size={12}/> Expires in {Math.max(0, Math.floor((86400 - (Math.floor(Date.now() / 1000) - Number(req.timestamp))) / 3600))}h</p>
                </div>
             </div>
             <div className="flex flex-col gap-3 min-w-[200px]">
                <button disabled={actionId === req.id.toString()} onClick={() => handleAction(req, 'pay')} className="w-full py-5 bg-[#059669] text-white rounded-2xl font-black uppercase italic text-xs hover:bg-[#10b981] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3 border-b-4 border-emerald-900/50">
                   {actionId === req.id.toString() ? <Loader2 className="animate-spin" size={18}/> : <><Zap size={18} fill="white"/> PAY</>}
                </button>
                <button disabled={actionId === req.id.toString()} onClick={() => handleAction(req, 'reject')} className="w-full py-5 bg-[#991b1b] text-white rounded-2xl font-black uppercase italic text-xs hover:bg-[#ef4444] active:scale-95 transition-all shadow-lg border-b-4 border-red-950/50">REJECT</button>
             </div>
          </div>
        ))}
        {incoming.length > displayLimit && (
          <button onClick={() => setDisplayLimit(prev => prev + 5)} className="w-full py-5 border border-dashed border-white/10 rounded-[32px] text-[11px] font-black uppercase text-slate-600 hover:text-blue-500 transition-all italic flex items-center justify-center gap-3">SEE MORE <ChevronDown size={18}/></button>
        )}
      </div>
      <div className="mt-12 pt-8 border-t border-white/5 text-center flex items-center justify-center gap-3 opacity-30"><Lock size={12}/><p className="text-[9px] font-black uppercase italic text-slate-500 leading-none">Secured Protocol</p></div>
    </div>
  );
}