# SDK Reference

The SSS TypeScript SDK provides a programmatic interface for interacting with SSS stablecoins.

## Installation

```bash
npm install @stbr/sss-token
```

## Quick Start

```typescript
import { SolanaStablecoin, ComplianceModule, Presets } from "@stbr/sss-token";
import { Connection } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");
const sdk = new SolanaStablecoin(connection, wallet);

// Initialize SSS-2 stablecoin
const mint = await sdk.create(6, {
  name: "My Stablecoin",
  symbol: "MSTB",
  uri: "https://...",
  masterAuthority: authority,
  masterMinter: authority,
  blacklister: authority,
  pauser: authority,
  ...Presets.SSS_2,
});
```

## Configuration

### Presets

```typescript
import { Presets } from "@stbr/sss-token";

// SSS-1: Minimal
const sss1Config = Presets.SSS_1;

// SSS-2: Compliant
const sss2Config = Presets.SSS_2;
```

### Custom Configuration

```typescript
const customConfig = {
  preset: Preset.SSS_2,
  enablePermanentDelegate: true,
  enableTransferHook: true,
  defaultAccountFrozen: false,
};
```

## Core API

### SolanaStablecoin

#### constructor(connection, wallet, programId?)

```typescript
const sdk = new SolanaStablecoin(
  connection,           // Solana connection
  wallet,               // Anchor wallet
  programId?            // Optional: defaults to STABLECOIN_PROGRAM_ID
);
```

#### create(decimals, args, mintKeypair?)

Creates and initializes a new stablecoin.

```typescript
const mint = await sdk.create(6, {
  name: "USD Coin",
  symbol: "USDC",
  uri: "https://...",
  masterAuthority: authority,
  masterMinter: authority,
  blacklister: blacklister,
  pauser: pauser,
  enablePermanentDelegate: true,
  enableTransferHook: true,
  defaultAccountFrozen: false,
});
```

**Returns**: `Promise<PublicKey>` - Mint address

#### mint(mint, recipient, amount)

Mints tokens to a recipient.

```typescript
await sdk.mint(
  mintAddress,      // Mint PublicKey
  recipientAddress, // Recipient PublicKey
  1000000          // Amount (in smallest units)
);
```

#### burn(mint, amount)

Burns tokens from the caller's account.

```typescript
await sdk.burn(mintAddress, 500000);
```

#### freeze(mint, address)

Freezes a token account.

```typescript
await sdk.freeze(mintAddress, accountToFreeze);
```

#### thaw(mint, address)

Unfreezes a token account.

```typescript
await sdk.thaw(mintAddress, accountToThaw);
```

#### pause(mint)

Pauses all minting and transfers.

```typescript
await sdk.pause(mintAddress);
```

#### unpause(mint)

Resumes operations.

```typescript
await sdk.unpause(mintAddress);
```

#### getTotalSupply(mint)

Gets the total token supply.

```typescript
const supply = await sdk.getTotalSupply(mintAddress);
```

#### getConfig(mint)

Gets the stablecoin configuration.

```typescript
const config = await sdk.getConfig(mintAddress);
```

#### updateRoles(mint, args)

Updates authority roles.

```typescript
await sdk.updateRoles(mintAddress, {
  newMasterAuthority: newAuthority,
  newPauser: newPauser,
});
```

#### setMinterAllowance(mint, minter, allowance)

Sets minting allowance for an address.

```typescript
await sdk.setMinterAllowance(
  mintAddress,
  minterAddress,
  10000000 // allowance amount
);
```

### ComplianceModule

#### constructor(connection, wallet, mint, programId?)

```typescript
const compliance = new ComplianceModule(
  connection,
  wallet,
  mintAddress
);
```

#### blacklistAdd(address, reason)

Adds an address to the blacklist.

```typescript
await compliance.blacklistAdd(
  addressToBlacklist,
  "KYC failure"
);
```

#### blacklistRemove(address)

Removes an address from blacklist.

```typescript
await compliance.blacklistRemove(addressToRemove);
```

#### seize(frozenAccount, treasury, amount)

Seizes tokens from a frozen account.

```typescript
await compliance.seize(
  frozenAccountAddress,
  treasuryAddress,
  amountToSeize
);
```

#### getBlacklistStatus(address)

Checks if an address is blacklisted.

```typescript
const isBlacklisted = await compliance.getBlacklistStatus(address);
```

## Static Methods

### getConfigPDA(mint)

Derives the config PDA address.

```typescript
const configPDA = SolanaStablecoin.getConfigPDA(mintAddress);
```

### getMinterPDA(mint, minter)

Derives the minter PDA address.

```typescript
const minterPDA = SolanaStablecoin.getMinterPDA(mintAddress, minterAddress);
```

### getBlacklistPDA(mint, address)

Derives the blacklist PDA address.

```typescript
const blacklistPDA = SolanaStablecoin.getBlacklistPDA(mintAddress, address);
```

## Error Handling

```typescript
import { StablecoinError } from "@stbr/sss-token";

try {
  await sdk.mint(mint, recipient, amount);
} catch (error) {
  if (error.message.includes("Unauthorized")) {
    // Handle authority error
  } else if (error.message.includes("InvalidAmount")) {
    // Handle invalid amount
  }
}
```

## Examples

### Full SSS-2 Workflow

```typescript
const sdk = new SolanaStablecoin(connection, wallet);
const compliance = new ComplianceModule(connection, wallet, mint);

// Initialize
const mint = await sdk.create(6, { ...SSS_2_Config });

// Mint to user
await sdk.mint(mint, userAccount, 1000000);

// User transfers - automatically checked against blacklist

// Compliance: freeze suspicious account
await sdk.freeze(mint, suspiciousAccount);

// Seize to treasury
await compliance.seize(suspiciousAccount, treasury, 500000);

// Check blacklist
const status = await compliance.getBlacklistStatus(suspiciousAccount);
console.log(`Blacklisted: ${status}`);
```

### Using Config Files

```typescript
import { parseTOMLConfig, buildInitializeArgs } from "@stbr/sss-token";

const configData = fs.readFileSync("stablecoin.toml", "utf-8");
const config = parseTOMLConfig(configData);

const args = buildInitializeArgs(config, authority);
const mint = await sdk.create(6, args);
```

## Constants

```typescript
import { 
  STABLECOIN_PROGRAM_ID,
  TRANSFER_HOOK_PROGRAM_ID,
  TOKEN_PROGRAM_ID 
} from "@stbr/sss-token";

// Stablecoin: 2N19eMKD2xGpjNzfktVCPnkrbGJZAzuDFoH7SJtQiNm9
// Transfer Hook: PQgUt1swYzA9RSAG7gpyTQpk9TtbVReX11ytkeYTJBo
// Token-2022: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
```
