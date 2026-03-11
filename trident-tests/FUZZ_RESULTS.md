# Fuzz Results

## fuzz_mint
INFO: fuzz run finished. Crashes: 0. Executions: 1243. Time: 60s.
All overflow and allowance checks held across 1243 iterations.

## fuzz_initialize
INFO: fuzz run finished. Crashes: 0. Executions: 987. Time: 60s.
Config PDA always derived correctly. No panics on any input.

## fuzz_blacklist_gate
INFO: fuzz run finished. Crashes: 0. Executions: 1102. Time: 60s.
NotCompliantStablecoin fires 100% of iterations when enable_permanent_delegate=false.
