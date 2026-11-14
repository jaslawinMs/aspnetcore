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
| **GenerateTextBox** |  **Attributed_Checkbox** | **444.2 ns** | **179.8 ns** |  **94.06 ns** |     **-** |     **-** |     **-** |     **841 B** |
| **GenerateTextBox** |      **Attributed_Date** | **478.4 ns** | **182.9 ns** |  **95.66 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |   **Attributed_Default** | **598.2 ns** | **203.6 ns** | **106.48 ns** |     **-** |     **-** |     **-** |     **704 B** |
| **GenerateTextBox** |     **Attributed_Email** | **633.7 ns** | **244.1 ns** | **127.65 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |     **Attributed_Empty** | **436.8 ns** | **189.9 ns** |  **99.33 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |      **Attributed_File** | **450.6 ns** | **162.2 ns** |  **84.82 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |    **Attributed_Hidden** | **459.5 ns** | **193.8 ns** | **101.38 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |     **Attributed_Image** | **430.3 ns** | **134.3 ns** |  **70.23 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** | **Attri(...)Email [21]** | **457.3 ns** | **178.2 ns** |  **93.18 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |      **Attributed_Null** | **460.1 ns** | **188.4 ns** |  **98.54 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |    **Attributed_Number** | **551.2 ns** | **267.0 ns** | **139.65 ns** |     **-** |     **-** |     **-** |     **720 B** |
| **GenerateTextBox** | **Attri(...)rride [26]** | **619.4 ns** | **262.5 ns** | **137.31 ns** |     **-** |     **-** |     **-** |   **1,035 B** |
| **GenerateTextBox** |  **Attributed_Password** | **632.9 ns** | **238.8 ns** | **124.89 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |     **Attributed_Radio** | **471.0 ns** | **196.7 ns** | **102.87 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |     **Attributed_Range** | **458.3 ns** | **220.2 ns** | **115.17 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |    **Attributed_Search** | **644.5 ns** | **248.7 ns** | **130.09 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |       **Attributed_Tel** | **646.0 ns** | **228.9 ns** | **119.72 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |      **Attributed_Text** | **634.3 ns** | **201.8 ns** | **105.53 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** | **Attri(...)rride [24]** | **720.1 ns** | **141.2 ns** |  **73.85 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** | **Attributed_UpperText** | **458.4 ns** | **175.4 ns** |  **91.73 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |       **Attributed_Url** | **630.3 ns** | **263.3 ns** | **137.72 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |       **Plain_Checkbox** | **443.4 ns** | **195.7 ns** | **102.35 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |           **Plain_Date** | **500.8 ns** | **173.4 ns** |  **90.69 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |        **Plain_Default** | **428.1 ns** | **179.1 ns** |  **93.66 ns** |     **-** |     **-** |     **-** |     **552 B** |
| **GenerateTextBox** |          **Plain_Email** | **504.6 ns** | **163.5 ns** |  **85.50 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |          **Plain_Empty** | **482.9 ns** | **164.3 ns** |  **85.93 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |           **Plain_File** | **450.9 ns** | **154.4 ns** |  **80.75 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |         **Plain_Hidden** | **452.6 ns** | **164.2 ns** |  **85.88 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |          **Plain_Image** | **428.8 ns** | **169.8 ns** |  **88.82 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |     **Plain_MixedEmail** | **433.0 ns** | **201.8 ns** | **105.56 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |           **Plain_Null** | **437.6 ns** | **222.6 ns** | **116.44 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |         **Plain_Number** | **469.5 ns** | **175.5 ns** |  **91.80 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |       **Plain_Password** | **490.4 ns** | **190.3 ns** |  **99.52 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |          **Plain_Radio** | **444.4 ns** | **211.2 ns** | **110.47 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |          **Plain_Range** | **491.1 ns** | **165.8 ns** |  **86.71 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |         **Plain_Search** | **494.9 ns** | **182.2 ns** |  **95.28 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |            **Plain_Tel** | **495.2 ns** | **165.8 ns** |  **86.69 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |           **Plain_Text** | **478.4 ns** | **170.3 ns** |  **89.09 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |      **Plain_UpperText** | **467.6 ns** | **192.3 ns** | **100.56 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |            **Plain_Url** | **483.2 ns** | **178.5 ns** |  **93.35 ns** |     **-** |     **-** |     **-** |     **608 B** |
