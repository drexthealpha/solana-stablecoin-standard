import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { Connection, PublicKey } from "@solana/web3.js";
import * as blessed from "blessed";
import * as contrib from "blessed-contrib";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MINT_ADDRESS = process.env.MINT_ADDRESS || "";
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const STABLECOIN_PROGRAM_ID = "2N19eMKD2xGpjNzfktVCPnkrbGJZAzuDFoH7SJtQiNm9";

interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  master_authority: string;
  master_minter: string;
  blacklister: string;
  pauser: string;
  is_paused: boolean;
  total_supply: number;
  enable_permanent_delegate: boolean;
  enable_transfer_hook: boolean;
}

const screen = blessed.screen({ smartCSR: true, title: "SSS Admin TUI" });

const topLeft = contrib.log({
  top: "0%",
  left: "0%",
  width: "50%",
  height: "60%",
  label: " Token Status ",
  border: { type: "line" },
  style: { border: { fg: "cyan" } },
});

const topRight = contrib.log({
  top: "0%",
  left: "50%",
  width: "50%",
  height: "60%",
  label: " Recent Operations ",
  border: { type: "line" },
  style: { border: { fg: "green" } },
  scrollable: true,
});

const bottomLeft = contrib.table({
  top: "60%",
  left: "0%",
  width: "50%",
  height: "30%",
  label: " Roles ",
  border: { type: "line" },
  style: { border: { fg: "yellow" } },
  columns: [{ width: 20 }, { width: 20 }],
});

const input = blessed.textbox({
  top: "90%",
  left: "0%",
  width: "100%",
  height: "10%",
  label: " Command ",
  border: { type: "line" },
  style: { border: { fg: "magenta" } },
  inputOnFocus: true,
});

screen.append(topLeft);
screen.append(topRight);
screen.append(bottomLeft);
screen.append(input);

let operationLog: string[] = [];
const MAX_LOG_ENTRIES = 10;

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 8) return addr;
  return addr.slice(0, 8) + "...";
}

function formatTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-US", { hour12: false });
}

function addLogEntry(message: string) {
  const entry = `[${formatTimestamp()}] ${message}`;
  operationLog.unshift(entry);
  if (operationLog.length > MAX_LOG_ENTRIES) {
    operationLog = operationLog.slice(0, MAX_LOG_ENTRIES);
  }
  topRight.log(entry);
}

async function fetchTokenConfig(): Promise<TokenConfig | null> {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const mintPubkey = new PublicKey(MINT_ADDRESS);
    const programId = new PublicKey(STABLECOIN_PROGRAM_ID);

    const [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), mintPubkey.toBuffer()],
      programId
    );

    const accountInfo = await connection.getParsedAccountInfo(configPDA);
    if (!accountInfo.value) return null;

    const data = accountInfo.value.data as any;
    return {
      name: data.name || "",
      symbol: data.symbol || "",
      decimals: data.decimals || 6,
      master_authority: data.master_authority || "",
      master_minter: data.master_minter || "",
      blacklister: data.blacklister || "",
      pauser: data.pauser || "",
      is_paused: data.is_paused || false,
      total_supply: data.total_supply || 0,
      enable_permanent_delegate: data.enable_permanent_delegate || false,
      enable_transfer_hook: data.enable_transfer_hook || false,
    };
  } catch (error) {
    return null;
  }
}

async function updateStatus() {
  topLeft.log("Fetching token status...");

  const config = await fetchTokenConfig();

  if (!config) {
    topLeft.log("Error: Could not fetch token config");
    return;
  }

  topLeft.log(`Mint Address: ${MINT_ADDRESS}`);
  topLeft.log(`Name: ${config.name} (${config.symbol})`);
  topLeft.log(`Total Supply: ${config.total_supply}`);
  topLeft.log(`Decimals: ${config.decimals}`);
  topLeft.log(`Is Paused: ${config.is_paused ? "YES" : "NO"}`);

  const preset = config.enable_permanent_delegate && config.enable_transfer_hook
    ? "SSS-2"
    : "SSS-1";
  topLeft.log(`Preset: ${preset}`);

  bottomLeft.setData({
    headers: ["Role", "Address"],
    rows: [
      ["master_authority", truncateAddress(config.master_authority)],
      ["master_minter", truncateAddress(config.master_minter)],
      ["blacklister", truncateAddress(config.blacklister)],
      ["pauser", truncateAddress(config.pauser)],
    ],
  });

  screen.render();
}

input.focus();

input.on("submit", async (value: string) => {
  const parts = value.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const args = parts.slice(1);

  addLogEntry(`> ${value}`);

  switch (cmd) {
    case "status":
      await updateStatus();
      addLogEntry("Status refreshed");
      break;

    case "mint":
      if (args.length === 0) {
        addLogEntry("Usage: mint <amount>");
      } else {
        addLogEntry(`Confirm: mint ${args[0]} tokens? (TUI demo - no actual tx)`);
      }
      break;

    case "freeze":
      if (args.length === 0) {
        addLogEntry("Usage: freeze <address>");
      } else {
        addLogEntry(`Confirm: freeze account ${args[0]}? (TUI demo)`);
      }
      break;

    case "thaw":
      if (args.length === 0) {
        addLogEntry("Usage: thaw <address>");
      } else {
        addLogEntry(`Confirm: thaw account ${args[0]}? (TUI demo)`);
      }
      break;

    case "pause":
      addLogEntry("Confirm: pause all operations? (TUI demo)");
      break;

    case "unpause":
      addLogEntry("Confirm: unpause operations? (TUI demo)");
      break;

    case "blacklist":
      if (args.length === 0) {
        addLogEntry("Usage: blacklist <address>");
      } else {
        addLogEntry(`Confirm: blacklist ${args[0]}? (SSS-2 only - TUI demo)`);
      }
      break;

    case "seize":
      if (args.length < 2) {
        addLogEntry("Usage: seize <address> <amount>");
      } else {
        addLogEntry(`Confirm: seize ${args[1]} from ${args[0]}? (SSS-2 only - TUI demo)`);
      }
      break;

    case "help":
      addLogEntry("Commands: status, mint <amount>, freeze <address>, thaw <address>");
      addLogEntry("         pause, unpause, blacklist <address>, seize <address> <amount>");
      addLogEntry("         help, quit");
      break;

    case "quit":
    case "exit":
      screen.destroy();
      process.exit(0);
      break;

    default:
      addLogEntry(`Unknown command: ${cmd}. Type 'help' for available commands.`);
  }

  input.clearValue();
  screen.render();
});

screen.key("q", () => {
  screen.destroy();
  process.exit(0);
});

screen.key("escape", () => {
  screen.destroy();
  process.exit(0);
});

async function init() {
  if (!MINT_ADDRESS) {
    topLeft.log("Error: MINT_ADDRESS not set");
    topLeft.log("Set MINT_ADDRESS env var or .env file");
    screen.render();
    return;
  }

  addLogEntry("SSS Admin TUI started");
  addLogEntry(`Mint: ${truncateAddress(MINT_ADDRESS)}`);
  addLogEntry(`RPC: ${RPC_URL}`);
  await updateStatus();
  addLogEntry("Type 'help' for commands");
}

init();
