import { createPublicClient, http, parseAbi, fallback } from 'viem';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const client = createPublicClient({ transport: fallback([http('https://rpc.testnet.arc.network')]) });

  try {
    const latestBlock = await client.getBlockNumber();
    // Scan LAST 5000 blocks to find EVERYTHING you missed
    let fromBlock = latestBlock - 5000n; 
    let toBlock = latestBlock;

    const [reqLogs, txLogs] = await Promise.all([
      client.getContractEvents({
        address: "0xb9049Fb1a9562cFb324977c3af29EbcE0a997B31",
        abi: parseAbi(['event RequestCreated(uint256 indexed id, address indexed requester, address indexed payer, uint256 amount, string requesterUsername, string note)']),
        eventName: 'RequestCreated', fromBlock, toBlock
      }),
      client.getContractEvents({
        address: "0x3600000000000000000000000000000000000000",
        abi: parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']),
        eventName: 'Transfer', fromBlock, toBlock
      })
    ]);

    const timestamp = Math.floor(Date.now() / 1000);

    if (reqLogs.length > 0) {
      const rows = reqLogs.map(l => ({
        hash: l.transactionHash.toLowerCase(), logindex: l.logIndex,
        from_addr: l.args.requester.toLowerCase(), to_addr: l.args.payer.toLowerCase(),
        amount: l.args.amount.toString(), block_number: l.blockNumber.toString(),
        timestamp, status: 'Pending', request_id: l.args.id.toString(), username: l.args.requesterUsername
      }));
      await supabase.from('payment_requests').upsert(rows, { onConflict: 'hash,logindex' });
    }

    if (txLogs.length > 0) {
      const rows = txLogs.map(l => ({
        hash: l.transactionHash.toLowerCase(), logindex: l.logIndex,
        from_addr: l.args.from.toLowerCase(), to_addr: l.args.to.toLowerCase(),
        amount: l.args.value.toString(), block_number: l.blockNumber.toString(),
        timestamp, event_name: 'Transfer', contract_type: 'OFFICIAL_USDC', status: 'Confirmed'
      }));
      await supabase.from('transactions').upsert(rows, { onConflict: 'hash,logindex' });
    }

    return Response.json({ success: true, reqFound: reqLogs.length, txFound: txLogs.length });
  } catch (err) {
    return Response.json({ error: err.message });
  }
}