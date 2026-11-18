# F120: every authorized attempt and complete comparison

Three slots are consumed. Attempt1 failed before any WorkloadActual/WorkloadResult sample; it is not a completed pair.
Attempts2/3 completed Candidate then Original / Original then Candidate with identical repaired common harness bytes.
All16 predeclared method/profile cases and all512 retained samples remain. Positive less-time favors candidate.
The median column combines the two paired percentages, not the ratio of separate median means.

| Method | Full profile | Original ns/op (2 / 3) | Candidate ns/op (2 / 3) | Less-time % (2 / 3) | Median less-time % | Original B/op (2 / 3) | Candidate B/op (2 / 3) |
|---|---|---:|---:|---:|---:|---:|---:|
| Contains | CopiedDefault5Miss | 10.746 / 11.942 | 16.589 / 16.295 | -54.373 / -36.459 | -45.416 | 0 / 0 | 0 / 0 |
| Contains | UnmodifiedDefault5Miss | 49.094 / 46.656 | 37.881 / 39.400 | 22.841 / 15.552 | 19.197 | 32 / 32 | 32 / 32 |
| Contains | CopiedDefault5First | 2.533 / 2.535 | 7.684 / 7.477 | -203.407 / -194.931 | -199.169 | 0 / 0 | 0 / 0 |
| Contains | CopiedDefault5Last | 9.203 / 10.316 | 16.439 / 15.353 | -78.627 / -48.826 | -63.726 | 0 / 0 | 0 / 0 |
| Contains | CopiedEmptyMiss | 6.634 / 6.438 | 5.681 / 5.774 | 14.368 / 10.322 | 12.345 | 0 / 0 | 0 / 0 |
| Contains | CopiedOneMiss | 3.633 / 4.158 | 7.675 / 7.777 | -111.246 / -87.056 | -99.151 | 0 / 0 | 0 / 0 |
| Contains | CopiedEightMiss | 15.895 / 18.133 | 22.263 / 21.213 | -40.061 / -16.987 | -28.524 | 0 / 0 | 0 / 0 |
| Contains | UnmodifiedDefault5First | 18.613 / 20.412 | 17.359 / 18.214 | 6.735 / 10.768 | 8.751 | 32 / 32 | 32 / 32 |
| UnchangedIndexOf | CopiedDefault5Miss | 11.867 / 11.135 | 10.663 / 10.999 | 10.152 / 1.219 | 5.685 | 0 / 0 | 0 / 0 |
| UnchangedIndexOf | UnmodifiedDefault5Miss | 49.549 / 50.443 | 47.828 / 47.505 | 3.474 / 5.826 | 4.650 | 32 / 32 | 32 / 32 |
| UnchangedIndexOf | CopiedDefault5First | 2.552 / 2.570 | 2.540 / 2.335 | 0.466 / 9.129 | 4.797 | 0 / 0 | 0 / 0 |
| UnchangedIndexOf | CopiedDefault5Last | 10.033 / 9.871 | 9.070 / 9.630 | 9.596 / 2.436 | 6.016 | 0 / 0 | 0 / 0 |
| UnchangedIndexOf | CopiedEmptyMiss | 6.484 / 7.349 | 6.588 / 6.935 | -1.599 / 5.633 | 2.017 | 0 / 0 | 0 / 0 |
| UnchangedIndexOf | CopiedOneMiss | 3.920 / 4.101 | 3.708 / 3.596 | 5.416 / 12.327 | 8.871 | 0 / 0 | 0 / 0 |
| UnchangedIndexOf | CopiedEightMiss | 17.796 / 16.677 | 16.410 / 16.496 | 7.790 / 1.083 | 4.436 | 0 / 0 | 0 / 0 |
| UnchangedIndexOf | UnmodifiedDefault5First | 19.612 / 20.102 | 18.670 / 20.231 | 4.802 / -0.642 | 2.080 | 32 / 32 | 32 / 32 |

