'use client';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

export default function ReceiveModal({ isOpen, onClose, address, username }: { isOpen: boolean; onClose: () => void; address: string; username: string | null }) {
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string, type: 'addr' | 'user') => {
    navigator.clipboard.writeText(text);
    if (type === 'addr') {
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 2000);
    } else {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 font-sans leading-none">
      <div className="bg-[#0f172a] border border-white/10 w-full max-w-sm rounded-[44px] p-10 relative shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        
        <button onClick={onClose} className="absolute right-8 top-8 text-slate-500 hover:text-white transition-all"><X size={20} /></button>

        <div className="text-center space-y-8">
          <div className="space-y-3 mt-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 leading-none">Your Identity</h3>
            
            {/* USERNAME SECTION: SMALLER + NO BLUE DOT + COPY BUTTON */}
            <div className="flex items-center justify-center gap-3">
              <h2 className="text-xl font-black italic tracking-tighter uppercase text-white leading-none">
                @{username || 'User'}
              </h2>
              <button 
                onClick={() => handleCopy(`@${username}`, 'user')}
                className="p-2 bg-white/5 rounded-xl text-slate-500 hover:text-blue-400 transition-all active:scale-90"
                title="Copy Username"
              >
                {copiedUser ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[56px] inline-block shadow-2xl border-[10px] border-black/5 relative leading-none">
             <QRCodeSVG value={address || '0x'} size={180} />
          </div>

          <div className="space-y-4">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-6 leading-relaxed">
              Scan this QR to receive USDC directly to your Arc Pay ID
            </p>
            
            <div 
              onClick={() => handleCopy(address, 'addr')}
              className="bg-black/40 border border-white/5 p-5 rounded-[24px] flex items-center justify-between group cursor-pointer hover:border-blue-500/30 transition-all shadow-inner"
            >
              <div className="text-left overflow-hidden">
                <p className="text-[8px] font-black text-slate-700 uppercase mb-1 tracking-tighter leading-none">Wallet Address</p>
                <p className="text-[11px] font-mono text-slate-400 truncate w-40 leading-none">{address}</p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-xl text-slate-500 group-hover:text-blue-500 transition-colors">
                {copiedAddr ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-[9px] font-black text-slate-700 uppercase tracking-widest pt-4 leading-none">
            <ShieldCheck size={12} /> Secure Arc Identity Verified
          </div>
        </div>
      </div>
    </div>
  );
}
