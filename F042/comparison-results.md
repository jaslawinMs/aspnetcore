# F042: every actual source comparison

All three comparisons use the same frozen candidate and identical measured harness bytes.
Positive less-time means candidate faster. Each value is independently recomputed from all eight retained observations.
The median column combines the three paired percentages, not the ratio of separate median means.

| Count | Full profile | Original ns/op by comparison | Candidate ns/op by comparison | Less-time % by comparison | Median less-time % | Original B/op by comparison | Candidate B/op by comparison |
|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | ParsedIntExisting | 740.77 / 791.28 / 778.87 | 802.25 / 961.85 / 810.86 | -8.30 / -21.56 / -4.11 | -8.30 | 636 / 637 / 637 | 629 / 633 / 633 |
| 1 | ParsedObjectExisting | 709.97 / 775.07 / 697.72 | 735.86 / 765.47 / 763.15 | -3.65 / 1.24 / -9.38 | -3.65 | 590 / 589 / 591 | 588 / 590 / 589 |
| 1 | ParsedObjectMissing | 853.64 / 898.88 / 897.99 | 862.31 / 918.35 / 906.65 | -1.02 / -2.17 / -0.96 | -1.02 | 774 / 776 / 775 | 774 / 776 / 775 |
| 1 | ParsedObjectTestControl | 780.41 / 798.55 / 803.74 | 779.57 / 750.35 / 749.82 | 0.11 / 6.04 / 6.71 | 6.04 | 590 / 591 / 590 | 589 / 572 / 591 |
| 1 | ProgrammaticIntExisting | 653.84 / 688.95 / 700.39 | 646.99 / 695.58 / 687.56 | 1.05 / -0.96 / 1.83 | 1.05 | 585 / 590 / 588 | 585 / 588 / 589 |
| 1 | ProgrammaticNullExisting | 710.18 / 738.12 / 731.87 | 737.81 / 739.28 / 763.40 | -3.89 / -0.16 / -4.31 | -3.89 | 622 / 603 / 622 | 621 / 605 / 604 |
| 64 | ParsedIntExisting | 802.81 / 802.42 / 809.02 | 794.07 / 795.78 / 738.78 | 1.09 / 0.83 / 8.68 | 1.09 | 628 / 629 / 629 | 629 / 628 / 630 |
| 64 | ParsedObjectExisting | 744.08 / 765.28 / 763.78 | 721.06 / 754.20 / 747.61 | 3.09 / 1.45 / 2.12 | 2.12 | 590 / 589 / 590 | 587 / 588 / 588 |
| 64 | ParsedObjectMissing | 860.55 / 903.94 / 887.67 | 868.61 / 918.35 / 917.66 | -0.94 / -1.59 / -3.38 | -1.59 | 774 / 776 / 775 | 775 / 776 / 776 |
| 64 | ParsedObjectTestControl | 797.24 / 806.97 / 752.70 | 782.30 / 765.84 / 812.62 | 1.87 / 5.10 / -7.96 | 1.87 | 590 / 591 / 591 | 590 / 592 / 591 |
| 64 | ProgrammaticIntExisting | 676.90 / 692.66 / 703.06 | 666.67 / 692.70 / 697.17 | 1.51 / -0.00 / 0.84 | 0.84 | 589 / 589 / 588 | 587 / 588 / 588 |
| 64 | ProgrammaticNullExisting | 708.66 / 772.14 / 774.09 | 773.89 / 760.98 / 771.11 | -9.20 / 1.45 / 0.38 | 0.38 | 620 / 623 / 603 | 622 / 621 / 604 |

## Each report row, variability and exact raw links

