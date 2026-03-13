import { PublicKey } from "@solana/web3.js";
import { Preset, PresetConfig, InitializeArgs, Presets } from "./index";
import { z } from "zod";
import * as TOML from "@iarna/toml";
import * as fs from "fs";

const SSSConfigSchema = z.object({
  preset: z.enum(["sss-1", "sss-2"]),
  name: z.string().max(32).optional(),
  symbol: z.string().max(10).optional(),
  uri: z.string().max(200).optional(),
  decimals: z.number().int().min(0).max(9).optional(),
  master_authority: z.string().optional(),
  master_minter: z.string().optional(),
  blacklister: z.string().optional(),
  pauser: z.string().optional(),
});

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
  const raw = TOML.parse(tomlContent) as Record<string, unknown>;
  const config: TOMLConfig = {
    preset: raw.preset as string,
    name: raw.name as string | undefined,
    symbol: raw.symbol as string | undefined,
    uri: raw.uri as string | undefined,
    decimals: raw.decimals as number | undefined,
    master_authority: raw.master_authority as string | undefined,
    master_minter: raw.master_minter as string | undefined,
    blacklister: raw.blacklister as string | undefined,
    pauser: raw.pauser as string | undefined,
  };
  SSSConfigSchema.parse(config);
  return config;
}

export function parseTOMLFile(tomlPath: string): TOMLConfig {
  const raw = TOML.parse(fs.readFileSync(tomlPath, "utf-8")) as Record<string, unknown>;
  const config: TOMLConfig = {
    preset: raw.preset as string,
    name: raw.name as string | undefined,
    symbol: raw.symbol as string | undefined,
    uri: raw.uri as string | undefined,
    decimals: raw.decimals as number | undefined,
    master_authority: raw.master_authority as string | undefined,
    master_minter: raw.master_minter as string | undefined,
    blacklister: raw.blacklister as string | undefined,
    pauser: raw.pauser as string | undefined,
  };
  SSSConfigSchema.parse(config);
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
  if (presetName === "sss-1" || presetName === "SSS-1") return Presets.SSS_1;
  if (presetName === "sss-2" || presetName === "SSS-2") return Presets.SSS_2;
  throw new Error(`Unknown preset: ${presetName}`);
}

export { Presets, Preset, PresetConfig, InitializeArgs };
export { parseTOMLFile as parseConfig };
