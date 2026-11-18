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
| **RemoveAndRestore** |     **0** |        **12** |            **Match** |   **0.6888 ns** |  **0.0495 ns** |  **0.0259 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** |        **Different** |   **1.0118 ns** |  **0.0550 ns** |  **0.0288 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** |             **Null** |   **1.0081 ns** |  **0.0137 ns** |  **0.0072 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** |      **MissingNull** |   **1.0159 ns** |  **0.0334 ns** |  **0.0175 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** | **ControlRemoveKey** |   **3.7867 ns** |  **0.0556 ns** |  **0.0291 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |            **Match** |   **1.0153 ns** |  **0.0240 ns** |  **0.0125 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |        **Different** |   **1.0154 ns** |  **0.0661 ns** |  **0.0346 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |             **Null** |   **1.0203 ns** |  **0.0339 ns** |  **0.0177 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |      **MissingNull** |   **1.0015 ns** |  **0.0120 ns** |  **0.0063 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** | **ControlRemoveKey** |   **3.7933 ns** |  **0.0780 ns** |  **0.0408 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |            **Match** |  **99.1519 ns** |  **1.6278 ns** |  **0.8514 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |        **Different** |  **69.8920 ns** |  **0.8384 ns** |  **0.4385 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |             **Null** |  **95.9658 ns** |  **1.6137 ns** |  **0.8440 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |      **MissingNull** |  **43.0371 ns** |  **0.4897 ns** |  **0.2561 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** | **ControlRemoveKey** |  **64.4271 ns** |  **3.5210 ns** |  **1.8415 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |            **Match** | **561.5896 ns** |  **3.8670 ns** |  **2.0225 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |        **Different** | **378.3531 ns** |  **4.8467 ns** |  **2.5349 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |             **Null** | **554.0365 ns** |  **6.7332 ns** |  **3.5216 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |      **MissingNull** | **253.3163 ns** |  **2.0941 ns** |  **1.0953 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** | **ControlRemoveKey** | **360.0960 ns** |  **3.9426 ns** |  **2.0620 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |            **Match** |  **99.1150 ns** |  **1.8116 ns** |  **0.9475 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |        **Different** |  **67.8679 ns** |  **0.9445 ns** |  **0.4940 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |             **Null** |  **95.5928 ns** |  **1.4109 ns** |  **0.7379 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |      **MissingNull** |  **40.9069 ns** |  **0.8530 ns** |  **0.4461 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** | **ControlRemoveKey** |  **63.0145 ns** |  **0.9883 ns** |  **0.5169 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |            **Match** | **560.4250 ns** |  **5.2157 ns** |  **2.7279 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |        **Different** | **376.9115 ns** |  **3.8903 ns** |  **2.0347 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |             **Null** | **551.4380 ns** |  **5.2826 ns** |  **2.7629 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |      **MissingNull** | **254.4462 ns** |  **3.7826 ns** |  **1.9784 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** | **ControlRemoveKey** | **359.8706 ns** |  **3.7877 ns** |  **1.9810 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |            **Match** |  **97.8136 ns** |  **1.2523 ns** |  **0.6550 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |        **Different** |  **67.5208 ns** |  **0.4705 ns** |  **0.2461 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |             **Null** |  **95.1507 ns** |  **1.8331 ns** |  **0.9588 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |      **MissingNull** |  **41.6824 ns** |  **1.2727 ns** |  **0.6656 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** | **ControlRemoveKey** |  **62.8028 ns** |  **0.9308 ns** |  **0.4868 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |            **Match** | **569.6111 ns** | **11.2123 ns** |  **5.8642 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |        **Different** | **380.1934 ns** |  **4.0820 ns** |  **2.1350 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |             **Null** | **564.6519 ns** | **31.4218 ns** | **16.4342 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |      **MissingNull** | **254.0740 ns** |  **2.2951 ns** |  **1.2004 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** | **ControlRemoveKey** | **359.8391 ns** |  **4.1463 ns** |  **2.1686 ns** |     **-** |     **-** |     **-** |         **-** |
