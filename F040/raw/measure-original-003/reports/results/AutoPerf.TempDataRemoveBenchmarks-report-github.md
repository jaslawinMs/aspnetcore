``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F040-SourceComparison  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|           Method | Count | KeyLength |         Workload |       Mean |      Error |     StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------- |------ |---------- |----------------- |-----------:|-----------:|-----------:|------:|------:|------:|----------:|
| **RemoveAndRestore** |     **0** |        **12** |            **Match** |   **1.124 ns** |  **0.0742 ns** |  **0.0388 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** |        **Different** |   **1.242 ns** |  **0.0408 ns** |  **0.0214 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** |             **Null** |   **1.253 ns** |  **0.0893 ns** |  **0.0467 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** |      **MissingNull** |   **1.235 ns** |  **0.0455 ns** |  **0.0238 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** | **ControlRemoveKey** |   **3.655 ns** |  **0.1134 ns** |  **0.0593 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |            **Match** |   **1.232 ns** |  **0.0403 ns** |  **0.0211 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |        **Different** |   **1.248 ns** |  **0.0640 ns** |  **0.0335 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |             **Null** |   **1.269 ns** |  **0.1477 ns** |  **0.0772 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |      **MissingNull** |   **1.238 ns** |  **0.0632 ns** |  **0.0330 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** | **ControlRemoveKey** |   **3.684 ns** |  **0.0927 ns** |  **0.0485 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |            **Match** |  **97.594 ns** |  **3.6773 ns** |  **1.9233 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |        **Different** |  **68.624 ns** |  **1.4284 ns** |  **0.7471 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |             **Null** |  **94.884 ns** |  **5.1812 ns** |  **2.7099 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |      **MissingNull** |  **41.636 ns** |  **1.2568 ns** |  **0.6573 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** | **ControlRemoveKey** |  **62.040 ns** |  **1.5370 ns** |  **0.8039 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |            **Match** | **565.127 ns** | **15.3472 ns** |  **8.0269 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |        **Different** | **379.992 ns** |  **2.9034 ns** |  **1.5185 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |             **Null** | **564.280 ns** | **34.4839 ns** | **18.0357 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |      **MissingNull** | **255.455 ns** |  **1.9797 ns** |  **1.0354 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** | **ControlRemoveKey** | **360.523 ns** |  **5.9077 ns** |  **3.0899 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |            **Match** |  **98.399 ns** |  **5.3307 ns** |  **2.7881 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |        **Different** |  **69.380 ns** |  **2.7323 ns** |  **1.4291 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |             **Null** |  **96.001 ns** |  **6.8472 ns** |  **3.5812 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |      **MissingNull** |  **39.712 ns** |  **1.0154 ns** |  **0.5311 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** | **ControlRemoveKey** |  **61.060 ns** |  **2.1863 ns** |  **1.1435 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |            **Match** | **567.377 ns** | **13.9630 ns** |  **7.3029 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |        **Different** | **378.838 ns** |  **2.6929 ns** |  **1.4085 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |             **Null** | **551.278 ns** |  **3.7375 ns** |  **1.9548 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |      **MissingNull** | **253.607 ns** |  **1.4770 ns** |  **0.7725 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** | **ControlRemoveKey** | **359.771 ns** |  **3.9858 ns** |  **2.0847 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |            **Match** |  **95.352 ns** |  **1.1291 ns** |  **0.5905 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |        **Different** |  **67.600 ns** |  **0.6833 ns** |  **0.3574 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |             **Null** |  **92.398 ns** |  **2.0467 ns** |  **1.0705 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |      **MissingNull** |  **40.107 ns** |  **0.9017 ns** |  **0.4716 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** | **ControlRemoveKey** |  **64.624 ns** |  **1.1795 ns** |  **0.6169 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |            **Match** | **564.511 ns** |  **9.2474 ns** |  **4.8366 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |        **Different** | **380.106 ns** |  **4.4394 ns** |  **2.3219 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |             **Null** | **558.231 ns** |  **5.5424 ns** |  **2.8988 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |      **MissingNull** | **254.031 ns** |  **4.1037 ns** |  **2.1463 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** | **ControlRemoveKey** | **361.250 ns** |  **5.2196 ns** |  **2.7299 ns** |     **-** |     **-** |     **-** |         **-** |
