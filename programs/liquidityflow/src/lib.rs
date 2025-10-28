//! LiquidityFlow Program
//! On-chain swap execution and MEV protection for Solana

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("LiFy1234567890abcdefghijklmnopqrstuv");

#[program]
pub mod liquidityflow {
    use super::*;

    /// Initialize the swap executor
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let swap_executor = &mut ctx.accounts.swap_executor;
        swap_executor.authority = ctx.accounts.authority.key();
        swap_executor.is_active = true;
        msg!("Swap Executor initialized");
        Ok(())
    }

    /// Execute a swap
    pub fn execute_swap(ctx: Context<ExecuteSwap>, amount: u64, min_output: u64) -> Result<()> {
        let swap_executor = &ctx.accounts.swap_executor;
        
        // Verify swap executor is active
        require!(
            swap_executor.is_active,
            LiquidityFlowError::SwapExecutorInactive
        );

        // Transfer tokens
        let cpi_accounts = Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Check output amount meets minimum
        require!(
            ctx.accounts.to.amount >= min_output,
            LiquidityFlowError::SlippageExceeded
        );

        msg!("Swap executed: {} tokens", amount);
        Ok(())
    }

    /// Set up MEV protection
    pub fn setup_mev_protection(ctx: Context<SetupMevProtection>) -> Result<()> {
        let mev_protector = &mut ctx.accounts.mev_protector;
        mev_protector.authority = ctx.accounts.authority.key();
        mev_protector.max_slippage_bps = 100; // 1% default
        mev_protector.is_active = true;
        msg!("MEV Protection initialized");
        Ok(())
    }

    /// Validate transaction for MEV protection
    pub fn validate_for_mev(ctx: Context<ValidateMev>, expected_output: u64) -> Result<()> {
        let mev_protector = &ctx.accounts.mev_protector;
        
        require!(
            mev_protector.is_active,
            LiquidityFlowError::MevProtectorInactive
        );

        // Check slippage protection
        let actual_output = ctx.accounts.output_account.amount;
        let slippage_bps = 
            ((actual_output as i64 - expected_output as i64) * 10000) / expected_output as i64;
        
        require!(
            slippage_bps >= -(mev_protector.max_slippage_bps as i64),
            LiquidityFlowError::SlippageExceeded
        );

        msg!("MEV validation passed");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + SwapExecutor::LEN
    )]
    pub swap_executor: Account<'info, SwapExecutor>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteSwap<'info> {
    #[account(
        seeds = [b"swap_executor"],
        bump
    )]
    pub swap_executor: Account<'info, SwapExecutor>,
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SetupMevProtection<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + MevProtector::LEN
    )]
    pub mev_protector: Account<'info, MevProtector>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ValidateMev<'info> {
    #[account(
        seeds = [b"mev_protector"],
        bump
    )]
    pub mev_protector: Account<'info, MevProtector>,
    pub output_account: Account<'info, TokenAccount>,
}

#[account]
pub struct SwapExecutor {
    pub authority: Pubkey,
    pub is_active: bool,
}

impl SwapExecutor {
    pub const LEN: usize = 32 + 1; // authority + is_active
}

#[account]
pub struct MevProtector {
    pub authority: Pubkey,
    pub max_slippage_bps: u16,
    pub is_active: bool,
}

impl MevProtector {
    pub const LEN: usize = 32 + 2 + 1; // authority + max_slippage_bps + is_active
}

#[error_code]
pub enum LiquidityFlowError {
    #[msg("Swap executor is inactive")]
    SwapExecutorInactive,
    #[msg("MEV protector is inactive")]
    MevProtectorInactive,
    #[msg("Slippage exceeded")]
    SlippageExceeded,
}

