``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|      Method |                 Case |      Mean |     Error |    StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|------------ |--------------------- |----------:|----------:|----------:|-------:|------:|------:|----------:|
| **VerifyToken** |                **Empty** |  **1.843 μs** | **0.3543 μs** | **0.1853 μs** |      **-** |     **-** |     **-** |     **192 B** |
| **VerifyToken** |              **Expired** |  **3.468 μs** | **0.0442 μs** | **0.0231 μs** |      **-** |     **-** |     **-** |     **624 B** |
| **VerifyToken** |   **InvalidHeadEnabled** |  **2.308 μs** | **0.0461 μs** | **0.0241 μs** |      **-** |     **-** |     **-** |     **328 B** |
| **VerifyToken** |     **InvalidHeadLarge** |  **2.183 μs** | **0.0473 μs** | **0.0247 μs** |      **-** |     **-** |     **-** |     **296 B** |
| **VerifyToken** |     **InvalidHeadSmall** |  **2.177 μs** | **0.0781 μs** | **0.0409 μs** |      **-** |     **-** |     **-** |     **296 B** |
| **VerifyToken** |   **InvalidLengthLarge** |  **4.799 μs** | **0.1287 μs** | **0.0673 μs** | **0.1932** |     **-** |     **-** |   **8,680 B** |
| **VerifyToken** |   **InvalidLengthSmall** |  **2.270 μs** | **0.0553 μs** | **0.0289 μs** |      **-** |     **-** |     **-** |     **504 B** |
| **VerifyToken** |   **InvalidMiddleSmall** |  **2.196 μs** | **0.0307 μs** | **0.0161 μs** |      **-** |     **-** |     **-** |     **416 B** |
| **VerifyToken** | **InvalidNonAsciiSmall** |  **2.165 μs** | **0.0305 μs** | **0.0160 μs** |      **-** |     **-** |     **-** |     **296 B** |
| **VerifyToken** | **Inval(...)abled [21]** |  **2.261 μs** | **0.0446 μs** | **0.0233 μs** |      **-** |     **-** |     **-** |     **360 B** |
| **VerifyToken** |  **InvalidPaddingSmall** |  **2.167 μs** | **0.0407 μs** | **0.0213 μs** |      **-** |     **-** |     **-** |     **328 B** |
| **VerifyToken** |   **InvalidTailEnabled** |  **2.318 μs** | **0.0433 μs** | **0.0226 μs** |      **-** |     **-** |     **-** |     **536 B** |
| **VerifyToken** |     **InvalidTailLarge** |  **4.886 μs** | **0.3556 μs** | **0.1860 μs** | **0.2343** |     **-** |     **-** |   **8,680 B** |
| **VerifyToken** |     **InvalidTailSmall** |  **2.235 μs** | **0.0407 μs** | **0.0213 μs** |      **-** |     **-** |     **-** |     **504 B** |
| **VerifyToken** | **InvalidUnusedPadBits** |  **2.345 μs** | **0.3986 μs** | **0.2085 μs** |      **-** |     **-** |     **-** |     **520 B** |
| **VerifyToken** | **NonEm(...)Store [25]** |  **3.803 μs** | **0.1103 μs** | **0.0577 μs** |      **-** |     **-** |     **-** |   **1,064 B** |
| **VerifyToken** | **NullO(...)ation [21]** |  **2.027 μs** | **0.0275 μs** | **0.0144 μs** |      **-** |     **-** |     **-** |     **304 B** |
| **VerifyToken** | **ProtectedInvalidUtf8** |  **7.715 μs** | **0.8739 μs** | **0.4571 μs** |      **-** |     **-** |     **-** |   **1,656 B** |
| **VerifyToken** | **Prote(...)refix [30]** |  **6.478 μs** | **0.0684 μs** | **0.0358 μs** |      **-** |     **-** |     **-** |     **928 B** |
| **VerifyToken** |    **ProtectedTrailing** |  **3.756 μs** | **0.0615 μs** | **0.0322 μs** |      **-** |     **-** |     **-** |   **1,064 B** |
| **VerifyToken** |   **ProtectedTruncated** |  **6.586 μs** | **0.1632 μs** | **0.0854 μs** |      **-** |     **-** |     **-** |     **888 B** |
| **VerifyToken** |     **UnprotectFailure** |  **6.576 μs** | **0.1583 μs** | **0.0828 μs** |      **-** |     **-** |     **-** |     **808 B** |
| **VerifyToken** |         **ValidEnabled** |  **3.839 μs** | **0.1283 μs** | **0.0671 μs** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |           **ValidLarge** | **24.673 μs** | **0.4733 μs** | **0.2476 μs** | **1.4368** |     **-** |     **-** |  **57,674 B** |
| **VerifyToken** | **ValidLargeWhitespace** | **41.007 μs** | **5.7620 μs** | **3.0136 μs** | **1.5723** |     **-** |     **-** |  **57,675 B** |
| **VerifyToken** |         **ValidNoStamp** |  **3.654 μs** | **0.0510 μs** | **0.0267 μs** |      **-** |     **-** |     **-** |     **880 B** |
| **VerifyToken** |          **ValidPadded** |  **3.859 μs** | **0.0908 μs** | **0.0475 μs** |      **-** |     **-** |     **-** |   **1,232 B** |
| **VerifyToken** |           **ValidSmall** |  **3.812 μs** | **0.1013 μs** | **0.0530 μs** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |      **ValidWhitespace** |  **4.257 μs** | **0.0628 μs** | **0.0328 μs** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |       **WhitespaceOnly** |  **1.741 μs** | **0.0219 μs** | **0.0115 μs** |      **-** |     **-** |     **-** |     **192 B** |
| **VerifyToken** |         **WrongPurpose** |  **3.637 μs** | **0.0686 μs** | **0.0359 μs** |      **-** |     **-** |     **-** |     **896 B** |
| **VerifyToken** |           **WrongStamp** |  **3.789 μs** | **0.0747 μs** | **0.0391 μs** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |            **WrongUser** |  **3.571 μs** | **0.0511 μs** | **0.0267 μs** |      **-** |     **-** |     **-** |     **848 B** |
