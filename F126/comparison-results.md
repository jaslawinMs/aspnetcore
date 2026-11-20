# F126: allocation-only result, all timings and controls

The predeclared primary is `WarmRequest/MinimumAge10`, a real routed source-built sample request after endpoint warmup. Positive **less time** means faster; positive **bytes saved** means less reported allocation. These are whole TestServer request observations, **not an isolated policy-object size or network/application-throughput result**.

| Pair | Order | Original ns/op | Candidate ns/op | Less time | Reported B/op | Primary saved B/op | Disabled-cache saved B/op | Difference in savings |
|---|---|---:|---:|---:|---|---:|---:|---:|
| 1 | Original -> Candidate | 156036.90 | 154519.90 | 0.97% | 15540 -> 14294 | 1246 | -555 | 1801 |
| 2 | Candidate -> Original | 162636.96 | 153351.09 | 5.71% | 15545 -> 14287 | 1258 | -19 | 1277 |
| 3 | Original -> Candidate | 159193.74 | 159252.04 | -0.04% | 15552 -> 14283 | 1269 | 635 | 634 |

**Allocation qualifies:** primary savings are **1246 / 1258 / 1269 reported B/op**, median **1258 B/op (about 1.23 KiB)**. The matched-control-adjusted savings are **1801 / 1277 / 634 B/op**; every pair exceeds the sealed alternative 32-B/op gate.

**Timing does not qualify:** primary less-time effects are **+0.97% / +5.71% / -0.04%**, median **+0.97%**. The unchanged same-profile disabled-cache control moves **+26.73% / +23.76% / -38.69%**. The primary neither reaches 10% median nor exceeds absolute matched-control movement in any pair. No reliable speedup, latency neutrality or environmental/JIT explanation is claimed.

## Every route and unchanged/adverse control

`CachingDisabledRequest` is an explicit counterfactual: the real sample pipeline and provider with the harness decorator forcing the existing flag false in both variants. It is not described as an unmodified application. `DirectGetPolicy` deliberately stays outside the endpoint cache and keeps constructing fresh equivalent policies.

| Method / real profile | Median less time | Each pair less time | Each pair reported B/op saved |
|---|---:|---|---|
| CachingDisabledRequest/MinimumAge10 | 23.76% | 26.73% / 23.76% / -38.69% | -555 / -19 / 635 |
| CachingDisabledRequest/MinimumAge50 | 0.45% | -0.52% / 2.87% / 0.45% | 28 / 2 / 24 |
| DirectGetPolicy/MinimumAge10 | 2.64% | -5.75% / 5.74% / 2.64% | 0 / 0 / 0 |
| DirectGetPolicy/MinimumAge50 | -4.63% | -6.38% / -4.63% / 3.11% | 0 / 0 / 0 |
| WarmRequest/MinimumAge10 | 0.97% | 0.97% / 5.71% / -0.04% | 1246 / 1258 / 1269 |
| WarmRequest/MinimumAge50 | 3.44% | 6.16% / 3.44% / 1.25% | 1315 / 1292 / 1291 |

The age50 warm route saves **1315 / 1292 / 1291 B/op**, but never replaces the primary. Direct age50 has a **4.63% median slowdown**, unchanged allocation, and all adverse pairs retained. The predeclared direct-age10 rejection guard is not triggered; that is not proof every unchanged path is neutral.

## Every case's variability and GC observation

All eight retained results and three warmups remain. SD is sample standard deviation; GC counts are raw diagnostic Gen0/Gen1/Gen2 counts, not normalized collection rates. Timing is highly variable on this shared non-isolated box.

