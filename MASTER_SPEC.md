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
[ ] DEVNET_PROOF.md with 14+ TX hashes
[x] SDK skeleton compiles
[x] CLI builds
[ ] Backend docker compose up — all 3 services healthy
[ ] Tests passing
[ ] Fuzz tests run with logs
[x] All 9 docs written
