# F047: every actual source comparison

**Allocation trade-off, not a demonstrated speedup.** The one-scalar prerender primary saves 56 B/op in every pair.
Its median paired less-time effect is -1.43%; it is slower in pairs 2 and 3. No latency-neutrality or throughput claim is made.
Positive less-time means the candidate takes less time. All three comparisons use the same frozen candidate and byte-identical common harness.
All eight retained observations are used. Medians aggregate paired percentage effects, not separately aggregated source means.

| Profile | Original ns/op by pair | Candidate ns/op by pair | Less-time % by pair | Median less-time % | Original B/op by pair | Candidate B/op by pair |
|---|---:|---:|---:|---:|---:|---:|
| PrerenderScalar1 | 2689.55 / 1303.48 / 1306.09 | 1312.39 / 1335.84 / 1324.76 | 51.20 / -2.48 / -1.43 | -1.43 | 1616 / 1616 / 1616 | 1560 / 1560 / 1560 |
| NonPrerenderScalar1 | 452.25 / 443.84 / 447.95 | 441.28 / 430.38 / 461.54 | 2.42 / 3.03 / -3.03 | 2.42 | 848 / 848 / 848 | 848 / 848 / 848 |
| PrerenderEmpty | 1269.82 / 1248.24 / 1236.10 | 1209.03 / 1219.20 / 1250.59 | 4.79 / 2.33 / -1.17 | 2.33 | 1392 / 1392 / 1392 | 1368 / 1368 / 1368 |
| PrerenderScalar4 | 1734.64 / 1746.93 / 1802.82 | 1713.89 / 1642.51 / 1802.68 | 1.20 / 5.98 / 0.01 | 1.20 | 1888 / 1888 / 1888 | 1808 / 1808 / 1808 |
| PrerenderFragment1 | 1582.10 / 1530.84 / 1525.15 | 1480.57 / 1512.72 / 1578.80 | 6.42 / 1.18 / -3.52 | 1.18 | 2160 / 2160 / 2160 | 2104 / 2104 / 2104 |
| PrerenderMixed4 | 2009.19 / 2204.04 / 2245.19 | 2162.32 / 2017.69 / 2212.98 | -7.62 / 8.46 / 1.43 | 1.43 | 2760 / 2760 / 2760 | 2680 / 2680 / 2680 |
| PrerenderFragments8 | 3661.79 / 3733.35 / 3947.90 | 3715.22 / 3431.53 / 3842.74 | -1.46 / 8.08 / 2.66 | 2.66 | 6064 / 6064 / 6064 | 5952 / 5952 / 5952 |
| NonPrerenderScalar4 | 588.20 / 769.19 / 734.26 | 744.97 / 584.28 / 783.51 | -26.65 / 24.04 / -6.71 | -6.71 | 1096 / 1096 / 1096 | 1096 / 1096 / 1096 |

Method: `AutoPerf.BoundaryBenchmarks.FreshBoundarySetAndDispose`.

**Do not headline pair 1 as a 51.20% speedup.** Its original primary has 42.69% CV and declines from 3969.80 to 1261.18 ns/op.
All eight observations are retained. The cause of this ramp was not established.
The later primary comparisons are 2.48% and 1.43% slower. The unchanged one-scalar control has median +2.42% apparent benefit.
The unchanged four-scalar control swings -26.65%, +24.04%, -6.71%. Mixed4 and Fragments8 regress 7.62% and 1.46% in pair 1.
These observations do not establish formal significance or application performance on this shared, non-isolated box.

## Every report row and its variability

