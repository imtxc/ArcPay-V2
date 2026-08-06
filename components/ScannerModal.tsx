'use client';
import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

export default function ScannerModal({ isOpen, onClose, onScan }: { isOpen: boolean; onClose: () => void; onScan: (data: string) => void }) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Small timeout to ensure the DOM element #reader is fully painted and available
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
            scanner.clear().catch(err => console.error("Failed to clear scanner:", err));
            onClose();
          },
          (err) => {
            // Scanning errors (like frame not found) happen continuously, safe to ignore
          }
        );
      } catch (e) {
        console.error("Error initializing QR scanner:", e);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => {
          // Ignore errors if already cleared or not fully initialized
          console.debug("Cleanup warning:", err);
        });
        scannerRef.current = null;
      }
    };
  }, [isOpen, onClose, onScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 font-sans">
      <div className="bg-[#0f172a] border border-slate-800 w-full max-w-md rounded-[32px] p-8 relative overflow-hidden shadow-2xl">
        <button onClick={onClose} className="absolute right-6 top-6 text-slate-400 hover:text-white z-10 transition-colors">
          <X size={20} />
        </button>
        <h3 className="text-xl font-bold mb-6 text-center text-white italic uppercase tracking-tighter">Scan Recipient QR</h3>
        <div id="reader" className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-inner"></div>
        <p className="text-center text-slate-500 text-[10px] mt-6 uppercase tracking-[0.2em] font-black italic opacity-50">Align QR code within the frame</p>
      </div>
    </div>
  );
}