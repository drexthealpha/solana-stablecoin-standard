[![CI](https://github.com/drexthealpha/solana-stablecoin-standard/actions/workflows/ci.yml/badge.svg)](https://github.com/drexthealpha/solana-stablecoin-standard/actions/workflows/ci.yml)

# Solana Stablecoin Standard

A comprehensive framework for building regulated stablecoins on Solana using Token-2022 with compliance features.

## Quick Start

```bash
# Install CLI
npm install -g sss-token-cli

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
npm install @stbr/sss-token
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

## Documentation

- [SSS-1 Specification](docs/SSS-1.md)
- [SSS-2 Specification](docs/SSS-2.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Compliance](docs/COMPLIANCE.md)
- [Operations](docs/OPERATIONS.md)
- [SDK Reference](docs/SDK.md)
- [API Reference](docs/API.md)

## Program IDs

- **Stablecoin Program**: `2N19eMKD2xGpjNzfktVCPnkrbGJZAzuDFoH7SJtQiNm9`
- **Transfer Hook**: `PQgUt1swYzA9RSAG7gpyTQpk9TtbVReX11ytkeYTJBo`
- **Token-2022**: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`

## License

MIT
