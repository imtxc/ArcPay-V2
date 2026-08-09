import { createPublicClient, http, parseAbi, fallback } from 'viem';
import { createClient } from '@supabase/supabase-js';

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000"; 
const REGISTRY_ADDRESS = "0xb8ed4694c316492D824C735b26B48358ecf5377d";
const REQUEST_ADDRESS = "0xb9049Fb1a9562cFb324977c3af29EbcE0a997B31";

const CONTRACTS = [
  { name: 'USDC', address: USDC_ADDRESS, abi: parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']), eventName: 'Transfer' },
  { name: 'Registry', address: REGISTRY_ADDRESS, abi: parseAbi(['event UsernameRegistered(address indexed wallet, string username)']), eventName: 'UsernameRegistered' },
  { name: 'PaymentRequest', address: REQUEST_ADDRESS, abi: parseAbi(['event RequestCreated(uint256 indexed id, address indexed requester, address indexed payer, uint256 amount, string requesterUsername, string note)']), eventName: 'RequestCreated' },
  { 
    name: 'ArcPay Protocol', 
    address: REQUEST_ADDRESS, 
    abi: parseAbi(['event PaymentSent(address indexed from, address indexed to, uint256 amount, string _reference)']), 
    eventName: 'PaymentSent' 
  }
]; // <--- Yahan array close hona zaroori hai

export async function GET(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return Response.json({ error: "Config missing" }, { status: 500 });

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const client = createPublicClient({
      chain: { id: 5042002, name: 'Arc' },
      transport: fallback([
        http('https://rpc.testnet.arc.network'),
        http('https://rpc.drpc.testnet.arc.network'),
        http('https://5042002.rpc.thirdweb.com')
      ], { rank: true })
    });

    const { data: lastTx } = await supabase.from('transactions').select('blockNumber').order('blockNumber', { ascending: false }).limit(1).maybeSingle();
    const latestBlock = await client.getBlockNumber();
    
    let targetFromBlock = lastTx?.blockNumber ? BigInt(lastTx.blockNumber) + 1n : latestBlock - BigInt(100000);
    if (targetFromBlock < 0n) targetFromBlock = 0n;

    let totalSynced = 0;
    const CHUNK_SIZE = 15000n; 

    for (let current = targetFromBlock; current < latestBlock; current += CHUNK_SIZE) {
      const toBlock = (current + CHUNK_SIZE > latestBlock) ? latestBlock : current + CHUNK_SIZE;
      for (const contract of CONTRACTS) {
        try {
          const logs = await client.getContractEvents({
            address: contract.address,
            abi: contract.abi,
            eventName: contract.eventName,
            fromBlock: current,
            toBlock: toBlock
          });
          for (const log of logs) {
            const args = log.args;
            let from = "0x0", to = "0x0", amount = "0";
            if (contract.eventName === 'Transfer') { from = args.from; to = args.to; amount = args.value?.toString(); }
            else if (contract.eventName === 'RequestCreated') { from = args.requester; to = args.payer; amount = args.amount?.toString(); }
            else if (contract.eventName === 'PaymentSent') { from = args.from; to = args.to; amount = args.amount?.toString(); }
            else if (contract.eventName === 'UsernameRegistered') { from = args.wallet; to = REGISTRY_ADDRESS; }

            const { error: upsertError } = await supabase.from('transactions').upsert({
              hash: log.transactionHash,
              logIndex: log.logIndex,
              from_addr: from?.toLowerCase() || "0x0",
              to_addr: to?.toLowerCase() || "0x0",
              amount: amount || "0",
              blockNumber: log.blockNumber.toString(),
              timestamp: Math.floor(Date.now() / 1000),
              eventName: contract.eventName
            }, { onConflict: 'hash, logIndex' });
            if (!upsertError) totalSynced++;
          }
        } catch (e) { }
      }
      if (totalSynced > 500) break; 
    }
    return Response.json({ success: true, synced: totalSynced });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}