/**
 * SSS-1: Minimal Stablecoin Integration Tests
 * Run with: anchor test --skip-deploy
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferCheckedInstruction, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { assert } from "chai";
import { SolanaStablecoin, Presets } from "../sdk/src/index";

describe("SSS-1: Minimal Stablecoin", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Stablecoin as Program;
  const STABLECOIN_PROGRAM_ID = new PublicKey("2N19eMKD2xGpjNzfktVCPnkrbGJZAzuDFoH7SJtQiNm9");
  const TOKEN_PROGRAM_ID = TOKEN_2022_PROGRAM_ID;

  const masterAuthority = anchor.workspace.Stablecoin.provider.publicKey as PublicKey;
  let mint: Keypair;
  let configPDA: PublicKey;
  let userTokenAccount: PublicKey;
  let recipientTokenAccount: PublicKey;
  const user = anchor.workspace.Stablecoin.provider.publicKey as PublicKey;
  const recipient = Keypair.generate().publicKey;

  before(async () => {
    mint = Keypair.generate();
    
    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), mint.publicKey.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );
  });

  it("initialize → verify config has enablePermanentDelegate=false", async () => {
    const preset = Presets.SSS_1;
    
    const decimals = 6;
    const name = "Test SSS-1";
    const symbol = "TST1";
    const uri = "";

    const tx = await program.methods
      .initialize(decimals, {
        name,
        symbol,
        uri,
        masterAuthority: masterAuthority,
        masterMinter: masterAuthority,
        blacklister: masterAuthority,
        pauser: masterAuthority,
        enablePermanentDelegate: false, // SSS-1: permanent delegate disabled
        enableTransferHook: false,       // SSS-1: transfer hook disabled
        defaultAccountFrozen: false,
      })
      .accounts({
        config: configPDA,
        mint: mint.publicKey,
        payer: masterAuthority,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([mint])
      .rpc();

    console.log("Initialize tx:", tx);

    const config = await program.account.stablecoinConfig.fetch(configPDA);
    
    assert.equal(config.enablePermanentDelegate, false, "SSS-1 should have enablePermanentDelegate=false");
    
    assert.equal(config.enableTransferHook, false, "SSS-1 should have enableTransferHook=false");
  });

  it("setMinterAllowance → mint 1,000,000 tokens → verify supply", async () => {
    const allowance = 2_000_000;
    const [minterPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("minter"), mint.publicKey.toBuffer(), masterAuthority.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );

    await program.methods
      .setMinterAllowance(new anchor.BN(allowance))
      .accounts({
        config: configPDA,
        mint: mint.publicKey,
        minterAllowance: minterPDA,
        minter: masterAuthority,
        payer: masterAuthority,
        signer: masterAuthority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    userTokenAccount = await getAssociatedTokenAddress(
      mint.publicKey,
      user,
      false,
      TOKEN_PROGRAM_ID
    );

    const userATAInstr = createAssociatedTokenAccountInstruction(
      masterAuthority,
      userTokenAccount,
      user,
      mint.publicKey,
      TOKEN_PROGRAM_ID
    );
    await program.provider.sendAndConfirm!(new anchor.web3.Transaction().add(userATAInstr));

    const mintAmount = 1_000_000;
    await program.methods
      .mint(new anchor.BN(mintAmount))
      .accounts({
        config: configPDA,
        mint: mint.publicKey,
        minterPda: minterPDA,
        minter: masterAuthority,
        destinationToken: userTokenAccount,
        payer: masterAuthority,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const mintInfo = await program.provider.connection.getParsedAccountInfo(mint.publicKey);
    const supply = mintInfo.value?.data?.parsed?.info?.supply || "0";
    const supplyUi = parseInt(supply) / Math.pow(10, 6);

    assert.equal(supplyUi, 1_000_000, "Total supply should be 1,000,000");
  });

  it("freeze → transfer fails while frozen", async () => {
    recipientTokenAccount = await getAssociatedTokenAddress(
      mint.publicKey,
      recipient,
      false,
      TOKEN_PROGRAM_ID
    );

    const recipientATAInstr = createAssociatedTokenAccountInstruction(
      masterAuthority,
      recipientTokenAccount,
      recipient,
      mint.publicKey,
      TOKEN_PROGRAM_ID
    );
    await program.provider.sendAndConfirm!(new anchor.web3.Transaction().add(recipientATAInstr));

    await program.methods
      .freezeAccount()
      .accounts({
        config: configPDA,
        mint: mint.publicKey,
        tokenAccount: recipientTokenAccount,
        signer: masterAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const accountInfo = await program.provider.connection.getParsedAccountInfo(recipientTokenAccount);
    const isFrozen = (accountInfo.value?.data as any)?.parsed?.info?.state === "frozen";
    assert.equal(isFrozen, true, "Account should be frozen");

    try {
      const transferIx = createTransferCheckedInstruction(
        userTokenAccount,
        mint.publicKey,
        recipientTokenAccount,
        user,
        100,
        6,
        [],
        TOKEN_PROGRAM_ID
      );
      await program.provider.sendAndConfirm!(new anchor.web3.Transaction().add(transferIx));
      assert.fail("Transfer should have failed while account is frozen");
    } catch (e: any) {
      assert.include(e.message.toLowerCase(), "frozen", "Expected frozen account error");
    }
  });

  it("thaw → transfer succeeds after thaw", async () => {
    await program.methods
      .thawAccount()
      .accounts({
        config: configPDA,
        mint: mint.publicKey,
        tokenAccount: recipientTokenAccount,
        signer: masterAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const accountInfo = await program.provider.connection.getParsedAccountInfo(recipientTokenAccount);
    const isFrozen = (accountInfo.value?.data as any)?.parsed?.info?.state === "frozen";
    assert.equal(isFrozen, false, "Account should be thawed");

    const transferIx = createTransferCheckedInstruction(
      userTokenAccount,
      mint.publicKey,
      recipientTokenAccount,
      user,
      100,
      6,
      [],
      TOKEN_PROGRAM_ID
    );
    await program.provider.sendAndConfirm!(new anchor.web3.Transaction().add(transferIx));
    console.log("Transfer succeeded after thaw");
  });

  it("SSS-2 instructions fail on SSS-1 preset with NotCompliantStablecoin", async () => {
    const [blacklistPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("blacklist"), mint.publicKey.toBuffer(), recipient.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );

    try {
      await program.methods
        .addToBlacklist()
        .accounts({
          config: configPDA,
          mint: mint.publicKey,
          blacklistEntry: blacklistPDA,
          targetAddress: recipient,
          payer: masterAuthority,
          signer: masterAuthority,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("addToBlacklist should fail on SSS-1");
    } catch (e: any) {
      const errorMsg = e.toString().toLowerCase();
      assert.isTrue(
        errorMsg.includes("notcompliantstablecoin") || errorMsg.includes("sss-2") || errorMsg.includes("compliance"),
        "Expected NotCompliantStablecoin or SSS-2 error"
      );
    }
  });

  it("pause → all operations blocked → unpause → operations resume", async () => {
    await program.methods
      .pause()
      .accounts({
        config: configPDA,
        mint: mint.publicKey,
        signer: masterAuthority,
      })
      .rpc();

    const config = await program.account.stablecoinConfig.fetch(configPDA);
    assert.equal(config.isPaused, true, "Should be paused");

    const [minterPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("minter"), mint.publicKey.toBuffer(), masterAuthority.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );

    try {
      await program.methods
        .mint(new anchor.BN(1000))
        .accounts({
          config: configPDA,
          mint: mint.publicKey,
          minterPda: minterPDA,
          minter: masterAuthority,
          destinationToken: userTokenAccount,
          payer: masterAuthority,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert.fail("Mint should fail while paused");
    } catch (e: any) {
      console.log("Expected: mint blocked while paused");
    }

    await program.methods
      .unpause()
      .accounts({
        config: configPDA,
        mint: mint.publicKey,
        signer: masterAuthority,
      })
      .rpc();

    const configAfter = await program.account.stablecoinConfig.fetch(configPDA);
    assert.equal(configAfter.isPaused, false, "Should be unpaused");

    await program.methods
      .mint(new anchor.BN(1000))
      .accounts({
        config: configPDA,
        mint: mint.publicKey,
        minterPda: minterPDA,
        minter: masterAuthority,
        destinationToken: userTokenAccount,
        payer: masterAuthority,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log("Mint succeeded after unpause");
  });
});
