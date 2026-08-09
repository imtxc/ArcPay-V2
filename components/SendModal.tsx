'use client';
import { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { parseUnits, isAddress } from 'viem';
import { X, Loader2, Send, AlertCircle } from 'lucide-react';

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  refetchBalance: () => void;
  initialRecipient: string;
  onShowReceipt: (data: any) => void;
}

export default function SendModal({ isOpen, onClose, refetchBalance, initialRecipient, onShowReceipt }: SendModalProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState('');
  const { wallets } = useWallets();

  useEffect(() => {
    if (isOpen) {
      setRecipient(initialRecipient || '');
      setAmount('');
      setError('');
    }
  }, [isOpen, initialRecipient]);

  const handlePay = async () => {
    if (!recipient || !amount || parseFloat(amount) <= 0) {
        setError("Invalid Input: Enter amount and recipient");
        return;
    }
    
    if (!isAddress(recipient)) { 
      setError("Invalid Address Format"); 
      return; 
    }

    if (!wallets.length) {
      setError("No Wallet Connected");
      return;
    }
    
    try {
      setIsPaying(true);
      setError('');
      
      const wallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
      const provider = await wallet.getEthereumProvider();
      const valueHex = '0x' + parseUnits(amount, 18).toString(16);

      // Raw RPC Request
      const txHash = await provider.request({ 
        method: 'eth_sendTransaction', 
        params: [{ 
          from: wallet.address, 
          to: recipient, 
          value: valueHex
        }] 
      });
      
      if (txHash) {
        onShowReceipt({ hash: txHash, amount, to: recipient, toUser: null });
        if (refetchBalance) refetchBalance();
        onClose();
      }
    } catch (e: any) { 
      // NO FAKE ERRORS: Yahan seedha provider ka shortMessage ya asli message dikhega
      console.error("RAW_RPC_ERROR:", e);
      
      // Viem/Privy errors mein aksar shortMessage ya message field hoti hai
      const rawError = e.shortMessage || e.message || String(e);
      setError(rawError); 
      
    } finally { 
      setIsPaying(false); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 font-sans leading-none">
      <div className="bg-[#0c0e14] border border-white/10 w-full max-w-sm rounded-[44px] p-10 relative shadow-3xl animate-in zoom-in duration-200">
        <button onClick={onClose} className="absolute right-8 top-8 text-slate-500 hover:text-white transition-all"><X size={20}/></button>
        
        <div className="space-y-10 text-left">
          <div className="space-y-2">
            <h3 className="text-3xl font-black uppercase italic text-blue-500 tracking-tighter">Settlement</h3>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Raw Protocol Handshake</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest ml-1">To</p>
                <input 
                  value={recipient} 
                  onChange={e => setRecipient((e.target as HTMLInputElement).value)} 
                  placeholder="0x..." 
                  className="w-full bg-black/40 border border-white/5 p-6 text-xs font-mono outline-none rounded-3xl focus:border-blue-500 transition-all text-white" 
                />
            </div>

            <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest ml-1">USDC</p>
                <div className="relative">
                  <input 
                    type="text" 
                    inputMode="decimal" 
                    value={amount} 
                    onChange={e => { 
                      const val = (e.target as HTMLInputElement).value; 
                      if (val === '' || /^\d*.?\d*$/.test(val)) setAmount(val); 
                    }} 
                    placeholder="0.00" 
                    className="w-full bg-black/40 border border-white/5 p-7 rounded-[28px] text-4xl font-black outline-none text-white focus:border-blue-500/30 transition-all [appearance:textfield]" 
                  />
                  <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs font-black text-slate-700 uppercase tracking-widest">USDC</span>
                </div>
            </div>

            {/* ACTUAL PROVIDER ERROR DISPLAY */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-start gap-3 overflow-hidden">
                    <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="overflow-hidden">
                       <p className="text-red-500 text-[10px] font-bold uppercase mb-1">Provider Error Output:</p>
                       <p className="text-red-500/80 text-[11px] font-mono leading-normal break-all">
                         {error}
                       </p>
                    </div>
                </div>
            )}

            <button 
              disabled={isPaying || !amount || !recipient} 
              onClick={handlePay} 
              className="w-full bg-blue-600 hover:bg-blue-500 py-6 rounded-[28px] font-black uppercase italic shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 text-white disabled:opacity-30"
            >
              {isPaying ? <Loader2 className="animate-spin" size={20}/> : <><Send size={18}/> Execute Order</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}