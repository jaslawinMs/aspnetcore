``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|  Method |                Case |         Mean |         Error |        StdDev |   Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------- |-------------------- |-------------:|--------------:|--------------:|--------:|------:|------:|----------:|
| **Execute** |     **Helper_Repeated** |     **288.2 ns** |      **23.37 ns** |      **12.22 ns** |  **0.0199** |     **-** |     **-** |     **776 B** |
| **Execute** |          **Helper_Sub** |     **107.2 ns** |      **10.17 ns** |       **5.32 ns** |  **0.0056** |     **-** |     **-** |     **224 B** |
| **Execute** |   **Map_Colon_Control** | **355,000.2 ns** |  **35,399.99 ns** |  **18,514.88 ns** |       **-** |     **-** |     **-** | **130,785 B** |
| **Execute** |       **Map_Greeter_1** | **483,495.3 ns** |  **85,900.28 ns** |  **44,927.51 ns** |  **5.2083** |     **-** |     **-** | **200,115 B** |
| **Execute** |       **Map_Greeter_4** | **978,072.0 ns** | **225,991.28 ns** | **118,197.81 ns** | **12.5000** |     **-** |     **-** | **793,606 B** |
| **Execute** |  **Map_NoBind_Control** | **100,717.1 ns** |   **3,582.96 ns** |   **1,873.96 ns** |  **2.0833** |     **-** |     **-** |  **82,320 B** |
| **Execute** | **Parse_Empty_Control** |   **2,254.3 ns** |     **174.03 ns** |      **91.02 ns** |  **0.1114** |     **-** |     **-** |   **4,352 B** |
| **Execute** |           **Parse_Map** |   **2,413.7 ns** |     **133.46 ns** |      **69.80 ns** |  **0.1217** |     **-** |     **-** |   **4,864 B** |
| **Execute** |  **Parse_Miss_Control** |   **5,333.1 ns** |     **376.94 ns** |     **197.15 ns** |  **0.1043** |     **-** |     **-** |   **4,032 B** |
| **Execute** |  **Parse_Nest_Control** |   **5,219.4 ns** |     **138.68 ns** |      **72.53 ns** |  **0.1001** |     **-** |     **-** |   **4,056 B** |
| **Execute** |      **Parse_Repeated** |   **2,501.6 ns** |     **238.55 ns** |     **124.77 ns** |  **0.1230** |     **-** |     **-** |   **5,128 B** |
| **Execute** |   **Parse_RepeatedMsg** |   **2,487.5 ns** |     **109.60 ns** |      **57.33 ns** |  **0.1278** |     **-** |     **-** |   **5,192 B** |
| **Execute** |  **Parse_RepeatedWrap** |   **2,577.1 ns** |     **115.60 ns** |      **60.46 ns** |  **0.1316** |     **-** |     **-** |   **5,448 B** |
| **Execute** |           **Parse_Sub** |   **2,424.0 ns** |     **235.43 ns** |     **123.14 ns** |  **0.1122** |     **-** |     **-** |   **4,576 B** |
| **Execute** |       **Parse_SubData** |   **2,357.3 ns** |     **114.78 ns** |      **60.03 ns** |  **0.1147** |     **-** |     **-** |   **4,728 B** |
| **Execute** |  **Parse_Wild_Control** |   **2,378.7 ns** |     **395.97 ns** |     **207.10 ns** |  **0.1136** |     **-** |     **-** |   **4,448 B** |
