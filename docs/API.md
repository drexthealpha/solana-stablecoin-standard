# API Reference

## mint-service (Port 3001)

### GET /health

```bash
curl http://localhost:3001/health
```

Response:
```json
{ "status": "ok", "service": "mint-service", "timestamp": "2024-01-15T10:30:00Z" }
```

### POST /mint

```bash
curl -X POST http://localhost:3001/mint \
  -H "Content-Type: application/json" \
  -d '{
    "mint": "7xKXtg...",
    "recipient": "7xKXtg...",
    "amount": 1000000,
    "keypairBase64": "..."
  }'
```

Response:
```json
{ "success": true, "note": "Use sss-token CLI for full minting" }
```

### POST /burn

```bash
curl -X POST http://localhost:3001/burn \
  -H "Content-Type: application/json" \
  -d '{
    "mint": "7xKXtg...",
    "amount": 500000,
    "keypairBase64": "..."
  }'
```

Response:
```json
{ "success": true, "note": "Use sss-token CLI for full burn" }
```

---

## indexer (Port 3002)

### GET /health

```bash
curl http://localhost:3002/health
```

Response:
```json
{ "status": "ok", "service": "indexer", "timestamp": "2024-01-15T10:30:00Z" }
```

### GET /transactions/:mint

```bash
curl http://localhost:3002/transactions/7xKXtg...
```

Response:
```json
{
  "mint": "7xKXtg...",
  "transactions": [],
  "note": "Connect to Helius webhook for production indexing"
}
```

### GET /supply/:mint

```bash
curl http://localhost:3002/supply/7xKXtg...
```

Response:
```json
{
  "mint": "7xKXtg...",
  "supply": "0",
  "note": "Query on-chain for live supply"
}
```

---

## compliance-service (Port 3003)

### GET /health

```bash
curl http://localhost:3003/health
```

Response:
```json
{ "status": "ok", "service": "compliance-service", "timestamp": "2024-01-15T10:30:00Z" }
```

### GET /audit-log/verify

```bash
curl http://localhost:3003/audit-log/verify
```

Response:
```json
{ "valid": true, "rows": 42 }
```

### GET /audit-log/export

```bash
curl -H "Content-Type: text/csv" http://localhost:3003/audit-log/export
```

Response: CSV file with headers: `id,timestamp,action,actor,target,reason,amount,tx_sig,prev_hash,row_hash`

### POST /audit-log

```bash
curl -X POST http://localhost:3003/audit-log \
  -H "Content-Type: application/json" \
  -d '{
    "action": "BLACKLIST_ADD",
    "actor": "admin",
    "target": "7xKXtg...",
    "reason": "KYC failure",
    "amount": "0",
    "tx_sig": "5j6YCH..."
  }'
```

Response:
```json
{ "success": true }
```

### GET /sanctions/check/:address

```bash
curl http://localhost:3003/sanctions/check/7xKXtg...
```

Response:
```json
{
  "risk": "LOW",
  "cluster": { "name": "Unknown", "category": "unidentified" },
  "screened_at": "2024-01-15T10:30:00Z"
}
```
