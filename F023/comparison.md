# F023 measured comparison

Three actual comparisons;48 native warm rows and12 first-observed observations. Positive percentage means less time.
The supported explicit infinite-timeout option saves96 B/op in every fresh public target pair. Default/finite and already-loaded allocation controls are unchanged.
Shared VM,control drift and the added finite-path guard limit timing attribution;do not convert the observed means into application/default-configuration speedups.

| Actual public profile | Original ns/op,1/2/3 | Selected ns/op,1/2/3 | Observed paired improvement %,1/2/3 | Median original/selected B/op |
|---|---:|---:|---:|---:|
| Load.Infinite.Miss.None (primary) | 239.49 / 205.78 / 233.91 | 142.87 / 147.55 / 144.65 | 40.34 / 28.30 / 38.16 | 440 / 344 |
| Load.Infinite.Miss.Caller | 265.42 / 240.87 / 259.54 | 174.96 / 176.94 / 176.89 | 34.08 / 26.54 / 31.85 | 456 / 360 |
| Load.Infinite.Hit.None (primary) | 378.85 / 379.52 / 375.64 | 293.25 / 295.94 / 296.31 | 22.60 / 22.02 / 21.12 | 856 / 760 |
| Load.Infinite.Hit.Caller | 411.84 / 414.85 / 402.54 | 334.15 / 332.68 / 339.87 | 18.86 / 19.81 / 15.57 | 872 / 776 |
| Load.Default.Miss.None | 246.09 / 212.64 / 239.96 | 211.81 / 220.62 / 213.11 | 13.93 / -3.75 / 11.19 | 440 / 440 |
| Load.Default.Hit.Caller | 672.50 / 415.72 / 948.36 | 414.04 / 420.51 / 815.25 | 38.43 / -1.15 / 14.04 | 872 / 872 |
| Loaded.Infinite.Hit.None | 78.43 / 81.97 / 80.61 | 80.74 / 80.59 / 79.36 | -2.94 / 1.69 / 1.55 | 144 / 144 |
| Loaded.Default.Hit.None | 78.39 / 80.52 / 80.92 | 81.79 / 80.92 / 79.27 | -4.34 / -0.49 / 2.04 | 144 / 144 |

## First observed:fixture,seed/commit,JIT and metadata included

| Public profile | Original ms,1/2/3 | Selected ms,1/2/3 | Original bytes,1/2/3 | Selected bytes,1/2/3 |
|---|---:|---:|---:|---:|
| Load.Infinite.Hit.None | 21.03 / 20.13 / 21.00 | 20.31 / 21.05 / 21.02 | 12744 / 12744 / 12744 | 12648 / 12648 / 12648 |
| Load.Default.Hit.Caller | 20.74 / 20.86 / 23.93 | 21.51 / 21.43 / 21.40 | 12984 / 12984 / 12984 | 12984 / 12984 / 12984 |

Single observations only,not cold-start or isolated-entry conclusions. All adverse and control observations are retained.
