'use client';
import { X, Copy, ShieldCheck, Globe, Zap, ExternalLink, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProfileModal({ isOpen, onClose, address, username, showToast }: any) {
  if (!isOpen) return null;

  const copyProfileLink = () => {
    navigator.clipboard.writeText(`https://arcpay.v2/@${username}`);
    showToast("Profile Link Copied");
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0c0e14] border border-white/10 w-full max-w-md rounded-[48px] overflow-hidden shadow-3xl relative"
      >
        {/* Top Decorative Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-900 relative">
           <button onClick={onClose} className="absolute right-6 top-6 text-white/50 hover:text-white transition-all bg-black/20 p-2 rounded-full backdrop-blur-md"><X size={20}/></button>
        </div>

        <div className="px-10 pb-10 -mt-16 relative text-center space-y-8">
          {/* Avatar Section */}
          <div className="relative inline-block">
             <div className="w-32 h-32 bg-slate-900 rounded-[35%] border-8 border-[#0c0e14] overflow-hidden shadow-2xl mx-auto">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username || 'default'}`} className="w-full h-full object-cover" />
             </div>
             <div className="absolute bottom-1 right-1 bg-blue-500 text-white p-2 rounded-full border-4 border-[#0c0e14] shadow-lg">
                <ShieldCheck size={16} strokeWidth={3} />
             </div>
          </div>

          {/* Identity Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
               <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">@{username || 'ANONYMOUS'}</h2>
            </div>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] italic">Arc On-chain Resident</p>
          </div>

          {/* Data Grid */}
          <div className="grid grid-cols-1 gap-3 text-left">
             <div className="bg-white/5 border border-white/5 p-5 rounded-3xl space-y-1">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Public Address</p>
                <div className="flex justify-between items-center">
                   <p className="text-[11px] font-mono text-slate-300 truncate w-48">{address}</p>
                   <button onClick={() => {navigator.clipboard.writeText(address); showToast("Address Copied");}} className="p-2 hover:bg-white/5 rounded-lg text-slate-500"><Copy size={14}/></button>
                </div>
             </div>
             <div className="bg-white/5 border border-white/5 p-5 rounded-3xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500"><Globe size={16}/></div>
                   <div><p className="text-[10px] font-black text-white uppercase italic leading-none">Network</p><p className="text-[9px] text-slate-500 uppercase font-bold mt-1">Arc Public Testnet</p></div>
                </div>
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"/>
             </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
             <button onClick={copyProfileLink} className="flex items-center justify-center gap-2 py-4 bg-white text-black rounded-[20px] text-[11px] font-black uppercase italic tracking-widest hover:scale-105 transition-all shadow-xl">
                <Zap size={14} fill="black"/> Share ID
             </button>
             <button onClick={onClose} className="flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 text-white rounded-[20px] text-[11px] font-black uppercase italic tracking-widest hover:bg-white/10 transition-all">
                <QrCode size={14}/> View QR
             </button>
          </div>
        </div>

        <div className="p-6 bg-white/[0.02] border-t border-white/5 text-center">
           <p className="text-[8px] font-black text-slate-800 uppercase tracking-[0.4em]">Verified Protocol Identity Member</p>
        </div>
      </motion.div>
    </div>
  );
}