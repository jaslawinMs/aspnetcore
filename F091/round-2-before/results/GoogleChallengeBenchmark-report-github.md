``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|          Method |            Profile |     Mean |     Error |   StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------- |------------------- |---------:|----------:|---------:|-------:|------:|------:|----------:|
|   **PreparedOwner** |             **Absent** | **35.67 μs** | **13.146 μs** | **6.876 μs** | **0.2854** |     **-** |     **-** |     **14 KB** |
| PublicChallenge |             Absent | 15.43 μs |  0.358 μs | 0.187 μs | 0.4562 |     - |     - |     18 KB |
|   **PreparedOwner** |    **EndpointDefault** | **13.00 μs** |  **0.377 μs** | **0.197 μs** | **0.5123** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |    EndpointDefault | 15.94 μs |  0.447 μs | 0.234 μs | 0.4783 |     - |     - |     20 KB |
|   **PreparedOwner** | **FalseOverridesItem** | **13.48 μs** |  **0.694 μs** | **0.363 μs** | **0.3914** |     **-** |     **-** |     **15 KB** |
| PublicChallenge | FalseOverridesItem | 15.72 μs |  0.579 μs | 0.303 μs | 0.4711 |     - |     - |     20 KB |
|   **PreparedOwner** |          **ItemFalse** | **13.40 μs** |  **0.709 μs** | **0.371 μs** | **0.3890** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |          ItemFalse | 15.57 μs |  0.319 μs | 0.167 μs | 0.4676 |     - |     - |     19 KB |
|   **PreparedOwner** |           **ItemTrue** | **13.16 μs** |  **0.262 μs** | **0.137 μs** | **0.3914** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |           ItemTrue | 15.61 μs |  0.192 μs | 0.100 μs | 0.4607 |     - |     - |     19 KB |
|   **PreparedOwner** |       **ItemVerbatim** | **13.33 μs** |  **0.326 μs** | **0.171 μs** | **0.4006** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |       ItemVerbatim | 15.94 μs |  0.298 μs | 0.156 μs | 0.4735 |     - |     - |     21 KB |
|   **PreparedOwner** |      **NullKeepsItem** | **13.47 μs** |  **0.270 μs** | **0.141 μs** | **0.4015** |     **-** |     **-** |     **16 KB** |
| PublicChallenge |      NullKeepsItem | 16.23 μs |  1.221 μs | 0.639 μs | 0.4820 |     - |     - |     21 KB |
|   **PreparedOwner** |  **TrueOverridesItem** | **13.29 μs** |  **0.274 μs** | **0.144 μs** | **0.3914** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |  TrueOverridesItem | 15.98 μs |  1.384 μs | 0.724 μs | 0.4688 |     - |     - |     20 KB |
|   **PreparedOwner** |         **TypedFalse** | **12.81 μs** |  **0.308 μs** | **0.161 μs** | **0.3890** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |         TypedFalse | 15.83 μs |  0.251 μs | 0.131 μs | 0.4783 |     - |     - |     19 KB |
|   **PreparedOwner** |   **TypedFalseNoPkce** | **10.97 μs** |  **0.165 μs** | **0.086 μs** | **0.3222** |     **-** |     **-** |     **12 KB** |
| PublicChallenge |   TypedFalseNoPkce | 13.66 μs |  1.137 μs | 0.595 μs | 0.4130 |     - |     - |     16 KB |
|   **PreparedOwner** |          **TypedNull** | **12.43 μs** |  **0.180 μs** | **0.094 μs** | **0.3713** |     **-** |     **-** |     **14 KB** |
| PublicChallenge |          TypedNull | 15.46 μs |  0.295 μs | 0.154 μs | 0.4723 |     - |     - |     19 KB |
|   **PreparedOwner** |          **TypedTrue** | **12.74 μs** |  **0.232 μs** | **0.121 μs** | **0.3796** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |          TypedTrue | 15.99 μs |  1.580 μs | 0.827 μs | 0.4771 |     - |     - |     19 KB |
|   **PreparedOwner** |    **TypedTrueNoPkce** | **10.70 μs** |  **0.304 μs** | **0.159 μs** | **0.3278** |     **-** |     **-** |     **12 KB** |
| PublicChallenge |    TypedTrueNoPkce | 13.55 μs |  0.402 μs | 0.210 μs | 0.3998 |     - |     - |     16 KB |
