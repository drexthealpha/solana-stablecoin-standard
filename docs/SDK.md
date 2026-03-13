# SDK Reference

`@stbr/sss-token` is the TypeScript SDK for the Solana Stablecoin Standard. It wraps the on-chain Anchor program and provides a clean, typed API for deploying and operating SSS-1 and SSS-2 stablecoins.

## Installation
```bash
npm install @stbr/sss-token
```

Peer dependencies:
```bash
npm install @solana/web3.js @coral-xyz/anchor
```

## Quick Start
```typescript
import { SolanaStablecoin, Presets } from "@stbr/sss-token";
import { Connection, Keypair } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Deploy a new SSS-2 compliant stablecoin in one call
const stable = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_2,
  name: "My Stablecoin",
  symbol: "MYUSD",
  decimals: 6,
  authority: adminKeypair,
});

// Mint 1 MYUSD (1_000_000 base units at 6 decimals)
await stable.mint({ recipient: recipientPublicKey, amount: 1_000_000n, minter: adminKeypair.publicKey });

// SSS-2: add address to blacklist
await stable.compliance.blacklistAdd(suspiciousAddress, "OFAC match");

// SSS-2: seize tokens from frozen account
await stable.compliance.seize(frozenAccount, treasuryAccount, 1_000_000n);

// Query total supply
const supply = await stable.getTotalSupply();
console.log("Total supply:", supply);
```

## Presets

| Preset | Permanent Delegate | Transfer Hook | Blacklist | Seizure | Use Case |
|--------|-------------------|---------------|-----------|---------|----------|
| `Presets.SSS_1` | ❌ | ❌ | ❌ | ❌ | Internal tokens, DAO treasuries |
| `Presets.SSS_2` | ✅ | ✅ | ✅ | ✅ | Regulated stablecoins (USDC-class) |
```typescript
// SSS-1: minimal
const stable1 = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_1,
  name: "Simple Token",
  symbol: "SMPL",
  decimals: 6,
  authority: adminKeypair,
});

// SSS-2: GENIUS Act compliant
const stable2 = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_2,
  name: "USD Coin",
  symbol: "USDC",
  decimals: 6,
  authority: adminKeypair,
});
```

## Custom Configuration

Pass an `extensions` object instead of a preset for fine-grained control:
```typescript
const custom = await SolanaStablecoin.create(connection, {
  name: "Custom Stable",
  symbol: "CUSD",
  extensions: {
    permanentDelegate: true,
    transferHook: false,
    defaultAccountFrozen: false,
  },
  authority: adminKeypair,
});
```

Or load from a TOML config file:
```typescript
const { sdk, mint } = await SolanaStablecoin.fromConfig(
  "./stablecoin.toml",
  connection,
  adminKeypair
);
```

Example `stablecoin.toml`:
```toml
preset = "sss-2"
name = "My Stablecoin"
symbol = "MYUSD"
uri = "https://example.com/token.json"
decimals = 6
```

## Core API

### `SolanaStablecoin.create(connection, opts)` → `Promise<SolanaStablecoin>`

Static factory. Deploys a new mint and config PDA on-chain. Sets `instance._mint` automatically so subsequent instance method calls do not need an explicit mint argument.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `preset` | `PresetConfig` | One of preset or extensions | Use `Presets.SSS_1` or `Presets.SSS_2` |
| `extensions` | object | One of preset or extensions | `{ permanentDelegate, transferHook, defaultAccountFrozen? }` |
| `name` | string | ✅ | Token name (max 32 chars) |
| `symbol` | string | ✅ | Token symbol (max 10 chars) |
| `uri` | string | — | Token metadata URI (max 200 chars) |
| `decimals` | number | — | Default: 6 |
| `authority` | Keypair | ✅ | Master authority keypair |

### `stable.mint(opts)` → `Promise<string>`

Mints tokens to a recipient. Returns transaction signature.
```typescript
const tx = await stable.mint({
  recipient: recipientPublicKey,
  amount: 1_000_000n,           // bigint, base units
  minter: minterPublicKey,      // optional, defaults to authority
});
```

