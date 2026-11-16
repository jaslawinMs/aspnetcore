# F088: every measured target and control

Three unchanged-strategy comparisons, AB/BA/AB. Negative time/allocation change means faster/less.
The median is of three paired changes, not a ratio of pooled means. ns and B/op are per operation.
Prepared table rendering and full provider/component/HTML rendering are different boundaries.

| Profile | Method | Median time change % | Before B/op | After B/op | Median heap change % |
|---|---|---:|---:|---:|---:|
| Left2x3 | PreparedRenderBlock | -35.96 | 1384 | 520 | -62.43 |
| Left2x3 | ProviderComponentHtml | -10.95 | 31740 | 25692 | -19.05 |
| Left2x3 | CustomProviderComponentHtml | 3.16 | 18834 | 18834 | 0.00 |
| Center2x3 | PreparedRenderBlock | -37.35 | 1480 | 520 | -64.86 |
| Center2x3 | ProviderComponentHtml | 8.29 | 32578 | 25778 | -20.87 |
| Center2x3 | CustomProviderComponentHtml | -0.23 | 18835 | 18834 | -0.01 |
| Right2x3 | PreparedRenderBlock | -35.96 | 1432 | 520 | -63.69 |
| Right2x3 | ProviderComponentHtml | -7.96 | 32085 | 25700 | -19.90 |
| Right2x3 | CustomProviderComponentHtml | -0.58 | 18835 | 18834 | -0.01 |
| Mixed8x3 | PreparedRenderBlock | -41.02 | 5128 | 1480 | -71.14 |
| Mixed8x3 | ProviderComponentHtml | -18.26 | 62209 | 36670 | -41.05 |
| Mixed8x3 | CustomProviderComponentHtml | 2.84 | 18835 | 18835 | 0.00 |
| Mixed32x8 | PreparedRenderBlock | -43.55 | 50379 | 11721 | -76.73 |
| Mixed32x8 | ProviderComponentHtml | -26.71 | 434218 | 163601 | -62.32 |
| Mixed32x8 | CustomProviderComponentHtml | -1.81 | 18835 | 18834 | 0.00 |
| SparseMixed8x7 | PreparedRenderBlock | -17.86 | 8457 | 4808 | -43.15 |
| SparseMixed8x7 | ProviderComponentHtml | -10.92 | 91790 | 66251 | -27.82 |
| SparseMixed8x7 | CustomProviderComponentHtml | 2.42 | 18835 | 18834 | 0.00 |
| None8x3 | PreparedRenderBlock | -3.95 | 1480 | 1480 | 0.00 |
| None8x3 | ProviderComponentHtml | -1.31 | 32485 | 32485 | 0.00 |
| None8x3 | CustomProviderComponentHtml | -1.11 | 18834 | 18834 | 0.00 |
| Missing8x3 | PreparedRenderBlock | 4.75 | 1480 | 1480 | 0.00 |
| Missing8x3 | ProviderComponentHtml | 1.67 | 32485 | 32485 | 0.00 |
| Missing8x3 | CustomProviderComponentHtml | -1.13 | 18834 | 18835 | 0.00 |
| Negative8x3 | PreparedRenderBlock | 3.04 | 4936 | 4936 | 0.00 |
| Negative8x3 | ProviderComponentHtml | -1.25 | 60721 | 60721 | 0.00 |
| Negative8x3 | CustomProviderComponentHtml | 0.78 | 18835 | 18835 | 0.00 |
| Positive8x3 | PreparedRenderBlock | 2.45 | 4168 | 4168 | 0.00 |
| Positive8x3 | ProviderComponentHtml | 0.15 | 55345 | 55345 | 0.00 |
| Positive8x3 | CustomProviderComponentHtml | -0.79 | 18835 | 18834 | 0.00 |
| PlainParagraph | PreparedRenderBlock | -5.19 | 128 | 128 | 0.00 |
| PlainParagraph | ProviderComponentHtml | -1.41 | 22578 | 22578 | 0.00 |
| PlainParagraph | CustomProviderComponentHtml | -1.14 | 19274 | 19274 | 0.00 |

## Every paired round and retained variability

