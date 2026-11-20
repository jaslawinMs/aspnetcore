# F145: all paired full-operation observations

Lower candidate/baseline ratio is better. Warmups are shown but excluded from both geometric means. No source-role pooling or allocation metric.

## original

| Phase/pair | Order | Baseline primary ms | Candidate primary ms | Primary ratio | Baseline control ms | Candidate control ms | Control ratio |
|---|---|---:|---:|---:|---:|---:|---:|
| Excluded warmup | baseline then candidate | 1301.7821 | 1124.1136 | 0.863519018 | 72.0620 | 67.1551 | 0.931907247 |
| 0 | baseline then candidate | 1351.3845 | 1139.6090 | 0.843289974 | 71.5067 | 74.0312 | 1.035304384 |
| 1 | candidate then baseline | 1306.6266 | 1166.9234 | 0.893081007 | 69.7442 | 69.9738 | 1.003292030 |
| 2 | baseline then candidate | 1403.5961 | 1152.9395 | 0.821418284 | 80.9758 | 72.4981 | 0.895305758 |
| 3 | candidate then baseline | 1307.5977 | 1103.4443 | 0.843871399 | 68.4012 | 68.5290 | 1.001868388 |
| 4 | baseline then candidate | 1292.7207 | 1112.6386 | 0.860695276 | 68.5022 | 69.4228 | 1.013438984 |
| 5 | candidate then baseline | 1363.1466 | 1130.0749 | 0.829019344 | 70.3483 | 68.7607 | 0.977432290 |
| 6 | baseline then candidate | 1304.6477 | 1134.2819 | 0.869416242 | 69.9157 | 67.4546 | 0.964799037 |

Geometric mean primary ratio **0.8512361065561442**, **14.876389% less time**, 7/7 favorable; control **0.983557608612879**. Both predeclared gates pass. [Exact decision](comparisons/authorization-1-original/decision.json); [all raw pairs](comparisons/authorization-1-original/paired-samples.json).

## default

| Phase/pair | Order | Baseline primary ms | Candidate primary ms | Primary ratio | Baseline control ms | Candidate control ms | Control ratio |
|---|---|---:|---:|---:|---:|---:|---:|
| Excluded warmup | baseline then candidate | 1369.7764 | 1143.9658 | 0.835147839 | 66.9537 | 76.2021 | 1.138131276 |
| 0 | baseline then candidate | 1320.2019 | 1179.9309 | 0.893750342 | 74.4589 | 72.8398 | 0.978255118 |
| 1 | candidate then baseline | 1325.9861 | 1079.3008 | 0.813960870 | 69.3585 | 68.7714 | 0.991535284 |
| 2 | baseline then candidate | 1395.0533 | 1128.3561 | 0.808826516 | 71.2389 | 70.9494 | 0.995936209 |
| 3 | candidate then baseline | 1347.3234 | 1155.6769 | 0.857757610 | 70.9333 | 68.5884 | 0.966942184 |
| 4 | baseline then candidate | 1350.9238 | 1163.8663 | 0.861533641 | 69.3072 | 71.5268 | 1.032025533 |
| 5 | candidate then baseline | 1414.4926 | 1177.2973 | 0.832310682 | 76.3682 | 67.8926 | 0.889016633 |
| 6 | baseline then candidate | 1340.4024 | 1119.5444 | 0.835230077 | 70.1714 | 68.9563 | 0.982683828 |

Geometric mean primary ratio **0.8428920053460468**, **15.710799% less time**, 7/7 favorable; control **0.9757617309969859**. Both predeclared gates pass. [Exact decision](comparisons/authorization-2-default/decision.json); [all raw pairs](comparisons/authorization-2-default/paired-samples.json).
