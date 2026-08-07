import { createPublicClient, http, parseAbi } from 'viem';
import { createClient } from '@supabase/supabase-js';

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000"; 
const REGISTRY_ADDRESS = "0x4Dcfb92822EdC76c98879023A05fd9a65FAA6041";
const REQUEST_ADDRESS = "0x73D554E9A6D531c11829D13e2157B43603808022";

const CONTRACTS = [
  {
    address: USDC_ADDRESS,
    abi: parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']),
    eventName: 'Transfer'
  },
  {
    address: REGISTRY_ADDRESS,
    abi: parseAbi(['event UsernameRegistered(address indexed wallet, string username)']),
    eventName: 'UsernameRegistered'
  },
  {
    // FIX: Updated to match your actual contract event arguments
    address: REQUEST_ADDRESS,
    abi: parseAbi(['event RequestCreated(uint256 indexed id, address indexed requester, address indexed payer, uint256 amount)']),
    eventName: 'RequestCreated'
  }
];

export async function GET(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ success: false, error: "Supabase credentials missing" }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const client = createPublicClient({
      transport: http('https://rpc.testnet.arc.network')
    });

    // 1. Get the last indexed block from database
    const { data: lastTx } = await supabase
      .from('transactions')
      .select('blockNumber')
      .order('blockNumber', { ascending: false })
      .limit(1)
      .single();

    const latestBlock = await client.getBlockNumber();
    
    // FIX: Initial range badha kar 5000 blocks kar di hai (Approx 1-2 hours of history)
    let fromBlock = lastTx?.blockNumber ? BigInt(lastTx.blockNumber) : latestBlock - BigInt(5000);
    if (fromBlock < 0n) fromBlock = 0n;

    let totalSynced = 0;

    if (fromBlock < latestBlock) {
      for (const contract of CONTRACTS) {
        const logs = await client.getContractEvents({
          address: contract.address,
          abi: contract.abi,
          eventName: contract.eventName,
          fromBlock: fromBlock,
          toBlock: latestBlock
        });

        for (const log of logs) {
          // Identify parties based on event type
          let from = "0x0";
          let to = "0x0";
          let amount = "0";

          if (contract.eventName === 'Transfer') {
            from = log.args.from;
            to = log.args.to;
            amount = log.args.value.toString();
          } else if (contract.eventName === 'RequestCreated') {
            from = log.args.requester;
            to = log.args.payer;
            amount = log.args.amount.toString();
          } else if (contract.eventName === 'UsernameRegistered') {
            from = log.args.wallet;
            to = REGISTRY_ADDRESS;
          }

          // Use upsert to avoid duplicates
          const { error: upsertError } = await supabase.from('transactions').upsert({
            hash: log.transactionHash,
            logIndex: log.logIndex,
            from_addr: from?.toLowerCase(),
            to_addr: to?.toLowerCase(),
            amount: amount,
            blockNumber: log.blockNumber.toString(),
            timestamp: Math.floor(Date.now() / 1000) // Fallback to current time if block fetch is slow
          }, { onConflict: 'hash, logIndex' });

          if (!upsertError) totalSynced++;
        }
      }
    }

    return Response.json({ 
      success: true, 
      message: `Sync complete! Found ${totalSynced} new events.`,
      range: `${fromBlock.toString()} to ${latestBlock.toString()}`
    });

  } catch (err) {
    console.error("Indexing error:", err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}