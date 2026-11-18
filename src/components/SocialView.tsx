import { useState } from 'react';
import { MessageSquare, Search, ShieldBan, Swords, UserCheck, UserPlus } from 'lucide-react';
import { useVeriFi } from '../lib/store';
import type { UserProfile } from '../types/verifi';
import { ChallengeModal } from './ChallengeModal';

export function SocialView() {
  const {
    users,
    currentUser,
    startConversationWith,
    setActiveTab,
    toggleBlockUser,
    toggleFollowUser,
  } = useVeriFi();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'following'>('all');
  const [previewUser, setPreviewUser] = useState<UserProfile | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const visibleUsers = users.filter((u) => {
    if (u.uid === currentUser.uid || u.status !== 'active') return false;
    if (filterMode === 'following' && !currentUser.followingIds.includes(u.uid)) return false;
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      u.username.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      (u.nickname && u.nickname.toLowerCase().includes(q))
    );
  });

  const followingCount = currentUser.followingIds.filter((id) =>
    users.some((u) => u.uid === id && u.status === 'active')
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Social Discovery</h1>
          <p className="text-xs text-slate-400 mt-1">
            Find challengers by nickname, username, or name. Follow friends and message them directly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-violet-600 text-white'
                  : 'bg-[#0D101B] border border-white/15 text-slate-300 hover:text-white'
              }`}
            >
              All Users
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('following')}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                filterMode === 'following'
                  ? 'bg-violet-600 text-white'
                  : 'bg-[#0D101B] border border-white/15 text-slate-300 hover:text-white'
              }`}
            >
              Following ({followingCount})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="search"
              aria-label="Search Veri-Fi users"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search nickname or @username..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D101B] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>
      </div>

      {visibleUsers.length === 0 ? (
        <div className="rounded-2xl bg-[#0D101B] border border-white/10 p-10 text-center space-y-2">
          <p className="text-sm text-slate-300">
            {filterMode === 'following'
              ? 'You are not following anyone yet. Switch to All Users to follow challengers.'
              : 'No Veri-Fi users matched your search.'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleUsers.map((u) => {
            const isBlocked = currentUser.blockedUserIds.includes(u.uid);
            const isFollowing = currentUser.followingIds.includes(u.uid);
            const primaryLabel = u.nickname?.trim() || u.displayName;
            return (
              <div
                key={u.uid}
                className="rounded-2xl bg-[#0D101B] border border-white/10 p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={u.avatarUrl}
                        alt={primaryLabel}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-2xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-white truncate">{primaryLabel}</h2>
                        <p className="text-xs text-slate-400 truncate">
                          @{u.username} · {u.isOnline ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFollowUser(u.uid)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 shrink-0 transition-colors ${
                        isFollowing
                          ? 'bg-sky-500/15 border border-sky-400/40 text-sky-300'
                          : 'bg-[#07080D] hover:bg-white/5 border border-white/15 text-slate-200'
                      }`}
                    >
                      {isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{u.bio}</p>

                  <div className="text-xs text-slate-400 pt-2 border-t border-white/10 flex items-center justify-between">
                    <span>Completed: {u.completedChallenges}</span>
                    <span>{u.showStats ? `${u.wins}W / ${u.losses}L` : 'Win/Loss Hidden'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(true)}
                    className="flex-1 py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    Invite
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      startConversationWith(u.uid);
                      setActiveTab('messages');
                    }}
                    className="py-2 px-3 rounded-xl bg-[#121728] hover:bg-[#192038] border border-white/15 text-xs font-medium text-white inline-flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Message
                  </button>
                  <button
                    type="button"
                    aria-label={`Preview ${primaryLabel} profile`}
                    onClick={() => setPreviewUser(u)}
                    className="py-2 px-3 rounded-xl bg-[#07080D] hover:bg-white/5 border border-white/10 text-xs text-slate-300"
                  >
                    Profile
                  </button>
                </div>
                {isBlocked && (
                  <p className="text-[11px] text-amber-300">Blocked in your privacy settings</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md bg-[#0D101B] border border-white/15 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4 min-w-0">
                <img
                  src={previewUser.avatarUrl}
                  alt={previewUser.nickname || previewUser.displayName}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-2xl object-cover shrink-0"
                />
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white truncate">
                    {previewUser.nickname || previewUser.displayName}
                  </h2>
                  <p className="text-xs text-slate-400 truncate">
                    {previewUser.nickname ? `${previewUser.displayName} · ` : ''}@{previewUser.username} · Joined{' '}
                    {new Date(previewUser.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleFollowUser(previewUser.uid)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 ${
                  currentUser.followingIds.includes(previewUser.uid)
                    ? 'bg-sky-500/15 border border-sky-400/40 text-sky-300'
                    : 'bg-violet-600 text-white'
                }`}
              >
                {currentUser.followingIds.includes(previewUser.uid) ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    Follow
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-slate-300">{previewUser.bio}</p>
            <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-white/10">
              <div>
                <p className="text-slate-400">Completed Challenges</p>
                <p className="text-base font-semibold text-white font-mono-tabular">
                  {previewUser.completedChallenges}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Record</p>
                <p className="text-base font-semibold text-white font-mono-tabular">
                  {previewUser.showStats ? `${previewUser.wins}W - ${previewUser.losses}L` : 'Private'}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => toggleBlockUser(previewUser.uid)}
                className="text-xs text-rose-300 hover:text-rose-200 inline-flex items-center gap-1.5"
              >
                <ShieldBan className="w-3.5 h-3.5" />
                {currentUser.blockedUserIds.includes(previewUser.uid) ? 'Unblock User' : 'Block User'}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    startConversationWith(previewUser.uid);
                    setPreviewUser(null);
                    setActiveTab('messages');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#121728] border border-white/15 text-xs font-semibold text-white inline-flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewUser(null)}
                  className="px-4 py-2 rounded-xl bg-violet-600 text-xs font-semibold text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ChallengeModal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
    </div>
  );
}
