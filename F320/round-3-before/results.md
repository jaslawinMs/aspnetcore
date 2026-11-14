``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|  Method |                Case |         Mean |         Error |       StdDev |   Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------- |-------------------- |-------------:|--------------:|-------------:|--------:|------:|------:|----------:|
| **Execute** |     **Helper_Repeated** |     **277.8 ns** |      **12.42 ns** |      **6.50 ns** |  **0.0194** |     **-** |     **-** |     **776 B** |
| **Execute** |          **Helper_Sub** |     **107.6 ns** |       **7.68 ns** |      **4.01 ns** |  **0.0056** |     **-** |     **-** |     **224 B** |
| **Execute** |   **Map_Colon_Control** | **358,841.6 ns** |  **24,338.00 ns** | **12,729.24 ns** |       **-** |     **-** |     **-** | **133,342 B** |
| **Execute** |       **Map_Greeter_1** | **443,111.3 ns** | **133,285.58 ns** | **69,710.94 ns** |  **4.8077** |     **-** |     **-** | **201,427 B** |
| **Execute** |       **Map_Greeter_4** | **897,435.9 ns** | **136,440.45 ns** | **71,361.00 ns** | **12.5000** |     **-** |     **-** | **799,289 B** |
| **Execute** |  **Map_NoBind_Control** | **102,741.7 ns** |   **9,628.80 ns** |  **5,036.05 ns** |  **2.0492** |     **-** |     **-** |  **92,383 B** |
| **Execute** | **Parse_Empty_Control** |   **2,373.2 ns** |     **353.58 ns** |    **184.93 ns** |  **0.1080** |     **-** |     **-** |   **4,352 B** |
| **Execute** |           **Parse_Map** |   **2,328.6 ns** |      **71.83 ns** |     **37.57 ns** |  **0.1148** |     **-** |     **-** |   **4,864 B** |
| **Execute** |  **Parse_Miss_Control** |   **5,248.6 ns** |      **92.61 ns** |     **48.43 ns** |  **0.1053** |     **-** |     **-** |   **4,032 B** |
| **Execute** |  **Parse_Nest_Control** |   **5,142.7 ns** |     **221.22 ns** |    **115.70 ns** |  **0.0985** |     **-** |     **-** |   **4,056 B** |
| **Execute** |      **Parse_Repeated** |   **2,479.6 ns** |      **79.63 ns** |     **41.65 ns** |  **0.1266** |     **-** |     **-** |   **5,128 B** |
| **Execute** |   **Parse_RepeatedMsg** |   **2,456.0 ns** |      **94.54 ns** |     **49.45 ns** |  **0.1188** |     **-** |     **-** |   **5,192 B** |
| **Execute** |  **Parse_RepeatedWrap** |   **2,871.8 ns** |     **542.38 ns** |    **283.67 ns** |  **0.1333** |     **-** |     **-** |   **5,448 B** |
| **Execute** |           **Parse_Sub** |   **2,580.2 ns** |     **454.76 ns** |    **237.85 ns** |  **0.1131** |     **-** |     **-** |   **4,576 B** |
| **Execute** |       **Parse_SubData** |   **2,427.7 ns** |     **100.48 ns** |     **52.55 ns** |  **0.1157** |     **-** |     **-** |   **4,728 B** |
| **Execute** |  **Parse_Wild_Control** |   **2,256.4 ns** |     **143.16 ns** |     **74.88 ns** |  **0.1099** |     **-** |     **-** |   **4,448 B** |
