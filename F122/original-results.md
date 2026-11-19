# F122: every original-only observation

**No candidate was selected; this is not a before/after comparison.** One timing authorization completed four methods across all eight declared profiles, retaining eight observations per case: **32 cases / 256 samples**. Two unused authorizations are permanently closed.

The declared generic copied-five-factory loop reports **30.54 ns/op and 40 B/op**. The untouched-five-factory loop reports **52.23 ns/op and 32 B/op**. These measurements do not say that the interface path is allocation-free. The rejection concerns whether a new concrete-only pattern can be selected by the established production consumer, not whether interface enumeration has a cost.

The copied and unmodified profiles are different store states, not original/candidate implementations. Their absolute difference is not an optimization result. The retained-enumerator method separately exposes an escape boundary; `UnchangedIndexOf` is a same-collection diagnostic, not an alternative primary.

## All cases and variability

SD is the sample standard deviation; fitted trend is the within-run fitted first-to-last change divided by the mean. Every warmup and retained observation remains available; no outlier removal, case substitution or profile retuning occurred. Maximum case CV is **10.18%**. One original-only run cannot establish a change's repeatable effect.

| Method | Profile | Mean ns/op | SD ns | B/op | CV | First-half ns | Last-half ns | Fitted trend |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| EnumerateGeneric | CopiedDefault5 | 30.54 | 1.08 | 40 | 3.55% | 30.91 | 30.18 | -0.25% |
| EnumerateNonGeneric | CopiedDefault5 | 30.03 | 0.41 | 40 | 1.36% | 29.91 | 30.14 | 1.35% |
| RetainGenericEnumerator | CopiedDefault5 | 12.20 | 0.24 | 40 | 1.94% | 12.27 | 12.12 | -3.26% |
| UnchangedIndexOf | CopiedDefault5 | 10.65 | 0.11 | 0 | 1.04% | 10.70 | 10.61 | -0.69% |
| EnumerateGeneric | UnmodifiedDefault5 | 52.23 | 2.83 | 32 | 5.42% | 51.34 | 53.12 | 8.18% |
| EnumerateNonGeneric | UnmodifiedDefault5 | 51.18 | 0.38 | 32 | 0.74% | 51.39 | 50.96 | -1.16% |
| RetainGenericEnumerator | UnmodifiedDefault5 | 14.43 | 1.09 | 32 | 7.52% | 14.77 | 14.09 | -11.21% |
| UnchangedIndexOf | UnmodifiedDefault5 | 50.53 | 2.82 | 32 | 5.58% | 51.10 | 49.97 | -6.46% |
| EnumerateGeneric | CopiedEmpty | 6.49 | 0.03 | 0 | 0.46% | 6.47 | 6.51 | 0.66% |
| EnumerateNonGeneric | CopiedEmpty | 8.87 | 0.14 | 0 | 1.63% | 8.90 | 8.83 | -0.99% |
| RetainGenericEnumerator | CopiedEmpty | 4.54 | 0.11 | 0 | 2.34% | 4.59 | 4.49 | -4.28% |
| UnchangedIndexOf | CopiedEmpty | 6.22 | 0.08 | 0 | 1.21% | 6.25 | 6.20 | -1.14% |
| EnumerateGeneric | UnmodifiedEmpty | 13.19 | 0.30 | 0 | 2.24% | 13.15 | 13.23 | 2.66% |
| EnumerateNonGeneric | UnmodifiedEmpty | 15.23 | 0.25 | 0 | 1.63% | 15.07 | 15.38 | 1.91% |
| RetainGenericEnumerator | UnmodifiedEmpty | 7.19 | 0.09 | 0 | 1.22% | 7.19 | 7.20 | 0.70% |
| UnchangedIndexOf | UnmodifiedEmpty | 12.79 | 0.29 | 0 | 2.24% | 12.75 | 12.83 | -0.10% |
| EnumerateGeneric | CopiedOne | 14.28 | 0.36 | 40 | 2.50% | 14.18 | 14.37 | 1.51% |
| EnumerateNonGeneric | CopiedOne | 16.44 | 1.67 | 40 | 10.18% | 16.50 | 16.37 | 3.86% |
| RetainGenericEnumerator | CopiedOne | 12.41 | 0.15 | 40 | 1.22% | 12.41 | 12.41 | -1.10% |
| UnchangedIndexOf | CopiedOne | 3.82 | 0.07 | 0 | 1.91% | 3.81 | 3.84 | 2.14% |
| EnumerateGeneric | UnmodifiedOne | 28.21 | 1.00 | 32 | 3.53% | 27.91 | 28.50 | 2.12% |
| EnumerateNonGeneric | UnmodifiedOne | 29.40 | 0.61 | 32 | 2.08% | 29.26 | 29.53 | 0.04% |
| RetainGenericEnumerator | UnmodifiedOne | 15.32 | 0.97 | 32 | 6.32% | 14.97 | 15.66 | 6.74% |
| UnchangedIndexOf | UnmodifiedOne | 26.08 | 0.92 | 32 | 3.53% | 26.36 | 25.80 | -0.50% |
| EnumerateGeneric | CopiedEight | 39.99 | 0.90 | 40 | 2.26% | 40.50 | 39.48 | -4.32% |
| EnumerateNonGeneric | CopiedEight | 40.69 | 0.58 | 40 | 1.43% | 40.39 | 41.00 | 0.96% |
| RetainGenericEnumerator | CopiedEight | 12.79 | 1.13 | 40 | 8.84% | 13.16 | 12.43 | -14.70% |
| UnchangedIndexOf | CopiedEight | 16.82 | 0.18 | 0 | 1.05% | 16.87 | 16.78 | -0.45% |
| EnumerateGeneric | UnmodifiedEight | 71.68 | 0.88 | 32 | 1.22% | 71.46 | 71.91 | 1.09% |
| EnumerateNonGeneric | UnmodifiedEight | 69.17 | 0.45 | 32 | 0.66% | 69.39 | 68.95 | -1.54% |
| RetainGenericEnumerator | UnmodifiedEight | 14.25 | 0.18 | 32 | 1.29% | 14.13 | 14.36 | 2.39% |
| UnchangedIndexOf | UnmodifiedEight | 66.03 | 0.80 | 32 | 1.21% | 65.82 | 66.23 | 0.46% |

## Raw authority

[Full original JSON](original-profile-001/Original/reports/results/AutoPerf.CollectionBenchmarks-report-full.json), [exact stdout](original-profile-001/Original/stdout.txt), [authorization](original-profile-001/authorization.json), [execution receipt](original-profile-001/execution-receipt.json), [independent recomputation](measurement-audit.json).

The audit recomputes all 256 actual-minus-median-adaptive-overhead values and the reported statistics. It independently checks GC totals and BDN 0.13.0 midpoint-to-even allocation arithmetic against [the pinned implementation](BenchmarkDotNet-0.13.0-GcStats.cs) and [license](BenchmarkDotNet-0.13.0-LICENSE.md). Reported 0 B/op in an empty/control case is rounded amortized allocation, not a universal no-allocation proof. No disassembly or specific JIT-cause claim.
