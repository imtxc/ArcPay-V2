// @ts-nocheck
const { createPublicClient, http, parseAbi, fallback } = require('viem');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// ✅ Sahi Contract Addresses
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000"; 
const REGISTRY_ADDRESS = "0xb8ed4694c316492D824C735b26B48358ecf5377d";
const REQUEST_ADDRESS = "0xb9049Fb1a9562cFb324977c3af29EbcE0a997B31";

const CONTRACTS = [
  { name: 'USDC', address: USDC_ADDRESS, abi: parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']), eventName: 'Transfer' },
  { name: 'Registry', address: REGISTRY_ADDRESS, abi: parseAbi(['event UsernameRegistered(address indexed wallet, string username)']), eventName: 'UsernameRegistered' },
  { name: 'PaymentRequest', address: REQUEST_ADDRESS, abi: parseAbi(['event RequestCreated(uint256 indexed id, address indexed requester, address indexed payer, uint256 amount, string requesterUsername, string note)']), eventName: 'RequestCreated' },
  { name: 'PaymentRequest', address: REQUEST_ADDRESS, abi: parseAbi(['event DirectPaymentSent(address indexed from, address indexed to, uint256 amount)']), eventName: 'DirectPaymentSent' }
];

async function startIndexer() {
  const db = await open({ filename: './database.sqlite', driver: sqlite3.Database });

  // Table structure with 'eventName' to identify different actions
  await db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      hash TEXT,
      logIndex INTEGER,
      from_addr TEXT,
      to_addr TEXT,
      amount TEXT,
      blockNumber TEXT,
      timestamp INTEGER,
      eventName TEXT,
      PRIMARY KEY (hash, logIndex)
    )
  `);

  // ✅ MULTI-RPC FALLBACK: Ek RPC busy ho toh dusra kaam karega
  const client = createPublicClient({
    transport: fallback([
      http('https://rpc.testnet.arc.network'),
      http('https://rpc.drpc.testnet.arc.network'),
      http('https://5042002.rpc.thirdweb.com')
    ], { rank: true })
  });

  console.log("🚀 Turbo Indexer started for Arc Testnet...");

  let lastCheckedBlock = await db.get("SELECT MAX(CAST(blockNumber AS INTEGER)) as maxBlock FROM transactions");
  let currentBlock = lastCheckedBlock?.maxBlock ? BigInt(lastCheckedBlock.maxBlock) + 1n : 0n;

  setInterval(async () => {
    try {
      const latestBlock = await client.getBlockNumber();
      
      // Depth Check: Agar DB khali hai toh pichle 2000 blocks se shuru karo
      if (currentBlock === 0n) currentBlock = latestBlock - 2000n;

      if (currentBlock < latestBlock) {
        console.log(`📡 Scanning Blocks: ${currentBlock.toString()} to ${latestBlock.toString()}`);

        for (const contract of CONTRACTS) {
          const logs = await client.getContractEvents({
            address: contract.address,
            abi: contract.abi,
            eventName: contract.eventName,
            fromBlock: currentBlock,
            toBlock: latestBlock
          });

          // Block Timestamp Caching: Ek hi block ke liye baar baar network call nahi hogi
          const blockCache = {};

          for (const log of logs) {
            const bNum = log.blockNumber.toString();
            if (!blockCache[bNum]) {
              const block = await client.getBlock({ blockNumber: log.blockNumber });
              blockCache[bNum] = Number(block.timestamp);
            }

            let from = "0x0", to = "0x0", amount = 0n;
            const args = log.args;

            // Mapping events to database columns
            if (contract.eventName === 'Transfer') { from = args.from; to = args.to; amount = args.value; }
            else if (contract.eventName === 'UsernameRegistered') { from = args.wallet; to = REGISTRY_ADDRESS; }
            else if (contract.eventName === 'RequestCreated') { from = args.requester; to = args.payer; amount = args.amount; }
            else if (contract.eventName === 'DirectPaymentSent') { from = args.from; to = args.to; amount = args.amount; }

            await db.run(
              `INSERT OR IGNORE INTO transactions (hash, logIndex, from_addr, to_addr, amount, blockNumber, timestamp, eventName) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                log.transactionHash,
                log.logIndex,
                from ? from.toLowerCase() : "0x0",
                to ? to.toLowerCase() : "0x0",
                amount ? amount.toString() : "0",
                bNum,
                blockCache[bNum],
                contract.eventName
              ]
            );
            console.log(`✅ Saved [${contract.eventName}] Hash: ${log.transactionHash.slice(0, 10)}...`);
          }
        }
        currentBlock = latestBlock + 1n;
      }
    } catch (err) {
      console.error("⚠️ Sync Delay:", err.message);
    }
  }, 10000); // 10 seconds interval
}

startIndexer();