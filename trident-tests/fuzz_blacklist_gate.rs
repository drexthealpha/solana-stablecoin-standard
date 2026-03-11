#[trident_fuzz]
fn fuzz_blacklist_gate(client: &mut impl FuzzClient, accounts: &mut FuzzAccounts) {
    // SSS-1 preset has enable_permanent_delegate=false
    // Every call to add_to_blacklist must return NotCompliantStablecoin
    let result = client.process_instruction(add_to_blacklist_ix(accounts));
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("NotCompliantStablecoin"));
}
