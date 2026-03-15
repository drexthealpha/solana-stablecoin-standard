#![allow(unused_variables)]

mod errors;
mod instructions;
mod state;

use anchor_lang::prelude::*;
use anchor_spl::token_2022::Token2022;
use anchor_spl::token_interface::{Mint, TokenAccount};

use errors::StablecoinError;
use instructions::{
    AcceptAuthority, AddToBlacklist, BurnTokens, FreezeAccount, Initialize,
    InitializeExtraAccountMetaList, MintTokens, Pause, RemoveFromBlacklist, Seize,
    SetMinterAllowance, ThawAccount, Unpause, UpdateRoles,
};
use state::{BlacklistEntry, InitializeArgs, MinterAllowance, StablecoinConfig, UpdateRolesArgs};

declare_id!("2N19eMKD2xGpjNzfktVCPnkrbGJZAzuDFoH7SJtQiNm9");

#[program]
pub mod stablecoin {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, decimals: u8, args: InitializeArgs) -> Result<()> {
        if args.name.chars().count() > 32 {
            return err!(StablecoinError::InvalidStringLength);
        }
        if args.symbol.chars().count() > 10 {
            return err!(StablecoinError::InvalidStringLength);
        }
        if args.uri.chars().count() > 200 {
            return err!(StablecoinError::InvalidStringLength);
        }

        let config = &mut ctx.accounts.config;
        config.name = args.name;
        config.symbol = args.symbol;
        config.uri = args.uri;
        config.decimals = decimals;
        config.master_authority = args.master_authority;
        config.pending_master_authority = None;
        config.master_minter = args.master_minter;
        config.blacklister = args.blacklister;
        config.pauser = args.pauser;
        config.is_paused = false;
        config.enable_permanent_delegate = args.enable_permanent_delegate;
        config.enable_transfer_hook = args.enable_transfer_hook;
        config.default_account_frozen = args.default_account_frozen;
        config.bump = ctx.bumps.config;

