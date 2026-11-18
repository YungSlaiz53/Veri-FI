import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { useVeriFi } from '../lib/store';
import type { Challenge, ChallengeStatus } from '../types/verifi';
import { formatCategoryLabel, formatSol } from '../utils/escrowLogic';
import { ChallengeDetailModal } from './ChallengeDetailModal';

const STATUS_FILTERS: Array<'All' | ChallengeStatus> = [
  'All',
  'Open',
  'Awaiting Acceptance',
  'Pending Deposit',
  'Active',
  'Awaiting Evidence',
  'Under Review',
  'Completed',
  'Won',
  'Lost',
  'Disputed',
  'Cancelled',
  'Refunded',
];

export function MyBetsView() {
  const { challenges, currentUser, pushToast } = useVeriFi();
  const [statusFilter, setStatusFilter] = useState<'All' | ChallengeStatus>('All');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  const myChallenges = challenges.filter(
    (c) => c.creatorId === currentUser.uid || c.opponentId === currentUser.uid
  );

  const visible = myChallenges.filter((c) => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Won') return c.status === 'Completed' && c.winnerId === currentUser.uid;
    if (statusFilter === 'Lost')
      return c.status === 'Completed' && Boolean(c.winnerId) && c.winnerId !== currentUser.uid;
    return c.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Bets & Challenges</h1>
        <p className="text-xs text-slate-400 mt-1">
          Track escrow locks, evidence submissions, disputes, and settled Solana payouts.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              statusFilter === st
                ? 'bg-violet-600 text-white'
                : 'bg-[#0D101B] border border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-10 text-center">
          <p className="text-sm text-slate-300">No challenges found with status "{statusFilter}".</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#0D101B] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs text-slate-400">
                <tr>
                  <th className="py-3.5 px-5 font-medium">Challenge</th>
                  <th className="py-3.5 px-4 font-medium">Opponent</th>
                  <th className="py-3.5 px-4 font-medium">Status</th>
                  <th className="py-3.5 px-4 font-medium text-right">Stake</th>
                  <th className="py-3.5 px-5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {visible.map((ch) => {
                  const outcomeLabel =
                    ch.status === 'Completed' && ch.winnerId
                      ? ch.winnerId === currentUser.uid
                        ? 'Won'
                        : 'Lost'
                      : ch.status;
                  return (
                    <tr key={ch.id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 px-5">
                        <p className="font-medium text-white">{ch.title}</p>
                        <p className="text-xs text-slate-400">{formatCategoryLabel(ch.category)}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        {ch.creatorId === currentUser.uid
                          ? ch.opponentUsername
                            ? `@${ch.opponentUsername}`
                            : 'Open'
                          : `@${ch.creatorUsername}`}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-sky-300">{outcomeLabel}</td>
                      <td className="py-3.5 px-4 text-right font-mono-tabular text-white">
                        {formatSol(ch.stakeLamports, 2)} SOL
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={`Copy share link for ${ch.title}`}
                            onClick={async () => {
                              const url = `${window.location.origin}/?challenge=${ch.id}`;
                              try {
                                await navigator.clipboard.writeText(url);
                                pushToast('success', 'Challenge link copied', 'Anyone with this link can open & accept it.');
                              } catch {
                                pushToast('info', 'Shareable link', url);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-[#07080D] border border-white/10 text-slate-300 hover:text-white"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedChallenge(ch)}
                            className="px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/35 text-xs font-semibold text-violet-200"
                          >
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ChallengeDetailModal challenge={selectedChallenge} onClose={() => setSelectedChallenge(null)} />
    </div>
  );
}
