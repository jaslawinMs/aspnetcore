# F104 - all three actual comparisons

**No-gain disposition.** Some partial savings are real recorded observations,but mixed full-owner regressions and variation do not justify a performance draft.
Comparison1:concurrency1/capacity1. Comparisons2/3:identical concurrency1/capacity31 source/owner,each paired with a fresh exact original.

## Comparison 1

| Actual complete-driver case | Original mean ms | Trial mean ms | Original B/op | Trial B/op | Allocation reduction |
|---|---:|---:|---:|---:|---:|
| Empty/Serial | 28.108 | 37.363 | 3326972 | 3397184 | -2.11% |
| Empty/Concurrent | 23.944 | 22.005 | 3570580 | 3564540 | 0.17% |
| SmallUnique/Serial | 20.720 | 20.352 | 1678298 | 1668530 | 0.58% |
| SmallUnique/Concurrent | 10.149 | 17.613 | 3427727 | 3632606 | -5.98% |
| SmallDuplicate/Serial | 14.178 | 22.696 | 1730409 | 1797956 | -3.90% |
| SmallDuplicate/Concurrent | 9.055 | 10.946 | 3760190 | 3589501 | 4.54% |
| WideUnique/Serial | 55.803 | 69.343 | 8635080 | 8591016 | 0.51% |
| WideUnique/Concurrent | 28.374 | 36.921 | 12764520 | 12662096 | 0.80% |
| WideDuplicate/Serial | 22.864 | 27.763 | 8971246 | 9053240 | -0.91% |
| WideDuplicate/Concurrent | 13.633 | 17.522 | 12752332 | 13009224 | -2.01% |

## Comparison 2

| Actual complete-driver case | Original mean ms | Trial mean ms | Original B/op | Trial B/op | Allocation reduction |
|---|---:|---:|---:|---:|---:|
| Empty/Serial | 30.735 | 36.740 | 3325304 | 3426904 | -3.06% |
| Empty/Concurrent | 23.908 | 22.973 | 3530328 | 3437802 | 2.62% |
| SmallUnique/Serial | 21.567 | 20.397 | 1637630 | 1664646 | -1.65% |
| SmallUnique/Concurrent | 10.195 | 17.413 | 3223933 | 3621152 | -12.32% |
| SmallDuplicate/Serial | 14.480 | 17.408 | 1759632 | 1761294 | -0.09% |
| SmallDuplicate/Concurrent | 9.101 | 10.254 | 3798132 | 3803987 | -0.15% |
| WideUnique/Serial | 55.388 | 65.460 | 8700824 | 8594032 | 1.23% |
| WideUnique/Concurrent | 25.179 | 38.755 | 12666504 | 12719416 | -0.42% |
| WideDuplicate/Serial | 20.837 | 30.944 | 9057028 | 9079504 | -0.25% |
| WideDuplicate/Concurrent | 13.860 | 17.950 | 12695300 | 13307810 | -4.82% |

## Comparison 3

| Actual complete-driver case | Original mean ms | Trial mean ms | Original B/op | Trial B/op | Allocation reduction |
|---|---:|---:|---:|---:|---:|
| Empty/Serial | 26.445 | 28.425 | 3468328 | 3379080 | 2.57% |
| Empty/Concurrent | 23.802 | 24.120 | 3620392 | 3581378 | 1.08% |
| SmallUnique/Serial | 21.507 | 21.008 | 1646732 | 1637724 | 0.55% |
| SmallUnique/Concurrent | 17.398 | 10.557 | 3359844 | 3414360 | -1.62% |
| SmallDuplicate/Serial | 17.486 | 14.144 | 1800590 | 1733123 | 3.75% |
| SmallDuplicate/Concurrent | 10.128 | 8.932 | 3523400 | 4250925 | -20.65% |
| WideUnique/Serial | 62.203 | 54.989 | 8823616 | 8597040 | 2.57% |
| WideUnique/Concurrent | 38.181 | 26.497 | 12879228 | 12768696 | 0.86% |
| WideDuplicate/Serial | 28.930 | 22.213 | 9104932 | 8864812 | 2.64% |
| WideDuplicate/Concurrent | 16.229 | 13.340 | 13331252 | 13279543 | 0.39% |

