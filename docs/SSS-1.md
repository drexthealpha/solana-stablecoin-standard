# SSS-1: Minimal Stablecoin Standard

SSS-1 is the baseline stablecoin configuration for Solana. It provides essential token operations without compliance features.

## When to Use SSS-1

- Internal tokens for protocols/dApps
- Gaming currencies
- Loyalty points
- DAO governance tokens
- Any use case not requiring regulatory compliance

## Features

| Feature | Description |
|---------|-------------|
| Mint/Burn | Authorized minters can create/destroy tokens |
| Freeze/Thaw | Authority can freeze individual accounts |
| Pause | Emergency stop for all minting/transfers |
| Role Management | Separate authorities for minting, freezing, pausing |

## Account Structure

### StablecoinConfig

```
name: String (max 32)
symbol: String (max 10)
uri: String (max 200)
decimals: u8
master_authority: Pubkey
pending_master_authority: Option<Pubkey>
master_minter: Pubkey
blacklister: Pubkey
pauser: Pubkey
is_paused: bool
enable_permanent_delegate: bool
enable_transfer_hook: bool
default_account_frozen: bool
bump: u8
```

### MinterAllowance

```
allowance: u64
bump: u8
```

## Instructions

### Initialize

Creates the stablecoin with configurable parameters.

```typescript
await sdk.create(decimals, {
  name: "My Token",
  symbol: "MTK",
  uri: "https://...",
  masterAuthority: authority,
  masterMinter: authority,
  blacklister: authority,
  pauser: authority,
  enablePermanentDelegate: false,
  enableTransferHook: false,
  defaultAccountFrozen: false,
});
```

### Mint

Creates new tokens. Requires `master_minter` or approved minter allowance.

```typescript
await sdk.mint(mint, recipient, amount);
```

### Burn

Destroys tokens from caller's account.

```typescript
await sdk.burn(mint, amount);
```

### FreezeAccount

Freezes a specific token account. Frozen accounts cannot transfer tokens.

```typescript
await sdk.freeze(mint, address);
```

### ThawAccount

Unfreezes a previously frozen account.

```typescript
await sdk.thaw(mint, address);
```

### Pause

Stops all minting and transfers. Emergency function.

```typescript
await sdk.pause(mint);
```

### Unpause

Resumes normal operations.

```typescript
await sdk.unpause(mint);
```

### UpdateRoles

Updates authority addresses. Supports pending authority for secure handoffs.

```typescript
await sdk.updateRoles(mint, {
  newMasterAuthority: newAuthority,
  newMasterMinter: newMinter,
  newPauser: newPauser,
});
```

### SetMinterAllowance

Grants minting allowance to an address.

```typescript
await sdk.setMinterAllowance(mint, minterAddress, allowance);
```

## Security Model

1. **Authority Separation**: Different roles can be assigned to different addresses
2. **Pause Capability**: Emergency stop for systemic issues
3. **Freeze/Thaw**: Account-level restrictions without seizing
4. **Minter Allowances**: Controlled minting with quotas

## Example Usage

```typescript
const sdk = new SolanaStablecoin(connection, wallet);

// Create SSS-1 token
const mint = await sdk.create(6, {
  name: "Game Token",
  symbol: "GAME",
  uri: "",
  masterAuthority: gameAuthority,
  masterMinter: gameAuthority,
  blacklister: gameAuthority,
  pauser: gameAuthority,
  enablePermanentDelegate: false,
  enableTransferHook: false,
  defaultAccountFrozen: false,
});

// Mint to player
await sdk.mint(mint, playerAddress, 1000);

// Player plays game and earns tokens
await sdk.burn(mint, 100);

// Emergency pause
await sdk.pause(mint);
```

## Error Codes

| Code | Description |
|------|-------------|
| Unauthorized | Caller lacks required authority |
| InvalidAmount | Amount must be > 0 |
| InvalidStringLength | String exceeds max characters |
| OverflowError | Arithmetic overflow |
