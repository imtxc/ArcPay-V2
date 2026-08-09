export const arcPayAbi = [
  { "inputs": [{ "internalType": "address", "name": "_to", "type": "address" }, { "internalType": "uint256", "name": "_amount", "type": "uint256" }, { "internalType": "string", "name": "_reference", "type": "string" }], "name": "pay", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "InvalidAddress", "type": "error" },
  { "inputs": [], "name": "InvalidAmount", "type": "error" },
  // ✅ FIXED: Event parameter 'reference' changed to '_reference' to avoid Solidity protected keyword error
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "string", "name": "_reference", "type": "string" }], "name": "PaymentSent", "type": "event" }
] as const;