## Each source case, variability and retained trend

| Attempt | Variant | Method | Profile | Mean ns | Sample SD ns | CV % | Median ns | B/op | Overhead N | Retained N | First4 mean ns | Last4 mean ns | Fitted end-to-end trend % |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2 | Candidate | Contains | CopiedDefault5Miss | 16.589 | 0.125 | 0.754 | 16.614 | 0 | 15 | 8 | 16.504 | 16.673 | 1.428 |
| 2 | Candidate | UnchangedIndexOf | CopiedDefault5Miss | 10.663 | 0.054 | 0.511 | 10.647 | 0 | 15 | 8 | 10.680 | 10.646 | -0.018 |
| 2 | Candidate | Contains | UnmodifiedDefault5Miss | 37.881 | 0.541 | 1.428 | 37.756 | 32 | 15 | 8 | 37.897 | 37.865 | -0.702 |
| 2 | Candidate | UnchangedIndexOf | UnmodifiedDefault5Miss | 47.828 | 0.366 | 0.766 | 47.765 | 32 | 15 | 8 | 47.839 | 47.818 | -0.884 |
| 2 | Candidate | Contains | CopiedDefault5First | 7.684 | 0.024 | 0.306 | 7.687 | 0 | 15 | 8 | 7.694 | 7.674 | -0.400 |
| 2 | Candidate | UnchangedIndexOf | CopiedDefault5First | 2.540 | 0.016 | 0.616 | 2.541 | 0 | 15 | 8 | 2.541 | 2.539 | -0.508 |
| 2 | Candidate | Contains | CopiedDefault5Last | 16.439 | 0.113 | 0.690 | 16.434 | 0 | 15 | 8 | 16.443 | 16.435 | -0.245 |
| 2 | Candidate | UnchangedIndexOf | CopiedDefault5Last | 9.070 | 0.050 | 0.554 | 9.052 | 0 | 15 | 8 | 9.081 | 9.060 | -0.945 |
| 2 | Candidate | Contains | CopiedEmptyMiss | 5.681 | 0.053 | 0.925 | 5.680 | 0 | 15 | 8 | 5.662 | 5.700 | -0.101 |
| 2 | Candidate | UnchangedIndexOf | CopiedEmptyMiss | 6.588 | 0.075 | 1.132 | 6.591 | 0 | 15 | 8 | 6.563 | 6.613 | 1.871 |
| 2 | Candidate | Contains | CopiedOneMiss | 7.675 | 0.033 | 0.436 | 7.668 | 0 | 15 | 8 | 7.665 | 7.685 | 0.201 |
| 2 | Candidate | UnchangedIndexOf | CopiedOneMiss | 3.708 | 0.090 | 2.416 | 3.690 | 0 | 15 | 8 | 3.760 | 3.657 | -4.048 |
| 2 | Candidate | Contains | CopiedEightMiss | 22.263 | 0.158 | 0.708 | 22.276 | 0 | 15 | 8 | 22.204 | 22.321 | 0.044 |
| 2 | Candidate | UnchangedIndexOf | CopiedEightMiss | 16.410 | 0.098 | 0.600 | 16.393 | 0 | 15 | 8 | 16.408 | 16.411 | 0.098 |
| 2 | Candidate | Contains | UnmodifiedDefault5First | 17.359 | 0.939 | 5.407 | 16.996 | 32 | 15 | 8 | 16.833 | 17.886 | 6.297 |
| 2 | Candidate | UnchangedIndexOf | UnmodifiedDefault5First | 18.670 | 0.574 | 3.076 | 18.782 | 32 | 15 | 8 | 19.183 | 18.157 | -7.960 |
| 2 | Original | Contains | CopiedDefault5Miss | 10.746 | 0.144 | 1.339 | 10.685 | 0 | 15 | 8 | 10.809 | 10.683 | -2.703 |
| 2 | Original | UnchangedIndexOf | CopiedDefault5Miss | 11.867 | 0.163 | 1.373 | 11.907 | 0 | 15 | 8 | 11.947 | 11.788 | -2.177 |
| 2 | Original | Contains | UnmodifiedDefault5Miss | 49.094 | 0.331 | 0.674 | 49.077 | 32 | 15 | 8 | 49.202 | 48.987 | -1.174 |
| 2 | Original | UnchangedIndexOf | UnmodifiedDefault5Miss | 49.549 | 0.543 | 1.095 | 49.500 | 32 | 15 | 8 | 49.154 | 49.945 | 2.096 |
| 2 | Original | Contains | CopiedDefault5First | 2.533 | 0.021 | 0.828 | 2.529 | 0 | 15 | 8 | 2.527 | 2.538 | -0.211 |
| 2 | Original | UnchangedIndexOf | CopiedDefault5First | 2.552 | 0.028 | 1.108 | 2.549 | 0 | 15 | 8 | 2.543 | 2.561 | 1.752 |
| 2 | Original | Contains | CopiedDefault5Last | 9.203 | 0.104 | 1.135 | 9.179 | 0 | 15 | 8 | 9.169 | 9.236 | 2.024 |
| 2 | Original | UnchangedIndexOf | CopiedDefault5Last | 10.033 | 0.098 | 0.982 | 10.061 | 0 | 15 | 8 | 10.064 | 10.003 | -0.845 |
| 2 | Original | Contains | CopiedEmptyMiss | 6.634 | 0.087 | 1.310 | 6.624 | 0 | 15 | 8 | 6.675 | 6.592 | -2.227 |
| 2 | Original | UnchangedIndexOf | CopiedEmptyMiss | 6.484 | 0.070 | 1.084 | 6.497 | 0 | 15 | 8 | 6.511 | 6.458 | -1.508 |
| 2 | Original | Contains | CopiedOneMiss | 3.633 | 0.037 | 1.025 | 3.637 | 0 | 15 | 8 | 3.644 | 3.623 | -1.366 |
| 2 | Original | UnchangedIndexOf | CopiedOneMiss | 3.920 | 0.195 | 4.976 | 3.888 | 0 | 15 | 8 | 3.931 | 3.910 | -2.241 |
| 2 | Original | Contains | CopiedEightMiss | 15.895 | 0.128 | 0.804 | 15.875 | 0 | 15 | 8 | 15.852 | 15.938 | 0.512 |
| 2 | Original | UnchangedIndexOf | CopiedEightMiss | 17.796 | 0.279 | 1.567 | 17.728 | 0 | 15 | 8 | 17.814 | 17.777 | 1.258 |
| 2 | Original | Contains | UnmodifiedDefault5First | 18.613 | 0.259 | 1.392 | 18.577 | 32 | 15 | 8 | 18.536 | 18.690 | 0.434 |
| 2 | Original | UnchangedIndexOf | UnmodifiedDefault5First | 19.612 | 0.457 | 2.329 | 19.547 | 32 | 15 | 8 | 19.382 | 19.842 | 1.214 |
| 3 | Original | Contains | CopiedDefault5Miss | 11.942 | 0.188 | 1.575 | 11.903 | 0 | 15 | 8 | 12.021 | 11.862 | -0.619 |
| 3 | Original | UnchangedIndexOf | CopiedDefault5Miss | 11.135 | 0.182 | 1.636 | 11.094 | 0 | 15 | 8 | 11.196 | 11.073 | -0.257 |
| 3 | Original | Contains | UnmodifiedDefault5Miss | 46.656 | 0.701 | 1.503 | 46.343 | 32 | 15 | 8 | 47.057 | 46.255 | -2.200 |
| 3 | Original | UnchangedIndexOf | UnmodifiedDefault5Miss | 50.443 | 0.503 | 0.996 | 50.459 | 32 | 15 | 8 | 50.407 | 50.480 | -0.124 |
| 3 | Original | Contains | CopiedDefault5First | 2.535 | 0.014 | 0.551 | 2.532 | 0 | 15 | 8 | 2.539 | 2.531 | -0.863 |
| 3 | Original | UnchangedIndexOf | CopiedDefault5First | 2.570 | 0.073 | 2.828 | 2.536 | 0 | 15 | 8 | 2.571 | 2.569 | -0.804 |
| 3 | Original | Contains | CopiedDefault5Last | 10.316 | 0.101 | 0.978 | 10.279 | 0 | 15 | 8 | 10.265 | 10.368 | 0.913 |
| 3 | Original | UnchangedIndexOf | CopiedDefault5Last | 9.871 | 0.374 | 3.792 | 9.759 | 0 | 15 | 8 | 9.737 | 10.004 | 1.138 |
| 3 | Original | Contains | CopiedEmptyMiss | 6.438 | 0.120 | 1.857 | 6.419 | 0 | 15 | 8 | 6.382 | 6.494 | 1.637 |
| 3 | Original | UnchangedIndexOf | CopiedEmptyMiss | 7.349 | 0.105 | 1.423 | 7.331 | 0 | 15 | 8 | 7.381 | 7.316 | -1.551 |
| 3 | Original | Contains | CopiedOneMiss | 4.158 | 0.116 | 2.797 | 4.136 | 0 | 15 | 8 | 4.209 | 4.106 | -4.410 |
| 3 | Original | UnchangedIndexOf | CopiedOneMiss | 4.101 | 0.073 | 1.780 | 4.083 | 0 | 15 | 8 | 4.119 | 4.083 | 0.480 |
| 3 | Original | Contains | CopiedEightMiss | 18.133 | 0.122 | 0.673 | 18.131 | 0 | 18 | 8 | 18.176 | 18.089 | -0.535 |
| 3 | Original | UnchangedIndexOf | CopiedEightMiss | 16.677 | 0.541 | 3.244 | 16.490 | 0 | 15 | 8 | 16.854 | 16.500 | -2.912 |
| 3 | Original | Contains | UnmodifiedDefault5First | 20.412 | 0.848 | 4.156 | 20.153 | 32 | 15 | 8 | 20.224 | 20.600 | 7.063 |
| 3 | Original | UnchangedIndexOf | UnmodifiedDefault5First | 20.102 | 0.511 | 2.544 | 20.055 | 32 | 15 | 8 | 20.365 | 19.839 | -4.924 |
| 3 | Candidate | Contains | CopiedDefault5Miss | 16.295 | 0.455 | 2.793 | 16.230 | 0 | 18 | 8 | 16.058 | 16.532 | 4.756 |
| 3 | Candidate | UnchangedIndexOf | CopiedDefault5Miss | 10.999 | 0.064 | 0.583 | 10.981 | 0 | 15 | 8 | 11.014 | 10.984 | 0.200 |
| 3 | Candidate | Contains | UnmodifiedDefault5Miss | 39.400 | 0.728 | 1.847 | 38.990 | 32 | 15 | 8 | 39.631 | 39.169 | -2.585 |
| 3 | Candidate | UnchangedIndexOf | UnmodifiedDefault5Miss | 47.505 | 0.803 | 1.690 | 47.286 | 32 | 15 | 8 | 47.687 | 47.322 | -0.457 |
| 3 | Candidate | Contains | CopiedDefault5First | 7.477 | 0.083 | 1.105 | 7.469 | 0 | 15 | 8 | 7.457 | 7.497 | 1.240 |
| 3 | Candidate | UnchangedIndexOf | CopiedDefault5First | 2.335 | 0.073 | 3.126 | 2.318 | 0 | 15 | 8 | 2.311 | 2.360 | 4.779 |
| 3 | Candidate | Contains | CopiedDefault5Last | 15.353 | 0.146 | 0.950 | 15.388 | 0 | 15 | 8 | 15.427 | 15.280 | -2.135 |
| 3 | Candidate | UnchangedIndexOf | CopiedDefault5Last | 9.630 | 0.067 | 0.693 | 9.622 | 0 | 15 | 8 | 9.628 | 9.632 | 0.036 |
| 3 | Candidate | Contains | CopiedEmptyMiss | 5.774 | 0.053 | 0.922 | 5.754 | 0 | 15 | 8 | 5.744 | 5.803 | 0.855 |
| 3 | Candidate | UnchangedIndexOf | CopiedEmptyMiss | 6.935 | 0.108 | 1.556 | 6.908 | 0 | 15 | 8 | 6.970 | 6.900 | -1.722 |
| 3 | Candidate | Contains | CopiedOneMiss | 7.777 | 0.141 | 1.809 | 7.746 | 0 | 15 | 8 | 7.699 | 7.855 | 1.988 |
| 3 | Candidate | UnchangedIndexOf | CopiedOneMiss | 3.596 | 0.107 | 2.966 | 3.563 | 0 | 15 | 8 | 3.522 | 3.670 | 4.469 |
| 3 | Candidate | Contains | CopiedEightMiss | 21.213 | 0.346 | 1.630 | 21.234 | 0 | 15 | 8 | 21.240 | 21.186 | -1.643 |
| 3 | Candidate | UnchangedIndexOf | CopiedEightMiss | 16.496 | 0.280 | 1.700 | 16.417 | 0 | 15 | 8 | 16.654 | 16.338 | -3.773 |
| 3 | Candidate | Contains | UnmodifiedDefault5First | 18.214 | 0.811 | 4.455 | 17.874 | 32 | 15 | 8 | 18.555 | 17.873 | -5.882 |
| 3 | Candidate | UnchangedIndexOf | UnmodifiedDefault5First | 20.231 | 0.777 | 3.840 | 20.403 | 32 | 15 | 8 | 20.567 | 19.895 | -4.772 |

