import { createPublicClient, http, parseAbi, fallback } from 'viem';
import { createClient } from '@supabase/supabase-js';

const REQUEST_ADDR = "0xb9049Fb1a9562cFb324977c3af29EbcE0a997B31";
const USDC_ADDR = "0x3600000000000000000000000000000000000000";

export async function GET() {
  const startTime = Date.now();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const client = createPublicClient({ 
    transport: fallback([
      http('https://rpc.testnet.arc.network'),
      http('https://rpc.drpc.testnet.arc.network')
    ]) 
  });

  try {
    const latestBlock = await client.getBlockNumber();

    // 1. Database se aakhri sync kiya hua block number uthao
    const { data: lastReq } = await supabase.from('payment_requests').select('block_number').order('block_number', { ascending: false }).limit(1).maybeSingle();
    const { data: lastTx } = await supabase.from('transactions').select('block_number').order('block_number', { ascending: false }).limit(1).maybeSingle();

    const lastSyncedBlock = BigInt(Math.max(
      Number(lastReq?.block_number || 0),
      Number(lastTx?.block_number || 0)
    ));

    // 2. Start point set karo (Agar bahut piche hai toh latest - 200 se start karo taaki crash na ho)
    let currentBlock = lastSyncedBlock > 0n ? lastSyncedBlock + 1n : latestBlock - 200n;
    
    // Safety Jump: Agar indexer 2000 blocks piche reh gaya hai, toh jump to tip
    if (latestBlock - currentBlock > 2000n) currentBlock = latestBlock - 200n;

    let totalReqs = 0;
    let totalTxs = 0;
    const CHUNK_SIZE = 50n; // Chota chunk taaki data size limit cross na ho

    // 3. Sync Loop (Max 8 seconds chalega)
    while (currentBlock <= latestBlock && (Date.now() - startTime) < 8000) {
      let toBlock = currentBlock + CHUNK_SIZE > latestBlock ? latestBlock : currentBlock + CHUNK_SIZE;

      const [reqLogs, txLogs] = await Promise.all([
        client.getContractEvents({
          address: REQUEST_ADDR,
          abi: parseAbi(['event RequestCreated(uint256 indexed id, address indexed requester, address indexed payer, uint256 amount, string requesterUsername, string note)']),
          eventName: 'RequestCreated', fromBlock: currentBlock, toBlock
        }),
        client.getContractEvents({
          address: USDC_ADDR,
          abi: parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']),
          eventName: 'Transfer', fromBlock: currentBlock, toBlock
        })
      ]);

      const timestamp = Math.floor(Date.now() / 1000);

      // Save Requests
      if (reqLogs.length > 0) {
        const rows = reqLogs.map(l => ({
          hash: l.transactionHash.toLowerCase(), logindex: l.logIndex,
          from_addr: l.args.requester.toLowerCase(), to_addr: l.args.payer.toLowerCase(),
          amount: l.args.amount.toString(), block_number: l.blockNumber.toString(),
          timestamp, status: 'Pending', request_id: l.args.id.toString(), username: l.args.requesterUsername
        }));
        await supabase.from('payment_requests').upsert(rows, { onConflict: 'hash,logindex' });
        totalReqs += reqLogs.length;
      }

      // Save Transactions (TX History)
      if (txLogs.length > 0) {
        const rows = txLogs.map(l => ({
          hash: l.transactionHash.toLowerCase(), logindex: l.logIndex,
          from_addr: l.args.from.toLowerCase(), to_addr: l.args.to.toLowerCase(),
          amount: l.args.value.toString(), block_number: l.blockNumber.toString(),
          timestamp, event_name: 'Transfer', contract_type: 'OFFICIAL_USDC', status: 'Confirmed'
        }));
        await supabase.from('transactions').upsert(rows, { onConflict: 'hash,logindex' });
        totalTxs += txLogs.length;
      }

      currentBlock = toBlock + 1n;
    }

    return Response.json({ 
      success: true, 
      synced_upto: (currentBlock - 1n).toString(),
      new_requests: totalReqs, 
      new_transfers: totalTxs,
      time: `${Date.now() - startTime}ms`
    });

  } catch (err) {
    console.error("Critical Indexer Error:", err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}