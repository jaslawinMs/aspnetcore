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
|  **PageSync** |      **Completed1** |  **10.789 μs** |   **5.0416 μs** |   **2.6369 μs** | **0.1359** |     **-** |     **-** |      **9 KB** |
| PageAsync |      Completed1 |   4.871 μs |   0.2361 μs |   0.1235 μs | 0.1933 |     - |     - |      9 KB |
|  ViewSync |      Completed1 |   5.509 μs |   0.1977 μs |   0.1034 μs | 0.2176 |     - |     - |     10 KB |
| ViewAsync |      Completed1 |   5.671 μs |   0.2679 μs |   0.1401 μs | 0.2326 |     - |     - |     10 KB |
|  **PageSync** |    **Completed128** |  **35.932 μs** |   **2.3631 μs** |   **1.2359 μs** | **1.7756** |     **-** |     **-** |     **66 KB** |
| PageAsync |    Completed128 |  35.923 μs |   1.5875 μs |   0.8303 μs | 1.7960 |     - |     - |     75 KB |
|  ViewSync |    Completed128 |  38.551 μs |   2.6915 μs |   1.4077 μs | 1.8169 |     - |     - |     77 KB |
| ViewAsync |    Completed128 |  39.797 μs |   3.2968 μs |   1.7243 μs | 2.3006 |     - |     - |     86 KB |
|  **PageSync** |      **Completed2** |   **5.162 μs** |   **0.3892 μs** |   **0.2036 μs** | **0.2041** |     **-** |     **-** |      **9 KB** |
| PageAsync |      Completed2 |   5.110 μs |   0.1662 μs |   0.0869 μs | 0.2058 |     - |     - |      9 KB |
|  ViewSync |      Completed2 |   5.883 μs |   0.3263 μs |   0.1706 μs | 0.2240 |     - |     - |     10 KB |
| ViewAsync |      Completed2 |   5.804 μs |   0.3271 μs |   0.1711 μs | 0.2277 |     - |     - |     10 KB |
|  **PageSync** |     **Completed32** |  **12.140 μs** |   **0.6074 μs** |   **0.3177 μs** | **0.4690** |     **-** |     **-** |     **22 KB** |
| PageAsync |     Completed32 |  12.464 μs |   0.6707 μs |   0.3508 μs | 0.6225 |     - |     - |     24 KB |
|  ViewSync |     Completed32 |  13.519 μs |   0.6513 μs |   0.3406 μs | 0.6443 |     - |     - |     25 KB |
| ViewAsync |     Completed32 |  13.968 μs |   0.6719 μs |   0.3514 μs | 0.7135 |     - |     - |     28 KB |
|  **PageSync** |      **Completed8** |   **6.816 μs** |   **0.3296 μs** |   **0.1724 μs** | **0.3248** |     **-** |     **-** |     **12 KB** |
| PageAsync |      Completed8 |   7.034 μs |   0.2425 μs |   0.1268 μs | 0.3397 |     - |     - |     13 KB |
|  ViewSync |      Completed8 |   7.678 μs |   0.3822 μs |   0.1999 μs | 0.3711 |     - |     - |     14 KB |
| ViewAsync |      Completed8 |   7.823 μs |   0.5167 μs |   0.2702 μs | 0.3806 |     - |     - |     15 KB |
|  **PageSync** |  **Completed8Long** |  **16.371 μs** |   **1.4328 μs** |   **0.7494 μs** | **0.6219** |     **-** |     **-** |     **24 KB** |
| PageAsync |  Completed8Long |  16.184 μs |   0.5267 μs |   0.2755 μs | 0.6361 |     - |     - |     24 KB |
|  ViewSync |  Completed8Long |  17.035 μs |   0.5783 μs |   0.3025 μs | 0.6702 |     - |     - |     29 KB |
| ViewAsync |  Completed8Long |  16.974 μs |   0.8034 μs |   0.4202 μs | 0.7022 |     - |     - |     30 KB |
|  **PageSync** |   **GatedPending1** | **623.686 μs** | **295.7632 μs** | **154.6898 μs** |      **-** |     **-** |     **-** |      **9 KB** |
| PageAsync |   GatedPending1 |  30.304 μs |  16.0749 μs |   8.4075 μs | 0.1603 |     - |     - |      9 KB |
|  ViewSync |   GatedPending1 | 524.954 μs | 445.3618 μs | 232.9328 μs |      - |     - |     - |     10 KB |
| ViewAsync |   GatedPending1 |  54.754 μs |  11.2000 μs |   5.8578 μs |      - |     - |     - |     11 KB |
|  **PageSync** | **MissingOptional** |   **4.433 μs** |   **0.3906 μs** |   **0.2043 μs** | **0.1685** |     **-** |     **-** |      **8 KB** |
| PageAsync | MissingOptional |   4.286 μs |   0.1112 μs |   0.0582 μs | 0.1696 |     - |     - |      8 KB |
|  ViewSync | MissingOptional |   4.993 μs |   0.2368 μs |   0.1239 μs | 0.1969 |     - |     - |      9 KB |
| ViewAsync | MissingOptional |   4.996 μs |   0.2151 μs |   0.1125 μs | 0.1964 |     - |     - |      9 KB |
|  **PageSync** |      **NoSections** |   **4.317 μs** |   **0.1059 μs** |   **0.0554 μs** | **0.2057** |     **-** |     **-** |      **8 KB** |
| PageAsync |      NoSections |   4.238 μs |   0.1440 μs |   0.0753 μs | 0.1730 |     - |     - |      8 KB |
|  ViewSync |      NoSections |   4.922 μs |   0.1859 μs |   0.0972 μs | 0.1933 |     - |     - |      9 KB |
| ViewAsync |      NoSections |   5.018 μs |   0.3038 μs |   0.1589 μs | 0.1978 |     - |     - |      9 KB |
