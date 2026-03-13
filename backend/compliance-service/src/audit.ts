import Database from 'better-sqlite3';
import { createHash } from 'crypto';

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

export function initDb(path: string): Database.Database {
  const db = new Database(path);
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

function computeRowHash(prev_hash: string, entry: { timestamp: string; action: string; actor: string; target: string; tx_sig: string }): string {
  return createHash('sha256')
    .update(prev_hash + entry.timestamp + entry.action + entry.actor + entry.target + entry.tx_sig)
    .digest('hex');
}

export function appendAudit(db: Database.Database, entry: Omit<AuditRow, 'id' | 'prev_hash' | 'row_hash'>): void {
  const lastRow = db.prepare('SELECT row_hash FROM audit ORDER BY id DESC LIMIT 1').get() as { row_hash: string } | undefined;
  const prev_hash = lastRow?.row_hash ?? 'GENESIS';
  const row_hash = computeRowHash(prev_hash, entry);

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
}

export function verifyChain(db: Database.Database): { valid: boolean; rows: number; error?: string } {
  const rows = db.prepare('SELECT * FROM audit ORDER BY id ASC').all() as AuditRow[];

  if (rows.length === 0) {
    return { valid: true, rows: 0 };
  }

  if (rows[0].prev_hash !== 'GENESIS') {
    return { valid: false, rows: rows.length, error: 'First row prev_hash is not GENESIS' };
  }

  let prev_hash = 'GENESIS';
  for (const row of rows) {
    const expected = computeRowHash(prev_hash, row);
    if (expected !== row.row_hash) {
      return { valid: false, rows: rows.length, error: `Row ${row.id} hash mismatch` };
    }
    prev_hash = row.row_hash!;
  }

  return { valid: true, rows: rows.length };
}

export function exportCsv(db: Database.Database): string {
  const rows = db.prepare('SELECT * FROM audit ORDER BY id ASC').all() as AuditRow[];
  const header = 'id,timestamp,action,actor,target,reason,amount,tx_sig,prev_hash,row_hash';
  const lines = rows.map(r =>
    `${r.id},${r.timestamp},${r.action},${r.actor},${r.target},${r.reason},${r.amount},${r.tx_sig},${r.prev_hash},${r.row_hash}`
  );
  return [header, ...lines].join('\n');
}
