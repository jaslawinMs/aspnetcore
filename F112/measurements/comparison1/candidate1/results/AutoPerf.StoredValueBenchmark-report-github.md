``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|             Method |                 Case |          Mean |         Error |        StdDev |  Gen 0 |  Gen 1 |  Gen 2 | Allocated |
|------------------- |--------------------- |--------------:|--------------:|--------------:|-------:|-------:|-------:|----------:|
| **SerializeOrPersist** |    **DataScalarControl** |     **632.74 ns** |    **110.925 ns** |     **58.016 ns** | **0.0236** |      **-** |      **-** |   **1,032 B** |
| **SerializeOrPersist** | **DataString16KControl** |  **13,615.34 ns** |  **4,052.150 ns** |  **2,119.353 ns** | **3.2961** | **0.1268** |      **-** | **115,842 B** |
| **SerializeOrPersist** |      **SessionArray256** |   **2,654.75 ns** |    **123.695 ns** |     **64.695 ns** | **0.0571** |      **-** |      **-** |   **2,264 B** |
| **SerializeOrPersist** | **SessionDictionary256** |  **15,547.50 ns** |  **2,207.312 ns** |  **1,154.467 ns** | **0.6868** |      **-** |      **-** |  **29,057 B** |
| **SerializeOrPersist** |    **SessionEscaped16K** | **134,928.86 ns** |  **7,296.521 ns** |  **3,816.222 ns** | **3.9063** |      **-** |      **-** | **144,569 B** |
| **SerializeOrPersist** |        **SessionNested** |   **2,958.17 ns** |    **264.607 ns** |    **138.395 ns** | **0.0539** |      **-** |      **-** |   **2,024 B** |
| **SerializeOrPersist** |          **SessionNull** |      **75.10 ns** |      **4.824 ns** |      **2.523 ns** | **0.0016** |      **-** |      **-** |      **88 B** |
| **SerializeOrPersist** |        **SessionScalar** |     **288.35 ns** |     **22.881 ns** |     **11.967 ns** | **0.0085** |      **-** |      **-** |     **384 B** |
| **SerializeOrPersist** |    **SessionString128K** | **161,119.35 ns** | **27,556.956 ns** | **14,412.821 ns** | **3.2895** | **3.2895** | **3.2895** | **262,536 B** |
| **SerializeOrPersist** |     **SessionString16K** |   **8,144.09 ns** |  **3,526.941 ns** |  **1,844.659 ns** | **0.8748** |      **-** |      **-** |  **33,153 B** |
| **SerializeOrPersist** |    **SessionUnicode16K** | **192,861.22 ns** | **26,551.287 ns** | **13,886.836 ns** | **1.8939** | **1.8939** | **1.8939** | **197,004 B** |
| **SerializeOrPersist** |         **ValueAbove4K** |   **1,183.78 ns** |    **234.731 ns** |    **122.769 ns** | **0.1108** |      **-** |      **-** |   **4,296 B** |
| **SerializeOrPersist** |        **ValueArray256** |   **2,321.31 ns** |     **46.306 ns** |     **24.219 ns** | **0.0231** |      **-** |      **-** |   **1,200 B** |
| **SerializeOrPersist** |            **ValueAt4K** |   **1,153.70 ns** |    **175.080 ns** |     **91.570 ns** | **0.1080** |      **-** |      **-** |   **4,288 B** |
| **SerializeOrPersist** |         **ValueBelow4K** |   **1,306.65 ns** |    **279.542 ns** |    **146.206 ns** | **0.1119** |      **-** |      **-** |   **4,288 B** |
| **SerializeOrPersist** |   **ValueDictionary256** |  **11,754.56 ns** |  **1,611.164 ns** |    **842.670 ns** | **0.3558** |      **-** |      **-** |  **14,769 B** |
| **SerializeOrPersist** |     **ValueEmptyString** |     **180.75 ns** |     **16.444 ns** |      **8.600 ns** | **0.0054** |      **-** |      **-** |     **232 B** |
| **SerializeOrPersist** |            **ValueEnum** |     **231.42 ns** |     **43.471 ns** |     **22.736 ns** | **0.0082** |      **-** |      **-** |     **312 B** |
| **SerializeOrPersist** |      **ValueEscaped16K** | **122,142.97 ns** |  **2,095.252 ns** |  **1,095.857 ns** | **1.5244** |      **-** |      **-** |  **72,331 B** |
| **SerializeOrPersist** |          **ValueNested** |   **2,451.46 ns** |     **50.825 ns** |     **26.582 ns** | **0.0242** |      **-** |      **-** |   **1,384 B** |
| **SerializeOrPersist** |            **ValueNull** |      **85.78 ns** |     **12.615 ns** |      **6.598 ns** | **0.0051** |      **-** |      **-** |     **200 B** |
| **SerializeOrPersist** |   **ValueNullableEnums** |     **654.54 ns** |     **14.938 ns** |      **7.813 ns** | **0.0065** |      **-** |      **-** |     **440 B** |
| **SerializeOrPersist** |          **ValueScalar** |     **172.74 ns** |      **8.241 ns** |      **4.310 ns** | **0.0054** |      **-** |      **-** |     **232 B** |
| **SerializeOrPersist** |      **ValueString128K** |  **79,689.94 ns** |  **9,589.611 ns** |  **5,015.552 ns** | **1.5625** | **1.5625** | **1.5625** | **131,305 B** |
| **SerializeOrPersist** |       **ValueString16K** |   **3,902.67 ns** |    **413.499 ns** |    **216.268 ns** | **0.4269** |      **-** |      **-** |  **16,616 B** |
| **SerializeOrPersist** |        **ValueString1K** |     **534.31 ns** |     **85.104 ns** |     **44.511 ns** | **0.0316** |      **-** |      **-** |   **1,256 B** |
| **SerializeOrPersist** |     **ValueStringSmall** |     **194.94 ns** |     **19.712 ns** |     **10.310 ns** | **0.0060** |      **-** |      **-** |     **248 B** |
| **SerializeOrPersist** |      **ValueUnicode16K** | **134,647.97 ns** | **13,548.741 ns** |  **7,086.253 ns** | **1.2500** | **1.2500** | **1.2500** |  **98,546 B** |
