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
| **GenerateTextBox** |  **Attributed_Checkbox** | **473.3 ns** | **192.9 ns** | **100.90 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |      **Attributed_Date** | **487.5 ns** | **195.3 ns** | **102.14 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |   **Attributed_Default** | **597.3 ns** | **258.2 ns** | **135.05 ns** |     **-** |     **-** |     **-** |     **704 B** |
| **GenerateTextBox** |     **Attributed_Email** | **719.1 ns** | **212.8 ns** | **111.32 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |     **Attributed_Empty** | **474.9 ns** | **191.3 ns** | **100.04 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |      **Attributed_File** | **494.4 ns** | **164.2 ns** |  **85.86 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |    **Attributed_Hidden** | **493.4 ns** | **176.7 ns** |  **92.44 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |     **Attributed_Image** | **447.3 ns** | **196.1 ns** | **102.57 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** | **Attri(...)Email [21]** | **488.8 ns** | **177.0 ns** |  **92.56 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |      **Attributed_Null** | **490.5 ns** | **200.4 ns** | **104.83 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |    **Attributed_Number** | **587.6 ns** | **223.7 ns** | **117.02 ns** |     **-** |     **-** |     **-** |     **720 B** |
| **GenerateTextBox** | **Attri(...)rride [26]** | **708.3 ns** | **214.0 ns** | **111.91 ns** |     **-** |     **-** |     **-** |     **720 B** |
| **GenerateTextBox** |  **Attributed_Password** | **694.3 ns** | **241.7 ns** | **126.42 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |     **Attributed_Radio** | **497.8 ns** | **225.6 ns** | **117.99 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |     **Attributed_Range** | **475.6 ns** | **188.4 ns** |  **98.56 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |    **Attributed_Search** | **661.2 ns** | **234.9 ns** | **122.84 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |       **Attributed_Tel** | **677.6 ns** | **239.1 ns** | **125.07 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |      **Attributed_Text** | **638.4 ns** | **235.4 ns** | **123.14 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** | **Attri(...)rride [24]** | **666.9 ns** | **246.3 ns** | **128.84 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** | **Attributed_UpperText** | **481.0 ns** | **222.8 ns** | **116.51 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |       **Attributed_Url** | **664.6 ns** | **242.4 ns** | **126.76 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |       **Plain_Checkbox** | **474.1 ns** | **186.7 ns** |  **97.64 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |           **Plain_Date** | **486.1 ns** | **198.0 ns** | **103.56 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |        **Plain_Default** | **449.0 ns** | **173.2 ns** |  **90.58 ns** |     **-** |     **-** |     **-** |     **552 B** |
| **GenerateTextBox** |          **Plain_Email** | **525.3 ns** | **183.1 ns** |  **95.77 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |          **Plain_Empty** | **529.8 ns** | **192.7 ns** | **100.78 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |           **Plain_File** | **465.2 ns** | **188.7 ns** |  **98.70 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |         **Plain_Hidden** | **493.1 ns** | **279.9 ns** | **146.40 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |          **Plain_Image** | **470.7 ns** | **220.3 ns** | **115.25 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |     **Plain_MixedEmail** | **527.9 ns** | **202.0 ns** | **105.67 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |           **Plain_Null** | **480.6 ns** | **190.0 ns** |  **99.37 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |         **Plain_Number** | **491.0 ns** | **162.2 ns** |  **84.86 ns** |     **-** |     **-** |     **-** |     **830 B** |
| **GenerateTextBox** |       **Plain_Password** | **551.2 ns** | **212.7 ns** | **111.24 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |          **Plain_Radio** | **580.5 ns** | **371.6 ns** | **194.34 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |          **Plain_Range** | **530.0 ns** | **196.9 ns** | **102.96 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |         **Plain_Search** | **533.5 ns** | **154.9 ns** |  **81.04 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |            **Plain_Tel** | **519.6 ns** | **182.1 ns** |  **95.27 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |           **Plain_Text** | **494.9 ns** | **156.1 ns** |  **81.65 ns** |     **-** |     **-** |     **-** |     **866 B** |
| **GenerateTextBox** |      **Plain_UpperText** | **466.2 ns** | **193.3 ns** | **101.10 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |            **Plain_Url** | **511.3 ns** | **194.1 ns** | **101.50 ns** |     **-** |     **-** |     **-** |     **608 B** |
