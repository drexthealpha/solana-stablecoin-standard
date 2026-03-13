[![CI](https://github.com/YOUR_USERNAME/solana-stablecoin-standard/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/solana-stablecoin-standard/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@stbr/sss-token)](https://npmjs.com/package/@stbr/sss-token)

# Solana Stablecoin Standard (SSS)

OpenZeppelin for Solana stablecoins. SSS-1 (minimal) + SSS-2 (GENIUS Act compliant) in 10 minutes.

## Quick Start

```bash
# Install SDK
npm install @stbr/sss-token

# Create SSS-1 stablecoin
const mint = await sdk.create(6, {
  ...Presets.SSS1,
  name: "My Stablecoin",
  symbol: "MSTB",
  masterAuthority: authority,
  masterMinter: authority,
  pauser: authority,
  blacklister: authority,
});

# Create SSS-2 stablecoin
const mint = await sdk.create(6, {
  ...Presets.SSS2,
  name: "Compliant USD",
  symbol: "CUSD",
  masterAuthority: authority,
  masterMinter: authority,
  pauser: authority,
  blacklister: authority,
});

# Add to blacklist (SSS-2)
const compliance = new ComplianceModule(connection, wallet, mint);
await compliance.blacklistAdd(address, "KYC failure");

# Or use CLI
sss-token init --preset sss-2 --name "Compliant USD" --symbol "CUSD"
```

## Preset Comparison

| Feature | SSS-1 | SSS-2 |
|---------|-------|-------|
| Mint/Burn | ✅ | ✅ |
| Freeze/Thaw | ✅ | ✅ |
| Pause/Unpause | ✅ | ✅ |
| Role Management | ✅ | ✅ |
| Permanent Delegate | ❌ | ✅ |
| Transfer Hook | ❌ | ✅ |
| Blacklist Enforcement | ❌ | ✅ |
| Token Seizure | ❌ | ✅ |

## PYUSD Reference

SSS-2 is benchmarked against PYUSD (2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo)

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
