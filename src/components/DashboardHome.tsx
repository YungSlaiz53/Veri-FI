import { useState } from 'react';
import { ArrowUpRight, Plus, ShieldCheck, Users } from 'lucide-react';
import { useVeriFi } from '../lib/store';
import type { Challenge } from '../types/verifi';
import { formatCategoryLabel, formatSnakeLabel, formatSol } from '../utils/escrowLogic';
import { ChallengeModal } from './ChallengeModal';
import { ChallengeDetailModal } from './ChallengeDetailModal';

export function DashboardHome() {
  const {
    authMode,
    currentUser,
    wallet,
    challenges,
    users,
    ledger,
    setActiveTab,
    startConversationWith,
  } = useVeriFi();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  const myActiveBets = challenges.filter(
    (c) =>
      (c.creatorId === currentUser.uid || c.opponentId === currentUser.uid) &&
      ['Active', 'Awaiting Evidence', 'Under Review', 'Disputed'].includes(c.status)
  );

  const myPendingBets = challenges.filter(
    (c) =>
      (c.creatorId === currentUser.uid || c.opponentId === currentUser.uid) &&
      ['Open', 'Awaiting Acceptance', 'Pending Deposit'].includes(c.status)
  );

  const trendingChallenges = challenges.filter((c) => c.status === 'Open' || c.status === 'Active').slice(0, 4);
  const recommendedUsers = users.filter((u) => u.uid !== currentUser.uid && u.status === 'active').slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.displayName}
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-2xl object-cover border border-white/15"
          />
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome back, {currentUser.nickname || currentUser.displayName}
            </h1>
            <p className="text-xs text-slate-400">
              @{currentUser.username} · Solana Devnet ·{' '}
              {authMode === 'demo'
                ? 'Workspace Preview'
                : 'Live Firestore Session'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('wallet')}
            className="px-4 py-2.5 rounded-xl bg-[#0D101B] hover:bg-[#141A2E] border border-white/15 text-sm font-medium text-white transition-colors whitespace-nowrap"
          >
            App Wallet
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white inline-flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            New Challenge
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-5 space-y-1">
          <p className="text-xs text-slate-400">Available App Wallet</p>
          <p className="text-2xl font-bold text-white font-mono-tabular">
            {formatSol(wallet.availableLamports, 2)} SOL
          </p>
          <p className="text-xs text-slate-500">Ready for challenges or withdrawal</p>
        </div>
        <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-5 space-y-1">
          <p className="text-xs text-slate-400">Locked Escrow Balance</p>
          <p className="text-2xl font-bold text-violet-300 font-mono-tabular">
            {formatSol(wallet.lockedLamports, 2)} SOL
          </p>
          <p className="text-xs text-slate-500">Held in Solana PDA vaults</p>
        </div>
        <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-5 space-y-1">
          <p className="text-xs text-slate-400">Active & Pending Bets</p>
          <p className="text-2xl font-bold text-white font-mono-tabular">
            {myActiveBets.length} / {myPendingBets.length}
          </p>
          <p className="text-xs text-slate-500">
            {currentUser.completedChallenges} completed · {formatSol(wallet.totalWinningsLamports, 2)} SOL won
          </p>
        </div>
        <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-5 space-y-1">
          <p className="text-xs text-slate-400">Referral Points</p>
          <p className="text-2xl font-bold text-sky-300 font-mono-tabular">
            {currentUser.referralPoints} pts
          </p>
          <p className="text-xs text-slate-500">Code: {currentUser.referralCode}</p>
        </div>
      </div>

      {/* Main Split: Trending Challenges + Recommended People & Recent Activity */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Trending Challenges</h2>
            <button
              type="button"
              onClick={() => setActiveTab('explore')}
              className="text-xs font-medium text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
            >
              View All
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {trendingChallenges.map((ch) => (
              <div
                key={ch.id}
                className="rounded-2xl bg-[#0D101B] border border-white/10 hover:border-white/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-xs text-slate-400">
                    {formatCategoryLabel(ch.category)} · @{ch.creatorUsername} · {ch.status}
                    {ch.isDemoData && ' · Demo'}
                  </p>
                  <h3 className="text-base font-semibold text-white truncate">{ch.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-1">{ch.description}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-white font-mono-tabular">
                    {formatSol(ch.stakeLamports, 2)} SOL
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedChallenge(ch)}
                    className="px-3.5 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/30 text-xs font-semibold text-violet-200 transition-colors whitespace-nowrap"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          {/* Recommended Opponents */}
          <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                Recommended Challengers
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('social')}
                className="text-xs text-sky-400 hover:text-sky-300"
              >
                Directory
              </button>
            </div>

            <div className="divide-y divide-white/10">
              {recommendedUsers.map((u) => (
                <div key={u.uid} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={u.avatarUrl}
                      alt={u.displayName}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {u.nickname || u.displayName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        @{u.username} · {u.showStats ? `${u.wins}W / ${u.losses}L` : 'Stats private'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      startConversationWith(u.uid);
                      setActiveTab('messages');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#121728] hover:bg-[#192038] border border-white/15 text-xs font-medium text-slate-200 shrink-0"
                  >
                    Message
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Ledger Activity */}
          <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-violet-400" />
                Recent Activity
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('wallet')}
                className="text-xs text-sky-400 hover:text-sky-300"
              >
                Full Ledger
              </button>
            </div>

            <div className="space-y-3">
              {ledger.slice(0, 4).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-200 capitalize truncate">
                      {formatSnakeLabel(entry.type)}
                    </p>
                    <p className="text-slate-400 truncate">{entry.note || entry.status}</p>
                  </div>
                  <span className="font-mono-tabular font-semibold text-white shrink-0">
                    {formatSol(entry.netLamports, 2)} SOL
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ChallengeModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
      <ChallengeDetailModal challenge={selectedChallenge} onClose={() => setSelectedChallenge(null)} />
    </div>
  );
}
