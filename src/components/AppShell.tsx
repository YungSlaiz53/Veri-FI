import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Compass,
  Gift,
  Grid,
  Home,
  Info,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  ShieldCheck,
  Swords,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useVeriFi } from '../lib/store';
import type { Challenge, NavTab } from '../types/verifi';
import { formatSol } from '../utils/escrowLogic';
import { DashboardHome } from './DashboardHome';
import { ExploreAndCategories } from './ExploreAndCategories';
import { MyBetsView } from './MyBetsView';
import { SocialView } from './SocialView';
import { MessagesView } from './MessagesView';
import { WalletView } from './WalletView';
import { ReferralsView } from './ReferralsView';
import { ProfileSettingsView } from './ProfileSettingsView';
import { AboutView } from './AboutView';
import { AdminDashboard } from './AdminDashboard';
import { VeriBotDrawer } from './VeriBotDrawer';
import { ChallengeDetailModal } from './ChallengeDetailModal';
import { LegalModal, type LegalDocType } from './LegalModal';
import { AdminLoginModal } from './AdminLoginModal';

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'categories', label: 'Categories', icon: Grid },
  { id: 'my_bets', label: 'My Bets', icon: Swords },
  { id: 'social', label: 'Social', icon: Users },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'wallet', label: 'App Wallet', icon: Wallet },
  { id: 'referrals', label: 'Referrals', icon: Gift },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'about', label: 'About', icon: Info },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function AppShell() {
  const {
    authMode,
    currentUser,
    wallet,
    activeTab,
    setActiveTab,
    sharedChallengeId,
    setSharedChallengeId,
    loadChallengeById,
    setVeriBotOpen,
    pushToast,
    logout,
  } = useVeriFi();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sharedChallenge, setSharedChallenge] = useState<Challenge | null>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDocType>(null);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);

  const supportClickCountRef = useRef(0);
  const supportSingleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supportResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    if (!sharedChallengeId) {
      setSharedChallenge(null);
      return;
    }
    loadChallengeById(sharedChallengeId).then((ch) => {
      if (!active) return;
      if (ch) {
        setSharedChallenge(ch);
      } else {
        pushToast('info', 'Shared challenge unavailable', `Could not find challenge ${sharedChallengeId}.`);
        setSharedChallengeId(null);
      }
    });
    return () => {
      active = false;
    };
  }, [sharedChallengeId]);

  const handleSupportClick = () => {
    supportClickCountRef.current += 1;

    if (supportSingleTimerRef.current) {
      clearTimeout(supportSingleTimerRef.current);
      supportSingleTimerRef.current = null;
    }
    if (supportResetTimerRef.current) {
      clearTimeout(supportResetTimerRef.current);
      supportResetTimerRef.current = null;
    }

    if (supportClickCountRef.current >= 3) {
      supportClickCountRef.current = 0;
      setLegalDoc(null);
      setAdminLoginOpen(true);
      return;
    }

    if (supportClickCountRef.current === 1) {
      supportSingleTimerRef.current = setTimeout(() => {
        supportSingleTimerRef.current = null;
        if (supportClickCountRef.current === 1) {
          setLegalDoc('support');
          supportClickCountRef.current = 0;
        }
      }, 420);
    }

    supportResetTimerRef.current = setTimeout(() => {
      supportClickCountRef.current = 0;
      supportResetTimerRef.current = null;
    }, 1500);
  };

  const selectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#07080D] text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#0D101B] border-r border-white/10">
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-white/10">
          <img
            src="/src/assets/images/verifi_logo_mark_1795017981359.jpg"
            alt="Veri-Fi"
            className="w-8 h-8 rounded-lg object-cover"
          />
          <span className="text-lg font-bold text-white font-display">Veri-Fi</span>
        </div>

        <nav aria-label="Workspace navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-violet-600/20 text-white border border-violet-500/35'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {currentUser.isAdmin && (
            <button
              type="button"
              onClick={() => selectTab('admin')}
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors whitespace-nowrap mt-3 ${
                activeTab === 'admin'
                  ? 'bg-sky-600/20 text-white border border-sky-500/40'
                  : 'text-sky-300 hover:bg-sky-500/10 border border-transparent'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Admin Console</span>
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <button
            type="button"
            onClick={() => setVeriBotOpen(true)}
            className="w-full py-2.5 px-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-colors"
          >
            <Bot className="w-4 h-4" />
            Ask VeriBot AI
          </button>
          <button
            type="button"
            onClick={logout}
            className="w-full py-2 px-3 rounded-xl text-xs font-medium text-slate-400 hover:text-white flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/80 backdrop-blur-sm flex">
          <div className="w-72 bg-[#0D101B] border-r border-white/15 h-full flex flex-col">
            <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
              <span className="text-lg font-bold text-white font-display">Veri-Fi</span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectTab(item.id)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
                      activeTab === item.id
                        ? 'bg-violet-600/20 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              {currentUser.isAdmin && (
                <button
                  type="button"
                  onClick={() => selectTab('admin')}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 text-sky-300"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Console</span>
                </button>
              )}
            </nav>
            <div className="p-4 border-t border-white/10">
              <button
                type="button"
                onClick={logout}
                className="w-full py-2.5 rounded-xl bg-white/5 text-xs font-medium text-slate-300"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-[#07080D]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-[#0D101B] border border-white/10 text-slate-200"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs text-slate-400 truncate">
              {authMode === 'demo' ? 'Workspace Preview · Solana Devnet' : 'Solana Devnet · Live Session'}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => selectTab('wallet')}
              className="px-3 py-1.5 rounded-xl bg-[#0D101B] border border-white/10 text-xs font-mono-tabular text-white hover:border-violet-500/40 whitespace-nowrap"
            >
              {formatSol(wallet.availableLamports, 2)} SOL
            </button>
            <button
              type="button"
              onClick={() => setVeriBotOpen(true)}
              className="lg:hidden px-3 py-1.5 rounded-xl bg-violet-600 text-xs font-semibold text-white inline-flex items-center gap-1.5"
            >
              <Bot className="w-3.5 h-3.5" />
              VeriBot
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'home' && <DashboardHome />}
          {activeTab === 'explore' && <ExploreAndCategories initialView="explore" />}
          {activeTab === 'categories' && <ExploreAndCategories initialView="categories" />}
          {activeTab === 'my_bets' && <MyBetsView />}
          {activeTab === 'social' && <SocialView />}
          {activeTab === 'messages' && <MessagesView />}
          {activeTab === 'wallet' && <WalletView />}
          {activeTab === 'referrals' && <ReferralsView />}
          {activeTab === 'profile' && <ProfileSettingsView mode="profile" />}
          {activeTab === 'settings' && <ProfileSettingsView mode="settings" />}
          {activeTab === 'about' && <AboutView />}
          {activeTab === 'admin' && <AdminDashboard />}
        </main>

        <footer className="border-t border-white/10 px-4 sm:px-8 py-4 flex items-center justify-between text-xs text-slate-500">
          <span>Veri-Fi · Solana Devnet</span>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setLegalDoc('terms')} className="hover:text-slate-300 transition-colors">
              Terms
            </button>
            <button type="button" onClick={() => setLegalDoc('privacy')} className="hover:text-slate-300 transition-colors">
              Privacy
            </button>
            <button
              type="button"
              onClick={handleSupportClick}
              data-testid="footer-support-button"
              className="hover:text-slate-300 transition-colors select-none"
            >
              Support
            </button>
          </div>
        </footer>
      </div>

      <VeriBotDrawer />
      <ChallengeDetailModal
        challenge={sharedChallenge}
        onClose={() => {
          setSharedChallenge(null);
          setSharedChallengeId(null);
        }}
      />
      <LegalModal docType={legalDoc} onClose={() => setLegalDoc(null)} />
      <AdminLoginModal isOpen={adminLoginOpen} onClose={() => setAdminLoginOpen(false)} />
    </div>
  );
}
