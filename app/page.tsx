'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useReadContract, usePublicClient } from 'wagmi';
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Search, ShieldCheck, Copy, RefreshCw, Send, ArrowDownLeft, 
  HandCoins, CreditCard, Download, History, User, CheckCircle2, ChevronRight, Loader2, Globe, ExternalLink, ArrowUpRight, Bell, Settings, AlertCircle, Scan, UserPlus, UserSearch, X, Lock, Gavel
} from 'lucide-react';
import { parseUnits, isAddress, encodeFunctionData, getAddress } from 'viem';
import { useArcPay } from '@/hooks/useArcPay';
import { REGISTRY_ADDRESS, REGISTRY_ABI, USDC_ADDRESS, ERC20_ABI } from '@/lib/constants';

// MODAL IMPORTS
import Sidebar from '@/components/Sidebar';
import RequestHub from '@/components/RequestHub';
import TransactionHistory from '@/components/TransactionHistory';
import ReceiptModal from '@/components/ReceiptModal';
import SendModal from '@/components/SendModal';
import RequestModal from '@/components/RequestModal';
import ReceiveModal from '@/components/ReceiveModal';
import RegisterModal from '@/components/RegisterModal';
import ScannerModal from '@/components/ScannerModal';
import ProfileModal from '@/components/ProfileModal';
import SettingsModal from '@/components/SettingsModal';
import TransactionsModal from '@/components/TransactionsModal';
import Insights from '@/components/Insights';
import SavedHub from '@/components/SavedHub';
import ContactsModal from '@/components/ContactsModal';
import OutgoingModal from '@/components/OutgoingModal';
import NotificationsModal from '@/components/NotificationsModal'; // ✅ Naya Premium Modal
import { QRCodeSVG } from 'qrcode.react';

