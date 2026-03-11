import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { assert } from "chai";

describe("SSS-2 Integration Tests", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Stablecoin as Program;
  const STABLECOIN_PROGRAM_ID = new PublicKey("2N19eMKD2xGpjNzfktVCPnkrbGJZAzuDFoH7SJtQiNm9");
  const TRANSFER_HOOK_PROGRAM_ID = new PublicKey("PQgUt1swYzA9RSAG7gpyTQpk9TtbVReX11ytkeYTJBo");
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
    mint = Keypair.generate();
    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), mint.publicKey.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );
  });

  it("Deploy and initialize SSS-2 stablecoin with compliance enabled", async () => {
    const decimals = 6;
    const name = "Compliant Stablecoin";
    const symbol = "CSTB";
    const uri = "https://example.com/compliant.json";

    const tx = await program.methods
      .initialize(decimals, {
        name,
        symbol,
        uri,
        masterAuthority: masterAuthority,
        masterMinter: masterAuthority,
        blacklister: masterAuthority,
        pauser: masterAuthority,
        enablePermanentDelegate: true,
        enableTransferHook: true,
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

    console.log("Initialize SSS-2 transaction:", tx);

    const config = await program.account.stablecoinConfig.fetch(configPDA);
    assert.equal(config.name, name);
    assert.equal(config.symbol, symbol);
    assert.equal(config.enablePermanentDelegate, true);
    assert.equal(config.enableTransferHook, true);
  });

  it("Create token accounts for users", async () => {
    userTokenAccount = await getAssociatedTokenAddress(
      mint.publicKey,
      user,
      false,
      TOKEN_PROGRAM_ID
    );

    blacklistedTokenAccount = await getAssociatedTokenAddress(
      mint.publicKey,
      blacklistedUser,
      false,
      TOKEN_PROGRAM_ID
    );

    treasuryTokenAccount = await getAssociatedTokenAddress(
      mint.publicKey,
      treasury,
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

    const blacklistedATAInstr = createAssociatedTokenAccountInstruction(
      masterAuthority,
      blacklistedTokenAccount,
      blacklistedUser,
      mint.publicKey,
      TOKEN_PROGRAM_ID
    );

    const treasuryATAInstr = createAssociatedTokenAccountInstruction(
      masterAuthority,
      treasuryTokenAccount,
      treasury,
      mint.publicKey,
      TOKEN_PROGRAM_ID
    );

    const tx = new anchor.web3.Transaction()
      .add(userATAInstr)
      .add(blacklistedATAInstr)
      .add(treasuryATAInstr);

    await program.provider.sendAndConfirm!(tx);

    console.log("Token accounts created");
  });

  it("Mint tokens to users", async () => {
    const amount = 1000000;

    const [minterPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("minter"), mint.publicKey.toBuffer(), masterAuthority.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );

    await program.methods
      .mint(new anchor.BN(amount))
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

    await program.methods
      .mint(new anchor.BN(amount))
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

    console.log("Tokens minted");
  });

  it("Add to blacklist", async () => {
    const [blacklistPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("blacklist"), mint.publicKey.toBuffer(), blacklistedUser.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );

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

    console.log("Add to blacklist transaction:", tx);

    const blacklistEntry = await program.account.blacklistEntry.fetch(blacklistPDA);
    assert.equal(blacklistEntry.isBlacklisted, true);
  });

  it("Verify blacklist status", async () => {
    const [blacklistPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("blacklist"), mint.publicKey.toBuffer(), blacklistedUser.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );

    const entry = await program.account.blacklistEntry.fetch(blacklistPDA);
    assert.equal(entry.isBlacklisted, true);

    const [userBlacklistPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("blacklist"), mint.publicKey.toBuffer(), user.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );

    try {
      await program.account.blacklistEntry.fetch(userBlacklistPDA);
      assert.fail("Should not exist");
    } catch (e) {
      console.log("Expected: User not in blacklist");
    }
  });

  it("Verify SSS-2 instructions work correctly", async () => {
    const [blacklistPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("blacklist"), mint.publicKey.toBuffer(), blacklistedUser.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );

    const config = await program.account.stablecoinConfig.fetch(configPDA);
    assert.equal(config.enablePermanentDelegate, true);
    assert.equal(config.blacklister.toBase58(), masterAuthority.toBase58());
  });

  it("Freeze blacklisted account", async () => {
    const tx = await program.methods
      .freezeAccount()
      .accounts({
        config: configPDA,
        mint: mint.publicKey,
        tokenAccount: blacklistedTokenAccount,
        signer: masterAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Freeze transaction:", tx);

    const tokenAccountInfo = await program.provider.connection.getParsedTokenAccountInfo(
      blacklistedTokenAccount
    );
    const isFrozen = tokenAccountInfo.value?.parsed?.info?.state === "frozen";
    assert.equal(isFrozen, true);
  });

  it("Seize tokens from frozen account", async () => {
    const seizeAmount = 500000;

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

    console.log("Seize transaction:", tx);

    const treasuryInfo = await program.provider.connection.getParsedTokenAccountInfo(
      treasuryTokenAccount
    );
    const treasuryBalance = treasuryInfo.value?.parsed?.info?.tokenAmount?.uiAmount || 0;
    assert.isTrue(treasuryBalance >= 0.5);
  });

  it("Remove from blacklist", async () => {
    const [blacklistPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("blacklist"), mint.publicKey.toBuffer(), blacklistedUser.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );

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

    console.log("Remove from blacklist transaction:", tx);

    const blacklistEntry = await program.account.blacklistEntry.fetch(blacklistPDA);
    assert.equal(blacklistEntry.isBlacklisted, false);
  });

  it("Verify SSS-2 instructions fail on SSS-1 config", async () => {
    const sss1Mint = Keypair.generate();
    const [sss1ConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), sss1Mint.publicKey.toBuffer()],
      STABLECOIN_PROGRAM_ID
    );

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
      assert.fail("Should have failed - SSS-1 does not support compliance");
    } catch (e: any) {
      assert.include(e.toString(), "NotCompliantStablecoin");
      console.log("Expected: SSS-2 instruction fails on SSS-1 config");
    }
  });
});
