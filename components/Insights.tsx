'use client';
import { useState, useEffect } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, BarChart3, Activity } from 'lucide-react';

export default function Insights({ address }: { address: string }) {
  const [stats, setStats] = useState({ spent: '0.00', received: '0.00', bars: [25, 45, 30, 70, 55, 90, 40] });

  const fetchInsights = async () => {
    try {
      if (!address) return;
      const res = await fetch(`/api/insights?address=${address}`);
      const data = await res.json();
      if (data) {
        setStats(data);
      }
    } catch (e) {
      console.error("Failed to fetch insights", e);
    }
  };

  useEffect(() => { 
    fetchInsights();
    const interval = setInterval(fetchInsights, 10000);
    return () => clearInterval(interval);
  }, [address]);

  return (
    <div id="insights-section-anchor" className="bg-[#0c0e14] border border-white/5 rounded-[44px] p-10 space-y-8 shadow-3xl text-left border-t-white/10 relative overflow-hidden w-full h-fit">
      <div className="absolute -right-4 -top-4 p-8 opacity-5 rotate-12"><Activity size={180}/></div>
      
      <div className="grid grid-cols-2 gap-8 relative z-10">
        <div className="space-y-3 p-6 bg-white/[0.02] border border-white/5 rounded-[32px] shadow-inner">
          <p className="text-rose-500/60 uppercase text-[9px] font-black tracking-widest flex items-center gap-2">
            <ArrowUpRight size={14}/> Paid
          </p>
          <h2 className="text-3xl font-black italic text-white leading-none">{stats.spent} <span className="text-[10px] opacity-20 uppercase not-italic">USDC</span></h2>
        </div>
        <div className="space-y-3 p-6 bg-white/[0.02] border border-white/5 rounded-[32px] shadow-inner">
          <p className="text-emerald-500/60 uppercase text-[9px] font-black tracking-widest flex items-center gap-2">
            <ArrowDownLeft size={14}/> Received
          </p>
          <h2 className="text-3xl font-black italic text-white leading-none">{stats.received} <span className="text-[10px] opacity-20 uppercase not-italic">USDC</span></h2>
        </div>
      </div>
      
      <div className="flex items-center justify-between gap-4 bg-blue-600/5 border border-blue-500/10 w-full p-4 rounded-3xl relative z-10">
         <div className="flex items-center gap-3">
            <BarChart3 size={16} className="text-blue-500"/>
            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Real-time Financial Analytics</span>
         </div>
      </div>

      <div className="flex items-end gap-3 h-20 pt-2 relative z-10">
         {stats.bars.map((h: number, i: number) => (
           <div key={`insight-bar-${i}`} className="flex-1 bg-gradient-to-t from-blue-600/5 to-blue-500/50 rounded-t-xl transition-all duration-1000" style={{ height: `${h}%` }}></div>
         ))}
      </div>
    </div>
  );
}
