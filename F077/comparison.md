| Parameters | Before ns/op by round | After ns/op by round | Median paired time change | Before B/op | After B/op |
|---|---:|---:|---:|---:|---:|
| Case=Assignable_1 | 79.07 | 80.55 | 1.87% | 232.00 | 232.00 |
| Case=Assignable_64 | 4722.64 | 4739.14 | 0.35% | 12328.00 | 12328.00 |
| Case=Copy_1 | 2574.81 | 2657.26 | 3.20% | 5736.00 | 5736.00 |
| Case=Copy_64 | 167340.98 | 167094.61 | -0.15% | 364592.00 | 364592.00 |
| Case=EmptyNullable_8 | 5384.14 | 2846.21 | -47.14% | 34920.00 | 11688.00 |
| Case=JsonObject_1_1024 | 5325.15 | 3015.04 | -43.38% | 17376.00 | 4880.00 |
| Case=JsonObject_1_16 | 2303.67 | 3063.55 | 32.99% | 5448.00 | 4880.00 |
| Case=JsonObject_1_16384 | 47328.84 | 3075.57 | -93.50% | 246442.00 | 4880.00 |
| Case=JsonObject_8_1024 | 44243.31 | 24300.85 | -45.07% | 138730.00 | 38761.00 |
| Case=JsonObject_8_16 | 19611.20 | 25016.81 | 27.56% | 43305.00 | 38761.00 |
| Case=JsonObject_8_16384 | 396310.69 | 24036.84 | -93.93% | 1971260.00 | 38761.00 |
| Case=LongToInt_1 | 658.98 | 362.60 | -44.98% | 4408.00 | 1528.00 |
| Case=LongToInt_64 | 40646.34 | 22112.07 | -45.60% | 279594.00 | 95273.00 |
| Case=LongToInt_8 | 5314.11 | 2784.71 | -47.60% | 34984.00 | 11944.00 |
| Case=NullNullable_1 | 98.33 | 98.18 | -0.15% | 248.00 | 248.00 |
| Case=NullNullable_64 | 5969.52 | 6053.99 | 1.41% | 13352.00 | 13352.00 |
| NewtonsoftPatchBenchmark.ApplyPatch(Case: "ProgrammaticObject_1_1024") | 5417.80 | 3408.77 | -37.08% | 17792.00 | 5128.00 |
| NewtonsoftPatchBenchmark.ApplyPatch(Case: "ProgrammaticObject_1_16") | 2668.88 | 3366.41 | 26.14% | 5864.00 | 5128.00 |
| NewtonsoftPatchBenchmark.ApplyPatch(Case: "ProgrammaticObject_1_16384") | 47291.38 | 3315.33 | -92.99% | 246858.00 | 5128.00 |
| NewtonsoftPatchBenchmark.ApplyPatch(Case: "ProgrammaticObject_8_1024") | 43409.08 | 26853.20 | -38.14% | 142058.00 | 40745.00 |
| NewtonsoftPatchBenchmark.ApplyPatch(Case: "ProgrammaticObject_8_16") | 20474.40 | 26596.57 | 29.90% | 46633.00 | 40745.00 |
| NewtonsoftPatchBenchmark.ApplyPatch(Case: "ProgrammaticObject_8_16384") | 391208.69 | 26884.38 | -93.13% | 1974586.00 | 40745.00 |
| Case=StringToEnum_1 | 716.13 | 375.48 | -47.57% | 4448.00 | 1496.00 |
| Case=StringToEnum_64 | 45258.82 | 23108.28 | -48.94% | 282156.00 | 93226.00 |
| Case=StringToEnum_8 | 5720.48 | 2968.15 | -48.11% | 35304.00 | 11688.00 |
| Case=StringToInt_1 | 684.70 | 353.04 | -48.44% | 4464.00 | 1504.00 |
| Case=StringToInt_64 | 43243.47 | 22030.10 | -49.06% | 283178.00 | 93737.00 |
| Case=StringToInt_8 | 5458.91 | 2752.70 | -49.57% | 35432.00 | 11752.00 |
