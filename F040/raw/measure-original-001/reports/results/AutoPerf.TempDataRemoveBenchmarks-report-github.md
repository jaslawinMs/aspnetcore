``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F040-SourceComparison  OutlierMode=DontRemove  PowerPlanMode=00000000-0000-0000-0000-000000000000  
Toolchain=SettingsPreservingEmitToolchain  IterationCount=8  IterationTime=100.0000 ms  
RunStrategy=Throughput  UnrollFactor=1  WarmupCount=3  

```
|           Method | Count | KeyLength |         Workload |        Mean |      Error |     StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------- |------ |---------- |----------------- |------------:|-----------:|-----------:|------:|------:|------:|----------:|
| **RemoveAndRestore** |     **0** |        **12** |            **Match** |   **0.6922 ns** |  **0.0282 ns** |  **0.0148 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** |        **Different** |   **1.0096 ns** |  **0.0464 ns** |  **0.0242 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** |             **Null** |   **1.0133 ns** |  **0.0343 ns** |  **0.0179 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** |      **MissingNull** |   **1.0178 ns** |  **0.0605 ns** |  **0.0316 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** | **ControlRemoveKey** |   **3.5617 ns** |  **0.1037 ns** |  **0.0542 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |            **Match** |   **1.0290 ns** |  **0.0769 ns** |  **0.0402 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |        **Different** |   **1.0146 ns** |  **0.0674 ns** |  **0.0353 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |             **Null** |   **1.0535 ns** |  **0.1835 ns** |  **0.0960 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |      **MissingNull** |   **1.0000 ns** |  **0.0281 ns** |  **0.0147 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** | **ControlRemoveKey** |   **3.5685 ns** |  **0.0801 ns** |  **0.0419 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |            **Match** |  **99.4689 ns** |  **1.5406 ns** |  **0.8058 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |        **Different** |  **68.0357 ns** |  **0.4939 ns** |  **0.2583 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |             **Null** |  **97.1681 ns** |  **1.6169 ns** |  **0.8457 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |      **MissingNull** |  **42.7791 ns** |  **1.8708 ns** |  **0.9785 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** | **ControlRemoveKey** |  **63.2942 ns** |  **2.9737 ns** |  **1.5553 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |            **Match** | **561.3850 ns** |  **8.9731 ns** |  **4.6931 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |        **Different** | **378.8268 ns** |  **5.6430 ns** |  **2.9514 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |             **Null** | **564.6765 ns** | **25.6018 ns** | **13.3903 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |      **MissingNull** | **262.3320 ns** | **43.3721 ns** | **22.6844 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** | **ControlRemoveKey** | **367.1096 ns** | **19.0305 ns** |  **9.9533 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |            **Match** |  **98.9171 ns** |  **1.2824 ns** |  **0.6707 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |        **Different** |  **69.4679 ns** |  **0.9269 ns** |  **0.4848 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |             **Null** |  **97.1106 ns** |  **1.5741 ns** |  **0.8233 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |      **MissingNull** |  **41.6275 ns** |  **0.7121 ns** |  **0.3724 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** | **ControlRemoveKey** |  **65.6207 ns** |  **1.1972 ns** |  **0.6261 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |            **Match** | **560.3716 ns** |  **7.0522 ns** |  **3.6884 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |        **Different** | **377.5729 ns** |  **4.6921 ns** |  **2.4540 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |             **Null** | **556.8288 ns** |  **8.1170 ns** |  **4.2454 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |      **MissingNull** | **256.9479 ns** |  **2.3080 ns** |  **1.2071 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** | **ControlRemoveKey** | **362.9510 ns** |  **5.1610 ns** |  **2.6993 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |            **Match** |  **99.3985 ns** |  **1.4174 ns** |  **0.7413 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |        **Different** |  **68.3699 ns** |  **0.6535 ns** |  **0.3418 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |             **Null** |  **96.3999 ns** |  **1.8946 ns** |  **0.9909 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |      **MissingNull** |  **42.5252 ns** |  **1.1739 ns** |  **0.6140 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** | **ControlRemoveKey** |  **62.9098 ns** |  **0.5081 ns** |  **0.2658 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |            **Match** | **563.5499 ns** |  **7.3505 ns** |  **3.8445 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |        **Different** | **377.7918 ns** |  **4.1368 ns** |  **2.1636 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |             **Null** | **554.7195 ns** |  **6.3799 ns** |  **3.3368 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |      **MissingNull** | **254.8987 ns** |  **2.4843 ns** |  **1.2993 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** | **ControlRemoveKey** | **361.0954 ns** |  **3.8552 ns** |  **2.0164 ns** |     **-** |     **-** |     **-** |         **-** |
