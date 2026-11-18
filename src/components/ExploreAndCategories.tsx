import { useState } from 'react';
import { Lock, Plus, Search, Share2 } from 'lucide-react';
import { useVeriFi } from '../lib/store';
import type { ActiveCategoryId, CategoryId, Challenge } from '../types/verifi';
import { formatCategoryLabel, formatSnakeLabel, formatSol } from '../utils/escrowLogic';
import { ChallengeModal } from './ChallengeModal';
import { ChallengeDetailModal } from './ChallengeDetailModal';

export function ExploreAndCategories({ initialView }: { initialView: 'explore' | 'categories' }) {
  const {
    currentUser,
    challenges,
    categories,
    sportsFixtures,
    moviePredictions,
    locationPrompts,
    todPrompts,
    pushToast,
  } = useVeriFi();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<CategoryId | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaultCat, setCreateDefaultCat] = useState<ActiveCategoryId>('sports');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  const filtered = challenges.filter((ch) => {
    const matchesCat = selectedCat === 'all' || ch.category === selectedCat;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      ch.title.toLowerCase().includes(q) ||
      ch.description.toLowerCase().includes(q) ||
      ch.creatorUsername.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const openCreatorFor = (cat: ActiveCategoryId) => {
    setCreateDefaultCat(cat);
    setCreateOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {initialView === 'categories' ? 'Challenge Categories' : 'Explore Challenge Lobby'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse open Solana PDA challenges or launch your own. Casino and Poker remain Coming Soon and disabled.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreatorFor('sports')}
          className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white inline-flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Challenge
        </button>
      </div>

      {/* Category Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 ${
              cat.comingSoon
                ? 'bg-[#0D101B]/45 border-white/10 opacity-75'
                : selectedCat === cat.id
                ? 'bg-[#121728] border-violet-500/60'
                : 'bg-[#0D101B] border-white/10'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-white">{cat.name}</h2>
                {cat.comingSoon ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
                    <Lock className="w-3.5 h-3.5" />
                    COMING SOON
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-mono-tabular">
                    {challenges.filter((c) => c.category === cat.id).length} active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{cat.tagline}</p>
              <p className="text-xs text-slate-300 leading-relaxed">{cat.description}</p>
            </div>

            {cat.comingSoon ? (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="w-full py-2 px-3 rounded-xl bg-white/5 text-slate-400 text-xs font-semibold cursor-not-allowed"
              >
                Disabled · Awaiting Release Authorization
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCat(selectedCat === cat.id ? 'all' : cat.id)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#07080D] hover:bg-white/5 border border-white/15 text-xs font-medium text-slate-200"
                >
                  {selectedCat === cat.id ? 'Show All' : 'Filter Lobby'}
                </button>
                <button
                  type="button"
                  onClick={() => openCreatorFor(cat.id as ActiveCategoryId)}
                  className="py-2 px-3 rounded-xl bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/30 text-xs font-semibold text-violet-200"
                >
                  Create
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Category Curated Feeds (Sports, Movie Predictions, Location, Truth or Dare) */}
      {initialView === 'categories' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-5 space-y-4">
            <h2 className="text-base font-semibold text-white">Curated Sports Fixtures</h2>
            <div className="space-y-3">
              {sportsFixtures.map((fix) => (
                <div key={fix.id} className="p-3.5 rounded-xl bg-[#07080D] border border-white/10 space-y-1">
                  <p className="text-xs text-sky-300">
                    {fix.league} · {new Date(fix.kickoffAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {fix.homeTeam} vs {fix.awayTeam}
                  </p>
                  <p className="text-xs text-slate-400">Markets: {fix.markets.join(' · ')}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-5 space-y-4">
            <h2 className="text-base font-semibold text-white">Upcoming Movie Predictions (Entertainment)</h2>
            <div className="space-y-3">
              {moviePredictions.map((mov) => (
                <div key={mov.id} className="p-3.5 rounded-xl bg-[#07080D] border border-white/10 flex gap-3.5">
                  <img
                    src={mov.posterUrl}
                    alt={mov.movieTitle}
                    referrerPolicy="no-referrer"
                    className="w-16 h-20 rounded-lg object-cover shrink-0"
                  />
                  <div className="space-y-1">
                    <p className="text-xs text-violet-300">{mov.releaseWindow} · Entertainment Only</p>
                    <p className="text-sm font-semibold text-white">{mov.movieTitle}</p>
                    <p className="text-xs text-slate-300">{mov.question}</p>
                    {mov.officialOutcome && (
                      <p className="text-xs text-emerald-300">Official Outcome: {mov.officialOutcome}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-5 space-y-3">
            <h2 className="text-base font-semibold text-white">Verified Location Checkpoints</h2>
            {locationPrompts.map((loc) => (
              <div key={loc.id} className="p-3.5 rounded-xl bg-[#07080D] border border-white/10 space-y-1">
                <p className="text-xs text-sky-300">
                  {loc.city} · {loc.radiusMeters}m verification radius
                </p>
                <p className="text-sm font-semibold text-white">{loc.title}</p>
                <p className="text-xs text-slate-400">Checkpoint: {loc.landmark}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-5 space-y-3">
            <h2 className="text-base font-semibold text-white">Moderated Truth or Dare Prompts</h2>
            {todPrompts.map((tod) => (
              <div key={tod.id} className="p-3.5 rounded-xl bg-[#07080D] border border-white/10 space-y-1">
                <p className="text-xs text-violet-300 capitalize">
                  {tod.mode} · {formatSnakeLabel(tod.safetyTier)}
                </p>
                <p className="text-sm text-slate-200">{tod.prompt}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filterable Lobby */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="search"
              aria-label="Search challenges"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challenges by title or @username..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D101B] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(['all', 'sports', 'location', 'truth_or_dare', 'movie_predictions', 'other'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedCat === cat
                    ? 'bg-violet-600 text-white'
                    : 'bg-[#0D101B] border border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                {cat === 'all' ? 'All Active' : formatCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-10 text-center space-y-3">
            <p className="text-sm text-slate-300">No challenges match your current filter.</p>
            <button
              type="button"
              onClick={() => openCreatorFor('sports')}
              className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold"
            >
              Create the First Challenge
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((ch) => (
              <div
                key={ch.id}
                className="rounded-2xl bg-[#0D101B] border border-white/10 p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-400">
                    {formatCategoryLabel(ch.category)} · @{ch.creatorUsername} ·{' '}
                    <span className="text-sky-300">{ch.status}</span>
                    {ch.isDemoData && ' · Demo'}
                  </p>
                  <h3 className="text-base font-semibold text-white">{ch.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{ch.description}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/10 gap-2">
                  <div>
                    <p className="text-xs text-slate-400">Stake</p>
                    <p className="text-sm font-semibold text-white font-mono-tabular">
                      {formatSol(ch.stakeLamports, 2)} SOL
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Share challenge link for ${ch.title}`}
                      onClick={async () => {
                        const url = `${window.location.origin}/?challenge=${ch.id}`;
                        try {
                          await navigator.clipboard.writeText(url);
                          pushToast('success', 'Challenge link copied', 'Share it so someone can open & accept.');
                        } catch {
                          pushToast('info', 'Shareable link', url);
                        }
                      }}
                      className="p-2 rounded-xl bg-[#07080D] hover:bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedChallenge(ch)}
                      className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors"
                    >
                      {ch.status === 'Open' && ch.creatorId !== currentUser.uid ? 'Review & Accept' : 'View Details'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ChallengeModal
        isOpen={createOpen}
        defaultCategory={createDefaultCat}
        onClose={() => setCreateOpen(false)}
      />
      <ChallengeDetailModal challenge={selectedChallenge} onClose={() => setSelectedChallenge(null)} />
    </div>
  );
}
