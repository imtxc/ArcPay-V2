'use client';
import { useReadContract, usePublicClient } from 'wagmi';
import { useWallets } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { formatUnits, encodeFunctionData } from 'viem';
import { REQUEST_ADDRESS, REQUEST_ABI } from '@/lib/constants';
import { Check, RefreshCw, Loader2, Ban, CreditCard } from 'lucide-react';

export default function RequestManager({ address }: { address: string }) {
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { wallets } = useWallets();
  const publicClient = usePublicClient();

  const { refetch: refetchIn } = useReadContract({ address: REQUEST_ADDRESS as `0x${string}`, abi: REQUEST_ABI, functionName: 'getIncomingRequests', args: [address], query: { enabled: false } });
  const { refetch: refetchOut } = useReadContract({ address: REQUEST_ADDRESS as `0x${string}`, abi: REQUEST_ABI, functionName: 'getOutgoingRequests', args: [address], query: { enabled: false } });

  const startSync = async () => {
    if (!publicClient || !address || isSyncing) return;
    try {
      setIsSyncing(true);
      const [{ data: fIn }, { data: fOut }] = await Promise.all([refetchIn(), refetchOut()]);
      
      const fetchDetails = async (ids: any[]) => {
        if (!ids || ids.length === 0) return [];
        const res = [];
        for (const id of ids.slice(-3)) {
          try {
            // FIX: Adding 'as any' to tell TypeScript d is an object
            const d = await publicClient.readContract({ 
              address: REQUEST_ADDRESS as `0x${string}`, 
              abi: REQUEST_ABI, 
              functionName: 'getRequestDetails', 
              args: [id] 
            }) as any;
            
            res.push({ ...d, id: id.toString() });
            await new Promise(r => setTimeout(r, 800));
          } catch (e) { console.error("Sync delay..."); }
        }
        return res;
      };

      if (fIn) {
        const inData = await fetchDetails(fIn as any[]);
        setIncoming(inData.filter((r: any) => Number(r.status) === 0).reverse());
      }
      if (fOut) {
        const outData = await fetchDetails(fOut as any[]);
        setOutgoing(outData.reverse());
      }
    } catch (e) { console.error(e); } finally { setIsSyncing(false); }
  };

  useEffect(() => {
    const cacheKey = `arc_pay_hub_${address}`;
    const saved = localStorage.getItem(cacheKey);
    if (saved) {
      const { inc, out } = JSON.parse(saved);
      setIncoming(inc || []);
      setOutgoing(out || []);
    }
    startSync();
  }, [address]);

  const handleAction = async (req: any, action: 'pay' | 'reject') => {
    const wallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
    try {
      const provider = await wallet.getEthereumProvider();
      const func = action === 'pay' ? 'acceptAndPay' : 'rejectRequest';
      const data = encodeFunctionData({ abi: REQUEST_ABI, functionName: func, args: [req.id] });
      await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: wallet.address, to: REQUEST_ADDRESS, data, value: action === 'pay' ? '0x' + BigInt(req.amount).toString(16) : '0x0' }]
      });
      startSync();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="bg-[#0c0e14] border border-white/5 rounded-[44px] p-10 space-y-10 shadow-3xl h-full border-t-white/10 overflow-hidden">
      <div className="flex justify-between items-center px-2">
        <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-500 italic font-black leading-none">Payment Hub</h3>
        <button onClick={startSync} disabled={isSyncing} className="p-2.5 bg-blue-600/10 text-blue-500 rounded-xl hover:bg-blue-600/20 transition-all border border-blue-500/20 active:scale-95">
          {isSyncing ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>}
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex gap-8 border-b border-white/5 pb-2">
          <button className="text-[11px] font-black uppercase tracking-widest text-blue-500">Incoming ({incoming.length})</button>
        </div>
        {incoming.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[40px] opacity-20">
             <p className="text-[11px] text-slate-700 font-black uppercase italic">All settled</p>
          </div>
        ) : (
          incoming.map((req: any, i: number) => (
            <div key={i} className="bg-white/5 border border-white/5 p-8 rounded-[36px] flex justify-between items-center group hover:bg-white/[0.08] transition-all shadow-xl">
               <div className="flex gap-6 items-center">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center font-black text-2xl text-slate-400 border border-white/5 uppercase italic">
                    {req.requester.slice(2,3)}
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-black text-white italic uppercase tracking-tighter leading-none">@{req.id}</p>
                    <p className="text-[11px] font-bold text-slate-600 uppercase mt-1.5 opacity-80 leading-none">Invoice from user</p>
                  </div>
               </div>
               <div className="text-right flex items-center gap-10">
                  <div className="space-y-1 pr-6 border-r border-white/5">
                     <p className="text-2xl font-black italic tracking-tighter text-white leading-none">{formatUnits(req.amount, 18)} USDC</p>
                  </div>
                  <div className="flex gap-3">
                     <button onClick={() => handleAction(req, 'pay')} className="px-8 py-4 bg-emerald-500 text-black rounded-[22px] text-[13px] font-black uppercase italic hover:scale-[1.05] active:scale-95 transition-all shadow-lg">✓ Accept</button>
                     <button onClick={() => handleAction(req, 'reject')} className="px-8 py-4 bg-white/5 border border-white/10 text-red-500 rounded-[22px] text-[13px] font-black uppercase italic hover:bg-red-500 hover:text-white active:scale-95 transition-all shadow-xl">✕ Reject</button>
                  </div>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
