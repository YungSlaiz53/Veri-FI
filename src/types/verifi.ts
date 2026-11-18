export type CategoryId =
  | 'sports'
  | 'location'
  | 'truth_or_dare'
  | 'movie_predictions'
  | 'other'
  | 'casino'
  | 'poker';

export type ActiveCategoryId =
  | 'sports'
  | 'location'
  | 'truth_or_dare'
  | 'movie_predictions'
  | 'other';

export type ChallengeStatus =
  | 'Open'
  | 'Awaiting Acceptance'
  | 'Pending Deposit'
  | 'Active'
  | 'Awaiting Evidence'
  | 'Under Review'
  | 'Completed'
  | 'Won'
  | 'Lost'
  | 'Disputed'
  | 'Cancelled'
  | 'Refunded';

export type VerificationMethod =
  | 'sports_feed'
  | 'geolocation_evidence'
  | 'participant_evidence'
  | 'admin_official_outcome';

export type LedgerEntryType =
  | 'deposit'
  | 'withdrawal'
  | 'app_fee'
  | 'transfer_out'
  | 'transfer_in'
  | 'escrow_lock'
  | 'escrow_payout'
  | 'escrow_refund';

export type LedgerStatus = 'pending' | 'confirmed' | 'failed' | 'expired';

export type NavTab =
  | 'home'
  | 'explore'
  | 'categories'
  | 'my_bets'
  | 'social'
  | 'messages'
  | 'wallet'
  | 'referrals'
  | 'profile'
  | 'about'
  | 'settings'
  | 'admin';

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  nickname?: string;
  email?: string;
  bio: string;
  avatarUrl: string;
  showStats: boolean;
  completedChallenges: number;
  wins: number;
  losses: number;
  referralCode: string;
  referralPoints: number;
  status: 'active' | 'suspended' | 'deletion_requested';
  isOnline: boolean;
  joinedAt: string;
  isAdmin?: boolean;
  ageVerified: boolean;
  jurisdictionCode: string;
  dailyStakeLimitSol: number;
  selfExcludedUntil?: string;
  blockedUserIds: string[];
  followingIds: string[];
  connectedSolanaPubkey?: string;
  walletProvider?: 'Phantom' | 'Solflare';
  walletVerified?: boolean;
  emailVerified?: boolean;
  notificationsEnabled: boolean;
}

export interface WalletAccount {
  uid: string;
  availableLamports: number;
  lockedLamports: number;
  pendingLamports: number;
  totalWinningsLamports: number;
  updatedAt: string;
}

export interface WalletLedgerEntry {
  id: string;
  uid: string;
  type: LedgerEntryType;
  grossLamports: number;
  appFeeLamports: number;
  netLamports: number;
  status: LedgerStatus;
  idempotencyKey: string;
  txSignature?: string;
  counterparty?: string;
  challengeId?: string;
  note?: string;
  createdAt: string;
}

export interface ChallengeEvidence {
  id: string;
  challengeId: string;
  submitterId: string;
  submitterUsername: string;
  counterpartyId: string;
  summary: string;
  mediaUrl?: string;
  locationLat?: number;
  locationLng?: number;
  isDispute: boolean;
  createdAt: string;
}

export interface Challenge {
  id: string;
  creatorId: string;
  creatorUsername: string;
  opponentId?: string;
  opponentUsername?: string;
  category: ActiveCategoryId;
  title: string;
  description: string;
  challengeType: string;
  rules: string;
  stakeLamports: number;
  verificationMethod: VerificationMethod;
  status: ChallengeStatus;
  escrowPda?: string;
  vaultPda?: string;
  escrowTxSignature?: string;
  winnerId?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  evidence: ChallengeEvidence[];
  isDemoData?: boolean;
}

export interface CategoryConfig {
  id: CategoryId;
  name: string;
  tagline: string;
  description: string;
  enabled: boolean;
  comingSoon: boolean;
  bannerUrl?: string;
  activeCount: number;
}

export interface Conversation {
  id: string;
  participantA: string;
  participantB: string;
  peerUid: string;
  peerUsername: string;
  peerDisplayName: string;
  peerAvatarUrl: string;
  peerOnline: boolean;
  lastMessageText: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  kind: 'text' | 'image' | 'voice' | 'challenge_invite' | 'challenge_status' | 'evidence';
  body: string;
  mediaUrl?: string;
  challengeId?: string;
  challengeTitle?: string;
  challengeStakeSol?: number;
  readBy: string[];
  reported: boolean;
  createdAt: string;
}

export interface ReferralRecord {
  id: string;
  referrerUid: string;
  referredUid: string;
  referredUsername: string;
  pointsAwarded: number;
  milestone: 'registered' | 'verified' | 'first_challenge';
  status: 'pending' | 'credited';
  createdAt: string;
}

export interface RedemptionItem {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  category: 'fee_voucher' | 'badge' | 'merch';
  available: boolean;
}

export interface RedemptionRecord {
  id: string;
  uid: string;
  rewardTitle: string;
  pointsCost: number;
  status: 'pending' | 'fulfilled' | 'rejected';
  createdAt: string;
}

export interface SportsFixture {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  markets: string[];
  status: 'scheduled' | 'in_play' | 'final';
  officialOutcome?: string;
}

export interface MoviePredictionItem {
  id: string;
  movieTitle: string;
  releaseWindow: string;
  question: string;
  posterUrl: string;
  deadlineAt: string;
  status: 'open' | 'locked' | 'settled';
  officialOutcome?: string;
}

export interface LocationPrompt {
  id: string;
  title: string;
  landmark: string;
  city: string;
  radiusMeters: number;
  imageUrl: string;
  active: boolean;
}

export interface TruthOrDarePrompt {
  id: string;
  mode: 'Truth' | 'Dare';
  prompt: string;
  safetyTier: 'standard' | 'public_verified';
  active: boolean;
}

export interface AdminAuditLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  action: string;
  targetId: string;
  details: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  uid: string;
  title: string;
  body: string;
  read: boolean;
  linkTab?: NavTab;
  createdAt: string;
}
