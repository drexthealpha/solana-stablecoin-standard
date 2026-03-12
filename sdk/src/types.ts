import { PublicKey } from "@solana/web3.js";

export interface StablecoinConfigAccount {
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  masterAuthority: PublicKey;
  pendingMasterAuthority: PublicKey | null;
  masterMinter: PublicKey;
  blacklister: PublicKey;
  pauser: PublicKey;
  isPaused: boolean;
  enablePermanentDelegate: boolean;
  enableTransferHook: boolean;
  defaultAccountFrozen: boolean;
  bump: number;
}

export interface MinterAllowanceAccount {
  allowance: bigint;
  bump: number;
}

export interface BlacklistEntryAccount {
  isBlacklisted: boolean;
  bump: number;
}

export interface SSSConfig {
  preset: "sss-1" | "sss-2";
  name?: string;
  symbol?: string;
  uri?: string;
  decimals?: number;
  masterAuthority?: string;
  masterMinter?: string;
  blacklister?: string;
  pauser?: string;
}
