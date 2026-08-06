'use client';
import { RefreshCw, ShieldCheck } from 'lucide-react';

export default function BalanceCard({ balance, username, onRefresh, isLoading }: any) {
  return (
    <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 p-12 rounded-[56px] shadow-3xl relative overflow-hidden group border border-white/10">
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md">
           <ShieldCheck size={14} className="text-blue-200" />
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-100">
             {username ? `@${username}` : 'No Username Registered'}
           </p>
        </div>
        <button onClick={onRefresh} className={`${isLoading ? 'animate-spin' : ''} text-blue-100/50 hover:text-white transition-all`}>
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-5xl font-black text-white/20 tracking-tighter">$0.00</p>
        <h2 className="text-8xl font-black italic tracking-tighter leading-none text-white">
          {balance} <span className="text-2xl opacity-40 ml-4 font-bold not-italic">USDC</span>
        </h2>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-6 relative z-10">
        <button className="bg-white text-blue-900 font-black py-6 rounded-[28px] uppercase italic tracking-widest shadow-xl active:scale-95 transition-all">Send</button>
        <button className="bg-white/10 backdrop-blur-xl py-6 rounded-[28px] font-black uppercase italic tracking-widest border border-white/20 active:scale-95 transition-all">Receive</button>
      </div>
    </div>
  );
}
