# Oracle Integration Module

Switchboard oracle integration for non-USD pegged SSS stablecoins. Enables EUR, BRL, CPI-indexed, and custom fiat-pegged tokens using the same SSS-1/SSS-2 token infrastructure.

## Architecture

The oracle module is a **separate program** — the SSS token itself remains pure SSS-1 or SSS-2. The oracle feeds into the mint/redeem pricing logic only, not into token extensions or transfer logic.
┌─────────────────────┐   price feed    ┌──────────────────────────┐
│   Switchboard       │───────────────▶ │   Oracle Module          │
│   On-Demand Feed   │                 │   (separate program)     │
└─────────────────────┘                 └────────────┬─────────────┘
│ CPI: get_mint_price
▼
┌─────────────────────┐
│   SSS-1 / SSS-2    │
│   Stablecoin Mint   │
└─────────────────────┘

**Why separate?** The SSS token is an open standard. Pricing logic is jurisdiction-specific and changes frequently. Decoupling means the token standard stays stable while issuers swap oracle implementations.

## Supported Peg Types

| Peg | Switchboard Feed | Decimals | Use Case |
|-----|-----------------|----------|----------|
| EUR/USD | `EURUSDFeed` | 6 | European stablecoins |
| BRL/USD | `BRLUSDFeed` | 6 | Brazilian Real tokens (Superteam BR) |
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

Registers a Switchboard pull feed with an existing SSS mint.
```rust
// Requires: master_authority signature
// Validates: feed_account is a valid Switchboard pull feed
// Creates: OracleConfig PDA
pub fn initialize_oracle(ctx: Context<InitializeOracle>, args: OracleArgs) -> Result<()>
```

#### `get_mint_price`

Returns the current USD-denominated price for 1 unit of the pegged currency. Pulls from Switchboard on-demand.
```rust
// Returns: price as u64 scaled by 10^price_decimals
// Reverts if: price is older than staleness_threshold
pub fn get_mint_price(ctx: Context<GetMintPrice>) -> Result<u64>
```

#### `assert_price_fresh`

CPI-callable guard that reverts if the cached price is stale. Mint/redeem services call this as a preflight check before executing any mint or burn.
```rust
// Called via CPI from mint-service before sdk.mint()
// Reverts with StalePriceFeed if slot_diff > staleness_threshold
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
  .view(); // read-only, no transaction

// 2. Calculate how many EUR-stable tokens to mint for a given USD amount
//    Example: user deposits $1000 USD, EUR rate = 0.92, price = 920000 (6 decimals)
const usdAmount = 1000;
const eurAmount = Math.floor((usdAmount / Number(oraclePrice)) * 10 ** decimals);

// 3. Mint via SSS SDK — token itself is standard SSS-2, no oracle awareness needed
await stable.mint({ recipient, amount: BigInt(eurAmount) });
```

## Error Codes

| Error | Description |
|-------|-------------|
| `StalePriceFeed` | Feed price older than `staleness_threshold` |
| `InvalidFeedAccount` | `feed_account` is not a valid Switchboard feed |
| `OracleAuthorityMismatch` | Caller is not `master_authority` of the SSS mint |
| `PriceOverflow` | Computed mint amount exceeds u64 |

## Reference

- [Switchboard On-Demand Examples](https://github.com/switchboard-xyz/sb-on-demand-examples)
- [Switchboard Documentation](https://docs.switchboard.xyz)
- [Switchboard On-Demand SDK](https://www.npmjs.com/package/@switchboard-xyz/on-demand)
- [Confidential Balances Product Guide](https://github.com/solana-developers/Confidential-Balances-Sample/blob/main/docs/product_guide.md)

## Status

**Spec complete. Not yet implemented.**

Implementation requires:
1. Deploy a Switchboard pull feed subscription for the target currency pair
2. Write the `oracle-module` Anchor program (~200 lines Rust)
3. Wire `assert_price_fresh` CPI into `mint-service` before every mint
4. Add `oracle-config` to `docker-compose.yml` environment for the mint service

Estimated additional work: 2 days.
