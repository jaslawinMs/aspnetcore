``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|        Method |               Case |         Mean |       Error |      StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|-------------- |------------------- |-------------:|------------:|------------:|-------:|------:|------:|----------:|
| **CompleteOwner** |          **Concrete0** |     **1.709 ns** |   **0.0491 ns** |   **0.0257 ns** |      **-** |     **-** |     **-** |         **-** |
| **CompleteOwner** |          **Concrete1** |    **45.797 ns** |   **0.8675 ns** |   **0.4537 ns** | **0.0014** |     **-** |     **-** |      **56 B** |
| **CompleteOwner** |        **Concrete128** | **1,989.363 ns** |  **24.6332 ns** |  **12.8836 ns** |      **-** |     **-** |     **-** |      **56 B** |
| **CompleteOwner** |         **Concrete16** |   **286.596 ns** |   **2.4920 ns** |   **1.3033 ns** |      **-** |     **-** |     **-** |      **56 B** |
| **CompleteOwner** |           **Generic0** |     **4.372 ns** |   **0.0531 ns** |   **0.0278 ns** |      **-** |     **-** |     **-** |         **-** |
| **CompleteOwner** |           **Generic1** |    **46.339 ns** |   **1.2572 ns** |   **0.6575 ns** | **0.0015** |     **-** |     **-** |      **56 B** |
| **CompleteOwner** |         **Generic128** | **1,992.224 ns** |  **35.5032 ns** |  **18.5689 ns** |      **-** |     **-** |     **-** |      **56 B** |
| **CompleteOwner** |          **Generic16** |   **291.334 ns** |   **4.4460 ns** |   **2.3253 ns** |      **-** |     **-** |     **-** |      **56 B** |
| **CompleteOwner** |        **NonGeneric0** |     **5.051 ns** |   **0.0461 ns** |   **0.0241 ns** |      **-** |     **-** |     **-** |         **-** |
| **CompleteOwner** |        **NonGeneric1** |    **56.421 ns** |   **2.4415 ns** |   **1.2770 ns** | **0.0018** |     **-** |     **-** |      **88 B** |
| **CompleteOwner** |      **NonGeneric128** | **3,249.867 ns** | **216.6170 ns** | **113.2949 ns** | **0.0944** |     **-** |     **-** |   **4,152 B** |
| **CompleteOwner** |       **NonGeneric16** |   **458.349 ns** |   **6.9936 ns** |   **3.6578 ns** | **0.0135** |     **-** |     **-** |     **568 B** |
| **CompleteOwner** |          **Retained0** |     **6.858 ns** |   **0.2063 ns** |   **0.1079 ns** |      **-** |     **-** |     **-** |         **-** |
| **CompleteOwner** |          **Retained1** |    **50.934 ns** |   **0.5541 ns** |   **0.2898 ns** | **0.0011** |     **-** |     **-** |      **56 B** |
| **CompleteOwner** |        **Retained128** | **2,002.371 ns** |  **25.6794 ns** |  **13.4308 ns** |      **-** |     **-** |     **-** |      **56 B** |
| **CompleteOwner** |         **Retained16** |   **300.017 ns** |   **6.4482 ns** |   **3.3725 ns** |      **-** |     **-** |     **-** |      **56 B** |
| **CompleteOwner** |      **ValidateEmpty** |   **690.190 ns** | **169.7799 ns** |  **88.7982 ns** | **0.0323** |     **-** |     **-** |   **1,408 B** |
| **CompleteOwner** |   **ValidateExtra128** |   **666.530 ns** |  **44.5684 ns** |  **23.3101 ns** | **0.0339** |     **-** |     **-** |   **1,408 B** |
| **CompleteOwner** |    **ValidateExtra16** |   **642.689 ns** |  **27.9788 ns** |  **14.6335 ns** | **0.0327** |     **-** |     **-** |   **1,408 B** |
| **CompleteOwner** |   **ValidateMetadata** |   **114.627 ns** |   **8.2632 ns** |   **4.3218 ns** | **0.0059** |     **-** |     **-** |     **256 B** |
| **CompleteOwner** |       **ValidateNull** |   **563.252 ns** |  **63.8742 ns** |  **33.4075 ns** | **0.0333** |     **-** |     **-** |   **1,408 B** |
| **CompleteOwner** |   **ValidateRemapped** |   **576.215 ns** |  **42.8886 ns** |  **22.4316 ns** | **0.0332** |     **-** |     **-** |   **1,408 B** |
| **CompleteOwner** |   **ValidateStrategy** |   **157.303 ns** |   **9.3795 ns** |   **4.9057 ns** | **0.0061** |     **-** |     **-** |     **256 B** |
| **CompleteOwner** | **ValidateSuppressed** |    **96.157 ns** |   **6.2862 ns** |   **3.2878 ns** | **0.0065** |     **-** |     **-** |     **256 B** |