| Pair | Variant | Profile | Mean ns | Sample SD ns | CV % | Median ns | B/op | Actual overhead N | Retained N |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Original | PrerenderScalar1 | 2689.55 | 1148.04 | 42.69 | 2733.21 | 1616 | 20 | 8 |
| 1 | Original | NonPrerenderScalar1 | 452.25 | 20.56 | 4.55 | 443.28 | 848 | 15 | 8 |
| 1 | Original | PrerenderEmpty | 1269.82 | 10.08 | 0.79 | 1265.64 | 1392 | 20 | 8 |
| 1 | Original | PrerenderScalar4 | 1734.64 | 256.39 | 14.78 | 1637.88 | 1888 | 20 | 8 |
| 1 | Original | PrerenderFragment1 | 1582.10 | 104.46 | 6.60 | 1549.58 | 2160 | 20 | 8 |
| 1 | Original | PrerenderMixed4 | 2009.19 | 59.21 | 2.95 | 1993.35 | 2760 | 15 | 8 |
| 1 | Original | PrerenderFragments8 | 3661.79 | 46.01 | 1.26 | 3652.60 | 6064 | 20 | 8 |
| 1 | Original | NonPrerenderScalar4 | 588.20 | 3.87 | 0.66 | 588.54 | 1096 | 20 | 8 |
| 1 | Candidate | PrerenderScalar1 | 1312.39 | 22.18 | 1.69 | 1308.66 | 1560 | 20 | 8 |
| 1 | Candidate | NonPrerenderScalar1 | 441.28 | 19.91 | 4.51 | 434.34 | 848 | 15 | 8 |
| 1 | Candidate | PrerenderEmpty | 1209.03 | 13.88 | 1.15 | 1214.72 | 1368 | 18 | 8 |
| 1 | Candidate | PrerenderScalar4 | 1713.89 | 24.44 | 1.43 | 1709.33 | 1808 | 15 | 8 |
| 1 | Candidate | PrerenderFragment1 | 1480.57 | 18.43 | 1.25 | 1480.12 | 2104 | 20 | 8 |
| 1 | Candidate | PrerenderMixed4 | 2162.32 | 116.13 | 5.37 | 2122.67 | 2680 | 20 | 8 |
| 1 | Candidate | PrerenderFragments8 | 3715.22 | 59.01 | 1.59 | 3688.22 | 5952 | 20 | 8 |
| 1 | Candidate | NonPrerenderScalar4 | 744.97 | 11.75 | 1.58 | 743.01 | 1096 | 16 | 8 |
| 2 | Candidate | PrerenderScalar1 | 1335.84 | 60.87 | 4.56 | 1311.86 | 1560 | 15 | 8 |
| 2 | Candidate | NonPrerenderScalar1 | 430.38 | 16.50 | 3.83 | 423.85 | 848 | 20 | 8 |
| 2 | Candidate | PrerenderEmpty | 1219.20 | 25.39 | 2.08 | 1214.31 | 1368 | 20 | 8 |
| 2 | Candidate | PrerenderScalar4 | 1642.51 | 67.75 | 4.12 | 1619.55 | 1808 | 20 | 8 |
| 2 | Candidate | PrerenderFragment1 | 1512.72 | 27.29 | 1.80 | 1514.55 | 2104 | 20 | 8 |
| 2 | Candidate | PrerenderMixed4 | 2017.69 | 83.18 | 4.12 | 1991.24 | 2680 | 20 | 8 |
| 2 | Candidate | PrerenderFragments8 | 3431.53 | 82.55 | 2.41 | 3433.99 | 5952 | 20 | 8 |
| 2 | Candidate | NonPrerenderScalar4 | 584.28 | 24.26 | 4.15 | 574.63 | 1096 | 18 | 8 |
| 2 | Original | PrerenderScalar1 | 1303.48 | 17.55 | 1.35 | 1303.68 | 1616 | 18 | 8 |
| 2 | Original | NonPrerenderScalar1 | 443.84 | 19.79 | 4.46 | 439.98 | 848 | 15 | 8 |
| 2 | Original | PrerenderEmpty | 1248.24 | 38.10 | 3.05 | 1241.81 | 1392 | 15 | 8 |
| 2 | Original | PrerenderScalar4 | 1746.93 | 32.35 | 1.85 | 1740.25 | 1888 | 20 | 8 |
| 2 | Original | PrerenderFragment1 | 1530.84 | 39.27 | 2.57 | 1533.35 | 2160 | 20 | 8 |
| 2 | Original | PrerenderMixed4 | 2204.04 | 72.60 | 3.29 | 2183.80 | 2760 | 20 | 8 |
| 2 | Original | PrerenderFragments8 | 3733.35 | 41.39 | 1.11 | 3726.77 | 6064 | 20 | 8 |
| 2 | Original | NonPrerenderScalar4 | 769.19 | 99.36 | 12.92 | 739.67 | 1096 | 20 | 8 |
| 3 | Original | PrerenderScalar1 | 1306.09 | 36.63 | 2.80 | 1302.91 | 1616 | 20 | 8 |
| 3 | Original | NonPrerenderScalar1 | 447.95 | 7.91 | 1.76 | 448.20 | 848 | 20 | 8 |
| 3 | Original | PrerenderEmpty | 1236.10 | 81.64 | 6.60 | 1208.14 | 1392 | 20 | 8 |
| 3 | Original | PrerenderScalar4 | 1802.82 | 33.56 | 1.86 | 1805.08 | 1888 | 20 | 8 |
| 3 | Original | PrerenderFragment1 | 1525.15 | 22.36 | 1.47 | 1524.85 | 2160 | 20 | 8 |
| 3 | Original | PrerenderMixed4 | 2245.19 | 70.21 | 3.13 | 2232.42 | 2760 | 20 | 8 |
| 3 | Original | PrerenderFragments8 | 3947.90 | 84.54 | 2.14 | 3961.95 | 6064 | 20 | 8 |
| 3 | Original | NonPrerenderScalar4 | 734.26 | 17.72 | 2.41 | 731.56 | 1096 | 18 | 8 |
| 3 | Candidate | PrerenderScalar1 | 1324.76 | 38.04 | 2.87 | 1311.39 | 1560 | 20 | 8 |
| 3 | Candidate | NonPrerenderScalar1 | 461.54 | 10.01 | 2.17 | 460.18 | 848 | 15 | 8 |
| 3 | Candidate | PrerenderEmpty | 1250.59 | 29.17 | 2.33 | 1245.69 | 1368 | 20 | 8 |
| 3 | Candidate | PrerenderScalar4 | 1802.68 | 16.87 | 0.94 | 1798.70 | 1808 | 20 | 8 |
| 3 | Candidate | PrerenderFragment1 | 1578.80 | 39.87 | 2.53 | 1572.97 | 2104 | 20 | 8 |
| 3 | Candidate | PrerenderMixed4 | 2212.98 | 64.32 | 2.91 | 2205.41 | 2680 | 19 | 8 |
| 3 | Candidate | PrerenderFragments8 | 3842.74 | 43.74 | 1.14 | 3836.69 | 5952 | 20 | 8 |
| 3 | Candidate | NonPrerenderScalar4 | 783.51 | 16.30 | 2.08 | 776.21 | 1096 | 20 | 8 |

