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
ArrowDownLeft,
Clock,
CheckCircle2,
XCircle,
Loader2,
RefreshCw,
ShieldCheck,
Inbox
} from 'lucide-react';

type IncomingRequest = {
hash: string;
amount: string;
from_addr: string;
to_addr: string;
request_id: string | null;
displayUser?: string;
status: 'Pending' | 'Accepted' | 'Rejected';
timestamp: number;
};

export default function PaymentRequests({ address }: { address: string }) {
const [requests, setRequests] = useState<IncomingRequest[]>([]);
const [loading, setLoading] = useState(false);
const [processing, setProcessing] = useState<string | null>(null);

const nameCache = useRef<Record<string, string>>({});
const publicClient = usePublicClient();

const resolveUsername = useCallback(
async (wallet: string) => {
const normalized = getAddress(wallet);

  if (nameCache.current[normalized]) {
    return nameCache.current[normalized];
  }

  try {
    const name = (await publicClient?.readContract({
      address: REGISTRY_ADDRESS as `0x${string}`,
      abi: REGISTRY_ABI,
      functionName: 'getUsername',
      args: [normalized]
    })) as string;

    nameCache.current[normalized] = name
      ? `@${name.toUpperCase()}`
      : `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
  } catch {
    nameCache.current[normalized] =
      `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
  }

  return nameCache.current[normalized];
},
[publicClient]

);

const fetchIncoming = useCallback(async () => {
if (!address || !publicClient) return;

try {
  setLoading(true);

  // NOTE:
  // Ye endpoint tumhare backend mein hona chahiye.
  // Agar naam alag hai to mujhe bata dena.
  const res = await fetch(
    `/api/payment-requests?address=${address.toLowerCase()}`
  );

  const data = await res.json();

  if (!data?.requests) {
    setRequests([]);
    return;
  }

  const enriched = await Promise.all(
    data.requests.map(async (req: any) => {
      const sender = getAddress(req.from_addr);

      const username = await resolveUsername(sender);

      let liveStatus: 'Pending' | 'Accepted' | 'Rejected' = 'Pending';

      if (req.request_id) {
        try {
          const details: any = await publicClient.readContract({
            address: REQUEST_ADDRESS as `0x${string}`,
            abi: REQUEST_ABI,
            functionName: 'getRequestDetails',
            args: [BigInt(req.request_id)]
          });

          const s = Number(details.status);

          liveStatus =
            s === 0 ? 'Pending' : s === 1 ? 'Accepted' : 'Rejected';
        } catch (e) {
          console.error('Incoming status check failed:', e);
        }
      }

      return {
        ...req,
        displayUser: username,
        status: liveStatus
      };
    })
  );

  enriched.sort((a, b) => b.timestamp - a.timestamp);

  setRequests(enriched);
} catch (err) {
  console.error('Incoming requests error:', err);
} finally {
  setLoading(false);
}

}, [address, publicClient, resolveUsername]);

useEffect(() => {
fetchIncoming();

const interval = setInterval(fetchIncoming, 5000);

return () => clearInterval(interval);

}, [fetchIncoming]);

const handleAction = async (
requestId: string,
action: 'accept' | 'reject'
) => {
try {
setProcessing(requestId);

  const res = await fetch(`/api/request/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requestId
    })
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.error || 'Action failed');
  }

  // Refresh list
  await fetchIncoming();
} catch (err) {
  console.error(`${action} failed:`, err);
  alert(`Failed to ${action} request`);
} finally {
  setProcessing(null);
}

};

return (
<div className="bg-[#0f172a]/20 border border-white/5 backdrop-blur-xl rounded-[40px] p-8 mt-10">
{/* Header */}
<div className="flex justify-between items-center mb-8">
<h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
Payment Requests
</h3>

    <div className="flex items-center gap-3">
      <span className="text-[10px] text-blue-500 font-bold uppercase bg-blue-500/10 px-3 py-1 rounded-full">
        Incoming
      </span>

      <button
        onClick={fetchIncoming}
        disabled={loading}
        className="p-2 rounded-xl bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white transition-all"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <RefreshCw size={14} />
        )}
      </button>
    </div>
  </div>

  {/* Empty State */}
  {requests.length === 0 && !loading ? (
    <div className="py-16 text-center border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 opacity-30">
      <Inbox size={36} />

      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
        No Pending Requests
      </p>
    </div>
  ) : (
    <div className="space-y-4">
      {requests.map((req, i) => (
        <div
          key={`${req.hash}-${i}`}
          className="bg-white/5 border border-white/10 rounded-[32px] p-6 flex justify-between items-center hover:bg-white/[0.08] transition-all"
        >
          {/* Left */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ArrowDownLeft size={16} className="text-emerald-400" />

              <p className="text-white font-black uppercase italic text-sm">
                {req.displayUser}
              </p>
            </div>

            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">
              Requesting payment from you
            </p>

            <p className="text-2xl font-black italic text-rose-400 leading-none">
              -{req.amount}

              <span className="text-[10px] opacity-40 uppercase ml-1">
                USDC
              </span>
            </p>
          </div>

          {/* Right */}
          <div className="flex flex-col items-end gap-3">
            {/* Status badge */}
            <div
              className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 border ${
                req.status === 'Pending'
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  : req.status === 'Accepted'
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
              }`}
            >
              {req.status === 'Pending' ? (
                <Clock size={12} />
              ) : req.status === 'Accepted' ? (
                <CheckCircle2 size={12} />
              ) : (
                <XCircle size={12} />
              )}

              {req.status}
            </div>

            {/* Action buttons */}
            {req.status === 'Pending' && req.request_id && (
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleAction(req.request_id!, 'reject')
                  }
                  disabled={processing === req.request_id}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white text-[10px] font-black uppercase transition-all disabled:opacity-50"
                >
                  Reject
                </button>

                <button
                  onClick={() =>
                    handleAction(req.request_id!, 'accept')
                  }
                  disabled={processing === req.request_id}
                  className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white text-[10px] font-black uppercase transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {processing === req.request_id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={12} />
                  )}

                  Accept
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )}

  {/* Footer */}
  <div className="mt-8 pt-6 border-t border-white/5 text-center flex items-center justify-center gap-2 opacity-10">
    <ShieldCheck size={10} />

    <p className="text-[7px] font-black uppercase tracking-[0.3em]">
      Incoming Request Monitor
    </p>
  </div>
</div>

);
}