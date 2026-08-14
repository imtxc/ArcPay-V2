'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { getAddress } from 'viem';
import {
  REGISTRY_ADDRESS,
  REGISTRY_ABI,
  REQUEST_ADDRESS,
  REQUEST_ABI
} from '@/lib/constants';

import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  ExternalLink,
  Inbox,
  ShieldCheck
} from 'lucide-react';

type RequestItem = {
  hash: string;
  amount: string;
  from_addr: string;
  to_addr: string;
  request_id: string | null;
  displayUser?: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  timestamp: number;
  statusLabel?: string;
  signedAmount?: string;
};

export default function OutgoingRequests({ address }: { address: string }) {
  const [outgoing, setOutgoing] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(false)

  const nameCache = useRef<Record<string, string>>({})
  const publicClient = usePublicClient()

  const resolveUsername = useCallback(
    async (wallet: string) => {
      const normalized = getAddress(wallet)
      if (nameCache.current[normalized]) return nameCache.current[normalized]

      try {
        const name = (await publicClient?.readContract({
          address: REGISTRY_ADDRESS as `0x${string}`,
          abi: REGISTRY_ABI,
          functionName: 'getUsername',
          args: [normalized]
        })) as string

        nameCache.current[normalized] = name
          ? `@${name.toUpperCase()}`
          : `${normalized.slice(0, 6)}...${normalized.slice(-4)}`
      } catch {
        nameCache.current[normalized] = `${normalized.slice(0, 6)}...${normalized.slice(-4)}`
      }
      return nameCache.current[normalized]
    },
    [publicClient]
  )

  const fetchStatusAndNames = useCallback(async () => {
    if (!address || !publicClient) return

    try {
      setLoading(true)
      const res = await fetch(`/api/outgoing?address=${address.toLowerCase()}&t=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json()

      if (!data?.requests || data.requests.length === 0) {
        setOutgoing([])
        return
      }

      const currentUser = getAddress(address).toLowerCase()

      const enriched = await Promise.all(
        data.requests.map(async (req: any) => {
          const fromAddr = getAddress(req.from_addr).toLowerCase()
          const toAddr = getAddress(req.to_addr).toLowerCase()
          
          // Identify if I am the one requesting money
          const isRequester = fromAddr === currentUser
          const otherUser = isRequester ? toAddr : fromAddr
          const username = await resolveUsername(otherUser)

          let liveStatus: 'Pending' | 'Accepted' | 'Rejected' = 'Pending'
          
          // Initial Status Labels
          let statusLabel = isRequester ? `Requested from ${username}` : `Requested by ${username}`
          let signedAmount = req.amount // Default no sign

          if (req.request_id) {
            try {
              const details: any = await publicClient.readContract({
                address: REQUEST_ADDRESS as `0x${string}`,
                abi: REQUEST_ABI,
                functionName: 'getRequestDetails',
                args: [BigInt(req.request_id)]
              })

              const s = Number(details.status)
              liveStatus = s === 0 ? 'Pending' : s === 1 ? 'Accepted' : 'Rejected'

              if (liveStatus === 'Accepted') {
                statusLabel = isRequester ? `Accepted by ${username}` : `Paid to ${username}`
                // LOGIC: If I requested (+), If I was asked to pay (-)
                signedAmount = isRequester ? `+${req.amount}` : `-${req.amount}`
              }

              if (liveStatus === 'Rejected') {
                statusLabel = isRequester ? `Rejected by ${username}` : `Declined request from ${username}`
                signedAmount = req.amount
              }
            } catch (e) {
              console.error('Live status check failed:', req.request_id, e)
            }
          }

          return {
            ...req,
            displayUser: username,
            status: liveStatus,
            statusLabel,
            signedAmount
          }
        })
      )

      setOutgoing(enriched.sort((a, b) => b.timestamp - a.timestamp))
    } catch (err) {
      console.error('Outgoing monitor error:', err)
    } finally {
      setLoading(false)
    }
  }, [address, publicClient, resolveUsername])

  useEffect(() => {
    fetchStatusAndNames()
    const interval = setInterval(fetchStatusAndNames, 5000) // 5s is safer
    return () => clearInterval(interval)
  }, [fetchStatusAndNames])

  return (
    <div className="flex flex-col h-full font-sans leading-none overflow-hidden">
      <div className="flex justify-between items-center mb-6 px-10 pt-6">
        <div>
          <h3 className="text-sm font-black uppercase italic tracking-[0.2em] text-blue-500">Sent Monitor</h3>
          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1">Real-time Request Tracking</p>
        </div>
        <button onClick={fetchStatusAndNames} disabled={loading} className="p-2.5 bg-blue-600/10 text-blue-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all active:scale-90">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-10 pb-10 space-y-4">
        {outgoing.length === 0 && !loading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center space-y-6 opacity-20">
            <Inbox size={48} />
            <p className="text-xs font-black uppercase tracking-widest">No Outgoing Requests</p>
          </div>
        ) : (
          outgoing.map((req, i) => (
            <div key={`${req.hash}-${i}`} className="bg-white/5 border border-white/10 p-6 rounded-[36px] flex justify-between items-center">
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-2">
                  <ArrowUpRight size={14} className="text-blue-500" />
                  <p className="text-base font-black uppercase italic text-white">{req.displayUser}</p>
                </div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">{req.statusLabel}</p>
                <div className="flex items-center gap-3">
                  <p className={`text-2xl font-black italic ${
                      req.signedAmount?.startsWith('+') ? 'text-emerald-400' : 
                      req.signedAmount?.startsWith('-') ? 'text-rose-400' : 'text-slate-300'
                    }`}>
                    {req.signedAmount}
                    <span className="text-[10px] opacity-30 font-bold uppercase ml-1">USDC</span>
                  </p>
                  <a href={`https://testnet.arcscan.app/tx/${req.hash}`} target="_blank" rel="noopener noreferrer" className="text-[8px] bg-white/5 px-2 py-1.5 rounded-lg text-blue-400 font-black uppercase hover:bg-blue-600 hover:text-white transition-all border border-white/5 flex items-center gap-1">
                    Proof <ExternalLink size={8} />
                  </a>
                </div>
              </div>
              <div className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 border ${
                  req.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                  req.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                  'bg-rose-500/10 text-rose-500 border-rose-500/20'
                }`}>
                {req.status === 'Pending' ? <Clock size={14} /> : req.status === 'Accepted' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {req.status}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}