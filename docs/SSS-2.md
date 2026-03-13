# SSS-2: Compliant Stablecoin Standard

## Purpose

GENIUS Act-ready compliant stablecoin. Matches PYUSD architecture. Enables blacklist enforcement, token seizure, and regulatory compliance.

## New Features (beyond SSS-1)

- **Permanent Delegate**: Always-enabled mint authority for compliance
- **Transfer Hook**: Intercepts transfers to enforce blacklist
- **Blacklist**: Per-address transfer restrictions
- **Seizure**: Ability to confiscate frozen account tokens

## All Instructions (SSS-1 + SSS-2)

- initialize
- mint
- burn
- freezeAccount
- thawAccount
- pause
- unpause
- setMinterAllowance
- updateRoles
- acceptAuthority
- **addToBlacklist** (SSS-2)
- **removeFromBlacklist** (SSS-2)
- **seize** (SSS-2)
- **initializeExtraAccountMetaList** (SSS-2)

## PYUSD Comparison

| Feature | SSS-2 | PYUSD |
|---------|-------|-------|
| Permanent Delegate | ✅ | ✅ |
| Freeze Authority | ✅ | ✅ |
| Blacklist | ✅ | ✅ |
| Seizure | ✅ | ✅ |
| Authority Model | Program-controlled PDAs | Program-controlled |

**PYUSD Mainnet Program ID:** `2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo`

## SSS-2 Gate

Every compliance instruction (`addToBlacklist`, `removeFromBlacklist`, `seize`) fails with `NotCompliantStablecoin` (error code 6001) if `enablePermanentDelegate=false`.

This ensures SSS-1 configurations cannot accidentally use compliance features.
