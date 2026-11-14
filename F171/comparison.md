| Parameters | Before ns/op by round | After ns/op by round | Median paired time change | Before B/op | After B/op |
|---|---:|---:|---:|---:|---:|
| Case=Dictionary_Absent | 636.28 | 617.77 | -2.91% | 1880.00 | 1880.00 |
| Case=Dictionary_None | 653.80 | 642.01 | -1.80% | 1856.00 | 1880.00 |
| Case=Fresh_Absent | 644.48 | 640.63 | -0.60% | 1880.00 | 1880.00 |
| Case=Fresh_Cancelled | 665.00 | 676.65 | 1.75% | 1856.00 | 1880.00 |
| Case=Fresh_None | 675.71 | 665.33 | -1.53% | 1856.00 | 1880.00 |
| Case=Fresh_Null | 672.23 | 666.76 | -0.81% | 1856.00 | 1880.00 |
| Case=Fresh_Object | 661.12 | 695.54 | 5.21% | 1856.00 | 1880.00 |
| CancellationDefaultBenchmark.Construct(Case: "LifetimeFeature_Absent") | 721.08 | 730.36 | 1.29% | 1904.00 | 1904.00 |
| Case=RequestOnly_Control | 258.05 | 257.82 | -0.09% | 1024.00 | 1024.00 |
| Case=Reused_Default | 265.65 | 277.84 | 4.59% | 568.00 | 592.00 |
| CancellationDefaultBenchmark.Construct(Case: "Reused_Dictionary1024") | 255.60 | 269.58 | 5.47% | 568.00 | 592.00 |
| Case=Reused_Dictionary32 | 259.97 | 264.73 | 1.83% | 568.00 | 592.00 |
