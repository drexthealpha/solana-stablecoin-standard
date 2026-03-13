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
    // TODO: Generate a new mint keypair for the test
    mint = Keypair.generate();
    
    // TODO: Derive the config PDA using the mint address
    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), mint.publicKey.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );
  });

  it("initialize → verify config has enablePermanentDelegate=false", async () => {
    // TODO: Get SSS-1 preset configuration
    const preset = Presets.SSS1;
    
    // TODO: Initialize the stablecoin with SSS-1 preset
    const decimals = 6;
    const name = "Test SSS-1";
    const symbol = "TST1";
    const uri = "";

    // TODO: Call initialize instruction via program or SDK
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

    // TODO: Fetch the config account and verify flags
    const config = await program.account.stablecoinConfig.fetch(configPDA);
    
    // TODO: Assert enablePermanentDelegate === false
    assert.equal(config.enablePermanentDelegate, false, "SSS-1 should have enablePermanentDelegate=false");
    
    // TODO: Assert enableTransferHook === false
    assert.equal(config.enableTransferHook, false, "SSS-1 should have enableTransferHook=false");
  });

  it("setMinterAllowance → mint 1,000,000 tokens → verify supply", async () => {
    // TODO: Set minter allowance to 2_000_000 for the master authority
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

    // TODO: Ensure user token account exists (create if needed)
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

    // TODO: Mint 1_000_000 tokens to the user
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

    // TODO: Get total supply from the mint account
    const mintInfo = await program.provider.connection.getParsedAccountInfo(mint.publicKey);
    const supply = mintInfo.value?.data?.parsed?.info?.supply || "0";
    const supplyUi = parseInt(supply) / Math.pow(10, 6);

    // TODO: Assert supply === 1_000_000
    assert.equal(supplyUi, 1_000_000, "Total supply should be 1,000,000");
  });

  it("freeze → transfer fails while frozen", async () => {
    // TODO: Ensure recipient token account exists
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

    // TODO: Freeze the recipient account
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

    // TODO: Verify the account state is "frozen"
    const accountInfo = await program.provider.connection.getParsedAccountInfo(recipientTokenAccount);
    const isFrozen = (accountInfo.value?.data as any)?.parsed?.info?.state === "frozen";
    assert.equal(isFrozen, true, "Account should be frozen");

    // TODO: Attempt transfer from frozen account, expect error containing 'AccountFrozen' or 'frozen'
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
      // TODO: Verify error contains 'AccountFrozen' or 'frozen'
      assert.include(e.message.toLowerCase(), "frozen", "Expected frozen account error");
    }
  });

  it("thaw → transfer succeeds after thaw", async () => {
    // TODO: Thaw the recipient account
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

    // TODO: Verify account state is "initialized" (not frozen)
    const accountInfo = await program.provider.connection.getParsedAccountInfo(recipientTokenAccount);
    const isFrozen = (accountInfo.value?.data as any)?.parsed?.info?.state === "frozen";
    assert.equal(isFrozen, false, "Account should be thawed");

    // TODO: Transfer should now succeed
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
    // TODO: Attempt compliance.blacklistAdd on the SSS-1 mint
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
      // TODO: Expect error containing 'NotCompliantStablecoin' or 'SSS-2'
      const errorMsg = e.toString().toLowerCase();
      assert.isTrue(
        errorMsg.includes("notcompliantstablecoin") || errorMsg.includes("sss-2") || errorMsg.includes("compliance"),
        "Expected NotCompliantStablecoin or SSS-2 error"
      );
    }
  });

  it("pause → all operations blocked → unpause → operations resume", async () => {
    // TODO: Pause the stablecoin
    await program.methods
      .pause()
      .accounts({
        config: configPDA,
        mint: mint.publicKey,
        signer: masterAuthority,
      })
      .rpc();

    // TODO: Verify isPaused === true
    const config = await program.account.stablecoinConfig.fetch(configPDA);
    assert.equal(config.isPaused, true, "Should be paused");

    // TODO: Attempt mint, expect failure
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

    // TODO: Unpause the stablecoin
    await program.methods
      .unpause()
      .accounts({
        config: configPDA,
        mint: mint.publicKey,
        signer: masterAuthority,
      })
      .rpc();

    // TODO: Verify isPaused === false
    const configAfter = await program.account.stablecoinConfig.fetch(configPDA);
    assert.equal(configAfter.isPaused, false, "Should be unpaused");

    // TODO: Mint should now succeed
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
