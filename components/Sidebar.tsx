'use client';
import React from 'react';
import { 
  LayoutDashboard, Send, HandCoins, Download, History, 
  User, Settings, LogOut, Zap, PieChart, Users, Bell,
  type LucideIcon // Added 'type' for better serializability signal
} from 'lucide-react';

// MenuItem Interface
interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  section: 'DASHBOARD' | 'PAYMENTS' | 'HISTORY' | 'SETTINGS';
}

// Sidebar Props Interface - Explicitly defined to satisfy Next.js type checking
interface SidebarProps {
  onAction: (id: string) => void;
  logout: () => void;
}

export default function Sidebar({ onAction, logout }: SidebarProps) {
  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, section: 'DASHBOARD' },
    { id: 'insights', label: 'Insights', icon: PieChart, section: 'DASHBOARD' },
    { id: 'contacts', label: 'Saved Hub', icon: Users, section: 'DASHBOARD' },
    { id: 'notifications', label: 'Notifications', icon: Bell, section: 'DASHBOARD' },
    { id: 'history', label: 'Sent Status', icon: Send, section: 'DASHBOARD' },
    { id: 'send', label: 'Send', icon: Send, section: 'PAYMENTS' },
    { id: 'request', label: 'Request', icon: HandCoins, section: 'PAYMENTS' },
    { id: 'receive', label: 'Receive', icon: Download, section: 'PAYMENTS' },
    { id: 'transactions', label: 'Transactions', icon: History, section: 'HISTORY' },
    { id: 'profile', label: 'Profile', icon: User, section: 'SETTINGS' },
    { id: 'settings', label: 'Settings', icon: Settings, section: 'SETTINGS' },
  ];

  const sections = ['DASHBOARD', 'PAYMENTS', 'HISTORY', 'SETTINGS'] as const;

  return (
    <aside className="w-72 bg-[#05070a] border-r border-white/5 flex flex-col h-screen font-sans">
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <Zap size={22} fill="white" className="text-white" />
        </div>
        <h1 className="text-xl font-black italic tracking-tighter text-white uppercase leading-none">ArcPay</h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-8 overflow-y-auto custom-scrollbar">
        {sections.map(section => (
          <div key={section} className="space-y-1">
            <p className="px-4 text-[9px] font-black text-slate-700 tracking-[0.3em] mb-4 uppercase">{section}</p>
            {menuItems
              .filter(item => item.section === section)
              .map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onAction(item.id)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 text-slate-400 hover:text-blue-500 hover:bg-white/5 rounded-2xl transition-all group relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-blue-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Icon size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-black uppercase tracking-widest leading-none">
                      {item.label}
                    </span>
                  </button>
                );
              })}
          </div>
        ))}
      </nav>

      <div className="p-6 border-t border-white/5">
        <button 
          onClick={logout} 
          className="w-full flex items-center gap-4 px-6 py-4 text-slate-600 hover:text-rose-500 hover:bg-rose-500/5 rounded-2xl transition-all group"
        >
          <LogOut size={18} />
          <span className="text-[11px] font-black uppercase tracking-widest leading-none">Disconnect</span>
        </button>
      </div>
    </aside>
  );
}