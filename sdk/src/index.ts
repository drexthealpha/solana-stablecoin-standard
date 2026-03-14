import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createBurnInstruction,
  createFreezeAccountInstruction,
  createThawAccountInstruction,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { parseTOMLFile, buildInitializeArgs } from "./config";
import { ComplianceModule } from "./compliance";

export const STABLECOIN_PROGRAM_ID = new PublicKey(
  "2N19eMKD2xGpjNzfktVCPnkrbGJZAzuDFoH7SJtQiNm9"
);

export const TRANSFER_HOOK_PROGRAM_ID = new PublicKey(
  "PQgUt1swYzA9RSAG7gpyTQpk9TtbVReX11ytkeYTJBo"
);

export const TOKEN_PROGRAM_ID = TOKEN_2022_PROGRAM_ID;

export interface InitializeArgs {
  name: string;
  symbol: string;
  uri: string;
  masterAuthority: PublicKey;
  masterMinter: PublicKey;
  blacklister: PublicKey;
  pauser: PublicKey;
  enablePermanentDelegate: boolean;
  enableTransferHook: boolean;
  defaultAccountFrozen: boolean;
}

export interface UpdateRolesArgs {
  newMasterAuthority?: PublicKey;
  newMasterMinter?: PublicKey;
  newBlacklister?: PublicKey;
  newPauser?: PublicKey;
}

export interface StablecoinConfig {
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
  totalSupply: number;
  enablePermanentDelegate: boolean;
  enableTransferHook: boolean;
  defaultAccountFrozen: boolean;
  bump: number;
}

export enum Preset {
  SSS_1 = "sss-1",
  SSS_2 = "sss-2",
}

export interface PresetConfig {
  preset: Preset;
  enablePermanentDelegate: boolean;
  enableTransferHook: boolean;
  defaultAccountFrozen: boolean;
}

export type CreateOpts = {
  name: string;
  symbol: string;
  uri?: string;
  decimals?: number;
  authority: Keypair;
} & (
  | { preset: PresetConfig; extensions?: never }
  | { extensions: { permanentDelegate: boolean; transferHook: boolean; defaultAccountFrozen?: boolean }; preset?: never }
);

export const Presets = {
  SSS_1: {
    preset: Preset.SSS_1,
    enablePermanentDelegate: false,
    enableTransferHook: false,
    defaultAccountFrozen: false,
  } as PresetConfig,
  SSS_2: {
    preset: Preset.SSS_2,
    enablePermanentDelegate: true,
    enableTransferHook: true,
    defaultAccountFrozen: false,
  } as PresetConfig,
};

export class SolanaStablecoin {
  private connection: Connection;
  private wallet: anchor.Wallet;
  private program: anchor.Program;
  private hookProgram: anchor.Program | null = null;
  public _mint: PublicKey | null = null;
  public compliance: ComplianceModule | null = null;

  constructor(
    connection: Connection,
    wallet: anchor.Wallet,
    programId: PublicKey = STABLECOIN_PROGRAM_ID
  ) {
    this.connection = connection;
    this.wallet = wallet;

    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    anchor.setProvider(provider);

    this.program = new anchor.Program(
      require("../idl/stablecoin.json"),
      provider
    ) as anchor.Program;

    try {
      const hookIdl = require('../idl/transfer-hook.json');
      this.hookProgram = new anchor.Program(hookIdl, provider) as anchor.Program;
    } catch {
      this.hookProgram = null;
    }
  }

