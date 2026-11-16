# F095: every paired outcome

No supported material loader-lifecycle gain; original and prototype warmed allocations are0B. All observations, including tiny warmed improvements and large untouched-source controls, are retained. Negative timing change means faster. These are same-harness pairs, not a throughput claim.

## Three-pair summaries

| Caller | Profile | Median timing change % | Pair1/2/3 timing change % | Before B/op | After B/op | Maximum CV % |
|---|---|---:|---|---|---|---:|
| LegacyBridge | CachedOriginal | -5.48 | -6.23 / -5.48 / -0.25 | 0 / 0 / 0 | 0 / 0 / 0 | 2.66 |
| LegacyBridge | CompiledSelf | -0.92 | -0.11 / -0.92 / -11.21 | 0 / 0 / 0 | 0 / 0 / 0 | 2.24 |
| LegacyBridge | FreshPrecompiled | 0.66 | 0.66 / 1.59 / 0.65 | 40643 / 40643 / 40642 | 40646 / 40643 / 40643 | 5.86 |
| LegacyBridge | GatedPrecompiled | 21.46 | 21.46 / 34.72 / -22.80 | 41418 / 41418 / 41415 | 41448 / 41417 / 41422 | 44.28 |
| ModernAsync | CachedOriginal | 1.55 | 9.92 / 1.55 / -6.65 | 0 / 0 / 0 | 0 / 0 / 0 | 1.01 |
| ModernAsync | CompiledSelf | 2.76 | 8.49 / 2.45 / 2.76 | 0 / 0 / 0 | 0 / 0 / 0 | 1.04 |
| ModernAsync | FreshPrecompiled | -3.34 | -3.34 / -4.31 / -0.18 | 40643 / 40643 / 40642 | 40643 / 40643 / 40643 | 6.56 |
| ModernAsync | GatedPrecompiled | 0.29 | -0.94 / 1.89 / 0.29 | 41488 / 41488 / 41488 | 41487 / 41488 / 41487 | 2.31 |
| ModernWait | CachedOriginal | 5.35 | -5.42 / 5.35 / 169.87 | 0 / 0 / 0 | 0 / 0 / 0 | 1.50 |
| ModernWait | CompiledSelf | -4.96 | -5.88 / -3.65 / -4.96 | 0 / 0 / 0 | 0 / 0 / 0 | 2.19 |
| ModernWait | FreshPrecompiled | -0.39 | -2.36 / 1.17 / -0.39 | 40643 / 40643 / 40643 | 40642 / 40643 / 40643 | 1.73 |
| ModernWait | GatedPrecompiled | -31.42 | -31.42 / -10.22 / -41.89 | 41432 / 41445 / 41439 | 41422 / 41480 / 41443 | 101.76 |

## All36 exact A/B pairs

