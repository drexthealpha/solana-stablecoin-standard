import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

export interface AuditRow {
  id?: number;
  timestamp: string;
  action: string;
  actor: string;
  target: string;
  reason: string;
  amount: string;
  tx_sig: string;
  prev_hash?: string;
  row_hash?: string;
}

const DB_PATH = process.env.AUDIT_DB_PATH || path.join(__dirname, '../../audit.db');

function getDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      target TEXT NOT NULL,
      reason TEXT NOT NULL,
      amount TEXT NOT NULL,
      tx_sig TEXT NOT NULL,
      prev_hash TEXT NOT NULL,
      row_hash TEXT NOT NULL
    )
  `);
  return db;
}

function computeHash(prev_hash: string, row: AuditRow): string {
  return createHash('sha256')
    .update(prev_hash + row.timestamp + row.action + row.actor + row.target + row.tx_sig)
    .digest('hex');
}

export function appendAudit(entry: Omit<AuditRow, 'id' | 'prev_hash' | 'row_hash'>): void {
  const db = getDb();
  const prev = db.prepare('SELECT row_hash FROM audit ORDER BY id DESC LIMIT 1').get() as any;
  const prev_hash = prev?.row_hash ?? 'GENESIS';
  const row_hash = computeHash(prev_hash, entry as AuditRow);
  db.prepare(
    'INSERT INTO audit (timestamp, action, actor, target, reason, amount, tx_sig, prev_hash, row_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    entry.timestamp,
    entry.action,
    entry.actor,
    entry.target,
    entry.reason,
    entry.amount,
    entry.tx_sig,
    prev_hash,
    row_hash
  );
  db.close();
}

export function verifyChain(): { valid: boolean; rows: number; error?: string } {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM audit ORDER BY id ASC').all() as AuditRow[];
  db.close();

  let prev_hash = 'GENESIS';
  for (const row of rows) {
    const expected = computeHash(prev_hash, row);
    if (expected !== row.row_hash) {
      return { valid: false, rows: rows.length, error: `AUDIT_CHAIN_TAMPERED at id=${row.id}` };
    }
    prev_hash = row.row_hash!;
  }
  return { valid: true, rows: rows.length };
}

export function getEntries(limit = 100, offset = 0): AuditRow[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset) as AuditRow[];
  db.close();
  return rows;
}

export function exportCSV(): string {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM audit ORDER BY id ASC').all() as AuditRow[];
  db.close();
  const header = 'id,timestamp,action,actor,target,reason,amount,tx_sig,prev_hash,row_hash';
  const lines = rows.map(r =>
    `${r.id},${r.timestamp},${r.action},${r.actor},${r.target},${r.reason},${r.amount},${r.tx_sig},${r.prev_hash},${r.row_hash}`
  );
  return [header, ...lines].join('\n');
}

export default { appendAudit, verifyChain, getEntries, exportCSV };
