# F046: every actual source comparison

Positive less-time means the candidate takes less time. All three comparisons use the same frozen candidate and byte-identical common harness.
Every statistic is independently recomputed from all eight retained observations.
The median column aggregates paired percentage effects, not a ratio of separately aggregated source means.

| Method | Profile | Original ns/op by pair | Candidate ns/op by pair | Less-time % by pair | Median less-time % | Original B/op by pair | Candidate B/op by pair |
|---|---|---:|---:|---:|---:|---:|---:|
| FreshNativeAppend | EightExisting | 223.34 / 225.76 / 223.02 | 201.17 / 201.75 / 204.00 | 9.93 / 10.64 / 8.53 | 9.93 | 480 / 480 / 480 | 480 / 480 / 480 |
| FreshNativeAppend | KeepAlive | 151.09 / 169.63 / 156.27 | 132.90 / 132.58 / 142.87 | 12.04 / 21.84 / 8.58 | 12.04 | 424 / 424 / 424 | 424 / 424 / 424 |
| FreshNativeAppend | MixedCaseExisting | 163.31 / 167.11 / 164.41 | 141.07 / 139.15 / 135.25 | 13.62 / 16.73 / 17.74 | 16.73 | 424 / 424 / 424 | 424 / 424 / 424 |
| FreshNativeAppend | NoExisting | 104.08 / 111.55 / 106.59 | 94.25 / 92.75 / 92.30 | 9.44 / 16.85 / 13.41 | 13.41 | 384 / 384 / 384 | 384 / 384 / 384 |
| FreshNativeAppend | TwoExisting | 164.62 / 169.38 / 170.92 | 140.73 / 156.15 / 137.88 | 14.51 / 7.81 / 19.33 | 14.51 | 432 / 432 / 432 | 432 / 432 / 432 |
| FreshNativeAppend | WrappedStore | 156.52 / 171.26 / 155.78 | 152.05 / 160.11 / 159.38 | 2.85 / 6.51 / -2.31 | 2.85 | 456 / 456 / 456 | 456 / 456 / 456 |
| FreshPublicExtensionControl | EightExisting | 293.57 / 302.90 / 305.06 | 289.22 / 299.80 / 295.99 | 1.48 / 1.02 / 2.98 | 1.48 | 480 / 480 / 480 | 480 / 480 / 480 |
| FreshPublicExtensionControl | KeepAlive | 166.30 / 234.12 / 179.40 | 169.60 / 169.88 / 176.59 | -1.99 / 27.44 / 1.56 | 1.56 | 424 / 424 / 424 | 424 / 424 / 424 |
| FreshPublicExtensionControl | MixedCaseExisting | 180.41 / 183.63 / 190.08 | 180.27 / 186.64 / 184.90 | 0.07 / -1.64 / 2.72 | 0.07 | 424 / 424 / 424 | 424 / 424 / 424 |
| FreshPublicExtensionControl | NoExisting | 107.72 / 112.44 / 112.29 | 108.76 / 108.44 / 113.58 | -0.96 / 3.56 / -1.15 | -0.96 | 384 / 384 / 384 | 384 / 384 / 384 |
| FreshPublicExtensionControl | TwoExisting | 186.03 / 197.36 / 200.19 | 187.98 / 191.91 / 193.06 | -1.05 / 2.76 / 3.56 | 2.76 | 432 / 432 / 432 | 432 / 432 / 432 |
| FreshPublicExtensionControl | WrappedStore | 173.87 / 179.22 / 180.79 | 172.74 / 183.77 / 171.75 | 0.65 / -2.54 / 5.00 | 0.65 | 456 / 456 / 456 | 456 / 456 / 456 |

The declared primary is FreshNativeAppend/NoExisting: median 13.41% less time, all three pairs faster, unchanged 384 B/op.
Its unchanged FreshPublicExtensionControl/NoExisting median effect is -0.96%; the primary exceeds it in all three pairs.
This is a fresh real collection/setup/compiled-delegate/one-close-append/count suffix, not isolated Append or native/application throughput.

**Noise and adverse results:** the unchanged KeepAlive extension control appears 27.44% faster in pair 2, exceeding the native KeepAlive secondary effect of 21.84%.
The WrappedStore fallback has a 2.85% median apparent benefit but regresses 2.31% in pair 3; no fallback gain is claimed.
The largest single-case CV is 13.46%. This is shared, non-isolated hardware and not formal statistical significance.

## Every report row and its variability