| Pair | Variant | Count | Full profile | Mean ns | Sample SD ns | CV % | Median ns | B/op | Actual overhead N | Retained result N |
|---:|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Original | 1 | ParsedIntExisting | 740.77 | 24.89 | 3.36 | 732.86 | 636 | 15 | 8 |
| 1 | Original | 1 | ParsedObjectExisting | 709.97 | 9.22 | 1.30 | 711.23 | 590 | 19 | 8 |
| 1 | Original | 1 | ParsedObjectMissing | 853.64 | 17.66 | 2.07 | 849.11 | 774 | 15 | 8 |
| 1 | Original | 1 | ParsedObjectTestControl | 780.41 | 33.41 | 4.28 | 769.23 | 590 | 15 | 8 |
| 1 | Original | 1 | ProgrammaticIntExisting | 653.84 | 26.49 | 4.05 | 644.79 | 585 | 20 | 8 |
| 1 | Original | 1 | ProgrammaticNullExisting | 710.18 | 42.95 | 6.05 | 691.94 | 622 | 20 | 8 |
| 1 | Original | 64 | ParsedIntExisting | 802.81 | 45.59 | 5.68 | 788.61 | 628 | 16 | 8 |
| 1 | Original | 64 | ParsedObjectExisting | 744.08 | 24.76 | 3.33 | 734.90 | 590 | 17 | 8 |
| 1 | Original | 64 | ParsedObjectMissing | 860.55 | 30.57 | 3.55 | 854.25 | 774 | 16 | 8 |
| 1 | Original | 64 | ParsedObjectTestControl | 797.24 | 42.08 | 5.28 | 785.49 | 590 | 20 | 8 |
| 1 | Original | 64 | ProgrammaticIntExisting | 676.90 | 15.19 | 2.24 | 671.21 | 589 | 20 | 8 |
| 1 | Original | 64 | ProgrammaticNullExisting | 708.66 | 23.66 | 3.34 | 705.36 | 620 | 19 | 8 |
| 1 | Candidate | 1 | ParsedIntExisting | 802.25 | 43.20 | 5.38 | 793.31 | 629 | 20 | 8 |
| 1 | Candidate | 1 | ParsedObjectExisting | 735.86 | 14.91 | 2.03 | 733.53 | 588 | 20 | 8 |
| 1 | Candidate | 1 | ParsedObjectMissing | 862.31 | 36.69 | 4.25 | 853.47 | 774 | 20 | 8 |
| 1 | Candidate | 1 | ParsedObjectTestControl | 779.57 | 37.33 | 4.79 | 768.87 | 589 | 20 | 8 |
| 1 | Candidate | 1 | ProgrammaticIntExisting | 646.99 | 33.40 | 5.16 | 637.11 | 585 | 15 | 8 |
| 1 | Candidate | 1 | ProgrammaticNullExisting | 737.81 | 25.79 | 3.49 | 741.87 | 621 | 20 | 8 |
| 1 | Candidate | 64 | ParsedIntExisting | 794.07 | 39.67 | 5.00 | 779.19 | 629 | 20 | 8 |
| 1 | Candidate | 64 | ParsedObjectExisting | 721.06 | 32.26 | 4.47 | 713.68 | 587 | 18 | 8 |
| 1 | Candidate | 64 | ParsedObjectMissing | 868.61 | 14.47 | 1.67 | 868.87 | 775 | 15 | 8 |
| 1 | Candidate | 64 | ParsedObjectTestControl | 782.30 | 20.09 | 2.57 | 776.99 | 590 | 15 | 8 |
| 1 | Candidate | 64 | ProgrammaticIntExisting | 666.67 | 18.55 | 2.78 | 661.20 | 587 | 20 | 8 |
| 1 | Candidate | 64 | ProgrammaticNullExisting | 773.89 | 18.38 | 2.38 | 764.90 | 622 | 15 | 8 |
| 2 | Candidate | 1 | ParsedIntExisting | 961.85 | 321.47 | 33.42 | 811.95 | 633 | 20 | 8 |
| 2 | Candidate | 1 | ParsedObjectExisting | 765.47 | 22.13 | 2.89 | 768.54 | 590 | 15 | 8 |
| 2 | Candidate | 1 | ParsedObjectMissing | 918.35 | 26.66 | 2.90 | 912.52 | 776 | 15 | 8 |
| 2 | Candidate | 1 | ParsedObjectTestControl | 750.35 | 16.47 | 2.20 | 750.65 | 572 | 20 | 8 |
| 2 | Candidate | 1 | ProgrammaticIntExisting | 695.58 | 20.97 | 3.02 | 694.46 | 588 | 20 | 8 |
| 2 | Candidate | 1 | ProgrammaticNullExisting | 739.28 | 53.44 | 7.23 | 717.96 | 605 | 15 | 8 |
| 2 | Candidate | 64 | ParsedIntExisting | 795.78 | 21.73 | 2.73 | 793.50 | 628 | 15 | 8 |
| 2 | Candidate | 64 | ParsedObjectExisting | 754.20 | 20.55 | 2.72 | 749.48 | 588 | 15 | 8 |
| 2 | Candidate | 64 | ParsedObjectMissing | 918.35 | 54.66 | 5.95 | 899.56 | 776 | 18 | 8 |
| 2 | Candidate | 64 | ParsedObjectTestControl | 765.84 | 16.72 | 2.18 | 759.58 | 592 | 15 | 8 |
| 2 | Candidate | 64 | ProgrammaticIntExisting | 692.70 | 24.18 | 3.49 | 693.97 | 588 | 20 | 8 |
| 2 | Candidate | 64 | ProgrammaticNullExisting | 760.98 | 14.90 | 1.96 | 764.54 | 621 | 15 | 8 |
| 2 | Original | 1 | ParsedIntExisting | 791.28 | 34.36 | 4.34 | 788.80 | 637 | 15 | 8 |
| 2 | Original | 1 | ParsedObjectExisting | 775.07 | 54.63 | 7.05 | 755.99 | 589 | 20 | 8 |
| 2 | Original | 1 | ParsedObjectMissing | 898.88 | 16.73 | 1.86 | 897.33 | 776 | 15 | 8 |
| 2 | Original | 1 | ParsedObjectTestControl | 798.55 | 11.68 | 1.46 | 802.99 | 591 | 18 | 8 |
| 2 | Original | 1 | ProgrammaticIntExisting | 688.95 | 6.81 | 0.99 | 685.24 | 590 | 15 | 8 |
| 2 | Original | 1 | ProgrammaticNullExisting | 738.12 | 11.13 | 1.51 | 735.03 | 603 | 19 | 8 |
| 2 | Original | 64 | ParsedIntExisting | 802.42 | 12.21 | 1.52 | 799.96 | 629 | 15 | 8 |
| 2 | Original | 64 | ParsedObjectExisting | 765.28 | 22.30 | 2.91 | 766.88 | 589 | 15 | 8 |
| 2 | Original | 64 | ParsedObjectMissing | 903.94 | 16.46 | 1.82 | 899.57 | 776 | 16 | 8 |
| 2 | Original | 64 | ParsedObjectTestControl | 806.97 | 40.30 | 4.99 | 795.47 | 591 | 15 | 8 |
| 2 | Original | 64 | ProgrammaticIntExisting | 692.66 | 15.53 | 2.24 | 689.24 | 589 | 20 | 8 |
| 2 | Original | 64 | ProgrammaticNullExisting | 772.14 | 35.85 | 4.64 | 758.08 | 623 | 15 | 8 |
| 3 | Original | 1 | ParsedIntExisting | 778.87 | 22.22 | 2.85 | 779.12 | 637 | 20 | 8 |
| 3 | Original | 1 | ParsedObjectExisting | 697.72 | 15.53 | 2.23 | 693.52 | 591 | 15 | 8 |
| 3 | Original | 1 | ParsedObjectMissing | 897.99 | 19.84 | 2.21 | 893.71 | 775 | 17 | 8 |
| 3 | Original | 1 | ParsedObjectTestControl | 803.74 | 21.45 | 2.67 | 798.13 | 590 | 15 | 8 |
| 3 | Original | 1 | ProgrammaticIntExisting | 700.39 | 18.28 | 2.61 | 704.21 | 588 | 15 | 8 |
| 3 | Original | 1 | ProgrammaticNullExisting | 731.87 | 28.36 | 3.88 | 726.16 | 622 | 20 | 8 |
| 3 | Original | 64 | ParsedIntExisting | 809.02 | 27.42 | 3.39 | 798.74 | 629 | 20 | 8 |
| 3 | Original | 64 | ParsedObjectExisting | 763.78 | 11.74 | 1.54 | 764.89 | 590 | 15 | 8 |
| 3 | Original | 64 | ParsedObjectMissing | 887.67 | 17.40 | 1.96 | 880.64 | 775 | 17 | 8 |
| 3 | Original | 64 | ParsedObjectTestControl | 752.70 | 21.34 | 2.84 | 749.21 | 591 | 16 | 8 |
| 3 | Original | 64 | ProgrammaticIntExisting | 703.06 | 14.26 | 2.03 | 700.68 | 588 | 15 | 8 |
| 3 | Original | 64 | ProgrammaticNullExisting | 774.09 | 32.79 | 4.24 | 769.55 | 603 | 15 | 8 |
| 3 | Candidate | 1 | ParsedIntExisting | 810.86 | 269.43 | 33.23 | 650.90 | 633 | 20 | 8 |
| 3 | Candidate | 1 | ParsedObjectExisting | 763.15 | 44.40 | 5.82 | 753.64 | 589 | 20 | 8 |
| 3 | Candidate | 1 | ParsedObjectMissing | 906.65 | 49.52 | 5.46 | 893.32 | 775 | 15 | 8 |
| 3 | Candidate | 1 | ParsedObjectTestControl | 749.82 | 16.96 | 2.26 | 747.97 | 591 | 15 | 8 |
| 3 | Candidate | 1 | ProgrammaticIntExisting | 687.56 | 21.05 | 3.06 | 682.69 | 589 | 20 | 8 |
| 3 | Candidate | 1 | ProgrammaticNullExisting | 763.40 | 13.02 | 1.71 | 769.91 | 604 | 15 | 8 |
| 3 | Candidate | 64 | ParsedIntExisting | 738.78 | 14.32 | 1.94 | 739.03 | 630 | 20 | 8 |
| 3 | Candidate | 64 | ParsedObjectExisting | 747.61 | 9.68 | 1.29 | 750.26 | 588 | 20 | 8 |
| 3 | Candidate | 64 | ParsedObjectMissing | 917.66 | 23.86 | 2.60 | 909.84 | 776 | 16 | 8 |
| 3 | Candidate | 64 | ParsedObjectTestControl | 812.62 | 37.95 | 4.67 | 804.58 | 591 | 15 | 8 |
| 3 | Candidate | 64 | ProgrammaticIntExisting | 697.17 | 40.76 | 5.85 | 685.23 | 588 | 15 | 8 |
| 3 | Candidate | 64 | ProgrammaticNullExisting | 771.11 | 18.04 | 2.34 | 769.93 | 604 | 16 | 8 |

