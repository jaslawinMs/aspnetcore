``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|    Method |         Profile |       Mean |       Error |      StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------- |---------------- |-----------:|------------:|------------:|-------:|------:|------:|----------:|
|  **PageSync** |      **Completed1** |  **11.424 μs** |   **3.9252 μs** |   **2.0530 μs** | **0.1294** |     **-** |     **-** |      **9 KB** |
| PageAsync |      Completed1 |   4.852 μs |   0.2650 μs |   0.1386 μs | 0.1919 |     - |     - |      9 KB |
|  ViewSync |      Completed1 |   5.400 μs |   0.1152 μs |   0.0603 μs | 0.2139 |     - |     - |     10 KB |
| ViewAsync |      Completed1 |   5.565 μs |   0.1798 μs |   0.0940 μs | 0.2228 |     - |     - |     10 KB |
|  **PageSync** |    **Completed128** |  **35.639 μs** |   **2.7528 μs** |   **1.4398 μs** | **1.7458** |     **-** |     **-** |     **66 KB** |
| PageAsync |    Completed128 |  36.358 μs |   0.5824 μs |   0.3046 μs | 1.8382 |     - |     - |     75 KB |
|  ViewSync |    Completed128 |  37.319 μs |   1.5436 μs |   0.8073 μs | 1.8713 |     - |     - |     77 KB |
| ViewAsync |    Completed128 |  39.647 μs |   4.5574 μs |   2.3836 μs | 2.2455 |     - |     - |     86 KB |
|  **PageSync** |      **Completed2** |   **5.123 μs** |   **0.5897 μs** |   **0.3084 μs** | **0.1965** |     **-** |     **-** |      **9 KB** |
| PageAsync |      Completed2 |   5.283 μs |   0.2027 μs |   0.1060 μs | 0.2457 |     - |     - |      9 KB |
|  ViewSync |      Completed2 |   5.892 μs |   0.7558 μs |   0.3953 μs | 0.2273 |     - |     - |     10 KB |
| ViewAsync |      Completed2 |   5.893 μs |   0.3653 μs |   0.1911 μs | 0.2365 |     - |     - |     10 KB |
|  **PageSync** |     **Completed32** |  **12.133 μs** |   **0.5041 μs** |   **0.2636 μs** | **0.4950** |     **-** |     **-** |     **22 KB** |
| PageAsync |     Completed32 |  12.802 μs |   0.2622 μs |   0.1372 μs | 0.6139 |     - |     - |     24 KB |
|  ViewSync |     Completed32 |  13.954 μs |   0.9764 μs |   0.5107 μs | 0.6735 |     - |     - |     25 KB |
| ViewAsync |     Completed32 |  13.921 μs |   0.3286 μs |   0.1719 μs | 0.6914 |     - |     - |     28 KB |
|  **PageSync** |      **Completed8** |   **6.884 μs** |   **0.4920 μs** |   **0.2573 μs** | **0.2665** |     **-** |     **-** |     **12 KB** |
| PageAsync |      Completed8 |   7.359 μs |   0.5403 μs |   0.2826 μs | 0.3408 |     - |     - |     13 KB |
|  ViewSync |      Completed8 |   7.911 μs |   0.5766 μs |   0.3016 μs | 0.3779 |     - |     - |     14 KB |
| ViewAsync |      Completed8 |   7.996 μs |   0.4511 μs |   0.2359 μs | 0.3770 |     - |     - |     15 KB |
|  **PageSync** |  **Completed8Long** |  **16.169 μs** |   **0.5714 μs** |   **0.2989 μs** | **0.6345** |     **-** |     **-** |     **24 KB** |
| PageAsync |  Completed8Long |  16.001 μs |   0.7060 μs |   0.3693 μs | 0.6427 |     - |     - |     24 KB |
|  ViewSync |  Completed8Long |  17.145 μs |   0.3462 μs |   0.1810 μs | 0.6596 |     - |     - |     29 KB |
| ViewAsync |  Completed8Long |  17.082 μs |   0.4633 μs |   0.2423 μs | 0.6849 |     - |     - |     30 KB |
|  **PageSync** |   **GatedPending1** | **554.440 μs** | **380.6576 μs** | **199.0913 μs** |      **-** |     **-** |     **-** |      **9 KB** |
| PageAsync |   GatedPending1 |  19.552 μs |   8.6268 μs |   4.5120 μs | 0.1570 |     - |     - |      9 KB |
|  ViewSync |   GatedPending1 | 327.822 μs | 369.3043 μs | 193.1533 μs |      - |     - |     - |     10 KB |
| ViewAsync |   GatedPending1 |  51.546 μs |  14.9517 μs |   7.8200 μs |      - |     - |     - |     11 KB |
|  **PageSync** | **MissingOptional** |   **4.289 μs** |   **0.1749 μs** |   **0.0915 μs** | **0.2067** |     **-** |     **-** |      **8 KB** |
| PageAsync | MissingOptional |   4.272 μs |   0.1461 μs |   0.0764 μs | 0.1697 |     - |     - |      8 KB |
|  ViewSync | MissingOptional |   4.996 μs |   0.1799 μs |   0.0941 μs | 0.2117 |     - |     - |      9 KB |
| ViewAsync | MissingOptional |   5.011 μs |   0.2467 μs |   0.1290 μs | 0.2026 |     - |     - |      9 KB |
|  **PageSync** |      **NoSections** |   **4.307 μs** |   **0.6291 μs** |   **0.3290 μs** | **0.1690** |     **-** |     **-** |      **8 KB** |
| PageAsync |      NoSections |   4.193 μs |   0.1293 μs |   0.0676 μs | 0.1704 |     - |     - |      8 KB |
|  ViewSync |      NoSections |   4.875 μs |   0.2903 μs |   0.1518 μs | 0.1946 |     - |     - |      9 KB |
| ViewAsync |      NoSections |   4.955 μs |   0.1322 μs |   0.0691 μs | 0.1981 |     - |     - |      9 KB |
