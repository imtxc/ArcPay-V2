// @ts-nocheck
const { createPublicClient, http, parseAbi } = require('viem');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// Tere contracts ke addresses (Constants se uthaye hue)
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

async function startIndexer() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      hash TEXT,
      logIndex INTEGER,
      from_addr TEXT,
      to_addr TEXT,
      amount TEXT,
      blockNumber TEXT,
      timestamp INTEGER,
      PRIMARY KEY (hash, logIndex)
    )
  `);

  const client = createPublicClient({
    transport: http('https://rpc.testnet.arc.network')
  });

  console.log("🚀 Multi-Contract Indexer background me start ho gaya hai...");

  let lastCheckedBlock = await db.get("SELECT MAX(CAST(blockNumber AS INTEGER)) as maxBlock FROM transactions");
  let currentBlock = lastCheckedBlock?.maxBlock ? BigInt(lastCheckedBlock.maxBlock) : 0n;

  setInterval(async () => {
    try {
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
            
            // Extracting generic fields safely based on event type
            const from = log.args.from || log.args.payee || log.args.wallet || "0x0";
            const to = log.args.to || contract.address;
            const amount = log.args.value || log.args.amount || 0n;

            await db.run(
              `INSERT OR IGNORE INTO transactions (hash, logIndex, from_addr, to_addr, amount, blockNumber, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [log.transactionHash, log.logIndex, from, to, amount.toString(), log.blockNumber.toString(), Number(block.timestamp)]
            );
            console.log(`📥 Saved [${contract.eventName}] Tx: ${log.transactionHash}`);
          }
        }
        currentBlock = latestBlock + 1n;
      }
    } catch (err) {
      console.error("Indexing error:", err.message);
    }
  }, 5000);
}

startIndexer();