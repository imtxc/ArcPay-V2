'use client';
import { Activity, ArrowDownLeft, Clock } from 'lucide-react';

export default function PaymentRequests() {
  return (
    <div className="bg-[#0f172a]/20 border border-white/5 backdrop-blur-xl rounded-[40px] p-8 mt-10">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Payment Requests</h3>
        <span className="text-[10px] text-blue-500 font-bold uppercase bg-blue-500/10 px-3 py-1 rounded-full">Incoming</span>
      </div>
      
      <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-3xl">
        <Clock className="mx-auto text-slate-800 mb-4" size={32} />
        <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">No Pending Requests</p>
      </div>
    </div>
  );
}
