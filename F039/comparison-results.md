# F039 complete results

Positive less-time percentages favor the candidate. Attempt 1 failed before timing and has no invented result. Attempts 2 and 3 are the two completed comparisons.

| Profile | Attempt 2 original->candidate ns | Less time % | Attempt 3 original->candidate ns | Less time % | Median less time % | B/op original->candidate, attempts 2/3 |
|---|---:|---:|---:|---:|---:|---|
| Match:12:0 | 0.7979->0.7447 | 6.68 | 0.7489->0.7551 | -0.84 | 2.92 | 0->0 / 0->0 |
| Different:12:0 | 0.7631->0.7676 | -0.59 | 0.7920->0.7747 | 2.19 | 0.80 | 0->0 / 0->0 |
| Null:12:0 | 1.1779->1.0993 | 6.67 | 1.1531->1.1254 | 2.40 | 4.54 | 0->0 / 0->0 |
| MissingNull:12:0 | 0.7554->0.7771 | -2.87 | 0.7767->0.7941 | -2.24 | -2.56 | 0->0 / 0->0 |
| ControlContainsKey:12:0 | 2.5900->2.4367 | 5.92 | 2.2594->2.0156 | 10.79 | 8.35 | 0->0 / 0->0 |
| Match:128:0 | 0.8205->0.8130 | 0.91 | 0.7985->0.8799 | -10.19 | -4.64 | 0->0 / 0->0 |
| Different:128:0 | 1.1879->1.1463 | 3.51 | 1.1452->1.1505 | -0.46 | 1.52 | 0->0 / 0->0 |
| Null:128:0 | 0.7784->0.8036 | -3.23 | 0.7502->0.7608 | -1.41 | -2.32 | 0->0 / 0->0 |
| MissingNull:128:0 | 1.1592->1.1349 | 2.09 | 1.1530->1.1278 | 2.19 | 2.14 | 0->0 / 0->0 |
| ControlContainsKey:128:0 | 2.5976->2.4597 | 5.31 | 2.3091->1.9879 | 13.91 | 9.61 | 0->0 / 0->0 |
| Match:12:1 | 37.4317->19.7681 | 47.19 | 37.5668->19.4417 | 48.25 | 47.72 | 0->0 / 0->0 |
| Different:12:1 | 36.3478->19.8897 | 45.28 | 36.0836->19.1740 | 46.86 | 46.07 | 0->0 / 0->0 |
| Null:12:1 | 35.2562->17.2674 | 51.02 | 35.7087->16.3320 | 54.26 | 52.64 | 0->0 / 0->0 |
| MissingNull:12:1 | 10.5098->10.1871 | 3.07 | 10.1809->9.9848 | 1.93 | 2.50 | 0->0 / 0->0 |
| ControlContainsKey:12:1 | 17.5146->17.0671 | 2.55 | 16.5754->17.2523 | -4.08 | -0.76 | 0->0 / 0->0 |
| Match:128:1 | 199.5515->103.6561 | 48.06 | 199.7505->103.4044 | 48.23 | 48.14 | 0->0 / 0->0 |
| Different:128:1 | 200.8450->103.5693 | 48.43 | 202.9612->103.6353 | 48.94 | 48.69 | 0->0 / 0->0 |
| Null:128:1 | 192.7467->96.2484 | 50.06 | 194.1632->96.6307 | 50.23 | 50.15 | 0->0 / 0->0 |
| MissingNull:128:1 | 79.3984->79.8338 | -0.55 | 80.3895->79.7280 | 0.82 | 0.14 | 0->0 / 0->0 |
| ControlContainsKey:128:1 | 96.3659->96.8670 | -0.52 | 96.9708->96.5878 | 0.40 | -0.06 | 0->0 / 0->0 |
| Match:12:8 | 36.4859->19.7628 | 45.83 | 36.5937->19.9000 | 45.62 | 45.73 | 0->0 / 0->0 |
| Different:12:8 | 36.3104->19.3011 | 46.84 | 36.3638->19.0855 | 47.52 | 47.18 | 0->0 / 0->0 |
| Null:12:8 | 33.8930->16.3733 | 51.69 | 35.5787->16.3626 | 54.01 | 52.85 | 0->0 / 0->0 |
| MissingNull:12:8 | 9.1521->9.2228 | -0.77 | 9.1268->9.7147 | -6.44 | -3.61 | 0->0 / 0->0 |
| ControlContainsKey:12:8 | 16.5801->17.1688 | -3.55 | 16.6365->16.5547 | 0.49 | -1.53 | 0->0 / 0->0 |
| Match:128:8 | 199.2459->103.4286 | 48.09 | 199.6707->103.6593 | 48.08 | 48.09 | 0->0 / 0->0 |
| Different:128:8 | 199.4742->103.5247 | 48.10 | 200.0279->103.6211 | 48.20 | 48.15 | 0->0 / 0->0 |
| Null:128:8 | 192.7090->100.2884 | 47.96 | 193.5175->96.3780 | 50.20 | 49.08 | 0->0 / 0->0 |
| MissingNull:128:8 | 79.3022->82.2200 | -3.68 | 79.9554->80.4955 | -0.68 | -2.18 | 0->0 / 0->0 |
| ControlContainsKey:128:8 | 96.6952->96.8494 | -0.16 | 96.8459->96.9833 | -0.14 | -0.15 | 0->0 / 0->0 |
| Match:12:64 | 37.4492->19.7408 | 47.29 | 36.5753->19.5925 | 46.43 | 46.86 | 0->0 / 0->0 |
| Different:12:64 | 36.3341->19.6132 | 46.02 | 36.6121->19.2824 | 47.33 | 46.68 | 0->0 / 0->0 |
| Null:12:64 | 34.8570->16.9668 | 51.32 | 34.1017->16.5245 | 51.54 | 51.43 | 0->0 / 0->0 |
| MissingNull:12:64 | 10.2069->10.0711 | 1.33 | 10.2383->10.0736 | 1.61 | 1.47 | 0->0 / 0->0 |
| ControlContainsKey:12:64 | 16.9382->16.7356 | 1.20 | 16.6666->16.9114 | -1.47 | -0.14 | 0->0 / 0->0 |
| Match:128:64 | 199.7148->103.3903 | 48.23 | 200.2982->103.5313 | 48.31 | 48.27 | 0->0 / 0->0 |
| Different:128:64 | 199.8551->103.5469 | 48.19 | 200.4479->104.3363 | 47.95 | 48.07 | 0->0 / 0->0 |
| Null:128:64 | 193.2595->96.2537 | 50.19 | 194.1481->96.1651 | 50.47 | 50.33 | 0->0 / 0->0 |
| MissingNull:128:64 | 79.8418->80.9099 | -1.34 | 81.2903->78.9875 | 2.83 | 0.75 | 0->0 / 0->0 |
| ControlContainsKey:128:64 | 96.7558->96.6168 | 0.14 | 96.3983->96.4453 | -0.05 | 0.05 | 0->0 / 0->0 |

