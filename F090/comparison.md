| Parameters | Before ns/op by round | After ns/op by round | Median paired time change | Before B/op | After B/op |
|---|---:|---:|---:|---:|---:|
| ValidationMessageBenchmark.GenerateValidationMessage(Case: "ClientOff_Invalid_Custom") | 88.19 / 86.88 / 85.98 | 89.45 / 92.39 / 86.67 | 1.44% | 344.00 | 344.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(Case: "ClientOff_Invalid_Empty") | 92.61 / 94.39 / 95.67 | 90.74 / 91.93 / 90.77 | -2.61% | 344.00 | 344.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(Case: "ClientOff_Invalid_Null") | 89.27 / 88.26 / 88.11 | 89.61 / 87.62 / 88.46 | 0.38% | 344.00 | 344.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(Case: "ClientOff_Valid_Custom") | 19.93 / 18.08 / 18.02 | 19.82 / 19.81 / 20.22 | 9.56% | 0.00 | 0.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(Case: "ClientOff_Valid_Empty") | 19.71 / 17.94 / 18.03 | 19.84 / 19.75 / 19.30 | 7.08% | 0.00 | 0.00 |
| Case=ClientOff_Valid_Null | 19.91 / 18.00 / 18.47 | 19.97 / 19.80 / 19.12 | 3.48% | 0.00 | 0.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(Case: "ClientOn_Invalid_Custom") | 179.77 / 179.96 / 181.44 | 170.49 / 174.52 / 169.24 | -5.16% | 376.00 | 344.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(Case: "ClientOn_Invalid_Empty") | 188.42 / 188.31 / 183.16 | 178.08 / 186.25 / 170.58 | -5.49% | 376.00 | 344.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(Case: "ClientOn_Invalid_Null") | 183.01 / 185.36 / 178.68 | 170.15 / 170.74 / 168.02 | -7.03% | 376.00 | 344.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(Case: "ClientOn_Valid_Custom") | 169.28 / 168.46 / 164.74 | 158.25 / 158.54 / 154.07 | -6.48% | 336.00 | 304.00 |
| Case=ClientOn_Valid_Empty | 146.80 / 149.44 / 144.42 | 131.82 / 127.87 / 130.49 | -10.21% | 224.00 | 192.00 |
| Case=ClientOn_Valid_Null | 148.37 / 144.71 / 141.96 | 131.02 / 130.52 / 128.40 | -9.81% | 224.00 | 192.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(Case: "Override_Invalid_Custom") | 279.48 / 288.64 / 280.79 | 267.02 / 264.77 / 268.11 | -4.52% | 432.00 | 400.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(Case: "Override_Invalid_Null") | 284.13 / 293.23 / 283.63 | 268.46 / 270.46 / 269.54 | -5.52% | 432.00 | 400.00 |
