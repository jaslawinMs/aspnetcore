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
| **VerifyToken** |                **Empty** |  **1.877 μs** | **0.2573 μs** | **0.1346 μs** |      **-** |     **-** |     **-** |     **192 B** |
| **VerifyToken** |              **Expired** |  **3.454 μs** | **0.0823 μs** | **0.0431 μs** |      **-** |     **-** |     **-** |     **624 B** |
| **VerifyToken** |   **InvalidHeadEnabled** |  **2.230 μs** | **0.0306 μs** | **0.0160 μs** |      **-** |     **-** |     **-** |     **328 B** |
| **VerifyToken** |     **InvalidHeadLarge** |  **2.165 μs** | **0.0451 μs** | **0.0236 μs** |      **-** |     **-** |     **-** |     **296 B** |
| **VerifyToken** |     **InvalidHeadSmall** |  **2.153 μs** | **0.0439 μs** | **0.0230 μs** |      **-** |     **-** |     **-** |     **296 B** |
| **VerifyToken** |   **InvalidLengthLarge** |  **4.922 μs** | **0.5936 μs** | **0.3105 μs** | **0.2299** |     **-** |     **-** |   **8,680 B** |
| **VerifyToken** |   **InvalidLengthSmall** |  **2.201 μs** | **0.0436 μs** | **0.0228 μs** |      **-** |     **-** |     **-** |     **504 B** |
| **VerifyToken** |   **InvalidMiddleSmall** |  **2.186 μs** | **0.0184 μs** | **0.0096 μs** |      **-** |     **-** |     **-** |     **416 B** |
| **VerifyToken** | **InvalidNonAsciiSmall** |  **2.157 μs** | **0.0732 μs** | **0.0383 μs** |      **-** |     **-** |     **-** |     **296 B** |
| **VerifyToken** | **Inval(...)abled [21]** |  **2.258 μs** | **0.0223 μs** | **0.0116 μs** |      **-** |     **-** |     **-** |     **360 B** |
| **VerifyToken** |  **InvalidPaddingSmall** |  **2.156 μs** | **0.0321 μs** | **0.0168 μs** |      **-** |     **-** |     **-** |     **328 B** |
| **VerifyToken** |   **InvalidTailEnabled** |  **2.295 μs** | **0.0317 μs** | **0.0166 μs** |      **-** |     **-** |     **-** |     **536 B** |
| **VerifyToken** |     **InvalidTailLarge** |  **4.849 μs** | **0.3292 μs** | **0.1722 μs** | **0.2301** |     **-** |     **-** |   **8,680 B** |
| **VerifyToken** |     **InvalidTailSmall** |  **2.211 μs** | **0.0341 μs** | **0.0178 μs** |      **-** |     **-** |     **-** |     **504 B** |
| **VerifyToken** | **InvalidUnusedPadBits** |  **2.225 μs** | **0.0464 μs** | **0.0243 μs** |      **-** |     **-** |     **-** |     **520 B** |
| **VerifyToken** | **NonEm(...)Store [25]** |  **3.744 μs** | **0.0684 μs** | **0.0358 μs** |      **-** |     **-** |     **-** |   **1,064 B** |
| **VerifyToken** | **NullO(...)ation [21]** |  **1.985 μs** | **0.0260 μs** | **0.0136 μs** |      **-** |     **-** |     **-** |     **304 B** |
| **VerifyToken** | **ProtectedInvalidUtf8** |  **7.463 μs** | **0.1356 μs** | **0.0709 μs** |      **-** |     **-** |     **-** |   **1,656 B** |
| **VerifyToken** | **Prote(...)refix [30]** |  **6.468 μs** | **0.1231 μs** | **0.0644 μs** |      **-** |     **-** |     **-** |     **928 B** |
| **VerifyToken** |    **ProtectedTrailing** |  **3.742 μs** | **0.0757 μs** | **0.0396 μs** |      **-** |     **-** |     **-** |   **1,064 B** |
| **VerifyToken** |   **ProtectedTruncated** |  **6.525 μs** | **0.1694 μs** | **0.0886 μs** |      **-** |     **-** |     **-** |     **888 B** |
| **VerifyToken** |     **UnprotectFailure** |  **6.467 μs** | **0.1162 μs** | **0.0608 μs** |      **-** |     **-** |     **-** |     **808 B** |
| **VerifyToken** |         **ValidEnabled** |  **3.811 μs** | **0.0744 μs** | **0.0389 μs** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |           **ValidLarge** | **25.209 μs** | **2.6064 μs** | **1.3632 μs** | **1.5244** |     **-** |     **-** |  **57,674 B** |
| **VerifyToken** | **ValidLargeWhitespace** | **39.555 μs** | **0.6373 μs** | **0.3333 μs** | **1.5723** |     **-** |     **-** |  **57,675 B** |
| **VerifyToken** |         **ValidNoStamp** |  **3.653 μs** | **0.0552 μs** | **0.0289 μs** |      **-** |     **-** |     **-** |     **880 B** |
| **VerifyToken** |          **ValidPadded** |  **3.833 μs** | **0.0805 μs** | **0.0421 μs** |      **-** |     **-** |     **-** |   **1,232 B** |
| **VerifyToken** |           **ValidSmall** |  **3.805 μs** | **0.0752 μs** | **0.0393 μs** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |      **ValidWhitespace** |  **4.188 μs** | **0.0598 μs** | **0.0313 μs** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |       **WhitespaceOnly** |  **1.746 μs** | **0.0452 μs** | **0.0237 μs** |      **-** |     **-** |     **-** |     **192 B** |
| **VerifyToken** |         **WrongPurpose** |  **3.620 μs** | **0.0875 μs** | **0.0457 μs** |      **-** |     **-** |     **-** |     **896 B** |
| **VerifyToken** |           **WrongStamp** |  **3.790 μs** | **0.0450 μs** | **0.0236 μs** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |            **WrongUser** |  **3.582 μs** | **0.0619 μs** | **0.0324 μs** |      **-** |     **-** |     **-** |     **848 B** |
