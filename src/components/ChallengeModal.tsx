import React, { useState } from 'react';
import { Check, Copy, Link2, Lock, X } from 'lucide-react';
import { useVeriFi } from '../lib/store';
import type { ActiveCategoryId, Challenge, VerificationMethod } from '../types/verifi';
import { formatSol } from '../utils/escrowLogic';

interface ChallengeModalProps {
  isOpen: boolean;
  defaultCategory?: ActiveCategoryId;
  onClose: () => void;
}

export function ChallengeModal({
  isOpen,
  defaultCategory = 'sports',
  onClose,
}: ChallengeModalProps) {
  const { categories, wallet, createChallenge, pushToast } = useVeriFi();
  const [category, setCategory] = useState<ActiveCategoryId>(defaultCategory);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [challengeType, setChallengeType] = useState('Match Outcome');
  const [stakeSol, setStakeSol] = useState('0.5');
  const [rules, setRules] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('sports_feed');
  const [expiresHours, setExpiresHours] = useState('48');
  const [submitting, setSubmitting] = useState(false);
  const [createdChallenge, setCreatedChallenge] = useState<Challenge | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const applyCategoryDefaults = (cat: ActiveCategoryId) => {
    setCategory(cat);
    if (cat === 'sports') {
      setChallengeType('Match Outcome');
      setVerificationMethod('sports_feed');
    } else if (cat === 'location') {
      setChallengeType('First to Landmark');
      setVerificationMethod('geolocation_evidence');
    } else if (cat === 'truth_or_dare') {
      setChallengeType('Dare');
      setVerificationMethod('participant_evidence');
    } else if (cat === 'movie_predictions') {
      setChallengeType('Character Fate (Entertainment)');
      setVerificationMethod('admin_official_outcome');
    } else if (cat === 'other') {
      setChallengeType('Custom Challenge');
      setVerificationMethod('participant_evidence');
    }
  };

  React.useEffect(() => {
    applyCategoryDefaults(defaultCategory);
    setCreatedChallenge(null);
    setCopiedLink(false);
  }, [defaultCategory, isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setCreatedChallenge(null);
    setCopiedLink(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const expiresAt = new Date(Date.now() + Number(expiresHours || 48) * 3600_000).toISOString();
    const created = await createChallenge({
      category,
      title,
      description,
      challengeType,
      rules,
      stakeSol: Number(stakeSol),
      verificationMethod,
      expiresAt,
    });
    setSubmitting(false);
    if (created) {
      setTitle('');
      setDescription('');
      setRules('');
      setCreatedChallenge(created);
    }
  };

  const shareUrl =
    createdChallenge && typeof window !== 'undefined'
      ? `${window.location.origin}/?challenge=${createdChallenge.id}`
      : '';

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      pushToast('success', 'Challenge link copied', 'Send this link so a friend can open & accept your challenge.');
    } catch {
      pushToast('info', 'Copy link below', shareUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-challenge-title"
        className="w-full max-w-xl bg-[#0D101B] border border-white/15 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 id="create-challenge-title" className="text-lg font-semibold text-white">
            {createdChallenge ? 'Challenge Published & Ready to Share' : 'Create Peer-to-Peer Challenge'}
          </h2>
          <button
            type="button"
            aria-label="Close create challenge modal"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdChallenge ? (
          <div className="p-6 space-y-5">
            <div className="rounded-xl bg-[#07080D] border border-emerald-500/30 p-4 space-y-1.5">
              <p className="text-xs font-semibold text-emerald-300">Escrow Locked</p>
              <p className="text-base font-semibold text-white">{createdChallenge.title}</p>
              <p className="text-xs text-slate-400 font-mono-tabular">
                Stake: {formatSol(createdChallenge.stakeLamports, 2)} SOL · ID: {createdChallenge.id}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="created-share-url" className="block text-xs font-medium text-slate-300">
                Shareable Challenge Link (recipient can open & accept directly)
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#07080D] border border-white/15">
                  <Link2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <input
                    id="created-share-url"
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="w-full bg-transparent text-xs text-slate-200 font-mono-tabular focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={copyShareUrl}
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Copied' : 'Copy Link'}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl bg-[#121728] hover:bg-[#192038] border border-white/15 text-xs font-semibold text-white"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
            <div>
              <p className="text-xs font-medium text-slate-300 mb-2">Category</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((cat) =>
                  cat.comingSoon ? (
                    <button
                      key={cat.id}
                      type="button"
                      disabled
                      aria-disabled="true"
                      className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-500 flex items-center justify-between cursor-not-allowed"
                    >
                      <span className="truncate">{cat.name}</span>
                      <Lock className="w-3 h-3 shrink-0" />
                    </button>
                  ) : (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => applyCategoryDefaults(cat.id as ActiveCategoryId)}
                      className={`px-3 py-2 rounded-xl border text-xs font-medium transition-colors text-left truncate ${
                        category === cat.id
                          ? 'bg-violet-600/20 border-violet-500 text-white'
                          : 'bg-[#07080D] border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      {cat.id === 'other' ? 'Other (Custom)' : cat.name}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <label htmlFor="chl-title" className="block text-xs font-medium text-slate-300 mb-1">
                Challenge Title
              </label>
              <input
                id="chl-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  category === 'other'
                    ? 'e.g., Best of 3 Chess Blitz or Friday 5K Pace Bet'
                    : 'e.g., Arsenal vs Inter: Over 2.5 Goals'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="chl-type" className="block text-xs font-medium text-slate-300 mb-1">
                  {category === 'other' ? 'Custom Category / Type' : 'Challenge Type'}
                </label>
                <input
                  id="chl-type"
                  type="text"
                  required
                  value={challengeType}
                  onChange={(e) => setChallengeType(e.target.value)}
                  placeholder={category === 'other' ? 'e.g., Board Game / Fitness / Coding' : undefined}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label htmlFor="chl-stake" className="block text-xs font-medium text-slate-300 mb-1">
                  Stake Amount (SOL) · Avail: <span className="font-mono-tabular">{formatSol(wallet.availableLamports, 2)}</span>
                </label>
                <input
                  id="chl-stake"
                  type="number"
                  step="0.01"
                  min="0.05"
                  max="100"
                  required
                  value={stakeSol}
                  onChange={(e) => setStakeSol(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white font-mono-tabular focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="chl-desc" className="block text-xs font-medium text-slate-300 mb-1">
                Description
              </label>
              <textarea
                id="chl-desc"
                rows={2}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what each side is predicting or competing to finish..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label htmlFor="chl-rules" className="block text-xs font-medium text-slate-300 mb-1">
                Settlement Rules (locked once accepted)
              </label>
              <textarea
                id="chl-rules"
                rows={2}
                required
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Specify exact criteria, deadline, and what counts as valid proof..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="chl-verif" className="block text-xs font-medium text-slate-300 mb-1">
                  Outcome Verification Method
                </label>
                <select
                  id="chl-verif"
                  value={verificationMethod}
                  onChange={(e) => setVerificationMethod(e.target.value as VerificationMethod)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="sports_feed">Sports Results Feed</option>
                  <option value="geolocation_evidence">Location Geolocation & Photo</option>
                  <option value="participant_evidence">Participant Evidence & Review</option>
                  <option value="admin_official_outcome">Admin Official Outcome</option>
                </select>
              </div>
              <div>
                <label htmlFor="chl-exp" className="block text-xs font-medium text-slate-300 mb-1">
                  Expiration Window
                </label>
                <select
                  id="chl-exp"
                  value={expiresHours}
                  onChange={(e) => setExpiresHours(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="24">24 Hours</option>
                  <option value="48">48 Hours</option>
                  <option value="168">7 Days</option>
                  <option value="336">14 Days</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {submitting ? 'Locking Escrow...' : 'Publish & Lock Stake'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