  static getConfigPDA(mint: PublicKey): PublicKey {
    const [config] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), mint.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );
    return config;
  }

  static getMinterPDA(mint: PublicKey, minter: PublicKey): PublicKey {
    const [minterPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("minter"), mint.toBuffer(), minter.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );
    return minterPda;
  }

  static getBlacklistPDA(mint: PublicKey, address: PublicKey): PublicKey {
    const [blacklist] = PublicKey.findProgramAddressSync(
      [Buffer.from("blacklist"), mint.toBuffer(), address.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );
    return blacklist;
  }

  static getExtraAccountMetaListPDA(mint: PublicKey): PublicKey {
    const [extraAccountMetaList] = PublicKey.findProgramAddressSync(
      [Buffer.from("extra-account-metas"), mint.toBuffer()],
      TRANSFER_HOOK_PROGRAM_ID
    );
    return extraAccountMetaList;
  }

  /**
   * Create a SolanaStablecoin instance and deploy a new mint from a TOML config file.
   * @example const { sdk, mint } = await SolanaStablecoin.fromConfig('./config.toml', connection, adminKeypair);
   */
  static async fromConfig(
    tomlPath: string,
    connection: Connection,
    authority: Keypair
  ): Promise<{ sdk: SolanaStablecoin; mint: PublicKey }> {
    const wallet = new anchor.Wallet(authority);
    const sdk = new SolanaStablecoin(connection, wallet);
    const config = parseTOMLFile(tomlPath);
    const decimals = config.decimals ?? 6;
    const args = buildInitializeArgs(config, authority.publicKey);
    const mintKeypair = Keypair.generate();
    const mint = await sdk.create(decimals, args, mintKeypair);
    return { sdk, mint };
  }

  static async create(
    connection: Connection,
    opts: CreateOpts
  ): Promise<SolanaStablecoin> {
    let resolvedPreset: PresetConfig;
    if ('extensions' in opts && opts.extensions) {
      resolvedPreset = {
        preset: opts.extensions.permanentDelegate ? Preset.SSS_2 : Preset.SSS_1,
        enablePermanentDelegate: opts.extensions.permanentDelegate,
        enableTransferHook: opts.extensions.transferHook,
        defaultAccountFrozen: opts.extensions.defaultAccountFrozen ?? false,
      };
    } else {
      resolvedPreset = opts.preset!;
    }

    const wallet = new anchor.Wallet(opts.authority);
    const sdk = new SolanaStablecoin(connection, wallet);
    const mintKeypair = Keypair.generate();
    const args: InitializeArgs = {
      name: opts.name,
      symbol: opts.symbol,
      uri: opts.uri ?? '',
      masterAuthority: opts.authority.publicKey,
      masterMinter: opts.authority.publicKey,
      blacklister: opts.authority.publicKey,
      pauser: opts.authority.publicKey,
      enablePermanentDelegate: resolvedPreset.enablePermanentDelegate,
      enableTransferHook: resolvedPreset.enableTransferHook,
      defaultAccountFrozen: resolvedPreset.defaultAccountFrozen,
    };
    await sdk.create(opts.decimals ?? 6, args, mintKeypair);
    sdk._mint = mintKeypair.publicKey;
    if (resolvedPreset.enablePermanentDelegate) {
      sdk.compliance = new ComplianceModule(connection, wallet, mintKeypair.publicKey);
    }
    return sdk;
  }

  async create(
    decimals: number,
    args: InitializeArgs,
    mintKeypair: Keypair = Keypair.generate()
  ): Promise<PublicKey> {
    const configPDA = SolanaStablecoin.getConfigPDA(mintKeypair.publicKey);
    const mint = mintKeypair.publicKey;

    const tx = new Transaction();

    tx.add(
      SystemProgram.createAccount({
        fromPubkey: this.wallet.publicKey,
        newAccountPubkey: mint,
        space: 500,
        lamports: await this.connection.getMinimumBalanceForRentExemption(500),
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mint,
        decimals,
        configPDA,
        configPDA,
        TOKEN_PROGRAM_ID
      )
    );

    const initializeArgs = {
      name: args.name,
      symbol: args.symbol,
      uri: args.uri,
      masterAuthority: args.masterAuthority,
      masterMinter: args.masterMinter,
      blacklister: args.blacklister,
      pauser: args.pauser,
      enablePermanentDelegate: args.enablePermanentDelegate,
      enableTransferHook: args.enableTransferHook,
      defaultAccountFrozen: args.defaultAccountFrozen,
    };

    const initializeIx = await this.program.methods
      .initialize(decimals, initializeArgs)
      .accounts({
        config: configPDA,
        mint: mint,
        payer: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    tx.add(initializeIx);

    if (args.enableTransferHook) {
      const extraAccountMetaListPDA =
        SolanaStablecoin.getExtraAccountMetaListPDA(mint);

      if (this.hookProgram) {
        // MUST call TRANSFER HOOK program — it owns the ExtraAccountMetaList PDA
        // Calling the stablecoin program here would fail PDA ownership check
        const initHookIx = await this.hookProgram.methods
          .initializeExtraAccountMetaList()
          .accounts({
            payer: this.wallet.publicKey,
            extraAccountMetaList: extraAccountMetaListPDA,
            mint: mint,
            systemProgram: SystemProgram.programId,
          })
          .instruction();
        tx.add(initHookIx);
      }
    }

    tx.feePayer = this.wallet.publicKey;
    tx.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    const signedTx = await this.wallet.signTransaction(tx);
    const signature = await this.connection.sendRawTransaction(
      signedTx.serialize()
    );
    await this.connection.confirmTransaction(signature, "confirmed");

    return mint;
  }

  async mint(
    mintOrOpts: PublicKey | { recipient: PublicKey; amount: bigint; minter?: PublicKey },
    opts?: { recipient: PublicKey; amount: bigint; minter?: PublicKey }
  ): Promise<string> {
    // Determine if first arg is PublicKey or opts object
    const firstArgIsPublicKey = mintOrOpts instanceof PublicKey;
    const resolvedMint: PublicKey = (() => {
      if (firstArgIsPublicKey) return mintOrOpts as PublicKey;
      if (this._mint) return this._mint;
      throw new Error('No mint address: use SolanaStablecoin.create() factory or pass mint explicitly as first argument');
    })();
    const options = firstArgIsPublicKey ? opts! : mintOrOpts as { recipient: PublicKey; amount: bigint; minter?: PublicKey };
    const recipient = options.recipient;
    const amount = options.amount;
    const mint = resolvedMint;
    const configPDA = SolanaStablecoin.getConfigPDA(mint);
    const recipientATA = await getAssociatedTokenAddress(
      mint,
      recipient,
      false,
      TOKEN_PROGRAM_ID
    );

    const tx = new Transaction();

    const recipientInfo = await this.connection.getAccountInfo(recipientATA);
    if (!recipientInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          this.wallet.publicKey,
          recipientATA,
          recipient,
          mint,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    const minter = options.minter ?? this.wallet.publicKey;
    const mintIx = await this.program.methods
      .mint(new anchor.BN(Number(amount)))
      .accounts({
        config: configPDA,
        mint: mint,
        minterPda: SolanaStablecoin.getMinterPDA(mint, minter),
        minter: minter,
        destinationToken: recipientATA,
        payer: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    tx.add(mintIx);

    tx.feePayer = this.wallet.publicKey;
    tx.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    const signedTx = await this.wallet.signTransaction(tx);
    return await this.connection.sendRawTransaction(signedTx.serialize());
  }

  async burn(mintOrAmount: PublicKey | number, amount?: number): Promise<string> {
    const resolvedMint: PublicKey = (() => {
      if (mintOrAmount instanceof PublicKey) return mintOrAmount;
      if (this._mint) return this._mint;
      throw new Error('No mint address: use SolanaStablecoin.create() factory or pass mint explicitly as first argument');
    })();
    const actualAmount = mintOrAmount instanceof PublicKey ? amount! : mintOrAmount;
    const mint = resolvedMint;
    const configPDA = SolanaStablecoin.getConfigPDA(mint);
    const sourceATA = await getAssociatedTokenAddress(
      mint,
      this.wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    const burnIx = await this.program.methods
      .burn(new anchor.BN(actualAmount))
      .accounts({
        config: configPDA,
        mint: mint,
        sourceToken: sourceATA,
        authority: this.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    const tx = new Transaction().add(burnIx);
    tx.feePayer = this.wallet.publicKey;
    tx.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    const signedTx = await this.wallet.signTransaction(tx);
    return await this.connection.sendRawTransaction(signedTx.serialize());
  }

  async freeze(mintOrAddress: PublicKey | { address: PublicKey }, address?: PublicKey): Promise<string> {
    const resolvedMint: PublicKey = (() => {
      if (mintOrAddress instanceof PublicKey) return mintOrAddress;
      if (this._mint) return this._mint;
      throw new Error('No mint address: use SolanaStablecoin.create() factory or pass mint explicitly as first argument');
    })();
    const targetAddress = mintOrAddress instanceof PublicKey ? address! : (mintOrAddress as { address: PublicKey }).address;
    const mint = resolvedMint;
    const configPDA = SolanaStablecoin.getConfigPDA(mint);
    const tokenAccount = await getAssociatedTokenAddress(
      mint,
      targetAddress,
      false,
      TOKEN_PROGRAM_ID
    );

    const freezeIx = await this.program.methods
      .freezeAccount()
      .accounts({
        config: configPDA,
        mint: mint,
        tokenAccount: tokenAccount,
        signer: this.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    const tx = new Transaction().add(freezeIx);
    tx.feePayer = this.wallet.publicKey;
    tx.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    const signedTx = await this.wallet.signTransaction(tx);
    return await this.connection.sendRawTransaction(signedTx.serialize());
  }

  async thaw(mintOrAddress: PublicKey | { address: PublicKey }, address?: PublicKey): Promise<string> {
    const resolvedMint: PublicKey = (() => {
      if (mintOrAddress instanceof PublicKey) return mintOrAddress;
      if (this._mint) return this._mint;
      throw new Error('No mint address: use SolanaStablecoin.create() factory or pass mint explicitly as first argument');
    })();
    const targetAddress = mintOrAddress instanceof PublicKey ? address! : (mintOrAddress as { address: PublicKey }).address;
    const mint = resolvedMint;
    const configPDA = SolanaStablecoin.getConfigPDA(mint);
    const tokenAccount = await getAssociatedTokenAddress(
      mint,
      targetAddress,
      false,
      TOKEN_PROGRAM_ID
    );

    const thawIx = await this.program.methods
      .thawAccount()
      .accounts({
        config: configPDA,
        mint: mint,
        tokenAccount: tokenAccount,
        signer: this.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    const tx = new Transaction().add(thawIx);
    tx.feePayer = this.wallet.publicKey;
    tx.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    const signedTx = await this.wallet.signTransaction(tx);
    return await this.connection.sendRawTransaction(signedTx.serialize());
  }

  async pause(mint?: PublicKey): Promise<string> {
    const resolvedMint: PublicKey = (() => {
      if (mint instanceof PublicKey) return mint;
      if (this._mint) return this._mint;
      throw new Error('No mint address: use SolanaStablecoin.create() factory or pass mint explicitly as first argument');
    })();
    const configPDA = SolanaStablecoin.getConfigPDA(resolvedMint);

    const pauseIx = await this.program.methods
      .pause()
      .accounts({
        config: configPDA,
        mint: resolvedMint,
        signer: this.wallet.publicKey,
      })
      .instruction();

    const tx = new Transaction().add(pauseIx);
    tx.feePayer = this.wallet.publicKey;
    tx.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    const signedTx = await this.wallet.signTransaction(tx);
    return await this.connection.sendRawTransaction(signedTx.serialize());
  }

  async unpause(mint?: PublicKey): Promise<string> {
    const resolvedMint: PublicKey = (() => {
      if (mint instanceof PublicKey) return mint;
      if (this._mint) return this._mint;
      throw new Error('No mint address: use SolanaStablecoin.create() factory or pass mint explicitly as first argument');
    })();
    const configPDA = SolanaStablecoin.getConfigPDA(resolvedMint);

    const unpauseIx = await this.program.methods
      .unpause()
      .accounts({
        config: configPDA,
        mint: resolvedMint,
        signer: this.wallet.publicKey,
      })
      .instruction();

    const tx = new Transaction().add(unpauseIx);
    tx.feePayer = this.wallet.publicKey;
    tx.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    const signedTx = await this.wallet.signTransaction(tx);
    return await this.connection.sendRawTransaction(signedTx.serialize());
  }

  async getTotalSupply(mint?: PublicKey): Promise<number> {
    const resolvedMint: PublicKey = (() => {
      if (mint instanceof PublicKey) return mint;
      if (this._mint) return this._mint;
      throw new Error('No mint address: use SolanaStablecoin.create() factory or pass mint explicitly as first argument');
    })();
    const mintInfo = await this.connection.getTokenSupply(resolvedMint);
    return Number(mintInfo.value.amount);
  }

  async getConfig(mint?: PublicKey): Promise<StablecoinConfig | null> {
    const resolvedMint: PublicKey = (() => {
      if (mint instanceof PublicKey) return mint;
      if (this._mint) return this._mint;
      throw new Error('No mint address: use SolanaStablecoin.create() factory or pass mint explicitly as first argument');
    })();
    const configPDA = SolanaStablecoin.getConfigPDA(resolvedMint);
    try {
      const config = await (this.program.account as any).stablecoinConfig.fetch(
        configPDA
      );
      return config as unknown as StablecoinConfig;
    } catch {
      return null;
    }
  }

  async updateRoles(
    mint: PublicKey,
    args: UpdateRolesArgs
  ): Promise<string> {
    const configPDA = SolanaStablecoin.getConfigPDA(mint);

    const updateRolesIx = await this.program.methods
      .updateRoles({
        newMasterAuthority: args.newMasterAuthority,
        newMasterMinter: args.newMasterMinter,
        newBlacklister: args.newBlacklister,
        newPauser: args.newPauser,
      })
      .accounts({
        config: configPDA,
        mint: mint,
        signer: this.wallet.publicKey,
      })
      .instruction();

    const tx = new Transaction().add(updateRolesIx);
    tx.feePayer = this.wallet.publicKey;
    tx.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    const signedTx = await this.wallet.signTransaction(tx);
    return await this.connection.sendRawTransaction(signedTx.serialize());
  }

  async setMinterAllowance(
    mintOrMinter: PublicKey | { minter: PublicKey; allowance: number },
    minterOrAllowance?: PublicKey | number,
    allowance?: number
  ): Promise<string> {
    const resolvedMint: PublicKey = (() => {
      if (mintOrMinter instanceof PublicKey) return mintOrMinter;
      if (this._mint) return this._mint;
      throw new Error('No mint address: use SolanaStablecoin.create() factory or pass mint explicitly as first argument');
    })();
    
    let minter: PublicKey;
    let actualAllowance: number;
    
    if (mintOrMinter instanceof PublicKey) {
      // Old signature: mint, minter, allowance
      minter = minterOrAllowance as PublicKey;
      actualAllowance = allowance!;
    } else {
      // New signature: { minter, allowance }
      minter = (mintOrMinter as { minter: PublicKey }).minter;
      actualAllowance = (mintOrMinter as { allowance: number }).allowance;
    }
    
    const mint = resolvedMint;
    const configPDA = SolanaStablecoin.getConfigPDA(mint);
    const minterPDA = SolanaStablecoin.getMinterPDA(mint, minter);

    const setAllowanceIx = await this.program.methods
      .setMinterAllowance(new anchor.BN(actualAllowance))
      .accounts({
        config: configPDA,
        mint: mint,
        minterAllowance: minterPDA,
        minter: minter,
        payer: this.wallet.publicKey,
        signer: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction().add(setAllowanceIx);
    tx.feePayer = this.wallet.publicKey;
    tx.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    const signedTx = await this.wallet.signTransaction(tx);
    return await this.connection.sendRawTransaction(signedTx.serialize());
  }
}

export default SolanaStablecoin;
export { ComplianceModule };
export { buildInitializeArgs, getPreset, parseTOMLConfig, parseJSONConfig } from "./config";
