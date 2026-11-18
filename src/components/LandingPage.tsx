import { useRef, useState } from 'react';
import { ArrowRight, Link2, Lock, Shield, Wallet } from 'lucide-react';
import { useVeriFi } from '../lib/store';
import { AuthModal } from './AuthModal';
import { LegalModal, type LegalDocType } from './LegalModal';
import { AdminLoginModal } from './AdminLoginModal';

export function LandingPage() {
  const { categories, sharedChallengeId } = useVeriFi();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocType>(null);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);

  const supportClickCountRef = useRef(0);
  const supportSingleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supportResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openAuth = () => {
    setAuthModalOpen(true);
  };

  const handleSupportClick = () => {
    supportClickCountRef.current += 1;

    if (supportSingleTimerRef.current) {
      clearTimeout(supportSingleTimerRef.current);
      supportSingleTimerRef.current = null;
    }
    if (supportResetTimerRef.current) {
      clearTimeout(supportResetTimerRef.current);
      supportResetTimerRef.current = null;
    }

    if (supportClickCountRef.current >= 3) {
      supportClickCountRef.current = 0;
      setLegalDoc(null);
      setAdminLoginOpen(true);
      return;
    }

    if (supportClickCountRef.current === 1) {
      supportSingleTimerRef.current = setTimeout(() => {
        supportSingleTimerRef.current = null;
        if (supportClickCountRef.current === 1) {
          setLegalDoc('support');
          supportClickCountRef.current = 0;
        }
      }, 420);
    }

    supportResetTimerRef.current = setTimeout(() => {
      supportClickCountRef.current = 0;
      supportResetTimerRef.current = null;
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#07080D] text-slate-100">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-[#07080D]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a href="#top" className="flex items-center gap-2.5 text-xl font-bold text-white whitespace-nowrap shrink-0 font-display">
            <img
              src="/src/assets/images/verifi_logo_mark_1795017981359.jpg"
              alt="Veri-Fi"
              className="w-8 h-8 rounded-lg object-cover"
            />
            <span>Veri-Fi</span>
          </a>

          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a href="#how-it-works" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              How It Works
            </a>
            <a href="#categories" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Categories
            </a>
            <a href="#escrow" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Solana Escrow
            </a>
            <a href="#wallets" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Two Wallets
            </a>
            <a href="#about" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              About
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={openAuth}
              className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              Sign In with Gmail
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {sharedChallengeId && (
          <div className="bg-violet-600/15 border-b border-violet-500/30">
            <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-violet-100">
                <Link2 className="w-4 h-4 text-violet-300 shrink-0" />
                <span>
                  You opened a shared challenge link (<span className="font-mono-tabular text-sky-300">{sharedChallengeId}</span>). Continue with Gmail to review and accept the challenge.
                </span>
              </div>
              <button
                type="button"
                onClick={openAuth}
                className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white whitespace-nowrap self-start sm:self-auto"
              >
                Continue with Gmail
              </button>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-14 pb-20 lg:pt-20 lg:pb-24">
          <div className="grid lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-xs font-medium tracking-wide text-sky-400">
                Bet. Chat. Win. · Solana Devnet · Anchor PDA Escrow
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] text-balance">
                Social challenges backed by verifiable Solana escrow.
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                Discover friends, create peer-to-peer bets across Sports, Location Checkpoints, Truth or Dare, Movie Predictions, and Custom challenges, share challenge links, chat privately in real time, and settle winnings through Rust & Anchor smart-contract escrow.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={openAuth}
                  className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                >
                  Continue with Gmail
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[280px] rounded-2xl overflow-hidden border border-white/10 bg-[#0D101B] relative">
                <img
                  src="/src/assets/images/hero_verifi_arena_1795017982464.jpg"
                  alt="Veri-Fi cryptographic challenge arena"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07080D]/85 via-[#07080D]/20 to-transparent flex items-end p-6">
                  <div className="space-y-1">
                    <p className="text-xs text-sky-300 font-medium">Solana Devnet Escrow Architecture</p>
                    <p className="text-sm text-slate-200 max-w-md">
                      Stakes lock in Program Derived Addresses (PDAs) and release only upon authorized outcome resolution.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4-column summary strip below hero */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-white/10 pt-8">
            <div>
              <p className="text-xs text-slate-400">Escrow Engine</p>
              <p className="text-lg font-semibold text-white mt-1">Rust + Anchor PDAs</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Primary Test Network</p>
              <p className="text-lg font-semibold text-white mt-1">Solana Devnet</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Supported External Wallets</p>
              <p className="text-lg font-semibold text-white mt-1">Phantom & Solflare</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Withdrawal Fee Transparency</p>
              <p className="text-lg font-semibold text-white mt-1 tabular-nums">App Fee: 2.00%</p>
            </div>
          </div>
        </section>

        {/* How Veri-Fi Works */}
        <section id="how-it-works" className="border-t border-white/10 bg-[#0D101B]/60 py-20">
          <div className="max-w-7xl mx-auto px-6 space-y-10">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-3xl font-bold text-white">How Veri-Fi Works</h2>
              <p className="text-sm sm:text-base text-slate-300">
                Every peer-to-peer challenge follows an auditable four-stage escrow lifecycle.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  step: '01. Create & Lock',
                  body: 'Pick a category or Other custom rules, define expiration, and lock your initial SOL stake inside a challenge PDA.',
                },
                {
                  step: '02. Share & Match',
                  body: 'Send your shareable challenge link so an opponent can open the app, review the rules, and match the stake.',
                },
                {
                  step: '03. Compete & Chat',
                  body: 'Follow challengers, chat in private 1-to-1 threads, share timestamps or location proof, and organize evidence with VeriBot.',
                },
                {
                  step: '04. Settle & Payout',
                  body: 'Authorized resolution triggers the smart contract to release the pooled funds to the verified winner.',
                },
              ].map((item) => (
                <div key={item.step} className="rounded-2xl bg-[#07080D] border border-white/10 p-6 space-y-3">
                  <h3 className="text-base font-semibold text-white">{item.step}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Challenge Categories */}
        <section id="categories" className="border-t border-white/10 py-20">
          <div className="max-w-7xl mx-auto px-6 space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <h2 className="text-3xl font-bold text-white">Challenge Categories</h2>
                <p className="text-sm sm:text-base text-slate-300">
                  Five active challenge categories including Custom (Other), plus upcoming gated modules clearly marked Coming Soon.
                </p>
              </div>
              <button
                type="button"
                onClick={openAuth}
                className="text-sm font-medium text-sky-400 hover:text-sky-300 whitespace-nowrap"
              >
                Continue with Gmail →
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`rounded-2xl border p-6 flex flex-col justify-between space-y-4 ${
                    cat.comingSoon
                      ? 'bg-[#0D101B]/40 border-white/10 opacity-80'
                      : 'bg-[#0D101B] border-white/10'
                  }`}
                >
                  <div className="space-y-3">
                    {cat.bannerUrl && (
                      <div className="h-36 rounded-xl overflow-hidden border border-white/10 bg-[#07080D]">
                        <img
                          src={cat.bannerUrl}
                          alt={cat.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold text-white">{cat.name}</h3>
                      {cat.comingSoon && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                          <Lock className="w-3.5 h-3.5" />
                          COMING SOON
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{cat.tagline}</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{cat.description}</p>
                  </div>

                  {cat.comingSoon ? (
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      className="w-full py-2.5 px-4 rounded-xl bg-white/5 text-slate-400 text-xs font-semibold cursor-not-allowed"
                    >
                      Disabled · Coming Soon
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openAuth}
                      className="w-full py-2.5 px-4 rounded-xl bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 text-violet-200 text-xs font-semibold transition-colors"
                    >
                      Explore {cat.name}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Secure Solana Escrow & Two-Wallet System */}
        <section id="escrow" className="border-t border-white/10 bg-[#0D101B]/60 py-20">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-8">
            <div className="rounded-2xl bg-[#07080D] border border-white/10 p-8 space-y-4">
              <div className="flex items-center gap-2.5 text-violet-400">
                <Shield className="w-5 h-5" />
                <span className="text-xs font-semibold tracking-wide">Smart-Contract Escrow</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Solana PDA Vault Protection</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Veri-Fi runs on Solana using Rust and the Anchor Framework. When a challenge is created and accepted, stakes are locked in deterministic Program Derived Addresses (PDAs). Administrators cannot arbitrarily withdraw locked user funds, and VeriBot AI never authorizes payouts.
              </p>
              <div className="pt-2 text-xs text-slate-400 space-y-1.5">
                <p>· Checked integer lamport arithmetic & duplicate-settlement protection</p>
                <p>· Verifiable transaction signatures on Solana Explorer (Devnet)</p>
                <p>· Dispute lock holds funds until authorized resolution</p>
              </div>
            </div>

            <div id="wallets" className="rounded-2xl bg-[#07080D] border border-white/10 p-8 space-y-4">
              <div className="flex items-center gap-2.5 text-sky-400">
                <Wallet className="w-5 h-5" />
                <span className="text-xs font-semibold tracking-wide">Two-Wallet Architecture</span>
              </div>
              <h2 className="text-2xl font-bold text-white">App Wallet + Private Wallet</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Veri-Fi separates your in-app ledger balance from your external self-custody wallet. Connect Phantom or Solflare via signed Ed25519 verification, deposit verified Devnet SOL into your App Wallet, transfer to friends, and withdraw anytime with a transparent <strong className="text-white">App Fee: 2%</strong>.
              </p>
              <div className="pt-2 text-xs text-slate-400 space-y-1.5">
                <p>· Veri-Fi App Wallet: Available, Locked, Pending & Auditable Ledger</p>
                <p>· Private Wallet: Phantom & Solflare (never asks for seed phrases)</p>
                <p>· Example withdrawal of 1.00 SOL: 0.02 SOL App Fee · 0.98 SOL Net Received</p>
              </div>
            </div>
          </div>
        </section>

        {/* About Veri-Fi */}
        <section id="about" className="border-t border-white/10 py-20">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-5">
            <h2 className="text-3xl font-bold text-white">About Veri-Fi</h2>
            <p className="text-base text-slate-300 leading-relaxed">
              Veri-Fi brings social interaction, private real-time chat, AI guidance from VeriBot, and Solana-powered smart-contract escrow together in one coherent platform. All initial blockchain workflows run on Solana Devnet with full transaction transparency on Solana Explorer.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <a
                href="https://solana.com"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-sky-400 hover:text-sky-300"
              >
                Explore Solana →
              </a>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <a
                href="https://explorer.solana.com/?cluster=devnet"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-sky-400 hover:text-sky-300"
              >
                Solana Explorer (Devnet) →
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-white/10 bg-[#07080D] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">Veri-Fi</span>
            <span>·</span>
            <span>Bet. Chat. Win.</span>
            <span>·</span>
            <span>Solana Devnet Release</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button type="button" onClick={() => setLegalDoc('terms')} className="hover:text-white transition-colors">
              Terms
            </button>
            <button type="button" onClick={() => setLegalDoc('privacy')} className="hover:text-white transition-colors">
              Privacy Policy
            </button>
            <button type="button" onClick={() => setLegalDoc('responsible')} className="hover:text-white transition-colors">
              Responsible Use
            </button>
            <button
              type="button"
              onClick={handleSupportClick}
              data-testid="footer-support-button"
              className="hover:text-white transition-colors select-none"
            >
              Support
            </button>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
      <LegalModal docType={legalDoc} onClose={() => setLegalDoc(null)} />
      <AdminLoginModal isOpen={adminLoginOpen} onClose={() => setAdminLoginOpen(false)} />
    </div>
  );
}
