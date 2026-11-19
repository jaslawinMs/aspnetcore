# F121: all measured results

The declared primary is one public `CopyTo` on an already-copied, actual MVC five-factory collection, into an exact-sized preallocated array. Negative **less-time** means slower. These are local method measurements, not request throughput.

| Comparison | Order | Original ns/op | Candidate ns/op | Less time | B/op |
|---|---|---:|---:|---:|---|
| 1 | Original -> Candidate | 28.68 | 33.27 | -16.03% | 0 -> 0 |
| 2 | Candidate -> Original | 31.91 | 33.53 | -5.06% | 0 -> 0 |
| 3 | Original -> Candidate | 29.37 | 34.90 | -18.84% | 0 -> 0 |

Median paired primary effect: **-16.03% less time**, or **16.03% more time**. This is the median of paired percentage effects, not a ratio of independent medians. BenchmarkDotNet reports **0 B/op in both variants in every primary pair**.

## Every profile and unchanged control

The zero-offset destinations are exact-sized. Offset-two destinations retain two sentinel entries before and after the copied region. Both timed methods share the same immutable prepared collection. No favorable row substitutes for the primary.

| Method | Profile | Median less time | Each comparison less time | Original -> candidate B/op |
|---|---|---:|---|---|
| CopyTo | CopiedDefault5 | -16.03% | -16.03% / -5.06% / -18.84% | 0/0/0 -> 0/0/0 |
| CopyTo | UnmodifiedDefault5 | 19.43% | 22.95% / 19.43% / 13.75% | 32/32/32 -> 32/32/32 |
| CopyTo | CopiedDefault5Offset2 | -10.18% | -10.18% / -4.07% / -18.33% | 0/0/0 -> 0/0/0 |
| CopyTo | UnmodifiedDefault5Offset2 | 18.93% | 26.21% / 18.93% / 13.78% | 32/32/32 -> 32/32/32 |
| CopyTo | CopiedEmpty | 27.54% | 30.39% / 25.18% / 27.54% | 0/0/0 -> 0/0/0 |
| CopyTo | CopiedOne | -26.97% | -26.20% / -27.63% / -26.97% | 0/0/0 -> 0/0/0 |
| CopyTo | CopiedEight | -12.49% | -13.78% / -12.49% / -11.37% | 0/0/0 -> 0/0/0 |
| CopyTo | CopiedEightOffset2 | -12.12% | -14.15% / -12.12% / -11.95% | 0/0/0 -> 0/0/0 |
| UnchangedIndexOf | CopiedDefault5 | -6.03% | -12.21% / -6.03% / 5.69% | 0/0/0 -> 0/0/0 |
| UnchangedIndexOf | UnmodifiedDefault5 | -3.47% | -3.47% / -6.29% / 17.00% | 32/32/32 -> 32/32/32 |
| UnchangedIndexOf | CopiedDefault5Offset2 | 4.45% | 39.99% / -4.10% / 4.45% | 0/0/0 -> 0/0/0 |
| UnchangedIndexOf | UnmodifiedDefault5Offset2 | 2.03% | 5.92% / -4.72% / 2.03% | 32/32/32 -> 32/32/32 |
| UnchangedIndexOf | CopiedEmpty | 4.76% | 4.76% / 8.01% / -13.54% | 0/0/0 -> 0/0/0 |
| UnchangedIndexOf | CopiedOne | -5.02% | -5.02% / -5.33% / 0.32% | 0/0/0 -> 0/0/0 |
| UnchangedIndexOf | CopiedEight | -1.29% | -1.29% / -5.80% / 5.44% | 0/0/0 -> 0/0/0 |
| UnchangedIndexOf | CopiedEightOffset2 | -1.79% | -1.79% / -7.93% / 9.22% | 0/0/0 -> 0/0/0 |

The source-backed path is not edited; its favorable observations and all unchanged `IndexOf` movements are retained without assigning a JIT cause. Several unchanged controls are unstable; the highest individual-case CV across the complete matrix is 47.71%. Do not treat those controls as perfectly stable. No disassembly was collected.

## All individual case variability

Each row retains all eight workload-result observations. SD is the sample standard deviation; fitted trend is the fitted first-to-last change divided by the mean. No outlier removal, case substitution or profile retuning occurred.

