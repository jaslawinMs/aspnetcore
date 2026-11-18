``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F040-SourceComparison  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|           Method | Count | KeyLength |         Workload |        Mean |      Error |    StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------- |------ |---------- |----------------- |------------:|-----------:|----------:|------:|------:|------:|----------:|
| **RemoveAndRestore** |     **0** |        **12** |            **Match** |   **0.6918 ns** |  **0.0475 ns** | **0.0248 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** |        **Different** |   **1.0107 ns** |  **0.0241 ns** | **0.0126 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** |             **Null** |   **1.0099 ns** |  **0.0329 ns** | **0.0172 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** |      **MissingNull** |   **1.0199 ns** |  **0.0298 ns** | **0.0156 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** | **ControlRemoveKey** |   **3.5445 ns** |  **0.0603 ns** | **0.0315 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |            **Match** |   **1.0253 ns** |  **0.0605 ns** | **0.0316 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |        **Different** |   **1.0180 ns** |  **0.0441 ns** | **0.0231 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |             **Null** |   **1.0021 ns** |  **0.0265 ns** | **0.0139 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |      **MissingNull** |   **1.0115 ns** |  **0.0293 ns** | **0.0153 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** | **ControlRemoveKey** |   **3.5624 ns** |  **0.0736 ns** | **0.0385 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |            **Match** |  **82.9704 ns** |  **2.3129 ns** | **1.2097 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |        **Different** |  **51.4964 ns** |  **0.8579 ns** | **0.4487 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |             **Null** |  **78.5354 ns** |  **0.7188 ns** | **0.3759 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |      **MissingNull** |  **42.2401 ns** |  **1.0218 ns** | **0.5344 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** | **ControlRemoveKey** |  **63.5956 ns** |  **0.6593 ns** | **0.3448 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |            **Match** | **463.3059 ns** |  **4.9884 ns** | **2.6090 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |        **Different** | **284.4317 ns** | **10.3050 ns** | **5.3897 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |             **Null** | **459.9222 ns** | **12.7746 ns** | **6.6814 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |      **MissingNull** | **255.3168 ns** |  **4.1673 ns** | **2.1796 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** | **ControlRemoveKey** | **360.7413 ns** |  **5.8111 ns** | **3.0393 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |            **Match** |  **82.6045 ns** |  **0.8930 ns** | **0.4671 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |        **Different** |  **51.0954 ns** |  **0.7727 ns** | **0.4042 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |             **Null** |  **78.9422 ns** |  **3.0515 ns** | **1.5960 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |      **MissingNull** |  **42.5585 ns** |  **1.3559 ns** | **0.7092 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** | **ControlRemoveKey** |  **63.3090 ns** |  **1.1874 ns** | **0.6210 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |            **Match** | **468.6596 ns** | **10.5134 ns** | **5.4987 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |        **Different** | **282.8780 ns** |  **4.7705 ns** | **2.4951 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |             **Null** | **463.2162 ns** | **10.8155 ns** | **5.6567 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |      **MissingNull** | **258.2344 ns** |  **9.3260 ns** | **4.8777 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** | **ControlRemoveKey** | **367.6898 ns** | **14.9438 ns** | **7.8159 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |            **Match** |  **82.8089 ns** |  **1.9098 ns** | **0.9989 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |        **Different** |  **54.2261 ns** |  **2.5260 ns** | **1.3212 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |             **Null** |  **81.3720 ns** |  **4.2723 ns** | **2.2345 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |      **MissingNull** |  **43.4242 ns** |  **0.9490 ns** | **0.4964 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** | **ControlRemoveKey** |  **63.9232 ns** |  **1.1717 ns** | **0.6128 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |            **Match** | **463.8458 ns** |  **7.1892 ns** | **3.7601 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |        **Different** | **284.1920 ns** |  **6.7879 ns** | **3.5502 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |             **Null** | **458.7323 ns** |  **4.4091 ns** | **2.3061 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |      **MissingNull** | **260.1819 ns** |  **9.4287 ns** | **4.9314 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** | **ControlRemoveKey** | **361.6793 ns** |  **6.1000 ns** | **3.1904 ns** |     **-** |     **-** |     **-** |         **-** |
