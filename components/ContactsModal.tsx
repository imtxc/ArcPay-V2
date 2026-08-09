'use client';
import { X } from 'lucide-react';
import SavedHub from './SavedHub';

// FIX: Added 'refetchBalance' to the interface to match parent (page.tsx) usage
interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void | Promise<void>;
  showToast: (msg: string, type?: string) => void;
  onPay: (user: string) => void | Promise<void>;
  onRequest: (user: string) => void | Promise<void>;
  refetchBalance?: () => void; // <--- Added this to fix the error
}

export default function ContactsModal({ 
  isOpen, 
  onClose, 
  showToast, 
  onPay, 
  onRequest,
  refetchBalance // <--- Destructured here
}: ContactsModalProps) {
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 font-sans leading-none">
      <div className="bg-[#0c0e14] border border-white/10 w-full max-w-lg rounded-[44px] p-2 relative shadow-3xl overflow-hidden animate-in zoom-in duration-300">
        
        <button 
          onClick={onClose} 
          className="absolute right-8 top-8 z-50 text-slate-500 hover:text-white transition-all bg-black/50 p-2.5 rounded-full border border-white/5 active:scale-90"
        >
          <X size={20}/>
        </button>

        <div className="max-h-[80vh] overflow-y-auto custom-scrollbar">
           <SavedHub 
             showToast={showToast} 
             refetchBalance={refetchBalance} // <--- Pass it down to SavedHub if needed
             onPay={(user: string) => { 
                onClose(); 
                onPay(user); 
             }} 
             onRequest={(user: string) => { 
                onClose(); 
                onRequest(user); 
             }} 
           />
        </div>
      </div>
    </div>
  );
}