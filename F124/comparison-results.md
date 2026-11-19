# F124: every measured result

The predeclared primary is the actual compiled private `Predicate/MinimalProgram` on a real parser-produced 38-descendant source fixture. Negative **less-time** means slower. This is not a full analyzer, build or IDE speedup.

| Pair | Order | Original ns/op | Candidate ns/op | Less time | B/op |
|---|---|---:|---:|---:|---|
| 1 | Original -> Candidate | 1987.10 | 323.21 | 83.73% | 112 -> 168 |
| 2 | Candidate -> Original | 1973.95 | 324.15 | 83.58% | 112 -> 168 |
| 3 | Original -> Candidate | 2105.95 | 300.92 | 85.71% | 112 -> 168 |

Median paired primary effect: **83.73% less time**, with **112 -> 168 reported B/op (+56)** in every pair. This is a median of paired percentage effects, not a ratio of independent medians. The same-profile unchanged GetLocation effects are -9.79% / 9.43% / 10.49%; each primary benefit exceeds their absolute movement.

## Important adverse and uncertain observations

**No demonstrated full-driver improvement:** `AnalyzeCompilation/MinimalProgram` has median **1.79% more time**, with effects -1.79% / -8.84% / +2.95% less time. It uses a fresh real CompilationWithAnalyzers driver on every invocation over a prepared valid compilation, not a cached completed diagnostic result.

The one-descendant predicate is **13.83% slower** at the median and also adds 56 reported B/op. The unchanged EarlyGuard is highly unstable: **-522.24% / -8.94% / +83.34% less time**; its same-profile unchanged location control moves -83.27% / +2.82% / +78.48%. The ordinary predicate's median slowdown is **8.94%**, narrowly below the predeclared 10% rejection threshold. The two adverse pairs are retained; **no neutrality or causal explanation is claimed**.

LargeProgram adds 128 actual MapGet registrations and is only a scaling probe. Its favorable predicate and driver observations do not replace the ordinary primary or prove workload frequency.

## Every profile, secondary and control

| Method | Profile | Median less time | Each pair less time | Original -> candidate B/op |
|---|---|---:|---|---|
| Predicate | EarlyGuard | -8.94% | -522.24% / -8.94% / 83.34% | 0/0/0 -> 0/0/0 |
| Predicate | LargeProgram | 99.57% | 99.57% / 99.57% / 99.62% | 117/117/117 -> 168/168/168 |
| Predicate | LoneDeclaration | -13.83% | -13.83% / -17.64% / -2.06% | 112/112/112 -> 168/168/168 |
| Predicate | MinimalProgram | 83.73% | 83.73% / 83.58% / 85.71% | 112/112/112 -> 168/168/168 |
| AnalyzeCompilation | EarlyGuard | 4.29% | 4.29% / 4.41% / -5.33% | 104424/104611/104571 -> 104573/104368/104372 |
| AnalyzeCompilation | LargeProgram | 11.21% | 14.81% / 4.59% / 11.21% | 1307760/1307676/1306418 -> 1308084/1305742/1307922 |
| AnalyzeCompilation | LoneDeclaration | 0.33% | 0.33% / -31.12% / 5.13% | 87020/86836/86830 -> 86993/86867/86987 |
| AnalyzeCompilation | MinimalProgram | -1.79% | -1.79% / -8.84% / 2.95% | 105234/105360/105436 -> 105398/105259/105132 |
| UnchangedGetLocation | EarlyGuard | 2.82% | -83.27% / 2.82% / 78.48% | 32/32/32 -> 32/32/32 |
| UnchangedGetLocation | LargeProgram | 12.95% | -22.00% / 12.95% / 21.33% | 32/32/32 -> 32/32/32 |
| UnchangedGetLocation | LoneDeclaration | 2.01% | -4.50% / 2.01% / 4.54% | 32/32/32 -> 32/32/32 |
| UnchangedGetLocation | MinimalProgram | 9.43% | -9.79% / 9.43% / 10.49% | 32/32/32 -> 32/32/32 |

## Every case's variability

All eight results are retained. SD is sample standard deviation; fitted trend is fitted first-to-last change divided by the mean. The largest observed case CV is 72.91%. No outlier removal, retuning, new primary or specific JIT-cause claim.

