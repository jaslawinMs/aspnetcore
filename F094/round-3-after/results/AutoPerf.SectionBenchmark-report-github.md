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
|  **PageSync** |      **Completed1** |  **11.265 μs** |   **5.3439 μs** |   **2.7949 μs** | **0.2289** |     **-** |     **-** |      **9 KB** |
| PageAsync |      Completed1 |   4.900 μs |   0.7071 μs |   0.3698 μs | 0.2301 |     - |     - |      9 KB |
|  ViewSync |      Completed1 |   6.350 μs |   1.0366 μs |   0.5422 μs | 0.2080 |     - |     - |     10 KB |
| ViewAsync |      Completed1 |   6.128 μs |   1.1440 μs |   0.5983 μs | 0.2339 |     - |     - |     10 KB |
|  **PageSync** |    **Completed128** |  **36.615 μs** |   **2.2386 μs** |   **1.1708 μs** | **1.4706** |     **-** |     **-** |     **66 KB** |
| PageAsync |    Completed128 |  37.722 μs |   1.0633 μs |   0.5561 μs | 1.8601 |     - |     - |     75 KB |
|  ViewSync |    Completed128 |  39.986 μs |   1.8780 μs |   0.9822 μs | 2.1676 |     - |     - |     77 KB |
| ViewAsync |    Completed128 |  41.682 μs |   4.8980 μs |   2.5618 μs | 2.3438 |     - |     - |     86 KB |
|  **PageSync** |      **Completed2** |   **5.351 μs** |   **0.4112 μs** |   **0.2151 μs** | **0.2113** |     **-** |     **-** |      **9 KB** |
| PageAsync |      Completed2 |   5.798 μs |   0.4989 μs |   0.2610 μs | 0.2166 |     - |     - |      9 KB |
|  ViewSync |      Completed2 |   6.146 μs |   0.2949 μs |   0.1543 μs | 0.2498 |     - |     - |     10 KB |
| ViewAsync |      Completed2 |   6.421 μs |   0.6205 μs |   0.3245 μs | 0.2383 |     - |     - |     10 KB |
|  **PageSync** |     **Completed32** |  **12.344 μs** |   **0.6037 μs** |   **0.3157 μs** | **0.4854** |     **-** |     **-** |     **22 KB** |
| PageAsync |     Completed32 |  12.768 μs |   0.3426 μs |   0.1792 μs | 0.6457 |     - |     - |     24 KB |
|  ViewSync |     Completed32 |  13.439 μs |   0.6484 μs |   0.3391 μs | 0.5519 |     - |     - |     25 KB |
| ViewAsync |     Completed32 |  14.188 μs |   0.7248 μs |   0.3791 μs | 0.7070 |     - |     - |     28 KB |
|  **PageSync** |      **Completed8** |   **6.814 μs** |   **0.7745 μs** |   **0.4051 μs** | **0.2787** |     **-** |     **-** |     **12 KB** |
| PageAsync |      Completed8 |   7.227 μs |   0.5763 μs |   0.3014 μs | 0.3415 |     - |     - |     13 KB |
|  ViewSync |      Completed8 |   7.783 μs |   0.9362 μs |   0.4896 μs | 0.3756 |     - |     - |     14 KB |
| ViewAsync |      Completed8 |   7.913 μs |   0.7879 μs |   0.4121 μs | 0.3811 |     - |     - |     15 KB |
|  **PageSync** |  **Completed8Long** |  **16.164 μs** |   **1.7143 μs** |   **0.8966 μs** | **0.6345** |     **-** |     **-** |     **24 KB** |
| PageAsync |  Completed8Long |  16.402 μs |   0.6534 μs |   0.3418 μs | 0.6266 |     - |     - |     24 KB |
|  ViewSync |  Completed8Long |  17.372 μs |   1.5980 μs |   0.8358 μs | 0.6667 |     - |     - |     29 KB |
| ViewAsync |  Completed8Long |  17.414 μs |   0.6873 μs |   0.3595 μs | 0.7143 |     - |     - |     30 KB |
|  **PageSync** |   **GatedPending1** | **406.270 μs** | **382.1364 μs** | **199.8647 μs** |      **-** |     **-** |     **-** |      **9 KB** |
| PageAsync |   GatedPending1 |  30.517 μs |  25.4389 μs |  13.3050 μs | 0.2480 |     - |     - |      9 KB |
|  ViewSync |   GatedPending1 | 515.018 μs | 434.8286 μs | 227.4238 μs |      - |     - |     - |     10 KB |
| ViewAsync |   GatedPending1 |  46.452 μs |  16.3535 μs |   8.5532 μs |      - |     - |     - |     11 KB |
|  **PageSync** | **MissingOptional** |   **4.255 μs** |   **0.3012 μs** |   **0.1575 μs** | **0.1684** |     **-** |     **-** |      **8 KB** |
| PageAsync | MissingOptional |   4.448 μs |   0.2675 μs |   0.1399 μs | 0.2092 |     - |     - |      8 KB |
|  ViewSync | MissingOptional |   4.902 μs |   0.1160 μs |   0.0607 μs | 0.1950 |     - |     - |      9 KB |
| ViewAsync | MissingOptional |   5.017 μs |   0.2536 μs |   0.1326 μs | 0.1936 |     - |     - |      9 KB |
|  **PageSync** |      **NoSections** |   **4.396 μs** |   **0.1882 μs** |   **0.0985 μs** | **0.2092** |     **-** |     **-** |      **8 KB** |
| PageAsync |      NoSections |   4.358 μs |   0.1503 μs |   0.0786 μs | 0.1747 |     - |     - |      8 KB |
|  ViewSync |      NoSections |   4.965 μs |   0.3860 μs |   0.2019 μs | 0.1949 |     - |     - |      9 KB |
| ViewAsync |      NoSections |   4.968 μs |   0.1668 μs |   0.0872 μs | 0.1981 |     - |     - |      9 KB |
