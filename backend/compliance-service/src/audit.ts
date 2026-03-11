import * as fs from "fs";
import * as path from "path";

export interface AuditEntry {
  timestamp: string;
  action: "BLACKLIST_ADD" | "BLACKLIST_REMOVE" | "SEIZE" | "SANCTIONS_HIT" | "FREEZE" | "THAW";
  operator: string;
  address: string;
  details: Record<string, unknown>;
  txHash: string;
}

export class AuditLogger {
  private logPath: string;

  constructor(logPath: string) {
    this.logPath = logPath;
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, "");
    }
  }

  async log(entry: AuditEntry): Promise<void> {
    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(this.logPath, line);
  }

  async getEntries(limit: number = 100, offset: number = 0): Promise<AuditEntry[]> {
    if (!fs.existsSync(this.logPath)) {
      return [];
    }

    const content = fs.readFileSync(this.logPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    const entries: AuditEntry[] = [];
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]) as AuditEntry;
        entries.push(entry);
      } catch {
        continue;
      }
    }

    return entries.slice(offset, offset + limit);
  }

  async searchByAddress(address: string): Promise<AuditEntry[]> {
    if (!fs.existsSync(this.logPath)) {
      return [];
    }

    const content = fs.readFileSync(this.logPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    const entries: AuditEntry[] = [];
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as AuditEntry;
        if (entry.address === address) {
          entries.push(entry);
        }
      } catch {
        continue;
      }
    }

    return entries.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getEntriesByAction(action: AuditEntry["action"]): Promise<AuditEntry[]> {
    if (!fs.existsSync(this.logPath)) {
      return [];
    }

    const content = fs.readFileSync(this.logPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    const entries: AuditEntry[] = [];
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as AuditEntry;
        if (entry.action === action) {
          entries.push(entry);
        }
      } catch {
        continue;
      }
    }

    return entries.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

export default AuditLogger;
