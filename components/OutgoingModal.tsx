'use client';
import { X, ShieldCheck } from 'lucide-react';
import OutgoingRequests from './OutgoingRequests';

interface OutgoingModalProps {
  isOpen: boolean;
  onClose: () => void | Promise<void>;
  address: string;
}

export default function OutgoingModal({ isOpen, onClose, address }: OutgoingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 font-sans leading-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl" onClick={onClose} />
      
      <div className="relative w-full max-w-xl bg-[#0c0e14] border border-white/10 rounded-[48px] shadow-3xl flex flex-col h-[80vh] overflow-hidden text-white animate-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/20 shrink-0">
          <div className="space-y-2">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Sent Status</h2>
            <div className="flex items-center gap-2 text-[10px] text-blue-500 font-bold uppercase tracking-widest">
               <ShieldCheck size={12}/> Live Protocol Monitor
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:text-rose-500 transition-all border border-white/5">
            <X size={20} />
          </button>
        </div>

        {/* Content Container - Passing flex-1 here is vital */}
        <div className="flex-1 min-h-0 bg-black/20">
          <OutgoingRequests key={address} address={address} />
        </div>
      </div>
    </div>
  );
}