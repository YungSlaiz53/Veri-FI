import React, { useEffect, useRef, useState } from 'react';
import { Flag, Image as ImageIcon, Mic, Send, ShieldBan, Swords, UserCheck, UserPlus } from 'lucide-react';
import { useVeriFi } from '../lib/store';

export function MessagesView() {
  const {
    conversations,
    messages,
    currentUser,
    users,
    challenges,
    sendChatMessage,
    markConversationRead,
    reportMessage,
    toggleBlockUser,
    toggleFollowUser,
    setActiveTab,
    pushToast,
  } = useVeriFi();

  const [selectedConvId, setSelectedConvId] = useState<string>(conversations[0]?.id || '');
  const [draft, setDraft] = useState('');
  const [typingSim, setTypingSim] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const activeConv = conversations.find((c) => c.id === selectedConvId) || conversations[0];
  const threadMessages = messages.filter((m) => m.conversationId === activeConv?.id);
  const getPeerLabel = (peerUid: string, fallbackDisplay: string) => {
    const u = users.find((x) => x.uid === peerUid);
    return u?.nickname?.trim() || fallbackDisplay;
  };

  useEffect(() => {
    if (activeConv) {
      markConversationRead(activeConv.id);
    }
  }, [activeConv?.id]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [threadMessages.length, activeConv?.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !draft.trim()) return;
    await sendChatMessage(activeConv.id, {
      kind: 'text',
      body: draft,
    });
    setDraft('');
    setTypingSim(false);
  };

  const handleSendChallengeCard = async () => {
    if (!activeConv) return;
    const sample = challenges[0];
    if (!sample) return;
    await sendChatMessage(activeConv.id, {
      kind: 'challenge_invite',
      body: `Challenge Invite: ${sample.title}`,
      challengeId: sample.id,
      challengeTitle: sample.title,
      challengeStakeSol: sample.stakeLamports / 1_000_000_000,
    });
  };

  const handleImageAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv) return;
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      pushToast('error', 'Invalid file', 'Only image files under 10 MB are permitted.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      await sendChatMessage(activeConv.id, {
        kind: 'image',
        body: `Shared image evidence: ${file.name}`,
        mediaUrl: typeof reader.result === 'string' ? reader.result : undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleVoiceNote = async () => {
    if (!activeConv) return;
    await sendChatMessage(activeConv.id, {
      kind: 'voice',
      body: 'Voice note attachment (0:14 audio memo)',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Private Messages</h1>
        <p className="text-xs text-slate-400 mt-1">
          Real-time 1-to-1 conversations, challenge cards, evidence sharing, and safety controls.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 rounded-2xl bg-[#0D101B] border border-white/10 overflow-hidden min-h-[540px]">
        {/* Conversation List */}
        <aside className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-white/10 divide-y divide-white/10">
          {conversations.map((conv) => {
            const peerLabel = getPeerLabel(conv.peerUid, conv.peerDisplayName);
            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => setSelectedConvId(conv.id)}
                className={`w-full p-4 text-left flex items-center gap-3 transition-colors ${
                  activeConv?.id === conv.id ? 'bg-violet-600/15' : 'hover:bg-white/[0.03]'
                }`}
              >
                <img
                  src={conv.peerAvatarUrl}
                  alt={peerLabel}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white truncate">{peerLabel}</p>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {conv.peerOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{conv.lastMessageText}</p>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Thread Viewport */}
        {activeConv ? (
          <div className="lg:col-span-8 flex flex-col justify-between">
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {getPeerLabel(activeConv.peerUid, activeConv.peerDisplayName)}{' '}
                  <span className="text-xs font-normal text-slate-400">@{activeConv.peerUsername}</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  {typingSim ? 'Typing...' : activeConv.peerOnline ? 'Active now' : 'Offline'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleFollowUser(activeConv.peerUid)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 ${
                    currentUser.followingIds.includes(activeConv.peerUid)
                      ? 'bg-sky-500/15 border border-sky-400/40 text-sky-300'
                      : 'bg-[#07080D] border border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  {currentUser.followingIds.includes(activeConv.peerUid) ? (
                    <UserCheck className="w-3.5 h-3.5" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  {currentUser.followingIds.includes(activeConv.peerUid) ? 'Following' : 'Follow'}
                </button>
                <button
                  type="button"
                  onClick={() => toggleBlockUser(activeConv.peerUid)}
                  className="px-3 py-1.5 rounded-lg bg-[#07080D] border border-white/10 text-xs text-slate-300 hover:text-rose-300 inline-flex items-center gap-1.5"
                >
                  <ShieldBan className="w-3.5 h-3.5" />
                  {currentUser.blockedUserIds.includes(activeConv.peerUid) ? 'Unblock' : 'Block'}
                </button>
              </div>
            </div>

            <div
              ref={messagesContainerRef}
              className="flex-1 p-5 space-y-3.5 overflow-y-auto max-h-[380px]"
            >
              {threadMessages.map((msg) => {
                const isMine = msg.senderId === currentUser.uid;
                const isRead = msg.readBy.includes(activeConv.peerUid);
                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm space-y-2 ${
                        isMine
                          ? 'bg-violet-600 text-white'
                          : 'bg-[#121728] border border-white/10 text-slate-100'
                      }`}
                    >
                      {msg.kind === 'challenge_invite' && (
                        <div className="p-2.5 rounded-xl bg-black/25 border border-white/15 space-y-1">
                          <p className="text-xs font-semibold text-sky-300">Challenge Invitation</p>
                          <p className="text-xs font-medium">{msg.challengeTitle}</p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] font-mono-tabular">
                              Stake: {msg.challengeStakeSol} SOL
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveTab('explore')}
                              className="text-[11px] underline text-sky-200"
                            >
                              Open Lobby
                            </button>
                          </div>
                        </div>
                      )}

                      {msg.kind === 'image' && msg.mediaUrl && (
                        <img
                          src={msg.mediaUrl}
                          alt="Chat attachment"
                          className="rounded-xl max-h-48 object-cover"
                        />
                      )}

                      <p className="leading-relaxed">{msg.body}</p>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMine && <span>· {isRead ? 'Read' : 'Sent'}</span>}
                      {!isMine && !msg.reported && (
                        <button
                          type="button"
                          onClick={() => reportMessage(msg.id)}
                          className="hover:text-rose-300 inline-flex items-center gap-1"
                        >
                          <Flag className="w-3 h-3" />
                          Report
                        </button>
                      )}
                      {msg.reported && <span className="text-amber-300">· Reported</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-white/10 flex flex-wrap items-center gap-2">
              <label className="p-2.5 rounded-xl bg-[#07080D] border border-white/10 text-slate-300 hover:text-white cursor-pointer">
                <ImageIcon className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageAttachment}
                />
              </label>
              <button
                type="button"
                aria-label="Send voice note"
                onClick={handleVoiceNote}
                className="p-2.5 rounded-xl bg-[#07080D] border border-white/10 text-slate-300 hover:text-white"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Share challenge invitation card"
                onClick={handleSendChallengeCard}
                className="p-2.5 rounded-xl bg-[#07080D] border border-white/10 text-sky-300 hover:text-sky-200"
              >
                <Swords className="w-4 h-4" />
              </button>
              <input
                type="text"
                aria-label="Message input"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setTypingSim(e.target.value.length > 0);
                }}
                placeholder="Write a private message..."
                className="flex-1 min-w-[180px] px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </form>
          </div>
        ) : (
          <div className="lg:col-span-8 flex items-center justify-center p-10 text-sm text-slate-400">
            Select a user from Social to start messaging.
          </div>
        )}
      </div>
    </div>
  );
}