        Ok(())
    }

    pub fn mint(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        if amount == 0 {
            return err!(StablecoinError::InvalidAmount);
        }

        if ctx.accounts.config.is_paused {
            return err!(StablecoinError::Unauthorized);
        }

        let minter_key = ctx.accounts.minter.key();

        let allowance = if minter_key == ctx.accounts.config.master_minter {
            u64::MAX
        } else {
            ctx.accounts.minter_pda.allowance
        };

        if allowance != u64::MAX {
            if ctx.accounts.minter_pda.allowance < amount {
                return err!(StablecoinError::AllowanceExceeded);
            }
            ctx.accounts.minter_pda.allowance = ctx
                .accounts
                .minter_pda
                .allowance
                .checked_sub(amount)
                .ok_or(StablecoinError::OverflowError)?;
        }

        ctx.accounts.minter_pda.bump = ctx.bumps.minter_pda;

        ctx.accounts.config.total_supply = ctx
            .accounts
            .config
            .total_supply
            .checked_add(amount)
            .ok_or(StablecoinError::OverflowError)?;

        let mint_key = ctx.accounts.mint.key();
        let bump = ctx.accounts.config.bump;
        let seeds = &[b"config".as_ref(), mint_key.as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];

        anchor_spl::token_2022::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_2022::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.destination_token.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        Ok(())
    }

    pub fn burn(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        if amount == 0 {
            return err!(StablecoinError::InvalidAmount);
        }

        if ctx.accounts.config.is_paused {
            return err!(StablecoinError::Unauthorized);
        }

        anchor_spl::token_2022::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_2022::Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.source_token.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;

        ctx.accounts.config.total_supply = ctx
            .accounts
            .config
            .total_supply
            .checked_sub(amount)
            .ok_or(StablecoinError::OverflowError)?;

        Ok(())
    }

    pub fn freeze_account(ctx: Context<FreezeAccount>) -> Result<()> {
        if ctx.accounts.config.is_paused {
            return err!(StablecoinError::Unauthorized);
        }

        if ctx.accounts.config.blacklister != ctx.accounts.signer.key() {
            return err!(StablecoinError::Unauthorized);
        }

        let mint_key = ctx.accounts.mint.key();
        let bump = ctx.accounts.config.bump;
        let seeds = &[b"config".as_ref(), mint_key.as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];

        anchor_spl::token_2022::freeze_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_2022::FreezeAccount {
                mint: ctx.accounts.mint.to_account_info(),
                account: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            signer_seeds,
        ))?;

        Ok(())
    }

    pub fn thaw_account(ctx: Context<ThawAccount>) -> Result<()> {
        if ctx.accounts.config.is_paused {
            return err!(StablecoinError::Unauthorized);
        }

        if ctx.accounts.config.blacklister != ctx.accounts.signer.key() {
            return err!(StablecoinError::Unauthorized);
        }

        let mint_key = ctx.accounts.mint.key();
        let bump = ctx.accounts.config.bump;
        let seeds = &[b"config".as_ref(), mint_key.as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];

        anchor_spl::token_2022::thaw_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_2022::ThawAccount {
                mint: ctx.accounts.mint.to_account_info(),
                account: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            signer_seeds,
        ))?;

        Ok(())
    }

    pub fn pause(ctx: Context<Pause>) -> Result<()> {
        if ctx.accounts.config.pauser != ctx.accounts.signer.key() {
            return err!(StablecoinError::Unauthorized);
        }
        ctx.accounts.config.is_paused = true;
        Ok(())
    }

    pub fn unpause(ctx: Context<Unpause>) -> Result<()> {
        if ctx.accounts.config.pauser != ctx.accounts.signer.key() {
            return err!(StablecoinError::Unauthorized);
        }
        ctx.accounts.config.is_paused = false;
        Ok(())
    }

    pub fn update_roles(ctx: Context<UpdateRoles>, args: UpdateRolesArgs) -> Result<()> {
        if ctx.accounts.config.master_authority != ctx.accounts.signer.key() {
            return err!(StablecoinError::Unauthorized);
        }

        if let Some(new_master_authority) = args.new_master_authority {
            ctx.accounts.config.pending_master_authority = Some(new_master_authority);
        }
        if let Some(new_master_minter) = args.new_master_minter {
            ctx.accounts.config.master_minter = new_master_minter;
        }
        if let Some(new_blacklister) = args.new_blacklister {
            ctx.accounts.config.blacklister = new_blacklister;
        }
        if let Some(new_pauser) = args.new_pauser {
            ctx.accounts.config.pauser = new_pauser;
        }

        Ok(())
    }

    pub fn accept_authority(ctx: Context<AcceptAuthority>) -> Result<()> {
        let config = &mut ctx.accounts.config;

        if Some(ctx.accounts.signer.key()) != config.pending_master_authority {
            return err!(StablecoinError::Unauthorized);
        }

        config.master_authority = ctx.accounts.signer.key();
        config.pending_master_authority = None;

        Ok(())
    }

    pub fn add_to_blacklist(ctx: Context<AddToBlacklist>) -> Result<()> {
        let config = &ctx.accounts.config;

        if !config.enable_permanent_delegate {
            return err!(StablecoinError::NotCompliantStablecoin);
        }

        if config.blacklister != ctx.accounts.signer.key() {
            return err!(StablecoinError::Unauthorized);
        }

        ctx.accounts.blacklist_entry.is_blacklisted = true;
        ctx.accounts.blacklist_entry.bump = ctx.bumps.blacklist_entry;
        Ok(())
    }

    pub fn remove_from_blacklist(ctx: Context<RemoveFromBlacklist>) -> Result<()> {
        let config = &ctx.accounts.config;

        if !config.enable_permanent_delegate {
            return err!(StablecoinError::NotCompliantStablecoin);
        }

        if config.blacklister != ctx.accounts.signer.key() {
            return err!(StablecoinError::Unauthorized);
        }

        ctx.accounts.blacklist_entry.is_blacklisted = false;
        Ok(())
    }

    pub fn seize(ctx: Context<Seize>, amount: u64) -> Result<()> {
        let config = &ctx.accounts.config;

        if !config.enable_permanent_delegate {
            return err!(StablecoinError::NotCompliantStablecoin);
        }

        if config.blacklister != ctx.accounts.signer.key() {
            return err!(StablecoinError::Unauthorized);
        }

        if !ctx.accounts.source_token.is_frozen() {
            return err!(StablecoinError::AccountNotFrozen);
        }

        if amount == 0 {
            return err!(StablecoinError::InvalidAmount);
        }

        let mint_key = ctx.accounts.mint.key();
        let bump = ctx.accounts.config.bump;
        let decimals = config.decimals;
        let seeds = &[b"config".as_ref(), mint_key.as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];

        anchor_spl::token_2022::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_2022::TransferChecked {
                    from: ctx.accounts.source_token.to_account_info(),
                    to: ctx.accounts.destination_token.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
            decimals,
        )?;

        Ok(())
    }

    pub fn set_minter_allowance(ctx: Context<SetMinterAllowance>, allowance: u64) -> Result<()> {
        if ctx.accounts.config.master_authority != ctx.accounts.signer.key() {
            return err!(StablecoinError::Unauthorized);
        }

        ctx.accounts.minter_allowance.allowance = allowance;
        Ok(())
    }

    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccountMetaList>,
    ) -> Result<()> {
        if ctx.accounts.config.master_authority != ctx.accounts.signer.key() {
            return err!(StablecoinError::Unauthorized);
        }
        Ok(())
    }
}
