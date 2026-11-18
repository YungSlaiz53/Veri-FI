import type {
  ActiveCategoryId,
  CategoryId,
  Challenge,
  ChallengeStatus,
} from '../types/verifi';

export const LAMPORTS_PER_SOL = 1_000_000_000;
export const DEFAULT_APP_FEE_BPS = 200; // 2.00%
export const MAX_APP_FEE_BPS = 500; // 5.00% hard cap

export const DISABLED_CATEGORIES: ReadonlySet<CategoryId> = new Set(['casino', 'poker']);

export interface WithdrawalBreakdown {
  grossSol: number;
  grossLamports: number;
  appFeeBps: number;
  appFeePercent: number;
  appFeeLamports: number;
  appFeeSol: number;
  netLamports: number;
  netSol: number;
}

export function solToLamports(sol: number): number {
  if (!Number.isFinite(sol) || sol < 0) {
    throw new Error('SOL amount must be a finite non-negative number.');
  }
  return Math.round(sol * LAMPORTS_PER_SOL);
}

export function lamportsToSol(lamports: number): number {
  if (!Number.isFinite(lamports)) {
    return 0;
  }
  return lamports / LAMPORTS_PER_SOL;
}

export function formatSol(lamports: number, decimals = 4): string {
  return lamportsToSol(lamports).toFixed(decimals);
}

const CATEGORY_LABELS: Record<CategoryId, string> = {
  sports: 'Sports',
  location: 'Location Challenges',
  truth_or_dare: 'Truth or Dare',
  movie_predictions: 'Movie Predictions',
  other: 'Other (Custom)',
  casino: 'Casino',
  poker: 'Poker',
};

export function formatCategoryLabel(categoryId: CategoryId | string): string {
  if (categoryId in CATEGORY_LABELS) {
    return CATEGORY_LABELS[categoryId as CategoryId];
  }
  return categoryId.replace(/_/g, ' ');
}

export function formatSnakeLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

/**
 * Calculates the exact 2% App Fee and net withdrawal amount using integer lamport arithmetic.
 * This App Fee is an application fee routed to the Veri-Fi Admin Treasury Wallet,
 * completely separate from Solana network transaction fees.
 */
export function calculateWithdrawalBreakdown(
  grossSol: number,
  appFeeBps = DEFAULT_APP_FEE_BPS
): WithdrawalBreakdown {
  if (!Number.isFinite(grossSol) || grossSol <= 0) {
    throw new Error('Withdrawal amount must be greater than zero.');
  }
  if (!Number.isInteger(appFeeBps) || appFeeBps < 0 || appFeeBps > MAX_APP_FEE_BPS) {
    throw new Error(`App Fee must be between 0 and ${MAX_APP_FEE_BPS} bps.`);
  }

  const grossLamports = solToLamports(grossSol);
  if (grossLamports <= 0) {
    throw new Error('Withdrawal amount is too small.');
  }

  const appFeeLamports = Math.floor((grossLamports * appFeeBps) / 10_000);
  const netLamports = grossLamports - appFeeLamports;

  return {
    grossSol: lamportsToSol(grossLamports),
    grossLamports,
    appFeeBps,
    appFeePercent: appFeeBps / 100,
    appFeeLamports,
    appFeeSol: lamportsToSol(appFeeLamports),
    netLamports,
    netSol: lamportsToSol(netLamports),
  };
}

export function isCategoryPlayable(
  categoryId: CategoryId,
  availabilityMap?: Partial<Record<CategoryId, boolean>>
): boolean {
  if (DISABLED_CATEGORIES.has(categoryId)) {
    return false;
  }
  if (availabilityMap && categoryId in availabilityMap) {
    return Boolean(availabilityMap[categoryId]);
  }
  return true;
}

export interface ChallengeValidationInput {
  category: CategoryId;
  title: string;
  description: string;
  rules: string;
  stakeSol: number;
  availableLamports: number;
  expiresAtIso: string;
  nowMs?: number;
}

export function validateChallengeCreation(
  input: ChallengeValidationInput
): { ok: true; stakeLamports: number; category: ActiveCategoryId } | { ok: false; error: string } {
  if (!isCategoryPlayable(input.category)) {
    return {
      ok: false,
      error: `${input.category === 'casino' ? 'Casino' : 'Poker'} is currently Coming Soon and disabled.`,
    };
  }
  const title = input.title.trim();
  if (title.length < 3 || title.length > 140) {
    return { ok: false, error: 'Title must be between 3 and 140 characters.' };
  }
  const description = input.description.trim();
  if (description.length < 5 || description.length > 1200) {
    return { ok: false, error: 'Description must be between 5 and 1200 characters.' };
  }
  const rules = input.rules.trim();
  if (rules.length < 3 || rules.length > 1200) {
    return { ok: false, error: 'Rules must be between 3 and 1200 characters.' };
  }
  if (!Number.isFinite(input.stakeSol) || input.stakeSol <= 0 || input.stakeSol > 100) {
    return { ok: false, error: 'Stake must be greater than 0 and at most 100 SOL.' };
  }
  const stakeLamports = solToLamports(input.stakeSol);
  if (stakeLamports > input.availableLamports) {
    return { ok: false, error: 'Insufficient Available App Wallet balance for this stake.' };
  }
  const expiresMs = Date.parse(input.expiresAtIso);
  const nowMs = input.nowMs ?? Date.now();
  if (!Number.isFinite(expiresMs) || expiresMs <= nowMs + 60_000) {
    return { ok: false, error: 'Expiration must be at least 1 minute in the future.' };
  }

  return {
    ok: true,
    stakeLamports,
    category: input.category as ActiveCategoryId,
  };
}

