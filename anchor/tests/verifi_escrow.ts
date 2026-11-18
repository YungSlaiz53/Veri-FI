import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import assert from "node:assert";

describe("verifi_escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VerifiEscrow as Program<any>;
  const authority = provider.wallet as anchor.Wallet;
  const treasury = Keypair.generate();
  const playerA = Keypair.generate();
  const playerB = Keypair.generate();

  it("initializes config, locks Player A & B stakes in PDA vault, and settles to winner", async () => {
    // Airdrop SOL to test players on localnet/devnet
    for (const kp of [playerA, playerB]) {
      const sig = await provider.connection.requestAirdrop(kp.publicKey, 3 * LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(sig);
    }

    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    await program.methods
      .initializeConfig(treasury.publicKey, 200)
      .accounts({
        config: configPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const challengeId = "match_001";
    const [challengePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("challenge"), playerA.publicKey.toBuffer(), Buffer.from(challengeId)],
      program.programId
    );
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), challengePda.toBuffer()],
      program.programId
    );

    const stake = new anchor.BN(1 * LAMPORTS_PER_SOL);
    const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);

    await program.methods
      .createChallenge(challengeId, stake, expiresAt, 0)
      .accounts({
        challenge: challengePda,
        vault: vaultPda,
        creator: playerA.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([playerA])
      .rpc();

    const vaultAfterCreate = await provider.connection.getBalance(vaultPda);
    assert.strictEqual(vaultAfterCreate, LAMPORTS_PER_SOL);

    await program.methods
      .acceptChallenge()
      .accounts({
        challenge: challengePda,
        vault: vaultPda,
        opponent: playerB.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([playerB])
      .rpc();

    const vaultAfterAccept = await provider.connection.getBalance(vaultPda);
    assert.strictEqual(vaultAfterAccept, 2 * LAMPORTS_PER_SOL);

    const playerABeforeWin = await provider.connection.getBalance(playerA.publicKey);

    await program.methods
      .resolveChallenge(playerA.publicKey)
      .accounts({
        config: configPda,
        authority: authority.publicKey,
        challenge: challengePda,
        vault: vaultPda,
        winnerAccount: playerA.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const playerAAfterWin = await provider.connection.getBalance(playerA.publicKey);
    assert.strictEqual(playerAAfterWin - playerABeforeWin, 2 * LAMPORTS_PER_SOL);
  });

  it("allows creator to cancel an open unaccepted challenge and recover stake", async () => {
    const challengeId = "cancel_001";
    const [challengePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("challenge"), playerA.publicKey.toBuffer(), Buffer.from(challengeId)],
      program.programId
    );
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), challengePda.toBuffer()],
      program.programId
    );

    const stake = new anchor.BN(0.5 * LAMPORTS_PER_SOL);
    const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);

    await program.methods
      .createChallenge(challengeId, stake, expiresAt, 1)
      .accounts({
        challenge: challengePda,
        vault: vaultPda,
        creator: playerA.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([playerA])
      .rpc();

    await program.methods
      .cancelOpenChallenge()
      .accounts({
        challenge: challengePda,
        vault: vaultPda,
        creator: playerA.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([playerA])
      .rpc();

    const vaultBalance = await provider.connection.getBalance(vaultPda);
    assert.strictEqual(vaultBalance, 0);
  });
});
