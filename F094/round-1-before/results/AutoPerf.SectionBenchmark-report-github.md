``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|    Method |         Profile |       Mean |       Error |      StdDev |     Median |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------- |---------------- |-----------:|------------:|------------:|-----------:|-------:|------:|------:|----------:|
|  **PageSync** |      **Completed1** |   **4.923 μs** |   **0.1659 μs** |   **0.0868 μs** |   **4.926 μs** | **0.1932** |     **-** |     **-** |      **9 KB** |
| PageAsync |      Completed1 |   5.019 μs |   0.2413 μs |   0.1262 μs |   4.982 μs | 0.1964 |     - |     - |      9 KB |
|  ViewSync |      Completed1 |   5.763 μs |   0.1451 μs |   0.0759 μs |   5.751 μs | 0.2302 |     - |     - |     10 KB |
| ViewAsync |      Completed1 |   5.880 μs |   0.3911 μs |   0.2046 μs |   5.842 μs | 0.2289 |     - |     - |     10 KB |
|  **PageSync** |    **Completed128** |  **36.300 μs** |   **1.2352 μs** |   **0.6460 μs** |  **36.390 μs** | **1.7960** |     **-** |     **-** |     **75 KB** |
| PageAsync |    Completed128 |  36.947 μs |   2.8003 μs |   1.4646 μs |  37.004 μs | 1.7756 |     - |     - |     75 KB |
|  ViewSync |    Completed128 |  38.588 μs |   2.9523 μs |   1.5441 μs |  38.071 μs | 2.0161 |     - |     - |     86 KB |
| ViewAsync |    Completed128 |  40.099 μs |   2.1676 μs |   1.1337 μs |  39.555 μs | 2.3734 |     - |     - |     86 KB |
|  **PageSync** |      **Completed2** |   **5.226 μs** |   **0.4008 μs** |   **0.2097 μs** |   **5.158 μs** | **0.2023** |     **-** |     **-** |      **9 KB** |
| PageAsync |      Completed2 |   5.235 μs |   0.2155 μs |   0.1127 μs |   5.190 μs | 0.2092 |     - |     - |      9 KB |
|  ViewSync |      Completed2 |   5.943 μs |   0.3001 μs |   0.1569 μs |   5.931 μs | 0.2390 |     - |     - |     10 KB |
| ViewAsync |      Completed2 |   5.937 μs |   0.2535 μs |   0.1326 μs |   5.925 μs | 0.2308 |     - |     - |     10 KB |
|  **PageSync** |     **Completed32** |  **12.477 μs** |   **0.5214 μs** |   **0.2727 μs** |  **12.445 μs** | **0.6033** |     **-** |     **-** |     **24 KB** |
| PageAsync |     Completed32 |  12.798 μs |   0.6734 μs |   0.3522 μs |  12.710 μs | 0.6339 |     - |     - |     24 KB |
|  ViewSync |     Completed32 |  14.125 μs |   0.4540 μs |   0.2374 μs |  14.107 μs | 0.6808 |     - |     - |     27 KB |
| ViewAsync |     Completed32 |  14.200 μs |   0.9770 μs |   0.5110 μs |  14.151 μs | 0.7118 |     - |     - |     28 KB |
|  **PageSync** |      **Completed8** |   **6.983 μs** |   **0.3515 μs** |   **0.1838 μs** |   **7.008 μs** | **0.3438** |     **-** |     **-** |     **13 KB** |
| PageAsync |      Completed8 |   6.843 μs |   0.2616 μs |   0.1368 μs |   6.808 μs | 0.2796 |     - |     - |     13 KB |
|  ViewSync |      Completed8 |   7.801 μs |   0.3750 μs |   0.1961 μs |   7.787 μs | 0.3193 |     - |     - |     15 KB |
| ViewAsync |      Completed8 |   8.044 μs |   0.4424 μs |   0.2314 μs |   7.972 μs | 0.3961 |     - |     - |     15 KB |
|  **PageSync** |  **Completed8Long** |  **16.417 μs** |   **0.3602 μs** |   **0.1884 μs** |  **16.450 μs** | **0.6410** |     **-** |     **-** |     **24 KB** |
| PageAsync |  Completed8Long |  16.698 μs |   1.2826 μs |   0.6708 μs |  16.625 μs | 0.6378 |     - |     - |     24 KB |
|  ViewSync |  Completed8Long |  17.387 μs |   0.7411 μs |   0.3876 μs |  17.304 μs | 0.7184 |     - |     - |     30 KB |
| ViewAsync |  Completed8Long |  17.491 μs |   0.6145 μs |   0.3214 μs |  17.531 μs | 0.6793 |     - |     - |     30 KB |
|  **PageSync** |   **GatedPending1** | **527.957 μs** | **175.1016 μs** |  **91.5815 μs** | **515.672 μs** |      **-** |     **-** |     **-** |      **9 KB** |
| PageAsync |   GatedPending1 |  32.915 μs |  30.4165 μs |  15.9084 μs |  25.191 μs | 0.2500 |     - |     - |      9 KB |
|  ViewSync |   GatedPending1 | 509.329 μs | 236.8102 μs | 123.8563 μs | 492.455 μs |      - |     - |     - |     10 KB |
| ViewAsync |   GatedPending1 |  56.868 μs |  17.0974 μs |   8.9423 μs |  54.179 μs |      - |     - |     - |     11 KB |
|  **PageSync** | **MissingOptional** |   **4.438 μs** |   **0.4379 μs** |   **0.2290 μs** |   **4.329 μs** | **0.1684** |     **-** |     **-** |      **8 KB** |
| PageAsync | MissingOptional |   4.467 μs |   0.1312 μs |   0.0686 μs |   4.474 μs | 0.1837 |     - |     - |      8 KB |
|  ViewSync | MissingOptional |   5.172 μs |   0.2288 μs |   0.1197 μs |   5.159 μs | 0.2041 |     - |     - |      9 KB |
| ViewAsync | MissingOptional |   5.215 μs |   0.3640 μs |   0.1904 μs |   5.245 μs | 0.1995 |     - |     - |      9 KB |
|  **PageSync** |      **NoSections** |   **4.510 μs** |   **0.3466 μs** |   **0.1813 μs** |   **4.434 μs** | **0.1786** |     **-** |     **-** |      **8 KB** |
| PageAsync |      NoSections |   4.620 μs |   0.2224 μs |   0.1163 μs |   4.587 μs | 0.1837 |     - |     - |      8 KB |
|  ViewSync |      NoSections |   5.130 μs |   0.2159 μs |   0.1129 μs |   5.101 μs | 0.2061 |     - |     - |      9 KB |
| ViewAsync |      NoSections |   5.099 μs |   0.2142 μs |   0.1120 μs |   5.066 μs | 0.2031 |     - |     - |      9 KB |
