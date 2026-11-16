``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|      Method |                 Case |         Mean |        Error |     StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------ |--------------------- |-------------:|-------------:|-----------:|-------:|------:|------:|----------:|
| **VerifyToken** |                **Empty** |  **2,256.06 ns** |    **55.705 ns** |  **29.135 ns** |      **-** |     **-** |     **-** |     **296 B** |
| **VerifyToken** |              **Expired** |  **3,520.31 ns** |    **53.064 ns** |  **27.754 ns** |      **-** |     **-** |     **-** |     **624 B** |
| **VerifyToken** |   **InvalidHeadEnabled** |     **85.31 ns** |     **1.583 ns** |   **0.828 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| **VerifyToken** |     **InvalidHeadLarge** |    **639.01 ns** |     **7.084 ns** |   **3.705 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** |     **InvalidHeadSmall** |     **38.44 ns** |     **1.156 ns** |   **0.605 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** |   **InvalidLengthLarge** |  **1,061.21 ns** |    **36.663 ns** |  **19.175 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** |   **InvalidLengthSmall** |     **45.30 ns** |     **0.568 ns** |   **0.297 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** |   **InvalidMiddleSmall** |     **41.61 ns** |     **1.006 ns** |   **0.526 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** | **InvalidNonAsciiSmall** |     **38.37 ns** |     **0.541 ns** |   **0.283 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** | **Inval(...)abled [21]** |     **85.63 ns** |     **1.508 ns** |   **0.789 ns** | **0.0009** |     **-** |     **-** |      **32 B** |
| **VerifyToken** |  **InvalidPaddingSmall** |     **39.04 ns** |     **0.617 ns** |   **0.323 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** |   **InvalidTailEnabled** |     **93.89 ns** |     **3.659 ns** |   **1.914 ns** |      **-** |     **-** |     **-** |      **32 B** |
| **VerifyToken** |     **InvalidTailLarge** |  **1,064.27 ns** |    **47.809 ns** |  **25.005 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** |     **InvalidTailSmall** |     **47.18 ns** |     **1.594 ns** |   **0.834 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** | **InvalidUnusedPadBits** |     **51.63 ns** |     **0.758 ns** |   **0.396 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** | **NonEm(...)Store [25]** |  **3,785.40 ns** |   **132.883 ns** |  **69.500 ns** |      **-** |     **-** |     **-** |   **1,064 B** |
| **VerifyToken** | **NullO(...)ation [21]** |  **1,916.90 ns** |    **36.548 ns** |  **19.115 ns** |      **-** |     **-** |     **-** |     **304 B** |
| **VerifyToken** | **ProtectedInvalidUtf8** |  **7,521.53 ns** |   **176.276 ns** |  **92.196 ns** |      **-** |     **-** |     **-** |   **1,656 B** |
| **VerifyToken** | **Prote(...)refix [30]** |  **6,409.29 ns** |    **80.350 ns** |  **42.025 ns** |      **-** |     **-** |     **-** |     **928 B** |
| **VerifyToken** |    **ProtectedTrailing** |  **3,793.66 ns** |    **61.884 ns** |  **32.367 ns** |      **-** |     **-** |     **-** |   **1,064 B** |
| **VerifyToken** |   **ProtectedTruncated** |  **6,496.94 ns** |   **114.991 ns** |  **60.143 ns** |      **-** |     **-** |     **-** |     **888 B** |
| **VerifyToken** |     **UnprotectFailure** |  **7,095.31 ns** |   **104.025 ns** |  **54.407 ns** |      **-** |     **-** |     **-** |     **808 B** |
| **VerifyToken** |         **ValidEnabled** |  **3,830.58 ns** |    **98.331 ns** |  **51.429 ns** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |           **ValidLarge** | **25,821.78 ns** | **1,279.163 ns** | **669.027 ns** | **1.5560** |     **-** |     **-** |  **57,674 B** |
| **VerifyToken** | **ValidLargeWhitespace** | **41,544.50 ns** |   **641.557 ns** | **335.547 ns** | **1.5723** |     **-** |     **-** |  **57,675 B** |
| **VerifyToken** |         **ValidNoStamp** |  **3,696.58 ns** |    **65.845 ns** |  **34.438 ns** |      **-** |     **-** |     **-** |     **880 B** |
| **VerifyToken** |          **ValidPadded** |  **3,893.24 ns** |    **76.234 ns** |  **39.872 ns** |      **-** |     **-** |     **-** |   **1,232 B** |
| **VerifyToken** |           **ValidSmall** |  **3,826.92 ns** |    **79.671 ns** |  **41.669 ns** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |      **ValidWhitespace** |  **4,220.72 ns** |    **53.500 ns** |  **27.982 ns** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |       **WhitespaceOnly** |  **2,285.97 ns** |    **32.283 ns** |  **16.885 ns** |      **-** |     **-** |     **-** |     **296 B** |
| **VerifyToken** |         **WrongPurpose** |  **3,696.69 ns** |   **153.513 ns** |  **80.290 ns** |      **-** |     **-** |     **-** |     **896 B** |
| **VerifyToken** |           **WrongStamp** |  **3,848.15 ns** |    **59.950 ns** |  **31.355 ns** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |            **WrongUser** |  **3,622.09 ns** |    **44.467 ns** |  **23.257 ns** |      **-** |     **-** |     **-** |     **848 B** |
