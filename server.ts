import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { Connection, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import {
  calculateWithdrawalBreakdown,
  DEFAULT_APP_FEE_BPS,
  validateInternalTransfer,
} from './src/utils/escrowLogic';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const SOLANA_PROGRAM_ID =
  process.env.SOLANA_PROGRAM_ID || '8yAq46dHnn4yFYcas3JhdUzToacpb1F2qdJqW1hrmaPJ';
const VERIFI_TREASURY_PUBKEY =
  process.env.VERIFI_TREASURY_PUBKEY || '8yAq46dHnn3LY2Ue8U7qGc3a5tUKvFvo7xVnzryujPip';
const APP_FEE_BPS = Number(process.env.APP_FEE_BPS || DEFAULT_APP_FEE_BPS);

const solanaConnection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Server-side idempotency & replay protection stores
const processedTxSignatures = new Set<string>();
const processedIdempotencyKeys = new Set<string>();
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(maxRequests = 90, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = rateLimitMap.get(ip);
    if (!record || now > record.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (record.count >= maxRequests) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait before retrying.' });
    }
    record.count += 1;
    return next();
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', rateLimit());

  // --- Security Headers ---
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // --- Health & Category Enforcement ---
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      app: 'Veri-Fi',
      cluster: 'devnet',
      appFeeBps: APP_FEE_BPS,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/categories/status', (_req, res) => {
    res.json({
      categories: {
        sports: { enabled: true, comingSoon: false },
        location: { enabled: true, comingSoon: false },
        truth_or_dare: { enabled: true, comingSoon: false },
        movie_predictions: { enabled: true, comingSoon: false },
        other: { enabled: true, comingSoon: false },
        casino: { enabled: false, comingSoon: true },
        poker: { enabled: false, comingSoon: true },
      },
    });
  });

  // Strict backend block for Casino & Poker routes
  app.all('/api/casino*', (_req, res) => {
    res.status(403).json({
      error: 'Casino is Coming Soon and strictly disabled on both frontend and backend.',
      code: 'CATEGORY_DISABLED',
    });
  });

  app.all('/api/poker*', (_req, res) => {
    res.status(403).json({
      error: 'Poker is Coming Soon and strictly disabled on both frontend and backend.',
      code: 'CATEGORY_DISABLED',
    });
  });

  // --- Admin Portal Login ---
  const adminLoginSchema = z.object({
    username: z.string().min(1).max(64),
    password: z.string().min(1).max(128),
  });

  function timingSafeStringEqual(a: string, b: string): boolean {
    const hashA = crypto.createHash('sha256').update(a).digest();
    const hashB = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  }

  app.post('/api/admin/login', rateLimit(20, 60_000), (req, res) => {
    const parsed = adminLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid admin credentials payload.' });
    }
    const expectedUser = process.env.ADMIN_USERNAME || 'AdminMain';
    const expectedPass = process.env.ADMIN_PASSWORD || '1234567890';
    const userOk = timingSafeStringEqual(parsed.data.username.trim(), expectedUser);
    const passOk = timingSafeStringEqual(parsed.data.password, expectedPass);
    if (!userOk || !passOk) {
      return res.status(401).json({ error: 'Invalid administrator login or password.' });
    }
    return res.json({
      ok: true,
      adminUsername: expectedUser,
      adminEmail: 'blessedogle52@gmail.com',
    });
  });

  // --- Solana Devnet RPC & Escrow Helpers ---
  app.get('/api/solana/devnet-info', async (_req, res) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const slotPromise = solanaConnection.getSlot('confirmed');
      const slot = await Promise.race([
        slotPromise,
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => reject(new Error('RPC timeout')));
        }),
      ]);
      clearTimeout(timeout);
      res.json({
        online: true,
        cluster: 'devnet',
        rpcUrl: SOLANA_RPC_URL,
        programId: SOLANA_PROGRAM_ID,
        treasuryPubkey: VERIFI_TREASURY_PUBKEY,
        appFeeBps: APP_FEE_BPS,
        slot,
        explorerBaseUrl: 'https://explorer.solana.com',
      });
    } catch {
      res.json({
        online: false,
        cluster: 'devnet',
        rpcUrl: SOLANA_RPC_URL,
        programId: SOLANA_PROGRAM_ID,
        treasuryPubkey: VERIFI_TREASURY_PUBKEY,
        appFeeBps: APP_FEE_BPS,
        slot: null,
        explorerBaseUrl: 'https://explorer.solana.com',
      });
    }
  });

  const verifyWalletSchema = z.object({
    pubkey: z.string().min(32).max(64),
    message: z.string().min(4).max(500),
    signature: z.string().min(32).max(160),
  });

  app.post('/api/solana/verify-wallet', (req, res) => {
    const parsed = verifyWalletSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid wallet verification payload.' });
    }
    try {
      const publicKey = new PublicKey(parsed.data.pubkey);
      const signatureBytes = bs58.decode(parsed.data.signature);
      const messageBytes = new TextEncoder().encode(parsed.data.message);
      const verified = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
      if (!verified) {
        return res.status(401).json({ verified: false, error: 'Invalid Ed25519 wallet signature.' });
      }
      return res.json({ verified: true, pubkey: publicKey.toBase58(), cluster: 'devnet' });
    } catch (err) {
      return res.status(400).json({
        verified: false,
        error: err instanceof Error ? err.message : 'Failed to verify wallet signature.',
      });
    }
  });

  const derivePdaSchema = z.object({
    challengeId: z.string().min(1).max(32),
    creatorPubkey: z.string().min(32).max(64).optional(),
  });

  app.post('/api/solana/derive-escrow-pda', async (req, res) => {
    const parsed = derivePdaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid PDA derivation input.' });
    }
    try {
      const programId = new PublicKey(SOLANA_PROGRAM_ID);
      const creator = parsed.data.creatorPubkey
        ? new PublicKey(parsed.data.creatorPubkey)
        : new PublicKey(VERIFI_TREASURY_PUBKEY);
      const [challengePda] = await PublicKey.findProgramAddress(
        [Buffer.from('challenge'), creator.toBytes(), Buffer.from(parsed.data.challengeId)],
        programId
      );
      const [vaultPda] = await PublicKey.findProgramAddress(
        [Buffer.from('vault'), challengePda.toBytes()],
        programId
      );
      return res.json({
        programId: programId.toBase58(),
        challengePda: challengePda.toBase58(),
        vaultPda: vaultPda.toBase58(),
        explorerAddressUrl: `https://explorer.solana.com/address/${vaultPda.toBase58()}?cluster=devnet`,
      });
    } catch (err) {
      return res.status(400).json({
        error: err instanceof Error ? err.message : 'Unable to derive Solana PDA.',
      });
    }
  });

  const verifyTxSchema = z.object({
    signature: z.string().min(40).max(128),
    expectedRecipient: z.string().min(32).max(64).optional(),
    idempotencyKey: z.string().min(8).max(128).optional(),
  });

  app.post('/api/solana/verify-transaction', async (req, res) => {
    const parsed = verifyTxSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid transaction signature payload.' });
    }
    const { signature, idempotencyKey } = parsed.data;
    if (processedTxSignatures.has(signature)) {
      return res.status(409).json({
        verified: false,
        error: 'Transaction signature has already been processed (duplicate deposit prevented).',
      });
    }
    if (idempotencyKey && processedIdempotencyKeys.has(idempotencyKey)) {
      return res.status(409).json({
        verified: false,
        error: 'Duplicate idempotency key detected.',
      });
    }

    try {
      const tx = await solanaConnection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!tx) {
        return res.status(404).json({
          verified: false,
          status: 'not_found_or_pending',
          error:
            'Transaction not found on Solana Devnet yet. Unconfirmed deposits are never credited.',
          explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        });
      }

      if (tx.meta?.err) {
        return res.status(400).json({
          verified: false,
          status: 'failed',
          error: 'Transaction failed on-chain on Solana Devnet.',
          explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        });
      }

      processedTxSignatures.add(signature);
      if (idempotencyKey) {
        processedIdempotencyKeys.add(idempotencyKey);
      }

      return res.json({
        verified: true,
        status: 'confirmed',
        slot: tx.slot,
        blockTime: tx.blockTime,
        signature,
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      });
    } catch (err) {
      return res.status(502).json({
        verified: false,
        error:
          err instanceof Error
            ? `Solana Devnet RPC verification failed: ${err.message}`
            : 'Solana Devnet RPC unavailable.',
      });
    }
  });

  // --- Financial Accounting Endpoints ---
  const withdrawalCalcSchema = z.object({
    grossSol: z.number().positive().max(1000),
    appFeeBps: z.number().int().min(0).max(500).optional(),
  });

  app.post('/api/finance/calculate-withdrawal', (req, res) => {
    const parsed = withdrawalCalcSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid withdrawal amount.' });
    }
    try {
      const breakdown = calculateWithdrawalBreakdown(
        parsed.data.grossSol,
        parsed.data.appFeeBps ?? APP_FEE_BPS
      );
      return res.json({
        ...breakdown,
        treasuryPubkey: VERIFI_TREASURY_PUBKEY,
        feeLabel: `App Fee: ${breakdown.appFeePercent}%`,
        networkFeeNote: 'Solana network transaction fee is separate and not part of the App Fee.',
      });
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Calculation failed.' });
    }
  });

  const transferValidateSchema = z.object({
    senderUid: z.string().min(1),
    recipientUid: z.string().min(1),
    amountSol: z.number().positive(),
    availableLamports: z.number().int().nonnegative(),
    idempotencyKey: z.string().min(8).max(128),
  });

  app.post('/api/finance/validate-transfer', (req, res) => {
    const parsed = transferValidateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid transfer payload.' });
    }
    if (processedIdempotencyKeys.has(parsed.data.idempotencyKey)) {
      return res.status(409).json({ error: 'Duplicate transfer request blocked.' });
    }
    const result = validateInternalTransfer(
      parsed.data.senderUid,
      parsed.data.recipientUid,
      parsed.data.amountSol,
      parsed.data.availableLamports
    );
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    processedIdempotencyKeys.add(parsed.data.idempotencyKey);
    return res.json({ ok: true, amountLamports: result.amountLamports });
  });

  // --- VeriBot AI Assistant (Server-Side Gemini API) ---
  const veribotSchema = z.object({
    message: z.string().min(1).max(2000),
    context: z
      .object({
        activeTab: z.string().optional(),
        challengeTitle: z.string().optional(),
        challengeCategory: z.string().optional(),
        challengeRules: z.string().optional(),
        challengeStatus: z.string().optional(),
      })
      .optional(),
  });

  const VERIBOT_SYSTEM_INSTRUCTION = `You are VeriBot, the official AI assistant for Veri-Fi ("Bet. Chat. Win.").
Your purpose is to help users understand Veri-Fi, draft clear challenge titles/descriptions/rules, organize dispute evidence, understand the Two-Wallet System (Veri-Fi App Wallet vs Private Phantom/Solflare Wallet), explain the 2% App Fee on withdrawals (separate from Solana network fees), explain Solana Anchor PDA escrow, troubleshoot Devnet errors, and provide responsible-use guidance.

STRICT SECURITY RULES YOU MUST NEVER VIOLATE:
1. NEVER request, accept, or ask users to share private keys or seed phrases.
2. NEVER claim you can sign transactions, transfer funds, modify App Wallet balances, or move escrow SOL.
3. NEVER independently declare challenge winners or authorize smart-contract settlement. Only authorized resolution mechanisms settle Solana escrow.
4. NEVER fabricate live sports scores, movie outcomes, or fake Solana transaction confirmations. If you do not have verified data, state clearly what is unknown.
5. Remind users that Casino and Poker are currently Coming Soon and disabled, and that initial blockchain activity runs on Solana Devnet.
Keep responses clear, structured, concise, and helpful.`;

  app.post('/api/veribot', async (req, res) => {
    const parsed = veribotSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Please enter a valid message for VeriBot.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets to enable VeriBot.',
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const ctx = parsed.data.context;
      const contextBlock = ctx
        ? `\n[Authorized View Context]\nTab: ${ctx.activeTab || 'dashboard'}\nChallenge: ${ctx.challengeTitle || 'None'} (${ctx.challengeCategory || 'N/A'}, Status: ${ctx.challengeStatus || 'N/A'})\nRules: ${ctx.challengeRules || 'N/A'}\n`
        : '';

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `${contextBlock}\nUser Question: ${parsed.data.message}`,
        config: {
          systemInstruction: VERIBOT_SYSTEM_INSTRUCTION,
        },
      });

      const reply = response.text?.trim();
      if (!reply) {
        return res.status(502).json({ error: 'VeriBot returned an empty response.' });
      }
      return res.json({ reply });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'VeriBot request failed.';
      return res.status(500).json({ error: `VeriBot error: ${msg}` });
    }
  });

  // --- Vite Dev Middleware or Static Production Serving ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Veri-Fi server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Veri-Fi server:', err);
  process.exit(1);
});
