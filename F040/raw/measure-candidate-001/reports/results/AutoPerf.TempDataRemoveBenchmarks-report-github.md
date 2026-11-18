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
| **RemoveAndRestore** |     **0** |        **12** |            **Match** |   **0.6813 ns** |  **0.0460 ns** |  **0.0240 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** |        **Different** |   **1.0046 ns** |  **0.0385 ns** |  **0.0202 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** |             **Null** |   **1.0194 ns** |  **0.0400 ns** |  **0.0209 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** |      **MissingNull** |   **1.0084 ns** |  **0.0213 ns** |  **0.0111 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |        **12** | **ControlRemoveKey** |   **3.5537 ns** |  **0.0442 ns** |  **0.0231 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |            **Match** |   **1.0217 ns** |  **0.0762 ns** |  **0.0399 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |        **Different** |   **1.0040 ns** |  **0.0162 ns** |  **0.0085 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |             **Null** |   **1.0214 ns** |  **0.0191 ns** |  **0.0100 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** |      **MissingNull** |   **1.0173 ns** |  **0.0203 ns** |  **0.0106 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **0** |       **128** | **ControlRemoveKey** |   **3.5647 ns** |  **0.0470 ns** |  **0.0246 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |            **Match** |  **86.0545 ns** |  **0.9049 ns** |  **0.4733 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |        **Different** |  **53.1512 ns** |  **0.8788 ns** |  **0.4596 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |             **Null** |  **79.2579 ns** |  **1.1917 ns** |  **0.6233 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** |      **MissingNull** |  **42.0541 ns** |  **1.3052 ns** |  **0.6826 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |        **12** | **ControlRemoveKey** |  **65.6115 ns** |  **0.7982 ns** |  **0.4174 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |            **Match** | **464.3499 ns** |  **3.6517 ns** |  **1.9099 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |        **Different** | **280.8454 ns** |  **2.3696 ns** |  **1.2394 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |             **Null** | **457.6566 ns** |  **4.2713 ns** |  **2.2340 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** |      **MissingNull** | **255.9712 ns** |  **2.7986 ns** |  **1.4637 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **1** |       **128** | **ControlRemoveKey** | **367.5375 ns** | **37.4377 ns** | **19.5806 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |            **Match** |  **82.2226 ns** |  **1.0980 ns** |  **0.5743 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |        **Different** |  **53.3431 ns** |  **0.7756 ns** |  **0.4056 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |             **Null** |  **79.0924 ns** |  **1.4372 ns** |  **0.7517 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** |      **MissingNull** |  **42.4531 ns** |  **0.5826 ns** |  **0.3047 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |        **12** | **ControlRemoveKey** |  **62.9228 ns** |  **0.9459 ns** |  **0.4947 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |            **Match** | **466.1281 ns** | **10.6697 ns** |  **5.5805 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |        **Different** | **281.7221 ns** |  **1.2322 ns** |  **0.6444 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |             **Null** | **456.2207 ns** |  **7.6807 ns** |  **4.0171 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** |      **MissingNull** | **254.0718 ns** |  **3.4645 ns** |  **1.8120 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |     **8** |       **128** | **ControlRemoveKey** | **359.2713 ns** |  **2.6135 ns** |  **1.3669 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |            **Match** |  **82.2186 ns** |  **0.7024 ns** |  **0.3674 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |        **Different** |  **50.9614 ns** |  **0.3195 ns** |  **0.1671 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |             **Null** |  **78.8401 ns** |  **0.7978 ns** |  **0.4173 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** |      **MissingNull** |  **43.7708 ns** |  **3.2632 ns** |  **1.7067 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |        **12** | **ControlRemoveKey** |  **64.6786 ns** |  **3.2190 ns** |  **1.6836 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |            **Match** | **463.2488 ns** |  **5.3203 ns** |  **2.7826 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |        **Different** | **281.8959 ns** |  **2.4442 ns** |  **1.2784 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |             **Null** | **456.9594 ns** |  **5.4381 ns** |  **2.8443 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** |      **MissingNull** | **254.0775 ns** |  **2.3701 ns** |  **1.2396 ns** |     **-** |     **-** |     **-** |         **-** |
| **RemoveAndRestore** |    **64** |       **128** | **ControlRemoveKey** | **360.2066 ns** |  **4.4769 ns** |  **2.3415 ns** |     **-** |     **-** |     **-** |         **-** |
