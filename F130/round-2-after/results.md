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
| **GenerateTextBox** |  **Attributed_Checkbox** | **470.6 ns** | **162.3 ns** |  **84.87 ns** |     **-** |     **-** |     **-** |     **835 B** |
| **GenerateTextBox** |      **Attributed_Date** | **490.0 ns** | **184.2 ns** |  **96.35 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |   **Attributed_Default** | **618.1 ns** | **224.8 ns** | **117.55 ns** |     **-** |     **-** |     **-** |     **704 B** |
| **GenerateTextBox** |     **Attributed_Email** | **682.6 ns** | **224.2 ns** | **117.24 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |     **Attributed_Empty** | **479.4 ns** | **208.8 ns** | **109.20 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |      **Attributed_File** | **475.4 ns** | **151.1 ns** |  **79.03 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |    **Attributed_Hidden** | **491.0 ns** | **160.3 ns** |  **83.85 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |     **Attributed_Image** | **443.3 ns** | **197.1 ns** | **103.08 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** | **Attri(...)Email [21]** | **527.4 ns** | **168.3 ns** |  **88.04 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |      **Attributed_Null** | **464.7 ns** | **191.0 ns** |  **99.89 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |    **Attributed_Number** | **578.1 ns** | **211.6 ns** | **110.65 ns** |     **-** |     **-** |     **-** |     **720 B** |
| **GenerateTextBox** | **Attri(...)rride [26]** | **635.5 ns** | **224.1 ns** | **117.20 ns** |     **-** |     **-** |     **-** |     **720 B** |
| **GenerateTextBox** |  **Attributed_Password** | **654.3 ns** | **248.2 ns** | **129.82 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |     **Attributed_Radio** | **478.9 ns** | **194.4 ns** | **101.68 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |     **Attributed_Range** | **463.2 ns** | **179.4 ns** |  **93.81 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |    **Attributed_Search** | **643.5 ns** | **232.4 ns** | **121.54 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |       **Attributed_Tel** | **621.5 ns** | **225.6 ns** | **117.99 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |      **Attributed_Text** | **615.1 ns** | **224.2 ns** | **117.24 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** | **Attri(...)rride [24]** | **678.6 ns** | **221.2 ns** | **115.71 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** | **Attributed_UpperText** | **462.2 ns** | **190.6 ns** |  **99.70 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |       **Attributed_Url** | **657.9 ns** | **199.7 ns** | **104.44 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |       **Plain_Checkbox** | **444.2 ns** | **183.9 ns** |  **96.17 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |           **Plain_Date** | **489.8 ns** | **144.5 ns** |  **75.60 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |        **Plain_Default** | **456.8 ns** | **148.5 ns** |  **77.64 ns** |     **-** |     **-** |     **-** |     **552 B** |
| **GenerateTextBox** |          **Plain_Email** | **507.9 ns** | **203.1 ns** | **106.24 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |          **Plain_Empty** | **460.1 ns** | **172.5 ns** |  **90.21 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |           **Plain_File** | **432.5 ns** | **200.1 ns** | **104.65 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |         **Plain_Hidden** | **465.7 ns** | **199.1 ns** | **104.12 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |          **Plain_Image** | **441.9 ns** | **195.4 ns** | **102.17 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |     **Plain_MixedEmail** | **470.8 ns** | **168.4 ns** |  **88.06 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |           **Plain_Null** | **494.2 ns** | **141.5 ns** |  **73.99 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |         **Plain_Number** | **508.7 ns** | **174.5 ns** |  **91.26 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |       **Plain_Password** | **496.3 ns** | **180.0 ns** |  **94.15 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |          **Plain_Radio** | **500.5 ns** | **159.7 ns** |  **83.53 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |          **Plain_Range** | **472.1 ns** | **198.1 ns** | **103.62 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |         **Plain_Search** | **514.9 ns** | **182.9 ns** |  **95.67 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |            **Plain_Tel** | **509.8 ns** | **172.0 ns** |  **89.96 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |           **Plain_Text** | **494.4 ns** | **183.2 ns** |  **95.82 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |      **Plain_UpperText** | **445.5 ns** | **213.6 ns** | **111.72 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |            **Plain_Url** | **502.6 ns** | **189.3 ns** |  **98.99 ns** |     **-** |     **-** |     **-** |     **853 B** |
