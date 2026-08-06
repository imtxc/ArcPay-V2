const { createPublicClient, http } = require('viem');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000"; 

async function startIndexer() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(
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
  );

  const client = createPublicClient({
    transport: http('https://rpc.testnet.arc.network')
  });

  console.log("🚀 Indexer background me start ho gaya hai...");

  let lastCheckedBlock = await db.get("SELECT MAX(CAST(blockNumber AS INTEGER)) as maxBlock FROM transactions");
  let currentBlock = lastCheckedBlock?.maxBlock ? BigInt(lastCheckedBlock.maxBlock) : 0n;

  setInterval(async () => {
    try {
      const latestBlock = await client.getBlockNumber();
      if (currentBlock === 0n) currentBlock = latestBlock - 50n;

      if (currentBlock < latestBlock) {
        const logs = await client.getContractEvents({
          address: USDC_ADDRESS,
          eventName: 'Transfer',
          fromBlock: currentBlock,
          toBlock: latestBlock
        });

        for (const log of logs) {
          const block = await client.getBlock({ blockNumber: log.blockNumber });
          await db.run(
            INSERT OR IGNORE INTO transactions (hash, logIndex, from_addr, to_addr, amount, blockNumber, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?),
            [log.transactionHash, log.logIndex, log.args.from, log.args.to, log.args.value.toString(), log.blockNumber.toString(), Number(block.timestamp)]
          );
          console.log(📥 Saved Tx: \);
        }
        currentBlock = latestBlock + 1n;
      }
    } catch (err) {
      console.error("Indexing error:", err.message);
    }
  }, 5000);
}

startIndexer();
