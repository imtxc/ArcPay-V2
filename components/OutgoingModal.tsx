'use client';
import { X } from 'lucide-react';
import OutgoingRequests from './OutgoingRequests';

// --- TYPES FOR SECURITY & STABILITY ---
interface OutgoingModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
}

export default function OutgoingModal({ isOpen, onClose, address }: OutgoingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/98 backdrop-blur-3xl p-4 font-sans">
      <div className="w-full max-w-lg relative animate-in zoom-in duration-300">
        {/* Close button with premium hover effect */}
        <button 
          onClick={onClose} 
          className="absolute -top-12 right-0 p-3 bg-white/5 rounded-2xl text-white hover:text-rose-500 transition-all shadow-xl border border-white/5"
        >
          <X size={20}/>
        </button>
        
        <div className="h-[75vh]">
          {/* OutgoingRequests logic will load here */}
          <OutgoingRequests address={address} />
        </div>
      </div>
    </div>
  );
}