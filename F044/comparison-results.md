# F044: every actual source comparison

Positive less-time means the candidate is faster. All three comparisons use the same frozen candidate and byte-identical common harness.
Every value is independently recomputed from all eight retained observations.
The median column combines paired percentage effects, not a ratio of separately aggregated source means.

| Method | Profile | Original ns/op by pair | Candidate ns/op by pair | Less-time % by pair | Median less-time % | Original B/op by pair | Candidate B/op by pair |
|---|---|---:|---:|---:|---:|---:|---:|
| RegisterFreshPage | Eight | 426.20 / 408.33 / 547.56 | 361.41 / 400.34 / 479.54 | 15.20 / 1.96 / 12.42 | 12.42 | 1824 / 1824 / 1824 | 1824 / 1824 / 1824 |
| RegisterFreshPage | EightLong | 2907.90 / 2885.20 / 2952.34 | 1747.20 / 1758.92 / 1806.57 | 39.92 / 39.04 / 38.81 | 39.04 | 1832 / 1832 / 1832 | 1832 / 1832 / 1832 |
| RegisterFreshPage | NoSections | 67.09 / 63.22 / 77.45 | 63.87 / 69.79 / 73.43 | 4.79 / -10.38 / 5.18 | 4.79 | 472 / 472 / 472 | 472 / 472 / 472 |
| RegisterFreshPage | One | 145.16 / 106.47 / 132.62 | 117.12 / 109.85 / 185.74 | 19.32 / -3.17 / -40.06 | -3.17 | 648 / 648 / 648 | 648 / 648 / 648 |
| RegisterFreshPage | SixtyFour | 3095.98 / 2829.94 / 3489.13 | 2356.59 / 2313.82 / 2622.94 | 23.88 / 18.24 / 24.83 | 23.88 | 8600 / 8600 / 8600 | 8600 / 8600 / 8600 |
| RegisterFreshPage | Two | 138.16 / 124.80 / 168.64 | 124.04 / 121.80 / 144.79 | 10.22 / 2.40 / 14.14 | 10.22 | 704 / 704 / 704 | 704 / 704 / 704 |
| RenderFullView | Eight | 17673.11 / 19169.99 / 18647.00 | 18863.44 / 20751.21 / 14366.77 | -6.74 / -8.25 / 22.95 | -6.74 | 13202 / 13202 / 13202 | 13202 / 13210 / 13167 |
| RenderFullView | EightLong | 17145.84 / 16996.10 / 17809.56 | 15394.96 / 15934.27 / 16375.03 | 10.21 / 6.25 / 8.05 | 8.05 | 21219 / 21219 / 21219 | 21219 / 21219 / 21219 |
| RenderFullView | NoSections | 5489.25 / 5085.48 / 5733.21 | 5159.01 / 5332.19 / 5546.85 | 6.02 / -4.85 / 3.25 | 3.25 | 8793 / 8793 / 8793 | 8793 / 8793 / 8793 |
| RenderFullView | One | 5857.85 / 5527.13 / 6150.66 | 5752.49 / 5867.18 / 6172.46 | 1.80 / -6.15 / -0.35 | -0.35 | 9697 / 9697 / 9697 | 9697 / 9697 / 9697 |
| RenderFullView | SixtyFour | 18041.67 / 16621.01 / 18557.95 | 16558.32 / 15869.92 / 17494.84 | 8.22 / 4.52 / 5.73 | 5.73 | 33724 / 33723 / 33724 | 33723 / 33723 / 33724 |
| RenderFullView | Two | 6028.01 / 5845.73 / 6280.00 | 5873.73 / 5833.36 / 6261.42 | 2.56 / 0.21 / 0.30 | 0.30 | 9993 / 9993 / 9993 | 9993 / 9993 / 9993 |

