#[trident_fuzz]
fn fuzz_mint(client: &mut impl FuzzClient, accounts: &mut FuzzAccounts) {
    let amount = u64::arbitrary(input).unwrap_or(0);
    if let Err(e) = client.process_instruction(mint_ix(amount, accounts)) {
        assert!(e.to_string().contains("overflow") || e.to_string().contains("allowance"));
    }
}
