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
|  **PageSync** |      **Completed1** |  **11.698 μs** |   **4.0497 μs** |   **2.1181 μs** | **0.1353** |     **-** |     **-** |      **9 KB** |
| PageAsync |      Completed1 |   4.930 μs |   0.3510 μs |   0.1836 μs | 0.1952 |     - |     - |      9 KB |
|  ViewSync |      Completed1 |   5.885 μs |   0.5324 μs |   0.2785 μs | 0.2212 |     - |     - |     10 KB |
| ViewAsync |      Completed1 |   5.638 μs |   0.6693 μs |   0.3501 μs | 0.2131 |     - |     - |     10 KB |
|  **PageSync** |    **Completed128** |  **34.192 μs** |   **2.0417 μs** |   **1.0678 μs** | **1.7265** |     **-** |     **-** |     **75 KB** |
| PageAsync |    Completed128 |  34.378 μs |   1.9223 μs |   1.0054 μs | 1.7077 |     - |     - |     75 KB |
|  ViewSync |    Completed128 |  37.023 μs |   1.0210 μs |   0.5340 μs | 2.3292 |     - |     - |     86 KB |
| ViewAsync |    Completed128 |  38.586 μs |   2.4799 μs |   1.2970 μs | 2.2321 |     - |     - |     86 KB |
|  **PageSync** |      **Completed2** |   **5.002 μs** |   **0.1618 μs** |   **0.0846 μs** | **0.2492** |     **-** |     **-** |      **9 KB** |
| PageAsync |      Completed2 |   5.078 μs |   0.5554 μs |   0.2905 μs | 0.2461 |     - |     - |      9 KB |
|  ViewSync |      Completed2 |   5.546 μs |   0.1938 μs |   0.1014 μs | 0.2732 |     - |     - |     10 KB |
| ViewAsync |      Completed2 |   5.687 μs |   0.2150 μs |   0.1125 μs | 0.2831 |     - |     - |     10 KB |
|  **PageSync** |     **Completed32** |  **11.558 μs** |   **0.3674 μs** |   **0.1922 μs** | **0.5651** |     **-** |     **-** |     **24 KB** |
| PageAsync |     Completed32 |  11.831 μs |   0.3062 μs |   0.1601 μs | 0.5766 |     - |     - |     24 KB |
|  ViewSync |     Completed32 |  12.962 μs |   1.1828 μs |   0.6186 μs | 0.6275 |     - |     - |     27 KB |
| ViewAsync |     Completed32 |  12.958 μs |   0.8994 μs |   0.4704 μs | 0.6443 |     - |     - |     28 KB |
|  **PageSync** |      **Completed8** |   **6.448 μs** |   **0.1185 μs** |   **0.0620 μs** | **0.3269** |     **-** |     **-** |     **13 KB** |
| PageAsync |      Completed8 |   6.996 μs |   0.9093 μs |   0.4756 μs | 0.3245 |     - |     - |     13 KB |
|  ViewSync |      Completed8 |   7.495 μs |   0.5095 μs |   0.2665 μs | 0.3788 |     - |     - |     15 KB |
| ViewAsync |      Completed8 |   7.314 μs |   0.2704 μs |   0.1414 μs | 0.3844 |     - |     - |     15 KB |
|  **PageSync** |  **Completed8Long** |  **15.399 μs** |   **0.8353 μs** |   **0.4369 μs** | **0.5995** |     **-** |     **-** |     **24 KB** |
| PageAsync |  Completed8Long |  15.683 μs |   1.3127 μs |   0.6866 μs | 0.6173 |     - |     - |     24 KB |
|  ViewSync |  Completed8Long |  17.244 μs |   2.1739 μs |   1.1370 μs | 0.6649 |     - |     - |     30 KB |
| ViewAsync |  Completed8Long |  17.062 μs |   0.9102 μs |   0.4761 μs | 0.6460 |     - |     - |     30 KB |
|  **PageSync** |   **GatedPending1** | **579.786 μs** | **549.6233 μs** | **287.4636 μs** |      **-** |     **-** |     **-** |      **9 KB** |
| PageAsync |   GatedPending1 |  19.778 μs |   7.7994 μs |   4.0792 μs | 0.2029 |     - |     - |      9 KB |
|  ViewSync |   GatedPending1 | 524.057 μs | 506.6982 μs | 265.0130 μs |      - |     - |     - |     10 KB |
| ViewAsync |   GatedPending1 |  50.342 μs |  15.7593 μs |   8.2424 μs |      - |     - |     - |     11 KB |
|  **PageSync** | **MissingOptional** |   **4.120 μs** |   **0.1455 μs** |   **0.0761 μs** | **0.2055** |     **-** |     **-** |      **8 KB** |
| PageAsync | MissingOptional |   4.202 μs |   0.1891 μs |   0.0989 μs | 0.2063 |     - |     - |      8 KB |
|  ViewSync | MissingOptional |   4.886 μs |   0.1554 μs |   0.0813 μs | 0.2371 |     - |     - |      9 KB |
| ViewAsync | MissingOptional |   4.830 μs |   0.1548 μs |   0.0810 μs | 0.1998 |     - |     - |      9 KB |
|  **PageSync** |      **NoSections** |   **4.060 μs** |   **0.0876 μs** |   **0.0458 μs** | **0.1990** |     **-** |     **-** |      **8 KB** |
| PageAsync |      NoSections |   4.086 μs |   0.0743 μs |   0.0388 μs | 0.1702 |     - |     - |      8 KB |
|  ViewSync |      NoSections |   4.865 μs |   0.2623 μs |   0.1372 μs | 0.2337 |     - |     - |      9 KB |
| ViewAsync |      NoSections |   4.882 μs |   0.4037 μs |   0.2112 μs | 0.2346 |     - |     - |      9 KB |
