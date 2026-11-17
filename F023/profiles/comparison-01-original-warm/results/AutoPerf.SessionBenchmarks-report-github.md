``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

Job=SettingsPreserving-F023  PowerPlanMode=00000000-0000-0000-0000-000000000000  Toolchain=SettingsPreservingEmitToolchain  
IterationCount=8  IterationTime=100.0000 ms  RunStrategy=Throughput  
UnrollFactor=1  WarmupCount=3  

```
|            Method |                 Case |      Mean |      Error |     StdDev |    Median |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------------ |--------------------- |----------:|-----------:|-----------:|----------:|-------:|------:|------:|----------:|
| **CreateLoadConsume** | **Load.(...)aller [23]** | **672.50 ns** | **714.882 ns** | **373.897 ns** | **437.09 ns** | **0.0163** |     **-** |     **-** |     **872 B** |
| **CreateLoadConsume** | **Load.(...).None [22]** | **246.09 ns** |   **4.020 ns** |   **2.102 ns** | **245.82 ns** | **0.0102** |     **-** |     **-** |     **440 B** |
| **CreateLoadConsume** | **Load.(...)aller [24]** | **411.84 ns** |  **12.402 ns** |   **5.507 ns** | **413.14 ns** | **0.0211** |     **-** |     **-** |     **872 B** |
| **CreateLoadConsume** | **Load.(...).None [22]** | **378.85 ns** |  **11.111 ns** |   **4.933 ns** | **376.75 ns** | **0.0220** |     **-** |     **-** |     **856 B** |
| **CreateLoadConsume** | **Load.(...)aller [25]** | **265.42 ns** |   **4.848 ns** |   **2.536 ns** | **266.02 ns** | **0.0107** |     **-** |     **-** |     **456 B** |
| **CreateLoadConsume** | **Load.(...).None [23]** | **239.49 ns** |   **6.422 ns** |   **3.359 ns** | **239.48 ns** | **0.0118** |     **-** |     **-** |     **440 B** |
| **CreateLoadConsume** | **Loade(...).None [23]** |  **78.39 ns** |   **1.345 ns** |   **0.597 ns** |  **78.51 ns** | **0.0033** |     **-** |     **-** |     **144 B** |
| **CreateLoadConsume** | **Loade(...).None [24]** |  **78.43 ns** |   **2.402 ns** |   **1.256 ns** |  **78.63 ns** | **0.0033** |     **-** |     **-** |     **144 B** |
