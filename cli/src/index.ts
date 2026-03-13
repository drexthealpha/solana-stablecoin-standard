#!/usr/bin/env node

import { Command } from "commander";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { SolanaStablecoin, STABLECOIN_PROGRAM_ID } from "../../sdk/src/index";
import { ComplianceModule } from "../../sdk/src/compliance";
import { buildInitializeArgs, getPreset, parseTOMLConfig, parseJSONConfig } from "../../sdk/src/config";
import * as fs from "fs";
import * as path from "path";

const program = new Command();

program
  .name("sss-token")
  .description("Solana Stablecoin Standard CLI")
  .version("0.1.0");

async function getWallet(): Promise<anchor.Wallet> {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const keypairPath = process.env.KEYPAIR_PATH || path.join(homeDir, ".config/solana/id.json");
  
  if (!fs.existsSync(keypairPath)) {
    throw new Error(`Keypair not found at ${keypairPath}. Set KEYPAIR_PATH or ensure ~/.config/solana/id.json exists.`);
  }
  
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
  return new anchor.Wallet(keypair);
}

async function getConnection(): Promise<Connection> {
  const rpcUrl = process.env.RPC_URL || "https://api.devnet.solana.com";
  return new Connection(rpcUrl, "confirmed");
}

program
  .command("init")
  .description("Initialize a new stablecoin")
  .requiredOption("--preset <preset>", "Preset: sss-1 or sss-2")
  .option("--name <name>", "Token name", "Stablecoin")
  .option("--symbol <symbol>", "Token symbol", "STBL")
  .option("--uri <uri>", "Token URI", "")
  .option("--decimals <decimals>", "Token decimals", "6")
  .option("--config <path>", "Path to TOML or JSON config file")
  .action(async (options) => {
    try {
      const wallet = await getWallet();
      const connection = await getConnection();
      const sdk = new SolanaStablecoin(connection, wallet);

      let args;
      if (options.config) {
        const configData = fs.readFileSync(options.config, "utf-8");
        const config = options.config.endsWith(".json") 
          ? parseJSONConfig(configData)
          : parseTOMLConfig(configData);
        args = buildInitializeArgs(config, wallet.publicKey);
      } else {
        const preset = getPreset(options.preset);
        args = buildInitializeArgs(preset, wallet.publicKey);
        args.name = options.name;
        args.symbol = options.symbol;
        args.uri = options.uri;
      }

      const decimals = parseInt(options.decimals);
      const mintKeypair = Keypair.generate();

      console.log(`Initializing ${options.preset} stablecoin...`);
      const mint = await sdk.create(decimals, args, mintKeypair);
      console.log(`Stablecoin created! Mint address: ${mint.toBase58()}`);
      console.log(`Config PDA: ${SolanaStablecoin.getConfigPDA(mint).toBase58()}`);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

program
  .command("mint")
  .description("Mint tokens")
  .requiredOption("--mint <address>", "Mint address")
  .requiredOption("--recipient <address>", "Recipient address")
  .requiredOption("--amount <amount>", "Amount to mint")
  .action(async (options) => {
    try {
      const wallet = await getWallet();
      const connection = await getConnection();
      const sdk = new SolanaStablecoin(connection, wallet);

      const mint = new PublicKey(options.mint);
      const recipient = new PublicKey(options.recipient);
      const amount = parseInt(options.amount);

      console.log(`Minting ${amount} tokens to ${recipient.toBase58()}...`);
      const tx = await sdk.mint(mint, { recipient, amount: BigInt(amount) });
      console.log(`Minted! Transaction: ${tx}`);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

program
  .command("burn")
  .description("Burn tokens")
  .requiredOption("--mint <address>", "Mint address")
  .requiredOption("--amount <amount>", "Amount to burn")
  .action(async (options) => {
    try {
      const wallet = await getWallet();
      const connection = await getConnection();
      const sdk = new SolanaStablecoin(connection, wallet);

      const mint = new PublicKey(options.mint);
      const amount = parseInt(options.amount);

      console.log(`Burning ${amount} tokens...`);
      const tx = await sdk.burn(mint, amount);
      console.log(`Burned! Transaction: ${tx}`);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

program
  .command("freeze")
  .description("Freeze a token account")
  .requiredOption("--mint <address>", "Mint address")
  .requiredOption("--address <address>", "Address to freeze")
  .action(async (options) => {
    try {
      const wallet = await getWallet();
      const connection = await getConnection();
      const sdk = new SolanaStablecoin(connection, wallet);

      const mint = new PublicKey(options.mint);
      const address = new PublicKey(options.address);

      console.log(`Freezing account ${address.toBase58()}...`);
      const tx = await sdk.freeze(mint, address);
      console.log(`Frozen! Transaction: ${tx}`);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

program
  .command("thaw")
  .description("Thaw a token account")
  .requiredOption("--mint <address>", "Mint address")
  .requiredOption("--address <address>", "Address to thaw")
  .action(async (options) => {
    try {
      const wallet = await getWallet();
      const connection = await getConnection();
      const sdk = new SolanaStablecoin(connection, wallet);

      const mint = new PublicKey(options.mint);
      const address = new PublicKey(options.address);

      console.log(`Thawing account ${address.toBase58()}...`);
      const tx = await sdk.thaw(mint, address);
      console.log(`Thawed! Transaction: ${tx}`);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

program
  .command("pause")
  .description("Pause all minting and transfers")
  .requiredOption("--mint <address>", "Mint address")
  .action(async (options) => {
    try {
      const wallet = await getWallet();
      const connection = await getConnection();
      const sdk = new SolanaStablecoin(connection, wallet);

      const mint = new PublicKey(options.mint);

      console.log("Pausing stablecoin...");
      const tx = await sdk.pause(mint);
      console.log(`Paused! Transaction: ${tx}`);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

program
  .command("unpause")
  .description("Unpause all minting and transfers")
  .requiredOption("--mint <address>", "Mint address")
  .action(async (options) => {
    try {
      const wallet = await getWallet();
      const connection = await getConnection();
      const sdk = new SolanaStablecoin(connection, wallet);

      const mint = new PublicKey(options.mint);

      console.log("Unpausing stablecoin...");
      const tx = await sdk.unpause(mint);
      console.log(`Unpaused! Transaction: ${tx}`);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Get stablecoin status")
  .requiredOption("--mint <address>", "Mint address")
  .action(async (options) => {
    try {
      const wallet = await getWallet();
      const connection = await getConnection();
      const sdk = new SolanaStablecoin(connection, wallet);

      const mint = new PublicKey(options.mint);
      const config = await sdk.getConfig(mint);

      if (!config) {
        console.log("Config not found");
        return;
      }

      console.log(JSON.stringify(config, (key, value) => {
        if (value instanceof PublicKey) return value.toBase58();
        return value;
      }, 2));
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

program
  .command("supply")
  .description("Get total token supply")
  .requiredOption("--mint <address>", "Mint address")
  .action(async (options) => {
    try {
      const wallet = await getWallet();
      const connection = await getConnection();
      const sdk = new SolanaStablecoin(connection, wallet);

      const mint = new PublicKey(options.mint);
      const supply = await sdk.getTotalSupply(mint);

      console.log(`Total supply: ${supply}`);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

const blacklistCmd = program
  .command("blacklist")
  .description("Blacklist management");

blacklistCmd
  .command("add")
  .description("Add address to blacklist")
  .requiredOption("--mint <address>", "Mint address")
  .requiredOption("--address <address>", "Address to blacklist")
  .option("--reason <reason>", "Reason for blacklisting")
  .action(async (options) => {
    try {
      const wallet = await getWallet();
      const connection = await getConnection();

      const mint = new PublicKey(options.mint);
      const address = new PublicKey(options.address);
      const compliance = new ComplianceModule(connection, wallet, mint);

      console.log(`Adding ${address.toBase58()} to blacklist...`);
      const tx = await compliance.blacklistAdd(address, options.reason);
      console.log(`Added! Transaction: ${tx}`);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

blacklistCmd
  .command("remove")
  .description("Remove address from blacklist")
  .requiredOption("--mint <address>", "Mint address")
  .requiredOption("--address <address>", "Address to remove")
  .action(async (options) => {
    try {
      const wallet = await getWallet();
      const connection = await getConnection();

      const mint = new PublicKey(options.mint);
      const address = new PublicKey(options.address);
      const compliance = new ComplianceModule(connection, wallet, mint);

      console.log(`Removing ${address.toBase58()} from blacklist...`);
      const tx = await compliance.blacklistRemove(address);
      console.log(`Removed! Transaction: ${tx}`);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

program
  .command("seize")
  .description("Seize tokens from a frozen account")
  .requiredOption("--mint <address>", "Mint address")
  .requiredOption("--address <address>", "Address to seize from")
  .requiredOption("--to <treasury>", "Treasury address to send seized tokens")
  .requiredOption("--amount <amount>", "Amount to seize")
  .action(async (options) => {
    try {
      const wallet = await getWallet();
      const connection = await getConnection();

      const mint = new PublicKey(options.mint);
      const address = new PublicKey(options.address);
      const treasury = new PublicKey(options.to);
      const amount = parseInt(options.amount);
      const compliance = new ComplianceModule(connection, wallet, mint);

      console.log(`Seizing ${amount} tokens from ${address.toBase58()}...`);
      const tx = await compliance.seize(address, treasury, amount);
      console.log(`Seized! Transaction: ${tx}`);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

const mintersCmd = program
  .command("minters")
  .description("Minter management");

mintersCmd
  .command("list")
  .description("List minters")
  .requiredOption("--mint <address>", "Mint address")
  .action(async (options) => {
    console.log("Listing minters not yet implemented - requires indexer integration");
  });

mintersCmd
  .command("add")
  .description("Add a minter with allowance")
  .requiredOption("--mint <address>", "Mint address")
  .requiredOption("--address <address>", "Minter address")
  .requiredOption("--allowance <allowance>", "Allowance amount")
  .action(async (options) => {
    try {
      const wallet = await getWallet();
      const connection = await getConnection();
      const sdk = new SolanaStablecoin(connection, wallet);

      const mint = new PublicKey(options.mint);
      const address = new PublicKey(options.address);
      const allowance = parseInt(options.allowance);

      console.log(`Adding minter ${address.toBase58()} with allowance ${allowance}...`);
      const tx = await sdk.setMinterAllowance(mint, address, allowance);
      console.log(`Added! Transaction: ${tx}`);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

mintersCmd
  .command("remove")
  .description("Remove a minter")
  .requiredOption("--mint <address>", "Mint address")
  .requiredOption("--address <address>", "Minter address")
  .action(async (options) => {
    try {
      const wallet = await getWallet();
      const connection = await getConnection();
      const sdk = new SolanaStablecoin(connection, wallet);

      const mint = new PublicKey(options.mint);
      const address = new PublicKey(options.address);

      console.log(`Removing minter ${address.toBase58()}...`);
      const tx = await sdk.setMinterAllowance(mint, address, 0);
      console.log(`Removed! Transaction: ${tx}`);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

  program
    .command("audit-log")
    .description("View and verify the compliance audit log")
    .option("--limit <number>", "Number of entries to show", "50")
    .option("--offset <number>", "Offset for pagination", "0")
    .option("--service-url <url>", "Compliance service URL", "http://localhost:3003")
    .option("--verify", "Verify chain integrity instead of showing entries")
    .option("--export", "Export full audit log as CSV")
    .action(async (options) => {
      const serviceUrl = options.serviceUrl;
      try {
        if (options.verify) {
          const res = await fetch(`${serviceUrl}/audit-log/verify`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json() as { valid: boolean; rows: number; error?: string };
          if (data.valid) {
            console.log(`✅ Audit chain VALID — ${data.rows} rows verified`);
          } else {
            console.log(`❌ Audit chain TAMPERED — ${data.error}`);
            process.exit(1);
          }
          return;
        }
        if (options.export) {
          const res = await fetch(`${serviceUrl}/audit-log/export`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const csv = await res.text();
          console.log(csv);
          return;
        }
        const limit = parseInt(options.limit);
        const offset = parseInt(options.offset);
        const res = await fetch(`${serviceUrl}/audit-log?limit=${limit}&offset=${offset}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json() as { entries: any[]; limit: number; offset: number };
        if (data.entries.length === 0) {
          console.log("No audit log entries found.");
          return;
        }
        console.log("\nAudit Log:");
        console.log("─".repeat(100));
        console.log(
          "ID".padEnd(6) +
          "Timestamp".padEnd(25) +
          "Action".padEnd(20) +
          "Actor".padEnd(15) +
          "Target".padEnd(15) +
          "TX Sig"
        );
        console.log("─".repeat(100));
        for (const entry of data.entries) {
          const actor = entry.actor?.slice(0, 12) ?? "";
          const target = entry.target?.slice(0, 12) ?? "";
          const txSig = entry.tx_sig?.slice(0, 16) ?? "N/A";
          console.log(
            String(entry.id).padEnd(6) +
            entry.timestamp.padEnd(25) +
            entry.action.padEnd(20) +
            (actor + "...").padEnd(15) +
            (target + "...").padEnd(15) +
            txSig + "..."
          );
        }
        console.log("─".repeat(100));
        console.log(`Showing ${data.entries.length} entries (offset: ${offset})`);
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  program
    .command("holders")
    .description("List all token holders for a mint")
    .requiredOption("--mint <address>", "Mint address")
    .option("--min-balance <amount>", "Minimum token balance filter (in base units)", "0")
    .action(async (options) => {
      try {
        const connection = await getConnection();
        const mintPubkey = new PublicKey(options.mint);
        const minBalance = parseInt(options.minBalance);

        console.log(`Fetching token accounts for mint: ${mintPubkey.toBase58()}`);
        console.log("(This may take a few seconds on devnet...)");

        const accounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
          filters: [
            { dataSize: 165 },
            {
              memcmp: {
                offset: 0,
                bytes: mintPubkey.toBase58(),
              },
            },
          ],
        });

        const holders: { address: string; owner: string; balance: bigint }[] = [];

        for (const { pubkey, account } of accounts) {
          const data = account.data;
          if (data.length < 72) continue;
          // Parse u64 little-endian balance at offset 64
          const balanceBuf = data.slice(64, 72);
          const balance = balanceBuf.readBigUInt64LE(0);
          if (balance < BigInt(minBalance)) continue;
          const ownerBytes = data.slice(32, 64);
          const owner = new PublicKey(ownerBytes).toBase58();
          holders.push({
            address: pubkey.toBase58(),
            owner,
            balance,
          });
        }

        // Sort by balance descending
        holders.sort((a, b) => (a.balance > b.balance ? -1 : 1));

        if (holders.length === 0) {
          console.log("No holders found" + (minBalance > 0 ? ` with balance >= ${minBalance}` : "") + ".");
          return;
        }

        console.log("\nToken Holders:");
        console.log("─".repeat(120));
        console.log(
          "Token Account".padEnd(46) +
          "Owner".padEnd(46) +
          "Balance"
        );
        console.log("─".repeat(120));
        for (const h of holders) {
          console.log(
            h.address.padEnd(46) +
            h.owner.padEnd(46) +
            h.balance.toString()
          );
        }
        console.log("─".repeat(120));
        console.log(`Total holders: ${holders.length}`);
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  program.parse(process.argv);
