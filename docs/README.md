[![CI](https://github.com/drexthealpha/solana-stablecoin-standard/actions/workflows/ci.yml/badge.svg)](https://github.com/drexthealpha/solana-stablecoin-standard/actions/workflows/ci.yml)

# Solana Stablecoin Standard (SSS)

A comprehensive framework for building regulated stablecoins on Solana using Token-2022 with compliance features.

## Overview

The Solana Stablecoin Standard (SSS) provides two configurations preset for stablecoin implementations:

- **SSS-1**: Minimal stablecoin with basic minting, burning, freezing, and pause functionality
- **SSS-2**: Compliant stablecoin with blacklist enforcement, seizure capabilities, and GENIUS Act alignment

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Solana Stablecoin Standard                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐     ┌──────────────┐                        │
│   │   SDK/CLI    │────▶│  Programs    │                        │
│   └──────────────┘     └──────┬───────┘                        │
│                               │                                  │
│   ┌──────────────┐            │         ┌──────────────┐       │
│   │   Backend    │◀───────────┼─────────│  Token-2022  │       │
│   └──────────────┘            │         └──────────────┘       │
│                               │                                  │
│   ┌──────────────┐            │         ┌──────────────┐       │
│   │  Indexer     │◀────────────┴─────────│ Transfer Hook │       │
│   └──────────────┘                      └──────────────┘       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Preset Comparison

| Feature | SSS-1 | SSS-2 |
|---------|-------|-------|
| Basic Mint/Burn | ✅ | ✅ |
| Freeze/Thaw | ✅ | ✅ |
| Pause/Unpause | ✅ | ✅ |
| Role Management | ✅ | ✅ |
| Permanent Delegate | ❌ | ✅ |
| Transfer Hook | ❌ | ✅ |
| Blacklist Enforcement | ❌ | ✅ |
| Token Seizure | ❌ | ✅ |
| Compliance Audit Log | ❌ | ✅ |
| Sanctions Screening | ❌ | ✅ |

## Quick Start

### Prerequisites

- Solana CLI 1.18+
- Node.js 18+
- Anchor 0.30+

### Installation

```bash
# Clone the repository
git clone https://github.com/drexthealpha/solana-stablecoin-standard
cd solana-stablecoin-standard

# Install dependencies
npm install
cargo install
```

### SSS-1: Minimal Stablecoin

```bash
# Initialize SSS-1 stablecoin
sss-token init --preset sss-1 --name "My Stablecoin" --symbol "MSTB" --decimals 6

# Mint tokens
sss-token mint --mint <MINT_ADDRESS> --recipient <RECIPIENT> --amount 1000000

# Burn tokens
sss-token burn --mint <MINT_ADDRESS> --amount 500000

# Freeze account
sss-token freeze --mint <MINT_ADDRESS> --address <ACCOUNT>

# Pause all operations
sss-token pause --mint <MINT_ADDRESS>
```

### SSS-2: Compliant Stablecoin

```bash
# Initialize SSS-2 stablecoin
sss-token init --preset sss-2 --name "Compliant Coin" --symbol "CSTB" --decimals 6

# Add to blacklist
sss-token blacklist add --mint <MINT_ADDRESS> --address <ADDRESS> --reason "KYC failure"

# Freeze and seize
sss-token freeze --mint <MINT_ADDRESS> --address <ACCOUNT>
sss-token seize --mint <MINT_ADDRESS> --address <ACCOUNT> --to <TREASURY> --amount 1000000
```

## SDK Usage

```typescript
import { SolanaStablecoin, Presets } from "@stbr/sss-token";

const sdk = new SolanaStablecoin(connection, wallet);

// Initialize
const mint = await sdk.create(6, {
  name: "My Stablecoin",
  symbol: "MSTB",
  uri: "https://...",
  masterAuthority: authority,
  masterMinter: authority,
  blacklister: authority,
  pauser: authority,
  enablePermanentDelegate: true, // For SSS-2
  enableTransferHook: true,      // For SSS-2
  defaultAccountFrozen: false,
});

// Mint
await sdk.mint(mint, recipient, amount);

// Compliance (SSS-2)
const compliance = new ComplianceModule(connection, wallet, mint);
await compliance.blacklistAdd(address, "reason");
await compliance.seize(frozenAccount, treasury, amount);
```

## Documentation

- [SSS-1 Specification](SSS-1.md) - Minimal stablecoin details
- [SSS-2 Specification](SSS-2.md) - Compliant stablecoin details
- [Architecture](ARCHITECTURE.md) - System design
- [Compliance](COMPLIANCE.md) - Regulatory considerations
- [Operations](OPERATIONS.md) - Runbook
- [SDK Reference](SDK.md) - TypeScript SDK
- [API Reference](API.md) - Backend API

## Program IDs

- **Stablecoin Program**: `2N19eMKD2xGpjNzfktVCPnkrbGJZAzuDFoH7SJtQiNm9`
- **Transfer Hook**: `PQgUt1swYzA9RSAG7gpyTQpk9TtbVReX11ytkeYTJBo`
- **Token-2022**: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`

## License

MIT
