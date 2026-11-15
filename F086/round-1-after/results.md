``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  InvocationCount=1  
IterationCount=8  IterationTime=100.0000 ms  LaunchCount=1  
WarmupCount=3  

```
|                   Type |     Method |        Job | UnrollFactor |               Case |        Mean |       Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------------- |----------- |----------- |------------- |------------------- |------------:|------------:|----------:|-------:|------:|------:|----------:|
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |      **ArrayRejected** |    **112.4 ns** |     **9.72 ns** |   **5.08 ns** | **0.0104** |     **-** |     **-** |     **408 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |           **Depth128** |  **9,921.0 ns** |   **112.62 ns** |  **58.90 ns** | **0.0981** |     **-** |     **-** |   **7,233 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |            **Depth16** |  **1,225.3 ns** |    **43.54 ns** |  **22.77 ns** | **0.0243** |     **-** |     **-** |     **960 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |             **Depth4** |    **325.6 ns** |     **5.51 ns** |   **2.88 ns** | **0.0066** |     **-** |     **-** |     **288 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |            **Depth64** |  **4,975.7 ns** |    **59.68 ns** |  **31.21 ns** | **0.0494** |     **-** |     **-** |   **3,648 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |       **Depth64Eight** | **40,038.9 ns** | **1,338.84 ns** | **700.24 ns** | **0.3956** |     **-** |     **-** |  **28,906 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |    **DerivedReplace8** |    **752.3 ns** |    **12.57 ns** |   **6.58 ns** | **0.0150** |     **-** |     **-** |     **680 B** |
| **JsonPatchColdBenchmark** | **ApplyBatch** | **Job-MJZLDB** |            **1** |     **FreshElement64** |  **8,434.8 ns** |   **619.73 ns** | **324.13 ns** |      **-** |     **-** |     **-** |   **1,871 B** |
| **JsonPatchColdBenchmark** | **ApplyBatch** | **Job-MJZLDB** |            **1** |        **FreshList64** |  **5,313.1 ns** |   **782.05 ns** | **409.03 ns** |      **-** |     **-** |     **-** |     **884 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |       **IntAddRemove** |  **1,383.9 ns** |    **31.01 ns** |  **16.22 ns** | **0.0205** |     **-** |     **-** |   **1,320 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |        **IntBadIndex** |    **230.1 ns** |     **3.56 ns** |   **1.86 ns** | **0.0070** |     **-** |     **-** |     **344 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |        **IntBadValue** |  **6,636.3 ns** |   **115.93 ns** |  **60.63 ns** |      **-** |     **-** |     **-** |   **2,232 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |      **IntConverted8** |  **2,883.3 ns** |    **70.58 ns** |  **36.91 ns** | **0.0569** |     **-** |     **-** |   **2,152 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |      **IntCopyRemove** |  **4,382.5 ns** |   **288.29 ns** | **150.78 ns** | **0.0844** |     **-** |     **-** |   **3,624 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |   **IntMoveRoundTrip** |  **4,520.2 ns** |    **50.33 ns** |  **26.33 ns** | **0.0909** |     **-** |     **-** |   **4,264 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |        **IntReplace1** |    **103.7 ns** |     **3.38 ns** |   **1.77 ns** | **0.0022** |     **-** |     **-** |     **120 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |        **IntReplace8** |    **762.5 ns** |    **39.05 ns** |  **20.42 ns** | **0.0149** |     **-** |     **-** |     **680 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |           **IntTest8** |  **4,636.5 ns** |   **426.11 ns** | **222.86 ns** | **0.0458** |     **-** |     **-** |   **2,920 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |         **JsonArray1** |    **389.9 ns** |     **9.88 ns** |   **5.17 ns** | **0.0077** |     **-** |     **-** |     **352 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |         **JsonArray8** |  **3,096.1 ns** |   **100.45 ns** |  **52.54 ns** | **0.0608** |     **-** |     **-** |   **2,536 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |   **JsonArrayDepth16** |  **1,563.0 ns** |    **43.16 ns** |  **22.57 ns** | **0.0307** |     **-** |     **-** |   **1,192 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |     **MixedReplace32** |  **5,849.3 ns** |   **223.59 ns** | **116.94 ns** | **0.1144** |     **-** |     **-** |   **4,392 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |      **MixedReplace8** |  **1,496.8 ns** |    **65.78 ns** |  **34.40 ns** | **0.0297** |     **-** |     **-** |   **1,128 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |  **MultiListReplace8** |    **768.9 ns** |    **49.62 ns** |  **25.95 ns** | **0.0160** |     **-** |     **-** |     **680 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** | **NonGenericRejected** |    **191.0 ns** |     **5.67 ns** |   **2.97 ns** | **0.0143** |     **-** |     **-** |     **544 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |        **PocoControl** |    **141.5 ns** |    **18.98 ns** |   **9.92 ns** | **0.0042** |     **-** |     **-** |     **200 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |     **StringReplace1** |    **113.1 ns** |     **3.06 ns** |   **1.60 ns** | **0.0024** |     **-** |     **-** |     **120 B** |
|     **JsonPatchBenchmark** |      **Apply** | **Job-INUQNS** |           **16** |     **StringReplace8** |    **811.4 ns** |    **19.17 ns** |  **10.03 ns** | **0.0162** |     **-** |     **-** |     **680 B** |
