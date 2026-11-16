``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  LaunchCount=1  
WarmupCount=3  

```
|        Method |                 Case |         Mean |       Error |      StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------- |--------------------- |-------------:|------------:|------------:|-------:|------:|------:|----------:|
| **ReadOrProcess** |               **GetInt** |   **133.271 ns** |  **16.2683 ns** |   **8.5086 ns** | **0.0027** |     **-** |     **-** |     **144 B** |
| **ReadOrProcess** |         **GetJsonArray** |   **126.114 ns** |   **1.8115 ns** |   **0.9474 ns** | **0.0013** |     **-** |     **-** |      **88 B** |
| **ReadOrProcess** |      **GetNullableNull** |   **144.302 ns** |  **21.2058 ns** |  **11.0911 ns** | **0.0029** |     **-** |     **-** |     **120 B** |
| **ReadOrProcess** |     **GetNullableValue** |   **174.668 ns** | **118.8229 ns** |  **62.1467 ns** | **0.0029** |     **-** |     **-** |     **144 B** |
| **ReadOrProcess** |            **GetString** |   **141.164 ns** |  **13.2450 ns** |   **6.9274 ns** | **0.0027** |     **-** |     **-** |     **120 B** |
| **ReadOrProcess** |         **PatchCopyInt** |   **893.741 ns** |  **65.6109 ns** |  **34.3158 ns** | **0.0185** |     **-** |     **-** |     **808 B** |
| **ReadOrProcess** |      **PatchCopyString** | **1,334.183 ns** | **188.0416 ns** |  **98.3494 ns** | **0.0130** |     **-** |     **-** |     **824 B** |
| **ReadOrProcess** |         **PatchTestInt** |   **925.699 ns** |  **88.2924 ns** |  **46.1786 ns** | **0.0187** |     **-** |     **-** |     **768 B** |
| **ReadOrProcess** |        **PatchTestInt8** | **7,378.268 ns** | **964.2663 ns** | **504.3299 ns** | **0.1419** |     **-** |     **-** |   **5,865 B** |
| **ReadOrProcess** | **Patch(...)ember [24]** |   **851.594 ns** |  **18.1374 ns** |   **9.4862 ns** | **0.0085** |     **-** |     **-** |     **624 B** |
| **ReadOrProcess** | **Patch(...)eNull [21]** |   **438.559 ns** |  **39.4682 ns** |  **20.6426 ns** | **0.0087** |     **-** |     **-** |     **472 B** |
| **ReadOrProcess** | **Patch(...)Value [22]** | **1,200.735 ns** | **269.9634 ns** | **141.1961 ns** | **0.0111** |     **-** |     **-** |     **776 B** |
| **ReadOrProcess** | **Patch(...)ember [24]** | **1,151.526 ns** |  **21.8329 ns** |  **11.4190 ns** | **0.0230** |     **-** |     **-** |     **920 B** |
| **ReadOrProcess** |      **PatchTestScalar** |   **813.192 ns** |  **47.3092 ns** |  **24.7436 ns** | **0.0079** |     **-** |     **-** |     **544 B** |
| **ReadOrProcess** | **Patch(...)ember [21]** | **1,169.798 ns** | **124.0978 ns** |  **64.9055 ns** | **0.0227** |     **-** |     **-** |     **944 B** |
| **ReadOrProcess** |          **ReadDecimal** |    **18.538 ns** |   **0.3720 ns** |   **0.1946 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| **ReadOrProcess** |             **ReadGuid** |    **19.018 ns** |   **1.6690 ns** |   **0.8729 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| **ReadOrProcess** |              **ReadInt** |    **12.891 ns** |   **1.2720 ns** |   **0.6653 ns** | **0.0005** |     **-** |     **-** |      **24 B** |
| **ReadOrProcess** |    **ReadJsonArrayNull** |    **11.613 ns** |   **0.4658 ns** |   **0.2436 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrProcess** |   **ReadJsonArrayValue** |    **12.565 ns** |   **0.2016 ns** |   **0.1054 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrProcess** |             **ReadLong** |    **17.315 ns** |   **1.5154 ns** |   **0.7926 ns** | **0.0006** |     **-** |     **-** |      **24 B** |
| **ReadOrProcess** |    **ReadMutableStruct** |    **18.857 ns** |   **1.1701 ns** |   **0.6120 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| **ReadOrProcess** |     **ReadNullableNull** |    **10.086 ns** |   **0.1826 ns** |   **0.0955 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrProcess** |    **ReadNullableValue** |    **17.561 ns** |   **0.3287 ns** |   **0.1719 ns** | **0.0004** |     **-** |     **-** |      **24 B** |
| **ReadOrProcess** |   **ReadPreboxedObject** |    **10.370 ns** |   **0.1274 ns** |   **0.0666 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrProcess** |        **ReadReference** |    **10.497 ns** |   **0.2052 ns** |   **0.1073 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrProcess** |           **ReadString** |     **9.348 ns** |   **0.1242 ns** |   **0.0650 ns** |      **-** |     **-** |     **-** |         **-** |
| **ReadOrProcess** |       **TraverseStruct** |   **140.483 ns** |   **2.3174 ns** |   **1.2120 ns** | **0.0029** |     **-** |     **-** |     **152 B** |