| Pair | Variant | Method | Profile | Mean ns | Sample SD ns | CV % | Median ns | B/op | Actual overhead N | Retained N |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Original | FreshNativeAppend | NoExisting | 104.08 | 3.82 | 3.67 | 103.26 | 384 | 15 | 8 |
| 1 | Original | FreshPublicExtensionControl | NoExisting | 107.72 | 4.06 | 3.77 | 105.37 | 384 | 20 | 8 |
| 1 | Original | FreshNativeAppend | KeepAlive | 151.09 | 7.08 | 4.68 | 149.62 | 424 | 15 | 8 |
| 1 | Original | FreshPublicExtensionControl | KeepAlive | 166.30 | 4.85 | 2.92 | 163.89 | 424 | 15 | 8 |
| 1 | Original | FreshNativeAppend | TwoExisting | 164.62 | 9.51 | 5.78 | 162.25 | 432 | 16 | 8 |
| 1 | Original | FreshPublicExtensionControl | TwoExisting | 186.03 | 9.27 | 4.99 | 183.01 | 432 | 15 | 8 |
| 1 | Original | FreshNativeAppend | EightExisting | 223.34 | 10.60 | 4.75 | 219.67 | 480 | 15 | 8 |
| 1 | Original | FreshPublicExtensionControl | EightExisting | 293.57 | 4.57 | 1.56 | 293.40 | 480 | 15 | 8 |
| 1 | Original | FreshNativeAppend | MixedCaseExisting | 163.31 | 5.50 | 3.37 | 162.80 | 424 | 15 | 8 |
| 1 | Original | FreshPublicExtensionControl | MixedCaseExisting | 180.41 | 8.89 | 4.93 | 178.27 | 424 | 15 | 8 |
| 1 | Original | FreshNativeAppend | WrappedStore | 156.52 | 4.75 | 3.04 | 156.91 | 456 | 15 | 8 |
| 1 | Original | FreshPublicExtensionControl | WrappedStore | 173.87 | 2.94 | 1.69 | 174.06 | 456 | 15 | 8 |
| 1 | Candidate | FreshNativeAppend | NoExisting | 94.25 | 6.80 | 7.22 | 91.78 | 384 | 15 | 8 |
| 1 | Candidate | FreshPublicExtensionControl | NoExisting | 108.76 | 2.94 | 2.70 | 109.62 | 384 | 18 | 8 |
| 1 | Candidate | FreshNativeAppend | KeepAlive | 132.90 | 3.51 | 2.64 | 132.69 | 424 | 15 | 8 |
| 1 | Candidate | FreshPublicExtensionControl | KeepAlive | 169.60 | 10.55 | 6.22 | 164.67 | 424 | 15 | 8 |
| 1 | Candidate | FreshNativeAppend | TwoExisting | 140.73 | 1.94 | 1.38 | 140.58 | 432 | 20 | 8 |
| 1 | Candidate | FreshPublicExtensionControl | TwoExisting | 187.98 | 8.88 | 4.73 | 185.33 | 432 | 15 | 8 |
| 1 | Candidate | FreshNativeAppend | EightExisting | 201.17 | 8.40 | 4.18 | 196.82 | 480 | 15 | 8 |
| 1 | Candidate | FreshPublicExtensionControl | EightExisting | 289.22 | 3.33 | 1.15 | 289.25 | 480 | 15 | 8 |
| 1 | Candidate | FreshNativeAppend | MixedCaseExisting | 141.07 | 6.43 | 4.56 | 139.49 | 424 | 15 | 8 |
| 1 | Candidate | FreshPublicExtensionControl | MixedCaseExisting | 180.27 | 3.10 | 1.72 | 179.37 | 424 | 20 | 8 |
| 1 | Candidate | FreshNativeAppend | WrappedStore | 152.05 | 3.99 | 2.62 | 151.06 | 456 | 16 | 8 |
| 1 | Candidate | FreshPublicExtensionControl | WrappedStore | 172.74 | 2.82 | 1.63 | 172.86 | 456 | 15 | 8 |
| 2 | Candidate | FreshNativeAppend | NoExisting | 92.75 | 4.25 | 4.59 | 90.86 | 384 | 15 | 8 |
| 2 | Candidate | FreshPublicExtensionControl | NoExisting | 108.44 | 3.51 | 3.24 | 107.95 | 384 | 15 | 8 |
| 2 | Candidate | FreshNativeAppend | KeepAlive | 132.58 | 3.53 | 2.67 | 132.09 | 424 | 15 | 8 |
| 2 | Candidate | FreshPublicExtensionControl | KeepAlive | 169.88 | 4.33 | 2.55 | 169.32 | 424 | 15 | 8 |
| 2 | Candidate | FreshNativeAppend | TwoExisting | 156.15 | 7.34 | 4.70 | 154.46 | 432 | 15 | 8 |
| 2 | Candidate | FreshPublicExtensionControl | TwoExisting | 191.91 | 9.52 | 4.96 | 188.58 | 432 | 15 | 8 |
| 2 | Candidate | FreshNativeAppend | EightExisting | 201.75 | 9.38 | 4.65 | 197.96 | 480 | 15 | 8 |
| 2 | Candidate | FreshPublicExtensionControl | EightExisting | 299.80 | 7.88 | 2.63 | 297.45 | 480 | 20 | 8 |
| 2 | Candidate | FreshNativeAppend | MixedCaseExisting | 139.15 | 7.98 | 5.73 | 136.74 | 424 | 20 | 8 |
| 2 | Candidate | FreshPublicExtensionControl | MixedCaseExisting | 186.64 | 11.61 | 6.22 | 182.58 | 424 | 19 | 8 |
| 2 | Candidate | FreshNativeAppend | WrappedStore | 160.11 | 4.14 | 2.59 | 159.02 | 456 | 15 | 8 |
| 2 | Candidate | FreshPublicExtensionControl | WrappedStore | 183.77 | 9.46 | 5.15 | 180.92 | 456 | 15 | 8 |
| 2 | Original | FreshNativeAppend | NoExisting | 111.55 | 3.30 | 2.96 | 110.78 | 384 | 17 | 8 |
| 2 | Original | FreshPublicExtensionControl | NoExisting | 112.44 | 4.50 | 4.00 | 110.70 | 384 | 20 | 8 |
| 2 | Original | FreshNativeAppend | KeepAlive | 169.63 | 22.83 | 13.46 | 161.98 | 424 | 15 | 8 |
| 2 | Original | FreshPublicExtensionControl | KeepAlive | 234.12 | 28.15 | 12.02 | 241.11 | 424 | 20 | 8 |
| 2 | Original | FreshNativeAppend | TwoExisting | 169.38 | 7.07 | 4.17 | 166.41 | 432 | 19 | 8 |
| 2 | Original | FreshPublicExtensionControl | TwoExisting | 197.36 | 7.46 | 3.78 | 194.62 | 432 | 16 | 8 |
| 2 | Original | FreshNativeAppend | EightExisting | 225.76 | 6.82 | 3.02 | 223.55 | 480 | 15 | 8 |
| 2 | Original | FreshPublicExtensionControl | EightExisting | 302.90 | 10.71 | 3.53 | 299.45 | 480 | 15 | 8 |
| 2 | Original | FreshNativeAppend | MixedCaseExisting | 167.11 | 3.84 | 2.30 | 166.43 | 424 | 15 | 8 |
| 2 | Original | FreshPublicExtensionControl | MixedCaseExisting | 183.63 | 3.99 | 2.17 | 184.40 | 424 | 15 | 8 |
| 2 | Original | FreshNativeAppend | WrappedStore | 171.26 | 10.28 | 6.00 | 168.27 | 456 | 20 | 8 |
| 2 | Original | FreshPublicExtensionControl | WrappedStore | 179.22 | 10.57 | 5.90 | 174.44 | 456 | 15 | 8 |
| 3 | Original | FreshNativeAppend | NoExisting | 106.59 | 6.18 | 5.79 | 105.73 | 384 | 15 | 8 |
| 3 | Original | FreshPublicExtensionControl | NoExisting | 112.29 | 7.30 | 6.50 | 110.12 | 384 | 15 | 8 |
| 3 | Original | FreshNativeAppend | KeepAlive | 156.27 | 5.81 | 3.72 | 154.84 | 424 | 18 | 8 |
| 3 | Original | FreshPublicExtensionControl | KeepAlive | 179.40 | 4.81 | 2.68 | 178.92 | 424 | 20 | 8 |
| 3 | Original | FreshNativeAppend | TwoExisting | 170.92 | 5.93 | 3.47 | 171.80 | 432 | 15 | 8 |
| 3 | Original | FreshPublicExtensionControl | TwoExisting | 200.19 | 9.15 | 4.57 | 199.13 | 432 | 20 | 8 |
| 3 | Original | FreshNativeAppend | EightExisting | 223.02 | 5.25 | 2.35 | 222.67 | 480 | 15 | 8 |
| 3 | Original | FreshPublicExtensionControl | EightExisting | 305.06 | 16.21 | 5.31 | 299.49 | 480 | 15 | 8 |
| 3 | Original | FreshNativeAppend | MixedCaseExisting | 164.41 | 7.41 | 4.51 | 162.55 | 424 | 17 | 8 |
| 3 | Original | FreshPublicExtensionControl | MixedCaseExisting | 190.08 | 7.14 | 3.76 | 189.99 | 424 | 15 | 8 |
| 3 | Original | FreshNativeAppend | WrappedStore | 155.78 | 2.96 | 1.90 | 155.17 | 456 | 15 | 8 |
| 3 | Original | FreshPublicExtensionControl | WrappedStore | 180.79 | 6.92 | 3.83 | 177.53 | 456 | 15 | 8 |
| 3 | Candidate | FreshNativeAppend | NoExisting | 92.30 | 3.48 | 3.77 | 91.36 | 384 | 20 | 8 |
| 3 | Candidate | FreshPublicExtensionControl | NoExisting | 113.58 | 2.40 | 2.11 | 112.74 | 384 | 15 | 8 |
| 3 | Candidate | FreshNativeAppend | KeepAlive | 142.87 | 5.42 | 3.79 | 143.54 | 424 | 15 | 8 |
| 3 | Candidate | FreshPublicExtensionControl | KeepAlive | 176.59 | 8.77 | 4.96 | 172.77 | 424 | 20 | 8 |
| 3 | Candidate | FreshNativeAppend | TwoExisting | 137.88 | 1.95 | 1.41 | 137.45 | 432 | 15 | 8 |
| 3 | Candidate | FreshPublicExtensionControl | TwoExisting | 193.06 | 8.82 | 4.57 | 187.73 | 432 | 15 | 8 |
| 3 | Candidate | FreshNativeAppend | EightExisting | 204.00 | 3.02 | 1.48 | 204.02 | 480 | 15 | 8 |
| 3 | Candidate | FreshPublicExtensionControl | EightExisting | 295.99 | 2.83 | 0.96 | 295.99 | 480 | 15 | 8 |
| 3 | Candidate | FreshNativeAppend | MixedCaseExisting | 135.25 | 3.04 | 2.25 | 135.18 | 424 | 15 | 8 |
| 3 | Candidate | FreshPublicExtensionControl | MixedCaseExisting | 184.90 | 7.21 | 3.90 | 182.51 | 424 | 15 | 8 |
| 3 | Candidate | FreshNativeAppend | WrappedStore | 159.38 | 7.11 | 4.46 | 157.80 | 456 | 20 | 8 |
| 3 | Candidate | FreshPublicExtensionControl | WrappedStore | 171.75 | 3.31 | 1.92 | 171.28 | 456 | 15 | 8 |