## Independent precise process-wide warmed calipers

Each row contains10 completed actual driver runs after3 warmups. Original is one retained independent probe,not a contemporaneous original for each candidate probe.
| Trial/case | Original B/run | Trial B/run | Reduction |
|---|---:|---:|---:|
| candidate-1/Empty/Serial | 3276624.8 | 3277709.6 | -0.03% |
| candidate-1/Empty/Concurrent | 3641385.6 | 3731406.4 | -2.47% |
| candidate-1/SmallUnique/Serial | 1628897.6 | 1608321.6 | 1.26% |
| candidate-1/SmallUnique/Concurrent | 3414730.4 | 3222396.0 | 5.63% |
| candidate-1/SmallDuplicate/Serial | 1759180.0 | 1747183.2 | 0.68% |
| candidate-1/SmallDuplicate/Concurrent | 3502092.8 | 3836787.2 | -9.56% |
| candidate-1/WideUnique/Serial | 8283920.8 | 8164931.2 | 1.44% |
| candidate-1/WideUnique/Concurrent | 12475908.8 | 12453189.6 | 0.18% |
| candidate-1/WideDuplicate/Serial | 8961224.0 | 8862724.8 | 1.10% |
| candidate-1/WideDuplicate/Concurrent | 13209629.6 | 13098863.2 | 0.84% |
| candidate-2/Empty/Serial | 3276624.8 | 3270722.4 | 0.18% |
| candidate-2/Empty/Concurrent | 3641385.6 | 3516119.2 | 3.44% |
| candidate-2/SmallUnique/Serial | 1628897.6 | 1604027.2 | 1.53% |
| candidate-2/SmallUnique/Concurrent | 3414730.4 | 3811256.0 | -11.61% |
| candidate-2/SmallDuplicate/Serial | 1759180.0 | 1740684.8 | 1.05% |
| candidate-2/SmallDuplicate/Concurrent | 3502092.8 | 3241522.4 | 7.44% |
| candidate-2/WideUnique/Serial | 8283920.8 | 8177934.4 | 1.28% |
| candidate-2/WideUnique/Concurrent | 12475908.8 | 12416942.4 | 0.47% |
| candidate-2/WideDuplicate/Serial | 8961224.0 | 8886650.4 | 0.83% |
| candidate-2/WideDuplicate/Concurrent | 13209629.6 | 12948907.2 | 1.97% |
| candidate-3/Empty/Serial | 3276624.8 | 3263233.6 | 0.41% |
| candidate-3/Empty/Concurrent | 3641385.6 | 3512652.8 | 3.54% |
| candidate-3/SmallUnique/Serial | 1628897.6 | 1606606.4 | 1.37% |
| candidate-3/SmallUnique/Concurrent | 3414730.4 | 3535040.8 | -3.52% |
| candidate-3/SmallDuplicate/Serial | 1759180.0 | 1745528.0 | 0.78% |
| candidate-3/SmallDuplicate/Concurrent | 3502092.8 | 3537372.0 | -1.01% |
| candidate-3/WideUnique/Serial | 8283920.8 | 8177832.0 | 1.28% |
| candidate-3/WideUnique/Concurrent | 12475908.8 | 12385408.8 | 0.73% |
| candidate-3/WideDuplicate/Serial | 8961224.0 | 8856861.6 | 1.16% |
| candidate-3/WideDuplicate/Concurrent | 13209629.6 | 13178372.8 | 0.24% |

Positive reduction means fewer bytes;negative means more. No causal timing,whole-build or production-frequency claim.
B/op follows pinned BDN MidpointRounding.ToEven. Every raw sample,GC byte/operation total,setup receipt and actual overhead row is retained.
Fresh-compilation source/parse/binding/first-driver allocation/time rows are separate in measurement-audit.json;they are not cold-process or constructor-only comparisons.