**Actual execution order:** attempt 2 candidate/original; attempt 3 original/candidate.
All 160 row means and sample standard deviations were recomputed from 1,280 retained JSON measurements and matched against 1,280 native stdout WorkloadResult lines.
Every one of 160 allocation reports is 0 B/op. No allocation-saving claim. Maximum measured profile CV: 29.37%; noisy/adverse rows are retained.
BDN 99.9% confidence intervals and rounded MemoryDiagnoser values are retained as reported, not independently derived confidence or allocation counters.

**All adverse medians:** MissingNull:12:0: 2.56% slower; Match:128:0: 4.64% slower; Null:128:0: 2.32% slower; ControlContainsKey:12:1: 0.76% slower; ControlContainsKey:128:1: 0.06% slower; MissingNull:12:8: 3.61% slower; ControlContainsKey:12:8: 1.53% slower; MissingNull:128:8: 2.18% slower; ControlContainsKey:128:8: 0.15% slower; ControlContainsKey:12:64: 0.14% slower.
**Worst individual paired rows:** Match:128:0 attempt 3: 10.19% more time; MissingNull:12:8 attempt 3: 6.44% more time; ControlContainsKey:12:1 attempt 3: 4.08% more time.
No miss/control median regression reaches 5% in this run. This does not make every individual observation a win.

Three source-comparison authorizations are permanently consumed: one before-timing fixture failure plus two completed comparisons. No fourth attempt or replacement run occurred.
