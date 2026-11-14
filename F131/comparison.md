| Parameters | Before ns/op by round | After ns/op by round | Median paired time change | Before B/op | After B/op |
|---|---:|---:|---:|---:|---:|
| Case=AddRemove_Item | 71.18 / 184.16 | 60.06 / 56.34 | -42.52% | 0.00 | 0.00 |
| OwinFeatureMapBenchmark.Execute(Case: "Construct_WarmContext") | 234.12 / 234.44 | 248.67 / 233.48 | 2.90% | 568.00 | 568.00 |
| OwinFeatureMapBenchmark.Execute(Case: "Contains_AbsentFeature") | 43.50 / 45.55 | 43.41 / 37.81 | -8.61% | 0.00 | 0.00 |
| Case=Contains_Method | 33.33 / 36.17 | 31.12 / 36.26 | -3.19% | 0.00 | 0.00 |
| Case=Copied_Method | 34.67 / 31.75 | 34.13 / 34.83 | 4.07% | 0.00 | 0.00 |
| Case=Copy | 1903.47 / 1876.67 | 1928.86 / 1865.31 | 0.36% | 1152.00 | 1152.00 |
| Case=Custom_Map | 36.26 / 33.64 | 35.43 / 36.41 | 2.97% | 0.00 | 0.00 |
| Case=Enumerate | 1903.34 / 1951.51 | 1927.11 / 1871.81 | -1.42% | 1152.00 | 1152.00 |
| Case=Get_ConnectionId | 30.74 / 29.40 | 29.58 / 27.65 | -4.87% | 0.00 | 0.00 |
| Case=Get_Method | 31.69 / 30.81 | 28.88 / 30.09 | -5.60% | 0.00 | 0.00 |
| Case=Get_Path | 27.70 / 32.03 | 28.95 / 28.38 | -3.44% | 0.00 | 0.00 |
| Case=Get_Query | 42.23 / 43.17 | 39.16 / 40.18 | -7.10% | 40.00 | 40.00 |
| Case=Get_RequestHeaders | 38.71 / 39.67 | 35.23 / 37.11 | -7.73% | 24.00 | 24.00 |
| Case=Get_ResponseBody | 47.99 / 46.42 | 43.58 / 37.61 | -14.09% | 0.00 | 0.00 |
| Case=Get_Status | 41.90 / 39.07 | 37.23 / 36.05 | -9.44% | 24.00 | 24.00 |
| Case=Keys | 1956.25 / 2016.66 | 1973.35 / 2001.75 | 0.07% | 1456.00 | 1456.00 |
| Case=Materialize_Maps | 1284.59 / 1238.52 | 1307.51 / 1284.15 | 2.73% | 1720.00 | 1720.00 |
| Case=Pipeline_NoRead | 665.66 / 663.23 | 634.37 / 660.20 | -2.58% | 1160.00 | 1160.00 |
| OwinFeatureMapBenchmark.Execute(Case: "Pipeline_PortsMissing") | 748.28 / 775.09 | 737.24 / 758.37 | -1.82% | 1160.00 | 1160.00 |
| OwinFeatureMapBenchmark.Execute(Case: "Pipeline_PortsPresent") | 776.80 / 785.52 | 738.85 / 790.59 | -2.12% | 1160.00 | 1160.00 |
| Case=Pipeline_ReadCommon | 923.96 / 934.52 | 871.15 / 930.76 | -3.06% | 1224.00 | 1224.00 |
| Case=Pipeline_ReadHeaders | 814.01 / 823.50 | 775.59 / 827.13 | -2.14% | 1272.00 | 1272.00 |
| Case=Removed_Method | 32.09 / 29.60 | 29.68 / 27.53 | -7.25% | 0.00 | 0.00 |
| Case=SetRead_Method | 63.67 / 66.06 | 59.15 / 63.33 | -5.61% | 0.00 | 0.00 |
| Case=Try_AbsentConnection | 37.04 / 37.76 | 36.27 / 33.15 | -7.15% | 0.00 | 0.00 |
| Case=Try_CaseVariant | 50.58 / 49.45 | 41.53 / 39.64 | -18.87% | 0.00 | 0.00 |
| Case=Try_Item | 35.03 / 33.31 | 29.57 / 29.19 | -13.97% | 0.00 | 0.00 |
| Case=Try_Method | 31.84 / 31.06 | 29.81 / 29.70 | -5.38% | 0.00 | 0.00 |
| Case=Try_Unknown | 34.55 / 34.07 | 29.70 / 27.28 | -16.97% | 0.00 | 0.00 |
