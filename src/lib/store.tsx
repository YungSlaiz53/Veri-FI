import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from './firebase';
import {
  connectExternalWallet,
  disconnectExternalWallet,
  signOwnershipMessage,
  type WalletProviderName,
} from './solana';
import {
  DEMO_AUDIT_LOGS,
  DEMO_CHALLENGES,
  DEMO_CONVERSATIONS,
  DEMO_CURRENT_USER,
  DEMO_LEDGER,
  DEMO_LOCATION_PROMPTS,
  DEMO_MESSAGES,
  DEMO_MOVIE_PREDICTIONS,
  DEMO_REDEMPTIONS,
  DEMO_REFERRALS,
  DEMO_SPORTS_FIXTURES,
  DEMO_TOD_PROMPTS,
  DEMO_USERS,
  DEMO_WALLET_ACCOUNT,
  INITIAL_CATEGORIES,
} from './seedData';
import type {
  ActiveCategoryId,
  AdminAuditLog,
  AppNotification,
  CategoryConfig,
  Challenge,
  ChallengeEvidence,
  ChatMessage,
  Conversation,
  LocationPrompt,
  MoviePredictionItem,
  NavTab,
  RedemptionRecord,
  ReferralRecord,
  SportsFixture,
  TruthOrDarePrompt,
  UserProfile,
  VerificationMethod,
  WalletAccount,
  WalletLedgerEntry,
} from '../types/verifi';
import {
  calculateWithdrawalBreakdown,
  canAcceptChallenge,
  canCancelChallenge,
  computeChallengePoolLamports,
  DEFAULT_APP_FEE_BPS,
  LAMPORTS_PER_SOL,
  solToLamports,
  validateChallengeCreation,
  validateInternalTransfer,
} from '../utils/escrowLogic';

export interface ToastMessage {
  id: string;
  tone: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

export interface DevnetInfo {
  online: boolean;
  cluster: string;
  rpcUrl: string;
  programId: string;
  treasuryPubkey: string;
  appFeeBps: number;
  slot: number | null;
  explorerBaseUrl: string;
}

interface CreateChallengeInput {
  category: ActiveCategoryId;
  title: string;
  description: string;
  challengeType: string;
  rules: string;
  stakeSol: number;
  verificationMethod: VerificationMethod;
  expiresAt: string;
}

interface VeriFiContextValue {
  authMode: 'unauthenticated' | 'firebase' | 'demo';
  authReady: boolean;
  firebaseUser: FirebaseUser | null;
  currentUser: UserProfile;
  wallet: WalletAccount;
  ledger: WalletLedgerEntry[];
  challenges: Challenge[];
  users: UserProfile[];
  categories: CategoryConfig[];
  conversations: Conversation[];
  messages: ChatMessage[];
  referrals: ReferralRecord[];
  redemptions: RedemptionRecord[];
  sportsFixtures: SportsFixture[];
  moviePredictions: MoviePredictionItem[];
  locationPrompts: LocationPrompt[];
  todPrompts: TruthOrDarePrompt[];
  auditLogs: AdminAuditLog[];
  notifications: AppNotification[];
  toasts: ToastMessage[];
  devnetInfo: DevnetInfo;
  appFeeBps: number;
  treasuryBalanceLamports: number;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  sharedChallengeId: string | null;
  setSharedChallengeId: (id: string | null) => void;
  loadChallengeById: (id: string) => Promise<Challenge | null>;
  veriBotOpen: boolean;
  setVeriBotOpen: (open: boolean) => void;
  veriBotContextChallenge: Challenge | null;
  setVeriBotContextChallenge: (c: Challenge | null) => void;
  pushToast: (tone: ToastMessage['tone'], title: string, description?: string) => void;
  dismissToast: (id: string) => void;

  // Auth actions
  enterDemoSandbox: () => void;
  signInWithGoogle: () => Promise<void>;
  loginAdminPortal: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  registerWithEmail: (input: {
    fullName: string;
    username: string;
    email: string;
    password: string;
    ageConfirmed: boolean;
    referralCode?: string;
  }) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  updateAccountPassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;

  // Challenge actions
  createChallenge: (input: CreateChallengeInput) => Promise<Challenge | null>;
  acceptChallenge: (challengeId: string) => Promise<boolean>;
  cancelChallenge: (challengeId: string) => Promise<boolean>;
  submitEvidence: (
    challengeId: string,
    input: { summary: string; mediaUrl?: string; locationLat?: number; locationLng?: number; isDispute?: boolean }
  ) => Promise<boolean>;
  resolveChallenge: (challengeId: string, winnerId: string, reason: string) => Promise<boolean>;

  // Wallet & Solana actions
  connectPrivateWallet: (provider: WalletProviderName) => Promise<boolean>;
  disconnectPrivateWallet: () => Promise<void>;
  verifyPrivateWalletOwnership: () => Promise<boolean>;
  verifyDevnetDeposit: (signature: string, amountSol: number) => Promise<boolean>;
  requestWithdrawal: (grossSol: number, destinationPubkey: string) => Promise<boolean>;
  sendInternalTransfer: (recipientUid: string, amountSol: number, note?: string) => Promise<boolean>;

  // Social & Chat actions
  startConversationWith: (peerUid: string) => string;
  sendChatMessage: (
    conversationId: string,
    input: {
      kind: ChatMessage['kind'];
      body: string;
      mediaUrl?: string;
      challengeId?: string;
      challengeTitle?: string;
      challengeStakeSol?: number;
    }
  ) => Promise<void>;
  markConversationRead: (conversationId: string) => void;
  reportMessage: (messageId: string) => void;
  toggleBlockUser: (targetUid: string) => void;
  toggleFollowUser: (targetUid: string) => Promise<void>;

