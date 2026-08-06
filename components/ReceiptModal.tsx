'use client';
import { X, CheckCircle2, Share2, ExternalLink, Download } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ReceiptModal({ isOpen, onClose, data }: any) {
  if (!isOpen || !data) return null;

  const handleShare = async () => {
    const text = `Paid ${data.amount} USDC to ${data.toUser || data.to} via ArcPay V2. Proof: https://testnet.arcscan.app/tx/${data.hash}`;
    if (navigator.share) {
      await navigator.share({ title: 'ArcPay Receipt', text, url: `https://testnet.arcscan.app/tx/${data.hash}` });
    } else {
      navigator.clipboard.writeText(text);
      alert("Receipt link copied to clipboard!");
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 font-sans">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0c0e14] border border-white/10 w-full max-w-sm rounded-[48px] overflow-hidden shadow-3xl relative">
        <button onClick={onClose} className="absolute right-8 top-8 text-slate-500 hover:text-white transition-all"><X size={20}/></button>
        <div className="p-10 text-center space-y-8">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-[30%] mx-auto flex items-center justify-center text-emerald-500 border border-emerald-500/10 shadow-inner"><CheckCircle2 size={40} /></div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Payment Success</h3>
          </div>
          <div className="bg-white/5 rounded-[32px] p-8 border border-white/5">
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Amount Sent</p>
             <h2 className="text-5xl font-black italic text-white">{data.amount} <span className="text-sm opacity-30">USDC</span></h2>
          </div>
          <div className="space-y-4 text-left px-2">
             <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">To Identity</span>
                <span className="text-sm font-black text-blue-400 italic uppercase">{data.toUser?.startsWith('@') ? data.toUser : `${data.toUser || data.to.slice(0,8)}`}</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Tx Hash</span>
                <a href={`https://testnet.arcscan.app/tx/${data.hash}`} target="_blank" className="text-[10px] font-mono text-slate-400 flex items-center gap-2">{data.hash.slice(0,10)}... <ExternalLink size={10}/></a>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <button className="flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 uppercase"><Download size={14}/> PDF</button>
             <button onClick={handleShare} className="flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-blue-500 transition-all"><Share2 size={14}/> Share</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}