Also accepts explicit mint (backward compat):
```typescript
const tx = await sdk.mint(mintPubkey, { recipient, amount: 1_000_000n });
```

### `stable.burn(amount)` → `Promise<string>`

Burns tokens from the authority's token account.
```typescript
const tx = await stable.burn(500_000n);
```

### `stable.freeze(address)` → `Promise<string>`

Freezes a token account. Requires `blacklister` authority.
```typescript
const tx = await stable.freeze(suspiciousAccountPublicKey);
```

### `stable.thaw(address)` → `Promise<string>`

Thaws a previously frozen token account.
```typescript
const tx = await stable.thaw(accountPublicKey);
```

### `stable.pause()` → `Promise<string>`

Pauses all minting and transfers. Requires `pauser` authority.

### `stable.unpause()` → `Promise<string>`

Resumes operations after a pause.

### `stable.getTotalSupply()` → `Promise<number>`

Returns the current total supply from on-chain mint info.

### `stable.getConfig()` → `Promise<StablecoinConfig | null>`

Returns the full on-chain config account data including all roles, flags, and supply.

### `stable.setMinterAllowance(mint, minter, allowance)` → `Promise<string>`

Sets per-minter quota. Requires `master_minter` authority.
```typescript
await stable.setMinterAllowance(mintPubkey, minterPublicKey, 10_000_000);
```

## Compliance API (SSS-2)

Available via `stable.compliance` after `SolanaStablecoin.create()` with `Presets.SSS_2` or `extensions: { permanentDelegate: true }`.

### `stable.compliance.blacklistAdd(address, reason)` → `Promise<string>`

Creates a `BlacklistEntry` PDA for the address. The transfer hook rejects all transfers involving this address automatically.
```typescript
const tx = await stable.compliance.blacklistAdd(
  suspiciousAddress,
  "OFAC SDN match — 2025-01-15"
);
```

### `stable.compliance.blacklistRemove(address)` → `Promise<string>`

Removes address from blacklist. Closes the PDA and refunds rent.

### `stable.compliance.seize(sourceAccount, destinationAccount, amount)` → `Promise<string>`

Transfers tokens from a frozen account to treasury using the permanent delegate. Account must be frozen first.
```typescript
// 1. Freeze the account
await stable.freeze(frozenAccount);
// 2. Seize to treasury
const tx = await stable.compliance.seize(frozenAccount, treasuryAccount, 1_000_000n);
```

### `stable.compliance.getBlacklistStatus(address)` → `Promise<boolean>`

Returns `true` if address is currently blacklisted.

## TOML Config Reference
```toml
# stablecoin.toml
preset = "sss-2"
name = "My Stablecoin"
symbol = "MYUSD"
uri = ""
decimals = 6
```

## Error Handling

| Error | Meaning | Fix |
|-------|---------|-----|
| `NotCompliantStablecoin` | Called SSS-2 instruction on SSS-1 config | Initialize with `Presets.SSS_2` |
| `Unauthorized` | Caller is not the required authority | Use the correct authority keypair |
| `AccountNotFrozen` | Seize attempted without freeze | Call `stable.freeze(address)` first |
| `AllowanceExceeded` | Minter quota exceeded | Call `setMinterAllowance` to increase |
| `OverflowError` | u64 arithmetic overflow | Amount too large for u64 |
| `InvalidAmount` | Amount is 0 | Pass amount > 0 |
| `No mint address` | Instance method called without mint set | Use `SolanaStablecoin.create()` factory |

## Constants
```typescript
import {
  STABLECOIN_PROGRAM_ID,  // 2N19eMKD2xGpjNzfktVCPnkrbGJZAzuDFoH7SJtQiNm9
  TRANSFER_HOOK_PROGRAM_ID, // PQgUt1swYzA9RSAG7gpyTQpk9TtbVReX11ytkeYTJBo
  TOKEN_PROGRAM_ID,         // TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
} from "@stbr/sss-token";
```