| Pair | Source | Method / profile | Mean ns | SD ns | CV | Reported B/op | GC counts | Diagnostic operations |
|---|---|---|---:|---:|---:|---:|---|---:|
| 1 | Original | WarmRequest/MinimumAge10 | 156036.90 | 7514.00 | 4.82% | 15540 | 0/0/0 | 708 |
| 1 | Original | CachingDisabledRequest/MinimumAge10 | 145578.55 | 12243.38 | 8.41% | 15611 | 0/0/0 | 623 |
| 1 | Original | DirectGetPolicy/MinimumAge10 | 137.43 | 9.15 | 6.66% | 520 | 5/0/0 | 413545 |
| 1 | Original | WarmRequest/MinimumAge50 | 41284.98 | 2010.76 | 4.87% | 15643 | 1/0/0 | 2476 |
| 1 | Original | CachingDisabledRequest/MinimumAge50 | 41179.23 | 1755.83 | 4.26% | 15675 | 1/0/0 | 2571 |
| 1 | Original | DirectGetPolicy/MinimumAge50 | 130.27 | 8.68 | 6.66% | 520 | 10/0/0 | 766338 |
| 1 | Candidate | WarmRequest/MinimumAge10 | 154519.90 | 4942.38 | 3.20% | 14294 | 0/0/0 | 774 |
| 1 | Candidate | CachingDisabledRequest/MinimumAge10 | 106660.51 | 10507.09 | 9.85% | 16166 | 0/0/0 | 608 |
| 1 | Candidate | DirectGetPolicy/MinimumAge10 | 145.33 | 16.09 | 11.07% | 520 | 2/0/0 | 155584 |
| 1 | Candidate | WarmRequest/MinimumAge50 | 38743.47 | 1198.38 | 3.09% | 14328 | 1/0/0 | 2702 |
| 1 | Candidate | CachingDisabledRequest/MinimumAge50 | 41394.33 | 2425.58 | 5.86% | 15647 | 1/0/0 | 2622 |
| 1 | Candidate | DirectGetPolicy/MinimumAge50 | 138.57 | 7.16 | 5.17% | 520 | 10/0/0 | 756649 |
| 2 | Candidate | WarmRequest/MinimumAge10 | 153351.09 | 5819.32 | 3.79% | 14287 | 0/0/0 | 652 |
| 2 | Candidate | CachingDisabledRequest/MinimumAge10 | 59609.57 | 5683.02 | 9.53% | 15664 | 0/0/0 | 1076 |
| 2 | Candidate | DirectGetPolicy/MinimumAge10 | 131.53 | 4.85 | 3.68% | 520 | 10/0/0 | 768968 |
| 2 | Candidate | WarmRequest/MinimumAge50 | 40318.69 | 2678.10 | 6.64% | 14323 | 1/0/0 | 2811 |
| 2 | Candidate | CachingDisabledRequest/MinimumAge50 | 41838.19 | 2423.20 | 5.79% | 15616 | 1/0/0 | 2481 |
| 2 | Candidate | DirectGetPolicy/MinimumAge50 | 134.26 | 10.25 | 7.63% | 520 | 9/0/0 | 739878 |
| 2 | Original | WarmRequest/MinimumAge10 | 162636.96 | 3009.20 | 1.85% | 15545 | 0/0/0 | 624 |
| 2 | Original | CachingDisabledRequest/MinimumAge10 | 78185.29 | 12989.08 | 16.61% | 15645 | 0/0/0 | 824 |
| 2 | Original | DirectGetPolicy/MinimumAge10 | 139.54 | 9.00 | 6.45% | 520 | 9/0/0 | 690415 |
| 2 | Original | WarmRequest/MinimumAge50 | 41753.97 | 1444.51 | 3.46% | 15615 | 1/0/0 | 2461 |
| 2 | Original | CachingDisabledRequest/MinimumAge50 | 43075.11 | 1715.99 | 3.98% | 15618 | 1/0/0 | 2446 |
| 2 | Original | DirectGetPolicy/MinimumAge50 | 128.33 | 4.41 | 3.44% | 520 | 9/0/0 | 743581 |
| 3 | Original | WarmRequest/MinimumAge10 | 159193.74 | 4362.46 | 2.74% | 15552 | 0/0/0 | 629 |
| 3 | Original | CachingDisabledRequest/MinimumAge10 | 99949.55 | 11665.31 | 11.67% | 16265 | 0/0/0 | 645 |
| 3 | Original | DirectGetPolicy/MinimumAge10 | 131.96 | 3.19 | 2.41% | 520 | 8/0/0 | 676187 |
| 3 | Original | WarmRequest/MinimumAge50 | 41623.65 | 1943.76 | 4.67% | 15621 | 1/0/0 | 2491 |
| 3 | Original | CachingDisabledRequest/MinimumAge50 | 41519.89 | 1292.74 | 3.11% | 15610 | 1/0/0 | 2466 |
| 3 | Original | DirectGetPolicy/MinimumAge50 | 133.79 | 5.19 | 3.88% | 520 | 9/0/0 | 720906 |
| 3 | Candidate | WarmRequest/MinimumAge10 | 159252.04 | 11818.33 | 7.42% | 14283 | 0/0/0 | 650 |
| 3 | Candidate | CachingDisabledRequest/MinimumAge10 | 138621.68 | 13223.99 | 9.54% | 15630 | 0/0/0 | 579 |
| 3 | Candidate | DirectGetPolicy/MinimumAge10 | 128.47 | 4.53 | 3.52% | 520 | 2/0/0 | 203668 |
| 3 | Candidate | WarmRequest/MinimumAge50 | 41103.38 | 3186.70 | 7.75% | 14330 | 1/0/0 | 2642 |
| 3 | Candidate | CachingDisabledRequest/MinimumAge50 | 41333.69 | 1263.55 | 3.06% | 15586 | 0/0/0 | 2384 |
| 3 | Candidate | DirectGetPolicy/MinimumAge50 | 129.63 | 4.23 | 3.26% | 520 | 9/0/0 | 744306 |

## Raw authority and arithmetic

- Pair 1: [Original full JSON](comparison-001/Original/reports/results/AutoPerf.PolicyBenchmarks-report-full.json), [Candidate full JSON](comparison-001/Candidate/reports/results/AutoPerf.PolicyBenchmarks-report-full.json), [authorization](comparison-001/authorization.json), [receipt](comparison-001/execution-receipt.json).
- Pair 2: [Original full JSON](comparison-002/Original/reports/results/AutoPerf.PolicyBenchmarks-report-full.json), [Candidate full JSON](comparison-002/Candidate/reports/results/AutoPerf.PolicyBenchmarks-report-full.json), [authorization](comparison-002/authorization.json), [receipt](comparison-002/execution-receipt.json).
- Pair 3: [Original full JSON](comparison-003/Original/reports/results/AutoPerf.PolicyBenchmarks-report-full.json), [Candidate full JSON](comparison-003/Candidate/reports/results/AutoPerf.PolicyBenchmarks-report-full.json), [authorization](comparison-003/authorization.json), [receipt](comparison-003/execution-receipt.json).

[JavaScript reduction](analysis.json), [separate PowerShell raw-measurement audit](independent-numerical-audit.json), and [native-inclusive audit](native-inclusive-audit.stdout.txt) agree. The portable auditor reconciles all **288 Workload/Result observations** with actual-minus-median-overhead arithmetic and all **36 raw GC/allocation records** with the pinned BDN midpoint-to-even allocation accounting. See [BDN source](BenchmarkDotNet-0.13.0-GcStats.cs) and its [license](BenchmarkDotNet-0.13.0-LICENSE.md).

Exactly three alternating source comparisons were authorized and completed; [the budget](diagnostic-budget.json) is permanently closed. No tuning, replay or primary substitution.
