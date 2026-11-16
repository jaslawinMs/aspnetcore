# F115: actual original list-read and JSON Patch pressure

**No before/after comparison or performance improvement is claimed.** All rows are the unchanged owner. Native typed-return diagnostics are a different contract,not a zero-allocation replacement.

| Case | Owning mode | Mean ns | Median ns | CV | Allocated B/op |
| --- | --- | ---: | ---: | ---: | ---: |
| ReadInt | Direct | 12.891 | 12.526 | 5.16% | 24 |
| ReadLong | Direct | 17.315 | 17.146 | 4.58% | 24 |
| ReadDecimal | Direct | 18.538 | 18.535 | 1.05% | 32 |
| ReadGuid | Direct | 19.018 | 18.658 | 4.59% | 32 |
| ReadMutableStruct | Direct | 18.857 | 18.578 | 3.25% | 32 |
| ReadNullableValue | Direct | 17.561 | 17.504 | 0.98% | 24 |
| ReadNullableNull | Direct | 10.086 | 10.049 | 0.95% | 0 |
| ReadString | Direct | 9.348 | 9.334 | 0.69% | 0 |
| ReadReference | Direct | 10.497 | 10.463 | 1.02% | 0 |
| ReadPreboxedObject | Direct | 10.370 | 10.357 | 0.64% | 0 |
| ReadJsonArrayValue | Direct | 12.565 | 12.557 | 0.84% | 0 |
| ReadJsonArrayNull | Direct | 11.613 | 11.564 | 2.10% | 0 |
| GetInt | Get | 133.271 | 128.455 | 6.38% | 144 |
| GetNullableValue | Get | 174.668 | 154.765 | 35.58% | 144 |
| GetNullableNull | Get | 144.302 | 139.030 | 7.69% | 120 |
| GetString | Get | 141.164 | 144.086 | 4.91% | 120 |
| GetJsonArray | Get | 126.114 | 126.070 | 0.75% | 88 |
| TraverseStruct | Traverse | 140.483 | 140.210 | 0.86% | 152 |
| PatchTestInt | Patch | 925.699 | 907.312 | 4.99% | 768 |
| PatchTestInt8 | Patch | 7378.268 | 7122.357 | 6.84% | 5865 |
| PatchCopyInt | Patch | 893.741 | 881.118 | 3.84% | 808 |
| PatchTestNullableValue | Patch | 1200.735 | 1178.997 | 11.76% | 776 |
| PatchTestNullableNull | Patch | 438.559 | 430.784 | 4.71% | 472 |
| PatchTestStructMember | Patch | 1169.798 | 1147.704 | 5.55% | 944 |
| PatchTestReferenceMember | Patch | 1151.526 | 1150.541 | 0.99% | 920 |
| PatchTestJsonArrayMember | Patch | 851.594 | 849.644 | 1.11% | 624 |
| PatchTestScalar | Patch | 813.192 | 804.685 | 3.04% | 544 |
| PatchCopyString | Patch | 1334.183 | 1289.628 | 7.37% | 824 |

Raw retained:224;warmups:84;actual overhead samples:430;source comparisons:0. All shared-machine variability retained.
