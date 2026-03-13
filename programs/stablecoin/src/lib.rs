#![allow(unused_variables)]
use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::Token2022,
    token_interface::{Mint, TokenAccount},
};

declare_id!("2N19eMKD2xGpjNzfktVCPnkrbGJZAzuDFoH7SJtQiNm9");

#[error_code]
pub enum StablecoinError {
    #[msg("Unauthorized: caller does not have the required authority")]
    Unauthorized,
    #[msg("Not Compliant Stablecoin: SSS-2 feature not enabled")]
    NotCompliantStablecoin,
    #[msg("Overflow Error: arithmetic overflow occurred")]
    OverflowError,
    #[msg("Account Not Frozen: account must be frozen before seize")]
    AccountNotFrozen,
    #[msg("Invalid Amount: amount must be greater than zero")]
    InvalidAmount,
    #[msg("Allowance Exceeded: mint allowance exceeded")]
    AllowanceExceeded,
    #[msg("Invalid String Length: string exceeds maximum character limit")]
    InvalidStringLength,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeArgs {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub master_authority: Pubkey,
    pub master_minter: Pubkey,
    pub blacklister: Pubkey,
    pub pauser: Pubkey,
    pub enable_permanent_delegate: bool,
    pub enable_transfer_hook: bool,
    pub default_account_frozen: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateRolesArgs {
    pub new_master_authority: Option<Pubkey>,
    pub new_master_minter: Option<Pubkey>,
    pub new_blacklister: Option<Pubkey>,
    pub new_pauser: Option<Pubkey>,
}

#[account]
#[derive(InitSpace)]
pub struct StablecoinConfig {
    #[max_len(32)]
    pub name: String,
    #[max_len(10)]
    pub symbol: String,
    #[max_len(200)]
    pub uri: String,
    pub decimals: u8,
    pub master_authority: Pubkey,
    pub pending_master_authority: Option<Pubkey>,
    pub master_minter: Pubkey,
    pub blacklister: Pubkey,
    pub pauser: Pubkey,
    pub is_paused: bool,
    pub total_supply: u64,
    pub enable_permanent_delegate: bool,
    pub enable_transfer_hook: bool,
    pub default_account_frozen: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct MinterAllowance {
    pub allowance: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BlacklistEntry {
    pub is_blacklisted: bool,
    pub bump: u8,
}

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

#[derive(Accounts)]
#[instruction(decimals: u8)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [b"config", mint.key().as_ref()],
        bump,
        space = 8 + StablecoinConfig::INIT_SPACE
    )]
    pub config: Account<'info, StablecoinConfig>,
    #[account(
        init,
        payer = payer,
        mint::authority = config,
        mint::freeze_authority = config,
        mint::decimals = decimals
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(
        mut,
        seeds = [b"config", mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, StablecoinConfig>,
    #[account(mut)] // FIXED: mint_to CPI must write to mint to update supply
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init_if_needed,
        seeds = [b"minter", mint.key().as_ref(), minter.key().as_ref()],
        bump,
        space = 8 + MinterAllowance::INIT_SPACE,
        payer = payer
    )]
    pub minter_pda: Account<'info, MinterAllowance>,
    pub minter: Signer<'info>,
    #[account(mut, token::mint = mint)]
    pub destination_token: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(
        mut,
        seeds = [b"config", mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, StablecoinConfig>,
    #[account(mut)] // FIXED: burn CPI must write to mint to update supply
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, token::mint = mint)]
    pub source_token: InterfaceAccount<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct FreezeAccount<'info> {
    #[account(
        mut,
        seeds = [b"config", mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, StablecoinConfig>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, token::mint = mint)]
    pub token_account: InterfaceAccount<'info, TokenAccount>,
    pub signer: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct ThawAccount<'info> {
    #[account(
        mut,
        seeds = [b"config", mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, StablecoinConfig>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, token::mint = mint)]
    pub token_account: InterfaceAccount<'info, TokenAccount>,
    pub signer: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct Pause<'info> {
    #[account(
        mut,
        seeds = [b"config", mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, StablecoinConfig>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct Unpause<'info> {
    #[account(
        mut,
        seeds = [b"config", mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, StablecoinConfig>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateRoles<'info> {
    #[account(
        mut,
        seeds = [b"config", mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, StablecoinConfig>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct AcceptAuthority<'info> {
    #[account(
        mut,
        seeds = [b"config", mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, StablecoinConfig>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct AddToBlacklist<'info> {
    #[account(
        mut,
        seeds = [b"config", mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, StablecoinConfig>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        seeds = [b"blacklist", mint.key().as_ref(), target_address.key().as_ref()],
        bump,
        space = 8 + BlacklistEntry::INIT_SPACE,
        payer = payer
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,
    /// CHECK: target address is only used as a seed for PDA derivation
    pub target_address: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveFromBlacklist<'info> {
    #[account(
        mut,
        seeds = [b"config", mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, StablecoinConfig>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        seeds = [b"blacklist", mint.key().as_ref(), target_address.key().as_ref()],
        bump = blacklist_entry.bump
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,
    /// CHECK: target address is only used as a seed for PDA derivation
    pub target_address: UncheckedAccount<'info>,
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct Seize<'info> {
    #[account(
        mut,
        seeds = [b"config", mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, StablecoinConfig>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, token::mint = mint)]
    pub source_token: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint = mint)]
    pub destination_token: InterfaceAccount<'info, TokenAccount>,
    pub signer: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct SetMinterAllowance<'info> {
    #[account(
        mut,
        seeds = [b"config", mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, StablecoinConfig>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init_if_needed,
        seeds = [b"minter", mint.key().as_ref(), minter.key().as_ref()],
        bump,
        space = 8 + MinterAllowance::INIT_SPACE,
        payer = payer
    )]
    pub minter_allowance: Account<'info, MinterAllowance>,
    /// CHECK: minter address is only used as a seed for PDA derivation
    pub minter: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    #[account(
        mut,
        seeds = [b"config", mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, StablecoinConfig>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub signer: Signer<'info>,
    #[account(
        init,
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump,
        space = 8 + 1024,
        payer = payer
    )]
    /// CHECK: extra account meta list for transfer hook
    pub extra_account_meta_list: AccountInfo<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub system_program: Program<'info, System>,
}
