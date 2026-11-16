``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|      Method |                 Case |         Mean |        Error |       StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------ |--------------------- |-------------:|-------------:|-------------:|-------:|------:|------:|----------:|
| **VerifyToken** |                **Empty** |  **2,469.99 ns** |   **365.173 ns** |   **190.993 ns** |      **-** |     **-** |     **-** |     **296 B** |
| **VerifyToken** |              **Expired** |  **3,499.66 ns** |    **82.073 ns** |    **42.926 ns** |      **-** |     **-** |     **-** |     **624 B** |
| **VerifyToken** |   **InvalidHeadEnabled** |     **83.52 ns** |     **2.188 ns** |     **1.144 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| **VerifyToken** |     **InvalidHeadLarge** |    **640.69 ns** |    **15.463 ns** |     **8.088 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** |     **InvalidHeadSmall** |     **38.61 ns** |     **0.696 ns** |     **0.364 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** |   **InvalidLengthLarge** |  **1,075.71 ns** |    **36.902 ns** |    **19.300 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** |   **InvalidLengthSmall** |     **45.53 ns** |     **0.795 ns** |     **0.416 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** |   **InvalidMiddleSmall** |     **43.08 ns** |     **3.661 ns** |     **1.915 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** | **InvalidNonAsciiSmall** |     **38.63 ns** |     **1.096 ns** |     **0.573 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** | **Inval(...)abled [21]** |     **84.58 ns** |     **1.474 ns** |     **0.771 ns** |      **-** |     **-** |     **-** |      **32 B** |
| **VerifyToken** |  **InvalidPaddingSmall** |     **39.32 ns** |     **1.374 ns** |     **0.718 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** |   **InvalidTailEnabled** |     **92.47 ns** |     **1.546 ns** |     **0.809 ns** |      **-** |     **-** |     **-** |      **32 B** |
| **VerifyToken** |     **InvalidTailLarge** |  **1,067.18 ns** |    **28.413 ns** |    **14.861 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** |     **InvalidTailSmall** |     **54.17 ns** |     **0.757 ns** |     **0.396 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** | **InvalidUnusedPadBits** |     **51.77 ns** |     **0.927 ns** |     **0.485 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** | **NonEm(...)Store [25]** |  **3,739.10 ns** |    **45.803 ns** |    **23.956 ns** |      **-** |     **-** |     **-** |   **1,064 B** |
| **VerifyToken** | **NullO(...)ation [21]** |  **1,929.19 ns** |    **34.312 ns** |    **17.946 ns** |      **-** |     **-** |     **-** |     **304 B** |
| **VerifyToken** | **ProtectedInvalidUtf8** |  **7,469.25 ns** |   **200.896 ns** |   **105.072 ns** |      **-** |     **-** |     **-** |   **1,656 B** |
| **VerifyToken** | **Prote(...)refix [30]** |  **6,464.27 ns** |   **164.419 ns** |    **85.994 ns** |      **-** |     **-** |     **-** |     **928 B** |
| **VerifyToken** |    **ProtectedTrailing** |  **3,813.07 ns** |    **96.698 ns** |    **50.575 ns** |      **-** |     **-** |     **-** |   **1,064 B** |
| **VerifyToken** |   **ProtectedTruncated** |  **6,514.76 ns** |    **93.789 ns** |    **49.054 ns** |      **-** |     **-** |     **-** |     **888 B** |
| **VerifyToken** |     **UnprotectFailure** |  **7,095.28 ns** |   **105.576 ns** |    **55.218 ns** |      **-** |     **-** |     **-** |     **808 B** |
| **VerifyToken** |         **ValidEnabled** |  **3,855.83 ns** |   **158.615 ns** |    **82.959 ns** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |           **ValidLarge** | **26,145.20 ns** | **1,605.431 ns** |   **839.672 ns** | **1.5182** |     **-** |     **-** |  **57,674 B** |
| **VerifyToken** | **ValidLargeWhitespace** | **40,184.21 ns** | **3,722.803 ns** | **1,947.098 ns** | **1.5625** |     **-** |     **-** |  **57,675 B** |
| **VerifyToken** |         **ValidNoStamp** |  **3,677.65 ns** |   **101.650 ns** |    **53.165 ns** |      **-** |     **-** |     **-** |     **880 B** |
| **VerifyToken** |          **ValidPadded** |  **3,891.28 ns** |    **69.396 ns** |    **36.295 ns** |      **-** |     **-** |     **-** |   **1,232 B** |
| **VerifyToken** |           **ValidSmall** |  **3,852.73 ns** |   **128.834 ns** |    **67.383 ns** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |      **ValidWhitespace** |  **4,263.01 ns** |    **82.495 ns** |    **43.147 ns** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |       **WhitespaceOnly** |  **2,299.33 ns** |    **19.078 ns** |     **9.978 ns** |      **-** |     **-** |     **-** |     **296 B** |
| **VerifyToken** |         **WrongPurpose** |  **3,660.51 ns** |    **55.897 ns** |    **29.235 ns** |      **-** |     **-** |     **-** |     **896 B** |
| **VerifyToken** |           **WrongStamp** |  **3,854.94 ns** |   **173.056 ns** |    **90.511 ns** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |            **WrongUser** |  **3,605.87 ns** |    **61.535 ns** |    **32.184 ns** |      **-** |     **-** |     **-** |     **848 B** |
