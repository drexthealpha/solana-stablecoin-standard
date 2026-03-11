# SSS-2: Compliant Stablecoin Standard

SSS-2 extends SSS-1 with compliance features required for regulated stablecoins. It enables blacklist enforcement, token seizure, and GENIUS Act alignment.

## When to Use SSS-2

- Fiat-backed stablecoins (USDC-like)
- Regulatory-compliant tokens
- Institutional use cases
- Any token requiring compliance controls

## New Features

| Feature | Description |
|---------|-------------|
| Permanent Delegate | Always-enabled mint authority for compliance |
| Transfer Hook | Intercepts transfers to enforce blacklist |
| Blacklist | Per-address transfer restrictions |
| Seize | Ability to confiscate frozen account tokens |

## Configuration

SSS-2 requires both `enablePermanentDelegate` and `enableTransferHook` set to true.

```typescript
const args = {
  name: "USD Coin",
  symbol: "USDC",
  uri: "https://...",
  masterAuthority: authority,
  masterMinter: authority,
  blacklister: complianceOfficer,
  pauser: emergencyAdmin,
  enablePermanentDelegate: true,  // Required
  enableTransferHook: true,       // Required
  defaultAccountFrozen: false,
};
```

## Transfer Hook Integration

SSS-2 uses Token-2022's Transfer Hook extension to enforce blacklist checks on every transfer:

1. Transfer initiated
2. Token-2022 calls transfer hook program
3. Hook looks up source and destination blacklist PDAs
4. If either is blacklisted → transfer fails
5. Otherwise → transfer proceeds

```
┌─────────┐     ┌──────────────┐     ┌─────────────────┐
│ Transfer│────▶│  Token-2022  │────▶│ Transfer Hook   │
└─────────┘     └──────────────┘     └────────┬────────┘
                                               │
                    ┌──────────────────────────┤
                    ▼                          ▼
            ┌──────────────┐          ┌──────────────┐
            │ Source       │          │Destination  │
            │ Blacklist    │          │ Blacklist   │
            └──────┬───────┘          └──────┬───────┘
                   │                          │
            ──────┼──────────────────────────┼─────
                   ▼                          ▼
            Allow if neither is blacklisted
```

## Blacklist Flow

### Adding to Blacklist

```typescript
const compliance = new ComplianceModule(connection, wallet, mint);
await compliance.blacklistAdd(address, "Reason for blacklist");
```

### Removing from Blacklist

```typescript
await compliance.blacklistRemove(address);
```

### Checking Status

```typescript
const isBlacklisted = await compliance.getBlacklistStatus(address);
```

## Seizure Flow

SSS-2 enables seizure of tokens from blacklisted/compromised accounts:

1. Account must be frozen first
2. Blacklister calls `seize` instruction
3. Tokens transferred to treasury

```typescript
// Freeze first
await sdk.freeze(mint, compromisedAccount);

// Then seize
const compliance = new ComplianceModule(connection, wallet, mint);
await compliance.seize(compromisedAccount, treasury, amount);
```

**Important**: Account must be frozen before seizure. Attempting to seize from unfrozen account will fail with `AccountNotFrozen` error.

## GENIUS Act Alignment

SSS-2 is designed to meet US GENIUS Act requirements:

1. **Redeemability**: Tokens can be burned for underlying value
2. **Blacklist**: Block illicit addresses
3. **Seizure**: Confiscate from sanctioned accounts
4. **Audit Trail**: All compliance actions logged
5. **Sanctions Screening**: Integration points for OFAC checks

## Error Codes (SSS-2 Specific)

| Code | Description |
|------|-------------|
| NotCompliantStablecoin | SSS-2 features used on SSS-1 config |
| AccountNotFrozen | Seize attempted on unfrozen account |

## Example: Full Compliance Workflow

```typescript
const sdk = new SolanaStablecoin(connection, wallet);
const compliance = new ComplianceModule(connection, wallet, mint);

// Initialize SSS-2
const mint = await sdk.create(6, {
  name: "Regulated USD",
  symbol: "RUSD",
  enablePermanentDelegate: true,
  enableTransferHook: true,
  // ...
});

// Mint to user
await sdk.mint(mint, userAccount, 1000000);

// Screen before allowing transfers
const screening = await sanctionsScreener.screen(userAccount);
if (screening.hit) {
  await compliance.blacklistAdd(userAccount, "Sanctions hit");
}

// Emergency freeze
await sdk.freeze(mint, compromisedAccount);

// Seize to treasury
await compliance.seize(compromisedAccount, treasury, fullBalance);
```

## Testing Compliance Features

```bash
# Test blacklist enforcement
anchor test --grep "blacklist"

# Test seizure
anchor test --grep "seize"

# Test SSS-2 gate on SSS-1
anchor test --grep "SSS-2 instructions fail"
```