| Pair | Source | Method | Profile | Mean ns | Median ns | SD ns | CV | First-half ns | Last-half ns | Fitted trend |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Original | Predicate | EarlyGuard | 45.85 | 45.57 | 0.69 | 1.51% | 45.54 | 46.15 | 3.28% |
| 1 | Original | AnalyzeCompilation | EarlyGuard | 4282289.88 | 4401833.33 | 393594.84 | 9.19% | 4046177.38 | 4518402.38 | 19.45% |
| 1 | Original | UnchangedGetLocation | EarlyGuard | 33.09 | 31.95 | 3.97 | 11.99% | 35.06 | 31.12 | -24.76% |
| 1 | Original | Predicate | LargeProgram | 74683.69 | 74671.77 | 332.04 | 0.44% | 74696.41 | 74670.98 | -0.26% |
| 1 | Original | AnalyzeCompilation | LargeProgram | 12095912.50 | 12205600.00 | 1135126.06 | 9.38% | 12637481.25 | 11554343.75 | -21.73% |
| 1 | Original | UnchangedGetLocation | LargeProgram | 31.13 | 31.03 | 0.39 | 1.26% | 31.08 | 31.17 | 0.32% |
| 1 | Original | Predicate | LoneDeclaration | 374.00 | 374.37 | 8.84 | 2.36% | 378.78 | 369.21 | -5.82% |
| 1 | Original | AnalyzeCompilation | LoneDeclaration | 993391.54 | 994593.23 | 31054.84 | 3.13% | 997647.14 | 989135.94 | -0.50% |
| 1 | Original | UnchangedGetLocation | LoneDeclaration | 32.49 | 31.99 | 1.03 | 3.16% | 33.24 | 31.74 | -7.82% |
| 1 | Original | Predicate | MinimalProgram | 1987.10 | 1983.20 | 15.66 | 0.79% | 1998.46 | 1975.74 | -1.25% |
| 1 | Original | AnalyzeCompilation | MinimalProgram | 1174207.87 | 1170107.30 | 26965.01 | 2.30% | 1166496.07 | 1181919.66 | 0.12% |
| 1 | Original | UnchangedGetLocation | MinimalProgram | 31.21 | 30.94 | 0.71 | 2.29% | 31.32 | 31.11 | -2.01% |
| 1 | Candidate | Predicate | EarlyGuard | 285.28 | 401.80 | 174.33 | 61.11% | 406.28 | 164.29 | -147.96% |
| 1 | Candidate | AnalyzeCompilation | EarlyGuard | 4098621.25 | 4084475.00 | 257246.13 | 6.28% | 4208753.75 | 3988488.75 | -8.71% |
| 1 | Candidate | UnchangedGetLocation | EarlyGuard | 60.64 | 46.84 | 34.17 | 56.35% | 74.94 | 46.34 | -104.48% |
| 1 | Candidate | Predicate | LargeProgram | 321.32 | 319.07 | 5.77 | 1.80% | 323.51 | 319.13 | -1.40% |
| 1 | Candidate | AnalyzeCompilation | LargeProgram | 10304656.25 | 10083700.00 | 1069938.20 | 10.38% | 11165025.00 | 9444287.50 | -28.69% |
| 1 | Candidate | UnchangedGetLocation | LargeProgram | 37.97 | 37.81 | 0.85 | 2.23% | 37.78 | 38.17 | 0.14% |
| 1 | Candidate | Predicate | LoneDeclaration | 425.72 | 415.12 | 26.69 | 6.27% | 417.52 | 433.91 | -0.46% |
| 1 | Candidate | AnalyzeCompilation | LoneDeclaration | 990126.56 | 990165.63 | 33560.19 | 3.39% | 991690.36 | 988562.76 | 0.68% |
| 1 | Candidate | UnchangedGetLocation | LoneDeclaration | 33.95 | 33.45 | 1.11 | 3.28% | 33.85 | 34.06 | 3.96% |
| 1 | Candidate | Predicate | MinimalProgram | 323.21 | 319.50 | 14.47 | 4.48% | 327.38 | 319.03 | -2.38% |
| 1 | Candidate | AnalyzeCompilation | MinimalProgram | 1195237.20 | 1195405.36 | 33865.63 | 2.83% | 1197048.21 | 1193426.19 | -3.78% |
| 1 | Candidate | UnchangedGetLocation | MinimalProgram | 34.27 | 34.11 | 0.90 | 2.62% | 34.82 | 33.72 | -3.60% |
| 2 | Candidate | Predicate | EarlyGuard | 274.41 | 370.67 | 161.48 | 58.85% | 398.24 | 150.58 | -149.06% |
| 2 | Candidate | AnalyzeCompilation | EarlyGuard | 3819186.90 | 3802721.43 | 113059.69 | 2.96% | 3767658.33 | 3870715.48 | 4.60% |
| 2 | Candidate | UnchangedGetLocation | EarlyGuard | 49.93 | 46.31 | 10.41 | 20.85% | 53.46 | 46.41 | -33.43% |
| 2 | Candidate | Predicate | LargeProgram | 318.51 | 317.28 | 4.71 | 1.48% | 319.94 | 317.07 | -2.33% |
| 2 | Candidate | AnalyzeCompilation | LargeProgram | 11161656.25 | 10961237.50 | 1087253.09 | 9.74% | 11989687.50 | 10333625.00 | -24.82% |
| 2 | Candidate | UnchangedGetLocation | LargeProgram | 35.98 | 34.80 | 2.97 | 8.26% | 35.88 | 36.09 | 0.64% |
| 2 | Candidate | Predicate | LoneDeclaration | 431.56 | 427.71 | 21.63 | 5.01% | 431.96 | 431.16 | -1.67% |
| 2 | Candidate | AnalyzeCompilation | LoneDeclaration | 1210088.50 | 1201946.67 | 28102.32 | 2.32% | 1228290.33 | 1191886.67 | -5.56% |
| 2 | Candidate | UnchangedGetLocation | LoneDeclaration | 34.73 | 34.86 | 1.83 | 5.27% | 34.70 | 34.75 | -1.70% |
| 2 | Candidate | Predicate | MinimalProgram | 324.15 | 325.66 | 5.31 | 1.64% | 325.44 | 322.87 | 0.61% |
| 2 | Candidate | AnalyzeCompilation | MinimalProgram | 1295136.58 | 1245763.24 | 124150.86 | 9.59% | 1244604.41 | 1345668.75 | 2.21% |
| 2 | Candidate | UnchangedGetLocation | MinimalProgram | 32.66 | 32.44 | 0.88 | 2.70% | 33.20 | 32.12 | -5.87% |
| 2 | Original | Predicate | EarlyGuard | 251.90 | 302.39 | 183.67 | 72.91% | 417.97 | 85.84 | -189.36% |
| 2 | Original | AnalyzeCompilation | EarlyGuard | 3995474.34 | 4010594.74 | 123626.45 | 3.09% | 4012635.53 | 3978313.16 | 0.38% |
| 2 | Original | UnchangedGetLocation | EarlyGuard | 51.38 | 49.83 | 5.14 | 10.01% | 53.56 | 49.21 | -18.85% |
| 2 | Original | Predicate | LargeProgram | 74231.33 | 74064.58 | 637.80 | 0.86% | 73969.21 | 74493.45 | 1.33% |
| 2 | Original | AnalyzeCompilation | LargeProgram | 11699093.75 | 11947837.50 | 903980.12 | 7.73% | 12496018.75 | 10902168.75 | -19.37% |
| 2 | Original | UnchangedGetLocation | LargeProgram | 41.33 | 41.37 | 0.43 | 1.04% | 41.14 | 41.52 | 1.35% |
| 2 | Original | Predicate | LoneDeclaration | 366.85 | 365.61 | 5.20 | 1.42% | 366.97 | 366.73 | -1.09% |
| 2 | Original | AnalyzeCompilation | LoneDeclaration | 922915.48 | 926654.13 | 14466.86 | 1.57% | 918603.67 | 927227.29 | 0.98% |
| 2 | Original | UnchangedGetLocation | LoneDeclaration | 35.44 | 35.38 | 0.35 | 0.99% | 35.56 | 35.33 | -0.64% |
| 2 | Original | Predicate | MinimalProgram | 1973.95 | 1968.02 | 16.94 | 0.86% | 1978.93 | 1968.97 | -1.41% |
| 2 | Original | AnalyzeCompilation | MinimalProgram | 1189948.21 | 1187205.95 | 25796.16 | 2.17% | 1184649.70 | 1195246.73 | -0.87% |
| 2 | Original | UnchangedGetLocation | MinimalProgram | 36.06 | 36.00 | 0.43 | 1.20% | 35.90 | 36.22 | 1.71% |
| 3 | Original | Predicate | EarlyGuard | 279.28 | 399.64 | 191.55 | 68.59% | 427.72 | 130.85 | -169.87% |
| 3 | Original | AnalyzeCompilation | EarlyGuard | 4115468.42 | 4092078.95 | 246582.40 | 5.99% | 4077094.74 | 4153842.11 | 8.22% |
| 3 | Original | UnchangedGetLocation | EarlyGuard | 140.87 | 178.22 | 64.29 | 45.64% | 190.00 | 91.74 | -117.92% |
| 3 | Original | Predicate | LargeProgram | 78027.06 | 77567.24 | 2016.74 | 2.58% | 78478.90 | 77575.21 | -0.14% |
| 3 | Original | AnalyzeCompilation | LargeProgram | 12595306.25 | 11645000.00 | 2220565.32 | 17.63% | 13082356.25 | 12108256.25 | -30.12% |
| 3 | Original | UnchangedGetLocation | LargeProgram | 39.19 | 39.23 | 1.45 | 3.71% | 40.00 | 38.38 | -7.10% |
| 3 | Original | Predicate | LoneDeclaration | 391.60 | 386.88 | 10.54 | 2.69% | 398.35 | 384.86 | -5.33% |
| 3 | Original | AnalyzeCompilation | LoneDeclaration | 996709.86 | 1000286.11 | 61575.72 | 6.18% | 1013149.44 | 980270.28 | -9.66% |
| 3 | Original | UnchangedGetLocation | LoneDeclaration | 33.41 | 33.09 | 0.83 | 2.49% | 33.55 | 33.27 | -3.32% |
| 3 | Original | Predicate | MinimalProgram | 2105.95 | 2086.45 | 72.01 | 3.42% | 2078.86 | 2133.05 | 4.87% |
| 3 | Original | AnalyzeCompilation | MinimalProgram | 1181708.93 | 1163875.00 | 39918.30 | 3.38% | 1158485.71 | 1204932.14 | 4.08% |
| 3 | Original | UnchangedGetLocation | MinimalProgram | 33.86 | 33.93 | 0.30 | 0.89% | 33.81 | 33.91 | 0.34% |
| 3 | Candidate | Predicate | EarlyGuard | 46.52 | 46.43 | 0.34 | 0.74% | 46.47 | 46.57 | 0.75% |
| 3 | Candidate | AnalyzeCompilation | EarlyGuard | 4334822.92 | 4234297.22 | 462828.72 | 10.68% | 3942202.78 | 4727443.06 | 26.13% |
| 3 | Candidate | UnchangedGetLocation | EarlyGuard | 30.32 | 30.26 | 0.45 | 1.48% | 30.11 | 30.53 | 0.35% |
| 3 | Candidate | Predicate | LargeProgram | 294.81 | 294.58 | 1.81 | 0.61% | 293.74 | 295.87 | 0.46% |
| 3 | Candidate | AnalyzeCompilation | LargeProgram | 11183728.13 | 11270100.00 | 833414.76 | 7.45% | 11544187.50 | 10823268.75 | -15.54% |
| 3 | Candidate | UnchangedGetLocation | LargeProgram | 30.83 | 30.52 | 1.25 | 4.05% | 31.39 | 30.27 | -7.90% |
| 3 | Candidate | Predicate | LoneDeclaration | 399.68 | 394.10 | 24.58 | 6.15% | 394.75 | 404.61 | 4.95% |
| 3 | Candidate | AnalyzeCompilation | LoneDeclaration | 945620.71 | 971640.69 | 42545.21 | 4.50% | 914981.13 | 976260.29 | 11.34% |
| 3 | Candidate | UnchangedGetLocation | LoneDeclaration | 31.90 | 32.53 | 0.99 | 3.12% | 32.62 | 31.17 | -7.63% |
| 3 | Candidate | Predicate | MinimalProgram | 300.92 | 302.21 | 7.81 | 2.60% | 294.91 | 306.94 | 6.35% |
| 3 | Candidate | AnalyzeCompilation | MinimalProgram | 1146812.21 | 1135275.88 | 37924.35 | 3.31% | 1156008.53 | 1137615.88 | -0.26% |
| 3 | Candidate | UnchangedGetLocation | MinimalProgram | 30.31 | 30.21 | 0.41 | 1.35% | 30.57 | 30.04 | -3.43% |