| Comparison | Source | Method | Profile | Mean ns | SD ns | CV | First-half ns | Last-half ns | Fitted trend |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| 1 | Original | CopyTo | CopiedDefault5 | 28.68 | 0.30 | 1.06% | 28.67 | 28.69 | 0.79% |
| 1 | Original | UnchangedIndexOf | CopiedDefault5 | 11.24 | 0.38 | 3.37% | 11.10 | 11.37 | 0.96% |
| 1 | Original | CopyTo | UnmodifiedDefault5 | 65.58 | 1.65 | 2.52% | 66.16 | 65.00 | -4.17% |
| 1 | Original | UnchangedIndexOf | UnmodifiedDefault5 | 48.61 | 0.44 | 0.91% | 48.52 | 48.70 | 0.38% |
| 1 | Original | CopyTo | CopiedDefault5Offset2 | 28.77 | 0.50 | 1.75% | 28.54 | 29.01 | 3.15% |
| 1 | Original | UnchangedIndexOf | CopiedDefault5Offset2 | 18.18 | 0.25 | 1.38% | 18.16 | 18.19 | 1.37% |
| 1 | Original | CopyTo | UnmodifiedDefault5Offset2 | 68.04 | 2.61 | 3.84% | 68.97 | 67.10 | -5.05% |
| 1 | Original | UnchangedIndexOf | UnmodifiedDefault5Offset2 | 53.12 | 4.05 | 7.62% | 55.68 | 50.55 | -14.12% |
| 1 | Original | CopyTo | CopiedEmpty | 7.75 | 0.14 | 1.83% | 7.76 | 7.75 | -1.50% |
| 1 | Original | UnchangedIndexOf | CopiedEmpty | 6.87 | 0.06 | 0.91% | 6.88 | 6.86 | -1.10% |
| 1 | Original | CopyTo | CopiedOne | 7.77 | 0.08 | 1.02% | 7.83 | 7.71 | -1.63% |
| 1 | Original | UnchangedIndexOf | CopiedOne | 3.57 | 0.07 | 1.90% | 3.58 | 3.55 | -1.30% |
| 1 | Original | CopyTo | CopiedEight | 41.48 | 0.55 | 1.33% | 41.33 | 41.63 | 1.02% |
| 1 | Original | UnchangedIndexOf | CopiedEight | 16.78 | 0.14 | 0.80% | 16.82 | 16.74 | -0.43% |
| 1 | Original | CopyTo | CopiedEightOffset2 | 40.59 | 0.98 | 2.42% | 40.30 | 40.88 | 2.23% |
| 1 | Original | UnchangedIndexOf | CopiedEightOffset2 | 16.70 | 0.61 | 3.64% | 16.46 | 16.93 | 2.23% |
| 1 | Candidate | CopyTo | CopiedDefault5 | 33.27 | 1.71 | 5.15% | 32.24 | 34.31 | 5.25% |
| 1 | Candidate | UnchangedIndexOf | CopiedDefault5 | 12.61 | 2.02 | 16.05% | 12.75 | 12.47 | -21.81% |
| 1 | Candidate | CopyTo | UnmodifiedDefault5 | 50.53 | 0.81 | 1.59% | 50.65 | 50.41 | -0.68% |
| 1 | Candidate | UnchangedIndexOf | UnmodifiedDefault5 | 50.29 | 1.02 | 2.02% | 50.20 | 50.38 | 0.73% |
| 1 | Candidate | CopyTo | CopiedDefault5Offset2 | 31.70 | 0.28 | 0.87% | 31.56 | 31.85 | 1.03% |
| 1 | Candidate | UnchangedIndexOf | CopiedDefault5Offset2 | 10.91 | 0.11 | 1.04% | 10.86 | 10.96 | 1.35% |
| 1 | Candidate | CopyTo | UnmodifiedDefault5Offset2 | 50.20 | 0.40 | 0.79% | 50.16 | 50.24 | 0.16% |
| 1 | Candidate | UnchangedIndexOf | UnmodifiedDefault5Offset2 | 49.97 | 0.46 | 0.91% | 50.18 | 49.76 | -1.82% |
| 1 | Candidate | CopyTo | CopiedEmpty | 5.40 | 0.04 | 0.77% | 5.40 | 5.40 | 0.01% |
| 1 | Candidate | UnchangedIndexOf | CopiedEmpty | 6.54 | 0.08 | 1.29% | 6.58 | 6.50 | -2.44% |
| 1 | Candidate | CopyTo | CopiedOne | 9.81 | 0.16 | 1.58% | 9.69 | 9.93 | 3.71% |
| 1 | Candidate | UnchangedIndexOf | CopiedOne | 3.74 | 0.11 | 2.95% | 3.72 | 3.77 | 3.18% |
| 1 | Candidate | CopyTo | CopiedEight | 47.19 | 0.70 | 1.48% | 47.45 | 46.94 | -2.19% |
| 1 | Candidate | UnchangedIndexOf | CopiedEight | 17.00 | 0.24 | 1.38% | 16.92 | 17.07 | 1.19% |
| 1 | Candidate | CopyTo | CopiedEightOffset2 | 46.33 | 0.56 | 1.21% | 46.02 | 46.64 | 1.90% |
| 1 | Candidate | UnchangedIndexOf | CopiedEightOffset2 | 16.99 | 0.90 | 5.30% | 16.55 | 17.44 | 11.19% |
| 2 | Candidate | CopyTo | CopiedDefault5 | 33.53 | 1.12 | 3.35% | 33.77 | 33.28 | -1.24% |
| 2 | Candidate | UnchangedIndexOf | CopiedDefault5 | 11.86 | 0.11 | 0.92% | 11.82 | 11.90 | 1.22% |
| 2 | Candidate | CopyTo | UnmodifiedDefault5 | 56.21 | 3.02 | 5.37% | 55.23 | 57.18 | 8.30% |
| 2 | Candidate | UnchangedIndexOf | UnmodifiedDefault5 | 51.14 | 0.78 | 1.53% | 51.36 | 50.93 | -2.41% |
| 2 | Candidate | CopyTo | CopiedDefault5Offset2 | 33.08 | 0.32 | 0.97% | 33.03 | 33.14 | -0.06% |
| 2 | Candidate | UnchangedIndexOf | CopiedDefault5Offset2 | 11.73 | 0.18 | 1.55% | 11.66 | 11.81 | 1.82% |
| 2 | Candidate | CopyTo | UnmodifiedDefault5Offset2 | 56.51 | 2.49 | 4.40% | 57.27 | 55.75 | -1.18% |
| 2 | Candidate | UnchangedIndexOf | UnmodifiedDefault5Offset2 | 51.05 | 0.48 | 0.94% | 51.21 | 50.90 | -0.65% |
| 2 | Candidate | CopyTo | CopiedEmpty | 5.40 | 0.03 | 0.53% | 5.38 | 5.42 | 1.13% |
| 2 | Candidate | UnchangedIndexOf | CopiedEmpty | 6.63 | 0.08 | 1.18% | 6.61 | 6.64 | 1.94% |
| 2 | Candidate | CopyTo | CopiedOne | 9.88 | 0.15 | 1.52% | 9.92 | 9.85 | -1.85% |
| 2 | Candidate | UnchangedIndexOf | CopiedOne | 4.12 | 0.08 | 2.06% | 4.10 | 4.14 | 0.67% |
| 2 | Candidate | CopyTo | CopiedEight | 47.06 | 0.74 | 1.57% | 47.44 | 46.69 | -1.47% |
| 2 | Candidate | UnchangedIndexOf | CopiedEight | 17.87 | 0.25 | 1.39% | 17.83 | 17.91 | -0.42% |
| 2 | Candidate | CopyTo | CopiedEightOffset2 | 46.52 | 0.65 | 1.40% | 46.69 | 46.34 | -0.09% |
| 2 | Candidate | UnchangedIndexOf | CopiedEightOffset2 | 17.86 | 0.25 | 1.41% | 17.80 | 17.92 | 1.02% |
| 2 | Original | CopyTo | CopiedDefault5 | 31.91 | 0.35 | 1.11% | 31.94 | 31.88 | -1.19% |
| 2 | Original | UnchangedIndexOf | CopiedDefault5 | 11.18 | 0.13 | 1.14% | 11.26 | 11.11 | -1.66% |
| 2 | Original | CopyTo | UnmodifiedDefault5 | 69.76 | 0.77 | 1.10% | 69.92 | 69.59 | -1.04% |
| 2 | Original | UnchangedIndexOf | UnmodifiedDefault5 | 48.12 | 0.91 | 1.89% | 47.62 | 48.61 | 1.20% |
| 2 | Original | CopyTo | CopiedDefault5Offset2 | 31.79 | 0.53 | 1.66% | 31.78 | 31.80 | 1.36% |
| 2 | Original | UnchangedIndexOf | CopiedDefault5Offset2 | 11.27 | 0.23 | 2.05% | 11.39 | 11.15 | -3.76% |
| 2 | Original | CopyTo | UnmodifiedDefault5Offset2 | 69.71 | 0.57 | 0.82% | 69.91 | 69.51 | -1.67% |
| 2 | Original | UnchangedIndexOf | UnmodifiedDefault5Offset2 | 48.75 | 1.16 | 2.38% | 49.72 | 47.78 | -5.49% |
| 2 | Original | CopyTo | CopiedEmpty | 7.22 | 0.02 | 0.28% | 7.22 | 7.21 | -0.09% |
| 2 | Original | UnchangedIndexOf | CopiedEmpty | 7.20 | 0.03 | 0.45% | 7.22 | 7.19 | -0.47% |
| 2 | Original | CopyTo | CopiedOne | 7.74 | 0.12 | 1.54% | 7.81 | 7.67 | -3.13% |
| 2 | Original | UnchangedIndexOf | CopiedOne | 3.91 | 0.05 | 1.37% | 3.89 | 3.94 | 1.12% |
| 2 | Original | CopyTo | CopiedEight | 41.84 | 0.48 | 1.14% | 41.49 | 42.19 | 2.71% |
| 2 | Original | UnchangedIndexOf | CopiedEight | 16.89 | 0.10 | 0.57% | 16.88 | 16.90 | 0.34% |
| 2 | Original | CopyTo | CopiedEightOffset2 | 41.49 | 0.57 | 1.37% | 41.72 | 41.26 | -2.47% |
| 2 | Original | UnchangedIndexOf | CopiedEightOffset2 | 16.55 | 0.16 | 0.96% | 16.54 | 16.55 | -0.05% |
| 3 | Original | CopyTo | CopiedDefault5 | 29.37 | 0.42 | 1.43% | 29.40 | 29.33 | 0.67% |
| 3 | Original | UnchangedIndexOf | CopiedDefault5 | 11.90 | 0.12 | 0.98% | 11.89 | 11.90 | -0.28% |
| 3 | Original | CopyTo | UnmodifiedDefault5 | 66.92 | 0.67 | 1.01% | 66.75 | 67.08 | 0.78% |
| 3 | Original | UnchangedIndexOf | UnmodifiedDefault5 | 61.73 | 29.45 | 47.71% | 72.17 | 51.29 | -78.78% |
| 3 | Original | CopyTo | CopiedDefault5Offset2 | 29.65 | 0.53 | 1.77% | 29.50 | 29.80 | 1.88% |
| 3 | Original | UnchangedIndexOf | CopiedDefault5Offset2 | 11.76 | 0.22 | 1.89% | 11.70 | 11.81 | -0.55% |
| 3 | Original | CopyTo | UnmodifiedDefault5Offset2 | 67.51 | 0.91 | 1.34% | 67.85 | 67.17 | -0.80% |
| 3 | Original | UnchangedIndexOf | UnmodifiedDefault5Offset2 | 51.84 | 0.92 | 1.78% | 52.06 | 51.63 | -1.69% |
| 3 | Original | CopyTo | CopiedEmpty | 7.51 | 0.06 | 0.76% | 7.52 | 7.51 | -0.44% |
| 3 | Original | UnchangedIndexOf | CopiedEmpty | 6.55 | 0.03 | 0.52% | 6.55 | 6.55 | 0.16% |
| 3 | Original | CopyTo | CopiedOne | 7.73 | 0.05 | 0.68% | 7.70 | 7.75 | 0.57% |
| 3 | Original | UnchangedIndexOf | CopiedOne | 4.01 | 0.11 | 2.77% | 4.06 | 3.97 | -3.78% |
| 3 | Original | CopyTo | CopiedEight | 42.07 | 0.51 | 1.21% | 42.19 | 41.94 | -0.33% |
| 3 | Original | UnchangedIndexOf | CopiedEight | 17.82 | 0.09 | 0.53% | 17.80 | 17.84 | 0.78% |
| 3 | Original | CopyTo | CopiedEightOffset2 | 41.61 | 0.66 | 1.58% | 41.59 | 41.62 | -0.39% |
| 3 | Original | UnchangedIndexOf | CopiedEightOffset2 | 18.12 | 0.17 | 0.92% | 18.07 | 18.17 | -0.22% |
| 3 | Candidate | CopyTo | CopiedDefault5 | 34.90 | 0.41 | 1.17% | 34.89 | 34.91 | 1.31% |
| 3 | Candidate | UnchangedIndexOf | CopiedDefault5 | 11.22 | 0.12 | 1.10% | 11.28 | 11.17 | -1.13% |
| 3 | Candidate | CopyTo | UnmodifiedDefault5 | 57.72 | 0.56 | 0.96% | 57.92 | 57.51 | -1.57% |
| 3 | Candidate | UnchangedIndexOf | UnmodifiedDefault5 | 51.24 | 0.83 | 1.61% | 51.28 | 51.19 | -0.35% |
| 3 | Candidate | CopyTo | CopiedDefault5Offset2 | 35.08 | 0.54 | 1.54% | 35.12 | 35.05 | -0.26% |
| 3 | Candidate | UnchangedIndexOf | CopiedDefault5Offset2 | 11.23 | 0.19 | 1.65% | 11.21 | 11.25 | 0.36% |
| 3 | Candidate | CopyTo | UnmodifiedDefault5Offset2 | 58.21 | 1.42 | 2.45% | 58.94 | 57.49 | -2.10% |
| 3 | Candidate | UnchangedIndexOf | UnmodifiedDefault5Offset2 | 50.79 | 0.28 | 0.56% | 50.86 | 50.72 | -0.75% |
| 3 | Candidate | CopyTo | CopiedEmpty | 5.44 | 0.07 | 1.38% | 5.42 | 5.47 | 0.45% |
| 3 | Candidate | UnchangedIndexOf | CopiedEmpty | 7.44 | 0.08 | 1.05% | 7.45 | 7.42 | -0.04% |
| 3 | Candidate | CopyTo | CopiedOne | 9.81 | 0.14 | 1.40% | 9.75 | 9.87 | 1.45% |
| 3 | Candidate | UnchangedIndexOf | CopiedOne | 4.00 | 0.12 | 3.10% | 4.08 | 3.92 | -5.94% |
| 3 | Candidate | CopyTo | CopiedEight | 46.85 | 0.51 | 1.09% | 46.72 | 46.98 | 1.01% |
| 3 | Candidate | UnchangedIndexOf | CopiedEight | 16.85 | 0.12 | 0.74% | 16.79 | 16.92 | 1.27% |
| 3 | Candidate | CopyTo | CopiedEightOffset2 | 46.58 | 0.61 | 1.30% | 46.28 | 46.88 | 0.35% |
| 3 | Candidate | UnchangedIndexOf | CopiedEightOffset2 | 16.45 | 0.12 | 0.71% | 16.40 | 16.50 | 0.49% |

