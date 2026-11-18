import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { useVeriFi } from '../lib/store';

export function ProfileSettingsView({ mode }: { mode: 'profile' | 'settings' }) {
  const {
    currentUser,
    users,
    updateUserProfile,
    resendVerificationEmail,
    toggleBlockUser,
    requestAccountDeletion,
    setActiveTab,
  } = useVeriFi();

  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [nickname, setNickname] = useState(currentUser.nickname || '');
  const [bio, setBio] = useState(currentUser.bio);
  const [showStats, setShowStats] = useState(currentUser.showStats);
  const [notificationsEnabled, setNotificationsEnabled] = useState(currentUser.notificationsEnabled);
  const [dailyLimit, setDailyLimit] = useState(String(currentUser.dailyStakeLimitSol));

  useEffect(() => {
    setDisplayName(currentUser.displayName);
    setNickname(currentUser.nickname || '');
    setBio(currentUser.bio);
    setShowStats(currentUser.showStats);
    setNotificationsEnabled(currentUser.notificationsEnabled);
    setDailyLimit(String(currentUser.dailyStakeLimitSol));
  }, [
    currentUser.displayName,
    currentUser.nickname,
    currentUser.bio,
    currentUser.showStats,
    currentUser.notificationsEnabled,
    currentUser.dailyStakeLimitSol,
  ]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserProfile({
      displayName: displayName.trim(),
      nickname: nickname.trim().slice(0, 32),
      bio: bio.trim(),
      showStats,
      notificationsEnabled,
      dailyStakeLimitSol: Number(dailyLimit) || 10,
    });
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {mode === 'profile' ? 'Public Profile' : 'Account & Responsible-Use Settings'}
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Set your nickname so friends can find, follow, and chat with you, and manage privacy & responsible betting limits.
        </p>
      </div>

      {/* Profile Header Card */}
      <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.displayName}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-2xl object-cover border border-white/15"
          />
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">
              {currentUser.nickname ? currentUser.nickname : currentUser.displayName}
              {currentUser.nickname && (
                <span className="text-xs font-normal text-slate-400 ml-2">({currentUser.displayName})</span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              @{currentUser.username} · Joined {new Date(currentUser.joinedAt).toLocaleDateString()} · Referral: {currentUser.referralCode}
            </p>
            <p className="text-xs text-sky-300">
              {currentUser.completedChallenges} completed · {currentUser.wins}W / {currentUser.losses}L · {currentUser.followingIds.length} following
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('wallet')}
          className="px-4 py-2 rounded-xl bg-[#121728] border border-white/15 text-xs font-medium text-white self-start sm:self-center"
        >
          {currentUser.connectedSolanaPubkey ? 'Wallet Connected' : 'Connect Private Wallet'}
        </button>
      </div>

      {/* Profile & Privacy Form */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-2xl bg-[#0D101B] border border-white/10 p-6 space-y-4"
      >
        <h2 className="text-base font-semibold text-white">Profile & Nickname</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="prof-nickname" className="block text-xs text-slate-400 mb-1">
              Nickname (shown to followers & chat)
            </label>
            <input
              id="prof-nickname"
              type="text"
              maxLength={32}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g., AlexSol"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label htmlFor="prof-name" className="block text-xs text-slate-400 mb-1">
              Full Name
            </label>
            <input
              id="prof-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label htmlFor="prof-limit" className="block text-xs text-slate-400 mb-1">
              Daily Stake Limit (SOL · Responsible Use)
            </label>
            <input
              id="prof-limit"
              type="number"
              min="0.1"
              step="0.1"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white font-mono-tabular focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="prof-bio" className="block text-xs text-slate-400 mb-1">
            Bio
          </label>
          <textarea
            id="prof-bio"
            rows={2}
            maxLength={280}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-1">
          <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showStats}
              onChange={(e) => setShowStats(e.target.checked)}
              className="rounded border-white/20 bg-[#07080D]"
            />
            Show public Win/Loss statistics on Social profile
          </label>
          <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              className="rounded border-white/20 bg-[#07080D]"
            />
            Enable real-time challenge & message alerts
          </label>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white"
        >
          Save Profile & Privacy
        </button>
      </form>

      {/* Account Security & Blocked Users */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">Gmail Account Security</h2>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">Authentication Provider</span>
            <span className="text-sky-300 font-medium">Google (Gmail)</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">Email Verification</span>
            {currentUser.emailVerified ? (
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified
              </span>
            ) : (
              <button
                type="button"
                onClick={resendVerificationEmail}
                className="text-sky-400 hover:text-sky-300"
              >
                Send Verification Email
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed pt-2 border-t border-white/10">
            Account sign-in and recovery are managed securely through your Google (Gmail) account.
          </p>
        </div>

        <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">Blocked Users & Account Deletion</h2>
          {currentUser.blockedUserIds.length === 0 ? (
            <p className="text-xs text-slate-400">No blocked users.</p>
          ) : (
            <div className="space-y-2">
              {currentUser.blockedUserIds.map((uid) => {
                const u = users.find((x) => x.uid === uid);
                return (
                  <div key={uid} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{u?.nickname || `@${u?.username || uid}`}</span>
                    <button
                      type="button"
                      onClick={() => toggleBlockUser(uid)}
                      className="text-sky-400 hover:text-sky-300"
                    >
                      Unblock
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-3 border-t border-white/10 space-y-2">
            <p className="text-xs text-slate-400 leading-relaxed">
              Requesting deletion removes social profile access while preserving financial, escrow, and audit records required for compliance.
            </p>
            <button
              type="button"
              onClick={requestAccountDeletion}
              disabled={currentUser.status === 'deletion_requested'}
              className="px-4 py-2 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-xs font-semibold text-rose-200 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              {currentUser.status === 'deletion_requested'
                ? 'Deletion Request Submitted'
                : 'Request Account Deletion'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
