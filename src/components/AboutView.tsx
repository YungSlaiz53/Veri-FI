import { ExternalLink, ShieldCheck } from 'lucide-react';
import { useVeriFi } from '../lib/store';

export function AboutView() {
  const { devnetInfo } = useVeriFi();

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">About Veri-Fi</h1>
        <p className="text-sm text-sky-400 font-medium">Bet. Chat. Win. · Built on Solana</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="rounded-2xl bg-[#0D101B] border border-white/10 p-6 space-y-2.5">
          <h2 className="text-lg font-semibold text-white">What Veri-Fi Does</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Veri-Fi is a social betting and challenge platform where people create friendly bets, challenge one another across Sports, Location Checkpoints, Truth or Dare, and Movie Predictions, communicate in private chat, and settle eligible winnings transparently.
          </p>
        </section>

        <section className="rounded-2xl bg-[#0D101B] border border-white/10 p-6 space-y-2.5">
          <h2 className="text-lg font-semibold text-white">How It Works</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Creators publish a challenge with clear rules and lock their SOL stake. Opponents review the terms, match the stake, compete, submit timestamped evidence, and receive payouts into their Veri-Fi App Wallet after authorized resolution.
          </p>
        </section>

        <section className="rounded-2xl bg-[#0D101B] border border-white/10 p-6 space-y-2.5">
          <h2 className="text-lg font-semibold text-white">Why Solana</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Solana powers Veri-Fi&apos;s escrow and transaction settlement through Rust and Anchor smart contracts. Low transaction latency and deterministic Program Derived Addresses (PDAs) ensure every challenge vault is verifiable on-chain.
          </p>
        </section>

        <section className="rounded-2xl bg-[#0D101B] border border-white/10 p-6 space-y-2.5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-violet-400" />
            Smart-Contract Security
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Challenge funds are governed by Anchor PDA smart-contract escrow rather than being freely accessible to an administrator. Withdrawals carry a transparent 2% App Fee (separate from Solana network fees), and VeriBot AI never controls funds or independently decides winners.
          </p>
        </section>
      </div>

      <section className="rounded-2xl bg-[#0D101B] border border-white/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-white">On-Chain Verification (Solana Devnet)</h2>
          <p className="text-xs text-slate-400 font-mono-tabular">
            Escrow Program: {devnetInfo.programId}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <a
            href="https://solana.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-medium"
          >
            Solana Network
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://explorer.solana.com/?cluster=devnet"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-medium"
          >
            Solana Explorer (Devnet)
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>
    </div>
  );
}
