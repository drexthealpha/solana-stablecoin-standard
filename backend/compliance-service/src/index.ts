import express, { Request, Response, NextFunction } from "express";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { ComplianceModule } from "./sdk/src/compliance";
import { appendAudit, verifyChain, getEntries, exportCSV } from "./audit";
import { SanctionsScreener } from "./sanctions";
import pino from "pino";
import * as fs from "fs";
import * as path from "path";

const app = express();
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
  },
});

const PORT = parseInt(process.env.PORT || "3003");
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const WALLET_PATH = process.env.WALLET_PATH || path.join(__dirname, "../../wallet.json");
const sanctionsScreener = new SanctionsScreener();

app.use(express.json());

async function getComplianceModule(mint: PublicKey): Promise<ComplianceModule> {
  const keypairData = JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8"));
  const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
  const wallet = {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: any) => { tx.partialSign(keypair); return tx; },
    signAllTransactions: async (txs: any[]) => { txs.forEach(tx => tx.partialSign(keypair)); return txs; },
  };
  return new ComplianceModule(new Connection(RPC_URL, "confirmed"), wallet as any, mint);
}

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "healthy", service: "compliance-service", timestamp: new Date().toISOString() });
});

app.post("/blacklist/add", async (req: Request, res: Response) => {
  try {
    const { address, reason, operator } = req.body;
    if (!address) return res.status(400).json({ error: "Address required" });

    const screeningResult = await sanctionsScreener.screen(address);
    if (screeningResult.hit) {
      appendAudit({ timestamp: new Date().toISOString(), action: "SANCTIONS_HIT", actor: operator || "unknown", target: address, reason: reason || "", amount: "0", tx_sig: "" });
      return res.status(403).json({ error: "Address matches sanctions list", listName: screeningResult.listName });
    }

    const mintAddress = process.env.MINT_ADDRESS;
    if (!mintAddress) return res.status(500).json({ error: "MINT_ADDRESS not configured" });

    const compliance = await getComplianceModule(new PublicKey(mintAddress));
    const tx = await compliance.blacklistAdd(new PublicKey(address), reason);

    appendAudit({ timestamp: new Date().toISOString(), action: "BLACKLIST_ADD", actor: operator || "unknown", target: address, reason: reason || "", amount: "0", tx_sig: tx });
    logger.info({ msg: "Blacklist add successful", tx, address });
    res.json({ success: true, transaction: tx, address, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error({ err: error, msg: "Blacklist add failed" });
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.delete("/blacklist/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const operator = req.body.operator || "unknown";
    const mintAddress = process.env.MINT_ADDRESS;
    if (!mintAddress) return res.status(500).json({ error: "MINT_ADDRESS not configured" });

    const compliance = await getComplianceModule(new PublicKey(mintAddress));
    const tx = await compliance.blacklistRemove(new PublicKey(address));

    appendAudit({ timestamp: new Date().toISOString(), action: "BLACKLIST_REMOVE", actor: operator, target: address, reason: "", amount: "0", tx_sig: tx });
    res.json({ success: true, transaction: tx, address, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.get("/blacklist/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const mintAddress = process.env.MINT_ADDRESS;
    if (!mintAddress) return res.status(500).json({ error: "MINT_ADDRESS not configured" });

    const compliance = await getComplianceModule(new PublicKey(mintAddress));
    const isBlacklisted = await compliance.getBlacklistStatus(new PublicKey(address));
    res.json({ address, blacklisted: isBlacklisted, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.post("/seize", async (req: Request, res: Response) => {
  try {
    const { address, treasury, amount, reason, operator } = req.body;
    if (!address || !treasury || !amount) return res.status(400).json({ error: "Address, treasury, and amount required" });

    const mintAddress = process.env.MINT_ADDRESS;
    if (!mintAddress) return res.status(500).json({ error: "MINT_ADDRESS not configured" });

    const compliance = await getComplianceModule(new PublicKey(mintAddress));
    const tx = await compliance.seize(new PublicKey(address), new PublicKey(treasury), amount);

    appendAudit({ timestamp: new Date().toISOString(), action: "SEIZE", actor: operator || "unknown", target: address, reason: reason || "", amount: String(amount), tx_sig: tx });
    res.json({ success: true, transaction: tx, address, treasury, amount, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.get("/audit-log", (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    res.json({ entries: getEntries(limit, offset), limit, offset, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.get("/audit-log/verify", (req: Request, res: Response) => {
  try {
    res.json(verifyChain());
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.get("/audit-log/export", (req: Request, res: Response) => {
  try {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=audit-log.csv");
    res.send(exportCSV());
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => logger.info({ msg: "Compliance service started", port: PORT }));
export default app;
