# Architecture

## Layer Model

```
┌─────────────────────────────────────────────────────────────────┐
│                         LAYER 1: BASE SDK                       │
│    SolanaStablecoin Class  │  ComplianceModule  │  Presets    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LAYER 2: MODULES                           │
│         Mint Module  │  Freeze Module  │  Compliance Module     │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LAYER 3: PRESETS                           │
│              SSS-1 (Minimal)        │        SSS-2 (Compliant) │
└─────────────────────────────────────────────────────────────────┘
```

## PDA Structure

| PDA | Seeds | Purpose |
|-----|-------|---------|
| Config | `[b"config", mint.key().as_ref()]` | Token configuration |
| Blacklist | `[b"blacklist", mint.key().as_ref(), address.key().as_ref()]` | Compliance status |
| Minter | `[b"minter", mint.key().as_ref(), minter.key().as_ref()]` | Minting allowance |
| Hook Meta | `[b"extra-account-metas", mint.key().as_ref()]` | Transfer hook accounts |

## Data Flow: Mint

```
User → SDK.create() → initialize instruction → Token-2022 Mint + Config PDA
```

## Data Flow: Blacklist + Transfer Hook

```
Transfer → Token-2022 → CPI to Transfer Hook → Check Blacklist PDAs → Allow/Reject
```

## Production Security Model

### Squads v4 Multisig Upgrade

**Squads v4 Program ID:** `SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf`

| Stage | Model | Quorum | Timelock |
|-------|-------|--------|----------|
| Prototype | Single keypair | 1-of-1 | None |
| Testnet | Squads v4 | 2-of-3 | None |
| Mainnet | Squads v4 | 3-of-5 | 24 hours |

24-hour timelock applies to all `master_authority` transfers.

## Data Layer Upgrade Path

| Layer | Prototype | Production |
|-------|-----------|------------|
| Database | SQLite (better-sqlite3) | PostgreSQL + WAL + append-only user + pgaudit |
| Event streaming | In-memory cache | Kafka |
| Key management | File keypair | HSM |
| RPC | Public devnet | Helius dedicated node |
