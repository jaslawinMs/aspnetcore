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
|   **PreparedOwner** |             **Absent** | **31.57 μs** | **15.335 μs** | **8.020 μs** | **0.3141** |     **-** |     **-** |     **14 KB** |
| PublicChallenge |             Absent | 15.18 μs |  0.411 μs | 0.215 μs | 0.4529 |     - |     - |     18 KB |
|   **PreparedOwner** |    **EndpointDefault** | **12.65 μs** |  **0.251 μs** | **0.131 μs** | **0.3684** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |    EndpointDefault | 15.97 μs |  1.251 μs | 0.654 μs | 0.4808 |     - |     - |     20 KB |
|   **PreparedOwner** | **FalseOverridesItem** | **13.61 μs** |  **2.106 μs** | **1.101 μs** | **0.3803** |     **-** |     **-** |     **15 KB** |
| PublicChallenge | FalseOverridesItem | 16.14 μs |  0.245 μs | 0.128 μs | 0.4664 |     - |     - |     20 KB |
|   **PreparedOwner** |          **ItemFalse** | **13.42 μs** |  **0.311 μs** | **0.163 μs** | **0.4024** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |          ItemFalse | 16.14 μs |  1.729 μs | 0.904 μs | 0.4808 |     - |     - |     19 KB |
|   **PreparedOwner** |           **ItemTrue** | **13.23 μs** |  **0.305 μs** | **0.160 μs** | **0.3964** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |           ItemTrue | 15.72 μs |  0.495 μs | 0.259 μs | 0.4641 |     - |     - |     19 KB |
|   **PreparedOwner** |       **ItemVerbatim** | **13.40 μs** |  **0.171 μs** | **0.089 μs** | **0.3939** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |       ItemVerbatim | 15.93 μs |  0.461 μs | 0.241 μs | 0.4688 |     - |     - |     21 KB |
|   **PreparedOwner** |      **NullKeepsItem** | **13.56 μs** |  **0.817 μs** | **0.427 μs** | **0.3998** |     **-** |     **-** |     **16 KB** |
| PublicChallenge |      NullKeepsItem | 16.21 μs |  1.071 μs | 0.560 μs | 0.4783 |     - |     - |     21 KB |
|   **PreparedOwner** |  **TrueOverridesItem** | **13.47 μs** |  **0.774 μs** | **0.405 μs** | **0.3914** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |  TrueOverridesItem | 15.87 μs |  1.025 μs | 0.536 μs | 0.4641 |     - |     - |     20 KB |
|   **PreparedOwner** |         **TypedFalse** | **13.02 μs** |  **1.110 μs** | **0.581 μs** | **0.3803** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |         TypedFalse | 15.78 μs |  0.349 μs | 0.182 μs | 0.4688 |     - |     - |     19 KB |
|   **PreparedOwner** |   **TypedFalseNoPkce** | **10.82 μs** |  **0.184 μs** | **0.096 μs** | **0.3216** |     **-** |     **-** |     **12 KB** |
| PublicChallenge |   TypedFalseNoPkce | 13.70 μs |  0.894 μs | 0.467 μs | 0.4015 |     - |     - |     16 KB |
|   **PreparedOwner** |          **TypedNull** | **12.53 μs** |  **0.280 μs** | **0.146 μs** | **0.3735** |     **-** |     **-** |     **14 KB** |
| PublicChallenge |          TypedNull | 15.75 μs |  1.211 μs | 0.633 μs | 0.4596 |     - |     - |     19 KB |
|   **PreparedOwner** |          **TypedTrue** | **12.77 μs** |  **0.275 μs** | **0.144 μs** | **0.3811** |     **-** |     **-** |     **15 KB** |
| PublicChallenge |          TypedTrue | 15.97 μs |  0.724 μs | 0.379 μs | 0.4688 |     - |     - |     19 KB |
|   **PreparedOwner** |    **TypedTrueNoPkce** | **10.86 μs** |  **0.537 μs** | **0.281 μs** | **0.3200** |     **-** |     **-** |     **12 KB** |
| PublicChallenge |    TypedTrueNoPkce | 13.64 μs |  0.482 μs | 0.252 μs | 0.4094 |     - |     - |     16 KB |
