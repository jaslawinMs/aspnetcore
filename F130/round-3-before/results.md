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
| **GenerateTextBox** |  **Attributed_Checkbox** | **481.9 ns** | **191.2 ns** | **100.02 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |      **Attributed_Date** | **528.1 ns** | **177.0 ns** |  **92.59 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |   **Attributed_Default** | **653.9 ns** | **209.8 ns** | **109.74 ns** |     **-** |     **-** |     **-** |   **1,011 B** |
| **GenerateTextBox** |     **Attributed_Email** | **686.7 ns** | **193.0 ns** | **100.93 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |     **Attributed_Empty** | **461.3 ns** | **223.0 ns** | **116.64 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |      **Attributed_File** | **465.8 ns** | **229.9 ns** | **120.22 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |    **Attributed_Hidden** | **519.4 ns** | **179.5 ns** |  **93.88 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |     **Attributed_Image** | **447.1 ns** | **168.5 ns** |  **88.15 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** | **Attri(...)Email [21]** | **478.0 ns** | **180.1 ns** |  **94.19 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |      **Attributed_Null** | **469.8 ns** | **161.5 ns** |  **84.48 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |    **Attributed_Number** | **597.5 ns** | **217.3 ns** | **113.66 ns** |     **-** |     **-** |     **-** |     **720 B** |
| **GenerateTextBox** | **Attri(...)rride [26]** | **681.2 ns** | **207.5 ns** | **108.54 ns** |     **-** |     **-** |     **-** |     **720 B** |
| **GenerateTextBox** |  **Attributed_Password** | **646.9 ns** | **240.9 ns** | **126.01 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |     **Attributed_Radio** | **489.7 ns** | **180.6 ns** |  **94.48 ns** |     **-** |     **-** |     **-** |     **836 B** |
| **GenerateTextBox** |     **Attributed_Range** | **526.8 ns** | **159.8 ns** |  **83.59 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |    **Attributed_Search** | **656.8 ns** | **223.2 ns** | **116.75 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |       **Attributed_Tel** | **658.1 ns** | **244.3 ns** | **127.80 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |      **Attributed_Text** | **654.1 ns** | **227.5 ns** | **118.98 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** | **Attri(...)rride [24]** | **688.5 ns** | **232.2 ns** | **121.44 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** | **Attributed_UpperText** | **474.0 ns** | **202.5 ns** | **105.89 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |       **Attributed_Url** | **627.9 ns** | **230.0 ns** | **120.28 ns** |     **-** |     **-** |     **-** |     **760 B** |
| **GenerateTextBox** |       **Plain_Checkbox** | **507.2 ns** | **150.9 ns** |  **78.90 ns** |     **-** |     **-** |     **-** |     **809 B** |
| **GenerateTextBox** |           **Plain_Date** | **510.3 ns** | **177.7 ns** |  **92.92 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |        **Plain_Default** | **436.3 ns** | **172.5 ns** |  **90.23 ns** |     **-** |     **-** |     **-** |     **552 B** |
| **GenerateTextBox** |          **Plain_Email** | **516.3 ns** | **190.9 ns** |  **99.85 ns** |     **-** |     **-** |     **-** |     **868 B** |
| **GenerateTextBox** |          **Plain_Empty** | **467.2 ns** | **201.0 ns** | **105.13 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |           **Plain_File** | **500.3 ns** | **229.7 ns** | **120.15 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |         **Plain_Hidden** | **519.6 ns** | **176.1 ns** |  **92.11 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |          **Plain_Image** | **480.1 ns** | **149.8 ns** |  **78.33 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |     **Plain_MixedEmail** | **485.4 ns** | **202.9 ns** | **106.12 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |           **Plain_Null** | **458.9 ns** | **207.2 ns** | **108.36 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |         **Plain_Number** | **489.1 ns** | **197.5 ns** | **103.27 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |       **Plain_Password** | **523.6 ns** | **192.3 ns** | **100.57 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |          **Plain_Radio** | **493.2 ns** | **196.1 ns** | **102.55 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |          **Plain_Range** | **483.5 ns** | **192.3 ns** | **100.58 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |         **Plain_Search** | **519.5 ns** | **177.6 ns** |  **92.90 ns** |     **-** |     **-** |     **-** |     **867 B** |
| **GenerateTextBox** |            **Plain_Tel** | **525.5 ns** | **201.4 ns** | **105.33 ns** |     **-** |     **-** |     **-** |     **608 B** |
| **GenerateTextBox** |           **Plain_Text** | **511.7 ns** | **182.9 ns** |  **95.66 ns** |     **-** |     **-** |     **-** |     **856 B** |
| **GenerateTextBox** |      **Plain_UpperText** | **468.9 ns** | **234.2 ns** | **122.48 ns** |     **-** |     **-** |     **-** |     **568 B** |
| **GenerateTextBox** |            **Plain_Url** | **522.6 ns** | **206.2 ns** | **107.87 ns** |     **-** |     **-** |     **-** |     **608 B** |
