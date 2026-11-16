# F089 measured comparisons

Positive percentage changes are slower. All result samples and controls are retained. CoreCLR and WebAssembly statistics are separate.

## Actual native WebAssembly owner: one custom caliper pair

| Step | Before ns/op | After ns/op | Change % | Before / after B/op | Max CV % |
|---|---:|---:|---:|---:|---:|
| 1 | 4277.42 | 4044.72 | -5.44 | 0 / 0 | 18.04 |
| 2 | 4402.54 | 3781.51 | -14.11 | 0 / 0 | 2.32 |
| 3 | 13357.54 | 12651.06 | -5.29 | 36 / 36 | 7.29 |
| 4 | 13365.17 | 12355.04 | -7.56 | 36 / 36 | 8.47 |
| 5 | 13053.89 | 12757.87 | -2.27 | 40 / 40 | 12.00 |
| 6 | 9420.78 | 8822.63 | -6.35 | 44 / 44 | 1.38 |
| 7 | 6036.38 | 5374.53 | -10.96 | 0 / 0 | 0.57 |
| 8 | 6099.32 | 5390.17 | -11.63 | 0 / 0 | 0.31 |
| 9 | 92303.47 | 91162.11 | -1.24 | 0 / 0 | 0.55 |
| 10 | 92749.02 | 91436.77 | -1.41 | 0 / 0 | 0.55 |

No unchanged native timing control was run. These prepared-target owner/import calipers do not establish first-navigation or whole-app improvement.

## Desktop BDN actual no-import owner and untouched diagnostics

| Method / profile | Desktop pair | Before ns/op | After ns/op | Change % | Before / after B/op | Max CV % |
|---|---:|---:|---:|---:|---:|---:|
| ActualNoImportOwner / Profile=LongEmpty | 1 | 17.80 | 17.37 | -2.40 | 0 / 0 | 0.77 |
| DirectStringDiagnostic / Profile=LongEmpty | 1 | 17.01 | 16.89 | -0.71 | 0 / 0 | 0.28 |
| DirectCharDiagnostic / Profile=LongEmpty | 1 | 16.05 | 15.78 | -1.70 | 0 / 0 | 0.58 |
| ActualNoImportOwner / Profile=LongMissing | 1 | 18.02 | 17.17 | -4.72 | 0 / 0 | 0.67 |
| DirectStringDiagnostic / Profile=LongMissing | 1 | 16.77 | 16.61 | -0.97 | 0 / 0 | 0.65 |
| DirectCharDiagnostic / Profile=LongMissing | 1 | 16.20 | 16.12 | -0.47 | 0 / 0 | 0.78 |
| ActualNoImportOwner / Profile=QueryEmpty | 1 | 5.53 | 4.20 | -24.02 | 0 / 0 | 0.77 |
| DirectStringDiagnostic / Profile=QueryEmpty | 1 | 3.62 | 3.27 | -9.86 | 0 / 0 | 3.16 |
| DirectCharDiagnostic / Profile=QueryEmpty | 1 | 1.65 | 1.64 | -0.26 | 0 / 0 | 2.75 |
| ActualNoImportOwner / Profile=QueryMissing | 1 | 5.79 | 4.60 | -20.57 | 0 / 0 | 0.89 |
| DirectStringDiagnostic / Profile=QueryMissing | 1 | 3.88 | 3.54 | -8.56 | 0 / 0 | 1.15 |
| DirectCharDiagnostic / Profile=QueryMissing | 1 | 1.93 | 1.93 | -0.37 | 0 / 0 | 1.19 |
| ActualNoImportOwner / Profile=ShortEmpty | 1 | 5.53 | 4.21 | -23.81 | 0 / 0 | 0.77 |
| DirectStringDiagnostic / Profile=ShortEmpty | 1 | 3.58 | 3.31 | -7.35 | 0 / 0 | 2.34 |
| DirectCharDiagnostic / Profile=ShortEmpty | 1 | 1.66 | 1.63 | -2.15 | 0 / 0 | 5.82 |
| ActualNoImportOwner / Profile=ShortMissing | 1 | 6.12 | 4.84 | -20.99 | 0 / 0 | 0.78 |
| DirectStringDiagnostic / Profile=ShortMissing | 1 | 3.89 | 3.54 | -8.89 | 0 / 0 | 2.15 |
| DirectCharDiagnostic / Profile=ShortMissing | 1 | 1.93 | 1.93 | 0.07 | 0 / 0 | 1.34 |
| ActualNoImportOwner / Profile=LongEmpty | 2 | 17.81 | 17.35 | -2.58 | 0 / 0 | 0.59 |
| DirectStringDiagnostic / Profile=LongEmpty | 2 | 17.06 | 17.10 | 0.25 | 0 / 0 | 0.57 |
| DirectCharDiagnostic / Profile=LongEmpty | 2 | 16.09 | 15.79 | -1.85 | 0 / 0 | 0.77 |
| ActualNoImportOwner / Profile=LongMissing | 2 | 17.63 | 17.23 | -2.25 | 0 / 0 | 0.71 |
| DirectStringDiagnostic / Profile=LongMissing | 2 | 16.76 | 16.74 | -0.10 | 0 / 0 | 0.54 |
| DirectCharDiagnostic / Profile=LongMissing | 2 | 16.06 | 16.11 | 0.36 | 0 / 0 | 0.46 |
| ActualNoImportOwner / Profile=QueryEmpty | 2 | 5.54 | 4.20 | -24.20 | 0 / 0 | 0.93 |
| DirectStringDiagnostic / Profile=QueryEmpty | 2 | 3.26 | 3.60 | 10.26 | 0 / 0 | 1.64 |
| DirectCharDiagnostic / Profile=QueryEmpty | 2 | 1.95 | 1.64 | -16.22 | 0 / 0 | 1.59 |
| ActualNoImportOwner / Profile=QueryMissing | 2 | 5.79 | 4.58 | -20.90 | 0 / 0 | 0.64 |
| DirectStringDiagnostic / Profile=QueryMissing | 2 | 3.56 | 3.88 | 9.04 | 0 / 0 | 0.85 |
| DirectCharDiagnostic / Profile=QueryMissing | 2 | 2.24 | 1.93 | -14.07 | 0 / 0 | 0.72 |
| ActualNoImportOwner / Profile=ShortEmpty | 2 | 5.52 | 4.20 | -24.01 | 0 / 0 | 1.43 |
| DirectStringDiagnostic / Profile=ShortEmpty | 2 | 3.26 | 3.57 | 9.63 | 0 / 0 | 0.96 |
| DirectCharDiagnostic / Profile=ShortEmpty | 2 | 1.95 | 1.65 | -15.49 | 0 / 0 | 2.27 |
| ActualNoImportOwner / Profile=ShortMissing | 2 | 6.12 | 4.83 | -21.03 | 0 / 0 | 0.70 |
| DirectStringDiagnostic / Profile=ShortMissing | 2 | 3.55 | 3.87 | 9.08 | 0 / 0 | 0.60 |
| DirectCharDiagnostic / Profile=ShortMissing | 2 | 2.25 | 1.93 | -14.14 | 0 / 0 | 0.47 |

Both diagnostic methods are unchanged across variants. Their cross-launch shifts must not be attributed to the owner edit, even when within-launch CV is small.
