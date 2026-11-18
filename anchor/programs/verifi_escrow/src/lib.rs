use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("8yAq46dHnn4yFYcas3JhdUzToacpb1F2qdJqW1hrmaPJ");

#[program]
pub mod verifi_escrow {
    use super::*;

    /// Initializes the global Veri-Fi escrow configuration.
    /// The resolver authority can authorize valid outcomes, but CANNOT arbitrarily withdraw vault funds.
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        treasury: Pubkey,
        max_app_fee_bps: u16,
    ) -> Result<()> {
        require!(max_app_fee_bps <= 500, EscrowError::FeeExceedsCap);
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.treasury = treasury;
        config.max_app_fee_bps = max_app_fee_bps;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    /// Player A creates a challenge and locks their initial stake inside the Vault PDA.
    pub fn create_challenge(
        ctx: Context<CreateChallenge>,
        challenge_id: String,
        stake_lamports: u64,
        expires_at: i64,
        category_code: u8,
    ) -> Result<()> {
        require!(!challenge_id.is_empty() && challenge_id.len() <= 32, EscrowError::InvalidChallengeId);
        require!(stake_lamports > 0, EscrowError::InvalidStakeAmount);
        // Categories 0..=4 are active (Sports, Location, TruthOrDare, MoviePredictions, Other/Custom).
        // Casino & Poker (5+) remain strictly disabled at protocol level.
        require!(category_code <= 4, EscrowError::CategoryDisabled);

        let clock = Clock::get()?;
        require!(expires_at > clock.unix_timestamp, EscrowError::ChallengeExpired);

        let challenge = &mut ctx.accounts.challenge;
        challenge.challenge_id = challenge_id;
        challenge.creator = ctx.accounts.creator.key();
        challenge.opponent = None;
        challenge.winner = None;
        challenge.stake_lamports = stake_lamports;
        challenge.total_pool_lamports = stake_lamports;
        challenge.category_code = category_code;
        challenge.status = ChallengeStatus::Open;
        challenge.expires_at = expires_at;
        challenge.is_settled = false;
        challenge.bump = ctx.bumps.challenge;
        challenge.vault_bump = ctx.bumps.vault;

        // Transfer Player A's stake into the PDA Vault
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, stake_lamports)?;

        emit!(ChallengeCreated {
            challenge: challenge.key(),
            creator: challenge.creator,
            stake_lamports,
            expires_at,
        });

        Ok(())
    }

    /// Player B accepts the challenge, matches the exact stake into the Vault PDA, and activates the challenge.
    pub fn accept_challenge(ctx: Context<AcceptChallenge>) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        let clock = Clock::get()?;

        require!(challenge.status == ChallengeStatus::Open, EscrowError::InvalidChallengeState);
        require!(challenge.opponent.is_none(), EscrowError::ChallengeAlreadyAccepted);
        require!(ctx.accounts.opponent.key() != challenge.creator, EscrowError::CannotChallengeSelf);
        require!(clock.unix_timestamp < challenge.expires_at, EscrowError::ChallengeExpired);

        let stake = challenge.stake_lamports;
        let new_pool = challenge
            .total_pool_lamports
            .checked_add(stake)
            .ok_or(EscrowError::ArithmeticOverflow)?;

        // Transfer Player B's matching stake into the PDA Vault
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.opponent.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, stake)?;

        challenge.opponent = Some(ctx.accounts.opponent.key());
        challenge.total_pool_lamports = new_pool;
        challenge.status = ChallengeStatus::Active;

        emit!(ChallengeAccepted {
            challenge: challenge.key(),
            opponent: ctx.accounts.opponent.key(),
            total_pool_lamports: new_pool,
        });

        Ok(())
    }

    /// Either participant may flag a challenge as disputed, locking settlement until authorized review.
    pub fn raise_dispute(ctx: Context<ParticipantAction>) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        let actor = ctx.accounts.participant.key();

        require!(
            actor == challenge.creator || challenge.opponent == Some(actor),
            EscrowError::UnauthorizedParticipant
        );
        require!(
            challenge.status == ChallengeStatus::Active || challenge.status == ChallengeStatus::UnderReview,
            EscrowError::InvalidChallengeState
        );
        require!(!challenge.is_settled, EscrowError::AlreadySettled);

        challenge.status = ChallengeStatus::Disputed;

        emit!(ChallengeDisputed {
            challenge: challenge.key(),
            raised_by: actor,
        });

        Ok(())
    }

    /// Authorized resolution releases the pooled funds from the Vault PDA directly to the verified winner.
    pub fn resolve_challenge(ctx: Context<ResolveChallenge>, winner: Pubkey) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;

        require!(!challenge.is_settled, EscrowError::AlreadySettled);
        require!(
            challenge.status == ChallengeStatus::Active
                || challenge.status == ChallengeStatus::UnderReview
                || challenge.status == ChallengeStatus::Disputed,
            EscrowError::InvalidChallengeState
        );

        let opponent = challenge.opponent.ok_or(EscrowError::ChallengeNotAccepted)?;
        require!(
            winner == challenge.creator || winner == opponent,
            EscrowError::InvalidWinner
        );
        require!(ctx.accounts.winner_account.key() == winner, EscrowError::WinnerAccountMismatch);

        let payout = challenge.total_pool_lamports;
        require!(ctx.accounts.vault.lamports() >= payout, EscrowError::InsufficientVaultBalance);

        // State mutation before transfer (checks-effects-interactions)
        challenge.is_settled = true;
        challenge.winner = Some(winner);
        challenge.status = ChallengeStatus::Completed;

        let challenge_key = challenge.key();
        let vault_seeds: &[&[u8]] = &[
            b"vault",
            challenge_key.as_ref(),
            &[challenge.vault_bump],
        ];
        let signer_seeds = &[vault_seeds];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.winner_account.to_account_info(),
            },
            signer_seeds,
        );
        system_program::transfer(cpi_ctx, payout)?;

        emit!(ChallengeResolved {
            challenge: challenge.key(),
            winner,
            payout_lamports: payout,
        });

        Ok(())
    }

    /// Creator can cancel an Open challenge only if no opponent has joined and refund their stake.
    pub fn cancel_open_challenge(ctx: Context<CancelChallenge>) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;

        require!(!challenge.is_settled, EscrowError::AlreadySettled);
        require!(challenge.status == ChallengeStatus::Open, EscrowError::InvalidChallengeState);
        require!(challenge.opponent.is_none(), EscrowError::ChallengeAlreadyAccepted);
        require!(ctx.accounts.creator.key() == challenge.creator, EscrowError::UnauthorizedParticipant);

        let refund = challenge.stake_lamports;
        require!(ctx.accounts.vault.lamports() >= refund, EscrowError::InsufficientVaultBalance);

        challenge.is_settled = true;
        challenge.status = ChallengeStatus::Cancelled;

        let challenge_key = challenge.key();
        let vault_seeds: &[&[u8]] = &[
            b"vault",
            challenge_key.as_ref(),
            &[challenge.vault_bump],
        ];
        let signer_seeds = &[vault_seeds];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.creator.to_account_info(),
            },
            signer_seeds,
        );
        system_program::transfer(cpi_ctx, refund)?;

        emit!(ChallengeCancelled {
            challenge: challenge.key(),
            creator: challenge.creator,
            refund_lamports: refund,
        });

        Ok(())
    }

    /// Refunds stakes if the challenge expired without settlement.
    pub fn refund_expired_challenge(ctx: Context<RefundExpired>) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        let clock = Clock::get()?;

        require!(!challenge.is_settled, EscrowError::AlreadySettled);
        require!(clock.unix_timestamp >= challenge.expires_at, EscrowError::NotExpiredYet);

        let stake = challenge.stake_lamports;
        challenge.is_settled = true;
        challenge.status = ChallengeStatus::Refunded;

        let challenge_key = challenge.key();
        let vault_seeds: &[&[u8]] = &[
            b"vault",
            challenge_key.as_ref(),
            &[challenge.vault_bump],
        ];
        let signer_seeds = &[vault_seeds];

        // Refund creator
        let cpi_creator = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.creator_account.to_account_info(),
            },
            signer_seeds,
        );
        system_program::transfer(cpi_creator, stake)?;

        // If opponent joined, refund opponent too
        if let Some(opp_key) = challenge.opponent {
            require!(ctx.accounts.opponent_account.key() == opp_key, EscrowError::UnauthorizedParticipant);
            let cpi_opp = CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.opponent_account.to_account_info(),
                },
                signer_seeds,
            );
            system_program::transfer(cpi_opp, stake)?;
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 2 + 1,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, EscrowConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(challenge_id: String)]
pub struct CreateChallenge<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + (4 + 32) + 32 + 33 + 33 + 8 + 8 + 1 + 1 + 8 + 1 + 1 + 1,
        seeds = [b"challenge", creator.key().as_ref(), challenge_id.as_bytes()],
        bump
    )]
    pub challenge: Account<'info, ChallengeAccount>,
    /// CHECK: PDA Vault holding lamports strictly for this challenge.
    #[account(
        mut,
        seeds = [b"vault", challenge.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptChallenge<'info> {
    #[account(mut)]
    pub challenge: Account<'info, ChallengeAccount>,
    /// CHECK: PDA Vault verified against challenge key.
    #[account(
        mut,
        seeds = [b"vault", challenge.key().as_ref()],
        bump = challenge.vault_bump
    )]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub opponent: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ParticipantAction<'info> {
    #[account(mut)]
    pub challenge: Account<'info, ChallengeAccount>,
    pub participant: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResolveChallenge<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, EscrowConfig>,
    pub authority: Signer<'info>,
    #[account(mut)]
    pub challenge: Account<'info, ChallengeAccount>,
    /// CHECK: PDA Vault verified against challenge key.
    #[account(
        mut,
        seeds = [b"vault", challenge.key().as_ref()],
        bump = challenge.vault_bump
    )]
    pub vault: SystemAccount<'info>,
    /// CHECK: Verified in instruction logic against challenge.creator or challenge.opponent.
    #[account(mut)]
    pub winner_account: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelChallenge<'info> {
    #[account(mut, has_one = creator)]
    pub challenge: Account<'info, ChallengeAccount>,
    /// CHECK: PDA Vault verified against challenge key.
    #[account(
        mut,
        seeds = [b"vault", challenge.key().as_ref()],
        bump = challenge.vault_bump
    )]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RefundExpired<'info> {
    #[account(mut)]
    pub challenge: Account<'info, ChallengeAccount>,
    /// CHECK: PDA Vault verified against challenge key.
    #[account(
        mut,
        seeds = [b"vault", challenge.key().as_ref()],
        bump = challenge.vault_bump
    )]
    pub vault: SystemAccount<'info>,
    /// CHECK: Must match challenge.creator.
    #[account(mut, address = challenge.creator)]
    pub creator_account: UncheckedAccount<'info>,
    /// CHECK: Checked in instruction if opponent joined.
    #[account(mut)]
    pub opponent_account: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct EscrowConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub max_app_fee_bps: u16,
    pub bump: u8,
}

