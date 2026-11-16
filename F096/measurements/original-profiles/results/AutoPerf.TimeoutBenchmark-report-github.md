``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
| Method |   Operation |   Policy |    Reply |       Mean |       Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------- |------------ |--------- |--------- |-----------:|------------:|----------:|-------:|------:|------:|----------:|
| **Invoke** | **Constructor** |   **Finite** | **Deferred** | **1,902.3 ns** | **1,779.63 ns** | **930.78 ns** |      **-** |     **-** |     **-** |     **920 B** |
| **Invoke** | **Constructor** |   **Finite** |   **Inline** |   **939.9 ns** |    **21.57 ns** |  **11.28 ns** | **0.0188** |     **-** |     **-** |     **928 B** |
| **Invoke** | **Constructor** | **Infinite** | **Deferred** |   **715.3 ns** |    **13.55 ns** |   **7.08 ns** | **0.0071** |     **-** |     **-** |     **528 B** |
| **Invoke** | **Constructor** | **Infinite** |   **Inline** |   **719.6 ns** |     **8.42 ns** |   **4.40 ns** | **0.0072** |     **-** |     **-** |     **528 B** |
| **Invoke** |         **Get** |   **Finite** | **Deferred** |   **638.9 ns** |    **11.35 ns** |   **5.94 ns** | **0.0190** |     **-** |     **-** |     **792 B** |
| **Invoke** |         **Get** |   **Finite** |   **Inline** |   **654.5 ns** |    **17.50 ns** |   **9.15 ns** | **0.0195** |     **-** |     **-** |     **792 B** |
| **Invoke** |         **Get** | **Infinite** | **Deferred** |   **430.2 ns** |     **7.13 ns** |   **3.73 ns** | **0.0085** |     **-** |     **-** |     **392 B** |
| **Invoke** |         **Get** | **Infinite** |   **Inline** |   **438.8 ns** |     **5.53 ns** |   **2.89 ns** | **0.0088** |     **-** |     **-** |     **392 B** |
| **Invoke** |      **Invoke** |   **Finite** | **Deferred** |   **971.6 ns** |    **19.18 ns** |  **10.03 ns** | **0.0191** |     **-** |     **-** |   **1,016 B** |
| **Invoke** |      **Invoke** |   **Finite** |   **Inline** |   **886.5 ns** |    **28.62 ns** |  **14.97 ns** | **0.0178** |     **-** |     **-** |     **936 B** |
| **Invoke** |      **Invoke** | **Infinite** | **Deferred** |   **758.4 ns** |    **35.90 ns** |  **18.78 ns** | **0.0153** |     **-** |     **-** |     **616 B** |
| **Invoke** |      **Invoke** | **Infinite** |   **Inline** |   **706.3 ns** |    **44.47 ns** |  **23.26 ns** | **0.0138** |     **-** |     **-** |     **536 B** |
| **Invoke** |  **InvokeVoid** |   **Finite** | **Deferred** | **1,237.1 ns** |   **348.98 ns** | **182.52 ns** | **0.0224** |     **-** |     **-** |     **992 B** |
| **Invoke** |  **InvokeVoid** |   **Finite** |   **Inline** |   **869.7 ns** |    **14.26 ns** |   **7.46 ns** | **0.0171** |     **-** |     **-** |     **840 B** |
| **Invoke** |  **InvokeVoid** | **Infinite** | **Deferred** |   **768.3 ns** |    **13.17 ns** |   **6.89 ns** | **0.0151** |     **-** |     **-** |     **592 B** |
| **Invoke** |  **InvokeVoid** | **Infinite** |   **Inline** |   **684.3 ns** |    **13.08 ns** |   **6.84 ns** | **0.0066** |     **-** |     **-** |     **440 B** |
| **Invoke** |         **Set** |   **Finite** | **Deferred** |   **910.3 ns** |    **54.82 ns** |  **28.67 ns** | **0.0184** |     **-** |     **-** |   **1,008 B** |
| **Invoke** |         **Set** |   **Finite** |   **Inline** |   **850.8 ns** |    **82.51 ns** |  **43.15 ns** | **0.0166** |     **-** |     **-** |     **864 B** |
| **Invoke** |         **Set** | **Infinite** | **Deferred** |   **745.1 ns** |    **11.99 ns** |   **6.27 ns** | **0.0147** |     **-** |     **-** |     **608 B** |
| **Invoke** |         **Set** | **Infinite** |   **Inline** |   **656.4 ns** |    **10.30 ns** |   **5.38 ns** | **0.0064** |     **-** |     **-** |     **464 B** |
