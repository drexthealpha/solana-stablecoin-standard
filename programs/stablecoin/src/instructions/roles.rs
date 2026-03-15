use crate::state::{MinterAllowance, StablecoinConfig, UpdateRolesArgs};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

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
