import express from "express";
import cors from "cors";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { SolanaStablecoin } from "../../../sdk/src/index";
import * as anchor from "@coral-xyz/anchor";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function getConnection(): Connection {
  const rpcUrl = process.env.RPC_URL || "https://api.devnet.solana.com";
  return new Connection(rpcUrl, "confirmed");
}

function getWallet(): anchor.Wallet {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const keypairPath = process.env.KEYPAIR_PATH || `${homeDir}/.config/solana/id.json`;
  const fs = require("fs");
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
  return new anchor.Wallet(keypair);
}

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "mint-service",
    timestamp: new Date().toISOString(),
  });
});

app.post("/mint", async (req, res) => {
  const { mint, recipient, amount, keypairBase64 } = req.body;

  if (!mint || !recipient || !amount || !keypairBase64) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: mint, recipient, amount, keypairBase64",
    });
  }

  try {
    const connection = getConnection();
    const wallet = getWallet();
    const sdk = new SolanaStablecoin(connection, wallet);
    const mintPubkey = new PublicKey(mint);
    const recipientPubkey = new PublicKey(recipient);
    const tx = await sdk.mint(mintPubkey, { recipient: recipientPubkey, amount: BigInt(amount) });
    res.json({
      success: true,
      transaction: tx,
      note: "Use sss-token CLI for full minting",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/burn", (req, res) => {
  const { mint, amount, keypairBase64 } = req.body;

  if (!mint || !amount || !keypairBase64) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: mint, amount, keypairBase64",
    });
  }

  res.json({
    success: true,
    note: "Use sss-token CLI for full burn",
  });
});

app.listen(PORT, () => {
  console.log(`mint-service running on port ${PORT}`);
});
