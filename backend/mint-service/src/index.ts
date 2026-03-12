import express, { Request, Response, NextFunction } from "express";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { SolanaStablecoin, STABLECOIN_PROGRAM_ID } from "../sdk/src/index";
import pino from "pino";
import * as fs from "fs";
import * as path from "path";

const app = express();
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});

const PORT = parseInt(process.env.PORT || "3001");
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const WALLET_PATH = process.env.WALLET_PATH || path.join(__dirname, "../../wallet.json");

interface MintRequest {
  recipient: string;
  amount: number;
  reference?: string;
  metadata?: Record<string, unknown>;
}

interface BurnRequest {
  amount: number;
  reference?: string;
}

app.use(express.json());

async function getSdk(): Promise<SolanaStablecoin> {
  const keypairData = JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8"));
  const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
  const wallet = {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: any) => {
      tx.partialSign(keypair);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      for (const tx of txs) {
        tx.partialSign(keypair);
      }
      return txs;
    },
  };
  const connection = new Connection(RPC_URL, "confirmed");
  return new SolanaStablecoin(connection, wallet as any);
}

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "mint-service",
    timestamp: new Date().toISOString(),
  });
});

app.post("/mint", async (req: Request, res: Response) => {
  try {
    const { recipient, amount, reference, metadata } = req.body as MintRequest;

    if (!recipient || !amount || amount <= 0) {
      return res.status(400).json({
        error: "Invalid request: recipient and positive amount required",
      });
    }

    logger.info({
      msg: "Mint request received",
      recipient,
      amount,
      reference,
      metadata,
    });

    const sdk = await getSdk();

    const mintAddress = process.env.MINT_ADDRESS;
    if (!mintAddress) {
      return res.status(500).json({ error: "MINT_ADDRESS not configured" });
    }

    const recipientPubkey = new PublicKey(recipient);
    const mint = new PublicKey(mintAddress);

    logger.info({
      msg: "Executing mint",
      mint: mintAddress,
      recipient,
      amount,
    });

    const tx = await sdk.mint(mint, recipientPubkey, amount);

    logger.info({
      msg: "Mint successful",
      tx,
      amount,
      recipient,
      reference,
    });

    res.json({
      success: true,
      transaction: tx,
      amount,
      recipient,
      reference,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error, msg: "Mint failed" });
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/burn", async (req: Request, res: Response) => {
  try {
    const { amount, reference } = req.body as BurnRequest;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: "Invalid request: positive amount required",
      });
    }

    logger.info({ msg: "Burn request received", amount, reference });

    const sdk = await getSdk();

    const mintAddress = process.env.MINT_ADDRESS;
    if (!mintAddress) {
      return res.status(500).json({ error: "MINT_ADDRESS not configured" });
    }

    const mint = new PublicKey(mintAddress);

    logger.info({ msg: "Executing burn", mint: mintAddress, amount });

    const tx = await sdk.burn(mint, amount);

    logger.info({ msg: "Burn successful", tx, amount, reference });

    res.json({
      success: true,
      transaction: tx,
      amount,
      reference,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error, msg: "Burn failed" });
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/supply", async (req: Request, res: Response) => {
  try {
    const mintAddress = process.env.MINT_ADDRESS;
    if (!mintAddress) {
      return res.status(500).json({ error: "MINT_ADDRESS not configured" });
    }

    const sdk = await getSdk();
    const mint = new PublicKey(mintAddress);
    const supply = await sdk.getTotalSupply(mint);

    res.json({
      mint: mintAddress,
      supply,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error, msg: "Supply fetch failed" });
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, msg: "Unhandled error" });
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  logger.info({ msg: "Mint service started", port: PORT });
});

export default app;
