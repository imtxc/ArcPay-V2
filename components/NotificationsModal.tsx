'use client';
import { X, Bell, Shield, Trash2, CheckCircle2, AlertCircle, Info, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: number;
  msg: string;
  type: string;
  time: string;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onClear: () => void;
}

export default function NotificationsModal({ isOpen, onClose, notifications, onClear }: NotificationsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 font-sans leading-none">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
      />

      {/* Modal Content */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-[#0c0e14] border border-white/10 rounded-[44px] shadow-3xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        {/* Premium Header */}
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/10">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">System Logs</h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Security & Activity Monitor</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-all hover:bg-white/5 rounded-xl">
            <X size={20} />
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
          <AnimatePresence mode='popLayout'>
            {notifications.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="py-20 text-center space-y-4 opacity-20"
              >
                <Bell size={48} className="mx-auto text-slate-500" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Zero Encrypted Logs</p>
              </motion.div>
            ) : (
              notifications.map((n) => (
                <motion.div 
                  layout
                  key={n.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group p-5 bg-white/[0.03] border border-white/5 rounded-[28px] flex items-start gap-4 hover:bg-white/[0.05] transition-all hover:border-white/10"
                >
                  <div className={`mt-1 flex-shrink-0 ${
                    n.type === 'error' ? 'text-rose-500' : 
                    n.type === 'success' ? 'text-emerald-500' : 'text-blue-500'
                  }`}>
                    {n.type === 'error' ? <AlertCircle size={16}/> : 
                     n.type === 'success' ? <CheckCircle2 size={16}/> : <Info size={16}/>}
                  </div>
                  
                  <div className="flex-1 space-y-1.5 overflow-hidden">
                    <p className="text-[11px] font-black text-slate-200 uppercase italic leading-tight break-words">
                      {n.msg}
                    </p>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock size={10} />
                      <span className="text-[8px] font-bold uppercase tracking-tighter">{n.time}</span>
                      <span className="text-[8px] px-1.5 py-0.5 bg-white/5 rounded-md text-[7px]">VERIFIED</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        {notifications.length > 0 && (
          <div className="p-6 bg-black/40 border-t border-white/5">
            <button 
              onClick={onClear}
              className="w-full py-4 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-all group"
            >
              <Trash2 size={14} className="group-hover:animate-bounce" />
              Clear All Security Logs
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}