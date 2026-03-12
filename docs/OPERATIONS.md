# Operations Runbook

This runbook provides step-by-step procedures for common stablecoin operations.

## Prerequisites

- CLI installed: `npm install -g sss-token-cli`
- Wallet configured with sufficient SOL
- Environment variables set:
  ```bash
  export RPC_URL="https://api.mainnet-beta.solana.com"
  export KEYPAIR_PATH="/path/to/wallet.json"
  ```

## Initialization

### Creating a New Stablecoin

```bash
# SSS-1 (Minimal)
sss-token init \
  --preset sss-1 \
  --name "My Stablecoin" \
  --symbol "MSTB" \
  --decimals 6

# SSS-2 (Compliant)
sss-token init \
  --preset sss-2 \
  --name "Compliant Coin" \
  --symbol "CSTB" \
  --decimals 6
```

Save the mint address and config PDA from output.

## Minting

### Standard Minting

```bash
sss-token mint \
  --mint <MINT_ADDRESS> \
  --recipient <RECIPIENT_ADDRESS> \
  --amount 1000000
```

### Via Backend API

```bash
curl -X POST http://localhost:3001/mint \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "<RECIPIENT_ADDRESS>",
    "amount": 1000000,
    "reference": "invoice-123"
  }'
```

## Burning

```bash
sss-token burn \
  --mint <MINT_ADDRESS> \
  --amount 500000
```

## Account Management

### Freeze Account

Prevents token transfers from an account.

```bash
sss-token freeze \
  --mint <MINT_ADDRESS> \
  --address <ACCOUNT_TO_FREEZE>
```

### Thaw Account

```bash
sss-token thaw \
  --mint <MINT_ADDRESS> \
  --address <ACCOUNT_TO_THAW>
```

### Pause All Operations

Emergency stop for all minting and transfers.

```bash
sss-token pause \
  --mint <MINT_ADDRESS>
```

### Unpause

```bash
sss-token unpause \
  --mint <MINT_ADDRESS>
```

## Compliance (SSS-2)

### Add to Blacklist

```bash
sss-token blacklist add \
  --mint <MINT_ADDRESS> \
  --address <ADDRESS> \
  --reason "KYC failure"
```

### Remove from Blacklist

```bash
sss-token blacklist remove \
  --mint <MINT_ADDRESS> \
  --address <ADDRESS>
```

### Seize Tokens

1. First freeze the account:
```bash
sss-token freeze --mint <MINT> --address <SUSPECTED>
```

2. Then seize:
```bash
sss-token seize \
  --mint <MINT_ADDRESS> \
  --address <SUSPECTED_ACCOUNT> \
  --to <TREASURY_ADDRESS> \
  --amount <AMOUNT>
```

## Role Management

### Update Roles

```bash
# Update pauser
sss-token update-roles \
  --mint <MINT_ADDRESS> \
  --new-pauser <NEW_PAUSER>

# Update minter
sss-token minters add \
  --mint <MINT_ADDRESS> \
  --address <MINTER_ADDRESS> \
  --allowance 10000000
```

### Accept Authority Transfer

If pending authority is set:

```bash
sss-token accept-authority \
  --mint <MINT_ADDRESS>
```

## Monitoring

### Check Status

```bash
sss-token status --mint <MINT_ADDRESS>
```

Output:
```json
{
  "name": "My Stablecoin",
  "symbol": "MSTB",
  "isPaused": false,
  "totalSupply": 100000000,
  "masterAuthority": "...",
  "enablePermanentDelegate": true
}
```

### Get Supply

```bash
sss-token supply --mint <MINT_ADDRESS>
```

## Emergency Procedures

### System Compromise

1. **Immediate Pause**:
```bash
sss-token pause --mint <MINT_ADDRESS>
```

2. **Freeze Compromised Accounts**:
```bash
sss-token freeze --mint <MINT_ADDRESS> --address <COMPROMISED>
```

3. **Rotate Keys**:
```bash
sss-token update-roles --mint <MINT> --new-master-authority <NEW_KEY>
```

###Law Enforcement Request

1. Verify request validity (subpoena, warrant)
2. Document request in audit log
3. Freeze account (if not already)
4. Seize tokens to treasury
5. Do not disclose to third parties

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Unauthorized | Wrong signer | Check wallet matches authority |
| Account Not Frozen | Seize before freeze | Freeze first |
| Not Compliant Stablecoin | SSS-1 used for SSS-2 ops | Use SSS-2 preset |

### Logs

Check service logs:
```bash
# Mint service
docker logs sss-mint-service

# Indexer
docker logs sss-indexer

# Compliance
docker logs sss-compliance-service
```

## Production Hardening

| Component | Prototype (Now) | Production |
|-----------|----------------|------------|
| Authority | Single keypair | Squads v4 multisig (`SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf`) |
| Audit log | SQLite (better-sqlite3) | PostgreSQL, append-only role, WAL archiving |
| Event pipeline | In-memory cache | Apache Kafka, persistent consumer groups |
| RPC endpoint | Public devnet | Helius dedicated node (helius.dev) |
| Key storage | File-based id.json | HSM — AWS CloudHSM or Ledger hardware wallet |
| Monitoring | Docker stdout | Datadog APM + PagerDuty alerts |
| Secrets | .env file | AWS Secrets Manager or HashiCorp Vault |

### Mainnet Deployment Checklist

- [ ] Security audit completed (Ackee, OtterSec, or Neodyme)
- [ ] Squads v4 multisig created and authority transferred
- [ ] PostgreSQL deployed with append-only audit user
- [ ] Helius RPC endpoint configured in all services
- [ ] HSM provisioned for master_authority keypair
- [ ] Monitoring and alerting live
- [ ] Incident response runbook reviewed with team
