# API Reference

This document describes the backend API services for SSS.

## Mint Service (Port 3001)

Handles minting and burning operations.

### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "mint-service",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Mint Tokens

```http
POST /mint
Content-Type: application/json

{
  "recipient": "7xKXtg...",  // Required: Recipient address
  "amount": 1000000,         // Required: Amount in smallest units
  "reference": "invoice-123", // Optional: Reference ID
  "metadata": {}              // Optional: Additional metadata
}
```

Response:
```json
{
  "success": true,
  "transaction": "5j6YCH...",
  "amount": 1000000,
  "recipient": "7xKXtg...",
  "reference": "invoice-123",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Burn Tokens

```http
POST /burn
Content

{
  "-Type: application/jsonamount": 500000,
  "reference": "burn-001"
}
```

Response:
```json
{
  "success": true,
  "transaction": "5j6YCH...",
  "amount": 500000,
  "reference": "burn-001",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Get Supply

```http
GET /supply
```

Response:
```json
{
  "mint": "7xKXtg...",
  "supply": 100000000,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Compliance Service (Port 3003)

Manages blacklist and seizure operations.

### Health Check

```http
GET /health
```

### Add to Blacklist

```http
POST /blacklist/add
Content-Type: application/json

{
  "address": "7xKXtg...",      // Required: Address to blacklist
  "reason": "KYC failure",    // Optional: Reason
  "operator": "admin@co.com"  // Optional: Operator ID
}
```

Response:
```json
{
  "success": true,
  "transaction": "5j6YCH...",
  "address": "7xKXtg...",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Remove from Blacklist

```http
DELETE /blacklist/:address
```

Response:
```json
{
  "success": true,
  "transaction": "5j6YCH...",
  "address": "7xKXtg...",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Check Blacklist Status

```http
GET /blacklist/:address
```

Response:
```json
{
  "address": "7xKXtg...",
  "blacklisted": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Seize Tokens

```http
POST /seize
Content-Type: application/json

{
  "address": "7xKXtg...",      // Required: Address to seize from
  "treasury": "TREASURY...",   // Required: Treasury address
  "amount": 1000000,           // Required: Amount
  "reason": "OFAC match",      // Optional: Reason
  "operator": "admin@co.com"  // Optional: Operator
}
```

Response:
```json
{
  "success": true,
  "transaction": "5j6YCH...",
  "address": "7xKXtg...",
  "treasury": "TREASURY...",
  "amount": 1000000,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Get Audit Log

```http
GET /audit-log?limit=100&offset=0
```

Response:
```json
{
  "entries": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "action": "BLACKLIST_ADD",
      "operator": "admin@co.com",
      "address": "7xKXtg...",
      "details": { "reason": "KYC failure" },
      "txHash": "5j6YCH..."
    }
  ],
  "limit": 100,
  "offset": 0,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Indexer Service (Port 3002)

Monitors on-chain events.

### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "indexer",
  "subscriptionId": 12345,
  "eventCount": 5678,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Get Events

```http
GET /events?limit=50&offset=0&type=Mint
```

Response:
```json
{
  "events": [
    {
      "type": "Mint",
      "data": {},
      "slot": 123456789,
      "timestamp": 1705312200,
      "programId": "2N19eMK...",
      "signature": "5j6YCH..."
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Get Events by Type

```http
GET /events/:type
```

Example: `GET /events/Seize`

## Webhook Service (Port 3004)

Delivers events to registered endpoints.

### Health Check

```http
GET /health
```

### Register Webhook

```http
POST /webhooks/register
Content-Type: application/json

{
  "url": "https://your-server.com/webhook",  // Required
  "events": ["Mint", "Burn", "Seize"],        // Required: Event types
  "secret": "your-secret-key"                 // Optional
}
```

Response:
```json
{
  "success": true,
  "id": "abc123...",
  "message": "Webhook registered successfully"
}
```

### List Webhooks

```http
GET /webhooks
```

### Delete Webhook

```http
DELETE /webhooks/:id
```

### Test Webhook

```http
POST /webhooks/:id/test
```

### Trigger Event

```http
POST /trigger
Content-Type: application/json

{
  "eventType": "Mint",
  "payload": {
    "amount": 1000000,
    "recipient": "7xKXtg..."
  }
}
```

## Error Responses

All endpoints may return:

```json
{
  "error": "Error message description"
}
```

Common status codes:
- 200: Success
- 400: Bad Request
- 403: Forbidden (sanctions hit)
- 404: Not Found
- 500: Internal Server Error
