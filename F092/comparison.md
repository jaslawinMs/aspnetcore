# F092 actual TestHost response read comparisons

Positive timing changes mean slower. All three unchanged-strategy comparisons, controls, regressions and raw samples are retained.

**Guaranteed-completed resource result:** all15 prepared target pairs remove exactly72B/op, from128B to56B (56.25%).
Cached/EOF and actual memory-read allocation controls are unchanged. This does not remove a required synchronous wait or establish a production-throughput gain.

| Method / profile | Pair | Before ns/op | After ns/op | Change % | Before / after B/op | Saved B/op | Max CV % |
|---|---:|---:|---:|---:|---:|---:|---:|
| PreparedSync / Cached1 (allocation control) | 1 | 174.16 | 172.85 | -0.76 | 56 / 56 | 0 | 1.10 |
| PreparedMemoryAsync / Cached1 (allocation control) | 1 | 175.98 | 175.38 | -0.35 | 56 / 56 | 0 | 5.10 |
| PublicSync / Cached1 | 1 | 83113.91 | 85860.21 | 3.30 | 9813 / 9804 | 9 | 4.85 |
| PreparedSync / Cached8 (allocation control) | 1 | 172.42 | 175.30 | 1.67 | 56 / 56 | 0 | 3.64 |
| PreparedMemoryAsync / Cached8 (allocation control) | 1 | 173.88 | 175.25 | 0.79 | 56 / 56 | 0 | 0.71 |
| PublicSync / Cached8 | 1 | 29449.57 | 29260.10 | -0.64 | 9503 / 9499 | 4 | 2.08 |
| PreparedSync / Eof (allocation control) | 1 | 31.30 | 31.01 | -0.94 | 0 / 0 | 0 | 4.22 |
| PreparedMemoryAsync / Eof (allocation control) | 1 | 29.95 | 29.32 | -2.10 | 0 / 0 | 0 | 4.64 |
| PublicSync / Eof | 1 | 29702.05 | 29464.40 | -0.80 | 9445 / 9452 | -7 | 3.36 |
| PreparedSync / Partial16 | 1 | 184.90 | 177.09 | -4.22 | 128 / 56 | 72 | 3.12 |
| PreparedMemoryAsync / Partial16 (allocation control) | 1 | 171.48 | 172.09 | 0.36 | 56 / 56 | 0 | 0.65 |
| PublicSync / Partial16 | 1 | 30130.21 | 29960.47 | -0.56 | 9585 / 9530 | 55 | 2.95 |
| PreparedSync / Uncached16 | 1 | 190.70 | 174.85 | -8.31 | 128 / 56 | 72 | 3.96 |
| PreparedMemoryAsync / Uncached16 (allocation control) | 1 | 178.42 | 177.28 | -0.64 | 56 / 56 | 0 | 5.30 |
| PublicSync / Uncached16 | 1 | 29879.07 | 29950.60 | 0.24 | 9585 / 9526 | 59 | 3.41 |
| PreparedSync / Uncached256 | 1 | 194.19 | 181.35 | -6.61 | 128 / 56 | 72 | 5.42 |
| PreparedMemoryAsync / Uncached256 (allocation control) | 1 | 174.78 | 182.78 | 4.58 | 56 / 56 | 0 | 4.33 |
| PublicSync / Uncached256 | 1 | 29761.27 | 30307.16 | 1.83 | 9589 / 9525 | 64 | 3.01 |
| PreparedSync / Uncached4096 | 1 | 253.65 | 233.48 | -7.95 | 128 / 56 | 72 | 0.64 |
| PreparedMemoryAsync / Uncached4096 (allocation control) | 1 | 249.20 | 241.23 | -3.20 | 56 / 56 | 0 | 5.02 |
| PublicSync / Uncached4096 | 1 | 31957.48 | 32063.81 | 0.33 | 9586 / 9532 | 54 | 2.48 |
| PreparedSync / Uncached9 | 1 | 191.62 | 175.23 | -8.55 | 128 / 56 | 72 | 3.46 |
| PreparedMemoryAsync / Uncached9 (allocation control) | 1 | 172.75 | 176.02 | 1.89 | 56 / 56 | 0 | 0.59 |
| PublicSync / Uncached9 | 1 | 29990.21 | 30535.33 | 1.82 | 9591 / 9530 | 61 | 3.03 |
| PreparedSync / Cached1 (allocation control) | 2 | 171.78 | 171.68 | -0.06 | 56 / 56 | 0 | 1.22 |
| PreparedMemoryAsync / Cached1 (allocation control) | 2 | 180.42 | 173.25 | -3.98 | 56 / 56 | 0 | 5.08 |
| PublicSync / Cached1 | 2 | 76945.53 | 81737.43 | 6.23 | 9812 / 9798 | 14 | 5.87 |
| PreparedSync / Cached8 (allocation control) | 2 | 175.98 | 174.36 | -0.92 | 56 / 56 | 0 | 2.42 |
| PreparedMemoryAsync / Cached8 (allocation control) | 2 | 183.20 | 174.21 | -4.90 | 56 / 56 | 0 | 1.01 |
| PublicSync / Cached8 | 2 | 28481.92 | 28197.98 | -1.00 | 9496 / 9498 | -2 | 3.56 |
| PreparedSync / Eof (allocation control) | 2 | 30.06 | 31.06 | 3.36 | 0 / 0 | 0 | 1.56 |
| PreparedMemoryAsync / Eof (allocation control) | 2 | 30.23 | 30.47 | 0.79 | 0 / 0 | 0 | 0.95 |
| PublicSync / Eof | 2 | 29470.29 | 28055.63 | -4.80 | 9444 / 9448 | -4 | 3.84 |
| PreparedSync / Partial16 | 2 | 194.73 | 171.58 | -11.89 | 128 / 56 | 72 | 1.94 |
| PreparedMemoryAsync / Partial16 (allocation control) | 2 | 178.00 | 174.62 | -1.90 | 56 / 56 | 0 | 5.04 |
| PublicSync / Partial16 | 2 | 28568.91 | 27577.58 | -3.47 | 9590 / 9526 | 64 | 2.26 |
| PreparedSync / Uncached16 | 2 | 186.61 | 173.72 | -6.91 | 128 / 56 | 72 | 2.27 |
| PreparedMemoryAsync / Uncached16 (allocation control) | 2 | 175.30 | 175.67 | 0.21 | 56 / 56 | 0 | 1.49 |
| PublicSync / Uncached16 | 2 | 29392.18 | 28289.49 | -3.75 | 9587 / 9531 | 56 | 5.10 |
| PreparedSync / Uncached256 | 2 | 190.61 | 181.58 | -4.74 | 128 / 56 | 72 | 0.86 |
| PreparedMemoryAsync / Uncached256 (allocation control) | 2 | 177.89 | 174.42 | -1.95 | 56 / 56 | 0 | 2.02 |
| PublicSync / Uncached256 | 2 | 29751.45 | 28354.29 | -4.70 | 9589 / 9528 | 61 | 4.32 |
| PreparedSync / Uncached4096 | 2 | 254.23 | 229.48 | -9.73 | 128 / 56 | 72 | 1.48 |
| PreparedMemoryAsync / Uncached4096 (allocation control) | 2 | 232.59 | 239.62 | 3.02 | 56 / 56 | 0 | 2.55 |
| PublicSync / Uncached4096 | 2 | 31557.83 | 30402.65 | -3.66 | 9583 / 9516 | 67 | 3.31 |
| PreparedSync / Uncached9 | 2 | 185.54 | 191.19 | 3.05 | 128 / 56 | 72 | 10.60 |
| PreparedMemoryAsync / Uncached9 (allocation control) | 2 | 173.22 | 175.08 | 1.07 | 56 / 56 | 0 | 1.60 |
| PublicSync / Uncached9 | 2 | 29177.29 | 28629.63 | -1.88 | 9585 / 9523 | 62 | 4.34 |
| PreparedSync / Cached1 (allocation control) | 3 | 174.63 | 233.83 | 33.90 | 56 / 56 | 0 | 33.67 |
| PreparedMemoryAsync / Cached1 (allocation control) | 3 | 172.51 | 173.60 | 0.63 | 56 / 56 | 0 | 2.38 |
| PublicSync / Cached1 | 3 | 83039.93 | 82951.52 | -0.11 | 9807 / 9835 | -28 | 4.90 |
| PreparedSync / Cached8 (allocation control) | 3 | 177.07 | 174.89 | -1.23 | 56 / 56 | 0 | 1.53 |
| PreparedMemoryAsync / Cached8 (allocation control) | 3 | 175.23 | 171.25 | -2.27 | 56 / 56 | 0 | 1.45 |
| PublicSync / Cached8 | 3 | 28348.08 | 29075.94 | 2.57 | 9504 / 9503 | 1 | 4.50 |
| PreparedSync / Eof (allocation control) | 3 | 31.14 | 30.63 | -1.63 | 0 / 0 | 0 | 0.44 |
| PreparedMemoryAsync / Eof (allocation control) | 3 | 31.77 | 31.19 | -1.84 | 0 / 0 | 0 | 1.03 |
| PublicSync / Eof | 3 | 28289.02 | 27814.09 | -1.68 | 9446 / 9453 | -7 | 4.74 |
| PreparedSync / Partial16 | 3 | 188.11 | 172.73 | -8.18 | 128 / 56 | 72 | 0.69 |
| PreparedMemoryAsync / Partial16 (allocation control) | 3 | 175.20 | 177.54 | 1.34 | 56 / 56 | 0 | 1.52 |
| PublicSync / Partial16 | 3 | 28365.63 | 28354.77 | -0.04 | 9594 / 9534 | 60 | 2.37 |
| PreparedSync / Uncached16 | 3 | 186.05 | 173.03 | -7.00 | 128 / 56 | 72 | 2.15 |
| PreparedMemoryAsync / Uncached16 (allocation control) | 3 | 175.48 | 173.97 | -0.86 | 56 / 56 | 0 | 1.09 |
| PublicSync / Uncached16 | 3 | 28550.21 | 28711.26 | 0.56 | 9589 / 9537 | 52 | 2.97 |
| PreparedSync / Uncached256 | 3 | 188.34 | 174.82 | -7.18 | 128 / 56 | 72 | 1.31 |
| PreparedMemoryAsync / Uncached256 (allocation control) | 3 | 186.14 | 175.95 | -5.48 | 56 / 56 | 0 | 0.31 |
| PublicSync / Uncached256 | 3 | 28424.12 | 28192.30 | -0.82 | 9593 / 9532 | 61 | 1.76 |
| PreparedSync / Uncached4096 | 3 | 243.52 | 304.31 | 24.96 | 128 / 56 | 72 | 0.75 |
| PreparedMemoryAsync / Uncached4096 (allocation control) | 3 | 233.24 | 306.05 | 31.21 | 56 / 56 | 0 | 0.69 |
| PublicSync / Uncached4096 | 3 | 30616.34 | 30913.88 | 0.97 | 9588 / 9531 | 57 | 2.38 |
| PreparedSync / Uncached9 | 3 | 186.76 | 174.07 | -6.79 | 128 / 56 | 72 | 3.51 |
| PreparedMemoryAsync / Uncached9 (allocation control) | 3 | 176.33 | 174.17 | -1.22 | 56 / 56 | 0 | 0.60 |
| PublicSync / Uncached9 | 3 | 28364.13 | 28539.90 | 0.62 | 9587 / 9528 | 59 | 2.45 |

PreparedSync and PreparedMemoryAsync include the actual application ResponseBodyPipeWriter flush and the public TestServer.SendAsync response owner. PublicSync includes actual HttpClient request/response plumbing, its real runtime read-only wrapper, synchronous response read, EOF/trailer copying and disposal.

Public reads can reach the necessary pending branch. Their observed timing/heap changes are reported independently; the prepared72B structural result is not applied to the whole request.

All15 original/selected real-producer observations match, including four genuinely pending synchronous reads, zero-length non-consumption, EOF, abort, invalid-array validation, cancellation and disposal. The distinct zero-wrapper resource assertion is red before and green after. The26 actual original/selected tests are green/green preservation checks, not a manufactured functional red/green claim.

Recorded actual portable-PDB/source proofs and complete copied execution hashes are preserved. Public auditing rehashes source/raw records but cannot independently rehash omitted binary/PDB bytes.
