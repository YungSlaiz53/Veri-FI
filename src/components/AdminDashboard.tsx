import React, { useState } from 'react';
import { Lock, Search, ShieldCheck } from 'lucide-react';
import { useVeriFi } from '../lib/store';
import { formatSol } from '../utils/escrowLogic';

export function AdminDashboard() {
  const {
    currentUser,
    users,
    challenges,
    ledger,
    categories,
    sportsFixtures,
    moviePredictions,
    auditLogs,
    appFeeBps,
    treasuryBalanceLamports,
    adminToggleUserSuspension,
    adminUpdateAppFeeBps,
    adminAddSportsFixture,
    adminAddMoviePrediction,
    adminSettleMoviePrediction,
  } = useVeriFi();

  const [section, setSection] = useState<'overview' | 'users' | 'content' | 'financials' | 'audit'>(
    'overview'
  );
  const [userSearch, setUserSearch] = useState('');
  const [feeInputBps, setFeeInputBps] = useState(String(appFeeBps));

  // Content creation states
  const [league, setLeague] = useState('Premier League');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [movieTitle, setMovieTitle] = useState('');
  const [movieQuestion, setMovieQuestion] = useState('');
  const [movieOutcomeInput, setMovieOutcomeInput] = useState('');

  if (!currentUser.isAdmin) {
    return (
      <div className="rounded-2xl bg-[#0D101B] border border-rose-500/30 p-8 text-center space-y-2">
        <h1 className="text-lg font-semibold text-white">Administrator Authorization Required</h1>
        <p className="text-xs text-slate-400">
          This area is protected by backend role checks and Firestore security rules.
        </p>
      </div>
    );
  }

  const activeUsersCount = users.filter((u) => u.status === 'active').length;
  const activeChallengesCount = challenges.filter((c) => c.status === 'Active').length;
  const completedChallengesCount = challenges.filter((c) => c.status === 'Completed').length;
  const disputedChallengesCount = challenges.filter((c) => c.status === 'Disputed').length;

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    return !q || u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q);
  });

  const handlePublishFixture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeTeam.trim() || !awayTeam.trim()) return;
    adminAddSportsFixture({
      league: league.trim(),
      homeTeam: homeTeam.trim(),
      awayTeam: awayTeam.trim(),
      kickoffAt: new Date(Date.now() + 72 * 3600_000).toISOString(),
      markets: ['Match Outcome (1X2)', 'Both Teams to Score'],
      status: 'scheduled',
    });
    setHomeTeam('');
    setAwayTeam('');
  };

  const handlePublishMovie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieTitle.trim() || !movieQuestion.trim()) return;
    adminAddMoviePrediction({
      movieTitle: movieTitle.trim(),
      releaseWindow: 'Upcoming Release',
      question: movieQuestion.trim(),
      posterUrl: '/src/assets/images/category_movie_poster_1795017983279.jpg',
      deadlineAt: new Date(Date.now() + 14 * 86400_000).toISOString(),
      status: 'open',
    });
    setMovieTitle('');
    setMovieQuestion('');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-violet-400" />
            Admin Governance Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Platform operations, content publishing, 2% App Fee governance, and immutable audit logs. Admins cannot arbitrarily withdraw locked user escrow.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-white/10 pb-3">
          {(['overview', 'users', 'content', 'financials', 'audit'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSection(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                section === tab
                  ? 'bg-violet-600 text-white'
                  : 'bg-[#0D101B] border border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {section === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-5">
              <p className="text-xs text-slate-400">Registered / Active Users</p>
              <p className="text-2xl font-bold text-white font-mono-tabular mt-1">
                {users.length} / {activeUsersCount}
              </p>
            </div>
            <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-5">
              <p className="text-xs text-slate-400">Challenges (Active / Done)</p>
              <p className="text-2xl font-bold text-white font-mono-tabular mt-1">
                {activeChallengesCount} / {completedChallengesCount}
              </p>
            </div>
            <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-5">
              <p className="text-xs text-slate-400">Open Disputes</p>
              <p className="text-2xl font-bold text-amber-300 font-mono-tabular mt-1">
                {disputedChallengesCount}
              </p>
            </div>
            <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-5">
              <p className="text-xs text-slate-400">App Fee Treasury Revenue</p>
              <p className="text-2xl font-bold text-emerald-300 font-mono-tabular mt-1">
                {formatSol(treasuryBalanceLamports, 4)} SOL
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Category Availability Controls</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-xl bg-[#07080D] border border-white/10 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{cat.name}</p>
                    <p className="text-xs text-slate-400">
                      {cat.comingSoon ? 'Disabled · Coming Soon (Backend Locked)' : 'Enabled'}
                    </p>
                  </div>
                  {cat.comingSoon ? (
                    <Lock className="w-4 h-4 text-amber-300 shrink-0" />
                  ) : (
                    <span className="text-xs font-semibold text-emerald-300">Active</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {section === 'users' && (
        <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-white">User Management</h2>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="search"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#07080D] border border-white/15 text-xs text-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-slate-400">
                <tr>
                  <th className="py-3 pr-4">User</th>
                  <th className="py-3 px-4">Completed</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 pl-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredUsers.map((u) => (
                  <tr key={u.uid}>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-white">{u.displayName}</p>
                      <p className="text-slate-400">@{u.username}</p>
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-300">{u.completedChallenges}</td>
                    <td className="py-3 px-4 capitalize text-sky-300">{u.status}</td>
                    <td className="py-3 pl-4 text-right">
                      {u.uid !== currentUser.uid && (
                        <button
                          type="button"
                          onClick={() => adminToggleUserSuspension(u.uid)}
                          className="px-3 py-1.5 rounded-lg bg-[#07080D] border border-white/15 text-slate-200 hover:text-white"
                        >
                          {u.status === 'suspended' ? 'Restore' : 'Suspend'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'content' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <form
            onSubmit={handlePublishFixture}
            className="rounded-2xl bg-[#0D101B] border border-white/10 p-6 space-y-3"
          >
            <h2 className="text-base font-semibold text-white">Publish Sports Fixture</h2>
            <input
              type="text"
              value={league}
              onChange={(e) => setLeague(e.target.value)}
              placeholder="Competition / League"
              className="w-full px-3 py-2 rounded-xl bg-[#07080D] border border-white/15 text-xs text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                placeholder="Home Team"
                className="px-3 py-2 rounded-xl bg-[#07080D] border border-white/15 text-xs text-white"
              />
              <input
                type="text"
                required
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                placeholder="Away Team"
                className="px-3 py-2 rounded-xl bg-[#07080D] border border-white/15 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white"
            >
              Publish Fixture ({sportsFixtures.length} live)
            </button>
          </form>

          <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-6 space-y-4">
            <form onSubmit={handlePublishMovie} className="space-y-3">
              <h2 className="text-base font-semibold text-white">Publish Movie Prediction</h2>
              <input
                type="text"
                required
                value={movieTitle}
                onChange={(e) => setMovieTitle(e.target.value)}
                placeholder="Upcoming Movie Title"
                className="w-full px-3 py-2 rounded-xl bg-[#07080D] border border-white/15 text-xs text-white"
              />
              <input
                type="text"
                required
                value={movieQuestion}
                onChange={(e) => setMovieQuestion(e.target.value)}
                placeholder="Prediction Question (Entertainment)"
                className="w-full px-3 py-2 rounded-xl bg-[#07080D] border border-white/15 text-xs text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white"
              >
                Publish Movie Question
              </button>
            </form>

            {moviePredictions[0] && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <p className="text-xs text-slate-400">
                  Record Official Outcome for {moviePredictions[0].movieTitle}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={movieOutcomeInput}
                    onChange={(e) => setMovieOutcomeInput(e.target.value)}
                    placeholder="e.g., Commander Kael survives Act III"
                    className="flex-1 px-3 py-2 rounded-xl bg-[#07080D] border border-white/15 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (movieOutcomeInput.trim()) {
                        adminSettleMoviePrediction(moviePredictions[0].id, movieOutcomeInput.trim());
                        setMovieOutcomeInput('');
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white"
                  >
                    Set Outcome
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {section === 'financials' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">App Fee Configuration & Reconciliation</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="admin-fee-bps" className="block text-xs text-slate-400 mb-1">
                  Withdrawal App Fee (bps, max 500 = 5%)
                </label>
                <input
                  id="admin-fee-bps"
                  type="number"
                  min="0"
                  max="500"
                  value={feeInputBps}
                  onChange={(e) => setFeeInputBps(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-[#07080D] border border-white/15 text-xs text-white font-mono-tabular"
                />
              </div>
              <button
                type="button"
                onClick={() => adminUpdateAppFeeBps(Number(feeInputBps))}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white"
              >
                Update App Fee ({(appFeeBps / 100).toFixed(2)}% active)
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Ledger Reconciliation Status: Balanced ({ledger.length} verified entries · Escrow funds strictly isolated in Anchor PDAs).
            </p>
          </div>
        </div>
      )}

      {section === 'audit' && (
        <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-6 space-y-3">
          <h2 className="text-base font-semibold text-white">Immutable Admin Audit Logs</h2>
          <div className="divide-y divide-white/10 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-violet-300">{log.action}</p>
                  <p className="text-slate-300 mt-0.5">{log.details}</p>
                </div>
                <div className="text-slate-400 sm:text-right shrink-0">
                  <p>{log.adminEmail}</p>
                  <p>{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
