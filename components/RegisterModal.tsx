'use client';
import { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { encodeFunctionData } from 'viem';
import { usePublicClient } from 'wagmi';
import { X, Loader2, UserCheck, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { REGISTRY_ADDRESS, REGISTRY_ABI } from '@/lib/constants';

export default function RegisterModal({ isOpen, onClose, onRegistered }: any) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'confirming' | 'success'>('idle');
  const [error, setError] = useState('');
  const { wallets } = useWallets();
  const publicClient = usePublicClient();

  useEffect(() => { if (!isOpen) { setStatus('idle'); setError(''); setUsername(''); } }, [isOpen]);

  const handleRegister = async () => {
    if (username.length < 3) { setError("Min 3 characters required"); return; }
    
    // HYBRID LOGIC: Find any active wallet (Privy or External like Metamask)
    const activeWallet = wallets.find((w) => w.walletClientType === 'privy') || wallets[0];
    
    if (!activeWallet) {
        setError("No wallet connected. Please login.");
        return;
    }

    try {
      setStatus('pending');
      setError('');
      
      const provider = await activeWallet.getEthereumProvider();
      
      const data = encodeFunctionData({
        abi: REGISTRY_ABI,
        functionName: 'registerUsername',
        args: [username.toLowerCase().trim()],
      });

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: activeWallet.address,
          to: REGISTRY_ADDRESS,
          data: data,
        }],
      });

      setStatus('confirming');
      
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      }

      setStatus('success');
      setTimeout(() => {
        onRegistered?.();
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setStatus('idle');
      setError(err.message?.includes('denied') ? "Transaction Cancelled" : "ID already taken or error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 font-sans">
      <div className="bg-[#0c0e14] border border-white/10 w-full max-w-md rounded-[44px] p-10 relative shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        
        {status === 'idle' && (
          <button onClick={onClose} className="absolute right-8 top-8 text-slate-500 hover:text-white transition-all"><X size={20}/></button>
        )}

        <div className="text-center space-y-8">
          {status === 'success' ? (
            <div className="py-6 animate-in zoom-in duration-300">
               <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                  <CheckCircle2 size={48} className="text-emerald-500" />
               </div>
               <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white">ID Secured!</h3>
               <p className="text-slate-500 text-[10px] mt-4 font-black uppercase tracking-[0.3em]">@{username.toLowerCase()} is now linked</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="w-16 h-16 bg-blue-600/10 rounded-2xl mx-auto flex items-center justify-center text-blue-500 border border-blue-500/10 mb-2">
                  <UserCheck size={32} />
                </div>
                <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white uppercase">Claim Identity</h3>
                <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                   Enter your unique Arc username
                </p>
              </div>

              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-blue-500">@</span>
                <input 
                  disabled={status !== 'idle'}
                  value={username} 
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/gi, ''))} 
                  placeholder="username" 
                  className="w-full bg-black/40 border border-white/5 rounded-3xl p-6 pl-14 text-2xl font-black text-white outline-none focus:border-blue-500 transition-all uppercase tracking-tighter disabled:opacity-50" 
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3">
                  <AlertCircle size={18} className="text-red-500" />
                  <p className="text-red-500 text-[10px] font-black uppercase leading-none">{error}</p>
                </div>
              )}

              <button 
                disabled={status !== 'idle'} 
                onClick={handleRegister} 
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-6 rounded-[28px] font-black uppercase italic tracking-widest shadow-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-3"
              >
                {status === 'pending' ? 'Sending Request...' : 
                 status === 'confirming' ? 'Confirming on Arc...' : 
                 'Confirm Identity'}
              </button>

              <div className="flex items-center justify-center gap-2 text-[8px] font-black text-slate-700 uppercase tracking-[0.2em] pt-2">
                 <ShieldCheck size={12}/> Verified On-chain Identity
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
