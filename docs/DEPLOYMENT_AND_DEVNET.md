# Veri-Fi — Deployment, Solana Devnet, & Testing Guide

## 1. Architecture Overview
- **Frontend**: React 19 + TypeScript + Tailwind CSS (Vite)
- **Backend API**: Express (`server.ts`) handling Solana Devnet RPC verification, Ed25519 wallet signature validation, 2% App Fee accounting math, category guards (Casino & Poker blocked), and VeriBot AI (`@google/genai` `gemini-4-hydrogen`).
- **Database & Real-Time**: Firebase Authentication, Cloud Firestore (with Eight-Pillar `firestore.rules`), and Firebase Storage (`storage.rules`).
- **Blockchain Escrow**: Rust + Anchor smart contract (`anchor/programs/verifi_escrow/src/lib.rs`) using Program Derived Addresses (PDAs) on Solana Devnet.

## 2. Environment Variables (`.env`)
Copy `.env.example` and configure:
- `GEMINI_API_KEY`: Server-side API key for VeriBot.
- `SOLANA_RPC_URL`: `https://api.devnet.solana.com`
- `SOLANA_PROGRAM_ID`: Deployed Anchor program public key on Devnet.
- `VERIFI_TREASURY_PUBKEY`: Designated Veri-Fi Treasury wallet receiving the 2% App Fee on withdrawals.
- `APP_FEE_BPS`: `200` (2.00% withdrawal App Fee; distinct from Solana network fees).

## 3. Deploying the Anchor Escrow Program to Solana Devnet
1. Install Rust, Solana CLI (`>= 1.18`), and Anchor CLI (`0.30.1`).
2. Switch Solana CLI to Devnet and fund your deployer keypair:
   ```bash
   solana config set --url devnet
   solana airdrop 2
   ```
3. Build, test, and deploy from `anchor/`:
   ```bash
   cd anchor
   anchor build
   anchor test
   anchor deploy --provider.cluster devnet
   ```
4. Update `SOLANA_PROGRAM_ID` in `.env` and `declare_id!` in `anchor/programs/verifi_escrow/src/lib.rs` with the deployed Program ID.

## 4. Verifying Transactions on Solana Explorer
All Devnet deposits, withdrawals, and PDA escrow settlements link directly to:
`https://explorer.solana.com/tx/<SIGNATURE>?cluster=devnet`
And escrow PDA accounts link to:
`https://explorer.solana.com/address/<PDA_ADDRESS>?cluster=devnet`

## 5. Two-Wallet System & 2% App Fee
- **Veri-Fi App Wallet**: In-app ledger balance (`Available`, `Locked`, `Pending`) used for challenge stakes, internal transfers, and authorized payouts.
- **Private User Wallet**: External Phantom or Solflare wallet verified via Ed25519 signature.
- **Withdrawals**: Moving SOL from App Wallet -> Private Wallet applies a transparent **App Fee: 2%** (`200 bps`) routed to the Admin Treasury Wallet, separate from Solana network fees.

## 6. Local Verification
- Run unit tests: `npx --yes tsx --test src/utils/escrowLogic.test.ts firestore.rules.test.ts`
- Run TypeScript check: `npm run lint`
- Start full-stack dev server: `npm run dev` (listens on `http://localhost:3000`)
