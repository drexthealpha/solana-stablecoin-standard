# Oracle Integration Module

Switchboard oracle integration for non-USD pegged SSS stablecoins. Enables EUR, BRL, CPI-indexed, and custom fiat-pegged tokens using the same SSS-1/SSS-2 token infrastructure.

## Architecture

The oracle module is a **separate program** from the SSS token. The token itself remains pure SSS-1 or SSS-2. The oracle feeds into the mint/redeem pricing logic only — not into token extensions or transfer hook logic.
┌─────────────────────┐   price feed    ┌──────────────────────────┐
│   Switchboard       │───────────────▶ │   Oracle Module          │
│   On-Demand Feed    │                 │   (separate program)     │
└─────────────────────┘                 └────────────┬─────────────┘
│ CPI: get_mint_price
▼
┌─────────────────────┐
│   SSS-1 / SSS-2     │
│   Stablecoin Mint   │
└─────────────────────┘

**Why a separate program?** The SSS token standard is jurisdiction-agnostic. Pricing logic is jurisdiction-specific and changes frequently. Decoupling means the token standard stays stable while issuers swap oracle implementations independently.

## Supported Peg Types

| Peg | Switchboard Feed | Decimals | Use Case |
|-----|-----------------|----------|----------|
| EUR/USD | `EURUSDFeed` | 6 | European stablecoins |
| BRL/USD | `BRLUSDFeed` | 6 | Brazilian Real tokens |
| CPI-indexed | US CPI Monthly Feed | 2 | Inflation-adjusted store of value |
| Custom | Any Switchboard pull feed | configurable | Any fiat or commodity peg |

## On-Chain Program

### OracleConfig Account
```rust
#[account]
pub struct OracleConfig {
    pub stablecoin_mint: Pubkey,      // The SSS mint this oracle serves
    pub feed_account: Pubkey,         // Switchboard pull feed pubkey
    pub peg_currency: String,         // "EUR", "BRL", "CPI", etc.
    pub staleness_threshold: i64,     // Max age in seconds before price rejected
    pub price_decimals: u8,           // Decimal precision of the feed
    pub authority: Pubkey,            // Must match SSS master_authority
    pub bump: u8,
}
```

### PDA Seeds
OracleConfig PDA: ["oracle-config", stablecoin_mint.key()]

### Instructions

#### `initialize_oracle`

Registers a Switchboard pull feed with an existing SSS mint. Requires `master_authority` signature. Validates that `feed_account` is a valid Switchboard pull feed before storing.

#### `get_mint_price`

Returns the current USD-denominated price for 1 unit of the pegged currency. Pulls live data from Switchboard on-demand. Reverts if price is older than `staleness_threshold`.
```rust
// Returns: price as u64 scaled by 10^price_decimals
// Example: EUR/USD = 0.92 → returns 920000 (6 decimals)
pub fn get_mint_price(ctx: Context<GetMintPrice>) -> Result<u64>
```

#### `assert_price_fresh`

CPI-callable guard that reverts if the cached price is stale. Mint-service calls this as a preflight before every mint or redeem operation.
```rust
// Reverts with StalePriceFeed if age > staleness_threshold
pub fn assert_price_fresh(ctx: Context<AssertPriceFresh>) -> Result<()>
```

## Integration with Mint Service
```typescript
// backend/mint-service/src/index.ts — extended for oracle pegs

// 1. Get current peg price from oracle
const oraclePrice = await oracleProgram.methods
  .getMintPrice()
  .accounts({
    oracleConfig: oracleConfigPDA,
    feedAccount: switchboardFeedAccount,
  })
  .view(); // read-only, no transaction needed

// 2. User deposits $1000 USD — calculate how many EUR-stable to mint
//    oraclePrice = 920000 (EUR/USD = 0.92, 6 decimals)
const usdAmount = 1000;
const eurAmount = Math.floor((usdAmount * 10 ** decimals) / Number(oraclePrice));

// 3. Mint via SSS SDK — the token itself is standard SSS-2, oracle-unaware
await stable.mint({ recipient, amount: BigInt(eurAmount) });
```

## Error Codes

| Error | Description |
|-------|-------------|
| `StalePriceFeed` | Feed price is older than `staleness_threshold` seconds |
| `InvalidFeedAccount` | `feed_account` is not a valid Switchboard pull feed |
| `OracleAuthorityMismatch` | Caller is not `master_authority` of the linked SSS mint |
| `PriceOverflow` | Computed mint amount would exceed u64 max |

## Reference

- [Switchboard On-Demand Examples](https://github.com/switchboard-xyz/sb-on-demand-examples)
- [Switchboard Documentation](https://docs.switchboard.xyz)
- [Switchboard On-Demand SDK](https://www.npmjs.com/package/@switchboard-xyz/on-demand)

## Status

**Spec complete. Implementation pending.**

To implement:
1. Deploy a Switchboard pull feed subscription for the target currency pair
2. Write the `oracle-module` Anchor program (~200 lines Rust)
3. Wire `assert_price_fresh` CPI into `mint-service` before every mint
4. Add oracle config pubkeys to `docker-compose.yml` environment

Estimated additional work: 2 days.
