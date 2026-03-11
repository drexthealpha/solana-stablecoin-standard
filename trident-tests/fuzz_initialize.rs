#[trident_fuzz]
fn fuzz_initialize(client: &mut impl FuzzClient, accounts: &mut FuzzAccounts) {
    let name = String::arbitrary(input).unwrap_or_default();
    let symbol = String::arbitrary(input).unwrap_or_default();
    let decimals = u8::arbitrary(input).unwrap_or(6);
    let _ = client.process_instruction(initialize_ix(name, symbol, decimals, accounts));
    // config PDA must always be derivable — no panics allowed
}
