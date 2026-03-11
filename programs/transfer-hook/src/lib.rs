use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta, seeds::Seed, state::ExtraAccountMetaList,
};
use spl_transfer_hook_interface::instruction::ExecuteInstruction;

declare_id!("PQgUt1swYzA9RSAG7gpyTQpk9TtbVReX11ytkeYTJBo");

// Must match the stablecoin program ID exactly
pub const STABLECOIN_PROGRAM_ID: Pubkey =
    solana_program::pubkey!("2N19eMKD2xGpjNzfktVCPnkrbGJZAzuDFoH7SJtQiNm9");

#[error_code]
pub enum HookError {
    #[msg("Transfer blocked: source address is blacklisted")]
    SourceBlacklisted,
    #[msg("Transfer blocked: destination address is blacklisted")]
    DestinationBlacklisted,
}

/// Mirrors the BlacklistEntry account from the stablecoin program
#[account]
pub struct BlacklistEntry {
    pub is_blacklisted: bool,
    pub bump: u8,
}

#[program]
pub mod transfer_hook {
    use super::*;

    /// Called by Token-2022 on every transfer.
    /// Checks both source owner and destination owner against the blacklist.
    pub fn execute(ctx: Context<Execute>, _amount: u64) -> Result<()> {
        // Check source owner blacklist entry
        if ctx.accounts.source_blacklist_entry.is_blacklisted {
            return err!(HookError::SourceBlacklisted);
        }
        // Check destination owner blacklist entry
        if ctx.accounts.destination_blacklist_entry.is_blacklisted {
            return err!(HookError::DestinationBlacklisted);
        }
        Ok(())
    }

    /// Registers the extra accounts (blacklist PDAs) that Token-2022
    /// must pass into every execute call.
    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccountMetaList>,
    ) -> Result<()> {
        // Extra account 0: source owner blacklist PDA (from stablecoin program)
        // Seeds: ["blacklist", mint, source_token_owner]
        // Extra account 1: destination owner blacklist PDA (from stablecoin program)
        // Seeds: ["blacklist", mint, destination_token_owner]
        let account_metas = vec![
            // source blacklist PDA
            ExtraAccountMeta::new_with_seeds(
                &[
                    Seed::Literal {
                        bytes: b"blacklist".to_vec(),
                    },
                    Seed::AccountKey { index: 1 }, // mint is index 1 in execute accounts
                    Seed::AccountKey { index: 3 }, // owner is index 3 in execute accounts
                ],
                false, // not a signer
                false, // not writable
            )?,
            // destination blacklist PDA
            ExtraAccountMeta::new_with_seeds(
                &[
                    Seed::Literal {
                        bytes: b"blacklist".to_vec(),
                    },
                    Seed::AccountKey { index: 1 }, // mint
                    Seed::AccountKey { index: 4 }, // destination owner
                ],
                false,
                false,
            )?,
        ];

        let account_size = ExtraAccountMetaList::size_of(account_metas.len())? as usize;
        let lamports = Rent::get()?.minimum_balance(account_size);

        let mint_key = ctx.accounts.mint.key();
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"extra-account-metas",
            mint_key.as_ref(),
            &[ctx.bumps.extra_account_meta_list],
        ]];

        // Allocate the extra account meta list account
        solana_program::program::invoke_signed(
            &solana_program::system_instruction::create_account(
                ctx.accounts.payer.key,
                ctx.accounts.extra_account_meta_list.key,
                lamports,
                account_size as u64,
                ctx.program_id,
            ),
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.extra_account_meta_list.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;

        // Write the extra account metas into the account
        let mut data = ctx.accounts.extra_account_meta_list.try_borrow_mut_data()?;
        ExtraAccountMetaList::init::<ExecuteInstruction>(&mut data, &account_metas)?;

        Ok(())
    }
}

/// Accounts for the execute instruction.
/// Token-2022 always passes: [source_token, mint, destination_token, owner/authority]
/// then our extra accounts appended after.
#[derive(Accounts)]
pub struct Execute<'info> {
    /// The source token account
    pub source_token: UncheckedAccount<'info>,
    /// The mint
    pub mint: InterfaceAccount<'info, Mint>,
    /// The destination token account
    pub destination_token: UncheckedAccount<'info>,
    /// The source token account owner/authority
    /// CHECK: used only as PDA seed
    pub source_owner: UncheckedAccount<'info>,
    /// The destination token account owner
    /// CHECK: used only as PDA seed  
    pub destination_owner: UncheckedAccount<'info>,
    /// Extra account meta list (validated by Token-2022)
    /// CHECK: validated by spl_transfer_hook_interface
    #[account(
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump
    )]
    pub extra_account_meta_list: UncheckedAccount<'info>,
    /// Source owner blacklist PDA — owned by stablecoin program
    #[account(
        seeds = [
            b"blacklist",
            mint.key().as_ref(),
            source_owner.key().as_ref()
        ],
        bump = source_blacklist_entry.bump,
        seeds::program = STABLECOIN_PROGRAM_ID
    )]
    pub source_blacklist_entry: Account<'info, BlacklistEntry>,
    /// Destination owner blacklist PDA — owned by stablecoin program
    #[account(
        seeds = [
            b"blacklist",
            mint.key().as_ref(),
            destination_owner.key().as_ref()
        ],
        bump = destination_blacklist_entry.bump,
        seeds::program = STABLECOIN_PROGRAM_ID
    )]
    pub destination_blacklist_entry: Account<'info, BlacklistEntry>,
}

#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: PDA managed manually for ExtraAccountMetaList
    #[account(
        mut,
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump
    )]
    pub extra_account_meta_list: AccountInfo<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub system_program: Program<'info, System>,
}
