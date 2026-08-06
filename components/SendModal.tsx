'use client';
import { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { parseUnits, isAddress } from 'viem';
import { X, Loader2, Send } from 'lucide-react';

export default function SendModal({ isOpen, onClose, refetchBalance, initialRecipient, onShowReceipt }: any) {
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
    if (!recipient || !amount || parseFloat(amount) <= 0) return;
    setError('');
    if (!isAddress(recipient)) { setError("Invalid 0x address"); return; }
    
    try {
      setIsPaying(true);
      const wallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
      const provider = await wallet.getEthereumProvider();

      // Native 18-decimal transfer matching Arc network architecture
      const txHash = await provider.request({ 
        method: 'eth_sendTransaction', 
        params: [{ 
          from: wallet.address, 
          to: recipient, 
          value: '0x' + parseUnits(amount, 18).toString(16) 
        }] 
      });
      
      onShowReceipt({ hash: txHash, amount, to: recipient, toUser: null });
      refetchBalance();
      onClose();
    } catch (e) { 
      console.error(e);
      setError("Failed to send");
    } finally { 
      setIsPaying(false); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 font-sans">
      <div className="bg-[#0c0e14] border border-white/10 w-full max-w-sm rounded-[44px] p-10 relative shadow-2xl">
        <button onClick={onClose} className="absolute right-8 top-8 text-slate-500 hover:text-white transition-all"><X size={20}/></button>
        <div className="space-y-10 text-left">
          <h3 className="text-3xl font-black uppercase italic text-blue-500">Wallet Pay</h3>
          <div className="space-y-6">
            <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="0x..." className="w-full bg-black/40 border border-white/5 p-6 text-xs font-mono outline-none rounded-3xl focus:border-blue-500 text-white" />
            <div className="relative">
              <input 
                type="text" 
                inputMode="decimal" 
                value={amount} 
                onChange={e => { const val = e.target.value; if (val === '' || /^\d*.?\d*$/.test(val)) setAmount(val); }} 
                placeholder="0.00" 
                className="w-full bg-black/40 border border-white/5 p-7 rounded-[28px] text-4xl font-black outline-none text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
              />
              <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs font-black text-slate-700">USDC</span>
            </div>
            {error && <p className="text-red-500 text-[9px] text-center font-black uppercase">{error}</p>}
            <button disabled={isPaying} onClick={handlePay} className="w-full bg-blue-600 py-6 rounded-[28px] font-black uppercase italic shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
              {isPaying ? <Loader2 className="animate-spin" size={20}/> : <><Send size={18}/> Send USDC</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}