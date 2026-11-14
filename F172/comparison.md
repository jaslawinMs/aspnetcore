| Parameters | Before ns/op by round | After ns/op by round | Median paired time change | Before B/op | After B/op |
|---|---:|---:|---:|---:|---:|
| Case=Dictionary_Absent | 630.72 | 638.68 | 1.26% | 1880.00 | 1880.00 |
| Case=Dictionary_Custom | 650.88 | 648.95 | -0.30% | 1880.00 | 1880.00 |
| Case=Fresh_Absent | 770.09 | 637.26 | -17.25% | 1880.00 | 1880.00 |
| Case=Fresh_Custom | 660.38 | 702.52 | 6.38% | 1880.00 | 1880.00 |
| Case=Fresh_Default | 688.35 | 679.14 | -1.34% | 1880.00 | 1880.00 |
| Case=Fresh_Empty | 681.92 | 679.85 | -0.30% | 1880.00 | 1880.00 |
| Case=Fresh_Null | 671.65 | 668.37 | -0.49% | 1880.00 | 1880.00 |
| Case=Fresh_Object | 661.62 | 671.02 | 1.42% | 1880.00 | 1880.00 |
| Case=RequestOnly_Control | 268.99 | 255.74 | -4.93% | 1024.00 | 1024.00 |
| Case=Reused_Default | 257.33 | 268.49 | 4.33% | 568.00 | 568.00 |
| VersionDefaultBenchmark.Construct(Case: "Reused_Dictionary1024") | 257.48 | 252.47 | -1.95% | 568.00 | 568.00 |
| Case=Reused_Dictionary32 | 248.51 | 253.40 | 1.97% | 568.00 | 568.00 |
