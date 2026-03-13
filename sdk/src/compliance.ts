import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { STABLECOIN_PROGRAM_ID, SolanaStablecoin } from "./index";

export class ComplianceModule {
  private connection: Connection;
  private wallet: anchor.Wallet;
  private program: anchor.Program;
  private mint: PublicKey;

  constructor(
    connection: Connection,
    wallet: anchor.Wallet,
    mint: PublicKey,
    programId: PublicKey = STABLECOIN_PROGRAM_ID
  ) {
    this.connection = connection;
    this.wallet = wallet;
    this.mint = mint;

    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    anchor.setProvider(provider);

    this.program = new anchor.Program(
      require("../idl/stablecoin.json"),
      provider
    ) as anchor.Program;
  }

  async blacklistAdd(
    address: PublicKey,
    reason: string = "Manual review"
  ): Promise<string> {
    const config = await this.getConfig();
    if (!config.enablePermanentDelegate) {
      throw new Error(
        "SSS-2 compliance features require enablePermanentDelegate"
      );
    }

    const configPDA = SolanaStablecoin.getConfigPDA(this.mint);
    const blacklistPDA = SolanaStablecoin.getBlacklistPDA(this.mint, address);

    const addIx = await this.program.methods
      .addToBlacklist()
      .accounts({
        config: configPDA,
        mint: this.mint,
        blacklistEntry: blacklistPDA,
        targetAddress: address,
        payer: this.wallet.publicKey,
        signer: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction().add(addIx);
    tx.feePayer = this.wallet.publicKey;
    tx.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    const signedTx = await this.wallet.signTransaction(tx);
    return await this.connection.sendRawTransaction(signedTx.serialize());
  }

  async blacklistRemove(address: PublicKey): Promise<string> {
    const config = await this.getConfig();
    if (!config.enablePermanentDelegate) {
      throw new Error(
        "SSS-2 compliance features require enablePermanentDelegate"
      );
    }

    const configPDA = SolanaStablecoin.getConfigPDA(this.mint);
    const blacklistPDA = SolanaStablecoin.getBlacklistPDA(this.mint, address);

    const removeIx = await this.program.methods
      .removeFromBlacklist()
      .accounts({
        config: configPDA,
        mint: this.mint,
        blacklistEntry: blacklistPDA,
        targetAddress: address,
        signer: this.wallet.publicKey,
      })
      .instruction();

    const tx = new Transaction().add(removeIx);
    tx.feePayer = this.wallet.publicKey;
    tx.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    const signedTx = await this.wallet.signTransaction(tx);
    return await this.connection.sendRawTransaction(signedTx.serialize());
  }

  async seize(
    frozenAccount: PublicKey,
    treasury: PublicKey,
    amount: number
  ): Promise<string> {
    const config = await this.getConfig();
    if (!config.enablePermanentDelegate) {
      throw new Error(
        "SSS-2 compliance features require enablePermanentDelegate"
      );
    }

    const configPDA = SolanaStablecoin.getConfigPDA(this.mint);
    const sourceATA = await getAssociatedTokenAddress(
      this.mint,
      frozenAccount,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    const treasuryATA = await getAssociatedTokenAddress(
      this.mint,
      treasury,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    const treasuryInfo = await this.connection.getAccountInfo(treasuryATA);
    if (!treasuryInfo) {
      throw new Error(
        "Treasury token account does not exist. Create it first."
      );
    }

    const seizeIx = await this.program.methods
      .seize(new anchor.BN(amount))
      .accounts({
        config: configPDA,
        mint: this.mint,
        sourceToken: sourceATA,
        destinationToken: treasuryATA,
        signer: this.wallet.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .instruction();

    const tx = new Transaction().add(seizeIx);
    tx.feePayer = this.wallet.publicKey;
    tx.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    const signedTx = await this.wallet.signTransaction(tx);
    return await this.connection.sendRawTransaction(signedTx.serialize());
  }

  async getBlacklistStatus(address: PublicKey): Promise<boolean> {
    const blacklistPDA = SolanaStablecoin.getBlacklistPDA(this.mint, address);

    try {
      const entry = await (this.program.account as any).blacklistEntry.fetch(
        blacklistPDA
      );
      return (entry as any).isBlacklisted;
    } catch {
      return false;
    }
  }

  private async getConfig(): Promise<any> {
    const configPDA = SolanaStablecoin.getConfigPDA(this.mint);
    return await (this.program.account as any).stablecoinConfig.fetch(configPDA);
  }
}

export default ComplianceModule;
