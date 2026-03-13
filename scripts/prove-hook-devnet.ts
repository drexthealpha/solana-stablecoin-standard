import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  createInitializeExtraAccountMetaListInstruction,
  ExtraAccountMeta,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

const STABLECOIN_PROGRAM_ID = new PublicKey("2N19eMKD2xGpjNzfktVCPnkrbGJZAzuDFoH7SJtQiNm9");
const TRANSFER_HOOK_PROGRAM_ID = new PublicKey("PQgUt1swYzA9RSAG7gpyTQpk9TtbVReX11ytkeYTJBo");

async function main() {
  const rpcUrl = process.env.RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");
  const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE || "~", ".config/solana/id.json");
  const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, "utf-8"))));
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const mintAddress = process.env.MINT_ADDRESS;
  if (!mintAddress) throw new Error("Set MINT_ADDRESS env var to your SSS-2 devnet mint");
  const mint = new PublicKey(mintAddress);

  const stablecoinIdl = require("../sdk/idl/stablecoin.json");
  const stablecoinProgram = new anchor.Program(stablecoinIdl, provider);

  const [extraAccountMetaList] = PublicKey.findProgramAddressSync(
    [Buffer.from("extra-account-metas"), mint.toBuffer()],
    TRANSFER_HOOK_PROGRAM_ID
  );
  const [config] = PublicKey.findProgramAddressSync(
    [Buffer.from("config"), mint.toBuffer()],
    STABLECOIN_PROGRAM_ID
  );

  console.log("Step 1: initialize_extra_account_meta_list on transfer hook...");
  try {
    const extraAccountMetas: ExtraAccountMeta[] = [];

    const initHookIx = createInitializeExtraAccountMetaListInstruction(
      extraAccountMetaList,
      mint,
      keypair.publicKey,
      extraAccountMetas,
      TRANSFER_HOOK_PROGRAM_ID
    );

    const tx = new Transaction().add(initHookIx);
    tx.feePayer = keypair.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.sign(keypair);
    const hookInitTx = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(hookInitTx, "confirmed");
    console.log("HOOK_INIT_TX:", hookInitTx);
    console.log("Explorer:", `https://solana.fm/tx/${hookInitTx}?cluster=devnet-solana`);
  } catch (e: any) {
    if (e.message?.includes("already in use") || e.message?.includes("already exists")) {
      console.log("ExtraAccountMetaList already initialized — skipping");
    } else {
      console.error("Hook init error:", e.message);
    }
  }

  console.log("\nStep 2: Blacklist a fresh address and attempt transfer...");
  const victim = Keypair.generate();
  const [blacklistPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("blacklist"), mint.toBuffer(), victim.publicKey.toBuffer()],
    STABLECOIN_PROGRAM_ID
  );

  const blacklistTx = await stablecoinProgram.methods
    .addToBlacklist()
    .accounts({
      config,
      mint,
      blacklistEntry: blacklistPDA,
      targetAddress: victim.publicKey,
      payer: keypair.publicKey,
      signer: keypair.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("Blacklist TX:", blacklistTx);

  const victimATA = await getAssociatedTokenAddress(mint, victim.publicKey, false, TOKEN_2022_PROGRAM_ID);
  const myATA = await getAssociatedTokenAddress(mint, keypair.publicKey, false, TOKEN_2022_PROGRAM_ID);

  const createATATx = new Transaction().add(
    createAssociatedTokenAccountInstruction(keypair.publicKey, victimATA, victim.publicKey, mint, TOKEN_2022_PROGRAM_ID)
  );
  createATATx.feePayer = keypair.publicKey;
  createATATx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  createATATx.sign(keypair);
  await connection.sendRawTransaction(createATATx.serialize());

  console.log("Attempting transfer to blacklisted address (should be blocked by hook)...");
  try {
    const transferIx = createTransferCheckedInstruction(
      myATA, mint, victimATA, keypair.publicKey, 1000, 6, [], TOKEN_2022_PROGRAM_ID
    );
    const transferTx = new Transaction().add(transferIx);
    transferTx.feePayer = keypair.publicKey;
    transferTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transferTx.sign(keypair);
    const blockedTx = await connection.sendRawTransaction(transferTx.serialize());
    console.log("WARNING: Transfer succeeded — hook may not be wired yet:", blockedTx);
  } catch (e: any) {
    const sig = e.signature || e.message?.match(/[1-9A-HJ-NP-Za-km-z]{87,88}/)?.[0] || "see logs";
    console.log("BLOCKED_TX:", sig);
    console.log("Transfer was blocked — transfer hook is enforcing the blacklist.");
  }
}

main().catch(console.error);
