'use client';
import { X, Download, Trash2, ShieldCheck, LogOut } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, logout, showToast, userAddress }: any) {
  if (!isOpen) return null;

  const exportToCSV = () => {
    // Correct dynamic key fallback
    const storageKey = userAddress ? `ap_h_${userAddress.toLowerCase()}` : 'arcpay_history';
    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    if (history.length === 0) {
      showToast("No transactions to export", "error");
      return;
    }

    const headers = ["Date", "From", "To", "Amount (USDC)", "Hash", "Status"];
    const rows = history.map((tx: any) => [
      new Date(tx.timestamp * 1000).toLocaleString(), // Fixed from tx.date to tx.timestamp
      tx.from,
      tx.to,
      tx.amount,
      tx.hash,
      tx.status || 'Confirmed'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ArcPay_Report_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Report Exported");
  };

  const clearCache = () => {
    // Clear all related ArcPay cache keys safely
    localStorage.removeItem('arc_name_v2');
    localStorage.removeItem('ap_meta_names');
    localStorage.removeItem('ap_meta_times');
    if (userAddress) {
      localStorage.removeItem(`ap_h_${userAddress.toLowerCase()}`);
      localStorage.removeItem(`ap_lb_${userAddress.toLowerCase()}`);
    }
    showToast("System Cache Cleared");
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 font-sans">
      <div className="bg-[#0c0e14] border border-white/10 w-full max-w-md rounded-[44px] overflow-hidden shadow-3xl relative">
        <button onClick={onClose} className="absolute right-8 top-8 text-slate-500 hover:text-white transition-all"><X size={20}/></button>
        
        <div className="p-10 space-y-10">
          <div className="text-left">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Security & Tools</h3>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-2">Manage your ArcPay account</p>
          </div>

          <div className="space-y-4">
            {/* Export Feature */}
            <button onClick={exportToCSV} className="w-full flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-3xl group hover:border-blue-500/30 transition-all">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-500"><Download size={20}/></div>
                  <div className="text-left"><p className="text-[12px] font-black text-white uppercase italic">Export Ledger</p><p className="text-[9px] text-slate-500 uppercase font-bold">Download CSV Report</p></div>
               </div>
               <ShieldCheck size={16} className="text-slate-700 group-hover:text-blue-500"/>
            </button>

            {/* Cache Feature */}
            <button onClick={clearCache} className="w-full flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-3xl group hover:border-amber-500/30 transition-all">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-600/10 rounded-2xl text-amber-500"><Trash2 size={20}/></div>
                  <div className="text-left"><p className="text-[12px] font-black text-white uppercase italic">Clear Cache</p><p className="text-[9px] text-slate-500 uppercase font-bold">Fix Sync Issues</p></div>
               </div>
            </button>
          </div>

          <button onClick={logout} className="w-full py-5 bg-rose-600/10 border border-rose-600/20 text-rose-500 rounded-[24px] font-black uppercase italic tracking-widest text-[11px] hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-3">
            <LogOut size={16}/> Terminate Session
          </button>
        </div>
      </div>
    </div>
  );
}