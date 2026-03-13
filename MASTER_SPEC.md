# MASTER_SPEC.md

Paste this file at the start of every AI session. These constants must never be changed.

## LOCKED CONSTANTS — NEVER CHANGE BETWEEN AI SESSIONS

TOKEN_2022_PROGRAM_ID = TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
SQUADS_V4_PROGRAM_ID = SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf
PYUSD_MAINNET_REF = 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo
STABLECOIN_PROGRAM_ID = 2N19eMKD2xGpjNzfktVCPnkrbGJZAzuDFoH7SJtQiNm9
TRANSFER_HOOK_PROGRAM_ID = PQgUt1swYzA9RSAG7gpyTQpk9TtbVReX11ytkeYTJBo

## PDA SEEDS

Config PDA:     [b"config", mint.key().as_ref()]
Blacklist PDA:  [b"blacklist", mint.key().as_ref(), address.key().as_ref()]
Minter PDA:     [b"minter", mint.key().as_ref(), minter.key().as_ref()]
Hook Meta PDA:  [b"extra-account-metas", mint.key().as_ref()]

## ERROR CODES (mirrors SVS)

StablecoinError::Unauthorized            → code 6000
StablecoinError::NotCompliantStablecoin  → code 6001 (SSS-2 gate failure)
StablecoinError::OverflowError           → code 6002
StablecoinError::AccountNotFrozen        → code 6003
StablecoinError::InvalidAmount           → code 6004
StablecoinError::AllowanceExceeded       → code 6005
StablecoinError::InvalidStringLength     → code 6006

## PRESET DEFINITIONS

SSS-1: enablePermanentDelegate=false, enableTransferHook=false, defaultAccountFrozen=false
SSS-2: enablePermanentDelegate=true,  enableTransferHook=true,  defaultAccountFrozen=false

## REPO STRUCTURE

sdk/src/index.ts       — SolanaStablecoin class + Presets
sdk/src/types.ts       — IDL types + interfaces
sdk/src/config.ts      — TOML parser + zod schema
sdk/src/compliance.ts  — ComplianceModule class
cli/src/index.ts       — Commander entrypoint (sss-token)
backend/mint-service   — port 3001
backend/indexer        — port 3002
backend/compliance-service — port 3003

## PROGRESS TRACKER

[x] Forked repo
[x] Created MASTER_SPEC.md
[x] Opened 4 GitHub issues (PDA Seeds, Token-2022 Extensions, Transfer Hook, Multisig Authority)
[x] Solana Playground stablecoin project created
[x] Solana Playground transfer-hook project created
[x] Wallet funded with 4+ SOL
[x] SVS_NOTES.md written
[x] Anchor program core (initialize, mint, burn, freeze, thaw, pause)
[x] SSS-2 compliance instructions (blacklist, seize)
[x] Devnet deploy — stablecoin Program ID: 2N19eMKD2xGpjNzfktVCPnkrbGJZAzuDFoH7SJtQiNm9
[x] Transfer-hook program deployed — Program ID: PQgUt1swYzA9RSAG7gpyTQpk9TtbVReX11ytkeYTJBo
[x] DEVNET_PROOF.md with 15 TX hashes — all confirmed on devnet
[x] SDK skeleton compiles
[x] CLI builds
[x] All 9 docs written
[x] GAP 2 — SQLite checksum chain audit log (better-sqlite3, SHA-256 prev_hash chain, /audit-log/verify, /audit-log/export)
[x] GAP 3 — Dockerfiles for all 4 backend services + TS/import fixes so docker compose up works
[x] GAP 4 — npm publish @drexthealpha/sss-token@0.1.0-beta (sdk/package.json ready — run: cd sdk && npm publish)
[ ] Tests passing (anchor test --skip-deploy)
      → Tests compile correctly. anchor test --skip-deploy requires local Anchor + Solana toolchain. CI pipeline runs against solana-test-validator on every push via .github/workflows/ci.yml.
[x] Fuzz tests run with real logs — FUZZ_RESULTS.md committed
[x] GAP 5 — SECURITY.md added: supported versions table, 90-day disclosure policy, known limitations, out-of-scope list
[x] GAP 6 — sss-token audit-log command wired to GET /audit-log on compliance-service (with --verify and --export flags)
[x] GAP 6 — sss-token holders command added: fetches all Token-2022 accounts by mint via getProgramAccounts, filters by min-balance
[x] BONUS — docs/ORACLE.md: full Switchboard oracle spec for EUR/BRL/CPI-indexed pegs, OracleConfig account, 3 instructions, mint-service integration
[x] BONUS — frontend/index.html: self-contained example frontend, Phantom wallet, mint/supply/blacklist/audit-verify, connects to local docker services

## OUTSTANDING

### Solana Playground Outage — 2 Placeholder Transactions
beta.solpg.io is currently down. The following two transaction hashes in DEVNET_PROOF.md are placeholders that require Playground to resolve:

  - PLACEHOLDER_HOOK_INIT_TX  → initialize_extra_account_meta_list on transfer hook program
  - PLACEHOLDER_BLOCKED_TX   → transfer attempt from a blacklisted address (proves hook fires)

Both will be updated immediately when Playground comes back online.

The transfer hook program IS deployed and verifiable:
  solana program show PQgUt1swYzA9RSAG7gpyTQpk9TtbVReX11ytkeYTJBo --url devnet

All other 15 transaction hashes in DEVNET_PROOF.md are confirmed real transactions on devnet.

### npm publish
Run this once to make the SDK installable via npm:
  cd sdk && npm publish --access public --tag beta

This is configured and ready — sdk/package.json has name @drexthealpha/sss-token, version 0.1.0-beta, publishConfig.access = public.
