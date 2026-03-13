# Running Backend Services

Use the **root** `docker-compose.yml` (one directory up) to start all services:
```bash
# From the repo root
docker compose up

# Or with custom RPC
RPC_URL=https://your-helius-rpc.com docker compose up
```

This starts all 4 services on their standard ports:
- **mint-service** → http://localhost:3001
- **indexer** → http://localhost:3002
- **compliance-service** → http://localhost:3003
- **webhook-service** → http://localhost:3004

Plus a **postgres** container for persistent storage.

See `../docker-compose.yml` for the full configuration.
