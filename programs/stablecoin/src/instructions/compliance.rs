use crate::state::{BlacklistEntry, StablecoinConfig};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount};

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
    pub token_program: Program<'info, anchor_spl::token_2022::Token2022>,
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
