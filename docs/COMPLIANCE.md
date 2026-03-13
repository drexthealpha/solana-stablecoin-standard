# Compliance

## Section 1: GENIUS Act Mapping

| GENIUS Act Section | Requirement | SSS-2 Implementation | Instruction/Account |
|-------------------|-------------|---------------------|-------------------|
| §3 Reserve Backing | 1:1 liquid asset backing | Off-chain; `burn` always callable for redemption | `burn` |
| §6 Redemption Rights | Holder can redeem at par | Permissionless burn instruction | `burn` |
| §9 AML | Anti-money laundering | Transfer hook enforces blacklist at protocol level | Transfer Hook CPI |
| §11 Audit Trail | Regulator audit access | SQLite checksum chain with verification | `/audit-log/verify`, `/audit-log/export` |
| §14 Enforcement | Freeze and confiscation | `freezeAccount` + `seize` (requires freeze first) | `freezeAccount`, `seize` |

## Section 2: Role Separation

| Role | Capability | Cannot |
|------|-----------|--------|
| master_authority | Update all roles | Mint, freeze, blacklist directly |
| master_minter | Grant per-minter allowances | Freeze, blacklist, seize |
| blacklister | Freeze, blacklist, seize | Mint, pause |
| pauser | Pause/unpause | Mint, freeze, blacklist |

Per-minter allowances mirror Circle USDC design: each minter has a `MinterAllowance` PDA with `allowance: u64`. Every mint atomically deducts from allowance.

## Section 3: Audit Trail Schema

**Columns:** `id, timestamp, action, actor, target, reason, amount, tx_sig, prev_hash, row_hash`

**Checksum Chain Algorithm:**
1. Genesis row: `prev_hash = "GENESIS"`
2. Each row: `row_hash = SHA256(prev_hash + timestamp + action + actor + target + tx_sig)`
3. Verify by recomputing all hashes in order

**Endpoint:** `GET /audit-log/verify` → `{ valid: boolean, rows: number }`

## Section 4: Chainalysis KYT API v2

Screening occurs at **blacklist-add time**, NOT every transfer.

Why? Transfer hook latency is protocol-critical. Off-chain screening on every transfer would add 100-500ms per transaction, degrading UX. Screening at onboarding + on-chain blacklist enforcement provides equivalent security with better performance.

Integration point: Set `CHAINALYSIS_API_KEY` environment variable in compliance-service.

## Section 5: Transfer Hook Zero-Gap Enforcement

Protocol-level enforcement (Token-2022 Transfer Hook Extension) satisfies §9 AML better than off-chain because:
- No circumvention possible
- No race conditions
- Immutable enforcement
- No dependency on indexing services

## Section 6: Seizure Procedure

1. **Freeze**: `freezeAccount` — required before seizure
2. **Verify**: Confirm account state is "frozen"
3. **Seize**: `seize` instruction transfers to treasury
4. **Audit**: Log to checksum chain
5. **Export**: `GET /audit-log/export` for regulatory report

## Section 7: Authority Upgrade Path

| Stage | Authority Model | When |
|-------|----------------|------|
| Prototype | Single keypair | Development |
| Testnet | 2-of-3 Squads multisig | Pre-launch |
| Mainnet | 3-of-5 Squads + 24h timelock | Production |

**Squads v4 Program ID:** `SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf`

24-hour timelock applies to all `master_authority` transfers.
