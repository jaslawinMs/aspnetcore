| Parameters | Before ns/op by round | After ns/op by round | Median paired time change | Before B/op | After B/op |
|---|---:|---:|---:|---:|---:|
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 0, Case: "ClientOff_Absent_Custom") | 8.03 / 40.42 / 7.78 | 8.20 / 51.69 / 8.10 | 4.09% | 0.00 | 0.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 0, Case: "ClientOff_Absent_Empty") | 7.82 / 7.83 / 7.63 | 8.06 / 7.67 / 8.05 | 3.06% | 0.00 | 0.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 0, Case: "ClientOff_Absent_Null") | 7.85 / 7.83 / 7.76 | 8.00 / 7.75 / 8.00 | 1.94% | 0.00 | 0.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 0, Case: "ClientOff_Invalid_Custom") | 134.38 / 145.16 / 151.44 | 120.00 / 119.26 / 137.72 | -10.70% | 344.00 | 344.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 0, Case: "ClientOff_Invalid_Empty") | 137.76 / 153.68 / 145.98 | 123.12 / 123.51 / 142.05 | -10.63% | 344.00 | 344.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 0, Case: "ClientOff_Invalid_Null") | 138.97 / 158.36 / 148.59 | 127.09 / 121.87 / 135.10 | -9.08% | 344.00 | 344.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 0, Case: "ClientOff_Valid_Custom") | 32.74 / 31.59 / 31.82 | 17.45 / 18.35 / 17.58 | -44.77% | 0.00 | 0.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 0, Case: "ClientOff_Valid_Empty") | 31.33 / 31.69 / 31.94 | 17.62 / 18.73 / 17.74 | -43.76% | 0.00 | 0.00 |
| OtherFields=0&Case=ClientOff_Valid_Null | 31.85 / 31.68 / 32.09 | 17.60 / 18.81 / 17.68 | -44.75% | 0.00 | 0.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 0, Case: "ClientOn_Absent_Custom") | 177.73 / 190.59 / 186.12 | 171.08 / 173.57 / 192.59 | -3.74% | 336.00 | 336.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 0, Case: "ClientOn_Absent_Empty") | 161.15 / 161.35 / 157.18 | 148.17 / 146.64 / 160.02 | -8.06% | 224.00 | 224.00 |
| OtherFields=0&Case=ClientOn_Absent_Null | 152.15 / 158.41 / 159.93 | 146.85 / 146.49 / 160.29 | -3.48% | 224.00 | 224.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 0, Case: "ClientOn_Invalid_Custom") | 236.73 / 253.56 / 243.90 | 218.21 / 217.61 / 235.95 | -7.82% | 376.00 | 376.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 0, Case: "ClientOn_Invalid_Empty") | 241.23 / 252.19 / 249.14 | 220.36 / 223.20 / 235.97 | -8.65% | 376.00 | 376.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 0, Case: "ClientOn_Invalid_Null") | 239.13 / 253.81 / 243.40 | 217.65 / 219.30 / 238.31 | -8.98% | 376.00 | 376.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 0, Case: "ClientOn_Valid_Custom") | 194.97 / 212.28 / 205.73 | 179.63 / 185.50 / 195.27 | -7.87% | 336.00 | 336.00 |
| OtherFields=0&Case=ClientOn_Valid_Empty | 169.46 / 178.35 / 172.99 | 157.73 / 151.60 / 166.47 | -6.92% | 224.00 | 224.00 |
| OtherFields=0&Case=ClientOn_Valid_Null | 168.29 / 179.62 / 170.80 | 153.45 / 153.93 / 167.10 | -8.82% | 224.00 | 224.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 0, Case: "Override_Invalid_Custom") | 355.03 / 363.85 / 351.51 | 323.72 / 329.92 / 334.89 | -8.82% | 432.00 | 432.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 0, Case: "Override_Invalid_Null") | 351.33 / 363.91 / 354.61 | 325.96 / 333.79 / 336.74 | -7.22% | 432.00 | 432.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 63, Case: "ClientOff_Absent_Custom") | 21.64 / 21.81 / 22.93 | 20.78 / 22.37 / 20.97 | -3.94% | 0.00 | 0.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 63, Case: "ClientOff_Absent_Empty") | 21.25 / 21.79 / 22.52 | 21.09 / 22.62 / 20.84 | -0.75% | 0.00 | 0.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 63, Case: "ClientOff_Absent_Null") | 21.63 / 21.69 / 22.92 | 20.95 / 23.27 / 20.81 | -3.17% | 0.00 | 0.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 63, Case: "ClientOff_Invalid_Custom") | 156.68 / 165.39 / 172.06 | 138.16 / 129.54 / 145.94 | -15.18% | 344.00 | 344.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 63, Case: "ClientOff_Invalid_Empty") | 153.81 / 167.07 / 174.14 | 129.19 / 130.89 / 148.13 | -16.01% | 344.00 | 344.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 63, Case: "ClientOff_Invalid_Null") | 156.46 / 165.57 / 172.16 | 129.98 / 131.14 / 144.74 | -16.93% | 344.00 | 344.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 63, Case: "ClientOff_Valid_Custom") | 50.57 / 49.03 / 53.26 | 26.29 / 28.84 / 26.27 | -48.02% | 0.00 | 0.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 63, Case: "ClientOff_Valid_Empty") | 49.53 / 49.04 / 53.52 | 26.04 / 28.45 / 26.02 | -47.43% | 0.00 | 0.00 |
| OtherFields=63&Case=ClientOff_Valid_Null | 49.94 / 49.34 / 53.96 | 27.39 / 28.67 / 26.62 | -45.17% | 0.00 | 0.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 63, Case: "ClientOn_Absent_Custom") | 210.33 / 226.79 / 227.64 | 188.16 / 201.05 / 201.53 | -11.35% | 336.00 | 336.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 63, Case: "ClientOn_Absent_Empty") | 181.34 / 188.83 / 198.77 | 158.04 / 163.90 / 169.59 | -13.20% | 224.00 | 224.00 |
| OtherFields=63&Case=ClientOn_Absent_Null | 180.97 / 190.76 / 192.09 | 159.24 / 163.27 / 172.76 | -12.01% | 224.00 | 224.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 63, Case: "ClientOn_Invalid_Custom") | 261.37 / 274.94 / 259.10 | 227.14 / 235.96 / 245.90 | -13.10% | 376.00 | 376.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 63, Case: "ClientOn_Invalid_Empty") | 255.39 / 281.22 / 264.57 | 229.42 / 232.48 / 246.24 | -10.17% | 376.00 | 376.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 63, Case: "ClientOn_Invalid_Null") | 254.16 / 276.96 / 267.21 | 232.28 / 231.38 / 248.18 | -8.61% | 376.00 | 376.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 63, Case: "ClientOn_Valid_Custom") | 219.28 / 230.45 / 223.18 | 187.98 / 189.90 / 204.67 | -14.27% | 336.00 | 336.00 |
| OtherFields=63&Case=ClientOn_Valid_Empty | 193.17 / 197.19 / 198.98 | 162.65 / 163.54 / 173.65 | -15.80% | 224.00 | 224.00 |
| OtherFields=63&Case=ClientOn_Valid_Null | 189.66 / 196.33 / 194.43 | 161.13 / 167.83 / 174.52 | -14.52% | 224.00 | 224.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 63, Case: "Override_Invalid_Custom") | 373.61 / 386.98 / 367.04 | 337.10 / 345.01 / 342.63 | -9.77% | 432.00 | 432.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 63, Case: "Override_Invalid_Null") | 378.98 / 389.40 / 370.59 | 340.55 / 348.27 / 341.98 | -10.14% | 432.00 | 432.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 255, Case: "ClientOff_Absent_Custom") | 25.02 / 24.64 / 26.56 | 24.04 / 26.76 / 23.93 | -3.94% | 0.00 | 0.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 255, Case: "ClientOff_Absent_Empty") | 24.69 / 25.14 / 26.80 | 24.07 / 26.61 / 24.07 | -2.50% | 0.00 | 0.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 255, Case: "ClientOff_Absent_Null") | 24.80 / 24.96 / 26.61 | 24.75 / 26.54 / 23.91 | -0.20% | 0.00 | 0.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 255, Case: "ClientOff_Invalid_Custom") | 160.46 / 173.27 / 182.91 | 134.06 / 133.57 / 146.38 | -19.97% | 344.00 | 344.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 255, Case: "ClientOff_Invalid_Empty") | 165.91 / 177.04 / 176.12 | 140.13 / 135.54 / 148.28 | -15.81% | 344.00 | 344.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 255, Case: "ClientOff_Invalid_Null") | 162.98 / 177.28 / 182.04 | 132.91 / 134.54 / 150.46 | -18.45% | 344.00 | 344.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 255, Case: "ClientOff_Valid_Custom") | 56.25 / 56.01 / 60.47 | 29.24 / 32.36 / 29.25 | -48.02% | 0.00 | 0.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 255, Case: "ClientOff_Valid_Empty") | 56.11 / 55.36 / 60.49 | 29.29 / 32.69 / 29.14 | -47.79% | 0.00 | 0.00 |
| OtherFields=255&Case=ClientOff_Valid_Null | 56.27 / 55.86 / 60.08 | 29.35 / 33.49 / 29.42 | -47.85% | 0.00 | 0.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 255, Case: "ClientOn_Absent_Custom") | 225.50 / 225.96 / 223.69 | 186.46 / 188.98 / 205.71 | -16.36% | 336.00 | 336.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 255, Case: "ClientOn_Absent_Empty") | 195.23 / 195.76 / 197.06 | 161.57 / 163.18 / 173.62 | -16.64% | 224.00 | 224.00 |
| OtherFields=255&Case=ClientOn_Absent_Null | 188.95 / 200.10 / 197.53 | 159.94 / 164.53 / 175.54 | -15.35% | 224.00 | 224.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 255, Case: "ClientOn_Invalid_Custom") | 265.72 / 275.18 / 286.96 | 222.11 / 233.84 / 247.92 | -15.02% | 376.00 | 376.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 255, Case: "ClientOn_Invalid_Empty") | 264.76 / 276.09 / 273.32 | 228.41 / 238.55 / 247.72 | -13.60% | 376.00 | 376.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 255, Case: "ClientOn_Invalid_Null") | 260.39 / 275.95 / 273.51 | 227.74 / 239.09 / 248.94 | -12.54% | 376.00 | 376.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 255, Case: "ClientOn_Valid_Custom") | 229.15 / 224.12 / 233.98 | 185.94 / 202.59 / 208.05 | -11.09% | 336.00 | 336.00 |
| OtherFields=255&Case=ClientOn_Valid_Empty | 200.03 / 195.69 / 203.99 | 161.31 / 170.30 / 179.31 | -12.97% | 224.00 | 224.00 |
| OtherFields=255&Case=ClientOn_Valid_Null | 200.52 / 192.63 / 204.51 | 161.59 / 170.05 / 188.51 | -11.72% | 224.00 | 224.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 255, Case: "Override_Invalid_Custom") | 378.81 / 374.01 / 383.62 | 331.58 / 351.37 / 346.97 | -9.55% | 432.00 | 432.00 |
| ValidationMessageBenchmark.GenerateValidationMessage(OtherFields: 255, Case: "Override_Invalid_Null") | 388.55 / 388.45 / 388.01 | 327.95 / 350.84 / 346.51 | -10.70% | 432.00 | 432.00 |
