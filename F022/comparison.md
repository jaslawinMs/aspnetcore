# F022 measured comparison

Three actual comparisons;84 native warm rows and18 first-observed observations. Positive percentage means less time.
The two primary indexed-name profiles are unchanged. Shared VM noise and controls limit timing attribution;allocation savings are the stronger result.

| Actual public/helper profile | Before ns/op, comparisons1/2/3 | After ns/op, comparisons1/2/3 | Paired improvement %,1/2/3 | Median before/after B/op |
|---|---:|---:|---:|---:|
| Name.List.Constant | 35272.80 / 32052.32 / 32195.27 | 31693.62 / 29620.00 / 29523.12 | 10.15 / 7.59 / 8.30 | 5082 / 4514 |
| Name.List.Captured (primary) | 94728.15 / 91923.88 / 93043.17 | 89507.73 / 83116.48 / 87066.22 | 5.51 / 9.58 / 6.42 | 5654 / 5093 |
| Name.Dictionary.Captured | 72747.14 / 68051.84 / 68184.59 | 64903.87 / 62740.12 / 62469.54 | 10.78 / 7.81 / 8.38 | 5700 / 5059 |
| Name.Nested.TwoIndexers | 149347.02 / 142403.20 / 143957.28 | 137094.45 / 129808.72 / 134487.04 | 8.20 / 8.84 / 6.58 | 10656 / 9519 |
| Name.List.NewExpression (primary) | 102679.05 / 95759.32 / 103308.15 | 94086.43 / 90058.42 / 91649.99 | 8.37 / 5.95 / 11.28 | 6566 / 5997 |
| Name.Member.Control | 35.78 / 36.91 / 34.00 | 33.80 / 34.02 / 32.87 | 5.52 / 7.82 / 3.33 | 0 / 0 |
| Name.Array.Control | 84070.59 / 80493.31 / 81472.39 | 84833.18 / 81149.66 / 82622.37 | -0.91 / -0.82 / -1.41 | 5084 / 5084 |
| Name.Method.Control | 611.60 / 621.12 / 585.81 | 605.60 / 594.49 / 573.81 | 0.98 / 4.29 / 2.05 | 232 / 232 |
| Model.Indexer.RuntimeType | 348266.34 / 327959.36 / 339916.37 | 309000.61 / 315789.67 / 303639.90 | 11.27 / 3.71 / 10.67 | 11380 / 10243 |
| Model.Indexer.Value | 340870.69 / 342697.03 / 335925.46 | 321768.47 / 329795.74 / 313167.11 | 5.60 / 3.76 / 6.77 | 11381 / 10240 |
| Model.Member.Control | 192.27 / 193.10 / 184.96 | 193.87 / 188.97 / 179.31 | -0.83 / 2.14 / 3.05 | 176 / 176 |
| Model.Array.Control | 262672.61 / 264682.88 / 248975.68 | 263065.81 / 248432.54 / 264786.14 | -0.15 / 6.14 / -6.35 | 10072 / 10071 |
| Classifier.Indexer.Helper | 1624.53 / 1526.33 / 1524.04 | 11.00 / 11.00 / 10.98 | 99.32 / 99.28 / 99.28 | 568 / 0 |
| Classifier.Method.Control | 471.14 / 470.20 / 463.32 | 478.33 / 479.08 / 466.16 | -1.53 / -1.89 / -0.61 | 120 / 120 |

The original raw `Model.Indexer.Metadata` row is the runtime-type operation,not metadata-only. Reading `ModelExplorer.ModelType` evaluates its lazy model accessor for this reference model. Comparisons2/3 correct the label/flags without changing the timed operations.

## First observed calls:fixture,JIT and metadata included

| Public profile | Original ms,1/2/3 | Selected ms,1/2/3 | Original bytes,1/2/3 | Selected bytes,1/2/3 |
|---|---:|---:|---:|---:|
| Name.List.Constant | 40.59 / 38.68 / 38.49 | 40.08 / 39.21 / 38.43 | 103888 / 103888 / 97744 | 104216 / 104216 / 91880 |
| Name.Member.Control | 30.35 / 28.88 / 28.15 | 29.57 / 29.49 / 29.08 | 75824 / 75824 / 75824 | 75824 / 75824 / 75824 |
| Model.Indexer.Value | 47.76 / 45.59 / 45.32 | 47.48 / 47.92 / 45.10 | 141992 / 139760 / 133616 | 139488 / 139560 / 139488 |

These are single observations,not a cold-start performance conclusion. Keep unfavorable/control observations.
