'use client';
import { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { useReadContract, usePublicClient } from 'wagmi';
import { encodeFunctionData, parseUnits } from 'viem';
import { X, Loader2, ShieldCheck, CheckCircle2, UserSearch } from 'lucide-react';
import { REGISTRY_ADDRESS, REGISTRY_ABI, REQUEST_ADDRESS, REQUEST_ABI } from '@/lib/constants';

export default function RequestModal({ isOpen, onClose, userAddress, onOpenRegister, onSent, initialRecipient }: any) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState('');
  const { wallets } = useWallets();
  const publicClient = usePublicClient();

  const { data: myUsername } = useReadContract({
    address: REGISTRY_ADDRESS as `0x${string}`,
    abi: REGISTRY_ABI,
    functionName: 'getUsername',
    args: [userAddress as `0x${string}`],
    query: { enabled: isOpen && !!userAddress }
  });

  useEffect(() => {
    if (isOpen) {
      setRecipient(initialRecipient || '');
      setAmount('');
      setError('');
      setStatus('idle');
    }
  }, [isOpen, initialRecipient]);

  const handleRequest = async () => {
    const trimmedRecipient = recipient.trim().toLowerCase();
    const cleanRecipient = trimmedRecipient.startsWith('@') ? trimmedRecipient : `@${trimmedRecipient}`;

    if (!cleanRecipient || cleanRecipient === '@' || !amount || parseFloat(amount) <= 0) {
      setError("Enter a valid @username and amount");
      return;
    }
    
    try {
      setStatus('loading');
      setError('');
      
      const resolved = await publicClient?.readContract({
        address: REGISTRY_ADDRESS as `0x${string}`,
        abi: REGISTRY_ABI,
        functionName: 'resolveUsername',
        args: [cleanRecipient.slice(1)]
      });

      if (!resolved || resolved === '0x0000000000000000000000000000000000000000') {
        setError("Target identity not found");
        setStatus('idle');
        return;
      }

      const wallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
      if (!wallet) {
        setError("No active wallet found");
        setStatus('idle');
        return;
      }

      const provider = await wallet.getEthereumProvider();
      
      const data = encodeFunctionData({ 
        abi: REQUEST_ABI, 
        functionName: 'createRequest', 
        args: [resolved, parseUnits(amount, 6), "ArcPay Invoice"] 
      });

      const txHash = await provider.request({ 
        method: 'eth_sendTransaction', 
        params: [{ from: wallet.address, to: REQUEST_ADDRESS, data }] 
      });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      }
      
      setStatus('success');
      onSent?.(); 
      setTimeout(onClose, 1500);
    } catch (e) { 
      console.error("Request generation error:", e);
      setStatus('idle'); 
      setError("Protocol Error: Try again"); 
    }
  };

  if (!isOpen) return null;

  if (!myUsername) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 text-white font-sans">
        <div className="bg-[#0c0e14] border border-white/10 w-full max-w-sm rounded-[44px] p-12 text-center space-y-6 shadow-3xl relative">
          <button onClick={onClose} className="absolute right-8 top-8 text-slate-500 hover:text-white transition-all"><X size={20}/></button>
          <div className="w-20 h-20 bg-blue-600/10 rounded-full mx-auto flex items-center justify-center text-blue-500 border border-blue-500/10"><ShieldCheck size={40} /></div>
          <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Identity Required</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Please establish your on-chain handle first</p>
          <button onClick={() => { onClose(); onOpenRegister(); }} className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black uppercase italic shadow-xl transition-all text-xs tracking-widest">Create Username</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 text-white font-sans">
      <div className="bg-[#0c0e14] border border-white/10 w-full max-w-sm rounded-[44px] p-10 relative shadow-3xl animate-in zoom-in duration-200">
        <button onClick={onClose} className="absolute right-8 top-8 text-slate-500 hover:text-white transition-all"><X size={20} /></button>
        
        {status === 'success' ? (
          <div className="text-center py-10 animate-in zoom-in">
            <CheckCircle2 size={80} className="mx-auto text-emerald-500 mb-6 drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]"/>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Invoice Issued</h3>
          </div>
        ) : (
          <div className="space-y-8 text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/10 rounded-xl text-blue-500 border border-blue-500/10"><UserSearch size={20}/></div>
              <h3 className="text-2xl font-black uppercase italic text-white tracking-tighter">Create Invoice</h3>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Recipient ID</p>
                <input 
                  value={recipient} 
                  onChange={e => setRecipient(e.target.value.toLowerCase())} 
                  placeholder="@username" 
                  className="w-full bg-black/40 border border-white/5 p-6 text-xl font-black outline-none rounded-3xl focus:border-blue-500 transition-all text-blue-400 placeholder:text-slate-800" 
                />
              </div>

              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Amount in USDC</p>
                <div className="relative">
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    placeholder="0.00" 
                    className="w-full bg-black/40 border border-white/5 p-6 text-4xl font-black outline-none rounded-3xl text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-slate-700 uppercase tracking-widest">USDC</span>
                </div>
              </div>

              {error && <p className="text-red-500 text-[9px] text-center uppercase font-black bg-red-500/5 py-2 rounded-lg border border-red-500/10">{error}</p>}
              
              <button disabled={status === 'loading'} onClick={handleRequest} className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-[24px] font-black uppercase italic shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 mt-4 text-xs tracking-widest text-white">
                {status === 'loading' ? <><Loader2 className="animate-spin" size={18}/> Processing...</> : 'Send Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}