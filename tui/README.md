# SSS Admin TUI
Interactive terminal dashboard for managing SSS tokens.

## Run
cd tui && npm install && MINT_ADDRESS=<your-mint> RPC_URL=https://api.devnet.solana.com npm start

## Commands
- status — refresh all panels
- mint <amount>
- freeze <address>
- thaw <address>
- pause / unpause
- blacklist <address> (SSS-2 only)
- seize <address> <amount> (SSS-2 only)
- help / quit