The declared primary is RegisterFreshPage/Two for actual SDK-compiled direct RazorPageBase content fixtures.
Its numerical and predeclared control criteria pass: median10.22% less time, all three faster, unchanged704 B/op.
This is not the ordinary RazorPage override. No uniform one-section, full-view or application win is claimed.
Adverse results remain prominent: One registration median3.17% more time, including a40.06% individual regression;
full-view Eight median6.74% more time, and full-view One median0.35% more time.
Full-view Two median0.30% less time is not material. Shared-machine controls/variance and every sample are retained.

## Every report row and its variability

| Pair | Variant | Method | Profile | Mean ns | Sample SD ns | CV % | Median ns | B/op | Actual overhead N | Retained N |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Original | RegisterFreshPage | Eight | 426.20 | 29.81 | 6.99 | 418.01 | 1824 | 17 | 8 |
| 1 | Original | RenderFullView | Eight | 17673.11 | 4757.64 | 26.92 | 16996.97 | 13202 | 20 | 8 |
| 1 | Original | RegisterFreshPage | EightLong | 2907.90 | 80.47 | 2.77 | 2878.97 | 1832 | 20 | 8 |
| 1 | Original | RenderFullView | EightLong | 17145.84 | 358.66 | 2.09 | 17007.66 | 21219 | 20 | 8 |
| 1 | Original | RegisterFreshPage | NoSections | 67.09 | 2.84 | 4.23 | 66.72 | 472 | 15 | 8 |
| 1 | Original | RenderFullView | NoSections | 5489.25 | 145.44 | 2.65 | 5440.95 | 8793 | 20 | 8 |
| 1 | Original | RegisterFreshPage | One | 145.16 | 24.25 | 16.71 | 145.51 | 648 | 18 | 8 |
| 1 | Original | RenderFullView | One | 5857.85 | 235.85 | 4.03 | 5779.85 | 9697 | 20 | 8 |
| 1 | Original | RegisterFreshPage | SixtyFour | 3095.98 | 132.60 | 4.28 | 3073.97 | 8600 | 20 | 8 |
| 1 | Original | RenderFullView | SixtyFour | 18041.67 | 269.70 | 1.49 | 18003.95 | 33724 | 20 | 8 |
| 1 | Original | RegisterFreshPage | Two | 138.16 | 15.97 | 11.56 | 131.05 | 704 | 15 | 8 |
| 1 | Original | RenderFullView | Two | 6028.01 | 113.80 | 1.89 | 6039.61 | 9993 | 20 | 8 |
| 1 | Candidate | RegisterFreshPage | Eight | 361.41 | 27.40 | 7.58 | 351.22 | 1824 | 19 | 8 |
| 1 | Candidate | RenderFullView | Eight | 18863.44 | 5074.48 | 26.90 | 21100.66 | 13202 | 20 | 8 |
| 1 | Candidate | RegisterFreshPage | EightLong | 1747.20 | 57.59 | 3.30 | 1725.78 | 1832 | 20 | 8 |
| 1 | Candidate | RenderFullView | EightLong | 15394.96 | 290.02 | 1.88 | 15325.94 | 21219 | 20 | 8 |
| 1 | Candidate | RegisterFreshPage | NoSections | 63.87 | 3.95 | 6.18 | 62.75 | 472 | 15 | 8 |
| 1 | Candidate | RenderFullView | NoSections | 5159.01 | 75.75 | 1.47 | 5192.47 | 8793 | 20 | 8 |
| 1 | Candidate | RegisterFreshPage | One | 117.12 | 16.99 | 14.51 | 110.65 | 648 | 18 | 8 |
| 1 | Candidate | RenderFullView | One | 5752.49 | 309.44 | 5.38 | 5668.19 | 9697 | 20 | 8 |
| 1 | Candidate | RegisterFreshPage | SixtyFour | 2356.59 | 157.81 | 6.70 | 2347.98 | 8600 | 20 | 8 |
| 1 | Candidate | RenderFullView | SixtyFour | 16558.32 | 1051.07 | 6.35 | 16333.74 | 33723 | 20 | 8 |
| 1 | Candidate | RegisterFreshPage | Two | 124.04 | 5.84 | 4.71 | 123.29 | 704 | 20 | 8 |
| 1 | Candidate | RenderFullView | Two | 5873.73 | 251.57 | 4.28 | 5763.69 | 9993 | 20 | 8 |
| 2 | Candidate | RegisterFreshPage | Eight | 400.34 | 18.46 | 4.61 | 392.55 | 1824 | 15 | 8 |
| 2 | Candidate | RenderFullView | Eight | 20751.21 | 2949.16 | 14.21 | 21305.52 | 13210 | 20 | 8 |
| 2 | Candidate | RegisterFreshPage | EightLong | 1758.92 | 10.51 | 0.60 | 1760.31 | 1832 | 19 | 8 |
| 2 | Candidate | RenderFullView | EightLong | 15934.27 | 349.84 | 2.20 | 15798.62 | 21219 | 20 | 8 |
| 2 | Candidate | RegisterFreshPage | NoSections | 69.79 | 4.16 | 5.95 | 69.60 | 472 | 20 | 8 |
| 2 | Candidate | RenderFullView | NoSections | 5332.19 | 114.77 | 2.15 | 5325.72 | 8793 | 20 | 8 |
| 2 | Candidate | RegisterFreshPage | One | 109.85 | 5.51 | 5.02 | 109.00 | 648 | 15 | 8 |
| 2 | Candidate | RenderFullView | One | 5867.18 | 171.13 | 2.92 | 5928.56 | 9697 | 20 | 8 |
| 2 | Candidate | RegisterFreshPage | SixtyFour | 2313.82 | 113.85 | 4.92 | 2322.79 | 8600 | 20 | 8 |
| 2 | Candidate | RenderFullView | SixtyFour | 15869.92 | 378.12 | 2.38 | 15894.68 | 33723 | 20 | 8 |
| 2 | Candidate | RegisterFreshPage | Two | 121.80 | 5.53 | 4.54 | 120.44 | 704 | 15 | 8 |
| 2 | Candidate | RenderFullView | Two | 5833.36 | 121.06 | 2.08 | 5829.67 | 9993 | 20 | 8 |
| 2 | Original | RegisterFreshPage | Eight | 408.33 | 16.28 | 3.99 | 408.01 | 1824 | 20 | 8 |
| 2 | Original | RenderFullView | Eight | 19169.99 | 3620.25 | 18.89 | 19277.04 | 13202 | 20 | 8 |
| 2 | Original | RegisterFreshPage | EightLong | 2885.20 | 26.03 | 0.90 | 2875.87 | 1832 | 15 | 8 |
| 2 | Original | RenderFullView | EightLong | 16996.10 | 133.83 | 0.79 | 17013.43 | 21219 | 20 | 8 |
| 2 | Original | RegisterFreshPage | NoSections | 63.22 | 2.17 | 3.44 | 62.85 | 472 | 15 | 8 |
| 2 | Original | RenderFullView | NoSections | 5085.48 | 38.27 | 0.75 | 5080.60 | 8793 | 16 | 8 |
| 2 | Original | RegisterFreshPage | One | 106.47 | 9.01 | 8.46 | 103.56 | 648 | 15 | 8 |
| 2 | Original | RenderFullView | One | 5527.13 | 107.79 | 1.95 | 5518.26 | 9697 | 20 | 8 |
| 2 | Original | RegisterFreshPage | SixtyFour | 2829.94 | 108.13 | 3.82 | 2818.45 | 8600 | 20 | 8 |
| 2 | Original | RenderFullView | SixtyFour | 16621.01 | 696.91 | 4.19 | 16390.88 | 33723 | 20 | 8 |
| 2 | Original | RegisterFreshPage | Two | 124.80 | 2.27 | 1.82 | 124.64 | 704 | 15 | 8 |
| 2 | Original | RenderFullView | Two | 5845.73 | 323.12 | 5.53 | 5764.90 | 9993 | 20 | 8 |
| 3 | Original | RegisterFreshPage | Eight | 547.56 | 26.60 | 4.86 | 542.24 | 1824 | 20 | 8 |
| 3 | Original | RenderFullView | Eight | 18647.00 | 4872.54 | 26.13 | 19737.68 | 13202 | 20 | 8 |
| 3 | Original | RegisterFreshPage | EightLong | 2952.34 | 32.63 | 1.11 | 2942.21 | 1832 | 20 | 8 |
| 3 | Original | RenderFullView | EightLong | 17809.56 | 319.34 | 1.79 | 17745.61 | 21219 | 20 | 8 |
| 3 | Original | RegisterFreshPage | NoSections | 77.45 | 9.84 | 12.70 | 73.47 | 472 | 15 | 8 |
| 3 | Original | RenderFullView | NoSections | 5733.21 | 269.99 | 4.71 | 5630.35 | 8793 | 20 | 8 |
| 3 | Original | RegisterFreshPage | One | 132.62 | 7.46 | 5.63 | 133.34 | 648 | 15 | 8 |
| 3 | Original | RenderFullView | One | 6150.66 | 93.04 | 1.51 | 6126.04 | 9697 | 20 | 8 |
| 3 | Original | RegisterFreshPage | SixtyFour | 3489.13 | 210.46 | 6.03 | 3457.99 | 8600 | 20 | 8 |
| 3 | Original | RenderFullView | SixtyFour | 18557.95 | 696.67 | 3.75 | 18326.30 | 33724 | 20 | 8 |
| 3 | Original | RegisterFreshPage | Two | 168.64 | 8.78 | 5.21 | 167.79 | 704 | 20 | 8 |
| 3 | Original | RenderFullView | Two | 6280.00 | 69.86 | 1.11 | 6271.68 | 9993 | 20 | 8 |
| 3 | Candidate | RegisterFreshPage | Eight | 479.54 | 50.00 | 10.43 | 479.22 | 1824 | 15 | 8 |
| 3 | Candidate | RenderFullView | Eight | 14366.77 | 3167.40 | 22.05 | 13654.36 | 13167 | 20 | 8 |
| 3 | Candidate | RegisterFreshPage | EightLong | 1806.57 | 19.46 | 1.08 | 1807.11 | 1832 | 16 | 8 |
| 3 | Candidate | RenderFullView | EightLong | 16375.03 | 328.85 | 2.01 | 16273.79 | 21219 | 20 | 8 |
| 3 | Candidate | RegisterFreshPage | NoSections | 73.43 | 7.49 | 10.20 | 70.66 | 472 | 15 | 8 |
| 3 | Candidate | RenderFullView | NoSections | 5546.85 | 121.78 | 2.20 | 5524.21 | 8793 | 20 | 8 |
| 3 | Candidate | RegisterFreshPage | One | 185.74 | 20.83 | 11.21 | 183.64 | 648 | 15 | 8 |
| 3 | Candidate | RenderFullView | One | 6172.46 | 188.52 | 3.05 | 6121.79 | 9697 | 20 | 8 |
| 3 | Candidate | RegisterFreshPage | SixtyFour | 2622.94 | 60.10 | 2.29 | 2613.69 | 8600 | 20 | 8 |
| 3 | Candidate | RenderFullView | SixtyFour | 17494.84 | 547.67 | 3.13 | 17596.10 | 33724 | 20 | 8 |
| 3 | Candidate | RegisterFreshPage | Two | 144.79 | 9.14 | 6.31 | 142.60 | 704 | 15 | 8 |
| 3 | Candidate | RenderFullView | Two | 6261.42 | 245.54 | 3.92 | 6221.89 | 9993 | 20 | 8 |

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
