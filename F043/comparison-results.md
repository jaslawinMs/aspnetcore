# F043: every actual source comparison

Positive less-time means the candidate is faster. All three comparisons use the same frozen candidate and byte-identical common harness.
Every value is independently recomputed from all eight retained observations.
The median column combines paired percentage effects, not a ratio of separately aggregated source means.

| Method | Profile | Original ns/op by pair | Candidate ns/op by pair | Less-time % by pair | Median less-time % | Original B/op by pair | Candidate B/op by pair |
|---|---|---:|---:|---:|---:|---:|---:|
| RegisterFreshPage | Eight | 426.93 / 420.12 / 421.87 | 374.65 / 362.59 / 354.89 | 12.25 / 13.69 / 15.88 | 13.69 | 1920 / 1920 / 1920 | 1920 / 1920 / 1920 |
| RegisterFreshPage | EightLong | 2922.21 / 2889.89 / 2890.60 | 1749.53 / 1737.34 / 1751.00 | 40.13 / 39.88 / 39.42 | 39.88 | 1928 / 1928 / 1928 | 1928 / 1928 / 1928 |
| RegisterFreshPage | NoSections | 89.15 / 78.98 / 79.70 | 83.94 / 75.55 / 78.88 | 5.84 / 4.34 / 1.03 | 4.34 | 568 / 568 / 568 | 568 / 568 / 568 |
| RegisterFreshPage | One | 136.66 / 116.35 / 116.69 | 120.40 / 113.52 / 118.43 | 11.90 / 2.43 / -1.50 | 2.43 | 744 / 744 / 744 | 744 / 744 / 744 |
| RegisterFreshPage | SixtyFour | 3029.45 / 2792.57 / 2836.37 | 2223.54 / 2153.70 / 2161.93 | 26.60 / 22.88 / 23.78 | 23.78 | 8696 / 8696 / 8696 | 8696 / 8696 / 8696 |
| RegisterFreshPage | Two | 148.50 / 139.22 / 144.90 | 140.76 / 134.69 / 135.29 | 5.21 / 3.26 / 6.63 | 5.21 | 800 / 800 / 800 | 800 / 800 / 800 |
| RenderFullView | Eight | 20691.55 / 17577.14 / 19450.56 | 18500.58 / 14606.28 / 20810.66 | 10.59 / 16.90 / -6.99 | 10.59 | 13304 / 13292 / 13298 | 13299 / 13298 / 13323 |
| RenderFullView | EightLong | 16674.64 / 16599.77 / 16665.26 | 15208.44 / 14938.07 / 15521.59 | 8.79 / 10.01 / 6.86 | 8.79 | 21315 / 21315 / 21315 | 21315 / 21315 / 21315 |
| RenderFullView | NoSections | 5315.89 / 4997.17 / 4945.50 | 5098.42 / 4963.26 / 5254.39 | 4.09 / 0.68 / -6.25 | 0.68 | 8889 / 8889 / 8889 | 8889 / 8889 / 8889 |
| RenderFullView | One | 5652.54 / 5574.26 / 5578.97 | 5524.28 / 5549.91 / 5594.37 | 2.27 / 0.44 / -0.28 | 0.44 | 9793 / 9793 / 9793 | 9793 / 9793 / 9793 |
| RenderFullView | SixtyFour | 16645.34 / 15749.66 / 16475.01 | 15520.06 / 15526.29 / 15391.12 | 6.76 / 1.42 / 6.58 | 6.58 | 33820 / 33819 / 33819 | 33820 / 33820 / 33820 |
| RenderFullView | Two | 5768.54 / 5766.45 / 5719.15 | 5689.17 / 5730.97 / 5741.72 | 1.38 / 0.62 / -0.39 | 0.62 | 10089 / 10089 / 10089 | 10089 / 10089 / 10089 |

The declared primary is RegisterFreshPage/Two. Its numerical timing gate passes, but the control/variability credibility gate does not.
In pairs 1 and 2, the primary gain is no larger than the unchanged RegisterFreshPage/NoSections control.
Scaled gains are real observed secondary results, not a replacement primary. No primary allocation saving is observed.

## Every report row and its variability

