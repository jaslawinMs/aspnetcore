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
| **VerifyToken** |                **Empty** |  **1.781 μs** | **0.1688 μs** | **0.0883 μs** |      **-** |     **-** |     **-** |     **192 B** |
| **VerifyToken** |              **Expired** |  **3.493 μs** | **0.0689 μs** | **0.0361 μs** |      **-** |     **-** |     **-** |     **624 B** |
| **VerifyToken** |   **InvalidHeadEnabled** |  **2.281 μs** | **0.0425 μs** | **0.0222 μs** |      **-** |     **-** |     **-** |     **328 B** |
| **VerifyToken** |     **InvalidHeadLarge** |  **2.160 μs** | **0.0382 μs** | **0.0200 μs** |      **-** |     **-** |     **-** |     **296 B** |
| **VerifyToken** |     **InvalidHeadSmall** |  **2.156 μs** | **0.0499 μs** | **0.0261 μs** |      **-** |     **-** |     **-** |     **296 B** |
| **VerifyToken** |   **InvalidLengthLarge** |  **4.702 μs** | **0.1075 μs** | **0.0562 μs** | **0.2332** |     **-** |     **-** |   **8,680 B** |
| **VerifyToken** |   **InvalidLengthSmall** |  **2.214 μs** | **0.0380 μs** | **0.0199 μs** |      **-** |     **-** |     **-** |     **504 B** |
| **VerifyToken** |   **InvalidMiddleSmall** |  **2.204 μs** | **0.0478 μs** | **0.0250 μs** |      **-** |     **-** |     **-** |     **416 B** |
| **VerifyToken** | **InvalidNonAsciiSmall** |  **2.142 μs** | **0.0520 μs** | **0.0272 μs** |      **-** |     **-** |     **-** |     **296 B** |
| **VerifyToken** | **Inval(...)abled [21]** |  **2.263 μs** | **0.0181 μs** | **0.0095 μs** |      **-** |     **-** |     **-** |     **360 B** |
| **VerifyToken** |  **InvalidPaddingSmall** |  **2.156 μs** | **0.0331 μs** | **0.0173 μs** |      **-** |     **-** |     **-** |     **328 B** |
| **VerifyToken** |   **InvalidTailEnabled** |  **2.316 μs** | **0.0421 μs** | **0.0220 μs** |      **-** |     **-** |     **-** |     **536 B** |
| **VerifyToken** |     **InvalidTailLarge** |  **4.767 μs** | **0.1612 μs** | **0.0843 μs** | **0.2339** |     **-** |     **-** |   **8,680 B** |
| **VerifyToken** |     **InvalidTailSmall** |  **2.229 μs** | **0.0394 μs** | **0.0206 μs** |      **-** |     **-** |     **-** |     **504 B** |
| **VerifyToken** | **InvalidUnusedPadBits** |  **2.233 μs** | **0.0451 μs** | **0.0236 μs** |      **-** |     **-** |     **-** |     **520 B** |
| **VerifyToken** | **NonEm(...)Store [25]** |  **3.751 μs** | **0.0596 μs** | **0.0312 μs** |      **-** |     **-** |     **-** |   **1,064 B** |
| **VerifyToken** | **NullO(...)ation [21]** |  **1.986 μs** | **0.0311 μs** | **0.0163 μs** |      **-** |     **-** |     **-** |     **304 B** |
| **VerifyToken** | **ProtectedInvalidUtf8** |  **7.523 μs** | **0.1852 μs** | **0.0969 μs** |      **-** |     **-** |     **-** |   **1,656 B** |
| **VerifyToken** | **Prote(...)refix [30]** |  **6.487 μs** | **0.1311 μs** | **0.0685 μs** |      **-** |     **-** |     **-** |     **928 B** |
| **VerifyToken** |    **ProtectedTrailing** |  **3.775 μs** | **0.0527 μs** | **0.0276 μs** |      **-** |     **-** |     **-** |   **1,064 B** |
| **VerifyToken** |   **ProtectedTruncated** |  **6.530 μs** | **0.0855 μs** | **0.0447 μs** |      **-** |     **-** |     **-** |     **888 B** |
| **VerifyToken** |     **UnprotectFailure** |  **6.512 μs** | **0.1581 μs** | **0.0827 μs** |      **-** |     **-** |     **-** |     **808 B** |
| **VerifyToken** |         **ValidEnabled** |  **3.845 μs** | **0.0605 μs** | **0.0316 μs** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |           **ValidLarge** | **24.752 μs** | **1.4654 μs** | **0.7664 μs** | **1.4479** |     **-** |     **-** |  **57,674 B** |
| **VerifyToken** | **ValidLargeWhitespace** | **40.313 μs** | **3.3429 μs** | **1.7484 μs** | **1.5924** |     **-** |     **-** |  **57,675 B** |
| **VerifyToken** |         **ValidNoStamp** |  **3.693 μs** | **0.0589 μs** | **0.0308 μs** |      **-** |     **-** |     **-** |     **880 B** |
| **VerifyToken** |          **ValidPadded** |  **3.928 μs** | **0.1365 μs** | **0.0714 μs** |      **-** |     **-** |     **-** |   **1,232 B** |
| **VerifyToken** |           **ValidSmall** |  **3.835 μs** | **0.0625 μs** | **0.0327 μs** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |      **ValidWhitespace** |  **4.295 μs** | **0.1166 μs** | **0.0610 μs** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |       **WhitespaceOnly** |  **1.739 μs** | **0.0364 μs** | **0.0190 μs** |      **-** |     **-** |     **-** |     **192 B** |
| **VerifyToken** |         **WrongPurpose** |  **3.665 μs** | **0.0553 μs** | **0.0289 μs** |      **-** |     **-** |     **-** |     **896 B** |
| **VerifyToken** |           **WrongStamp** |  **3.835 μs** | **0.0715 μs** | **0.0374 μs** |      **-** |     **-** |     **-** |   **1,208 B** |
| **VerifyToken** |            **WrongUser** |  **3.646 μs** | **0.0848 μs** | **0.0443 μs** |      **-** |     **-** |     **-** |     **848 B** |
