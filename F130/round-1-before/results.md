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
| **GenerateTextBox** |  **Attributed_Checkbox** | **490.0 ns** | **243.3 ns** | **127.27 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |      **Attributed_Date** | **485.3 ns** | **236.1 ns** | **123.48 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |   **Attributed_Default** | **614.0 ns** | **269.2 ns** | **140.80 ns** |     **-** |     **-** |     **-** |     **704 B** |
| **GenerateTextBox** |     **Attributed_Email** | **662.5 ns** | **223.1 ns** | **116.69 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |     **Attributed_Empty** | **460.4 ns** | **175.3 ns** |  **91.67 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |      **Attributed_File** | **495.7 ns** | **207.7 ns** | **108.61 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |    **Attributed_Hidden** | **473.3 ns** | **194.8 ns** | **101.88 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |     **Attributed_Image** | **448.7 ns** | **180.0 ns** |  **94.14 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** | **Attri(...)Email [21]** | **450.2 ns** | **212.5 ns** | **111.13 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |      **Attributed_Null** | **440.1 ns** | **210.8 ns** | **110.27 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |    **Attributed_Number** | **575.9 ns** | **237.3 ns** | **124.09 ns** |     **-** |     **-** |     **-** |     **720 B** |
| **GenerateTextBox** | **Attri(...)rride [26]** | **660.8 ns** | **213.0 ns** | **111.41 ns** |     **-** |     **-** |     **-** |     **720 B** |
| **GenerateTextBox** |  **Attributed_Password** | **642.8 ns** | **235.4 ns** | **123.12 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |     **Attributed_Radio** | **475.5 ns** | **191.3 ns** | **100.08 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |     **Attributed_Range** | **470.4 ns** | **162.3 ns** |  **84.89 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |    **Attributed_Search** | **633.5 ns** | **232.6 ns** | **121.65 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |       **Attributed_Tel** | **645.0 ns** | **233.4 ns** | **122.05 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |      **Attributed_Text** | **660.3 ns** | **258.0 ns** | **134.96 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** | **Attri(...)rride [24]** | **651.5 ns** | **226.8 ns** | **118.61 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** | **Attributed_UpperText** | **468.9 ns** | **185.6 ns** |  **97.05 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |       **Attributed_Url** | **648.2 ns** | **227.2 ns** | **118.81 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |       **Plain_Checkbox** | **456.4 ns** | **220.3 ns** | **115.20 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |           **Plain_Date** | **478.6 ns** | **187.8 ns** |  **98.24 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |        **Plain_Default** | **449.7 ns** | **135.9 ns** |  **71.06 ns** |     **-** |     **-** |     **-** |     **552 B** |
| **GenerateTextBox** |          **Plain_Email** | **506.3 ns** | **176.4 ns** |  **92.28 ns** |     **-** |     **-** |     **-** |     **865 B** |
| **GenerateTextBox** |          **Plain_Empty** | **455.4 ns** | **196.0 ns** | **102.52 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |           **Plain_File** | **481.6 ns** | **158.4 ns** |  **82.84 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |         **Plain_Hidden** | **466.6 ns** | **218.5 ns** | **114.29 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |          **Plain_Image** | **437.8 ns** | **220.7 ns** | **115.44 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |     **Plain_MixedEmail** | **514.9 ns** | **182.6 ns** |  **95.50 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |           **Plain_Null** | **462.7 ns** | **179.2 ns** |  **93.74 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |         **Plain_Number** | **461.1 ns** | **220.7 ns** | **115.44 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |       **Plain_Password** | **517.1 ns** | **199.5 ns** | **104.32 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |          **Plain_Radio** | **502.0 ns** | **157.3 ns** |  **82.29 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |          **Plain_Range** | **455.0 ns** | **219.1 ns** | **114.59 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |         **Plain_Search** | **482.6 ns** | **181.3 ns** |  **94.82 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |            **Plain_Tel** | **510.6 ns** | **170.5 ns** |  **89.15 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |           **Plain_Text** | **489.9 ns** | **199.8 ns** | **104.52 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |      **Plain_UpperText** | **456.8 ns** | **211.3 ns** | **110.54 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |            **Plain_Url** | **503.6 ns** | **188.3 ns** |  **98.48 ns** |     **-** |     **-** |     **-** |     **856 B** |