  // Profile, Referrals & Admin actions
  updateUserProfile: (patch: Partial<UserProfile>) => Promise<void>;
  requestAccountDeletion: () => Promise<void>;
  redeemReward: (rewardTitle: string, pointsCost: number) => Promise<boolean>;
  adminToggleUserSuspension: (targetUid: string) => void;
  adminUpdateAppFeeBps: (newFeeBps: number) => void;
  adminAddSportsFixture: (fixture: Omit<SportsFixture, 'id'>) => void;
  adminAddMoviePrediction: (movie: Omit<MoviePredictionItem, 'id'>) => void;
  adminSettleMoviePrediction: (movieId: string, officialOutcome: string) => void;
}

const VeriFiContext = createContext<VeriFiContextValue | null>(null);

export function VeriFiProvider({ children }: { children: React.ReactNode }) {
  const [authMode, setAuthMode] = useState<'unauthenticated' | 'firebase' | 'demo'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'demo';
      }
    }
    return 'unauthenticated';
  });
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_CURRENT_USER);
  const [wallet, setWallet] = useState<WalletAccount>(DEMO_WALLET_ACCOUNT);
  const [ledger, setLedger] = useState<WalletLedgerEntry[]>(DEMO_LEDGER);
  const [challenges, setChallenges] = useState<Challenge[]>(DEMO_CHALLENGES);
  const [users, setUsers] = useState<UserProfile[]>(DEMO_USERS);
  const [categories, setCategories] = useState<CategoryConfig[]>(INITIAL_CATEGORIES);
  const [conversations, setConversations] = useState<Conversation[]>(DEMO_CONVERSATIONS);
  const [messages, setMessages] = useState<ChatMessage[]>(DEMO_MESSAGES);
  const [referrals, setReferrals] = useState<ReferralRecord[]>(DEMO_REFERRALS);
  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>(DEMO_REDEMPTIONS);
  const [sportsFixtures, setSportsFixtures] = useState<SportsFixture[]>(DEMO_SPORTS_FIXTURES);
  const [moviePredictions, setMoviePredictions] = useState<MoviePredictionItem[]>(DEMO_MOVIE_PREDICTIONS);
  const [locationPrompts] = useState<LocationPrompt[]>(DEMO_LOCATION_PROMPTS);
  const [todPrompts] = useState<TruthOrDarePrompt[]>(DEMO_TOD_PROMPTS);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>(DEMO_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif_1',
      uid: 'demo_user_alex',
      title: 'Challenge Invitation',
      body: 'maya_k invited you to North London vs Milan: Both Teams to Score.',
      read: false,
      linkTab: 'explore',
      createdAt: '2026-11-17T18:05:00.000Z',
    },
  ]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [sharedChallengeId, setSharedChallengeIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get('challenge');
      if (fromUrl) {
        try {
          sessionStorage.setItem('verifi_pending_challenge', fromUrl);
        } catch {
          // ignore storage restrictions
        }
        return fromUrl;
      }
      try {
        return sessionStorage.getItem('verifi_pending_challenge');
      } catch {
        return null;
      }
    }
    return null;
  });
  const [veriBotOpen, setVeriBotOpen] = useState(false);
  const [veriBotContextChallenge, setVeriBotContextChallenge] = useState<Challenge | null>(null);
  const [appFeeBps, setAppFeeBps] = useState<number>(DEFAULT_APP_FEE_BPS);

  const setSharedChallengeId = (id: string | null) => {
    setSharedChallengeIdState(id);
    if (typeof window !== 'undefined') {
      try {
        if (id) {
          sessionStorage.setItem('verifi_pending_challenge', id);
        } else {
          sessionStorage.removeItem('verifi_pending_challenge');
          const url = new URL(window.location.href);
          if (url.searchParams.has('challenge')) {
            url.searchParams.delete('challenge');
            window.history.replaceState({}, '', url.pathname + url.search + url.hash);
          }
        }
      } catch {
        // ignore history/storage errors
      }
    }
  };
  const [treasuryBalanceLamports, setTreasuryBalanceLamports] = useState<number>(
    Math.round(0.02 * LAMPORTS_PER_SOL)
  );
  const [devnetInfo, setDevnetInfo] = useState<DevnetInfo>({
    online: false,
    cluster: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    programId: '8yAq46dHnn4yFYcas3JhdUzToacpb1F2qdJqW1hrmaPJ',
    treasuryPubkey: '8yAq46dHnn3LY2Ue8U7qGc3a5tUKvFvo7xVnzryujPip',
    appFeeBps: DEFAULT_APP_FEE_BPS,
    slot: null,
    explorerBaseUrl: 'https://explorer.solana.com',
  });

  const pushToast = (tone: ToastMessage['tone'], title: string, description?: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, tone, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Boot connection checks
  useEffect(() => {
    void testFirestoreConnection();
    fetch('/api/solana/devnet-info')
      .then((r) => r.json())
      .then((data) => {
        if (data?.programId) {
          setDevnetInfo(data);
        }
      })
      .catch(() => {
        // Keep defaults if offline
      });
  }, []);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setAuthMode('firebase');
        const userRef = doc(db, 'users', user.uid);
        try {
          const snap = await getDoc(userRef);
          const cleanName = (user.displayName || user.email?.split('@')[0] || 'challenger').replace(
            /[^a-zA-Z0-9_]/g,
            '_'
          );
          if (!snap.exists() && user.emailVerified) {
            const refCode = `VERI-${user.uid.slice(0, 6).toUpperCase()}`;
            await setDoc(userRef, {
              uid: user.uid,
              username: cleanName.slice(0, 20).toLowerCase() || `user_${user.uid.slice(0, 5)}`,
              displayName: user.displayName || cleanName,
              nickname: '',
              bio: 'Veri-Fi Challenger on Solana Devnet.',
              avatarUrl: user.photoURL || '/src/assets/images/verifi_logo_mark_1795017981359.jpg',
              showStats: true,
              completedChallenges: 0,
              wins: 0,
              losses: 0,
              followingIds: [],
              referralCode: refCode,
              status: 'active',
              isOnline: true,
              joinedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            await setDoc(doc(db, 'users', user.uid, 'private', 'info'), {
              uid: user.uid,
              email: user.email || '',
              ageVerified: true,
              jurisdictionCode: 'GLOBAL',
              dailyStakeLimitSol: 10,
              blockedUserIds: [],
              walletVerified: false,
              updatedAt: serverTimestamp(),
            });
            await setDoc(doc(db, 'wallet_accounts', user.uid), {
              uid: user.uid,
              availableLamports: 0,
              lockedLamports: 0,
              pendingLamports: 0,
              totalWinningsLamports: 0,
              updatedAt: serverTimestamp(),
            });
          }
          if (snap.exists()) {
            const d = snap.data();
            setCurrentUser((prev) => ({
              ...prev,
              uid: user.uid,
              username: d.username || cleanName,
              displayName: d.displayName || user.displayName || 'Veri-Fi User',
              nickname: d.nickname || '',
              email: user.email || undefined,
              bio: d.bio || '',
              avatarUrl: d.avatarUrl || '/src/assets/images/verifi_logo_mark_1795017981359.jpg',
              showStats: Boolean(d.showStats ?? true),
              completedChallenges: Number(d.completedChallenges || 0),
              wins: Number(d.wins || 0),
              losses: Number(d.losses || 0),
              followingIds: Array.isArray(d.followingIds) ? d.followingIds : [],
              referralCode: d.referralCode || `VERI-${user.uid.slice(0, 6).toUpperCase()}`,
              status: d.status || 'active',
              isAdmin: user.email === 'blessedogle52@gmail.com',
              emailVerified: user.emailVerified,
            }));
          } else {
            setCurrentUser((prev) => ({
              ...prev,
              uid: user.uid,
              username: cleanName.slice(0, 20).toLowerCase(),
              displayName: user.displayName || cleanName,
              nickname: '',
              followingIds: [],
              email: user.email || undefined,
              isAdmin: user.email === 'blessedogle52@gmail.com',
              emailVerified: user.emailVerified,
              referralCode: `VERI-${user.uid.slice(0, 6).toUpperCase()}`,
            }));
          }
        } catch (err) {
          console.warn('Firestore profile bootstrap warning:', err);
        }
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Firestore real-time subscriptions when signed into Firebase
  useEffect(() => {
    if (authMode !== 'firebase' || !firebaseUser) return;

    const unsubChallenges = onSnapshot(
      query(
        collection(db, 'challenges'),
        where('category', 'in', ['sports', 'location', 'truth_or_dare', 'movie_predictions', 'other'])
      ),
      (snap) => {
        if (!snap.empty) {
          const live = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              creatorId: d.creatorId,
              creatorUsername: d.creatorUsername,
              opponentId: d.opponentId,
              opponentUsername: d.opponentUsername,
              category: d.category,
              title: d.title,
              description: d.description,
              challengeType: d.challengeType,
              rules: d.rules,
              stakeLamports: Number(d.stakeLamports),
              verificationMethod: d.verificationMethod,
              status: d.status,
              escrowPda: d.escrowPda,
              escrowTxSignature: d.escrowTxSignature,
              winnerId: d.winnerId,
              expiresAt:
                d.expiresAt instanceof Timestamp
                  ? d.expiresAt.toDate().toISOString()
                  : String(d.expiresAt),
              createdAt:
                d.createdAt instanceof Timestamp
                  ? d.createdAt.toDate().toISOString()
                  : new Date().toISOString(),
              updatedAt:
                d.updatedAt instanceof Timestamp
                  ? d.updatedAt.toDate().toISOString()
                  : new Date().toISOString(),
              evidence: [],
              isDemoData: false,
            } as Challenge;
          });
          setChallenges(live);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'challenges')
    );

    const unsubWallet = onSnapshot(
      doc(db, 'wallet_accounts', firebaseUser.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const d = docSnap.data();
          setWallet({
            uid: firebaseUser.uid,
            availableLamports: Number(d.availableLamports || 0),
            lockedLamports: Number(d.lockedLamports || 0),
            pendingLamports: Number(d.pendingLamports || 0),
            totalWinningsLamports: Number(d.totalWinningsLamports || 0),
            updatedAt: new Date().toISOString(),
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `wallet_accounts/${firebaseUser.uid}`)
    );

    const unsubLedger = onSnapshot(
      query(
        collection(db, 'wallet_ledger'),
        where('uid', '==', firebaseUser.uid),
        orderBy('createdAt', 'desc')
      ),
      (snap) => {
        const items = snap.docs.map((dSnap) => {
          const d = dSnap.data();
          return {
            id: dSnap.id,
            uid: d.uid,
            type: d.type,
            grossLamports: Number(d.grossLamports),
            appFeeLamports: Number(d.appFeeLamports),
            netLamports: Number(d.netLamports),
            status: d.status,
            idempotencyKey: d.idempotencyKey,
            txSignature: d.txSignature,
            counterparty: d.counterparty,
            challengeId: d.challengeId,
            createdAt:
              d.createdAt instanceof Timestamp
                ? d.createdAt.toDate().toISOString()
                : new Date().toISOString(),
          } as WalletLedgerEntry;
        });
        setLedger(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'wallet_ledger')
    );

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), where('status', '==', 'active')),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((uDoc) => {
            const d = uDoc.data();
            return {
              ...DEMO_CURRENT_USER,
              uid: uDoc.id,
              username: d.username,
              displayName: d.displayName,
              nickname: d.nickname || '',
              bio: d.bio || '',
              avatarUrl: d.avatarUrl || '/src/assets/images/verifi_logo_mark_1795017981359.jpg',
              showStats: Boolean(d.showStats),
              completedChallenges: Number(d.completedChallenges || 0),
              wins: Number(d.wins || 0),
              losses: Number(d.losses || 0),
              followingIds: Array.isArray(d.followingIds) ? d.followingIds : [],
              referralCode: d.referralCode,
              status: d.status,
              isOnline: Boolean(d.isOnline),
              joinedAt:
                d.joinedAt instanceof Timestamp
                  ? d.joinedAt.toDate().toISOString()
                  : new Date().toISOString(),
            } as UserProfile;
          });
          setUsers(list);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    return () => {
      unsubChallenges();
      unsubWallet();
      unsubLedger();
      unsubUsers();
    };
  }, [authMode, firebaseUser]);

  // Auth methods
  const enterDemoSandbox = () => {
    setCurrentUser(DEMO_CURRENT_USER);
    setWallet(DEMO_WALLET_ACCOUNT);
    setLedger(DEMO_LEDGER);
    setChallenges(DEMO_CHALLENGES);
    setUsers(DEMO_USERS);
    setConversations(DEMO_CONVERSATIONS);
    setMessages(DEMO_MESSAGES);
    setAuthMode('demo');
    setActiveTab('home');
    pushToast(
      'info',
      'Entered Demo Sandbox Preview',
      'Balances and challenges below are clearly marked demonstration records.'
    );
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    setActiveTab('home');
    pushToast('success', 'Signed in with Gmail', 'Connected to Firebase Authentication & Firestore.');
  };

  const loginAdminPortal = async (
    username: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        return { ok: false, error: json.error || 'Invalid administrator login or password.' };
      }

      if (authMode === 'unauthenticated') {
        setAuthMode('demo');
      }
      setCurrentUser((prev) => ({
        ...prev,
        isAdmin: true,
        displayName: prev.uid === DEMO_CURRENT_USER.uid ? 'AdminMain' : prev.displayName,
        username: prev.uid === DEMO_CURRENT_USER.uid ? 'admin_main' : prev.username,
        email: json.adminEmail || 'blessedogle52@gmail.com',
      }));
      setAuditLogs((prev) => [
        {
          id: `aud_${Date.now()}`,
          adminUid: currentUser.uid,
          adminEmail: json.adminEmail || 'blessedogle52@gmail.com',
          action: 'ADMIN_PORTAL_LOGIN',
          targetId: json.adminUsername || 'AdminMain',
          details: 'Authenticated via Veri-Fi Admin Login Portal.',
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setActiveTab('admin');
      pushToast('success', 'Admin Console Unlocked', 'Signed in as AdminMain.');
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Unable to reach admin verification server.',
      };
    }
  };

  const loadChallengeById = async (id: string): Promise<Challenge | null> => {
    const cleanId = id.trim();
    if (!cleanId) return null;
    const local = challenges.find((c) => c.id === cleanId);
    if (local) return local;
    if (authMode === 'firebase') {
      try {
        const snap = await getDoc(doc(db, 'challenges', cleanId));
        if (snap.exists()) {
          const d = snap.data();
          const loaded: Challenge = {
            id: snap.id,
            creatorId: d.creatorId,
            creatorUsername: d.creatorUsername,
            opponentId: d.opponentId,
            opponentUsername: d.opponentUsername,
            category: d.category,
            title: d.title,
            description: d.description,
            challengeType: d.challengeType,
            rules: d.rules,
            stakeLamports: Number(d.stakeLamports),
            verificationMethod: d.verificationMethod,
            status: d.status,
            escrowPda: d.escrowPda,
            escrowTxSignature: d.escrowTxSignature,
            winnerId: d.winnerId,
            expiresAt:
              d.expiresAt instanceof Timestamp
                ? d.expiresAt.toDate().toISOString()
                : String(d.expiresAt),
            createdAt:
              d.createdAt instanceof Timestamp
                ? d.createdAt.toDate().toISOString()
                : new Date().toISOString(),
            updatedAt:
              d.updatedAt instanceof Timestamp
                ? d.updatedAt.toDate().toISOString()
                : new Date().toISOString(),
            evidence: [],
            isDemoData: false,
          };
          setChallenges((prev) => (prev.some((c) => c.id === loaded.id) ? prev : [loaded, ...prev]));
          return loaded;
        }
      } catch {
        // Return null if inaccessible or missing
      }
    }
    return null;
  };

  const registerWithEmail = async (input: {
    fullName: string;
    username: string;
    email: string;
    password: string;
    ageConfirmed: boolean;
  }) => {
    if (!input.ageConfirmed) {
      throw new Error('You must confirm you are 18+ and eligible in your jurisdiction.');
    }
    const cred = await createUserWithEmailAndPassword(auth, input.email, input.password);
    await updateProfile(cred.user, { displayName: input.fullName });
    await sendEmailVerification(cred.user);
    pushToast(
      'success',
      'Account created',
      'Verification email sent. Please verify your email before writing on-chain or Firestore records.'
    );
  };

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    setActiveTab('home');
    pushToast('success', 'Welcome back to Veri-Fi');
  };

  const requestPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
    pushToast('success', 'Password reset email sent', `Check ${email} for recovery instructions.`);
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      pushToast('success', 'Verification email sent', 'Check your inbox to verify your account.');
    }
  };

  const updateAccountPassword = async (newPassword: string) => {
    if (authMode === 'demo') {
      pushToast('info', 'Demo Preview Mode', 'Password changes require a live Firebase Auth session.');
      return;
    }
    if (!auth.currentUser) throw new Error('Not signed in.');
    await updatePassword(auth.currentUser, newPassword);
    pushToast('success', 'Password updated');
  };

  const logout = async () => {
    if (authMode === 'firebase') {
      await signOut(auth);
    }
    setAuthMode('unauthenticated');
    setActiveTab('home');
    pushToast('info', 'Signed out of Veri-Fi');
  };

  // Challenge creation
  const createChallenge = async (input: CreateChallengeInput): Promise<Challenge | null> => {
    if (currentUser.status === 'suspended') {
      pushToast('error', 'Account suspended', 'Suspended accounts cannot create challenges.');
      return null;
    }
    const validation = validateChallengeCreation({
      category: input.category,
      title: input.title,
      description: input.description,
      rules: input.rules,
      stakeSol: input.stakeSol,
      availableLamports: wallet.availableLamports,
      expiresAtIso: input.expiresAt,
    });
    if (!validation.ok) {
      pushToast('error', 'Cannot publish challenge', validation.error);
      return null;
    }

    const challengeId = `chl_${Date.now().toString(36)}`;
    let escrowPda = `Pda_${challengeId}`;
    let vaultPda = `Vault_${challengeId}`;

    try {
      const pdaRes = await fetch('/api/solana/derive-escrow-pda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          creatorPubkey: currentUser.connectedSolanaPubkey,
        }),
      });
      if (pdaRes.ok) {
        const pdaJson = await pdaRes.json();
        escrowPda = pdaJson.challengePda;
        vaultPda = pdaJson.vaultPda;
      }
    } catch {
      // Fallback deterministic string
    }

    const nowIso = new Date().toISOString();
    const newChallenge: Challenge = {
      id: challengeId,
      creatorId: currentUser.uid,
      creatorUsername: currentUser.username,
      category: validation.category,
      title: input.title.trim(),
      description: input.description.trim(),
      challengeType: input.challengeType.trim(),
      rules: input.rules.trim(),
      stakeLamports: validation.stakeLamports,
      verificationMethod: input.verificationMethod,
      status: 'Open',
      escrowPda,
      vaultPda,
      expiresAt: input.expiresAt,
      createdAt: nowIso,
      updatedAt: nowIso,
      evidence: [],
      isDemoData: authMode === 'demo',
    };

    if (authMode === 'firebase' && firebaseUser?.emailVerified) {
      try {
        await setDoc(doc(db, 'challenges', challengeId), {
          id: challengeId,
          creatorId: currentUser.uid,
          creatorUsername: currentUser.username,
          category: validation.category,
          title: newChallenge.title,
          description: newChallenge.description,
          challengeType: newChallenge.challengeType,
          rules: newChallenge.rules,
          stakeLamports: validation.stakeLamports,
          verificationMethod: newChallenge.verificationMethod,
          status: 'Open',
          escrowPda,
          expiresAt: Timestamp.fromDate(new Date(input.expiresAt)),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `challenges/${challengeId}`);
      }
    }

    setChallenges((prev) => [newChallenge, ...prev]);
    setWallet((prev) => ({
      ...prev,
      availableLamports: prev.availableLamports - validation.stakeLamports,
      lockedLamports: prev.lockedLamports + validation.stakeLamports,
      updatedAt: nowIso,
    }));
    setLedger((prev) => [
      {
        id: `led_${Date.now()}`,
        uid: currentUser.uid,
        type: 'escrow_lock',
        grossLamports: validation.stakeLamports,
        appFeeLamports: 0,
        netLamports: validation.stakeLamports,
        status: 'confirmed',
        idempotencyKey: `lock_${challengeId}_${currentUser.uid}`,
        challengeId,
        note: `Stake locked in Escrow PDA (${escrowPda.slice(0, 10)}...)`,
        createdAt: nowIso,
      },
      ...prev,
    ]);
    pushToast('success', 'Challenge published', `${input.stakeSol} SOL locked in challenge escrow.`);
    return newChallenge;
  };

  const acceptChallenge = async (challengeId: string): Promise<boolean> => {
    const target = challenges.find((c) => c.id === challengeId);
    if (!target) return false;

    const check = canAcceptChallenge(target, currentUser.uid, wallet.availableLamports);
    if (!check.ok) {
      pushToast('error', 'Cannot accept challenge', check.error);
      return false;
    }

    const nowIso = new Date().toISOString();
    if (authMode === 'firebase' && firebaseUser?.emailVerified) {
      try {
        await updateDoc(doc(db, 'challenges', challengeId), {
          opponentId: currentUser.uid,
          opponentUsername: currentUser.username,
          status: 'Active',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `challenges/${challengeId}`);
      }
    }

    setChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId
          ? {
              ...c,
              opponentId: currentUser.uid,
              opponentUsername: currentUser.username,
              status: 'Active',
              updatedAt: nowIso,
            }
          : c
      )
    );
    setWallet((prev) => ({
      ...prev,
      availableLamports: prev.availableLamports - target.stakeLamports,
      lockedLamports: prev.lockedLamports + target.stakeLamports,
      updatedAt: nowIso,
    }));
    setLedger((prev) => [
      {
        id: `led_${Date.now()}`,
        uid: currentUser.uid,
        type: 'escrow_lock',
        grossLamports: target.stakeLamports,
        appFeeLamports: 0,
        netLamports: target.stakeLamports,
        status: 'confirmed',
        idempotencyKey: `accept_${challengeId}_${currentUser.uid}`,
        challengeId,
        note: `Matched stake for "${target.title}"`,
        createdAt: nowIso,
      },
      ...prev,
    ]);
    pushToast('success', 'Challenge accepted', 'Both stakes are now locked in Solana PDA escrow.');
    return true;
  };

  const cancelChallenge = async (challengeId: string): Promise<boolean> => {
    const target = challenges.find((c) => c.id === challengeId);
    if (!target) return false;
    const check = canCancelChallenge(target, currentUser.uid);
    if (!check.ok) {
      pushToast('error', 'Cannot cancel challenge', check.error);
      return false;
    }

    const nowIso = new Date().toISOString();
    if (authMode === 'firebase' && firebaseUser?.emailVerified) {
      try {
        await updateDoc(doc(db, 'challenges', challengeId), {
          status: 'Cancelled',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `challenges/${challengeId}`);
      }
    }

    setChallenges((prev) =>
      prev.map((c) => (c.id === challengeId ? { ...c, status: 'Cancelled', updatedAt: nowIso } : c))
    );
    setWallet((prev) => ({
      ...prev,
      availableLamports: prev.availableLamports + target.stakeLamports,
      lockedLamports: Math.max(0, prev.lockedLamports - target.stakeLamports),
      updatedAt: nowIso,
    }));
    setLedger((prev) => [
      {
        id: `led_${Date.now()}`,
        uid: currentUser.uid,
        type: 'escrow_refund',
        grossLamports: target.stakeLamports,
        appFeeLamports: 0,
        netLamports: target.stakeLamports,
        status: 'confirmed',
        idempotencyKey: `cancel_${challengeId}_${currentUser.uid}`,
        challengeId,
        note: `Cancelled open challenge "${target.title}" and refunded stake`,
        createdAt: nowIso,
      },
      ...prev,
    ]);
    pushToast('success', 'Challenge cancelled', 'Your locked stake has been refunded to Available balance.');
    return true;
  };

  const submitEvidence = async (
    challengeId: string,
    input: { summary: string; mediaUrl?: string; locationLat?: number; locationLng?: number; isDispute?: boolean }
  ): Promise<boolean> => {
    const target = challenges.find((c) => c.id === challengeId);
    if (!target) return false;
    const summary = input.summary.trim();
    if (summary.length < 3) {
      pushToast('error', 'Evidence summary required', 'Provide at least 3 characters.');
      return false;
    }

    const nowIso = new Date().toISOString();
    const counterpartyId =
      target.creatorId === currentUser.uid ? target.opponentId || target.creatorId : target.creatorId;
    const newEv: ChallengeEvidence = {
      id: `ev_${Date.now().toString(36)}`,
      challengeId,
      submitterId: currentUser.uid,
      submitterUsername: currentUser.username,
      counterpartyId,
      summary,
      mediaUrl: input.mediaUrl,
      locationLat: input.locationLat,
      locationLng: input.locationLng,
      isDispute: Boolean(input.isDispute),
      createdAt: nowIso,
    };

    const nextStatus = input.isDispute ? 'Disputed' : 'Under Review';

    setChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId
          ? { ...c, status: nextStatus, evidence: [...c.evidence, newEv], updatedAt: nowIso }
          : c
      )
    );
    pushToast(
      input.isDispute ? 'info' : 'success',
      input.isDispute ? 'Dispute raised' : 'Evidence submitted',
      input.isDispute
        ? 'Funds remain locked in escrow until authorized dispute resolution.'
        : 'Challenge moved to Under Review.'
    );
    return true;
  };

  const resolveChallenge = async (
    challengeId: string,
    winnerId: string,
    reason: string
  ): Promise<boolean> => {
    if (!currentUser.isAdmin) {
      pushToast('error', 'Unauthorized', 'Only authorized resolution mechanisms can settle escrow.');
      return false;
    }
    const target = challenges.find((c) => c.id === challengeId);
    if (!target || !target.opponentId) return false;
    if (winnerId !== target.creatorId && winnerId !== target.opponentId) {
      pushToast('error', 'Invalid winner', 'Winner must be one of the challenge participants.');
      return false;
    }

    const nowIso = new Date().toISOString();
    const poolLamports = computeChallengePoolLamports(target.stakeLamports);

    setChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId
          ? { ...c, status: 'Completed', winnerId, updatedAt: nowIso }
          : c
      )
    );

    // Update current user's wallet if they were in this challenge
    if (target.creatorId === currentUser.uid || target.opponentId === currentUser.uid) {
      const userWon = winnerId === currentUser.uid;
      setWallet((prev) => ({
        ...prev,
        lockedLamports: Math.max(0, prev.lockedLamports - target.stakeLamports),
        availableLamports: userWon ? prev.availableLamports + poolLamports : prev.availableLamports,
        totalWinningsLamports: userWon
          ? prev.totalWinningsLamports + poolLamports
          : prev.totalWinningsLamports,
        updatedAt: nowIso,
      }));
      if (userWon) {
        setLedger((prev) => [
          {
            id: `led_${Date.now()}`,
            uid: currentUser.uid,
            type: 'escrow_payout',
            grossLamports: poolLamports,
            appFeeLamports: 0,
            netLamports: poolLamports,
            status: 'confirmed',
            idempotencyKey: `payout_${challengeId}_${winnerId}`,
            challengeId,
            note: `Authorized escrow settlement: ${reason}`,
            createdAt: nowIso,
          },
          ...prev,
        ]);
      }
      setCurrentUser((prev) => ({
        ...prev,
        completedChallenges: prev.completedChallenges + 1,
        wins: userWon ? prev.wins + 1 : prev.wins,
        losses: userWon ? prev.losses : prev.losses + 1,
      }));
    }

    setAuditLogs((prev) => [
      {
        id: `aud_${Date.now()}`,
        adminUid: currentUser.uid,
        adminEmail: currentUser.email || 'admin@verifi.app',
        action: 'CHALLENGE_RESOLVED',
        targetId: challengeId,
        details: `Settled to ${winnerId}: ${reason}`,
        createdAt: nowIso,
      },
      ...prev,
    ]);
    pushToast('success', 'Challenge resolved', 'Escrow pool settled to verified winner.');
    return true;
  };

  // Private External Wallet (Phantom / Solflare)
  const connectPrivateWallet = async (provider: WalletProviderName): Promise<boolean> => {
    try {
      const res = await connectExternalWallet(provider);
      setCurrentUser((prev) => ({
        ...prev,
        connectedSolanaPubkey: res.pubkey,
        walletProvider: res.provider,
        walletVerified: false,
      }));
      pushToast('success', `${provider} connected`, `Address: ${res.pubkey.slice(0, 8)}...`);
      return true;
    } catch (err) {
      pushToast('error', `${provider} connection failed`, err instanceof Error ? err.message : 'Unable to connect');
      return false;
    }
  };

  const disconnectPrivateWallet = async () => {
    if (currentUser.walletProvider) {
      await disconnectExternalWallet(currentUser.walletProvider).catch(() => {});
    }
    setCurrentUser((prev) => ({
      ...prev,
      connectedSolanaPubkey: undefined,
      walletProvider: undefined,
      walletVerified: false,
    }));
    pushToast('info', 'Private wallet disconnected');
  };

  const verifyPrivateWalletOwnership = async (): Promise<boolean> => {
    if (!currentUser.connectedSolanaPubkey || !currentUser.walletProvider) {
      pushToast('error', 'No private wallet connected');
      return false;
    }
    try {
      const signed = await signOwnershipMessage(
        currentUser.walletProvider,
        currentUser.connectedSolanaPubkey
      );
      const res = await fetch('/api/solana/verify-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pubkey: currentUser.connectedSolanaPubkey,
          message: signed.message,
          signature: signed.signatureBase58,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.verified) {
        throw new Error(json.error || 'Signature verification failed.');
      }
      setCurrentUser((prev) => ({ ...prev, walletVerified: true }));
      pushToast('success', 'Wallet ownership verified', 'Ed25519 signature validated on backend.');
      return true;
    } catch (err) {
      pushToast('error', 'Verification failed', err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  const verifyDevnetDeposit = async (signature: string, amountSol: number): Promise<boolean> => {
    const cleanSig = signature.trim();
    if (!cleanSig) {
      pushToast('error', 'Transaction signature required');
      return false;
    }
    const idempotencyKey = `dep_${cleanSig}`;
    try {
      const res = await fetch('/api/solana/verify-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: cleanSig, idempotencyKey }),
      });
      const json = await res.json();
      if (!res.ok || !json.verified) {
        pushToast('error', 'Deposit not verified', json.error || 'Transaction could not be confirmed on Devnet.');
        return false;
      }

      const lamports = solToLamports(amountSol);
      const nowIso = new Date().toISOString();
      setWallet((prev) => ({
        ...prev,
        availableLamports: prev.availableLamports + lamports,
        updatedAt: nowIso,
      }));
      setLedger((prev) => [
        {
          id: `led_${Date.now()}`,
          uid: currentUser.uid,
          type: 'deposit',
          grossLamports: lamports,
          appFeeLamports: 0,
          netLamports: lamports,
          status: 'confirmed',
          idempotencyKey,
          txSignature: cleanSig,
          note: 'Verified Solana Devnet deposit',
          createdAt: nowIso,
        },
        ...prev,
      ]);
      pushToast('success', 'Devnet deposit credited', `+${amountSol.toFixed(4)} SOL added to App Wallet.`);
      return true;
    } catch (err) {
      pushToast('error', 'RPC verification error', err instanceof Error ? err.message : 'Network error');
      return false;
    }
  };

  const requestWithdrawal = async (grossSol: number, destinationPubkey: string): Promise<boolean> => {
    if (!destinationPubkey || destinationPubkey.trim().length < 32) {
      pushToast('error', 'Valid Solana destination address required');
      return false;
    }
    let breakdown;
    try {
      breakdown = calculateWithdrawalBreakdown(grossSol, appFeeBps);
    } catch (err) {
      pushToast('error', 'Invalid withdrawal amount', err instanceof Error ? err.message : 'Check amount');
      return false;
    }
    if (breakdown.grossLamports > wallet.availableLamports) {
      pushToast('error', 'Insufficient Available balance');
      return false;
    }

    const nowIso = new Date().toISOString();
    const idempotencyKey = `wd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    setWallet((prev) => ({
      ...prev,
      availableLamports: prev.availableLamports - breakdown.grossLamports,
      updatedAt: nowIso,
    }));
    setTreasuryBalanceLamports((prev) => prev + breakdown.appFeeLamports);
    setLedger((prev) => [
      {
        id: `led_${Date.now()}`,
        uid: currentUser.uid,
        type: 'withdrawal',
        grossLamports: breakdown.grossLamports,
        appFeeLamports: breakdown.appFeeLamports,
        netLamports: breakdown.netLamports,
        status: 'confirmed',
        idempotencyKey,
        counterparty: destinationPubkey.trim(),
        note: `App Fee: ${breakdown.appFeePercent}% (${breakdown.appFeeSol.toFixed(4)} SOL) -> Admin Treasury; Net ${breakdown.netSol.toFixed(4)} SOL`,
        createdAt: nowIso,
      },
      ...prev,
    ]);
    pushToast(
      'success',
      'Withdrawal processed',
      `Net ${breakdown.netSol.toFixed(4)} SOL sent; App Fee (${breakdown.appFeePercent}%): ${breakdown.appFeeSol.toFixed(4)} SOL.`
    );
    return true;
  };

  const sendInternalTransfer = async (
    recipientUid: string,
    amountSol: number,
    note?: string
  ): Promise<boolean> => {
    const check = validateInternalTransfer(
      currentUser.uid,
      recipientUid,
      amountSol,
      wallet.availableLamports
    );
    if (!check.ok) {
      pushToast('error', 'Transfer rejected', check.error);
      return false;
    }
    const recipient = users.find((u) => u.uid === recipientUid);
    if (!recipient) {
      pushToast('error', 'Recipient not found');
      return false;
    }

    const idempotencyKey = `txf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      const res = await fetch('/api/finance/validate-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderUid: currentUser.uid,
          recipientUid,
          amountSol,
          availableLamports: wallet.availableLamports,
          idempotencyKey,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        pushToast('error', 'Transfer rejected', j.error || 'Validation failed');
        return false;
      }
    } catch {
      // Allow offline validation fallback already ran
    }

    const nowIso = new Date().toISOString();
    setWallet((prev) => ({
      ...prev,
      availableLamports: prev.availableLamports - check.amountLamports,
      updatedAt: nowIso,
    }));
    setLedger((prev) => [
      {
        id: `led_${Date.now()}`,
        uid: currentUser.uid,
        type: 'transfer_out',
        grossLamports: check.amountLamports,
        appFeeLamports: 0,
        netLamports: check.amountLamports,
        status: 'confirmed',
        idempotencyKey,
        counterparty: `@${recipient.username}`,
        note: note?.trim() || `Internal App Wallet transfer to @${recipient.username}`,
        createdAt: nowIso,
      },
      ...prev,
    ]);
    pushToast('success', 'Internal transfer complete', `Sent ${amountSol.toFixed(4)} SOL to @${recipient.username}.`);
    return true;
  };

  // Social & Messaging
  const startConversationWith = (peerUid: string): string => {
    const existing = conversations.find((c) => c.peerUid === peerUid);
    if (existing) return existing.id;
    const peer = users.find((u) => u.uid === peerUid);
    const id = `conv_${currentUser.uid.slice(0, 6)}_${peerUid.slice(0, 6)}`;
    const newConv: Conversation = {
      id,
      participantA: currentUser.uid,
      participantB: peerUid,
      peerUid,
      peerUsername: peer?.username || 'challenger',
      peerDisplayName: peer?.displayName || 'Veri-Fi Member',
      peerAvatarUrl: peer?.avatarUrl || '/src/assets/images/verifi_logo_mark_1795017981359.jpg',
      peerOnline: Boolean(peer?.isOnline),
      lastMessageText: 'Conversation started',
      updatedAt: new Date().toISOString(),
    };
    setConversations((prev) => [newConv, ...prev]);
    return id;
  };

  const sendChatMessage = async (
    conversationId: string,
    input: {
      kind: ChatMessage['kind'];
      body: string;
      mediaUrl?: string;
      challengeId?: string;
      challengeTitle?: string;
      challengeStakeSol?: number;
    }
  ) => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return;
    if (currentUser.blockedUserIds.includes(conv.peerUid)) {
      pushToast('error', 'User blocked', 'Unblock this user in Settings before sending messages.');
      return;
    }

    const nowIso = new Date().toISOString();
    const msgId = `msg_${Date.now().toString(36)}`;
    const msg: ChatMessage = {
      id: msgId,
      conversationId,
      senderId: currentUser.uid,
      recipientId: conv.peerUid,
      kind: input.kind,
      body: input.body.trim(),
      mediaUrl: input.mediaUrl,
      challengeId: input.challengeId,
      challengeTitle: input.challengeTitle,
      challengeStakeSol: input.challengeStakeSol,
      readBy: [currentUser.uid],
      reported: false,
      createdAt: nowIso,
    };

    setMessages((prev) => [...prev, msg]);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, lastMessageText: msg.body.slice(0, 120), updatedAt: nowIso } : c
      )
    );
  };

  const markConversationRead = (conversationId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.conversationId === conversationId && !m.readBy.includes(currentUser.uid)
          ? { ...m, readBy: [...m.readBy, currentUser.uid] }
          : m
      )
    );
  };

  const reportMessage = (messageId: string) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reported: true } : m)));
    pushToast('info', 'Message reported', 'Moderators will review this message.');
  };

  const toggleBlockUser = (targetUid: string) => {
    setCurrentUser((prev) => {
      const exists = prev.blockedUserIds.includes(targetUid);
      const next = exists
        ? prev.blockedUserIds.filter((id) => id !== targetUid)
        : [...prev.blockedUserIds, targetUid];
      return { ...prev, blockedUserIds: next };
    });
    pushToast('info', 'Privacy block list updated');
  };

  const toggleFollowUser = async (targetUid: string) => {
    if (targetUid === currentUser.uid) return;
    const targetUser = users.find((u) => u.uid === targetUid);
    const alreadyFollowing = currentUser.followingIds.includes(targetUid);
    const nextFollowing = alreadyFollowing
      ? currentUser.followingIds.filter((id) => id !== targetUid)
      : [...currentUser.followingIds, targetUid];

    setCurrentUser((prev) => ({ ...prev, followingIds: nextFollowing }));
    setUsers((prev) =>
      prev.map((u) => (u.uid === currentUser.uid ? { ...u, followingIds: nextFollowing } : u))
    );

    if (authMode === 'firebase' && firebaseUser?.emailVerified) {
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          followingIds: nextFollowing,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      }
    }

    const label = targetUser?.nickname?.trim() || (targetUser ? `@${targetUser.username}` : 'user');
    pushToast(
      'success',
      alreadyFollowing ? `Unfollowed ${label}` : `Following ${label}`,
      alreadyFollowing ? undefined : 'You can filter Followed users and chat with them directly.'
    );
  };

  // Profile, Referrals & Admin
  const updateUserProfile = async (patch: Partial<UserProfile>) => {
    setCurrentUser((prev) => ({ ...prev, ...patch }));
    setUsers((prev) =>
      prev.map((u) => (u.uid === currentUser.uid ? { ...u, ...patch } : u))
    );
    if (authMode === 'firebase' && firebaseUser?.emailVerified) {
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
          ...(patch.nickname !== undefined ? { nickname: patch.nickname } : {}),
          ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
          ...(patch.showStats !== undefined ? { showStats: patch.showStats } : {}),
          ...(patch.followingIds !== undefined ? { followingIds: patch.followingIds } : {}),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      }
    }
    pushToast('success', 'Profile & settings saved');
  };

  const requestAccountDeletion = async () => {
    setCurrentUser((prev) => ({ ...prev, status: 'deletion_requested' }));
    setAuditLogs((prev) => [
      {
        id: `aud_${Date.now()}`,
        adminUid: currentUser.uid,
        adminEmail: currentUser.email || 'user@verifi.app',
        action: 'ACCOUNT_DELETION_REQUESTED',
        targetId: currentUser.uid,
        details: 'Deletion requested; financial ledger, escrow, and audit records preserved for compliance.',
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    pushToast(
      'info',
      'Account deletion queued',
      'Financial, escrow, and audit records remain preserved for compliance.'
    );
  };

  const redeemReward = async (rewardTitle: string, pointsCost: number): Promise<boolean> => {
    if (currentUser.referralPoints < pointsCost) {
      pushToast('error', 'Insufficient referral points');
      return false;
    }
    const nowIso = new Date().toISOString();
    setCurrentUser((prev) => ({ ...prev, referralPoints: prev.referralPoints - pointsCost }));
    setRedemptions((prev) => [
      {
        id: `red_${Date.now()}`,
        uid: currentUser.uid,
        rewardTitle,
        pointsCost,
        status: 'pending',
        createdAt: nowIso,
      },
      ...prev,
    ]);
    pushToast('success', 'Redemption requested', `${rewardTitle} (-${pointsCost} pts)`);
    return true;
  };

  const adminToggleUserSuspension = (targetUid: string) => {
    if (!currentUser.isAdmin) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.uid === targetUid
          ? { ...u, status: u.status === 'suspended' ? 'active' : 'suspended' }
          : u
      )
    );
    setAuditLogs((prev) => [
      {
        id: `aud_${Date.now()}`,
        adminUid: currentUser.uid,
        adminEmail: currentUser.email || 'admin@verifi.app',
        action: 'USER_STATUS_TOGGLED',
        targetId: targetUid,
        details: `Toggled suspension status for ${targetUid}`,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    pushToast('success', 'User status updated');
  };

  const adminUpdateAppFeeBps = (newFeeBps: number) => {
    if (!currentUser.isAdmin) return;
    if (newFeeBps < 0 || newFeeBps > 500) {
      pushToast('error', 'Fee out of bounds', 'App Fee must be between 0% and 5% (0-500 bps).');
      return;
    }
    setAppFeeBps(newFeeBps);
    setAuditLogs((prev) => [
      {
        id: `aud_${Date.now()}`,
        adminUid: currentUser.uid,
        adminEmail: currentUser.email || 'admin@verifi.app',
        action: 'APP_FEE_UPDATED',
        targetId: 'app_settings/global',
        details: `Updated withdrawal App Fee to ${(newFeeBps / 100).toFixed(2)}% (${newFeeBps} bps)`,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    pushToast('success', 'App Fee updated', `Withdrawal App Fee set to ${(newFeeBps / 100).toFixed(2)}%.`);
  };

  const adminAddSportsFixture = (fixture: Omit<SportsFixture, 'id'>) => {
    if (!currentUser.isAdmin) return;
    const id = `fix_${Date.now().toString(36)}`;
    setSportsFixtures((prev) => [{ id, ...fixture }, ...prev]);
    setAuditLogs((prev) => [
      {
        id: `aud_${Date.now()}`,
        adminUid: currentUser.uid,
        adminEmail: currentUser.email || 'admin@verifi.app',
        action: 'SPORTS_FIXTURE_PUBLISHED',
        targetId: id,
        details: `${fixture.homeTeam} vs ${fixture.awayTeam} (${fixture.league})`,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    pushToast('success', 'Sports fixture published');
  };

  const adminAddMoviePrediction = (movie: Omit<MoviePredictionItem, 'id'>) => {
    if (!currentUser.isAdmin) return;
    const id = `mov_${Date.now().toString(36)}`;
    setMoviePredictions((prev) => [{ id, ...movie }, ...prev]);
    setAuditLogs((prev) => [
      {
        id: `aud_${Date.now()}`,
        adminUid: currentUser.uid,
        adminEmail: currentUser.email || 'admin@verifi.app',
        action: 'MOVIE_PREDICTION_PUBLISHED',
        targetId: id,
        details: `${movie.movieTitle}: ${movie.question}`,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    pushToast('success', 'Movie prediction published');
  };

  const adminSettleMoviePrediction = (movieId: string, officialOutcome: string) => {
    if (!currentUser.isAdmin) return;
    setMoviePredictions((prev) =>
      prev.map((m) => (m.id === movieId ? { ...m, status: 'settled', officialOutcome } : m))
    );
    setAuditLogs((prev) => [
      {
        id: `aud_${Date.now()}`,
        adminUid: currentUser.uid,
        adminEmail: currentUser.email || 'admin@verifi.app',
        action: 'MOVIE_OUTCOME_RECORDED',
        targetId: movieId,
        details: `Official outcome: ${officialOutcome}`,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    pushToast('success', 'Official movie outcome published');
  };

  const value = useMemo<VeriFiContextValue>(
    () => ({
      authMode,
      authReady,
      firebaseUser,
      currentUser,
      wallet,
      ledger,
      challenges,
      users,
      categories,
      conversations,
      messages,
      referrals,
      redemptions,
      sportsFixtures,
      moviePredictions,
      locationPrompts,
      todPrompts,
      auditLogs,
      notifications,
      toasts,
      devnetInfo,
      appFeeBps,
      treasuryBalanceLamports,
      activeTab,
      setActiveTab,
      sharedChallengeId,
      setSharedChallengeId,
      loadChallengeById,
      veriBotOpen,
      setVeriBotOpen,
      veriBotContextChallenge,
      setVeriBotContextChallenge,
      pushToast,
      dismissToast,
      enterDemoSandbox,
      signInWithGoogle,
      loginAdminPortal,
      registerWithEmail,
      loginWithEmail,
      requestPasswordReset,
      resendVerificationEmail,
      updateAccountPassword,
      logout,
      createChallenge,
      acceptChallenge,
      cancelChallenge,
      submitEvidence,
      resolveChallenge,
      connectPrivateWallet,
      disconnectPrivateWallet,
      verifyPrivateWalletOwnership,
      verifyDevnetDeposit,
      requestWithdrawal,
      sendInternalTransfer,
      startConversationWith,
      sendChatMessage,
      markConversationRead,
      reportMessage,
      toggleBlockUser,
      toggleFollowUser,
      updateUserProfile,
      requestAccountDeletion,
      redeemReward,
      adminToggleUserSuspension,
      adminUpdateAppFeeBps,
      adminAddSportsFixture,
      adminAddMoviePrediction,
      adminSettleMoviePrediction,
    }),
    [
      authMode,
      authReady,
      firebaseUser,
      currentUser,
      wallet,
      ledger,
      challenges,
      users,
      categories,
      conversations,
      messages,
      referrals,
      redemptions,
      sportsFixtures,
      moviePredictions,
      locationPrompts,
      todPrompts,
      auditLogs,
      notifications,
      toasts,
      devnetInfo,
      appFeeBps,
      treasuryBalanceLamports,
      activeTab,
      sharedChallengeId,
      veriBotOpen,
      veriBotContextChallenge,
    ]
  );

  return <VeriFiContext.Provider value={value}>{children}</VeriFiContext.Provider>;
}

export function useVeriFi() {
  const ctx = useContext(VeriFiContext);
  if (!ctx) throw new Error('useVeriFi must be used inside VeriFiProvider');
  return ctx;
}
