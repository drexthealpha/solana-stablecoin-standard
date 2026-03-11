# SSS-3: Private Stablecoin (Bonus Spec)

## Overview

SSS-3 extends SSS-2 with confidential transfers using Token-2022's confidential transfer extension. Balances and transfer amounts are hidden using ElGamal encryption while remaining verifiable on-chain.

## Key Extensions

- `confidential-transfer` — encrypts balances using ElGamal keypairs
- `confidential-transfer-fee` — encrypts fees
- Auditor key — designated authority can decrypt for regulatory compliance

## ElGamal Key Management

Each token account holder generates an ElGamal keypair off-chain. The public key is registered on-chain in the token account extension data. The mint authority holds a separate auditor ElGamal keypair for compliance decryption.

## ZCash Comparison

| Property | ZCash (zk-SNARKs) | SSS-3 (ElGamal + ZK proofs) |
|----------|-------------------|------------------------------|
| Proof system | Groth16 | Sigma protocols |
| On-chain verification | Full node | Solana validator |
| Auditability | Optional viewing key | Mandatory auditor key |
| Regulatory fit | Limited | GENIUS Act §9 compatible |

## Upgrade Path from SSS-2

1. Add `confidential-transfer` extension at mint init time (cannot be added post-init)
2. Each account holder calls `configure_account` to register ElGamal pubkey
3. Deposits/withdrawals require `apply_pending_balance` CPI
4. Transfer hook still fires — blacklist check happens before confidential transfer executes

## Status

Spec only. Implementation requires ZK proof generation library. Reference: spl-confidential-token.