| Pair | Variant | Method | Profile | Mean ns | Sample SD ns | CV % | Median ns | B/op | Actual overhead N | Retained N |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Original | RegisterFreshPage | Eight | 426.93 | 15.24 | 3.57 | 425.89 | 1920 | 20 | 8 |
| 1 | Original | RenderFullView | Eight | 20691.55 | 2398.37 | 11.59 | 20567.67 | 13304 | 20 | 8 |
| 1 | Original | RegisterFreshPage | EightLong | 2922.21 | 91.73 | 3.14 | 2901.50 | 1928 | 20 | 8 |
| 1 | Original | RenderFullView | EightLong | 16674.64 | 513.87 | 3.08 | 16603.16 | 21315 | 20 | 8 |
| 1 | Original | RegisterFreshPage | NoSections | 89.15 | 13.03 | 14.62 | 82.99 | 568 | 15 | 8 |
| 1 | Original | RenderFullView | NoSections | 5315.89 | 632.12 | 11.89 | 5126.90 | 8889 | 20 | 8 |
| 1 | Original | RegisterFreshPage | One | 136.66 | 36.40 | 26.63 | 122.86 | 744 | 15 | 8 |
| 1 | Original | RenderFullView | One | 5652.54 | 223.98 | 3.96 | 5615.30 | 9793 | 20 | 8 |
| 1 | Original | RegisterFreshPage | SixtyFour | 3029.45 | 137.48 | 4.54 | 2998.56 | 8696 | 20 | 8 |
| 1 | Original | RenderFullView | SixtyFour | 16645.34 | 813.87 | 4.89 | 16400.81 | 33820 | 20 | 8 |
| 1 | Original | RegisterFreshPage | Two | 148.50 | 6.91 | 4.65 | 146.65 | 800 | 20 | 8 |
| 1 | Original | RenderFullView | Two | 5768.54 | 175.90 | 3.05 | 5722.08 | 10089 | 20 | 8 |
| 1 | Candidate | RegisterFreshPage | Eight | 374.65 | 24.63 | 6.57 | 364.83 | 1920 | 15 | 8 |
| 1 | Candidate | RenderFullView | Eight | 18500.58 | 4930.41 | 26.65 | 18538.16 | 13299 | 20 | 8 |
| 1 | Candidate | RegisterFreshPage | EightLong | 1749.53 | 15.89 | 0.91 | 1750.63 | 1928 | 18 | 8 |
| 1 | Candidate | RenderFullView | EightLong | 15208.44 | 644.13 | 4.24 | 15037.06 | 21315 | 20 | 8 |
| 1 | Candidate | RegisterFreshPage | NoSections | 83.94 | 4.37 | 5.20 | 83.29 | 568 | 15 | 8 |
| 1 | Candidate | RenderFullView | NoSections | 5098.42 | 157.02 | 3.08 | 5081.57 | 8889 | 20 | 8 |
| 1 | Candidate | RegisterFreshPage | One | 120.40 | 8.78 | 7.29 | 117.87 | 744 | 18 | 8 |
| 1 | Candidate | RenderFullView | One | 5524.28 | 213.77 | 3.87 | 5482.80 | 9793 | 15 | 8 |
| 1 | Candidate | RegisterFreshPage | SixtyFour | 2223.54 | 211.23 | 9.50 | 2161.16 | 8696 | 20 | 8 |
| 1 | Candidate | RenderFullView | SixtyFour | 15520.06 | 491.46 | 3.17 | 15377.54 | 33820 | 20 | 8 |
| 1 | Candidate | RegisterFreshPage | Two | 140.76 | 7.47 | 5.31 | 138.60 | 800 | 15 | 8 |
| 1 | Candidate | RenderFullView | Two | 5689.17 | 154.27 | 2.71 | 5671.89 | 10089 | 20 | 8 |
| 2 | Candidate | RegisterFreshPage | Eight | 362.59 | 16.31 | 4.50 | 357.44 | 1920 | 20 | 8 |
| 2 | Candidate | RenderFullView | Eight | 14606.28 | 3731.48 | 25.55 | 12805.61 | 13298 | 20 | 8 |
| 2 | Candidate | RegisterFreshPage | EightLong | 1737.34 | 35.34 | 2.03 | 1733.35 | 1928 | 20 | 8 |
| 2 | Candidate | RenderFullView | EightLong | 14938.07 | 403.46 | 2.70 | 14895.10 | 21315 | 20 | 8 |
| 2 | Candidate | RegisterFreshPage | NoSections | 75.55 | 4.06 | 5.38 | 74.13 | 568 | 17 | 8 |
| 2 | Candidate | RenderFullView | NoSections | 4963.26 | 107.70 | 2.17 | 4937.41 | 8889 | 20 | 8 |
| 2 | Candidate | RegisterFreshPage | One | 113.52 | 2.75 | 2.43 | 112.35 | 744 | 15 | 8 |
| 2 | Candidate | RenderFullView | One | 5549.91 | 120.80 | 2.18 | 5561.08 | 9793 | 20 | 8 |
| 2 | Candidate | RegisterFreshPage | SixtyFour | 2153.70 | 140.55 | 6.53 | 2104.25 | 8696 | 20 | 8 |
| 2 | Candidate | RenderFullView | SixtyFour | 15526.29 | 986.49 | 6.35 | 15115.92 | 33820 | 20 | 8 |
| 2 | Candidate | RegisterFreshPage | Two | 134.69 | 8.22 | 6.10 | 132.39 | 800 | 15 | 8 |
| 2 | Candidate | RenderFullView | Two | 5730.97 | 242.37 | 4.23 | 5642.79 | 10089 | 20 | 8 |
| 2 | Original | RegisterFreshPage | Eight | 420.12 | 25.31 | 6.03 | 410.05 | 1920 | 20 | 8 |
| 2 | Original | RenderFullView | Eight | 17577.14 | 4778.08 | 27.18 | 16239.71 | 13292 | 20 | 8 |
| 2 | Original | RegisterFreshPage | EightLong | 2889.89 | 23.41 | 0.81 | 2885.68 | 1928 | 20 | 8 |
| 2 | Original | RenderFullView | EightLong | 16599.77 | 297.77 | 1.79 | 16536.51 | 21315 | 20 | 8 |
| 2 | Original | RegisterFreshPage | NoSections | 78.98 | 4.63 | 5.87 | 77.19 | 568 | 15 | 8 |
| 2 | Original | RenderFullView | NoSections | 4997.17 | 186.17 | 3.73 | 4924.10 | 8889 | 20 | 8 |
| 2 | Original | RegisterFreshPage | One | 116.35 | 4.77 | 4.10 | 115.32 | 744 | 15 | 8 |
| 2 | Original | RenderFullView | One | 5574.26 | 164.40 | 2.95 | 5565.75 | 9793 | 20 | 8 |
| 2 | Original | RegisterFreshPage | SixtyFour | 2792.57 | 212.32 | 7.60 | 2701.49 | 8696 | 20 | 8 |
| 2 | Original | RenderFullView | SixtyFour | 15749.66 | 265.38 | 1.68 | 15769.54 | 33819 | 20 | 8 |
| 2 | Original | RegisterFreshPage | Two | 139.22 | 5.19 | 3.73 | 137.48 | 800 | 15 | 8 |
| 2 | Original | RenderFullView | Two | 5766.45 | 330.37 | 5.73 | 5648.78 | 10089 | 18 | 8 |
| 3 | Original | RegisterFreshPage | Eight | 421.87 | 21.50 | 5.10 | 414.25 | 1920 | 19 | 8 |
| 3 | Original | RenderFullView | Eight | 19450.56 | 3858.53 | 19.84 | 20620.91 | 13298 | 20 | 8 |
| 3 | Original | RegisterFreshPage | EightLong | 2890.60 | 25.89 | 0.90 | 2887.62 | 1928 | 20 | 8 |
| 3 | Original | RenderFullView | EightLong | 16665.26 | 484.42 | 2.91 | 16483.52 | 21315 | 20 | 8 |
| 3 | Original | RegisterFreshPage | NoSections | 79.70 | 3.82 | 4.79 | 78.63 | 568 | 15 | 8 |
| 3 | Original | RenderFullView | NoSections | 4945.50 | 89.44 | 1.81 | 4926.11 | 8889 | 20 | 8 |
| 3 | Original | RegisterFreshPage | One | 116.69 | 5.89 | 5.05 | 114.40 | 744 | 15 | 8 |
| 3 | Original | RenderFullView | One | 5578.97 | 240.15 | 4.30 | 5507.52 | 9793 | 20 | 8 |
| 3 | Original | RegisterFreshPage | SixtyFour | 2836.37 | 192.84 | 6.80 | 2797.30 | 8696 | 20 | 8 |
| 3 | Original | RenderFullView | SixtyFour | 16475.01 | 680.45 | 4.13 | 16297.80 | 33819 | 20 | 8 |
| 3 | Original | RegisterFreshPage | Two | 144.90 | 13.97 | 9.64 | 139.48 | 800 | 20 | 8 |
| 3 | Original | RenderFullView | Two | 5719.15 | 137.02 | 2.40 | 5690.81 | 10089 | 20 | 8 |
| 3 | Candidate | RegisterFreshPage | Eight | 354.89 | 8.61 | 2.43 | 352.56 | 1920 | 20 | 8 |
| 3 | Candidate | RenderFullView | Eight | 20810.66 | 3192.45 | 15.34 | 22009.89 | 13323 | 20 | 8 |
| 3 | Candidate | RegisterFreshPage | EightLong | 1751.00 | 16.81 | 0.96 | 1747.63 | 1928 | 15 | 8 |
| 3 | Candidate | RenderFullView | EightLong | 15521.59 | 181.59 | 1.17 | 15474.81 | 21315 | 20 | 8 |
| 3 | Candidate | RegisterFreshPage | NoSections | 78.88 | 5.01 | 6.35 | 76.28 | 568 | 20 | 8 |
| 3 | Candidate | RenderFullView | NoSections | 5254.39 | 317.23 | 6.04 | 5171.72 | 8889 | 20 | 8 |
| 3 | Candidate | RegisterFreshPage | One | 118.43 | 6.38 | 5.39 | 116.80 | 744 | 15 | 8 |
| 3 | Candidate | RenderFullView | One | 5594.37 | 269.28 | 4.81 | 5541.93 | 9793 | 20 | 8 |
| 3 | Candidate | RegisterFreshPage | SixtyFour | 2161.93 | 173.89 | 8.04 | 2090.47 | 8696 | 20 | 8 |
| 3 | Candidate | RenderFullView | SixtyFour | 15391.12 | 309.47 | 2.01 | 15330.69 | 33820 | 20 | 8 |
| 3 | Candidate | RegisterFreshPage | Two | 135.29 | 8.03 | 5.93 | 133.09 | 800 | 15 | 8 |
| 3 | Candidate | RenderFullView | Two | 5741.72 | 127.96 | 2.23 | 5730.27 | 10089 | 20 | 8 |

