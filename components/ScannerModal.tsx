'use client';
import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

// FIX: Explicit Interface with Promise support to silence Next.js linter
interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void | Promise<void>; 
  onScan: (data: string) => void | Promise<void>;
}

export default function ScannerModal({ isOpen, onClose, onScan }: ScannerModalProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          "reader", 
          { fps: 10, qrbox: { width: 250, height: 250 } }, 
          false
        );
        scannerRef.current = scanner;

        scanner.render(
          (text) => {
            onScan(text);
            scanner.clear().catch(err => console.error("Scanner clear fail:", err));
            onClose();
          },
          (err) => {
            // Scanning noise - ignore
          }
        );
      } catch (e) {
        console.error("QR Scanner Init Error:", e);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.debug("Cleanup:", err));
        scannerRef.current = null;
      }
    };
  }, [isOpen, onClose, onScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 font-sans leading-none">
      <div className="bg-[#0f172a] border border-slate-800 w-full max-w-md rounded-[32px] p-8 relative overflow-hidden shadow-2xl">
        <button onClick={onClose} className="absolute right-6 top-6 text-slate-400 hover:text-white z-10 transition-colors">
          <X size={20} />
        </button>
        <h3 className="text-xl font-bold mb-6 text-center text-white italic uppercase tracking-tighter leading-none">Scan Identity QR</h3>
        
        {/* QR Scanner Container */}
        <div id="reader" className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-inner"></div>
        
        <p className="text-center text-slate-500 text-[10px] mt-6 uppercase tracking-[0.2em] font-black italic opacity-50 leading-none">
          Align QR code within the frame
        </p>
      </div>
    </div>
  );
}