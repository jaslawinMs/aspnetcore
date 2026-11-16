# F093 actual request-services disposal comparisons

Positive timing changes mean slower. All three unchanged-strategy comparisons, controls, regressions and raw samples remain.

**Original and selected disposal-only resource checks already allocate zero:** default non-generic ValueTask.AsTask returns cached Task.CompletedTask. No task-wrapper allocation saving and no removal of the required pending wait.

| Method / profile | Pair | Before ns/op | After ns/op | Change % | Before / after B/op | Saved B/op | Max CV % |
|---|---:|---:|---:|---:|---:|---:|---:|
| PreparedSync / AsyncCompleted1 | 1 | 683.34 | 720.41 | 5.42 | 1776 / 1776 | 0 | 2.74 |
| PreparedAsync / AsyncCompleted1 (unchanged control) | 1 | 716.41 | 679.17 | -5.20 | 1776 / 1776 | 0 | 2.65 |
| PublicExplicitSync / AsyncCompleted1 | 1 | 84840.88 | 89720.31 | 5.75 | 10504 / 10488 | 16 | 5.81 |
| PublicRegisteredAsync / AsyncCompleted1 (unchanged control) | 1 | 47129.69 | 74268.32 | 57.58 | 10236 / 10185 | 51 | 17.20 |
| PreparedSync / AsyncCompleted16 | 1 | 2541.28 | 2529.87 | -0.45 | 3776 / 3776 | 0 | 0.75 |
| PreparedAsync / AsyncCompleted16 (unchanged control) | 1 | 2577.97 | 2514.53 | -2.46 | 3776 / 3776 | 0 | 1.09 |
| PublicExplicitSync / AsyncCompleted16 | 1 | 34729.77 | 35755.49 | 2.95 | 12360 / 12352 | 8 | 1.99 |
| PublicRegisteredAsync / AsyncCompleted16 (unchanged control) | 1 | 35456.53 | 36158.01 | 1.98 | 12321 / 12318 | 3 | 1.65 |
| PreparedSync / DualCompleted1 | 1 | 747.61 | 738.64 | -1.20 | 1776 / 1776 | 0 | 5.53 |
| PreparedAsync / DualCompleted1 (unchanged control) | 1 | 730.36 | 712.84 | -2.40 | 1776 / 1776 | 0 | 2.31 |
| PublicExplicitSync / DualCompleted1 | 1 | 32670.38 | 32777.19 | 0.33 | 10236 / 10240 | -4 | 3.28 |
| PublicRegisteredAsync / DualCompleted1 (unchanged control) | 1 | 32702.89 | 33394.86 | 2.12 | 10239 / 10235 | 4 | 2.21 |
| PreparedSync / EmptyScope | 1 | 521.69 | 501.92 | -3.79 | 1416 / 1416 | 0 | 4.70 |
| PreparedAsync / EmptyScope (unchanged control) | 1 | 519.95 | 504.22 | -3.03 | 1416 / 1416 | 0 | 4.93 |
| PublicExplicitSync / EmptyScope | 1 | 31873.37 | 32867.83 | 3.12 | 9866 / 9882 | -16 | 5.07 |
| PublicRegisteredAsync / EmptyScope (unchanged control) | 1 | 32706.26 | 32575.68 | -0.40 | 9866 / 9879 | -13 | 4.52 |
| PreparedSync / SourceCompleted1 | 1 | 753.38 | 782.70 | 3.89 | 1816 / 1816 | 0 | 3.16 |
| PreparedAsync / SourceCompleted1 (unchanged control) | 1 | 775.19 | 760.78 | -1.86 | 1816 / 1816 | 0 | 4.47 |
| PublicExplicitSync / SourceCompleted1 | 1 | 32728.34 | 33153.22 | 1.30 | 10304 / 10292 | 12 | 2.72 |
| PublicRegisteredAsync / SourceCompleted1 (unchanged control) | 1 | 33630.27 | 33217.42 | -1.23 | 10268 / 10279 | -11 | 2.92 |
| PreparedSync / Sync1 | 1 | 713.68 | 717.19 | 0.49 | 1776 / 1776 | 0 | 2.95 |
| PreparedAsync / Sync1 (unchanged control) | 1 | 740.00 | 711.47 | -3.85 | 1776 / 1776 | 0 | 4.79 |
| PublicExplicitSync / Sync1 | 1 | 33695.84 | 32321.23 | -4.08 | 10243 / 10254 | -11 | 4.18 |
| PublicRegisteredAsync / Sync1 (unchanged control) | 1 | 33012.26 | 32502.52 | -1.54 | 10233 / 10257 | -24 | 5.65 |
| PreparedSync / Sync16 | 1 | 2644.14 | 2657.78 | 0.52 | 3776 / 3776 | 0 | 1.20 |
| PreparedAsync / Sync16 (unchanged control) | 1 | 2651.99 | 2621.05 | -1.17 | 3776 / 3776 | 0 | 1.26 |
| PublicExplicitSync / Sync16 | 1 | 35538.24 | 35402.26 | -0.38 | 12380 / 12368 | 12 | 2.36 |
| PublicRegisteredAsync / Sync16 (unchanged control) | 1 | 35550.69 | 36053.05 | 1.41 | 12337 / 12356 | -19 | 2.60 |
| PreparedSync / AsyncCompleted1 | 2 | 721.26 | 896.21 | 24.26 | 1776 / 1776 | 0 | 17.77 |
| PreparedAsync / AsyncCompleted1 (unchanged control) | 2 | 743.24 | 720.51 | -3.06 | 1776 / 1776 | 0 | 5.14 |
| PublicExplicitSync / AsyncCompleted1 | 2 | 92718.77 | 85560.91 | -7.72 | 10489 / 10532 | -43 | 4.42 |
| PublicRegisteredAsync / AsyncCompleted1 (unchanged control) | 2 | 59330.43 | 59705.89 | 0.63 | 10240 / 10129 | 111 | 18.75 |
| PreparedSync / AsyncCompleted16 | 2 | 2593.82 | 2520.45 | -2.83 | 3776 / 3776 | 0 | 4.34 |
| PreparedAsync / AsyncCompleted16 (unchanged control) | 2 | 2524.64 | 2531.42 | 0.27 | 3776 / 3776 | 0 | 1.57 |
| PublicExplicitSync / AsyncCompleted16 | 2 | 35640.55 | 35641.05 | 0.00 | 12369 / 12360 | 9 | 2.36 |
| PublicRegisteredAsync / AsyncCompleted16 (unchanged control) | 2 | 35578.59 | 36005.77 | 1.20 | 12348 / 12337 | 11 | 4.22 |
| PreparedSync / DualCompleted1 | 2 | 691.44 | 703.61 | 1.76 | 1776 / 1776 | 0 | 1.68 |
| PreparedAsync / DualCompleted1 (unchanged control) | 2 | 724.28 | 691.01 | -4.59 | 1776 / 1776 | 0 | 5.44 |
| PublicExplicitSync / DualCompleted1 | 2 | 33396.09 | 33006.08 | -1.17 | 10252 / 10252 | 0 | 2.15 |
| PublicRegisteredAsync / DualCompleted1 (unchanged control) | 2 | 34038.13 | 33578.05 | -1.35 | 10234 / 10248 | -14 | 3.46 |
| PreparedSync / EmptyScope | 2 | 521.62 | 475.90 | -8.76 | 1416 / 1416 | 0 | 7.72 |
| PreparedAsync / EmptyScope (unchanged control) | 2 | 526.04 | 504.92 | -4.02 | 1416 / 1416 | 0 | 11.70 |
| PublicExplicitSync / EmptyScope | 2 | 33293.09 | 32626.44 | -2.00 | 9871 / 9903 | -32 | 6.58 |
| PublicRegisteredAsync / EmptyScope (unchanged control) | 2 | 33121.42 | 32737.64 | -1.16 | 9875 / 9914 | -39 | 2.96 |
| PreparedSync / SourceCompleted1 | 2 | 733.90 | 731.90 | -0.27 | 1816 / 1816 | 0 | 1.23 |
| PreparedAsync / SourceCompleted1 (unchanged control) | 2 | 746.07 | 729.92 | -2.16 | 1816 / 1816 | 0 | 1.33 |
| PublicExplicitSync / SourceCompleted1 | 2 | 33783.51 | 33586.11 | -0.58 | 10321 / 10303 | 18 | 3.87 |
| PublicRegisteredAsync / SourceCompleted1 (unchanged control) | 2 | 35112.52 | 33451.74 | -4.73 | 10298 / 10300 | -2 | 7.35 |
| PreparedSync / Sync1 | 2 | 700.28 | 678.39 | -3.13 | 1776 / 1776 | 0 | 2.13 |
| PreparedAsync / Sync1 (unchanged control) | 2 | 802.28 | 690.03 | -13.99 | 1776 / 1776 | 0 | 13.50 |
| PublicExplicitSync / Sync1 | 2 | 32600.39 | 33687.14 | 3.33 | 10230 / 10278 | -48 | 3.02 |
| PublicRegisteredAsync / Sync1 (unchanged control) | 2 | 33487.57 | 33661.12 | 0.52 | 10236 / 10229 | 7 | 3.82 |
| PreparedSync / Sync16 | 2 | 2602.13 | 2628.30 | 1.01 | 3776 / 3776 | 0 | 2.79 |
| PreparedAsync / Sync16 (unchanged control) | 2 | 2598.02 | 2668.35 | 2.71 | 3776 / 3776 | 0 | 3.58 |
| PublicExplicitSync / Sync16 | 2 | 37160.31 | 35645.24 | -4.08 | 12371 / 12361 | 10 | 4.87 |
| PublicRegisteredAsync / Sync16 (unchanged control) | 2 | 36900.56 | 37225.01 | 0.88 | 12359 / 12327 | 32 | 6.68 |
| PreparedSync / AsyncCompleted1 | 3 | 712.61 | 706.03 | -0.92 | 1776 / 1776 | 0 | 3.69 |
| PreparedAsync / AsyncCompleted1 (unchanged control) | 3 | 704.14 | 759.06 | 7.80 | 1776 / 1776 | 0 | 2.82 |
| PublicExplicitSync / AsyncCompleted1 | 3 | 88759.65 | 91229.22 | 2.78 | 10496 / 10496 | 0 | 4.60 |
| PublicRegisteredAsync / AsyncCompleted1 (unchanged control) | 3 | 80712.52 | 55418.70 | -31.34 | 10536 / 10202 | 334 | 14.92 |
| PreparedSync / AsyncCompleted16 | 3 | 2585.68 | 2563.10 | -0.87 | 3776 / 3776 | 0 | 5.33 |
| PreparedAsync / AsyncCompleted16 (unchanged control) | 3 | 2537.92 | 2603.97 | 2.60 | 3776 / 3776 | 0 | 0.88 |
| PublicExplicitSync / AsyncCompleted16 | 3 | 36648.63 | 36091.86 | -1.52 | 12357 / 12361 | -4 | 4.28 |
| PublicRegisteredAsync / AsyncCompleted16 (unchanged control) | 3 | 36768.95 | 36328.29 | -1.20 | 12342 / 12348 | -6 | 3.72 |
| PreparedSync / DualCompleted1 | 3 | 730.24 | 722.14 | -1.11 | 1776 / 1776 | 0 | 7.72 |
| PreparedAsync / DualCompleted1 (unchanged control) | 3 | 708.92 | 782.54 | 10.38 | 1776 / 1776 | 0 | 10.26 |
| PublicExplicitSync / DualCompleted1 | 3 | 33826.34 | 34746.54 | 2.72 | 10259 / 10230 | 29 | 6.91 |
| PublicRegisteredAsync / DualCompleted1 (unchanged control) | 3 | 33498.95 | 33616.07 | 0.35 | 10233 / 10269 | -36 | 1.72 |
| PreparedSync / EmptyScope | 3 | 505.14 | 523.41 | 3.62 | 1416 / 1416 | 0 | 7.93 |
| PreparedAsync / EmptyScope (unchanged control) | 3 | 491.31 | 546.41 | 11.21 | 1416 / 1416 | 0 | 5.31 |
| PublicExplicitSync / EmptyScope | 3 | 33608.33 | 33258.54 | -1.04 | 9866 / 9869 | -3 | 3.32 |
| PublicRegisteredAsync / EmptyScope (unchanged control) | 3 | 33265.18 | 33219.32 | -0.14 | 9886 / 9908 | -22 | 5.96 |
| PreparedSync / SourceCompleted1 | 3 | 730.71 | 742.66 | 1.64 | 1816 / 1816 | 0 | 2.06 |
| PreparedAsync / SourceCompleted1 (unchanged control) | 3 | 749.88 | 798.57 | 6.49 | 1816 / 1816 | 0 | 6.58 |
| PublicExplicitSync / SourceCompleted1 | 3 | 34113.12 | 35574.43 | 4.28 | 10281 / 10281 | 0 | 5.28 |
| PublicRegisteredAsync / SourceCompleted1 (unchanged control) | 3 | 34598.25 | 35361.45 | 2.21 | 10282 / 10267 | 15 | 4.88 |
| PreparedSync / Sync1 | 3 | 724.96 | 716.05 | -1.23 | 1776 / 1776 | 0 | 4.60 |
| PreparedAsync / Sync1 (unchanged control) | 3 | 728.19 | 888.03 | 21.95 | 1776 / 1776 | 0 | 11.55 |
| PublicExplicitSync / Sync1 | 3 | 34483.06 | 33771.89 | -2.06 | 10217 / 10263 | -46 | 5.81 |
| PublicRegisteredAsync / Sync1 (unchanged control) | 3 | 33983.71 | 32928.15 | -3.11 | 10247 / 10278 | -31 | 2.71 |
| PreparedSync / Sync16 | 3 | 2645.55 | 2655.88 | 0.39 | 3776 / 3776 | 0 | 2.73 |
| PreparedAsync / Sync16 (unchanged control) | 3 | 2631.34 | 2718.56 | 3.31 | 3776 / 3776 | 0 | 1.09 |
| PublicExplicitSync / Sync16 | 3 | 36839.99 | 36637.43 | -0.55 | 12377 / 12397 | -20 | 7.73 |
| PublicRegisteredAsync / Sync16 (unchanged control) | 3 | 37456.55 | 36720.04 | -1.97 | 12353 / 12348 | 5 | 5.30 |

Prepared methods include actual default-context creation, DI scope/resolution and disposal. Public methods include actual TestHost/HttpClient response and awaited real completed-response callbacks; normal registered async response cleanup is unchanged.

All10 actual lifetime/failure observations match, including four genuine pending sync callers, completed dual/source-backed cleanup, actual registered response gate, async return, missing factory and assigned-provider boundaries. Six actual owning test rows pass. Resource and functional checks are green/green, not a fabricated failing original.

Actual original-host owner/four harness portable-PDB documents and full execution closure are preserved. Public audits rehash raw/source/recorded proofs, not omitted DLL/PDB bytes.
