# Operations Runbook (Circle-style)

## Quick Start

```bash
# Start all services
docker compose up

# Health checks
curl http://localhost:3001/health  # mint-service
curl http://localhost:3002/health  # indexer
curl http://localhost:3003/health  # compliance-service
```

## Minting Workflow

1. Set minter allowance:
```bash
sss-token minters add --mint <MINT> --address <MINTER> --allowance 1000000
```

2. Mint tokens:
```bash
sss-token mint --mint <MINT> --recipient <RECIPIENT> --amount 1000000
```

3. Verify supply:
```bash
sss-token supply --mint <MINT>
```

## Freeze/Thaw Procedure

**Freeze:**
```bash
sss-token freeze --mint <MINT> --address <ACCOUNT>
```

**Thaw:**
```bash
sss-token thaw --mint <MINT> --address <ACCOUNT>
```

## Blacklist Procedure (SSS-2)

1. Screen address (optional):
```bash
curl http://localhost:3003/sanctions/check/<ADDRESS>
```

2. Add to blacklist:
```bash
sss-token blacklist add --mint <MINT> --address <ADDRESS> --reason "KYC failure"
```

3. Verify:
```bash
curl http://localhost:3003/blacklist/<ADDRESS>
```

## Seizure Procedure (SSS-2)

1. **Freeze first** (required):
```bash
sss-token freeze --mint <MINT> --address <SUSPECTED>
```

2. **Verify frozen**:
```bash
# Check account state is "frozen"
```

3. **Seize**:
```bash
sss-token seize --mint <MINT> --address <SUSPECTED> --to <TREASURY> --amount <AMOUNT>
```

4. **Audit log**:
```bash
curl http://localhost:3003/audit-log/export
```

## Production Hardening

| Component | Prototype | Production |
|-----------|-----------|------------|
| Database | SQLite | PostgreSQL + WAL + append-only user + pgaudit |
| Event streaming | Direct RPC | Kafka (replace direct RPC) |
| Key storage | File keypair | HSM (AWS CloudHSM or Ledger) |
| RPC | Public devnet | Helius dedicated node |
| Indexer | Polling | Helius webhooks |
| Authority | Single keypair | Squads v4 (2-of-3 or 3-of-5) |

## Emergency: Pause All Transfers

```bash
sss-token pause --mint <MINT>
```

---

**Note:** This is a prototype. Single keypair authority. Do NOT use on mainnet without completing the Squads v4 upgrade.

PostgreSQL upgrade path for audit table: same schema, same checksum chain algorithm, add `GRANT INSERT ON audit TO audit_writer; REVOKE UPDATE, DELETE ON audit FROM audit_writer;` to enforce append-only.
