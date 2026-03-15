use crate::state::{InitializeArgs, StablecoinConfig};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount};

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
    pub token_program: Program<'info, anchor_spl::token_2022::Token2022>,
}
