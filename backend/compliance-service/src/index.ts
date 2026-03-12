import express, { Request, Response, NextFunction } from "express";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { ComplianceModule } from "../../../sdk/src/compliance";
import { AuditLogger, AuditEntry } from "./audit";
import { SanctionsScreener } from "./sanctions";
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

const PORT = parseInt(process.env.PORT || "3003");
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const AUDIT_LOG_PATH = process.env.AUDIT_LOG_PATH || path.join(__dirname, "../../audit.log");
const WALLET_PATH = process.env.WALLET_PATH || path.join(__dirname, "../../wallet.json");

const auditLogger = new AuditLogger(AUDIT_LOG_PATH);
const sanctionsScreener = new SanctionsScreener();

interface AddBlacklistRequest {
  address: string;
  reason?: string;
  operator?: string;
}

interface SeizeRequest {
  address: string;
  treasury: string;
  amount: number;
  reason?: string;
}

app.use(express.json());

async function getComplianceModule(mint: PublicKey): Promise<ComplianceModule> {
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
  return new ComplianceModule(connection, wallet as any, mint);
}

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "compliance-service",
    timestamp: new Date().toISOString(),
  });
});

app.post("/blacklist/add", async (req: Request, res: Response) => {
  try {
    const { address, reason, operator } = req.body as AddBlacklistRequest;

    if (!address) {
      return res.status(400).json({ error: "Address required" });
    }

    logger.info({ msg: "Adding to blacklist", address, reason });

    const screeningResult = await sanctionsScreener.screen(address);
    if (screeningResult.hit) {
      logger.warn({
        msg: "Sanctions hit detected",
        address,
        listName: screeningResult.listName,
      });
      await auditLogger.log({
        timestamp: new Date().toISOString(),
        action: "SANCTIONS_HIT",
        operator: operator || "unknown",
        address,
        details: { listName: screeningResult.listName, reason },
        txHash: "",
      });
      return res.status(403).json({
        error: "Address matches sanctions list",
        listName: screeningResult.listName,
      });
    }

    const mintAddress = process.env.MINT_ADDRESS;
    if (!mintAddress) {
      return res.status(500).json({ error: "MINT_ADDRESS not configured" });
    }

    const mint = new PublicKey(mintAddress);
    const compliance = await getComplianceModule(mint);

    const addressPubkey = new PublicKey(address);
    const tx = await compliance.blacklistAdd(addressPubkey, reason);

    await auditLogger.log({
      timestamp: new Date().toISOString(),
      action: "BLACKLIST_ADD",
      operator: operator || "unknown",
      address,
      details: { reason },
      txHash: tx,
    });

    logger.info({ msg: "Blacklist add successful", tx, address });

    res.json({
      success: true,
      transaction: tx,
      address,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error, msg: "Blacklist add failed" });
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.delete("/blacklist/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const operator = req.body.operator || "unknown";

    logger.info({ msg: "Removing from blacklist", address });

    const mintAddress = process.env.MINT_ADDRESS;
    if (!mintAddress) {
      return res.status(500).json({ error: "MINT_ADDRESS not configured" });
    }

    const mint = new PublicKey(mintAddress);
    const compliance = await getComplianceModule(mint);

    const addressPubkey = new PublicKey(address);
    const tx = await compliance.blacklistRemove(addressPubkey);

    await auditLogger.log({
      timestamp: new Date().toISOString(),
      action: "BLACKLIST_REMOVE",
      operator,
      address,
      details: {},
      txHash: tx,
    });

    logger.info({ msg: "Blacklist remove successful", tx, address });

    res.json({
      success: true,
      transaction: tx,
      address,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error, msg: "Blacklist remove failed" });
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/blacklist/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    const mintAddress = process.env.MINT_ADDRESS;
    if (!mintAddress) {
      return res.status(500).json({ error: "MINT_ADDRESS not configured" });
    }

    const mint = new PublicKey(mintAddress);
    const compliance = await getComplianceModule(mint);

    const addressPubkey = new PublicKey(address);
    const isBlacklisted = await compliance.getBlacklistStatus(addressPubkey);

    res.json({
      address,
      blacklisted: isBlacklisted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error, msg: "Blacklist check failed" });
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/seize", async (req: Request, res: Response) => {
  try {
    const { address, treasury, amount, reason } = req.body as SeizeRequest;
    const operator = req.body.operator || "unknown";

    if (!address || !treasury || !amount) {
      return res.status(400).json({
        error: "Address, treasury, and amount required",
      });
    }

    logger.info({ msg: "Seizing tokens", address, treasury, amount });

    const mintAddress = process.env.MINT_ADDRESS;
    if (!mintAddress) {
      return res.status(500).json({ error: "MINT_ADDRESS not configured" });
    }

    const mint = new PublicKey(mintAddress);
    const compliance = await getComplianceModule(mint);

    const addressPubkey = new PublicKey(address);
    const treasuryPubkey = new PublicKey(treasury);

    const tx = await compliance.seize(addressPubkey, treasuryPubkey, amount);

    await auditLogger.log({
      timestamp: new Date().toISOString(),
      action: "SEIZE",
      operator,
      address,
      details: { treasury, amount, reason },
      txHash: tx,
    });

    logger.info({ msg: "Seize successful", tx, address, amount });

    res.json({
      success: true,
      transaction: tx,
      address,
      treasury,
      amount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error, msg: "Seize failed" });
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/audit-log", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const entries = await auditLogger.getEntries(limit, offset);

    res.json({
      entries,
      limit,
      offset,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error, msg: "Audit log fetch failed" });
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get('/audit-log/verify', (req: Request, res: Response) => {
  try {
    const { verifyChain } = require('./audit');
    const result = verifyChain();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/audit-log/export', (req: Request, res: Response) => {
  try {
    const { exportCSV } = require('./audit');
    const csv = exportCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, msg: "Unhandled error" });
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  logger.info({ msg: "Compliance service started", port: PORT });
});

export default app;
