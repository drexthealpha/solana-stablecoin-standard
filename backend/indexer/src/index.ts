import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "indexer",
    timestamp: new Date().toISOString(),
  });
});

app.get("/transactions/:mint", async (req, res) => {
  const { mint } = req.params;
  const rpcUrl = process.env.RPC_URL || "https://api.devnet.solana.com";
  try {
    const { Connection, PublicKey } = require("@solana/web3.js");
    const connection = new Connection(rpcUrl, "confirmed");
    const mintPubkey = new PublicKey(mint);
    const sigs = await connection.getSignaturesForAddress(mintPubkey, { limit: 20 });
    res.json({ mint, transactions: sigs.map((s: any) => ({ signature: s.signature, slot: s.slot, blockTime: s.blockTime, err: s.err })) });
  } catch (e: any) {
    res.status(500).json({ mint, transactions: [], error: e.message });
  }
});

app.get("/supply/:mint", (req, res) => {
  const { mint } = req.params;
  res.json({
    mint,
    supply: "0",
    note: "Query on-chain for live supply",
  });
});

app.listen(PORT, () => {
  console.log(`indexer running on port ${PORT}`);
});