The independent audit binds each complete FullName to its exact raw DisplayInfo, uses every actual adaptive overhead sample,
reconstructs actual-minus-median-overhead results and sample statistics, and checks midpoint-to-even allocation arithmetic.

Pair 1: Original then Candidate; [authorization](comparison-001/authorization.json), [completion](comparison-001/execution-receipt.json).
Original: [raw stdout](comparison-001/Original/stdout.txt), [full JSON](comparison-001/Original/reports/results/AutoPerf.HeaderAppendBenchmarks-report-full.json), [arguments](comparison-001/Original/command.json), [actual result](comparison-001/Original/result.json).
Candidate: [raw stdout](comparison-001/Candidate/stdout.txt), [full JSON](comparison-001/Candidate/reports/results/AutoPerf.HeaderAppendBenchmarks-report-full.json), [arguments](comparison-001/Candidate/command.json), [actual result](comparison-001/Candidate/result.json).

Pair 2: Candidate then Original; [authorization](comparison-002/authorization.json), [completion](comparison-002/execution-receipt.json).
Original: [raw stdout](comparison-002/Original/stdout.txt), [full JSON](comparison-002/Original/reports/results/AutoPerf.HeaderAppendBenchmarks-report-full.json), [arguments](comparison-002/Original/command.json), [actual result](comparison-002/Original/result.json).
Candidate: [raw stdout](comparison-002/Candidate/stdout.txt), [full JSON](comparison-002/Candidate/reports/results/AutoPerf.HeaderAppendBenchmarks-report-full.json), [arguments](comparison-002/Candidate/command.json), [actual result](comparison-002/Candidate/result.json).

Pair 3: Original then Candidate; [authorization](comparison-003/authorization.json), [completion](comparison-003/execution-receipt.json).
Original: [raw stdout](comparison-003/Original/stdout.txt), [full JSON](comparison-003/Original/reports/results/AutoPerf.HeaderAppendBenchmarks-report-full.json), [arguments](comparison-003/Original/command.json), [actual result](comparison-003/Original/result.json).
Candidate: [raw stdout](comparison-003/Candidate/stdout.txt), [full JSON](comparison-003/Candidate/reports/results/AutoPerf.HeaderAppendBenchmarks-report-full.json), [arguments](comparison-003/Candidate/command.json), [actual result](comparison-003/Candidate/result.json).