## Raw authority

- Comparison 1: [Original full JSON](comparison-001/Original/reports/results/AutoPerf.CollectionBenchmarks-report-full.json), [Candidate full JSON](comparison-001/Candidate/reports/results/AutoPerf.CollectionBenchmarks-report-full.json), [authorization](comparison-001/authorization.json), [execution receipt](comparison-001/execution-receipt.json).
- Comparison 2: [Original full JSON](comparison-002/Original/reports/results/AutoPerf.CollectionBenchmarks-report-full.json), [Candidate full JSON](comparison-002/Candidate/reports/results/AutoPerf.CollectionBenchmarks-report-full.json), [authorization](comparison-002/authorization.json), [execution receipt](comparison-002/execution-receipt.json).
- Comparison 3: [Original full JSON](comparison-003/Original/reports/results/AutoPerf.CollectionBenchmarks-report-full.json), [Candidate full JSON](comparison-003/Candidate/reports/results/AutoPerf.CollectionBenchmarks-report-full.json), [authorization](comparison-003/authorization.json), [execution receipt](comparison-003/execution-receipt.json).

Each source directory also contains exact stdout with every warmup, adaptive-overhead, workload, result and GC observation, its runtime/owner/settings records and CSV/Markdown exports. [Independent recomputation](measurement-audit.json) checks all **768** actual-minus-median-overhead samples and midpoint-to-even allocation arithmetic against [the pinned BDN implementation](BenchmarkDotNet-0.13.0-GcStats.cs) and [license](BenchmarkDotNet-0.13.0-LICENSE.md).
