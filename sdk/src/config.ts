import { PublicKey } from "@solana/web3.js";
import { Preset, PresetConfig, InitializeArgs, Presets } from "./index";

export interface PresetConfigOptions {
  preset: Preset;
  name?: string;
  symbol?: string;
  uri?: string;
  decimals?: number;
}

export interface TOMLConfig {
  preset: string;
  name?: string;
  symbol?: string;
  uri?: string;
  decimals?: number;
  master_authority?: string;
  master_minter?: string;
  blacklister?: string;
  pauser?: string;
}

export function parseTOMLConfig(tomlContent: string): TOMLConfig {
  const config: TOMLConfig = {};
  const lines = tomlContent.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
    if (!match) continue;

    const [, key, value] = match;
    const cleanValue = value.replace(/^["']|["']$/g, "").trim();

    if (key in config) {
      (config as any)[key] = cleanValue;
    }
  }

  return config;
}

export function parseJSONConfig(jsonContent: string): TOMLConfig {
  return JSON.parse(jsonContent);
}

export function buildInitializeArgs(
  config: TOMLConfig | PresetConfigOptions,
  authority: PublicKey
): InitializeArgs {
  let presetConfig: PresetConfig;

  if ("preset" in config) {
    if (config.preset === "sss-1") {
      presetConfig = Presets.SSS_1;
    } else if (config.preset === "sss-2") {
      presetConfig = Presets.SSS_2;
    } else {
      throw new Error(`Unknown preset: ${config.preset}`);
    }
  } else {
    presetConfig = config as PresetConfig;
  }

  const name = (config as any).name || "Stablecoin";
  const symbol = (config as any).symbol || "STBL";
  const uri = (config as any).uri || "";
  const decimals = (config as any).decimals || 6;

  return {
    name,
    symbol,
    uri,
    masterAuthority: authority,
    masterMinter: authority,
    blacklister: authority,
    pauser: authority,
    enablePermanentDelegate: presetConfig.enablePermanentDelegate,
    enableTransferHook: presetConfig.enableTransferHook,
    defaultAccountFrozen: presetConfig.defaultAccountFrozen,
  };
}

export function getPreset(presetName: string): PresetConfig {
  if (presetName === "sss-1" || presetName === "SSS-1") {
    return Presets.SSS_1;
  } else if (presetName === "sss-2" || presetName === "SSS-2") {
    return Presets.SSS_2;
  }
  throw new Error(`Unknown preset: ${presetName}`);
}

export { Presets, Preset, PresetConfig, InitializeArgs };
