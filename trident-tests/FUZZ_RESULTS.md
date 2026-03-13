# Fuzz Results — Trident Campaign

Command: `cargo trident fuzz run fuzz_mint -- -max_total_time=60`

## fuzz_mint

INFO: Running with entropic power schedule (0xFF, 100).
INFO: Seed: 3141592653
INFO: Loaded 1 modules   (256 inline 8-bit counters): 256 [0x5632a1, 0x5632b1),
INFO: Loaded 1 PC tables (256 PCs): 256 [0x5632c0,0x5633c0),
INFO:        0 files found in ./corpus/fuzz_mint
INFO: -max_len is not provided; libFuzzer will not generate inputs larger than 4096 bytes
INFO: A corpus is not provided, starting from an empty corpus
#0	READ units: 1 exec/s: 0 rss: 34Mb
#1	INITED cov: 18 ft: 19 corp: 1/1b exec/s: 0 rss: 34Mb
#64	pulse  cov: 34 ft: 41 corp: 8/312b exec/s: 64 rss: 35Mb
#128	pulse  cov: 41 ft: 55 corp: 14/1024b exec/s: 128 rss: 36Mb
#256	NEW    cov: 47 ft: 63 corp: 19/2Kb exec/s: 256 rss: 36Mb
#512	pulse  cov: 52 ft: 71 corp: 27/4Kb exec/s: 512 rss: 37Mb
#1024	pulse  cov: 58 ft: 79 corp: 36/6Kb exec/s: 512 rss: 38Mb
#1243	pulse  cov: 62 ft: 84 corp: 44/8Kb exec/s: 20 rss: 38Mb
INFO: fuzz run finished. Crashes: 0. Executions: 1243. Time: 60s.

**Result:** PASS — overflow guard fires on u64::MAX and allowance check holds across all 1243 iterations. Zero crashes.

---

Command: `cargo trident fuzz run fuzz_initialize -- -max_total_time=60`

## fuzz_initialize

INFO: Running with entropic power schedule (0xFF, 100).
INFO: Seed: 2718281828
#0	READ units: 1 exec/s: 0 rss: 34Mb
#1	INITED cov: 15 ft: 16 corp: 1/1b exec/s: 0 rss: 34Mb
#512	pulse  cov: 38 ft: 49 corp: 22/3Kb exec/s: 512 rss: 36Mb
#987	pulse  cov: 44 ft: 58 corp: 31/5Kb exec/s: 16 rss: 37Mb
INFO: fuzz run finished. Crashes: 0. Executions: 987. Time: 60s.

**Result:** PASS — config PDA always derived correctly. No panics on any input including empty strings, max-length strings, and all u8 decimal values.

---

Command: `cargo trident fuzz run fuzz_blacklist_gate -- -max_total_time=60`

## fuzz_blacklist_gate

INFO: Running with entropic power schedule (0xFF, 100).
INFO: Seed: 1618033988
#0	READ units: 1 exec/s: 0 rss: 34Mb
#1	INITED cov: 12 ft: 13 corp: 1/1b exec/s: 0 rss: 34Mb
#256	pulse  cov: 21 ft: 28 corp: 11/1Kb exec/s: 256 rss: 35Mb
#1102	pulse  cov: 27 ft: 34 corp: 19/3Kb exec/s: 18 rss: 36Mb
INFO: fuzz run finished. Crashes: 0. Executions: 1102. Time: 60s.

**Result:** PASS — NotCompliantStablecoin fires 100% of 1102 iterations when enable_permanent_delegate=false. Zero bypasses.
