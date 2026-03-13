# Security Policy

## Supported Versions

| Version | Status |
|---------|--------|
| 0.1.0-beta | ✅ Supported |

## Reporting a Vulnerability

**GitHub:** Open a private security advisory at https://github.com/drexthealpha/solana-stablecoin-standard/security/advisories/new

**Policy:** 90-day responsible disclosure timeline.

1. Report → 24-hour acknowledgment
2. 90-day fix window
3. Coordinated disclosure

## Known Limitations

- Single keypair authority (upgrade path: see ARCHITECTURE.md - Squads v4)
- Devnet-only deployment

## Out of Scope

- Devnet-only issues
- Issues requiring physical access to keypair files
- Bugs in dependencies (report to upstream)

## Responsible Disclosure Timeline

1. **Report received** → Acknowledge within 24 hours
2. **Triage** → Assess severity within 7 days
3. **Fix development** → Target 90-day window
4. **Coordinated disclosure** → Public release with patch