## Raw authority

- Pair 1: [Original full JSON](comparison-001/Original/reports/results/AutoPerf.AnalyzerBenchmarks-report-full.json), [Candidate full JSON](comparison-001/Candidate/reports/results/AutoPerf.AnalyzerBenchmarks-report-full.json), [authorization](comparison-001/authorization.json), [receipt](comparison-001/execution-receipt.json).
- Pair 2: [Original full JSON](comparison-002/Original/reports/results/AutoPerf.AnalyzerBenchmarks-report-full.json), [Candidate full JSON](comparison-002/Candidate/reports/results/AutoPerf.AnalyzerBenchmarks-report-full.json), [authorization](comparison-002/authorization.json), [receipt](comparison-002/execution-receipt.json).
- Pair 3: [Original full JSON](comparison-003/Original/reports/results/AutoPerf.AnalyzerBenchmarks-report-full.json), [Candidate full JSON](comparison-003/Candidate/reports/results/AutoPerf.AnalyzerBenchmarks-report-full.json), [authorization](comparison-003/authorization.json), [receipt](comparison-003/execution-receipt.json).

Every source directory preserves stdout, warmups, raw overhead/workload/result/GC observations, all runtime/source/owner/settings records and native exports. [Independent recomputation](measurement-audit.json) checks every one of **576 retained samples**, including actual-minus-median-overhead arithmetic and [pinned BDN midpoint-to-even allocation accounting](BenchmarkDotNet-0.13.0-GcStats.cs) with its [license](BenchmarkDotNet-0.13.0-LICENSE.md).
