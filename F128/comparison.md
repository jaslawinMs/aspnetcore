| Parameters | Before ns/op by round | After ns/op by round | Median paired time change | Before B/op | After B/op |
|---|---:|---:|---:|---:|---:|
| Case=Feature_NotRequest | 66.57 / 70.18 / 68.67 | 69.87 / 67.90 / 70.91 | 3.26% | 24.00 | 24.00 |
| Case=Missing | 75.72 / 78.61 / 78.05 | 80.18 / 82.90 / 82.25 | 5.47% | 24.00 | 24.00 |
| Case=Pipeline_NoUpgrade | 797.08 / 789.95 / 770.79 | 809.17 / 749.35 / 766.66 | -0.54% | 1344.00 | 1344.00 |
| Case=Pipeline_Upgrade | 1590.30 / 1772.41 / 1596.53 | 1622.10 / 1807.63 / 1588.17 | 1.99% | 3232.00 | 3232.00 |
| Case=StandardAccept | 58.21 / 51.70 / 53.13 | 52.12 / 49.48 / 55.85 | -4.29% | 24.00 | 24.00 |
| WebSocketAcceptAdapterBenchmark.AdaptedRequest(Case: "Typed_Callback_Status200") | 181.85 / 179.64 / 198.45 | 176.35 / 184.00 / 178.11 | -3.02% | 288.00 | 288.00 |
| Case=Typed_Dictionary | 114.48 / 113.84 / 109.45 | 109.15 / 111.79 / 111.46 | -1.80% | 128.00 | 128.00 |
| Case=Typed_Dynamic | 193.04 / 189.30 / 202.37 | 198.90 / 201.55 / 193.07 | 3.04% | 208.00 | 208.00 |
| WebSocketAcceptAdapterBenchmark.AdaptedRequest(Case: "Typed_Status101_NoCallback") | 114.23 / 114.78 / 112.26 | 109.54 / 110.61 / 109.36 | -3.64% | 128.00 | 128.00 |
| Case=Upgrade_OwinOptions | 818.73 / 792.14 / 815.33 | 796.56 / 876.34 / 797.84 | -2.14% | 2064.00 | 2064.00 |
| Case=WrongObject | 52.07 / 53.71 / 49.85 | 49.54 / 49.58 / 52.61 | -4.86% | 24.00 | 24.00 |
