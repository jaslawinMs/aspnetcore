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
| **Execute** |     **Helper_Repeated** |     **287.1 ns** |      **18.79 ns** |      **9.83 ns** |  **0.0201** |     **-** |     **-** |     **776 B** |
| **Execute** |          **Helper_Sub** |     **110.6 ns** |      **24.29 ns** |     **12.70 ns** |  **0.0054** |     **-** |     **-** |     **224 B** |
| **Execute** |   **Map_Colon_Control** | **366,493.3 ns** |  **27,062.75 ns** | **14,154.34 ns** |       **-** |     **-** |     **-** | **131,967 B** |
| **Execute** |       **Map_Greeter_1** | **471,760.7 ns** | **119,780.69 ns** | **62,647.62 ns** |  **5.2083** |     **-** |     **-** | **202,416 B** |
| **Execute** |       **Map_Greeter_4** | **944,463.8 ns** | **132,730.11 ns** | **69,420.41 ns** | **12.5000** |     **-** |     **-** | **801,942 B** |
| **Execute** |  **Map_NoBind_Control** | **100,584.7 ns** |   **3,540.66 ns** |  **1,851.83 ns** |  **1.9231** |     **-** |     **-** |  **84,602 B** |
| **Execute** | **Parse_Empty_Control** |   **2,114.8 ns** |      **67.72 ns** |     **35.42 ns** |  **0.1067** |     **-** |     **-** |   **4,352 B** |
| **Execute** |           **Parse_Map** |   **2,350.2 ns** |     **105.82 ns** |     **55.35 ns** |  **0.1142** |     **-** |     **-** |   **4,864 B** |
| **Execute** |  **Parse_Miss_Control** |   **5,199.2 ns** |      **95.24 ns** |     **49.81 ns** |  **0.1028** |     **-** |     **-** |   **4,032 B** |
| **Execute** |  **Parse_Nest_Control** |   **5,198.8 ns** |     **638.54 ns** |    **333.97 ns** |  **0.1022** |     **-** |     **-** |   **4,056 B** |
| **Execute** |      **Parse_Repeated** |   **2,433.5 ns** |     **229.95 ns** |    **120.27 ns** |  **0.1181** |     **-** |     **-** |   **5,128 B** |
| **Execute** |   **Parse_RepeatedMsg** |   **2,405.8 ns** |     **175.81 ns** |     **91.95 ns** |  **0.1224** |     **-** |     **-** |   **5,192 B** |
| **Execute** |  **Parse_RepeatedWrap** |   **2,484.0 ns** |     **219.06 ns** |    **114.57 ns** |  **0.1241** |     **-** |     **-** |   **5,448 B** |
| **Execute** |           **Parse_Sub** |   **2,225.5 ns** |      **49.65 ns** |     **25.97 ns** |  **0.1132** |     **-** |     **-** |   **4,576 B** |
| **Execute** |       **Parse_SubData** |   **2,313.4 ns** |     **158.17 ns** |     **82.72 ns** |  **0.1140** |     **-** |     **-** |   **4,728 B** |
| **Execute** |  **Parse_Wild_Control** |   **2,234.0 ns** |     **135.02 ns** |     **70.62 ns** |  **0.1089** |     **-** |     **-** |   **4,448 B** |