export default function Dashboard() {
  const { logout, authenticated, ready, user, login } = usePrivy();
  const { wallets } = useWallets();
  const publicClient = usePublicClient();

  // --- ARCPAY PROTOCOL STATES ---
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [recipient, setRecipient] = useState('');
  const [sendTab, setSendTab] = useState('username');
  const [amount, setAmount] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [toast, setToast] = useState<{msg: string; type: string} | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // --- SECURITY LAYER: WALLET RESOLUTION & CHECKSUM ---
  const address = useMemo(() => {
    if (!authenticated || !wallets.length) return undefined;
    const embedded = wallets.find(w => w.walletClientType === 'privy');
    const external = wallets.find(w => w.walletClientType !== 'privy');
    return (embedded?.address || external?.address || wallets[0].address) as `0x${string}`;
  }, [authenticated, wallets]);

  const { usdcBalance, username, refetch } = useArcPay(address);

  useEffect(() => {
    const saved = localStorage.getItem('arcpay_notifs');
    if (saved) setNotifications(JSON.parse(saved));
  }, []);

  const addNotification = (msg: string, type: string) => {
    const newNotif = { 
      id: Date.now(), 
      msg, 
      type, 
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
    };
    const updated = [newNotif, ...notifications].slice(0, 15); // Increased limit slightly
    setNotifications(updated);
    localStorage.setItem('arcpay_notifs', JSON.stringify(updated));
  };

  // ✅ New: Clear all notifications feature
  const clearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('arcpay_notifs');
    showToast("Security Logs Purged", "info");
  };

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    addNotification(msg, type);
    setTimeout(() => setToast(null), 3000);
  };

  // --- HANDLERS ---
  const handlePayFromContact = (target: string) => {
    setRecipient(target);
    setSendTab('username');
    setActiveModal(null);
    setTimeout(() => {
      const el = document.getElementById('pay-section-anchor');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  const handleRequestFromContact = (target: string) => {
    setRecipient(target);
    setActiveModal("request");
  };

  const handleGlobalSearch = async () => {
    if (!searchQuery.startsWith('@') || searchQuery.length < 3) return;
    try {
      setIsSearching(true);
      const cleanName = searchQuery.slice(1).toLowerCase().replace(/[^a-z0-9_]/g, "").trim();
      const res = await publicClient?.readContract({
        address: REGISTRY_ADDRESS as `0x${string}`,
        abi: REGISTRY_ABI,
        functionName: 'resolveUsername',
        args: [cleanName]
      });
      
      if (!res || res === '0x0000000000000000000000000000000000000000') {
        showToast("Identity Hash Not Found", "error");
      } else {
        setRecipient(searchQuery);
        setSendTab('username');
        showToast(`Identity Resolved: ${searchQuery}`);
        const el = document.getElementById('pay-section-anchor');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (e) {
      showToast("Security Buffer: RPC Busy", "error");
    } finally {
      setIsSearching(false);
    }
  };

    useEffect(() => {
    fetch('/api/indexer').catch(() => console.log("Syncing..."));
  }, []);

  const handleLogout = async () => {
    setActiveModal(null);
    try {
      await logout();
    } catch (e) {
      console.error("Session termination error", e);
    }
    window.location.replace("/");
  };

  const handleEmbeddedPay = async () => {
    if (!username) {
      showToast("Identity Registration Required", "error");
      setActiveModal('register');
      return;
    }

    if (isPaying || !recipient || !amount || parseFloat(amount) <= 0) return;

    try {
      setIsPaying(true);
      const wallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
      const provider = await wallet.getEthereumProvider();
      
      let targetAddr = recipient.trim();
      const originalInput = recipient;
      
      if (targetAddr.startsWith('@')) {
         const cleanName = targetAddr.slice(1).toLowerCase().replace(/[^a-z0-9_]/g, "").trim();
         showToast("Verifying Destination Identity...", "info");
         const res = await publicClient?.readContract({
           address: REGISTRY_ADDRESS as `0x${string}`,
           abi: REGISTRY_ABI,
           functionName: 'resolveUsername',
           args: [cleanName]
         });
         
         if (!res || res === '0x0000000000000000000000000000000000000000') {
           showToast("Fraud Prevention: Invalid Identity", "error");
           setIsPaying(false);
           return;
         }
         targetAddr = res as string;
      }

      try {
        targetAddr = getAddress(targetAddr);
      } catch (e) {
        showToast("Malformed Destination Hash", "error");
        setIsPaying(false);
        return;
      }

      if (address && targetAddr.toLowerCase() === address.toLowerCase()) {
        showToast("Circular Settlement Blocked", "error");
        setIsPaying(false);
        return;
      }

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: wallet.address, to: targetAddr, value: '0x' + parseUnits(amount, 18).toString(16) }]
      });

      const history = JSON.parse(localStorage.getItem('arcpay_history') || '[]');
      history.push({ 
        from: wallet.address.toLowerCase(), 
        to: targetAddr.toLowerCase(), 
        amount, 
        hash: txHash, 
        date: new Date().toISOString() 
      });
      localStorage.setItem('arcpay_history', JSON.stringify(history));
      
      setReceiptData({ hash: txHash, amount, to: targetAddr, toUser: originalInput.startsWith('@') ? originalInput : null });
      setAmount('');
      setRecipient('');
      refetch();
      window.dispatchEvent(new Event('storage'));
      showToast("Settlement Confirmed");
    } catch (e) {
      showToast("Protocol Aborted by User", "error");
    } finally {
      setIsPaying(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#020408] flex flex-col items-center justify-center font-sans">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6">
          <div className="w-20 h-20 bg-blue-600/20 rounded-[35%] mx-auto flex items-center justify-center border border-blue-500/20 shadow-[0_0_50px_rgba(37,99,235,0.15)]">
             <Zap size={40} className="text-blue-500 animate-pulse" fill="currentColor"/>
          </div>
          <h1 className="text-2xl font-black italic tracking-widest text-white uppercase">ARCPAY <span className="text-blue-500">V2</span></h1>
          <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">ENCRYPTING SECURITY LAYERS...</p>
        </motion.div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#020408] flex items-center justify-center p-6 text-center text-white font-sans relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-600/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-sm w-full">
           <Zap size={60} fill="white" className="mx-auto mb-10 text-blue-600" />
           <h1 className="text-6xl font-black italic tracking-tighter uppercase mb-4 text-white">ArcPay <span className="text-blue-500 text-3xl not-italic">V2</span></h1>
           <div className="flex flex-col gap-4">
            <button onClick={login} className="w-full bg-white text-black py-5 rounded-[24px] font-black uppercase italic tracking-[0.1em] hover:scale-105 transition-all shadow-2xl">Sign Up</button>
            <button onClick={login} className="w-full bg-white/5 border border-white/10 text-white py-5 rounded-[24px] font-black uppercase italic tracking-[0.1em] hover:bg-white/10 transition-all">Log In</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020408] text-white flex overflow-hidden font-sans selection:bg-blue-600 leading-none">
      <Sidebar logout={handleLogout} onAction={(id) => {
          if(id === 'insights') {
            const el = document.getElementById('insights-section-anchor');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            setActiveModal(id);
          }
      }} />
      
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: -100, opacity: 0, x: '-50%' }} animate={{ y: 24, opacity: 1, x: '-50%' }} exit={{ y: -100, opacity: 0, x: '-50%' }} className="fixed top-0 left-1/2 z-[250] bg-slate-900 border border-white/10 backdrop-blur-xl px-8 py-4 rounded-[20px] shadow-3xl flex items-center gap-4 min-w-[300px]">
            <CheckCircle2 className="text-emerald-500" size={20}/><p className="text-[11px] font-black uppercase tracking-widest text-white">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 h-screen overflow-y-auto custom-scrollbar p-10 scroll-smooth">
        <div className="max-w-[1600px] mx-auto space-y-10 pb-24 leading-none text-left text-white font-sans">
          
          <div className="flex justify-between items-center leading-none">
            <div className="space-y-1 text-left">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1 italic opacity-50 text-left">PERMANENT ON-CHAIN IDENTITY</p>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-4 leading-none text-white text-left">
                {username ? (
                  <div className="flex items-center gap-3">
                    <span className="text-blue-400">@{username.toUpperCase()}</span>
                    <button onClick={() => {navigator.clipboard.writeText(`@${username}`); showToast("Identity Copied");}} className="p-2 bg-white/5 rounded-lg text-slate-600 hover:text-white transition-all"><Copy size={14}/></button>
                  </div>
                ) : <button onClick={() => setActiveModal('register')} className="bg-blue-600 text-white text-[10px] px-5 py-2.5 rounded-xl font-black tracking-widest flex items-center gap-2"><UserPlus size={14}/> CREATE ID</button>}
              </h1>
            </div>

            <div className="flex-1 max-w-md px-10">
               <div className="relative group">
                  <UserSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-500 transition-colors" size={18}/>
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGlobalSearch()} placeholder="Verify Arc Handle..." className="w-full bg-white/5 border border-white/5 p-4 pl-14 rounded-2xl text-[12px] font-bold outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-800 text-white" />
               </div>
            </div>

            <div className="bg-white/5 border border-white/5 p-5 rounded-[32px] flex items-center gap-6 backdrop-blur-3xl shadow-2xl">
               <button onClick={() => setActiveModal("scan")} className="p-2.5 bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 rounded-xl transition-all shadow-inner" title="Scan to Pay"><Scan size={18}/></button>
               <div className="text-left leading-none">
                 <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 text-left">BALANCE</p>
                 <p className="text-xl font-black italic leading-none">{usdcBalance} <span className="text-[10px] opacity-20 uppercase font-bold">USDC</span></p>
               </div>
               <button onClick={refetch} className="p-2.5 hover:bg-white/5 rounded-xl text-slate-500 transition-all ml-4"><RefreshCw size={18}/></button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8">
            <ActionCard icon={<Send size={24}/>} label="Settlement" desc="Identity P2P" color="bg-blue-600" onClick={() => setActiveModal('send')} />
            <ActionCard icon={<HandCoins size={24}/>} label="Invoice" desc="Protocol Request" color="bg-[#6b21ff]" onClick={() => setActiveModal('request')} />
            <ActionCard icon={<Download size={24}/>} label="Gateway" desc="On-Chain ID" color="bg-[#059669]" onClick={() => setActiveModal('receive')} />
          </div>

          <div className="grid grid-cols-12 gap-10 items-start pb-20 text-left">
             <div className="col-span-3 space-y-10">
                <div id="pay-section-anchor" className="bg-[#0c0e14] border border-white/5 rounded-[44px] p-10 space-y-8 shadow-3xl border-t-white/10 text-left leading-none">
                   <div className="flex items-center gap-2"><Lock size={12} className="text-slate-700"/><h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-500 italic font-black">PAY BY ID</h3></div>
                   <div className="space-y-8 text-white pt-4">
                      <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="@username..." className="w-full bg-black/40 border border-white/5 p-7 rounded-3xl text-[10px] font-mono outline-none focus:border-blue-500/40 text-white" />
                      <div className="relative leading-none">
                        <input type="text" inputMode="decimal" value={amount} onChange={e => { const val = e.target.value; if (val === '' || /^\d*.?\d*$/.test(val)) setAmount(val); }} placeholder="0.00" className="w-full bg-black/40 border border-white/5 p-7 rounded-3xl text-4xl font-black outline-none italic text-white" />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2"><button onClick={() => setAmount(usdcBalance)} className="text-[9px] font-black uppercase text-blue-500 bg-blue-500/10 px-2 py-1.5 rounded-lg">MAX</button></div>
                      </div>
                      <button disabled={isPaying || !recipient || !amount} onClick={handleEmbeddedPay} className="w-full bg-blue-600 py-3.5 rounded-2xl font-black uppercase italic tracking-widest shadow-xl hover:bg-blue-500 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-30">
                        {isPaying ? <Loader2 className="animate-spin" size={16}/> : <><Zap size={16} fill="white"/> CONFIRM PAY</>}
                      </button>
                   </div>
                </div>
                <Insights address={address || ""} />
             </div>
             
             <div className="col-span-9 space-y-10">
                <RequestHub address={address || ""} refetchBalance={refetch} />
                
                <div className="bg-[#0c0e14] border border-white/5 rounded-[44px] p-10 shadow-3xl text-center relative overflow-hidden border-t-white/10 flex justify-between items-center mt-10">
                   <div className="text-left space-y-4">
                      <h3 className="text-xl font-black uppercase italic text-white leading-none">Global Identity</h3>
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Receive instant USDC settlements.</p>
                      <div className="bg-black/40 p-5 rounded-3xl border border-white/5 cursor-pointer flex gap-4 items-center" onClick={() => {navigator.clipboard.writeText(address || ""); showToast("Hash Secured");}}>
                         <p className="text-[12px] font-mono text-slate-500 truncate w-64">{address}</p>
                         <Copy size={16} className="text-slate-700"/>
                      </div>
                   </div>
                   <div className="bg-white p-6 rounded-[48px] shadow-2xl border-[12px] border-black/5">
                      <QRCodeSVG value={address || '0x'} size={140} />
                   </div>
                </div>
             </div>
          </div>
        </div>
      </main>

      {/* ✅ NEW: Integrated Premium Notifications Modal */}
      <NotificationsModal 
        isOpen={activeModal === 'notifications'} 
        onClose={() => setActiveModal(null)} 
        notifications={notifications}
        onClear={clearNotifications}
      />

      <ReceiptModal isOpen={!!receiptData} onClose={() => setReceiptData(null)} data={receiptData} />
      <ContactsModal isOpen={activeModal === 'contacts'} onClose={() => setActiveModal(null)} showToast={showToast} refetchBalance={refetch} onPay={handlePayFromContact} onRequest={handleRequestFromContact} />
      <SendModal isOpen={activeModal === 'send'} onClose={() => setActiveModal(null)} refetchBalance={refetch} initialRecipient={recipient} onShowReceipt={(data: any) => setReceiptData(data)} />
      <RequestModal isOpen={activeModal === 'request'} onClose={() => setActiveModal(null)} userAddress={address || ""} onOpenRegister={() => setActiveModal('register')} onSent={() => refetch()} initialRecipient={recipient} onOpenContacts={() => setActiveModal('contacts')} />
      <ReceiveModal isOpen={activeModal === 'receive'} onClose={() => setActiveModal(null)} address={address || ""} username={username} />
      <RegisterModal isOpen={activeModal === 'register'} onClose={() => setActiveModal(null)} onRegistered={refetch} />
      <ScannerModal isOpen={activeModal === 'scan'} onClose={() => setActiveModal(null)} onScan={(data) => { setRecipient(data); setActiveModal(null); showToast("Target Located"); }} />
      <ProfileModal isOpen={activeModal === 'profile'} onClose={() => setActiveModal(null)} address={address || ""} username={username} showToast={showToast} />
      
      <SettingsModal 
        isOpen={activeModal === 'settings'} 
        onClose={() => setActiveModal(null)} 
        logout={handleLogout} 
        showToast={showToast} 
        userAddress={address || ""} 
      />
      
      <OutgoingModal isOpen={activeModal === 'outgoing'} onClose={() => setActiveModal(null)} address={address || ''} />
      <TransactionsModal 
        isOpen={activeModal === "transactions" || activeModal === "ledger" || activeModal === "history"} 
        onClose={() => setActiveModal(null)} 
        userAddress={address || ""} 
        onShowReceipt={(data: any) => setReceiptData(data)} 
      />
    </div>
  );
}

function ActionCard({ icon, label, desc, color, onClick }: any) {
  return (
    <div onClick={onClick} className={`${color} p-12 rounded-[56px] cursor-pointer hover:scale-[1.03] active:scale-95 transition-all group relative overflow-hidden shadow-3xl border border-white/5`}>
      <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:rotate-12 transition-all duration-1000">{icon}</div>
      <div className="w-16 h-16 bg-white/10 rounded-[22px] flex items-center justify-center mb-10 border border-white/10 shadow-inner">{icon}</div>
      <h4 className="text-2xl font-black uppercase tracking-widest mb-2 italic leading-none text-white text-left">{label}</h4>
      <p className="text-[12px] opacity-60 font-black uppercase tracking-widest text-white text-left leading-none">{desc}</p>
    </div>
  );
}