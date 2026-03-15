use anchor_lang::prelude::*;

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
