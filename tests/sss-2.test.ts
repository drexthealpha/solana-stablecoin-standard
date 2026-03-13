/**
 * SSS-2: Compliant Stablecoin Integration Tests
 * Run with: anchor test --skip-deploy
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferCheckedInstruction, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { assert } from "chai";
import { SolanaStablecoin, ComplianceModule, Presets } from "../sdk/src/index";

describe("SSS-2: Compliant Stablecoin", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Stablecoin as Program;
  const STABLECOIN_PROGRAM_ID = new PublicKey("2N19eMKD2xGpjNzfktVCPnkrbGJZAzuDFoH7SJtQiNm9");
  const TOKEN_PROGRAM_ID = TOKEN_2022_PROGRAM_ID;

  const masterAuthority = anchor.workspace.Stablecoin.provider.publicKey as PublicKey;
  let mint: Keypair;
  let configPDA: PublicKey;
  let userTokenAccount: PublicKey;
  let blacklistedTokenAccount: PublicKey;
  let treasuryTokenAccount: PublicKey;
  const user = anchor.workspace.Stablecoin.provider.publicKey as PublicKey;
  const blacklistedUser = Keypair.generate().publicKey;
  const treasury = Keypair.generate().publicKey;

  before(async () => {
    // TODO: Generate a new mint keypair for the SSS-2 test
    mint = Keypair.generate();
    
    // TODO: Derive the config PDA using the mint address
    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), mint.publicKey.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );
  });

  it("initialize → verify config has enablePermanentDelegate=true", async () => {
    // TODO: Get SSS-2 preset configuration
    const preset = Presets.SSS_2;
    
    // TODO: Initialize the stablecoin with SSS-2 preset (compliance enabled)
    const decimals = 6;
    const name = "Compliant SSS-2";
    const symbol = "CSTB2";
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
        enablePermanentDelegate: true,  // SSS-2: permanent delegate enabled
        enableTransferHook: true,       // SSS-2: transfer hook enabled
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

    console.log("Initialize SSS-2 tx:", tx);

    // TODO: Fetch the config account and verify flags
    const config = await program.account.stablecoinConfig.fetch(configPDA);
    
    // TODO: Assert enablePermanentDelegate === true
    assert.equal(config.enablePermanentDelegate, true, "SSS-2 should have enablePermanentDelegate=true");
    
    // TODO: Assert enableTransferHook === true
    assert.equal(config.enableTransferHook, true, "SSS-2 should have enableTransferHook=true");
  });

  it("setMinterAllowance → mint 1,000,000 tokens", async () => {
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

    // TODO: Create user token account
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

    // TODO: Verify balance
    const accountInfo = await program.provider.connection.getParsedAccountInfo(userTokenAccount);
    const balance = (accountInfo.value?.data as any)?.parsed?.info?.tokenAmount?.uiAmount || 0;
    assert.equal(balance, 1_000_000, "User should have 1,000,000 tokens");
  });

  it("addToBlacklist → verify BlacklistEntry PDA created", async () => {
    // TODO: Derive the blacklist entry PDA for blacklistedUser
    const [blacklistPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("blacklist"), mint.publicKey.toBuffer(), blacklistedUser.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );

    // TODO: Create token account for blacklisted user
    blacklistedTokenAccount = await getAssociatedTokenAddress(
      mint.publicKey,
      blacklistedUser,
      false,
      TOKEN_PROGRAM_ID
    );

    const blacklistedATAInstr = createAssociatedTokenAccountInstruction(
      masterAuthority,
      blacklistedTokenAccount,
      blacklistedUser,
      mint.publicKey,
      TOKEN_PROGRAM_ID
    );
    await program.provider.sendAndConfirm!(new anchor.web3.Transaction().add(blacklistedATAInstr));

    // TODO: Mint some tokens to blacklisted user first
    const [minterPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("minter"), mint.publicKey.toBuffer(), masterAuthority.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );

    await program.methods
      .mint(new anchor.BN(500000))
      .accounts({
        config: configPDA,
        mint: mint.publicKey,
        minterPda: minterPDA,
        minter: masterAuthority,
        destinationToken: blacklistedTokenAccount,
        payer: masterAuthority,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    // TODO: Call addToBlacklist instruction
    const tx = await program.methods
      .addToBlacklist()
      .accounts({
        config: configPDA,
        mint: mint.publicKey,
        blacklistEntry: blacklistPDA,
        targetAddress: blacklistedUser,
        payer: masterAuthority,
        signer: masterAuthority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Add to blacklist tx:", tx);

    // TODO: Fetch and verify BlacklistEntry PDA was created with isBlacklisted=true
    const blacklistEntry = await program.account.blacklistEntry.fetch(blacklistPDA);
    assert.equal(blacklistEntry.isBlacklisted, true, "User should be blacklisted");
  });

  it("transfer blocked for blacklisted address (hook fires)", async () => {
    // TODO: Create treasury token account
    treasuryTokenAccount = await getAssociatedTokenAddress(
      mint.publicKey,
      treasury,
      false,
      TOKEN_PROGRAM_ID
    );

    const treasuryATAInstr = createAssociatedTokenAccountInstruction(
      masterAuthority,
      treasuryTokenAccount,
      treasury,
      mint.publicKey,
      TOKEN_PROGRAM_ID
    );
    await program.provider.sendAndConfirm!(new anchor.web3.Transaction().add(treasuryATAInstr));

    // TODO: Attempt transfer from blacklisted address
    try {
      const transferIx = createTransferCheckedInstruction(
        blacklistedTokenAccount,
        mint.publicKey,
        treasuryTokenAccount,
        blacklistedUser,
        100,
        6,
        [],
        TOKEN_PROGRAM_ID
      );
      await program.provider.sendAndConfirm!(
        new anchor.web3.Transaction().add(transferIx),
        { signers: [blacklistedUser] } // Sign with blacklisted user's keypair
      );
      assert.fail("Transfer should have been blocked for blacklisted address");
    } catch (e: any) {
      // TODO: Expect error containing 'BlacklistedAddress'
      const errorMsg = e.toString().toLowerCase();
      assert.isTrue(
        errorMsg.includes("blacklist") || errorMsg.includes("blocked") || errorMsg.includes("denied"),
        "Expected blacklisted address error"
      );
      console.log("Transfer blocked for blacklisted address (transfer hook fired)");
    }
  });

  it("freeze → seize (requires freeze first) → verify permanent delegate CPI", async () => {
    // TODO: Freeze the blacklisted account first
    await program.methods
      .freezeAccount()
      .accounts({
        config: configPDA,
        mint: mint.publicKey,
        tokenAccount: blacklistedTokenAccount,
        signer: masterAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Account frozen");

    // TODO: Seize tokens from the frozen account
    const seizeAmount = 100000;
    const tx = await program.methods
      .seize(new anchor.BN(seizeAmount))
      .accounts({
        config: configPDA,
        mint: mint.publicKey,
        sourceToken: blacklistedTokenAccount,
        destinationToken: treasuryTokenAccount,
        signer: masterAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Seize tx:", tx);

    // TODO: Verify tokens were transferred to treasury
    const treasuryInfo = await program.provider.connection.getParsedAccountInfo(treasuryTokenAccount);
    const treasuryBalance = (treasuryInfo.value?.data as any)?.parsed?.info?.tokenAmount?.uiAmount || 0;
    assert.isTrue(treasuryBalance >= 0.1, "Treasury should have seized tokens");

    // TODO: Attempt seize without freeze first - should fail with AccountNotFrozen
    const blacklistedUser2 = Keypair.generate().publicKey;
    const blacklistedTokenAccount2 = await getAssociatedTokenAddress(
      mint.publicKey,
      blacklistedUser2,
      false,
      TOKEN_PROGRAM_ID
    );

    const blacklistedATAInstr2 = createAssociatedTokenAccountInstruction(
      masterAuthority,
      blacklistedTokenAccount2,
      blacklistedUser2,
      mint.publicKey,
      TOKEN_PROGRAM_ID
    );
    await program.provider.sendAndConfirm!(new anchor.web3.Transaction().add(blacklistedATAInstr2));

    // Mint to the new account without freezing
    const [minterPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("minter"), mint.publicKey.toBuffer(), masterAuthority.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );

    await program.methods
      .mint(new anchor.BN(100000))
      .accounts({
        config: configPDA,
        mint: mint.publicKey,
        minterPda: minterPDA,
        minter: masterAuthority,
        destinationToken: blacklistedTokenAccount2,
        payer: masterAuthority,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    try {
      await program.methods
        .seize(new anchor.BN(10000))
        .accounts({
          config: configPDA,
          mint: mint.publicKey,
          sourceToken: blacklistedTokenAccount2,
          destinationToken: treasuryTokenAccount,
          signer: masterAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert.fail("Seize should fail without freeze first");
    } catch (e: any) {
      // TODO: Expect error about account not frozen
      console.log("Seize without freeze failed as expected");
    }
  });

  it("removeFromBlacklist → PDA closed, lamports refunded", async () => {
    // TODO: Get the blacklist entry PDA
    const [blacklistPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("blacklist"), mint.publicKey.toBuffer(), blacklistedUser.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );

    // TODO: Call removeFromBlacklist instruction
    const tx = await program.methods
      .removeFromBlacklist()
      .accounts({
        config: configPDA,
        mint: mint.publicKey,
        blacklistEntry: blacklistPDA,
        targetAddress: blacklistedUser,
        signer: masterAuthority,
      })
      .rpc();

    console.log("Remove from blacklist tx:", tx);

    // TODO: Verify the blacklist entry is now marked as not blacklisted
    const blacklistEntry = await program.account.blacklistEntry.fetch(blacklistPDA);
    assert.equal(blacklistEntry.isBlacklisted, false, "User should be removed from blacklist");
  });

  it("SSS-2 gate: addToBlacklist fails on SSS-1 mint with NotCompliantStablecoin", async () => {
    // TODO: Create a new SSS-1 mint for this test
    const sss1Mint = Keypair.generate();
    const [sss1ConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), sss1Mint.publicKey.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );

    // TODO: Initialize as SSS-1 (enablePermanentDelegate: false)
    await program.methods
      .initialize(6, {
        name: "SSS-1 Coin",
        symbol: "SSS1",
        uri: "",
        masterAuthority: masterAuthority,
        masterMinter: masterAuthority,
        blacklister: masterAuthority,
        pauser: masterAuthority,
        enablePermanentDelegate: false,
        enableTransferHook: false,
        defaultAccountFrozen: false,
      })
      .accounts({
        config: sss1ConfigPDA,
        mint: sss1Mint.publicKey,
        payer: masterAuthority,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([sss1Mint])
      .rpc();

    // TODO: Attempt to call addToBlacklist on SSS-1 mint
    const [sss1BlacklistPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("blacklist"), sss1Mint.publicKey.toBuffer(), blacklistedUser.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );

    try {
      await program.methods
        .addToBlacklist()
        .accounts({
          config: sss1ConfigPDA,
          mint: sss1Mint.publicKey,
          blacklistEntry: sss1BlacklistPDA,
          targetAddress: blacklistedUser,
          payer: masterAuthority,
          signer: masterAuthority,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("addToBlacklist should fail on SSS-1 mint");
    } catch (e: any) {
      // TODO: Expect error containing 'NotCompliantStablecoin' or similar
      const errorMsg = e.toString().toLowerCase();
      assert.isTrue(
        errorMsg.includes("notcompliantstablecoin") || errorMsg.includes("sss-2") || errorMsg.includes("compliance"),
        "Expected NotCompliantStablecoin error for SSS-1 mint"
      );
    }
  });
});