The audit uses all actually emitted adaptive overhead samples. It binds each complete FullName to its exact raw DisplayInfo,
reconstructs actual-minus-median-overhead values and sample statistics, and checks midpoint-to-even allocation arithmetic.

Pair 1: Original then Candidate; [authorization](comparison-001/authorization.json), [completion](comparison-001/execution-receipt.json).
Original: [raw stdout](comparison-001/Original/stdout.txt), [full JSON](comparison-001/Original/reports/results/AutoPerf.SectionRegistrationBenchmarks-report-full.json), [arguments](comparison-001/Original/command.json), [actual result](comparison-001/Original/result.json).
Candidate: [raw stdout](comparison-001/Candidate/stdout.txt), [full JSON](comparison-001/Candidate/reports/results/AutoPerf.SectionRegistrationBenchmarks-report-full.json), [arguments](comparison-001/Candidate/command.json), [actual result](comparison-001/Candidate/result.json).

Pair 2: Candidate then Original; [authorization](comparison-002/authorization.json), [completion](comparison-002/execution-receipt.json).
Original: [raw stdout](comparison-002/Original/stdout.txt), [full JSON](comparison-002/Original/reports/results/AutoPerf.SectionRegistrationBenchmarks-report-full.json), [arguments](comparison-002/Original/command.json), [actual result](comparison-002/Original/result.json).
Candidate: [raw stdout](comparison-002/Candidate/stdout.txt), [full JSON](comparison-002/Candidate/reports/results/AutoPerf.SectionRegistrationBenchmarks-report-full.json), [arguments](comparison-002/Candidate/command.json), [actual result](comparison-002/Candidate/result.json).

Pair 3: Original then Candidate; [authorization](comparison-003/authorization.json), [completion](comparison-003/execution-receipt.json).
Original: [raw stdout](comparison-003/Original/stdout.txt), [full JSON](comparison-003/Original/reports/results/AutoPerf.SectionRegistrationBenchmarks-report-full.json), [arguments](comparison-003/Original/command.json), [actual result](comparison-003/Original/result.json).
Candidate: [raw stdout](comparison-003/Candidate/stdout.txt), [full JSON](comparison-003/Candidate/reports/results/AutoPerf.SectionRegistrationBenchmarks-report-full.json), [arguments](comparison-003/Candidate/command.json), [actual result](comparison-003/Candidate/result.json).
