[![CI](https://github.com/drexthealpha/solana-stablecoin-standard/actions/workflows/ci.yml/badge.svg)](https://github.com/drexthealpha/solana-stablecoin-standard/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@drexthealpha/sss-token)](https://npmjs.com/package/@drexthealpha/sss-token)

# Solana Stablecoin Standard

A comprehensive framework for building regulated stablecoins on Solana using Token-2022 with compliance features.

## Quick Start

```bash
# Install SDK
npm install @drexthealpha/sss-token

# Initialize SSS-1 (minimal)
sss-token init --preset sss-1 --name "My Stablecoin" --symbol "MSTB" --decimals 6

# Initialize SSS-2 (compliant)
sss-token init --preset sss-2 --name "Compliant Coin" --symbol "CSTB" --decimals 6

# Mint tokens
sss-token mint --mint <MINT_ADDRESS> --recipient <RECIPIENT> --amount 1000000

# Freeze account
sss-token freeze --mint <MINT_ADDRESS> --address <ACCOUNT>

# Blacklist (SSS-2 only)
sss-token blacklist add --mint <MINT_ADDRESS> --address <ACCOUNT> --reason "KYC failure"
```

## Install SDK

```bash
npm install @drexthealpha/sss-token
```

## TypeScript SDK
```typescript
import { SolanaStablecoin, Presets } from "@drexthealpha/sss-token";
import { Connection, Keypair } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");

// One line to deploy a PYUSD-class compliant stablecoin
const stable = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_2,
  name: "My Stablecoin",
  symbol: "MYUSD",
  decimals: 6,
  authority: adminKeypair,
});

// Mint tokens (uses deployed mint automatically)
await stable.mint({ recipient: recipientPublicKey, amount: 1_000_000n, minter: adminKeypair.publicKey });

// SSS-2: blacklist enforcement
await stable.compliance.blacklistAdd(suspiciousAddress, "OFAC match");

// SSS-2: seize from frozen account
await stable.compliance.seize(frozenAccount, treasuryAccount);

// Query total supply
const supply = await stable.getTotalSupply();
console.log("Total supply:", supply);
```

> Install: `npm install @drexthealpha/sss-token`
> See [docs/SDK.md](docs/SDK.md) for full API reference.

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

## Documentation

- [SSS-1 Specification](docs/SSS-1.md)
- [SSS-2 Specification](docs/SSS-2.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Compliance](docs/COMPLIANCE.md)
- [Operations](docs/OPERATIONS.md)
- [SDK Reference](docs/SDK.md)
- [API Reference](docs/API.md)
- [Oracle Module](docs/ORACLE.md)
- [Security Policy](docs/SECURITY.md)

## Program IDs

- **Stablecoin Program**: `2N19eMKD2xGpjNzfktVCPnkrbGJZAzuDFoH7SJtQiNm9`
- **Transfer Hook**: `PQgUt1swYzA9RSAG7gpyTQpk9TtbVReX11ytkeYTJBo`
- **Token-2022**: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`

## License

MIT
