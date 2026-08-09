'use client';
import { X } from 'lucide-react';
import OutgoingRequests from './OutgoingRequests';

// FIX: Added Promise support for Next.js 15 linter compatibility
interface OutgoingModalProps {
  isOpen: boolean;
  onClose: () => void | Promise<void>; 
  address: string;
}

export default function OutgoingModal({ isOpen, onClose, address }: OutgoingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4 font-sans leading-none">
      <div className="w-full max-w-lg relative animate-in zoom-in duration-300">
        
        {/* Close Button - Positioned slightly better for mobile safety */}
        <button 
          onClick={onClose} 
          className="absolute -top-14 right-0 p-3.5 bg-white/5 rounded-2xl text-white hover:text-rose-500 transition-all shadow-2xl border border-white/10 active:scale-95"
        >
          <X size={22}/>
        </button>
        
        <div className="h-[75vh] overflow-hidden rounded-[44px] border border-white/5 bg-[#0c0e14]/50 shadow-3xl">
          {/* 
            OutgoingRequests component handles the actual data fetching.
            Passed a unique key to ensure it re-syncs if address changes.
          */}
          <OutgoingRequests key={address} address={address} />
        </div>
      </div>
    </div>
  );
}