export function canAcceptChallenge(
  challenge: Pick<Challenge, 'status' | 'creatorId' | 'opponentId' | 'stakeLamports' | 'expiresAt'>,
  acceptorUid: string,
  availableLamports: number,
  nowMs = Date.now()
): { ok: true } | { ok: false; error: string } {
  if (challenge.status !== 'Open' && challenge.status !== 'Awaiting Acceptance') {
    return { ok: false, error: 'Challenge is no longer open for acceptance.' };
  }
  if (challenge.opponentId) {
    return { ok: false, error: 'Another participant has already accepted this challenge.' };
  }
  if (challenge.creatorId === acceptorUid) {
    return { ok: false, error: 'You cannot accept your own challenge.' };
  }
  if (Date.parse(challenge.expiresAt) <= nowMs) {
    return { ok: false, error: 'This challenge has expired.' };
  }
  if (availableLamports < challenge.stakeLamports) {
    return { ok: false, error: 'Insufficient Available App Wallet balance to match the stake.' };
  }
  return { ok: true };
}

export function canCancelChallenge(
  challenge: Pick<Challenge, 'status' | 'creatorId' | 'opponentId'>,
  requesterUid: string
): { ok: true } | { ok: false; error: string } {
  if (challenge.creatorId !== requesterUid) {
    return { ok: false, error: 'Only the challenge creator can cancel an open challenge.' };
  }
  if (challenge.opponentId) {
    return { ok: false, error: 'Cannot cancel after an opponent has matched the stake.' };
  }
  if (challenge.status !== 'Open' && challenge.status !== 'Awaiting Acceptance') {
    return { ok: false, error: 'Only Open challenges can be cancelled.' };
  }
  return { ok: true };
}

const VALID_TRANSITIONS: Record<ChallengeStatus, ReadonlySet<ChallengeStatus>> = {
  Open: new Set(['Awaiting Acceptance', 'Pending Deposit', 'Active', 'Cancelled', 'Refunded']),
  'Awaiting Acceptance': new Set(['Pending Deposit', 'Active', 'Cancelled', 'Refunded']),
  'Pending Deposit': new Set(['Active', 'Cancelled', 'Refunded']),
  Active: new Set(['Awaiting Evidence', 'Under Review', 'Disputed', 'Completed', 'Refunded']),
  'Awaiting Evidence': new Set(['Under Review', 'Disputed', 'Completed', 'Refunded']),
  'Under Review': new Set(['Disputed', 'Completed', 'Won', 'Lost', 'Refunded']),
  Disputed: new Set(['Under Review', 'Completed', 'Refunded']),
  Completed: new Set(),
  Won: new Set(),
  Lost: new Set(),
  Cancelled: new Set(),
  Refunded: new Set(),
};

export function canTransitionChallengeStatus(from: ChallengeStatus, to: ChallengeStatus): boolean {
  return VALID_TRANSITIONS[from]?.has(to) ?? false;
}

export function computeChallengePoolLamports(stakeLamports: number): number {
  if (!Number.isInteger(stakeLamports) || stakeLamports <= 0) {
    throw new Error('Stake lamports must be a positive integer.');
  }
  return stakeLamports * 2;
}

export function validateInternalTransfer(
  senderUid: string,
  recipientUid: string,
  amountSol: number,
  availableLamports: number
): { ok: true; amountLamports: number } | { ok: false; error: string } {
  if (!recipientUid || senderUid === recipientUid) {
    return { ok: false, error: 'Select a valid recipient different from your own account.' };
  }
  if (!Number.isFinite(amountSol) || amountSol <= 0) {
    return { ok: false, error: 'Transfer amount must be greater than 0 SOL.' };
  }
  const amountLamports = solToLamports(amountSol);
  if (amountLamports <= 0) {
    return { ok: false, error: 'Transfer amount is too small.' };
  }
  if (amountLamports > availableLamports) {
    return { ok: false, error: 'Insufficient Available App Wallet balance.' };
  }
  return { ok: true, amountLamports };
}

export function calculateReferralPoints(
  milestone: 'registered' | 'verified' | 'first_challenge',
  referrerUid: string,
  referredUid: string,
  alreadyClaimed: boolean
): { ok: true; points: number } | { ok: false; error: string } {
  if (!referrerUid || !referredUid || referrerUid === referredUid) {
    return { ok: false, error: 'Self-referrals are not permitted.' };
  }
  if (alreadyClaimed) {
    return { ok: false, error: 'Referral milestone reward already claimed.' };
  }
  const pointsByMilestone = {
    registered: 50,
    verified: 100,
    first_challenge: 250,
  } as const;
  return { ok: true, points: pointsByMilestone[milestone] };
}
