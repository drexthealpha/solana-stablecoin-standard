# Architecture

The Solana Stablecoin Standard is built on a multi-layer architecture designed for security, compliance, and extensibility.

## Layer Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │
│  │   SDK   │  │   CLI   │  │  Indexer │  │  Webhook        │  │
│  │ (TS)    │  │         │  │          │  │  Service        │  │
│  └────┬────┘  └────┬────┘  └────┬─────┘  └────────┬────────┘  │
└───────┼────────────┼────────────┼─────────────────┼───────────┘
        │            │            │                 │
        ▼            ▼            ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ON-CHAIN LAYER                           │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │   Stablecoin        │    │   Transfer Hook              │ │
│  │   Program           │    │   Program                    │ │
│  │                     │    │                              │ │
│  │ - Config PDA        │    │ - Extra Account Meta List   │ │
│  │ - Minter PDA        │    │ - Blacklist Validation      │ │
│  │ - Blacklist PDA     │    │                              │ │
│  └──────────┬──────────┘    └──────────────┬────────────────┘ │
│             │                             │                   │
│             └─────────────┬───────────────┘                   │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Token-2022                              ││
│  │  - Mint / Burn / Freeze / Thaw / Transfer                 ││
│  │  - Transfer Hook Extension                                 ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Data Flows

### Initialization Flow

```
User (CLI/SDK)
      │
      ▼
┌──────────────┐
│ Initialize   │
│ Instruction  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ 1. Create Mint Account (Token-2022) │
│ 2. Initialize Config PDA              │
│ 3. Set mint authority to Config PDA   │
└──────┬───────────────────────────────┘
       │
       ▼ (If SSS-2)
┌──────────────────────────────────────┐
│ Initialize Extra Account Meta List   │
│ Register with Transfer Hook           │
└──────────────────────────────────────┘
```

### Transfer Flow (SSS-2)

```
┌──────────┐     ┌────────────┐     ┌─────────────────┐
│ User     │────▶│ Token-2022 │────▶│ Transfer Hook   │
│ Transfer │     │            │     │ Program         │
└──────────┘     └─────┬──────┘     └────────┬────────┘
                        │                    │
                        │    CPI             │
                        ▼                    ▼
                 ┌──────────────┐      ┌──────────────┐
                 │ Source      │      │ Destination  │
                 │ Token A/C   │      │ Token A/C   │
                 └──────────────┘      └──────────────┘
                        │                    │
                        └────────┬───────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ Check Blacklist PDAs    │
                    │ (Source & Destination)  │
                    └───────────┬──────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
            ┌──────────────┐       ┌──────────────┐
            │ Blacklisted  │       │ Not          │
            │ → REJECT     │       │ Blacklisted  │
            └──────────────┘       │ → APPROVE    │
                                   └──────────────┘
```

## Program Interactions

### PDA Structure

| PDA | Seeds | Owner | Purpose |
|-----|-------|-------|---------|
| Config | `[b"config", mint]` | Stablecoin | Token configuration |
| Minter | `[b"minter", mint, minter]` | Stablecoin | Minting allowance |
| Blacklist | `[b"blacklist", mint, address]` | Stablecoin | Compliance status |
| Extra Account Meta | `[b"extra-account-metas", mint]` | Transfer Hook | Hook accounts |

### Cross-Program Calls

1. **Stablecoin → Token-2022**
   - `mint_to` - Create tokens
   - `burn` - Destroy tokens
   - `freeze_account` / `thaw_account` - Freeze/thaw
   - `transfer_checked` - Seizure

2. **Token-2022 → Transfer Hook**
   - CPI to `execute` instruction
   - Passes source, destination, mint, extra accounts

3. **Transfer Hook → Stablecoin**
   - Reads Blacklist PDAs
   - No CPI back (read-only)

## Component Responsibilities

### SDK (`sdk/src/index.ts`)

- TypeScript interface for all operations
- Transaction building
- Account derivation (PDAs)
- Error handling

### CLI (`cli/src/index.ts`)

- Command-line interface
- Config file parsing (TOML/JSON)
- Human-readable output

### Backend Services

| Service | Port | Responsibility |
|---------|------|----------------|
| mint-service | 3001 | Fiat-to-crypto lifecycle |
| indexer | 3002 | Event parsing, webhooks |
| compliance-service | 3003 | Blacklist, seizure, audit |
| webhook-service | 3004 | Event delivery |

## Security Considerations

1. **PDA-based Authority**: All operations use PDAs controlled by the program
2. **Signer Seeds**: CPI calls signed by program-derived addresses
3. **Immutable Extension**: Transfer hook cannot be bypassed
4. **Frozen-first Seize**: Prevents unauthorized seizure
5. **Role Separation**: Different authorities for different functions

## Production Security Model

### Authority Upgrade Path: Single Keypair → Squads v4 Multisig

The current devnet deployment uses a single keypair as `master_authority`. For mainnet, upgrade to Squads v4 multisig.

**Squads v4 Program ID:** `SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf`

| Stage | Authority Model | When |
|-------|----------------|------|
| Devnet / Prototype | Single keypair | Development |
| Testnet / Audit | 2-of-3 Squads multisig | Pre-launch |
| Mainnet | 3-of-5 Squads multisig + 24h timelock | Production |

Migration steps:
1. Create a Squads vault at app.squads.so
2. Call `update_roles` with `new_master_authority = <squads_vault_pubkey>`
3. Call `accept_authority` from the Squads vault
4. All future `master_authority` instructions route through Squads approval

### Data Layer Upgrade Path

| Layer | Prototype | Production |
|-------|-----------|------------|
| Audit log | SQLite (better-sqlite3) | PostgreSQL + append-only role |
| Event streaming | In-memory cache | Kafka / Helius webhooks |
| Key management | File-based keypair | HSM (AWS CloudHSM or Ledger) |
| RPC | Public devnet | Helius dedicated node |
| Monitoring | Docker logs | Datadog / Grafana |