| Profile | Method | Round | Before ns | After ns | Time change % | Before B/op | After B/op | Heap change B | Before CV % | After CV % |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Left2x3 | PreparedRenderBlock | 1 | 1086.50 | 695.82 | -35.96 | 1384 | 520 | -864 | 5.57 | 3.83 |
| Left2x3 | PreparedRenderBlock | 2 | 1165.17 | 688.85 | -40.88 | 1384 | 520 | -864 | 3.42 | 4.79 |
| Left2x3 | PreparedRenderBlock | 3 | 1044.58 | 717.07 | -31.35 | 1384 | 520 | -864 | 1.36 | 3.92 |
| Left2x3 | ProviderComponentHtml | 1 | 35739.42 | 31130.50 | -12.90 | 31740 | 25692 | -6048 | 5.70 | 2.81 |
| Left2x3 | ProviderComponentHtml | 2 | 34133.84 | 30787.90 | -9.80 | 31740 | 25692 | -6048 | 1.71 | 3.00 |
| Left2x3 | ProviderComponentHtml | 3 | 34442.03 | 30671.76 | -10.95 | 31740 | 25692 | -6048 | 2.69 | 1.87 |
| Left2x3 | CustomProviderComponentHtml | 1 | 16670.08 | 17548.93 | 5.27 | 18834 | 18835 | 1 | 0.81 | 3.97 |
| Left2x3 | CustomProviderComponentHtml | 2 | 17285.11 | 17510.94 | 1.31 | 18835 | 18834 | -1 | 4.43 | 2.97 |
| Left2x3 | CustomProviderComponentHtml | 3 | 16835.07 | 17367.81 | 3.16 | 18834 | 18834 | 0 | 0.76 | 4.53 |
| Center2x3 | PreparedRenderBlock | 1 | 1075.36 | 708.49 | -34.12 | 1480 | 520 | -960 | 4.21 | 3.53 |
| Center2x3 | PreparedRenderBlock | 2 | 1148.02 | 670.05 | -41.63 | 1480 | 520 | -960 | 6.29 | 1.14 |
| Center2x3 | PreparedRenderBlock | 3 | 1080.35 | 676.85 | -37.35 | 1480 | 520 | -960 | 1.71 | 3.13 |
| Center2x3 | ProviderComponentHtml | 1 | 43720.91 | 52818.02 | 20.81 | 32578 | 25778 | -6800 | 12.19 | 33.08 |
| Center2x3 | ProviderComponentHtml | 2 | 45417.34 | 48948.74 | 7.78 | 32476 | 25778 | -6698 | 14.02 | 25.43 |
| Center2x3 | ProviderComponentHtml | 3 | 63221.21 | 68462.60 | 8.29 | 32579 | 25776 | -6803 | 16.95 | 57.35 |
| Center2x3 | CustomProviderComponentHtml | 1 | 16729.69 | 17029.99 | 1.80 | 18834 | 18834 | 0 | 0.58 | 1.65 |
| Center2x3 | CustomProviderComponentHtml | 2 | 17341.39 | 16918.67 | -2.44 | 18835 | 18834 | -1 | 3.36 | 1.91 |
| Center2x3 | CustomProviderComponentHtml | 3 | 17211.96 | 17171.94 | -0.23 | 18835 | 18834 | -1 | 1.19 | 3.57 |
| Right2x3 | PreparedRenderBlock | 1 | 1033.22 | 711.57 | -31.13 | 1432 | 520 | -912 | 0.73 | 1.28 |
| Right2x3 | PreparedRenderBlock | 2 | 1088.96 | 666.32 | -38.81 | 1432 | 520 | -912 | 1.04 | 0.76 |
| Right2x3 | PreparedRenderBlock | 3 | 1061.11 | 679.58 | -35.96 | 1432 | 520 | -912 | 0.88 | 1.34 |
| Right2x3 | ProviderComponentHtml | 1 | 33971.77 | 30508.98 | -10.19 | 32085 | 25700 | -6385 | 2.42 | 1.87 |
| Right2x3 | ProviderComponentHtml | 2 | 33669.63 | 31853.99 | -5.39 | 32085 | 25700 | -6385 | 1.40 | 3.12 |
| Right2x3 | ProviderComponentHtml | 3 | 33840.14 | 31147.24 | -7.96 | 32085 | 25700 | -6385 | 1.58 | 1.07 |
| Right2x3 | CustomProviderComponentHtml | 1 | 17421.22 | 16927.20 | -2.84 | 18835 | 18834 | -1 | 4.98 | 1.29 |
| Right2x3 | CustomProviderComponentHtml | 2 | 17093.76 | 17058.13 | -0.21 | 18834 | 18835 | 1 | 1.22 | 1.82 |
| Right2x3 | CustomProviderComponentHtml | 3 | 17071.23 | 16972.01 | -0.58 | 18835 | 18834 | -1 | 2.00 | 1.51 |
| Mixed8x3 | PreparedRenderBlock | 1 | 3839.23 | 2187.54 | -43.02 | 5128 | 1480 | -3648 | 5.29 | 2.20 |
| Mixed8x3 | PreparedRenderBlock | 2 | 3701.48 | 2183.10 | -41.02 | 5128 | 1480 | -3648 | 0.76 | 2.28 |
| Mixed8x3 | PreparedRenderBlock | 3 | 3668.43 | 2218.50 | -39.52 | 5128 | 1480 | -3648 | 2.06 | 2.45 |
| Mixed8x3 | ProviderComponentHtml | 1 | 65893.82 | 52672.57 | -20.06 | 62209 | 36669 | -25540 | 2.07 | 1.63 |
| Mixed8x3 | ProviderComponentHtml | 2 | 65700.22 | 55443.90 | -15.61 | 62209 | 36670 | -25539 | 4.59 | 2.92 |
| Mixed8x3 | ProviderComponentHtml | 3 | 66534.77 | 54386.69 | -18.26 | 62209 | 36670 | -25539 | 1.01 | 1.89 |
| Mixed8x3 | CustomProviderComponentHtml | 1 | 16987.89 | 16862.53 | -0.74 | 18835 | 18835 | 0 | 1.28 | 1.13 |
| Mixed8x3 | CustomProviderComponentHtml | 2 | 17244.69 | 17733.64 | 2.84 | 18835 | 18835 | 0 | 1.17 | 3.71 |
| Mixed8x3 | CustomProviderComponentHtml | 3 | 17045.36 | 17627.09 | 3.41 | 18834 | 18834 | 0 | 1.03 | 4.47 |
| Mixed32x8 | PreparedRenderBlock | 1 | 41883.37 | 19792.63 | -52.74 | 50380 | 11721 | -38659 | 1.85 | 1.13 |
| Mixed32x8 | PreparedRenderBlock | 2 | 35902.52 | 20550.37 | -42.76 | 50379 | 11721 | -38658 | 3.11 | 2.78 |
| Mixed32x8 | PreparedRenderBlock | 3 | 36050.23 | 20351.88 | -43.55 | 50379 | 11721 | -38658 | 5.93 | 1.58 |
| Mixed32x8 | ProviderComponentHtml | 1 | 427170.47 | 313076.07 | -26.71 | 434218 | 163603 | -270615 | 4.90 | 1.21 |
| Mixed32x8 | ProviderComponentHtml | 2 | 450597.27 | 307208.71 | -31.82 | 434221 | 163600 | -270621 | 0.69 | 1.08 |
| Mixed32x8 | ProviderComponentHtml | 3 | 434972.86 | 324527.50 | -25.39 | 434218 | 163601 | -270617 | 1.63 | 2.84 |
| Mixed32x8 | CustomProviderComponentHtml | 1 | 17285.50 | 16768.31 | -2.99 | 18835 | 18835 | 0 | 2.90 | 0.80 |
| Mixed32x8 | CustomProviderComponentHtml | 2 | 17140.78 | 17166.00 | 0.15 | 18834 | 18834 | 0 | 2.56 | 1.64 |
| Mixed32x8 | CustomProviderComponentHtml | 3 | 17244.36 | 16932.85 | -1.81 | 18835 | 18834 | -1 | 1.68 | 1.18 |
| SparseMixed8x7 | PreparedRenderBlock | 1 | 6784.23 | 5368.12 | -20.87 | 8457 | 4808 | -3649 | 2.60 | 2.66 |
| SparseMixed8x7 | PreparedRenderBlock | 2 | 6671.12 | 5479.47 | -17.86 | 8457 | 4808 | -3649 | 1.20 | 1.63 |
| SparseMixed8x7 | PreparedRenderBlock | 3 | 6456.96 | 5364.02 | -16.93 | 8457 | 4808 | -3649 | 0.80 | 2.15 |
| SparseMixed8x7 | ProviderComponentHtml | 1 | 103254.87 | 91977.17 | -10.92 | 91791 | 66250 | -25541 | 2.02 | 1.02 |
| SparseMixed8x7 | ProviderComponentHtml | 2 | 102326.86 | 92906.42 | -9.21 | 91790 | 66251 | -25539 | 0.98 | 0.94 |
| SparseMixed8x7 | ProviderComponentHtml | 3 | 106309.78 | 93124.47 | -12.40 | 91790 | 66251 | -25539 | 3.67 | 1.37 |
| SparseMixed8x7 | CustomProviderComponentHtml | 1 | 17595.35 | 18020.91 | 2.42 | 18835 | 18834 | -1 | 4.09 | 6.24 |
| SparseMixed8x7 | CustomProviderComponentHtml | 2 | 16933.60 | 17536.21 | 3.56 | 18835 | 18835 | 0 | 1.03 | 4.23 |
| SparseMixed8x7 | CustomProviderComponentHtml | 3 | 17097.53 | 17233.89 | 0.80 | 18834 | 18834 | 0 | 0.94 | 3.41 |
| None8x3 | PreparedRenderBlock | 1 | 1884.22 | 1748.87 | -7.18 | 1480 | 1480 | 0 | 2.13 | 0.91 |
| None8x3 | PreparedRenderBlock | 2 | 1750.22 | 1715.02 | -2.01 | 1480 | 1480 | 0 | 0.68 | 0.39 |
| None8x3 | PreparedRenderBlock | 3 | 1809.41 | 1737.99 | -3.95 | 1480 | 1480 | 0 | 0.59 | 1.74 |
| None8x3 | ProviderComponentHtml | 1 | 52283.42 | 50148.02 | -4.08 | 32485 | 32485 | 0 | 3.94 | 0.91 |
| None8x3 | ProviderComponentHtml | 2 | 50067.75 | 50485.67 | 0.83 | 32485 | 32485 | 0 | 0.97 | 1.24 |
| None8x3 | ProviderComponentHtml | 3 | 51393.49 | 50719.34 | -1.31 | 32485 | 32485 | 0 | 0.91 | 1.45 |
| None8x3 | CustomProviderComponentHtml | 1 | 17310.05 | 16904.13 | -2.34 | 18834 | 18834 | 0 | 5.77 | 1.73 |
| None8x3 | CustomProviderComponentHtml | 2 | 17198.35 | 17007.03 | -1.11 | 18835 | 18835 | 0 | 1.70 | 0.70 |
| None8x3 | CustomProviderComponentHtml | 3 | 17105.56 | 18299.86 | 6.98 | 18834 | 18834 | 0 | 1.52 | 5.60 |
| Missing8x3 | PreparedRenderBlock | 1 | 1793.30 | 1878.39 | 4.75 | 1480 | 1480 | 0 | 1.49 | 4.08 |
| Missing8x3 | PreparedRenderBlock | 2 | 1829.06 | 2011.43 | 9.97 | 1480 | 1480 | 0 | 4.12 | 1.34 |
| Missing8x3 | PreparedRenderBlock | 3 | 1776.18 | 1724.56 | -2.91 | 1480 | 1480 | 0 | 1.01 | 1.80 |
| Missing8x3 | ProviderComponentHtml | 1 | 52442.25 | 52461.80 | 0.04 | 32486 | 32485 | -1 | 1.66 | 0.59 |
| Missing8x3 | ProviderComponentHtml | 2 | 49451.01 | 51897.74 | 4.95 | 32485 | 32485 | 0 | 0.76 | 1.74 |
| Missing8x3 | ProviderComponentHtml | 3 | 50258.19 | 51095.22 | 1.67 | 32485 | 32486 | 1 | 1.27 | 2.83 |
| Missing8x3 | CustomProviderComponentHtml | 1 | 17472.14 | 17228.55 | -1.39 | 18835 | 18835 | 0 | 3.26 | 2.78 |
| Missing8x3 | CustomProviderComponentHtml | 2 | 17210.94 | 17015.91 | -1.13 | 18834 | 18835 | 1 | 2.20 | 0.63 |
| Missing8x3 | CustomProviderComponentHtml | 3 | 17226.93 | 17033.84 | -1.12 | 18834 | 18834 | 0 | 1.66 | 1.12 |
| Negative8x3 | PreparedRenderBlock | 1 | 3505.52 | 3612.16 | 3.04 | 4936 | 4936 | 0 | 3.04 | 2.15 |
| Negative8x3 | PreparedRenderBlock | 2 | 3610.87 | 3545.12 | -1.82 | 4936 | 4936 | 0 | 0.83 | 1.70 |
| Negative8x3 | PreparedRenderBlock | 3 | 3475.25 | 3849.88 | 10.78 | 4936 | 4936 | 0 | 0.76 | 9.13 |
| Negative8x3 | ProviderComponentHtml | 1 | 66670.27 | 63453.45 | -4.82 | 60721 | 60721 | 0 | 1.92 | 1.00 |
| Negative8x3 | ProviderComponentHtml | 2 | 65170.52 | 64354.96 | -1.25 | 60721 | 60721 | 0 | 3.12 | 1.73 |
| Negative8x3 | ProviderComponentHtml | 3 | 64164.35 | 63801.87 | -0.56 | 60721 | 60721 | 0 | 0.97 | 1.50 |
| Negative8x3 | CustomProviderComponentHtml | 1 | 17759.13 | 16836.04 | -5.20 | 18835 | 18835 | 0 | 5.28 | 0.68 |
| Negative8x3 | CustomProviderComponentHtml | 2 | 17058.09 | 17375.18 | 1.86 | 18835 | 18835 | 0 | 1.10 | 6.10 |
| Negative8x3 | CustomProviderComponentHtml | 3 | 16991.75 | 17124.65 | 0.78 | 18834 | 18834 | 0 | 1.43 | 1.28 |
| Positive8x3 | PreparedRenderBlock | 1 | 3308.39 | 3389.46 | 2.45 | 4168 | 4168 | 0 | 5.58 | 4.97 |
| Positive8x3 | PreparedRenderBlock | 2 | 3204.29 | 3624.92 | 13.13 | 4168 | 4168 | 0 | 2.21 | 3.98 |
| Positive8x3 | PreparedRenderBlock | 3 | 3453.17 | 3234.30 | -6.34 | 4168 | 4168 | 0 | 2.70 | 1.26 |
| Positive8x3 | ProviderComponentHtml | 1 | 63855.01 | 61172.83 | -4.20 | 55345 | 55345 | 0 | 2.64 | 0.78 |
| Positive8x3 | ProviderComponentHtml | 2 | 62496.80 | 62589.50 | 0.15 | 55345 | 55345 | 0 | 3.67 | 3.40 |
| Positive8x3 | ProviderComponentHtml | 3 | 62266.00 | 64855.22 | 4.16 | 55345 | 55345 | 0 | 1.38 | 3.29 |
| Positive8x3 | CustomProviderComponentHtml | 1 | 21619.85 | 16972.82 | -21.49 | 18834 | 18834 | 0 | 8.35 | 1.29 |
| Positive8x3 | CustomProviderComponentHtml | 2 | 16962.55 | 17472.63 | 3.01 | 18835 | 18834 | -1 | 0.48 | 4.11 |
| Positive8x3 | CustomProviderComponentHtml | 3 | 17167.78 | 17033.00 | -0.79 | 18835 | 18835 | 0 | 1.40 | 0.99 |
| PlainParagraph | PreparedRenderBlock | 1 | 180.34 | 174.59 | -3.19 | 128 | 128 | 0 | 3.84 | 0.92 |
| PlainParagraph | PreparedRenderBlock | 2 | 178.85 | 169.57 | -5.19 | 128 | 128 | 0 | 0.76 | 0.89 |
| PlainParagraph | PreparedRenderBlock | 3 | 183.84 | 173.47 | -5.64 | 128 | 128 | 0 | 3.01 | 0.89 |
| PlainParagraph | ProviderComponentHtml | 1 | 21328.38 | 20953.02 | -1.76 | 22578 | 22578 | 0 | 2.57 | 3.29 |
| PlainParagraph | ProviderComponentHtml | 2 | 20916.64 | 20620.81 | -1.41 | 22579 | 22578 | -1 | 0.72 | 0.82 |
| PlainParagraph | ProviderComponentHtml | 3 | 20790.72 | 20714.67 | -0.37 | 22578 | 22578 | 0 | 1.05 | 1.12 |
| PlainParagraph | CustomProviderComponentHtml | 1 | 17714.54 | 17234.98 | -2.71 | 19274 | 19274 | 0 | 4.39 | 4.07 |
| PlainParagraph | CustomProviderComponentHtml | 2 | 17519.98 | 17319.56 | -1.14 | 19274 | 19274 | 0 | 1.96 | 0.77 |
| PlainParagraph | CustomProviderComponentHtml | 3 | 17260.12 | 17087.75 | -1.00 | 19274 | 19274 | 0 | 0.74 | 1.18 |

All eight samples and raw console workload/result rows are retained and cross-checked in measurement-audit.json.
The short target and shared host do not establish production frequency, browser allocation, cold-process behavior or universal timing.
