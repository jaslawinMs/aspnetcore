| Parameters | Before ns/op by round | After ns/op by round | Median paired time change | Before B/op | After B/op |
|---|---:|---:|---:|---:|---:|
| Case=DirectClientSuffix1 | 78.03 / 75.07 | 75.82 / 231.61 | 102.85% | 0.00 | 0.00 |
| Case=DirectClientSuffix32 | 1015.70 / 971.31 | 994.08 / 1021.91 | 1.54% | 0.00 | 0.00 |
| Case=DirectExact1 | 99.97 / 96.71 | 27.49 / 30.18 | -70.65% | 0.00 | 0.00 |
| Case=DirectExact32 | 99.33 / 96.84 | 32.14 / 30.47 | -68.09% | 0.00 | 0.00 |
| Case=DirectExact8 | 99.36 / 97.68 | 27.44 / 30.64 | -70.51% | 0.00 | 0.00 |
| Case=DirectLast32 | 1668.32 / 1642.08 | 1511.27 / 1563.18 | -7.11% | 0.00 | 0.00 |
| Case=DirectLast8 | 454.93 / 450.26 | 420.75 / 441.33 | -4.75% | 0.00 | 0.00 |
| Case=DirectLong1 | 236.44 / 221.39 | 33.96 / 35.57 | -84.79% | 0.00 | 0.00 |
| Case=DirectLong32 | 242.50 / 215.85 | 33.62 / 34.86 | -84.99% | 0.00 | 0.00 |
| Case=DirectLong8 | 241.03 / 221.34 | 33.85 / 34.37 | -85.21% | 0.00 | 0.00 |
| Case=DirectMiss1 | 76.64 / 74.34 | 71.66 / 75.20 | -2.67% | 0.00 | 0.00 |
| Case=DirectMiss32 | 1369.23 / 1353.37 | 1290.33 / 1355.17 | -2.81% | 0.00 | 0.00 |
| Case=DirectMiss8 | 376.31 / 375.99 | 360.98 / 366.17 | -3.34% | 0.00 | 0.00 |
| Case=DirectMixed1 | 99.38 / 98.55 | 101.05 / 102.42 | 2.80% | 0.00 | 0.00 |
| Case=DirectMixed32 | 98.83 / 102.07 | 104.78 / 106.57 | 5.21% | 0.00 | 0.00 |
| Case=DirectMixed8 | 99.91 / 98.70 | 105.21 / 104.02 | 5.35% | 0.00 | 0.00 |
| AutoPerf.OutputNegotiationBenchmark.Exercise(Case: "DirectNoContentControl1") | 23.83 / 23.54 | 22.62 / 24.76 | 0.06% | 0.00 | 0.00 |
| AutoPerf.OutputNegotiationBenchmark.Exercise(Case: "DirectNoContentControl32") | 23.98 / 24.45 | 22.14 / 25.00 | -2.71% | 0.00 | 0.00 |
| Case=DirectParams1 | 190.95 / 191.96 | 202.13 / 209.01 | 7.37% | 0.00 | 0.00 |
| Case=DirectParams32 | 191.63 / 192.58 | 199.33 / 205.48 | 5.36% | 0.00 | 0.00 |
| Case=DirectParams8 | 188.17 / 188.46 | 200.55 / 205.86 | 7.91% | 0.00 | 0.00 |
| Case=DirectServerSuffix1 | 121.29 / 120.04 | 122.90 / 123.02 | 1.91% | 0.00 | 0.00 |
| Case=DirectServerSuffix32 | 123.90 / 120.22 | 126.59 / 126.84 | 3.83% | 0.00 | 0.00 |
| AutoPerf.OutputNegotiationBenchmark.Exercise(Case: "DirectUnsupportedControl") | 12.56 / 12.72 | 11.90 / 15.49 | 8.22% | 0.00 | 0.00 |
| AutoPerf.OutputNegotiationBenchmark.Exercise(Case: "DirectWildcardRequest") | 86.51 / 85.83 | 90.42 / 89.64 | 4.48% | 0.00 | 0.00 |
| AutoPerf.OutputNegotiationBenchmark.Exercise(Case: "MetadataUnchangedControl3") | 150.09 / 146.15 | 149.79 / 148.53 | 0.72% | 120.00 | 120.00 |
| Case=SelectorAcceptExact3 | 244.37 / 238.90 | 150.39 / 150.73 | -37.68% | 152.00 | 152.00 |
| AutoPerf.OutputNegotiationBenchmark.Exercise(Case: "SelectorAcceptExact32") | 242.93 / 236.72 | 149.23 / 149.76 | -37.65% | 152.00 | 152.00 |
| Case=SelectorAcceptLast32 | 1883.97 / 1828.39 | 1646.81 / 1704.40 | -9.69% | 152.00 | 152.00 |
| Case=SelectorAcceptLong1 | 522.51 / 502.87 | 274.12 / 290.50 | -44.88% | 152.00 | 152.00 |
| Case=SelectorAcceptLong32 | 522.41 / 503.40 | 275.56 / 293.85 | -44.44% | 152.00 | 152.00 |
| Case=SelectorAcceptMiss32 | 1566.53 / 1521.72 | 1479.33 / 1493.96 | -3.70% | 152.00 | 152.00 |
| AutoPerf.OutputNegotiationBenchmark.Exercise(Case: "SelectorBrowserControl3") | 157.33 / 155.50 | 150.53 / 146.78 | -4.96% | 192.00 | 192.00 |
| Case=SelectorDeclared3 | 205.64 / 206.74 | 128.41 / 124.72 | -38.61% | 112.00 | 112.00 |
| Case=SelectorDeclared32 | 209.78 / 208.60 | 128.59 / 125.10 | -39.37% | 112.00 | 112.00 |
| AutoPerf.OutputNegotiationBenchmark.Exercise(Case: "SelectorDeclaredSuffix3") | 206.85 / 207.02 | 212.56 / 213.09 | 2.85% | 112.00 | 112.00 |
| AutoPerf.OutputNegotiationBenchmark.Exercise(Case: "SelectorNoAcceptControl3") | 69.70 / 68.18 | 65.03 / 66.62 | -4.50% | 72.00 | 72.00 |
| Case=SelectorParams3 | 336.63 / 340.23 | 360.41 / 357.53 | 6.07% | 112.00 | 112.00 |
| Case=SelectorQuality3 | 545.29 / 534.47 | 541.71 / 534.15 | -0.36% | 152.00 | 152.00 |
| AutoPerf.OutputNegotiationBenchmark.Exercise(Case: "SelectorUnsupportedControl3") | 145.10 / 140.58 | 143.55 / 137.64 | -1.58% | 152.00 | 152.00 |