Overhead is BDN-adaptive; the audit uses every actually emitted overhead sample and its median correction.
BDN0.13 abbreviates long string values even in JSON Parameters. Identity comes from untruncated FullName,
uniquely bound to the exact raw DisplayInfo; no profile is guessed from a truncated label.

Pair1: Original then Candidate; [authorization](comparison-001/authorization.json), [actual completion receipt](comparison-001/execution-receipt.json).
Original: [raw stdout](comparison-001/Original/stdout.txt), [full JSON](comparison-001/Original/reports/results/AutoPerf.DictionaryReplaceBenchmarks-report-full.json), [exact command/result](comparison-001/Original/command.json).
Candidate: [raw stdout](comparison-001/Candidate/stdout.txt), [full JSON](comparison-001/Candidate/reports/results/AutoPerf.DictionaryReplaceBenchmarks-report-full.json), [exact command/result](comparison-001/Candidate/command.json).

Pair2: Candidate then Original; [authorization](comparison-002/authorization.json), [actual completion receipt](comparison-002/execution-receipt.json).
Original: [raw stdout](comparison-002/Original/stdout.txt), [full JSON](comparison-002/Original/reports/results/AutoPerf.DictionaryReplaceBenchmarks-report-full.json), [exact command/result](comparison-002/Original/command.json).
Candidate: [raw stdout](comparison-002/Candidate/stdout.txt), [full JSON](comparison-002/Candidate/reports/results/AutoPerf.DictionaryReplaceBenchmarks-report-full.json), [exact command/result](comparison-002/Candidate/command.json).

Pair3: Original then Candidate; [authorization](comparison-003/authorization.json), [actual completion receipt](comparison-003/execution-receipt.json).
Original: [raw stdout](comparison-003/Original/stdout.txt), [full JSON](comparison-003/Original/reports/results/AutoPerf.DictionaryReplaceBenchmarks-report-full.json), [exact command/result](comparison-003/Original/command.json).
Candidate: [raw stdout](comparison-003/Candidate/stdout.txt), [full JSON](comparison-003/Candidate/reports/results/AutoPerf.DictionaryReplaceBenchmarks-report-full.json), [exact command/result](comparison-003/Candidate/command.json).
