| Parameters | Before ns/op by round | After ns/op by round | Median paired time change | Before B/op | After B/op |
|---|---:|---:|---:|---:|---:|
| Case=All_1024 | 9111.69 | 8132.47 | -10.75% | 16600.00 | 16600.00 |
| Case=All_128 | 1071.34 | 1085.02 | 1.28% | 2192.00 | 2192.00 |
| Case=All_16 | 159.70 | 160.56 | 0.53% | 328.00 | 328.00 |
| FormFileCollectionBenchmark.Query(Case: "Control_GetFile_First_16") | 3.30 | 4.05 | 22.89% | 0.00 | 0.00 |
| FormFileCollectionBenchmark.Query(Case: "Control_GetFile_Miss_16") | 20.08 | 20.96 | 4.36% | 0.00 | 0.00 |
| Case=Empty | 9.34 | 3.27 | -65.00% | 32.00 | 0.00 |
| Case=EmptyName | 41.62 | 42.57 | 2.27% | 88.00 | 88.00 |
| Case=First_16 | 41.89 | 42.82 | 2.21% | 88.00 | 88.00 |
| Case=Hit_1 | 23.96 | 24.06 | 0.44% | 88.00 | 88.00 |
| Case=Last_16 | 44.19 | 45.59 | 3.18% | 88.00 | 88.00 |
| Case=Miss_1 | 10.02 | 3.90 | -61.02% | 32.00 | 0.00 |
| Case=Miss_1024 | 1486.62 | 1503.72 | 1.15% | 32.00 | 0.00 |
| Case=Miss_128 | 171.59 | 169.07 | -1.47% | 32.00 | 0.00 |
| Case=Miss_16 | 26.26 | 21.35 | -18.67% | 32.00 | 0.00 |
| Case=Mixed_128 | 539.59 | 546.75 | 1.33% | 1144.00 | 1144.00 |
| Case=Mixed_16 | 88.47 | 89.45 | 1.11% | 176.00 | 176.00 |
| Case=OrdinalMiss | 26.19 | 21.36 | -18.47% | 32.00 | 0.00 |
| Case=Parsed_All_16 | 179.87 | 181.69 | 1.01% | 328.00 | 328.00 |
| Case=Parsed_Empty | 9.35 | 3.38 | -63.83% | 32.00 | 0.00 |
| Case=Parsed_Hit_1 | 26.24 | 26.32 | 0.29% | 88.00 | 88.00 |
| Case=Parsed_Miss_1 | 10.09 | 3.96 | -60.78% | 32.00 | 0.00 |
| Case=Parsed_Miss_16 | 27.90 | 21.25 | -23.82% | 32.00 | 0.00 |
| Case=Parsed_Mixed_16 | 93.37 | 96.25 | 3.09% | 176.00 | 176.00 |
