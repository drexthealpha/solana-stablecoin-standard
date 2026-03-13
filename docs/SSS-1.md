# SSS-1: Minimal Stablecoin Standard

## Purpose

Minimal compliant stablecoin without compliance extensions. Use for internal tokens, gaming currencies, loyalty points, or any non-regulated use case.

## Role Schema

| Role | Pubkey Field | Permissions |
|------|--------------|-------------|
| master_authority | `masterAuthority` | Update roles, accept authority transfer |
| master_minter | `masterMinter` | Grant/remove minter allowances |
| pauser | `pauser` | Pause/unpause all operations |

## Instructions

### initialize

Creates the stablecoin with SSS-1 configuration (enablePermanentDelegate=false, enableTransferHook=false).

### mint

Creates new tokens. Requires minter allowance.

### burn

Destroys tokens from caller's account.

### freezeAccount

Freezes a specific token account. Frozen accounts cannot transfer.

### thawAccount

Unfreezes a previously frozen account.

### pause

Stops all minting and transfers. Emergency function.

### unpause

Resumes normal operations.

### setMinterAllowance

Grants minting allowance to an address.

### updateRoles

Updates authority addresses. Supports pending authority for secure handoffs.

### acceptAuthority

Completes authority transfer started by updateRoles.

## Explicit Limitations

- ❌ No blacklist support
- ❌ No seizure capability  
- ❌ No transfer hook
- ❌ Not GENIUS Act compliant

## Use Cases

- Protocol-native stablecoins
- Test environments
- Non-custodial issuers
- Internal DAO tokens
