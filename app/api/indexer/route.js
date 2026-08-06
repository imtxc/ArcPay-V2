import { createPublicClient, http, parseAbi } from 'viem';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000"; 
const REGISTRY_ADDRESS = "0x4Dcfb92822EdC76c98879023A05fD9a65FAA6041";
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
    address: REQUEST_ADDRESS,
    abi: parseAbi(['event RequestCreated(bytes32 indexed requestId, address indexed payee, uint256 amount)']),
    eventName: 'RequestCreated'
  }
];

export async function GET(request) {
  try {
    const client = createPublicClient({
      transport: http('https://rpc.testnet.arc.network')
    });

    const { data: lastTx } = await supabase
      .from('transactions')
      .select('blockNumber')
      .order('blockNumber', { ascending: false })
      .limit(1)
      .single();

    let currentBlock = lastTx?.blockNumber ? BigInt(lastTx.blockNumber) : 0n;
    const latestBlock = await client.getBlockNumber();
    if (currentBlock === 0n) currentBlock = latestBlock - 50n;

    if (currentBlock < latestBlock) {
      for (const contract of CONTRACTS) {
        const logs = await client.getContractEvents({
          address: contract.address,
          abi: contract.abi,
          eventName: contract.eventName,
          fromBlock: currentBlock,
          toBlock: latestBlock
        });

        for (const log of logs) {
          const block = await client.getBlock({ blockNumber: log.blockNumber });
          
          const from = log.args.from || log.args.payee || log.args.wallet || "0x0";
          const to = log.args.to || contract.address;
          const amount = log.args.value || log.args.amount || 0n;

          await supabase.from('transactions').upsert({
            hash: log.transactionHash,
            logIndex: log.logIndex,
            from_addr: from,
            to_addr: to,
            amount: amount.toString(),
            blockNumber: log.blockNumber.toString(),
            timestamp: Number(block.timestamp)
          }, { onConflict: 'hash, logIndex' });
        }
      }
    }

    return Response.json({ success: true, message: "Indexed successfully!" });
  } catch (err) {
    console.error("Indexing error:", err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}