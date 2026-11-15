``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  InvocationCount=1  
IterationCount=8  IterationTime=100.0000 ms  LaunchCount=1  
WarmupCount=3  

```
|                   Type |     Method |        Job | UnrollFactor |               Case |        Mean |       Error |      StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------------- |----------- |----------- |------------- |------------------- |------------:|------------:|------------:|-------:|------:|------:|----------:|
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |      **ArrayRejected** |    **110.0 ns** |    **20.70 ns** |    **10.83 ns** | **0.0102** |     **-** |     **-** |     **408 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |           **Depth128** | **23,977.8 ns** |   **618.54 ns** |   **323.51 ns** | **0.5020** |     **-** |     **-** |  **22,595 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |            **Depth16** |  **3,001.8 ns** |    **31.91 ns** |    **16.69 ns** | **0.0596** |     **-** |     **-** |   **2,880 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |             **Depth4** |    **808.0 ns** |    **23.39 ns** |    **12.23 ns** | **0.0163** |     **-** |     **-** |     **768 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |            **Depth64** | **12,215.7 ns** |   **574.84 ns** |   **300.65 ns** | **0.2395** |     **-** |     **-** |  **11,329 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |       **Depth64Eight** | **97,460.4 ns** | **1,705.45 ns** |   **891.98 ns** | **1.9231** |     **-** |     **-** |  **90,356 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |    **DerivedReplace8** |  **1,720.9 ns** |    **28.62 ns** |    **14.97 ns** | **0.0345** |     **-** |     **-** |   **1,640 B** |
| **JsonPatchColdBenchmark** | **ApplyBatch** | **Job-MMGOAW** |            **1** |     **FreshElement64** |  **8,946.3 ns** | **2,169.12 ns** | **1,134.49 ns** |      **-** |     **-** |     **-** |   **1,790 B** |
| **JsonPatchColdBenchmark** | **ApplyBatch** | **Job-MMGOAW** |            **1** |        **FreshList64** |  **6,020.1 ns** | **2,124.41 ns** | **1,111.11 ns** |      **-** |     **-** |     **-** |     **803 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |       **IntAddRemove** |  **3,193.1 ns** |    **34.91 ns** |    **18.26 ns** | **0.0639** |     **-** |     **-** |   **3,240 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |        **IntBadIndex** |    **358.2 ns** |    **29.40 ns** |    **15.38 ns** | **0.0107** |     **-** |     **-** |     **464 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |        **IntBadValue** |  **6,980.3 ns** |   **101.23 ns** |    **52.94 ns** |      **-** |     **-** |     **-** |   **2,353 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |      **IntConverted8** |  **4,046.2 ns** |   **118.63 ns** |    **62.05 ns** | **0.0809** |     **-** |     **-** |   **3,112 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |      **IntCopyRemove** |  **7,576.5 ns** |   **544.20 ns** |   **284.62 ns** | **0.1488** |     **-** |     **-** |   **6,505 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |   **IntMoveRoundTrip** | **11,028.3 ns** |   **152.24 ns** |    **79.62 ns** | **0.2193** |     **-** |     **-** |  **10,025 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |        **IntReplace1** |    **223.9 ns** |     **4.44 ns** |     **2.32 ns** | **0.0046** |     **-** |     **-** |     **240 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |        **IntReplace8** |  **1,746.1 ns** |    **32.15 ns** |    **16.82 ns** | **0.0346** |     **-** |     **-** |   **1,640 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |           **IntTest8** |  **5,776.6 ns** |   **131.88 ns** |    **68.97 ns** | **0.0579** |     **-** |     **-** |   **3,880 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |         **JsonArray1** |    **507.7 ns** |     **9.53 ns** |     **4.99 ns** | **0.0102** |     **-** |     **-** |     **440 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |         **JsonArray8** |  **4,049.4 ns** |    **65.45 ns** |    **34.23 ns** | **0.0812** |     **-** |     **-** |   **3,240 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |   **JsonArrayDepth16** |  **3,087.1 ns** |    **30.57 ns** |    **15.99 ns** | **0.0618** |     **-** |     **-** |   **2,600 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |     **MixedReplace32** | **13,570.0 ns** |   **247.49 ns** |   **129.44 ns** | **0.2700** |     **-** |     **-** |  **12,075 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |      **MixedReplace8** |  **3,512.0 ns** |    **40.41 ns** |    **21.14 ns** | **0.0704** |     **-** |     **-** |   **3,049 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |  **MultiListReplace8** |  **1,930.9 ns** |    **85.08 ns** |    **44.50 ns** | **0.0381** |     **-** |     **-** |   **1,832 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** | **NonGenericRejected** |    **175.6 ns** |     **5.18 ns** |     **2.71 ns** | **0.0141** |     **-** |     **-** |     **544 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |        **PocoControl** |    **132.6 ns** |     **2.04 ns** |     **1.07 ns** | **0.0041** |     **-** |     **-** |     **200 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |     **StringReplace1** |    **229.8 ns** |     **3.94 ns** |     **2.06 ns** | **0.0047** |     **-** |     **-** |     **240 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-ZLQGTO** |           **16** |     **StringReplace8** |  **1,824.9 ns** |    **50.89 ns** |    **26.62 ns** | **0.0357** |     **-** |     **-** |   **1,640 B** |
