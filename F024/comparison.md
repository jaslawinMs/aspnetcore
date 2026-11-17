# F024 measured comparison

Three actual comparisons;48 native warm rows and12 first-observed observations. Positive percentage means less time.
Observed infinite-target allocation reductions:32/96/160 B/op;finite/default reductions:-64/0/64 B/op;unchanged-source load-control reductions:0 B/op.
Do not attribute the entire observed reduction to a disabled timer. Finite/default paths also move;timeout-matched control-relative accounting is reported separately.
Shared VM,control drift and the added finite-path guard limit timing attribution;do not convert the observed means into application/default-configuration speedups.

| Actual public profile | Original ns/op,1/2/3 | Selected ns/op,1/2/3 | Observed paired improvement %,1/2/3 | Median original/selected B/op |
|---|---:|---:|---:|---:|
| Commit.Infinite.Set.None (primary) | 751.84 / 771.38 / 752.14 | 673.54 / 736.51 / 707.67 | 10.41 / 4.52 / 5.91 | 1712 / 1616 |
| Commit.Infinite.Set.Caller | 801.04 / 795.43 / 798.49 | 698.53 / 763.18 / 745.17 | 12.80 / 4.05 / 6.68 | 1728 / 1632 |
| Commit.Infinite.Refresh.None (primary) | 422.00 / 428.29 / 425.20 | 345.63 / 369.79 / 369.92 | 18.10 / 13.66 / 13.00 | 856 / 760 |
| Commit.Infinite.Refresh.Caller | 457.44 / 459.30 / 447.19 | 375.03 / 397.70 / 401.62 | 18.02 / 13.41 / 10.19 | 872 / 776 |
| Commit.Default.Set.None | 767.72 / 780.17 / 772.93 | 770.87 / 819.44 / 777.62 | -0.41 / -5.03 / -0.61 | 1712 / 1712 |
| Commit.Default.Refresh.Caller | 466.10 / 464.93 / 469.37 | 458.97 / 478.73 / 511.10 | 1.53 / -2.97 / -8.89 | 872 / 872 |
| Load.Infinite.Hit.None | 407.82 / 384.86 / 392.29 | 389.44 / 384.61 / 392.36 | 4.51 / 0.07 / -0.02 | 856 / 856 |
| Load.Default.Hit.None | 395.34 / 408.06 / 402.99 | 397.06 / 398.39 / 405.50 | -0.44 / 2.37 / -0.62 | 856 / 856 |

## Allocation accounting against timeout-matched finite controls

| Infinite target / finite control | Target savings B/op,1/2/3 | Finite control savings B/op,1/2/3 | Difference in savings B/op,1/2/3 |
|---|---:|---:|---:|
| Commit.Infinite.Set.None / Commit.Default.Set.None | 160 / 96 / 32 | 64 / 0 / -64 | 96 / 96 / 96 |
| Commit.Infinite.Refresh.Caller / Commit.Default.Refresh.Caller | 160 / 96 / 32 | 64 / 0 / -64 | 96 / 96 / 96 |

Accounting is not a type-allocation or JIT-mechanism proof;no general default-configuration gain claim.

## First observed:fixture,seed/commit,JIT and metadata included

| Public profile | Original ms,1/2/3 | Selected ms,1/2/3 | Original bytes,1/2/3 | Selected bytes,1/2/3 |
|---|---:|---:|---:|---:|
| Commit.Infinite.Set.None | 19.54 / 19.87 / 20.57 | 19.15 / 20.46 / 19.98 | 13616 / 19808 / 13616 | 13520 / 13520 / 13520 |
| Commit.Default.Refresh.Caller | 21.55 / 20.32 / 20.21 | 20.13 / 20.91 / 19.81 | 19104 / 12912 / 12912 | 19104 / 19104 / 12912 |

Single observations only,not cold-start or isolated-entry conclusions. All adverse and control observations are retained.
