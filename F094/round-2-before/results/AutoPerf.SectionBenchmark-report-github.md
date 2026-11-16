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
|  **PageSync** |      **Completed1** |  **12.652 μs** |   **3.0791 μs** |   **1.6104 μs** | **0.1347** |     **-** |     **-** |      **9 KB** |
| PageAsync |      Completed1 |   4.893 μs |   0.5354 μs |   0.2800 μs | 0.2339 |     - |     - |      9 KB |
|  ViewSync |      Completed1 |   5.465 μs |   0.2124 μs |   0.1111 μs | 0.2230 |     - |     - |     10 KB |
| ViewAsync |      Completed1 |   5.740 μs |   0.3014 μs |   0.1577 μs | 0.2165 |     - |     - |     10 KB |
|  **PageSync** |    **Completed128** |  **36.023 μs** |   **2.1875 μs** |   **1.1441 μs** | **1.9055** |     **-** |     **-** |     **75 KB** |
| PageAsync |    Completed128 |  35.405 μs |   3.1617 μs |   1.6536 μs | 1.7265 |     - |     - |     75 KB |
|  ViewSync |    Completed128 |  39.614 μs |   2.4456 μs |   1.2791 μs | 2.2727 |     - |     - |     86 KB |
| ViewAsync |    Completed128 |  39.838 μs |   3.3410 μs |   1.7474 μs | 2.3292 |     - |     - |     86 KB |
|  **PageSync** |      **Completed2** |   **5.166 μs** |   **0.3992 μs** |   **0.2088 μs** | **0.2110** |     **-** |     **-** |      **9 KB** |
| PageAsync |      Completed2 |   5.126 μs |   0.1503 μs |   0.0786 μs | 0.2008 |     - |     - |      9 KB |
|  ViewSync |      Completed2 |   6.025 μs |   0.2599 μs |   0.1359 μs | 0.2818 |     - |     - |     10 KB |
| ViewAsync |      Completed2 |   6.048 μs |   0.4849 μs |   0.2536 μs | 0.2271 |     - |     - |     10 KB |
|  **PageSync** |     **Completed32** |  **12.225 μs** |   **0.5231 μs** |   **0.2736 μs** | **0.5919** |     **-** |     **-** |     **24 KB** |
| PageAsync |     Completed32 |  12.584 μs |   0.4284 μs |   0.2241 μs | 0.5941 |     - |     - |     24 KB |
|  ViewSync |     Completed32 |  13.402 μs |   1.1137 μs |   0.5825 μs | 0.6565 |     - |     - |     27 KB |
| ViewAsync |     Completed32 |  13.397 μs |   0.5452 μs |   0.2851 μs | 0.6649 |     - |     - |     28 KB |
|  **PageSync** |      **Completed8** |   **6.932 μs** |   **0.6081 μs** |   **0.3180 μs** | **0.3342** |     **-** |     **-** |     **13 KB** |
| PageAsync |      Completed8 |   7.051 μs |   0.2365 μs |   0.1237 μs | 0.3296 |     - |     - |     13 KB |
|  ViewSync |      Completed8 |   7.648 μs |   0.3891 μs |   0.2035 μs | 0.3797 |     - |     - |     15 KB |
| ViewAsync |      Completed8 |   7.754 μs |   0.4204 μs |   0.2199 μs | 0.3797 |     - |     - |     15 KB |
|  **PageSync** |  **Completed8Long** |  **16.102 μs** |   **0.5328 μs** |   **0.2787 μs** | **0.6234** |     **-** |     **-** |     **24 KB** |
| PageAsync |  Completed8Long |  16.138 μs |   0.4438 μs |   0.2321 μs | 0.6281 |     - |     - |     24 KB |
|  ViewSync |  Completed8Long |  17.236 μs |   0.9958 μs |   0.5208 μs | 0.6757 |     - |     - |     30 KB |
| ViewAsync |  Completed8Long |  17.494 μs |   0.4695 μs |   0.2455 μs | 0.6849 |     - |     - |     30 KB |
|  **PageSync** |   **GatedPending1** | **639.510 μs** | **566.3690 μs** | **296.2219 μs** |      **-** |     **-** |     **-** |      **9 KB** |
| PageAsync |   GatedPending1 |  22.407 μs |   4.9223 μs |   2.5745 μs | 0.1694 |     - |     - |      9 KB |
|  ViewSync |   GatedPending1 | 697.968 μs | 217.1555 μs | 113.5765 μs |      - |     - |     - |     10 KB |
| ViewAsync |   GatedPending1 |  44.324 μs |  12.2419 μs |   6.4028 μs |      - |     - |     - |     11 KB |
|  **PageSync** | **MissingOptional** |   **4.224 μs** |   **0.1161 μs** |   **0.0607 μs** | **0.1700** |     **-** |     **-** |      **8 KB** |
| PageAsync | MissingOptional |   4.343 μs |   0.2634 μs |   0.1377 μs | 0.1735 |     - |     - |      8 KB |
|  ViewSync | MissingOptional |   4.910 μs |   0.1954 μs |   0.1022 μs | 0.1950 |     - |     - |      9 KB |
| ViewAsync | MissingOptional |   5.017 μs |   0.2620 μs |   0.1370 μs | 0.1967 |     - |     - |      9 KB |
|  **PageSync** |      **NoSections** |   **4.375 μs** |   **0.2497 μs** |   **0.1306 μs** | **0.2036** |     **-** |     **-** |      **8 KB** |
| PageAsync |      NoSections |   4.508 μs |   0.4663 μs |   0.2439 μs | 0.2088 |     - |     - |      8 KB |
|  ViewSync |      NoSections |   4.893 μs |   0.1533 μs |   0.0802 μs | 0.1953 |     - |     - |      9 KB |
| ViewAsync |      NoSections |   5.027 μs |   0.3059 μs |   0.1600 μs | 0.1972 |     - |     - |      9 KB |
