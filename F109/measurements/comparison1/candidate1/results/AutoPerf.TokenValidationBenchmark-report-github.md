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
| **VerifyToken** |                **Empty** |  **2,297.44 ns** |    **44.669 ns** |  **23.363 ns** |      **-** |     **-** |     **-** |     **296 B** |
| **VerifyToken** |              **Expired** |  **3,454.97 ns** |    **70.535 ns** |  **36.891 ns** |      **-** |     **-** |     **-** |     **624 B** |
| **VerifyToken** |   **InvalidHeadEnabled** |     **68.60 ns** |     **0.554 ns** |   **0.290 ns** | **0.0007** |     **-** |     **-** |      **32 B** |
| **VerifyToken** |     **InvalidHeadLarge** |     **28.55 ns** |     **0.534 ns** |   **0.279 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** |     **InvalidHeadSmall** |     **28.43 ns** |     **0.404 ns** |   **0.211 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** |   **InvalidLengthLarge** |    **419.32 ns** |    **12.857 ns** |   **6.724 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** |   **InvalidLengthSmall** |     **34.61 ns** |     **0.696 ns** |   **0.364 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** |   **InvalidMiddleSmall** |     **30.50 ns** |     **0.667 ns** |   **0.349 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** | **InvalidNonAsciiSmall** |     **28.97 ns** |     **0.318 ns** |   **0.166 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** | **Inval(...)abled [21]** |     **72.99 ns** |     **3.588 ns** |   **1.877 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| **VerifyToken** |  **InvalidPaddingSmall** |     **29.20 ns** |     **0.451 ns** |   **0.236 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** |   **InvalidTailEnabled** |     **77.73 ns** |     **6.641 ns** |   **3.473 ns** | **0.0008** |     **-** |     **-** |      **32 B** |
| **VerifyToken** |     **InvalidTailLarge** |    **419.00 ns** |     **7.140 ns** |   **3.734 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** |     **InvalidTailSmall** |     **34.91 ns** |     **0.686 ns** |   **0.359 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** | **InvalidUnusedPadBits** |     **38.78 ns** |     **1.881 ns** |   **0.984 ns** |      **-** |     **-** |     **-** |         **-** |
| **VerifyToken** | **NonEm(...)Store [25]** |  **3,769.65 ns** |    **74.013 ns** |  **38.710 ns** |      **-** |     **-** |     **-** |   **1,064 B** |
| **VerifyToken** | **NullO(...)ation [21]** |  **1,930.66 ns** |    **39.498 ns** |  **20.658 ns** |      **-** |     **-** |     **-** |     **304 B** |
| **VerifyToken** | **ProtectedInvalidUtf8** |  **7,499.46 ns** |   **114.325 ns** |  **59.794 ns** |      **-** |     **-** |     **-** |   **1,656 B** |
| **VerifyToken** | **Prote(...)refix [30]** |  **6,424.49 ns** |    **81.100 ns** |  **42.417 ns** |      **-** |     **-** |     **-** |     **928 B** |
| **VerifyToken** |    **ProtectedTrailing** |  **3,805.00 ns** |   **244.347 ns** | **127.798 ns** |      **-** |     **-** |     **-** |   **1,064 B** |
| **VerifyToken** |   **ProtectedTruncated** |  **6,545.20 ns** |   **122.140 ns** |  **63.882 ns** |      **-** |     **-** |     **-** |     **888 B** |
| **VerifyToken** |     **UnprotectFailure** |  **7,152.39 ns** |   **139.049 ns** |  **72.726 ns** |      **-** |     **-** |     **-** |     **808 B** |
| **VerifyToken** |         **ValidEnabled** |  **3,825.51 ns** |    **50.174 ns** |  **26.242 ns** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |           **ValidLarge** | **24,594.41 ns** | **1,093.798 ns** | **572.078 ns** | **1.4764** |     **-** |     **-** |  **57,674 B** |
| **VerifyToken** | **ValidLargeWhitespace** | **48,718.34 ns** | **1,158.530 ns** | **605.934 ns** | **1.4535** |     **-** |     **-** |  **57,676 B** |
| **VerifyToken** |         **ValidNoStamp** |  **3,680.69 ns** |    **41.818 ns** |  **21.872 ns** |      **-** |     **-** |     **-** |     **880 B** |
| **VerifyToken** |          **ValidPadded** |  **3,874.40 ns** |   **122.342 ns** |  **63.987 ns** |      **-** |     **-** |     **-** |   **1,232 B** |
| **VerifyToken** |           **ValidSmall** |  **3,816.60 ns** |    **86.783 ns** |  **45.389 ns** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |      **ValidWhitespace** |  **4,442.74 ns** |    **99.241 ns** |  **51.905 ns** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |       **WhitespaceOnly** |  **2,309.65 ns** |    **31.573 ns** |  **16.513 ns** |      **-** |     **-** |     **-** |     **296 B** |
| **VerifyToken** |         **WrongPurpose** |  **3,653.20 ns** |   **135.632 ns** |  **70.938 ns** |      **-** |     **-** |     **-** |     **896 B** |
| **VerifyToken** |           **WrongStamp** |  **3,823.73 ns** |    **54.918 ns** |  **28.723 ns** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |            **WrongUser** |  **3,586.08 ns** |    **77.396 ns** |  **40.479 ns** |      **-** |     **-** |     **-** |     **848 B** |
