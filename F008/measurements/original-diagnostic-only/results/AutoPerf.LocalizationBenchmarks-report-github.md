``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F008-original-only  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=3  

```
| Method |                Shape |       Mean |    Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------- |--------------------- |-----------:|---------:|---------:|-------:|------:|------:|----------:|
| **Invoke** |      **QueryOneMutable** |   **509.2 ns** | **24.56 ns** | **12.85 ns** | **0.0209** |     **-** |     **-** |     **936 B** |
| **Invoke** |     **QueryOneReadOnly** |   **403.7 ns** | **34.90 ns** | **15.50 ns** | **0.0190** |     **-** |     **-** |     **712 B** |
| **Invoke** |     **Query16LastArray** |   **512.0 ns** |  **7.98 ns** |  **4.18 ns** | **0.0151** |     **-** |     **-** |     **712 B** |
| **Invoke** | **Query(...)apper [26]** |   **750.1 ns** | **15.49 ns** |  **8.10 ns** | **0.0148** |     **-** |     **-** |     **776 B** |
| **Invoke** |          **Query64Last** |   **925.8 ns** | **15.48 ns** |  **8.10 ns** | **0.0183** |     **-** |     **-** |     **712 B** |
| **Invoke** |          **Query64Miss** |   **825.2 ns** | **15.03 ns** |  **7.86 ns** | **0.0165** |     **-** |     **-** |     **680 B** |
| **Invoke** |        **Header3List64** | **2,209.3 ns** | **16.53 ns** |  **7.34 ns** | **0.0218** |     **-** |     **-** |   **1,432 B** |
| **Invoke** |        **Query64Parent** | **2,453.0 ns** | **53.59 ns** | **28.03 ns** |      **-** |     **-** |     **-** |     **840 B** |
