``` ini

BenchmarkDotNet=v0.13.0, OS=Windows 10.0.26300
Unknown processor
.NET SDK=12.0.100-alpha.1.26557.102
  [Host] : .NET 12.0.0 (12.0.26.56305), X64 RyuJIT

OutlierMode=DontRemove  Toolchain=InProcessEmitToolchain  IterationCount=8  
IterationTime=100.0000 ms  LaunchCount=1  WarmupCount=3  

```
|          Method |                 Case |     Mean |    Error |    StdDev | Gen 0 | Gen 1 | Gen 2 | Allocated |
|---------------- |--------------------- |---------:|---------:|----------:|------:|------:|------:|----------:|
| **GenerateTextBox** |  **Attributed_Checkbox** | **459.8 ns** | **199.3 ns** | **104.26 ns** |     **-** |     **-** |     **-** |     **835 B** |
| **GenerateTextBox** |      **Attributed_Date** | **494.8 ns** | **170.5 ns** |  **89.19 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |   **Attributed_Default** | **622.3 ns** | **249.7 ns** | **130.60 ns** |     **-** |     **-** |     **-** |     **704 B** |
| **GenerateTextBox** |     **Attributed_Email** | **667.9 ns** | **237.3 ns** | **124.12 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |     **Attributed_Empty** | **458.7 ns** | **208.3 ns** | **108.95 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |      **Attributed_File** | **473.7 ns** | **100.2 ns** |  **52.40 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |    **Attributed_Hidden** | **467.6 ns** | **170.4 ns** |  **89.12 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |     **Attributed_Image** | **446.9 ns** | **186.2 ns** |  **97.38 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** | **Attri(...)Email [21]** | **504.1 ns** | **179.4 ns** |  **93.83 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |      **Attributed_Null** | **469.2 ns** | **185.6 ns** |  **97.08 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |    **Attributed_Number** | **584.8 ns** | **220.0 ns** | **115.09 ns** |     **-** |     **-** |     **-** |     **720 B** |
| **GenerateTextBox** | **Attri(...)rride [26]** | **641.6 ns** | **167.2 ns** |  **87.46 ns** |     **-** |     **-** |     **-** |     **720 B** |
| **GenerateTextBox** |  **Attributed_Password** | **622.5 ns** | **230.9 ns** | **120.77 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |     **Attributed_Radio** | **467.8 ns** | **186.5 ns** |  **97.54 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |     **Attributed_Range** | **472.5 ns** | **203.3 ns** | **106.35 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |    **Attributed_Search** | **659.8 ns** | **228.6 ns** | **119.54 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |       **Attributed_Tel** | **680.5 ns** | **249.8 ns** | **130.64 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |      **Attributed_Text** | **636.6 ns** | **230.7 ns** | **120.66 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** | **Attri(...)rride [24]** | **668.6 ns** | **216.6 ns** | **113.29 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** | **Attributed_UpperText** | **475.3 ns** | **247.3 ns** | **129.33 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |       **Attributed_Url** | **645.2 ns** | **215.2 ns** | **112.56 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |       **Plain_Checkbox** | **452.7 ns** | **187.2 ns** |  **97.90 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |           **Plain_Date** | **465.5 ns** | **174.3 ns** |  **91.17 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |        **Plain_Default** | **435.5 ns** | **194.4 ns** | **101.68 ns** |     **-** |     **-** |     **-** |     **552 B** |
| **GenerateTextBox** |          **Plain_Email** | **518.9 ns** | **152.4 ns** |  **79.68 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |          **Plain_Empty** | **452.5 ns** | **228.5 ns** | **119.51 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |           **Plain_File** | **418.3 ns** | **215.1 ns** | **112.49 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |         **Plain_Hidden** | **482.3 ns** | **148.7 ns** |  **77.80 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |          **Plain_Image** | **428.2 ns** | **211.0 ns** | **110.37 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |     **Plain_MixedEmail** | **454.1 ns** | **234.6 ns** | **122.70 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |           **Plain_Null** | **461.9 ns** | **210.8 ns** | **110.26 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |         **Plain_Number** | **490.2 ns** | **187.5 ns** |  **98.06 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |       **Plain_Password** | **509.0 ns** | **201.7 ns** | **105.51 ns** |     **-** |     **-** |     **-** |     **856 B** |
| **GenerateTextBox** |          **Plain_Radio** | **465.8 ns** | **191.7 ns** | **100.28 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |          **Plain_Range** | **466.5 ns** | **203.1 ns** | **106.25 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |         **Plain_Search** | **523.6 ns** | **200.0 ns** | **104.60 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |            **Plain_Tel** | **543.1 ns** | **188.2 ns** |  **98.45 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |           **Plain_Text** | **523.7 ns** | **203.6 ns** | **106.47 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |      **Plain_UpperText** | **475.9 ns** | **223.3 ns** | **116.81 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |            **Plain_Url** | **503.0 ns** | **177.5 ns** |  **92.86 ns** |     **-** |     **-** |     **-** |     **853 B** |
