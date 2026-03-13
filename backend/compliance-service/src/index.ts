import express, { Request, Response } from "express";
import cors from "cors";
import * as fs from "fs";
import * as path from "path";
import { initDb, appendAudit, verifyChain, exportCsv } from "./audit";
import { screenAddress, KYTResponse } from "./sanctions";

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, '../data/audit.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = initDb(DB_PATH);

const verification = verifyChain(db);
console.log(`Audit chain verification: ${verification.valid ? 'valid' : 'invalid'} (${verification.rows} rows)`);
if (!verification.valid) {
  console.error(`Verification error: ${verification.error}`);
}

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "compliance-service",
    timestamp: new Date().toISOString()
  });
});

app.get("/audit-log/verify", (req: Request, res: Response) => {
  const result = verifyChain(db);
  res.json({ valid: result.valid, rows: result.rows });
});

app.get("/audit-log/export", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=audit-log.csv");
  res.send(exportCsv(db));
});

app.post("/audit-log", (req: Request, res: Response) => {
  const { action, actor, target, reason, amount, tx_sig } = req.body;

  if (!action || !actor || !target || !reason || !amount || !tx_sig) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  appendAudit(db, {
    timestamp: new Date().toISOString(),
    action,
    actor,
    target,
    reason,
    amount,
    tx_sig
  });

  res.json({ success: true });
});

app.get("/sanctions/check/:address", async (req: Request, res: Response) => {
  const { address } = req.params;
  const result: KYTResponse = await screenAddress(address);
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`compliance-service running on port ${PORT}`);
});
