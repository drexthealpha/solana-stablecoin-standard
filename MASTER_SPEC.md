## LOCKED CONSTANTS — NEVER CHANGE BETWEEN AI SESSIONS

TOKEN_2022_PROGRAM_ID = TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
SQUADS_V4_PROGRAM_ID = SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf
PYUSD_MAINNET_REF = 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo

## PDA SEEDS

Config PDA: [b"config", mint.key().as_ref()]
Blacklist PDA: [b"blacklist", mint.key().as_ref(), address.key().as_ref()]
Minter PDA: [b"minter", mint.key().as_ref(), minter.key().as_ref()]
Hook Meta PDA: [b"extra-account-metas", mint.key().as_ref()]

## ERROR PATTERN

StablecoinError::Unauthorized
StablecoinError::NotCompliantStablecoin
StablecoinError::OverflowError
StablecoinError::AccountNotFrozen
StablecoinError::InvalidAmount
StablecoinError::AllowanceExceeded

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
[ ] GAP 4 — npm publish @stbr/sss-token@0.1.0-beta
[ ] Tests passing (anchor test --skip-deploy)
[ ] Fuzz tests run with real logs

## GAPS LOG

### GAP 1 — RESOLVED
lib.rs: missing #[account(mut)] on mint in MintTokens and BurnTokens structs. Fixed in Playground.

### GAP 2 — RESOLVED (commit: feat(gap-2): SQLite checksum chain audit log)
audit.ts replaced with better-sqlite3 SQLite implementation.
Schema: id, timestamp, action, actor, target, reason, amount, tx_sig, prev_hash, row_hash.
Hash chain: SHA-256(prev_hash + timestamp + action + actor + target + tx_sig). Genesis prev_hash = "GENESIS".
New routes: GET /audit-log/verify, GET /audit-log/export (CSV).
package.json created with better-sqlite3 ^9.4.3.

### GAP 3 — RESOLVED (commit: fix: tsconfig rootDir to fix SDK import in Docker, remove committed zip)
Created Dockerfile + tsconfig.json in all 4 backend services.
Fixed TS syntax error in indexer/src/index.ts — onLogsCallback changed to const arrow function.
Fixed tsconfig rootDir to "." in mint-service and compliance-service so sdk/ folder is in scope.
Fixed import paths to ../sdk/src/index and ../sdk/src/compliance.
docker-compose.yml build contexts set to repo root (context: .) for all services.
wallet.json added to .gitignore. repo-snapshot-v3.zip removed from git. *.zip added to .gitignore.

### GAP 4 — PENDING
sdk/package.json needs name set to @stbr/sss-token, files field, main/types fields, and npm publish run.