The audit binds exact complete FullName and raw DisplayInfo identities, reconstructs actual-minus-median-adaptive-overhead results,
checks every statistic and midpoint-to-even allocation arithmetic against the preserved BDN v0.13.0 source and MIT license.

Pair 1: Original then Candidate; [authorization](comparison-001/authorization.json), [completion](comparison-001/execution-receipt.json).
Original: [raw stdout](comparison-001/Original/stdout.txt), [full JSON](comparison-001/Original/reports/results/AutoPerf.BoundaryBenchmarks-report-full.json), [arguments](comparison-001/Original/command.json), [actual result](comparison-001/Original/result.json).
Candidate: [raw stdout](comparison-001/Candidate/stdout.txt), [full JSON](comparison-001/Candidate/reports/results/AutoPerf.BoundaryBenchmarks-report-full.json), [arguments](comparison-001/Candidate/command.json), [actual result](comparison-001/Candidate/result.json).

Pair 2: Candidate then Original; [authorization](comparison-002/authorization.json), [completion](comparison-002/execution-receipt.json).
Original: [raw stdout](comparison-002/Original/stdout.txt), [full JSON](comparison-002/Original/reports/results/AutoPerf.BoundaryBenchmarks-report-full.json), [arguments](comparison-002/Original/command.json), [actual result](comparison-002/Original/result.json).
Candidate: [raw stdout](comparison-002/Candidate/stdout.txt), [full JSON](comparison-002/Candidate/reports/results/AutoPerf.BoundaryBenchmarks-report-full.json), [arguments](comparison-002/Candidate/command.json), [actual result](comparison-002/Candidate/result.json).

Pair 3: Original then Candidate; [authorization](comparison-003/authorization.json), [completion](comparison-003/execution-receipt.json).
Original: [raw stdout](comparison-003/Original/stdout.txt), [full JSON](comparison-003/Original/reports/results/AutoPerf.BoundaryBenchmarks-report-full.json), [arguments](comparison-003/Original/command.json), [actual result](comparison-003/Original/result.json).
Candidate: [raw stdout](comparison-003/Candidate/stdout.txt), [full JSON](comparison-003/Candidate/reports/results/AutoPerf.BoundaryBenchmarks-report-full.json), [arguments](comparison-003/Candidate/command.json), [actual result](comparison-003/Candidate/result.json).