Every sample is recomputed as actual workload time minus the median of all adaptive overhead observations.
Sample variance uses N-1; the raw GC numerator/operation denominator and BDN midpoint-to-even allocation rounding are independently checked.
FullName gives untruncated method/profile identity; BDN0.13 shortens two ordinary-path display labels even in JSON Parameters.
All comparisons are narrow prepared-collection observations on a shared machine, not application effects.

## Actual raw records

Attempt1: [consumed authorization](comparison-001/authorization.json), [failure](comparison-001/failure.json),
[Original stdout](comparison-001/Original/stdout.txt), [Original stderr](comparison-001/Original/stderr.txt).
Candidate was not launched. No WorkloadActual or WorkloadResult sample exists. The old fixture is retained separately.

Attempt2: [authorization](comparison-002/authorization.json), [completion](comparison-002/execution-receipt.json).
Candidate: [raw stdout](comparison-002/Candidate/stdout.txt), [full JSON](comparison-002/Candidate/reports/results/AutoPerf.CollectionBenchmarks-report-full.json), [exact command](comparison-002/Candidate/command.json), [actual result](comparison-002/Candidate/result.json).
Original: [raw stdout](comparison-002/Original/stdout.txt), [full JSON](comparison-002/Original/reports/results/AutoPerf.CollectionBenchmarks-report-full.json), [exact command](comparison-002/Original/command.json), [actual result](comparison-002/Original/result.json).

Attempt3: [authorization](comparison-003/authorization.json), [completion](comparison-003/execution-receipt.json).
Original: [raw stdout](comparison-003/Original/stdout.txt), [full JSON](comparison-003/Original/reports/results/AutoPerf.CollectionBenchmarks-report-full.json), [exact command](comparison-003/Original/command.json), [actual result](comparison-003/Original/result.json).
Candidate: [raw stdout](comparison-003/Candidate/stdout.txt), [full JSON](comparison-003/Candidate/reports/results/AutoPerf.CollectionBenchmarks-report-full.json), [exact command](comparison-003/Candidate/command.json), [actual result](comparison-003/Candidate/result.json).
