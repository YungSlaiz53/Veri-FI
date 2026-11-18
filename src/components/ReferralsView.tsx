import { Copy, Gift, Share2, ShieldCheck } from 'lucide-react';
import { useVeriFi } from '../lib/store';
import { REDEMPTION_CATALOG } from '../lib/seedData';
import { formatSnakeLabel } from '../utils/escrowLogic';

export function ReferralsView() {
  const { currentUser, referrals, redemptions, redeemReward, pushToast } = useVeriFi();

  const referralUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?ref=${currentUser.referralCode}`
      : `https://verifi.app/?ref=${currentUser.referralCode}`;

  const copyLink = () => {
    navigator.clipboard?.writeText(referralUrl);
    pushToast('success', 'Referral link copied', referralUrl);
  };

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Join Veri-Fi — Bet. Chat. Win.',
        text: `Use my referral code ${currentUser.referralCode} on Veri-Fi.`,
        url: referralUrl,
      }).catch(() => {});
    } else {
      copyLink();
    }
  };

  const pendingPoints = referrals
    .filter((r) => r.status === 'pending')
    .reduce((acc, r) => acc + r.pointsAwarded, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Referrals & Rewards</h1>
        <p className="text-xs text-slate-400 mt-1">
          Earn backend-verified referral points when friends register, verify their account, and complete their first eligible challenge.
        </p>
      </div>

      {/* Summary & Share Card */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl bg-[#0D101B] border border-white/10 p-6 space-y-5">
          <div className="space-y-1">
            <p className="text-xs text-slate-400">Your Unique Referral Code & Link</p>
            <p className="text-xl font-bold text-white font-mono-tabular">{currentUser.referralCode}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              readOnly
              aria-label="Referral share URL"
              value={referralUrl}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-xs text-slate-300 font-mono-tabular"
            />
            <button
              type="button"
              onClick={copyLink}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Link
            </button>
            <button
              type="button"
              onClick={shareLink}
              className="px-4 py-2.5 rounded-xl bg-[#121728] border border-white/15 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>

          <div className="pt-3 border-t border-white/10 text-xs text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <span>
              Anti-abuse protections: self-referrals, duplicate accounts, and repeat milestone claims are strictly rejected on the server.
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl bg-[#0D101B] border border-white/10 p-6 grid grid-cols-2 gap-4 content-center">
          <div>
            <p className="text-xs text-slate-400">Available Points</p>
            <p className="text-3xl font-bold text-sky-300 font-mono-tabular mt-1">
              {currentUser.referralPoints}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Pending Rewards</p>
            <p className="text-3xl font-bold text-amber-300 font-mono-tabular mt-1">
              {pendingPoints}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Referred Friends</p>
            <p className="text-lg font-semibold text-white font-mono-tabular mt-1">
              {referrals.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Milestones</p>
            <p className="text-xs text-slate-300 mt-1">50 Reg · 100 Verif · 250 First Bet</p>
          </div>
        </div>
      </div>

      {/* Redemption Catalogue */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Redemption Catalogue</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {REDEMPTION_CATALOG.map((item) => {
            const canAfford = currentUser.referralPoints >= item.pointsCost;
            return (
              <div
                key={item.id}
                className="rounded-2xl bg-[#0D101B] border border-white/10 p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Gift className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-semibold text-sky-300 font-mono-tabular">
                      {item.pointsCost} pts
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                </div>

                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => redeemReward(item.title, item.pointsCost)}
                  className="w-full py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-white/5 disabled:text-slate-500 text-xs font-semibold text-white transition-colors"
                >
                  {canAfford ? 'Request Redemption' : `Need ${item.pointsCost - currentUser.referralPoints} more pts`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* History Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-5 space-y-3">
          <h2 className="text-base font-semibold text-white">Referred Users History</h2>
          <div className="divide-y divide-white/10 text-xs">
            {referrals.map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">@{r.referredUsername}</p>
                  <p className="text-slate-400 capitalize">{formatSnakeLabel(r.milestone)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono-tabular text-emerald-300 font-semibold">+{r.pointsAwarded} pts</p>
                  <p className="text-slate-400 capitalize">{r.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-5 space-y-3">
          <h2 className="text-base font-semibold text-white">Redemption History</h2>
          <div className="divide-y divide-white/10 text-xs">
            {redemptions.map((rec) => (
              <div key={rec.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{rec.rewardTitle}</p>
                  <p className="text-slate-400">{new Date(rec.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono-tabular text-slate-200">-{rec.pointsCost} pts</p>
                  <p className="text-sky-300 capitalize">{rec.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
