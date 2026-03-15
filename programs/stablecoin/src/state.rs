use anchor_lang::prelude::*;

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
