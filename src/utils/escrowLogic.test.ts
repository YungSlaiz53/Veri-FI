import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateReferralPoints,
  calculateWithdrawalBreakdown,
  canAcceptChallenge,
  canCancelChallenge,
  canTransitionChallengeStatus,
  computeChallengePoolLamports,
  isCategoryPlayable,
  LAMPORTS_PER_SOL,
  validateChallengeCreation,
  validateInternalTransfer,
} from './escrowLogic';

test('2% App Fee withdrawal breakdown calculates exact integer lamports', () => {
  const result = calculateWithdrawalBreakdown(1.0, 200);
  assert.equal(result.grossLamports, 1_000_000_000);
  assert.equal(result.appFeePercent, 2);
  assert.equal(result.appFeeLamports, 20_000_000);
  assert.equal(result.appFeeSol, 0.02);
  assert.equal(result.netLamports, 980_000_000);
  assert.equal(result.netSol, 0.98);
});

test('withdrawal breakdown rejects zero, negative, or over-cap fee bps', () => {
  assert.throws(() => calculateWithdrawalBreakdown(0));
  assert.throws(() => calculateWithdrawalBreakdown(-1));
  assert.throws(() => calculateWithdrawalBreakdown(1, 600));
});

test('Casino and Poker categories remain strictly blocked', () => {
  assert.equal(isCategoryPlayable('casino'), false);
  assert.equal(isCategoryPlayable('poker'), false);
  assert.equal(isCategoryPlayable('casino', { casino: true }), false);
  assert.equal(isCategoryPlayable('sports'), true);
  assert.equal(isCategoryPlayable('other'), true);

  const otherCheck = validateChallengeCreation({
    category: 'other',
    title: 'Custom Chess Match',
    description: 'Best of 3 blitz games on Friday night.',
    rules: 'Winner of 2 games claims the escrow pool.',
    stakeSol: 0.5,
    availableLamports: 5 * LAMPORTS_PER_SOL,
    expiresAtIso: new Date(Date.now() + 3600_000).toISOString(),
  });
  assert.equal(otherCheck.ok, true);

  const casinoCheck = validateChallengeCreation({
    category: 'casino',
    title: 'Roulette Spin',
    description: 'Should be rejected',
    rules: 'Blocked',
    stakeSol: 1,
    availableLamports: 5 * LAMPORTS_PER_SOL,
    expiresAtIso: new Date(Date.now() + 3600_000).toISOString(),
  });
  assert.equal(casinoCheck.ok, false);
});

test('challenge acceptance enforces opponent != creator and sufficient balance', () => {
  const challenge = {
    status: 'Open' as const,
    creatorId: 'user_a',
    opponentId: undefined,
    stakeLamports: 1 * LAMPORTS_PER_SOL,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  };

  const selfAccept = canAcceptChallenge(challenge, 'user_a', 5 * LAMPORTS_PER_SOL);
  assert.equal(selfAccept.ok, false);

  const lowBalance = canAcceptChallenge(challenge, 'user_b', 0.5 * LAMPORTS_PER_SOL);
  assert.equal(lowBalance.ok, false);

  const valid = canAcceptChallenge(challenge, 'user_b', 2 * LAMPORTS_PER_SOL);
  assert.equal(valid.ok, true);
});

test('open challenge cancellation is blocked after opponent joins', () => {
  assert.equal(
    canCancelChallenge({ status: 'Open', creatorId: 'user_a', opponentId: undefined }, 'user_a').ok,
    true
  );
  assert.equal(
    canCancelChallenge({ status: 'Active', creatorId: 'user_a', opponentId: 'user_b' }, 'user_a').ok,
    false
  );
});

test('challenge state machine prevents reopening terminal states', () => {
  assert.equal(canTransitionChallengeStatus('Open', 'Active'), true);
  assert.equal(canTransitionChallengeStatus('Active', 'Disputed'), true);
  assert.equal(canTransitionChallengeStatus('Completed', 'Open'), false);
  assert.equal(canTransitionChallengeStatus('Cancelled', 'Active'), false);
});

test('escrow pool doubles matched stake and validates internal transfers', () => {
  assert.equal(computeChallengePoolLamports(1_000_000_000), 2_000_000_000);
  assert.equal(
    validateInternalTransfer('u1', 'u1', 1, 5_000_000_000).ok,
    false
  );
  assert.equal(
    validateInternalTransfer('u1', 'u2', 10, 1_000_000_000).ok,
    false
  );
  const okTransfer = validateInternalTransfer('u1', 'u2', 0.5, 1_000_000_000);
  assert.equal(okTransfer.ok, true);
  if (okTransfer.ok) {
    assert.equal(okTransfer.amountLamports, 500_000_000);
  }
});

test('referral points guard prevents self-referrals and duplicate milestone claims', () => {
  assert.equal(calculateReferralPoints('registered', 'u1', 'u1', false).ok, false);
  assert.equal(calculateReferralPoints('registered', 'u1', 'u2', true).ok, false);
  const valid = calculateReferralPoints('first_challenge', 'u1', 'u2', false);
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.points, 250);
  }
});
