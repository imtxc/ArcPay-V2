'use client';
import { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, BarChart3, Activity, Loader2 } from 'lucide-react';

interface InsightStats {
  spent: string;
  received: string;
  bars: number[];
}

export default function Insights({ address }: { address: string }) {
  // 1. Initial State: Caching logic ke saath
  const [stats, setStats] = useState<InsightStats>({ 
    spent: '0.00', 
    received: '0.00', 
    bars: [20, 20, 20, 20, 20, 20, 20] 
  });
  const [loading, setLoading] = useState(false);

  const cacheKey = `ap_ins_${address?.toLowerCase()}`;

  const fetchInsights = useCallback(async (showLoader = false) => {
    if (!address) return;
    
    try {
      if (showLoader) setLoading(true);
      
      const res = await fetch(`/api/insights?address=${address}`);
      
      // Safety Check: Agar server 500 error de (Unexpected token '<') toh yahi ruk jao
      if (!res.ok) throw new Error("Server Error");

      const data = await res.json();
      
      if (data && (data.spent !== undefined)) {
        const newStats = {
          spent: data.spent || '0.00',
          received: data.received || '0.00',
          bars: data.bars || [25, 45, 30, 70, 55, 90, 40]
        };
        setStats(newStats);
        // Save to Cache
        localStorage.setItem(cacheKey, JSON.stringify(newStats));
      }
    } catch (e) {
      console.warn("Insights fetch background sync paused");
    } finally {
      setLoading(false);
    }
  }, [address, cacheKey]);

  useEffect(() => { 
    // 1. Load from Cache immediately for instant UI
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setStats(JSON.parse(cached));
      } catch (e) { /* ignore parse errors */ }
    }

    // 2. Initial fetch
    fetchInsights(true);

    // 3. Periodic background sync (Har 20 second mein)
    const interval = setInterval(() => fetchInsights(false), 20000);
    return () => clearInterval(interval);
  }, [address, fetchInsights, cacheKey]);

  return (
    <div id="insights-section-anchor" className="bg-[#0c0e14] border border-white/5 rounded-[44px] p-10 space-y-8 shadow-3xl text-left border-t-white/10 relative overflow-hidden w-full h-fit font-sans leading-none">
      
      {/* Background Decoration */}
      <div className="absolute -right-4 -top-4 p-8 opacity-5 rotate-12 pointer-events-none">
        <Activity size={180}/>
      </div>
      
      {/* Spent / Received Stats */}
      <div className="grid grid-cols-2 gap-8 relative z-10">
        <div className="space-y-4 p-6 bg-white/[0.02] border border-white/5 rounded-[32px] shadow-inner transition-all hover:bg-white/[0.04]">
          <p className="text-rose-500/60 uppercase text-[9px] font-black tracking-widest flex items-center gap-2">
            <ArrowUpRight size={14} strokeWidth={3}/> Total Paid
          </p>
          <h2 className="text-3xl font-black italic text-white leading-none tracking-tighter">
            {stats.spent} <span className="text-[10px] opacity-20 uppercase not-italic font-bold ml-1">USDC</span>
          </h2>
        </div>

        <div className="space-y-4 p-6 bg-white/[0.02] border border-white/5 rounded-[32px] shadow-inner transition-all hover:bg-white/[0.04]">
          <p className="text-emerald-500/60 uppercase text-[9px] font-black tracking-widest flex items-center gap-2">
            <ArrowDownLeft size={14} strokeWidth={3}/> Total Received
          </p>
          <h2 className="text-3xl font-black italic text-white leading-none tracking-tighter">
            {stats.received} <span className="text-[10px] opacity-20 uppercase not-italic font-bold ml-1">USDC</span>
          </h2>
        </div>
      </div>
      
      {/* Sub-header / Status */}
      <div className="flex items-center justify-between gap-4 bg-blue-600/5 border border-blue-500/10 w-full p-5 rounded-3xl relative z-10">
         <div className="flex items-center gap-3">
            <BarChart3 size={16} className="text-blue-500"/>
            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest italic">Identity Financial Flow</span>
         </div>
         {loading && <Loader2 size={12} className="animate-spin text-blue-500/50" />}
      </div>

      {/* Visual Chart Bars */}
      <div className="flex items-end gap-3 h-24 pt-2 relative z-10 px-2">
         {stats.bars.map((h: number, i: number) => (
           <div 
            key={`insight-bar-${i}`} 
            className="flex-1 bg-gradient-to-t from-blue-600/10 to-blue-500/40 rounded-t-xl transition-all duration-1000 ease-out hover:to-blue-400" 
            style={{ height: `${h}%` }}
           ></div>
         ))}
      </div>

      {/* Trust Footer */}
      <p className="text-center text-[7px] font-black text-slate-800 uppercase tracking-[0.3em] pt-2">Powered by Arc-Chain Indexer</p>
    </div>
  );
}