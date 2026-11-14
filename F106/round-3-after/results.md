``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|           Method |               Case |         Mean |        Error |       StdDev |  Gen 0 | Gen 1 | Gen 2 | Allocated |
|----------------- |------------------- |-------------:|-------------:|-------------:|-------:|------:|------:|----------:|
| **GetCurrentValues** |     **Alias_Names_16** |  **7,904.37 ns** |   **166.499 ns** |    **87.082 ns** | **0.0792** |     **-** |     **-** |   **5,608 B** |
| **GetCurrentValues** |   **Alias_Numbers_16** |  **8,098.11 ns** |   **166.687 ns** |    **87.181 ns** | **0.0795** |     **-** |     **-** |   **5,608 B** |
| **GetCurrentValues** |     **Alias_Typed_16** |  **1,569.00 ns** |    **72.968 ns** |    **38.164 ns** | **0.0458** |     **-** |     **-** |   **1,904 B** |
| **GetCurrentValues** |  **Flags_Combined_16** |  **8,376.69 ns** |   **187.097 ns** |    **97.856 ns** | **0.0829** |     **-** |     **-** |   **5,232 B** |
| **GetCurrentValues** |   **Large_Invalid_64** | **31,652.67 ns** |   **399.139 ns** |   **208.758 ns** | **0.3141** |     **-** |     **-** |  **15,057 B** |
| **GetCurrentValues** |  **Large_Iterator_64** | **64,232.55 ns** | **1,379.839 ns** |   **721.683 ns** |      **-** |     **-** |     **-** |  **25,820 B** |
| **GetCurrentValues** | **Large_Lowercase_64** | **40,893.27 ns** |   **534.252 ns** |   **279.424 ns** | **0.4139** |     **-** |     **-** |  **18,266 B** |
| **GetCurrentValues** |     **Large_Mixed_64** | **32,627.70 ns** |   **287.499 ns** |   **150.368 ns** | **0.3255** |     **-** |     **-** |  **15,346 B** |
| **GetCurrentValues** |      **Large_Names_1** |  **1,489.43 ns** |    **17.941 ns** |     **9.384 ns** | **0.0150** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |      **Large_Names_2** |  **2,925.65 ns** |    **48.426 ns** |    **25.328 ns** | **0.0290** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |     **Large_Names_64** | **43,937.30 ns** |   **804.064 ns** |   **420.541 ns** | **0.8929** |     **-** |     **-** |  **34,418 B** |
| **GetCurrentValues** |      **Large_Names_8** | **11,458.84 ns** |   **171.721 ns** |    **89.814 ns** | **0.1143** |     **-** |     **-** |   **4,953 B** |
| **GetCurrentValues** |    **Large_Numbers_1** |  **1,513.65 ns** |    **27.730 ns** |    **14.503 ns** | **0.0153** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |    **Large_Numbers_2** |  **2,869.48 ns** |    **59.940 ns** |    **31.350 ns** | **0.0287** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |   **Large_Numbers_64** | **39,798.41 ns** |   **346.057 ns** |   **180.994 ns** | **0.8170** |     **-** |     **-** |  **34,418 B** |
| **GetCurrentValues** |    **Large_Numbers_8** | **11,354.97 ns** |   **180.686 ns** |    **94.503 ns** | **0.1130** |     **-** |     **-** |   **4,953 B** |
| **GetCurrentValues** |  **Large_TwoValid_64** | **35,117.40 ns** |   **468.385 ns** |   **244.975 ns** | **0.3342** |     **-** |     **-** |  **15,826 B** |
| **GetCurrentValues** |      **Large_Typed_1** |    **977.00 ns** |     **8.450 ns** |     **4.420 ns** | **0.0098** |     **-** |     **-** |     **504 B** |
| **GetCurrentValues** |      **Large_Typed_2** |  **1,987.51 ns** |    **59.090 ns** |    **30.905 ns** | **0.0198** |     **-** |     **-** |     **984 B** |
| **GetCurrentValues** |     **Large_Typed_64** | **10,440.26 ns** |   **727.366 ns** |   **380.426 ns** | **0.4952** |     **-** |     **-** |  **19,576 B** |
| **GetCurrentValues** |      **Large_Typed_8** |  **7,586.45 ns** |    **81.678 ns** |    **42.719 ns** | **0.0755** |     **-** |     **-** |   **3,104 B** |
| **GetCurrentValues** |   **Large_Unknown_64** | **85,566.88 ns** | **2,221.362 ns** | **1,161.815 ns** | **0.8446** |     **-** |     **-** |  **35,540 B** |
| **GetCurrentValues** |      **Small_Empty_0** |     **39.16 ns** |     **1.843 ns** |     **0.964 ns** | **0.0013** |     **-** |     **-** |      **64 B** |
| **GetCurrentValues** |   **Small_Invalid_64** | **28,279.86 ns** |   **507.776 ns** |   **265.576 ns** | **0.2803** |     **-** |     **-** |  **15,058 B** |
| **GetCurrentValues** |  **Small_Iterator_64** | **15,268.28 ns** |   **448.426 ns** |   **234.536 ns** | **0.4475** |     **-** |     **-** |  **19,193 B** |
| **GetCurrentValues** | **Small_Lowercase_64** | **29,742.89 ns** |   **801.007 ns** |   **418.942 ns** | **0.2962** |     **-** |     **-** |  **15,640 B** |
| **GetCurrentValues** |     **Small_Mixed_64** | **28,541.33 ns** |   **421.698 ns** |   **220.556 ns** | **0.2841** |     **-** |     **-** |  **15,346 B** |
| **GetCurrentValues** |      **Small_Names_1** |    **810.56 ns** |    **14.238 ns** |     **7.447 ns** | **0.0164** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |      **Small_Names_2** |  **1,528.51 ns** |   **143.117 ns** |    **74.853 ns** | **0.0293** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |     **Small_Names_64** | **33,193.92 ns** |   **963.197 ns** |   **503.771 ns** | **0.3222** |     **-** |     **-** |  **21,818 B** |
| **GetCurrentValues** |      **Small_Names_8** |  **4,991.14 ns** |   **139.316 ns** |    **72.865 ns** | **0.0997** |     **-** |     **-** |   **4,344 B** |
| **GetCurrentValues** |    **Small_Numbers_1** |    **831.88 ns** |    **22.036 ns** |    **11.525 ns** | **0.0163** |     **-** |     **-** |     **760 B** |
| **GetCurrentValues** |    **Small_Numbers_2** |  **1,498.29 ns** |    **35.135 ns** |    **18.376 ns** | **0.0295** |     **-** |     **-** |   **1,440 B** |
| **GetCurrentValues** |   **Small_Numbers_64** | **33,964.72 ns** |   **444.694 ns** |   **232.583 ns** | **0.3655** |     **-** |     **-** |  **21,818 B** |
| **GetCurrentValues** |    **Small_Numbers_8** |  **5,039.29 ns** |   **284.118 ns** |   **148.599 ns** | **0.1020** |     **-** |     **-** |   **4,344 B** |
| **GetCurrentValues** |      **Small_Typed_1** |    **303.55 ns** |    **12.998 ns** |     **6.798 ns** | **0.0121** |     **-** |     **-** |     **504 B** |
| **GetCurrentValues** |      **Small_Typed_2** |    **602.75 ns** |    **36.605 ns** |    **19.145 ns** | **0.0259** |     **-** |     **-** |     **984 B** |
| **GetCurrentValues** |     **Small_Typed_64** |  **5,986.85 ns** |   **286.871 ns** |   **150.039 ns** | **0.1777** |     **-** |     **-** |   **6,976 B** |
| **GetCurrentValues** |      **Small_Typed_8** |  **1,298.20 ns** |    **81.016 ns** |    **42.373 ns** | **0.0636** |     **-** |     **-** |   **2,496 B** |
| **GetCurrentValues** |   **Small_Unknown_64** | **41,268.05 ns** |   **567.892 ns** |   **297.019 ns** | **0.8117** |     **-** |     **-** |  **35,538 B** |
| **GetCurrentValues** |    **String_Typed_64** |  **2,003.86 ns** |    **74.783 ns** |    **39.113 ns** | **0.0794** |     **-** |     **-** |   **3,424 B** |
