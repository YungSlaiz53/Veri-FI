import React, { useState } from 'react';
import { Bot, Check, Copy, ExternalLink, Link2, MapPin, ShieldAlert, X } from 'lucide-react';
import { useVeriFi } from '../lib/store';
import { getExplorerAddressUrl, shortenAddress } from '../lib/solana';
import type { Challenge } from '../types/verifi';
import {
  canAcceptChallenge,
  canCancelChallenge,
  formatCategoryLabel,
  formatSol,
} from '../utils/escrowLogic';

export function ChallengeDetailModal({
  challenge,
  onClose,
}: {
  challenge: Challenge | null;
  onClose: () => void;
}) {
  const {
    currentUser,
    wallet,
    acceptChallenge,
    cancelChallenge,
    submitEvidence,
    resolveChallenge,
    setVeriBotContextChallenge,
    setVeriBotOpen,
    pushToast,
  } = useVeriFi();

  const [evidenceText, setEvidenceText] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isDispute, setIsDispute] = useState(false);
  const [resolutionWinner, setResolutionWinner] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!challenge) return null;

  const isParticipant =
    challenge.creatorId === currentUser.uid || challenge.opponentId === currentUser.uid;
  const acceptCheck = canAcceptChallenge(challenge, currentUser.uid, wallet.availableLamports);
  const cancelCheck = canCancelChallenge(challenge, currentUser.uid);
  const poolSol = formatSol(
    challenge.opponentId ? challenge.stakeLamports * 2 : challenge.stakeLamports,
    2
  );
  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/?challenge=${challenge.id}` : '';

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      pushToast('success', 'Challenge link copied', 'Anyone with this link can open Veri-Fi and accept this challenge.');
    } catch {
      pushToast('info', 'Shareable link', shareUrl);
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      pushToast('error', 'Geolocation unsupported in this browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
        });
        pushToast('success', 'Coordinates attached privately to evidence submission');
      },
      () => {
        pushToast('error', 'Location permission denied or unavailable');
      }
    );
  };

  const handleEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await submitEvidence(challenge.id, {
      summary: evidenceText,
      locationLat: coords?.lat,
      locationLng: coords?.lng,
      isDispute,
    });
    if (ok) {
      setEvidenceText('');
      setCoords(null);
      setIsDispute(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="challenge-detail-title"
        className="w-full max-w-2xl bg-[#0D101B] border border-white/15 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-white/10">
          <div className="space-y-1">
            <p className="text-xs text-slate-400">
              {formatCategoryLabel(challenge.category)} · {challenge.challengeType} ·{' '}
              <span className="text-sky-300 font-medium">{challenge.status}</span>
              {challenge.isDemoData && ' · Demo Preview'}
            </p>
            <h2 id="challenge-detail-title" className="text-lg font-semibold text-white">
              {challenge.title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close challenge detail"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-white/10">
            <div>
              <p className="text-xs text-slate-400">Stake per Player</p>
              <p className="text-base font-semibold text-white font-mono-tabular mt-0.5">
                {formatSol(challenge.stakeLamports, 2)} SOL
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Locked Pool</p>
              <p className="text-base font-semibold text-violet-300 font-mono-tabular mt-0.5">
                {poolSol} SOL
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Creator</p>
              <p className="text-sm font-medium text-white mt-0.5">@{challenge.creatorUsername}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Opponent</p>
              <p className="text-sm font-medium text-white mt-0.5">
                {challenge.opponentUsername ? `@${challenge.opponentUsername}` : 'Awaiting match'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</h3>
              <p className="text-sm text-slate-200 mt-1 leading-relaxed">{challenge.description}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Immutable Settlement Rules
              </h3>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">{challenge.rules}</p>
            </div>
            {challenge.escrowPda && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-400">
                <span>
                  Solana Escrow PDA:{' '}
                  <span className="font-mono-tabular text-slate-200">
                    {shortenAddress(challenge.vaultPda || challenge.escrowPda, 6)}
                  </span>
                </span>
                <a
                  href={getExplorerAddressUrl(challenge.vaultPda || challenge.escrowPda)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300"
                >
                  Inspect on Solana Explorer
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* Shareable Link Row */}
          <div className="rounded-xl bg-[#07080D] border border-white/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Link2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-xs text-slate-300 font-mono-tabular truncate">{shareUrl}</span>
            </div>
            <button
              type="button"
              onClick={copyShareLink}
              className="px-3 py-1.5 rounded-lg bg-[#121728] hover:bg-[#192038] border border-white/15 text-xs font-semibold text-white inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Link Copied' : 'Share Challenge Link'}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {acceptCheck.ok && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await acceptChallenge(challenge.id);
                  if (ok) onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
              >
                Accept & Match {formatSol(challenge.stakeLamports, 2)} SOL
              </button>
            )}
            {cancelCheck.ok && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await cancelChallenge(challenge.id);
                  if (ok) onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-200 text-sm font-semibold transition-colors"
              >
                Cancel Open Challenge & Refund
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setVeriBotContextChallenge(challenge);
                setVeriBotOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#121728] hover:bg-[#192038] border border-white/15 text-sky-300 text-sm font-medium inline-flex items-center gap-2 transition-colors"
            >
              <Bot className="w-4 h-4" />
              Ask VeriBot About Rules / Evidence
            </button>
          </div>

          {/* Evidence & Dispute Section */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <h3 className="text-sm font-semibold text-white">
              Evidence & Dispute Log ({challenge.evidence.length})
            </h3>
            {challenge.evidence.length === 0 ? (
              <p className="text-xs text-slate-400">No evidence or disputes submitted yet.</p>
            ) : (
              <div className="space-y-2">
                {challenge.evidence.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-[#07080D] border border-white/10 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-medium text-slate-200">
                        @{ev.submitterUsername} {ev.isDispute ? '· Dispute Raised' : '· Evidence'}
                      </span>
                      <span>{new Date(ev.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-300">{ev.summary}</p>
                    {ev.locationLat !== undefined && (
                      <p className="text-sky-300 font-mono-tabular">
                        Verified GPS Check-in: {ev.locationLat}, {ev.locationLng}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isParticipant &&
              ['Active', 'Awaiting Evidence', 'Under Review'].includes(challenge.status) && (
                <form onSubmit={handleEvidenceSubmit} className="space-y-3 pt-2">
                  <textarea
                    rows={2}
                    required
                    value={evidenceText}
                    onChange={(e) => setEvidenceText(e.target.value)}
                    placeholder="Describe your proof, timestamp, or dispute details..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={captureLocation}
                        className="px-3 py-1.5 rounded-lg bg-[#121728] border border-white/15 text-xs text-slate-200 hover:text-white inline-flex items-center gap-1.5"
                      >
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                        {coords ? `${coords.lat}, ${coords.lng}` : 'Attach Location Proof'}
                      </button>
                      <label className="flex items-center gap-2 text-xs text-amber-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isDispute}
                          onChange={(e) => setIsDispute(e.target.checked)}
                          className="rounded border-white/20 bg-[#07080D]"
                        />
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Raise Dispute (Freeze Payout)
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors"
                    >
                      {isDispute ? 'Submit Dispute' : 'Submit Evidence'}
                    </button>
                  </div>
                </form>
              )}
          </div>

          {/* Authorized Admin Resolution (never VeriBot!) */}
          {currentUser.isAdmin &&
            challenge.opponentId &&
            ['Active', 'Under Review', 'Disputed'].includes(challenge.status) && (
              <div className="pt-4 border-t border-white/10 space-y-2">
                <p className="text-xs font-semibold text-violet-300">
                  Authorized Escrow Resolution (Admin Mechanism)
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Select verified winner"
                    value={resolutionWinner}
                    onChange={(e) => setResolutionWinner(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#07080D] border border-white/15 text-xs text-white"
                  >
                    <option value="">Select verified winner...</option>
                    <option value={challenge.creatorId}>@{challenge.creatorUsername} (Creator)</option>
                    <option value={challenge.opponentId}>@{challenge.opponentUsername} (Opponent)</option>
                  </select>
                  <button
                    type="button"
                    disabled={!resolutionWinner}
                    onClick={async () => {
                      const ok = await resolveChallenge(
                        challenge.id,
                        resolutionWinner,
                        'Authorized outcome verification settled via Anchor escrow'
                      );
                      if (ok) onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                  >
                    Settle Escrow Pool ({poolSol} SOL)
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
