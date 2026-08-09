import { createPublicClient, http, parseAbi, fallback } from 'viem';
import { createClient } from '@supabase/supabase-js';

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000"; 
const REGISTRY_ADDRESS = "0xb8ed4694c316492D824C735b26B48358ecf5377d";
const REQUEST_ADDRESS = "0xb9049Fb1a9562cFb324977c3af29EbcE0a997B31";

const CONTRACTS = [
  { name: 'USDC', address: USDC_ADDRESS, abi: parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']), eventName: 'Transfer' },
  { name: 'Registry', address: REGISTRY_ADDRESS, abi: parseAbi(['event UsernameRegistered(address indexed wallet, string username)']), eventName: 'UsernameRegistered' },
  { name: 'PaymentRequest', address: REQUEST_ADDRESS, abi: parseAbi(['event RequestCreated(uint256 indexed id, address indexed requester, address indexed payer, uint256 amount, string requesterUsername, string note)']), eventName: 'RequestCreated' },
  { name: 'ArcPay Protocol', address: REQUEST_ADDRESS, abi: parseAbi(['event PaymentSent(address indexed from, address indexed to, uint256 amount, string _reference)']), eventName: 'PaymentSent' }
];

export async function GET(request) {
  const startTime = Date.now();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return Response.json({ error: "Config missing" }, { status: 500 });

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const client = createPublicClient({
      transport: fallback([http('https://rpc.testnet.arc.network'), http('https://rpc.drpc.testnet.arc.network')])
    });

    // maybeSingle use karein taaki empty table par crash na ho
    const { data: lastTx } = await supabase.from('transactions').select('block_number').order('block_number', { ascending: false }).limit(1).maybeSingle();
    const latestBlock = await client.getBlockNumber();
    
    let current = lastTx?.block_number ? BigInt(lastTx.block_number) + 1n : latestBlock - BigInt(20000);
    if (current < 0n) current = 0n;

    let totalSynced = 0;
    const CHUNK_SIZE = 5000n;

    while (current <= latestBlock) {
      if (Date.now() - startTime > 8500) break; // Timeout Guard

      const toBlock = (current + CHUNK_SIZE > latestBlock) ? latestBlock : current + CHUNK_SIZE;

      for (const contract of CONTRACTS) {
        try {
          const logs = await client.getContractEvents({
            address: contract.address, abi: contract.abi, eventName: contract.eventName, fromBlock: current, toBlock: toBlock
          });

          for (const log of logs) {
            const args = log.args;
            let from = "0x0", to = "0x0", amount = "0";

            if (contract.eventName === 'Transfer') { from = args.from; to = args.to; amount = args.value?.toString(); }
            else if (contract.eventName === 'RequestCreated') { from = args.requester; to = args.payer; amount = args.amount?.toString(); }
            else if (contract.eventName === 'PaymentSent') { from = args.from; to = args.to; amount = args.amount?.toString(); }
            else if (contract.eventName === 'UsernameRegistered') { from = args.wallet; to = REGISTRY_ADDRESS; }

            // DB columns are lowercase now
            const { error: upsertError } = await supabase.from('transactions').upsert({
              hash: log.transactionHash,
              logindex: log.logIndex, 
              from_addr: from?.toLowerCase() || "0x0",
              to_addr: to?.toLowerCase() || "0x0",
              amount: amount || "0",
              block_number: log.blockNumber.toString(),
              timestamp: Math.floor(Date.now() / 1000),
              event_name: contract.eventName
            }, { onConflict: 'hash, logindex' });

            if (!upsertError) totalSynced++;
          }
        } catch (e) { console.error("Batch Error", e.message); }
      }
      current = toBlock + 1n;
    }

    return Response.json({ success: true, synced: totalSynced });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}