| Pair | Caller | Profile | Before ns | After ns | Timing change % | Before B/op | After B/op | Before CV % | After CV % |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | LegacyBridge | CachedOriginal | 4.92 | 4.61 | -6.23 | 0 | 0 | 0.71 | 1.06 |
| 1 | ModernWait | CachedOriginal | 5.90 | 5.58 | -5.42 | 0 | 0 | 0.73 | 1.02 |
| 1 | ModernAsync | CachedOriginal | 14.73 | 16.19 | 9.92 | 0 | 0 | 0.76 | 1.01 |
| 1 | LegacyBridge | CompiledSelf | 9.12 | 9.11 | -0.11 | 0 | 0 | 0.84 | 1.20 |
| 1 | ModernWait | CompiledSelf | 10.33 | 9.72 | -5.88 | 0 | 0 | 2.14 | 1.18 |
| 1 | ModernAsync | CompiledSelf | 18.68 | 20.26 | 8.49 | 0 | 0 | 1.04 | 0.83 |
| 1 | LegacyBridge | FreshPrecompiled | 74057.09 | 74543.62 | 0.66 | 40643 | 40646 | 1.78 | 5.86 |
| 1 | ModernWait | FreshPrecompiled | 73814.35 | 72071.90 | -2.36 | 40643 | 40642 | 0.51 | 1.19 |
| 1 | ModernAsync | FreshPrecompiled | 74831.87 | 72333.52 | -3.34 | 40643 | 40643 | 2.51 | 1.21 |
| 1 | LegacyBridge | GatedPrecompiled | 265790.09 | 322826.88 | 21.46 | 41418 | 41448 | 19.53 | 44.28 |
| 1 | ModernWait | GatedPrecompiled | 438055.38 | 300402.41 | -31.42 | 41432 | 41422 | 52.11 | 29.16 |
| 1 | ModernAsync | GatedPrecompiled | 122503.95 | 121353.42 | -0.94 | 41488 | 41487 | 2.00 | 1.44 |
| 2 | LegacyBridge | CachedOriginal | 4.91 | 4.64 | -5.48 | 0 | 0 | 1.02 | 2.15 |
| 2 | ModernWait | CachedOriginal | 5.60 | 5.90 | 5.35 | 0 | 0 | 1.50 | 1.00 |
| 2 | ModernAsync | CachedOriginal | 15.18 | 15.42 | 1.55 | 0 | 0 | 0.56 | 0.28 |
| 2 | LegacyBridge | CompiledSelf | 9.12 | 9.04 | -0.92 | 0 | 0 | 0.82 | 0.39 |
| 2 | ModernWait | CompiledSelf | 9.63 | 9.28 | -3.65 | 0 | 0 | 2.19 | 1.61 |
| 2 | ModernAsync | CompiledSelf | 19.19 | 19.66 | 2.45 | 0 | 0 | 0.63 | 0.69 |
| 2 | LegacyBridge | FreshPrecompiled | 72097.38 | 73242.81 | 1.59 | 40643 | 40643 | 0.78 | 1.26 |
| 2 | ModernWait | FreshPrecompiled | 72775.40 | 73624.51 | 1.17 | 40643 | 40643 | 1.57 | 1.73 |
| 2 | ModernAsync | FreshPrecompiled | 76259.67 | 72971.64 | -4.31 | 40643 | 40643 | 6.56 | 1.13 |
| 2 | LegacyBridge | GatedPrecompiled | 355108.72 | 478406.36 | 34.72 | 41418 | 41417 | 25.38 | 41.59 |
| 2 | ModernWait | GatedPrecompiled | 460781.03 | 413701.09 | -10.22 | 41445 | 41480 | 68.40 | 101.76 |
| 2 | ModernAsync | GatedPrecompiled | 120047.04 | 122320.07 | 1.89 | 41488 | 41488 | 1.67 | 1.41 |
| 3 | LegacyBridge | CachedOriginal | 4.96 | 4.95 | -0.25 | 0 | 0 | 1.50 | 2.66 |
| 3 | ModernWait | CachedOriginal | 5.54 | 14.95 | 169.87 | 0 | 0 | 1.04 | 0.22 |
| 3 | ModernAsync | CachedOriginal | 15.81 | 14.76 | -6.65 | 0 | 0 | 0.85 | 0.33 |
| 3 | LegacyBridge | CompiledSelf | 9.09 | 8.07 | -11.21 | 0 | 0 | 2.24 | 1.43 |
| 3 | ModernWait | CompiledSelf | 10.07 | 9.57 | -4.96 | 0 | 0 | 1.46 | 0.65 |
| 3 | ModernAsync | CompiledSelf | 18.43 | 18.94 | 2.76 | 0 | 0 | 0.58 | 0.64 |
| 3 | LegacyBridge | FreshPrecompiled | 72949.93 | 73426.20 | 0.65 | 40642 | 40643 | 1.64 | 1.82 |
| 3 | ModernWait | FreshPrecompiled | 72895.98 | 72613.37 | -0.39 | 40643 | 40643 | 0.91 | 1.00 |
| 3 | ModernAsync | FreshPrecompiled | 72946.37 | 72813.96 | -0.18 | 40642 | 40643 | 1.34 | 0.90 |
| 3 | LegacyBridge | GatedPrecompiled | 394864.52 | 304850.22 | -22.80 | 41415 | 41422 | 27.94 | 26.40 |
| 3 | ModernWait | GatedPrecompiled | 422097.73 | 245283.42 | -41.89 | 41439 | 41443 | 22.00 | 35.32 |
| 3 | ModernAsync | GatedPrecompiled | 121238.25 | 121593.47 | 0.29 | 41488 | 41487 | 1.53 | 2.31 |

All72 actual outcomes,576 retained result samples,216 actual warmups and72 real owner/harness/PID-linked setup receipts are independently tied to raw console/full JSON measurements. Reported CI arithmetic is checked; distribution quantiles are not recomputed. No unfavorable pair is removed.