#[account]
pub struct ChallengeAccount {
    pub challenge_id: String,
    pub creator: Pubkey,
    pub opponent: Option<Pubkey>,
    pub winner: Option<Pubkey>,
    pub stake_lamports: u64,
    pub total_pool_lamports: u64,
    pub category_code: u8,
    pub status: ChallengeStatus,
    pub expires_at: i64,
    pub is_settled: bool,
    pub bump: u8,
    pub vault_bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ChallengeStatus {
    Open,
    Active,
    UnderReview,
    Disputed,
    Completed,
    Cancelled,
    Refunded,
}

#[event]
pub struct ChallengeCreated {
    pub challenge: Pubkey,
    pub creator: Pubkey,
    pub stake_lamports: u64,
    pub expires_at: i64,
}

#[event]
pub struct ChallengeAccepted {
    pub challenge: Pubkey,
    pub opponent: Pubkey,
    pub total_pool_lamports: u64,
}

#[event]
pub struct ChallengeDisputed {
    pub challenge: Pubkey,
    pub raised_by: Pubkey,
}

#[event]
pub struct ChallengeResolved {
    pub challenge: Pubkey,
    pub winner: Pubkey,
    pub payout_lamports: u64,
}

#[event]
pub struct ChallengeCancelled {
    pub challenge: Pubkey,
    pub creator: Pubkey,
    pub refund_lamports: u64,
}

#[error_code]
pub enum EscrowError {
    #[msg("Challenge ID must be between 1 and 32 characters.")]
    InvalidChallengeId,
    #[msg("Stake amount must be greater than zero.")]
    InvalidStakeAmount,
    #[msg("Selected category is disabled at protocol level.")]
    CategoryDisabled,
    #[msg("Challenge expiration must be in the future.")]
    ChallengeExpired,
    #[msg("Challenge is not in a valid state for this instruction.")]
    InvalidChallengeState,
    #[msg("Challenge has already been accepted.")]
    ChallengeAlreadyAccepted,
    #[msg("Creator cannot accept their own challenge.")]
    CannotChallengeSelf,
    #[msg("Arithmetic overflow occurred.")]
    ArithmeticOverflow,
    #[msg("Signer is not an authorized participant.")]
    UnauthorizedParticipant,
    #[msg("Challenge has already been settled.")]
    AlreadySettled,
    #[msg("Challenge has no opponent yet.")]
    ChallengeNotAccepted,
    #[msg("Winner must be either the creator or accepted opponent.")]
    InvalidWinner,
    #[msg("Provided winner account does not match winner pubkey.")]
    WinnerAccountMismatch,
    #[msg("Insufficient funds in PDA vault.")]
    InsufficientVaultBalance,
    #[msg("Challenge has not expired yet.")]
    NotExpiredYet,
    #[msg("App fee exceeds protocol maximum of 500 bps (5%).")]
    FeeExceedsCap,
}
