# Compliance

This document outlines the compliance framework for SSS-2 compliant stablecoins and regulatory considerations.

## Regulatory Framework

### GENIUS Act Alignment

The SSS-2 standard is designed to meet US GENIUS Act requirements for payment stablecoins:

| Requirement | SSS-2 Implementation |
|-------------|---------------------|
| 1:1 Backing | Managed off-chain, verifiable via oracle |
| Redemption | `burn` instruction always available |
| Capital Requirements | Off-chain KYC/AML |
| Blacklist | Transfer hook blocks sanctioned addresses |
| Seizure | `seize` instruction for authorized confiscation |
| Supervision | Audit trail for all compliance actions |

## Blacklist Enforcement

### How It Works

1. Every transfer triggers the Transfer Hook
2. Hook checks source and destination against blacklist
3. If either is blacklisted → transfer fails
4. No way to bypass (enforced at protocol level)

### Blacklist Management

```typescript
// Add to blacklist
await compliance.blacklistAdd(address, "KYC denied");

// Remove from blacklist  
await compliance.blacklistRemove(address);

// Check status
const isBlacklisted = await compliance.getBlacklistStatus(address);
```

## Seizure Procedures

### Legal Requirements

Before seizing tokens:
1. Account must be frozen (required by program)
2. Operator must have blacklister authority
3. Reason must be documented in audit log
4. Legal authorization should be obtained

### Seizure Flow

```
1. Compliance officer identifies suspicious account
2. Freeze account (prevents transfer out)
3. Document reason in audit log
4. Initiate seizure with `seize` instruction
5. Tokens transferred to treasury
6. All actions logged with timestamps
```

## Audit Trail

### What Gets Logged

| Event | Data Logged |
|-------|-------------|
| Blacklist Add | Timestamp, operator, address, reason, tx |
| Blacklist Remove | Timestamp, operator, address, tx |
| Seize | Timestamp, operator, source, destination, amount, reason, tx |
| Sanctions Hit | Timestamp, address, list matched, reason |

### Log Format

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "action": "SEIZE",
  "operator": "ABC123...",
  "address": "XYZ789...",
  "details": {
    "treasury": "TREASURY123...",
    "amount": 1000000,
    "reason": "OFAC SDN match"
  },
  "txHash": "5j6..."
}
```

### Access Control

- Audit logs stored in append-only structure
- Read access restricted to authorized personnel
- Logs exportable for regulatory reporting

## Sanctions Screening

### Integration Points

SSS-2 supports integration with sanctions screening providers:

```typescript
// Chainalysis (primary integration)
const CHAINALYSIS_API_KEY = process.env.CHAINALYSIS_API_KEY;

// Elliptic (alternative)
const ELLIPTIC_API_KEY = process.env.ELLIPTIC_API_KEY;
```

### Local Stub

For development/testing, a local OFAC SDN stub is included:

```typescript
const screening = await sanctionsScreener.screen(address);
if (screening.hit) {
  console.log(`Address ${address} matches: ${screening.listName}`);
}
```

### Production Recommendations

1. **Multiple Providers**: Use 2+ screening services
2. **Real-time Screening**: Screen before every large transfer
3. **Periodic Re-screening**: Re-check existing addresses
4. **Alerting**: Immediate notification on hits

## Operator Responsibilities

### Required Actions

1. **KYC/AML**: Verify identity of all minters
2. **Sanctions Screening**: Screen addresses before onboarding
3. **Record Keeping**: Maintain audit logs for 5+ years
4. **Reporting**: File SARs (Suspicious Activity Reports) when required
5. **Freeze Requests**: Respond to law enforcement within 24 hours

### Prohibited Actions

1. Seizing without proper authorization
2. Discriminatory targeting
3. Bypassing the blacklist
4. Disabling the transfer hook

## Incident Response

### Breach Protocol

1. **Detect**: Monitoring alerts to suspicious activity
2. **Contain**: Freeze affected accounts immediately
3. **Investigate**: Review audit logs
4. **Report**: File regulatory reports
5. **Remediate**: Seize if authorized, restore if false positive

### Contact Information

For legal/regulatory inquiries:
- compliance@example.com
- legal@example.com

## Compliance Checklist

- [ ] KYC process documented
- [ ] Sanctions screening integrated
- [ ] Audit logging enabled
- [ ] Operator training complete
- [ ] Legal review obtained
- [ ] Incident response plan in place
- [ ] Regular audits scheduled
