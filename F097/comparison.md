# F097 actual comparisons and controls

Three unchanged-candidate comparisons, AB/BA/AB. Every regression and variance remains. Positive speedup is faster; negative is slower. **Overlap8 reports one eight-request batch**, not one call.

| Operation | Default | Workload | Mean speedup range % | Median pair mean speedup % | Original B/op range | Proposed B/op range | Saved B/op range |
|---|---|---|---:|---:|---:|---:|---:|
| Constructor | Finite | ObjectDeferred | 1.38 to 4.30 | 4.21 | 1264 | 912 | 352 |
| Constructor | Finite | ObjectInline | 2.38 to 5.86 | 2.94 | 928 | 576 | 352 |
| Constructor | Finite | Overlap8 | -6.69 to -1.95 | -4.28 | 10457 | 9657 | 800 |
| Constructor | Finite | WindowDeferred | -1.06 to 5.56 | 0.58 | 1264 | 912 | 352 |
| Constructor | Finite | WindowInline | 5.58 to 5.92 | 5.62 | 928 | 576 | 352 |
| Constructor | Unconfigured | ObjectDeferred | -1.79 to 1.44 | -0.56 | 864 | 816 | 48 |
| Constructor | Unconfigured | ObjectInline | -15.86 to 4.30 | 2.61 | 528 | 480 | 48 |
| Constructor | Unconfigured | Overlap8 | -1.77 to 3.50 | 1.01 | 7256 | 6872 | 384 |
| Constructor | Unconfigured | WindowDeferred | -1.80 to 1.53 | 0.47 | 864 | 816 | 48 |
| Constructor | Unconfigured | WindowInline | 1.37 to 3.03 | 2.26 | 528 | 480 | 48 |
| Get | Finite | ObjectDeferred | 0.22 to 9.46 | 7.86 | 1120 | 768 | 352 |
| Get | Finite | ObjectInline | 5.26 to 9.27 | 8.78 | 792 | 440 | 352 |
| Get | Finite | Overlap8 | -12.11 to -2.20 | -2.92 | 9304 | 8504 | 800 |
| Get | Finite | WindowDeferred | -0.04 to 9.62 | 5.25 | 1120 | 768 | 352 |
| Get | Finite | WindowInline | 5.44 to 11.75 | 8.86 | 792 | 440 | 352 |
| Get | Unconfigured | ObjectDeferred | -1.21 to 3.22 | 1.01 | 720 | 672 | 48 |
| Get | Unconfigured | ObjectInline | -2.93 to 1.49 | 1.17 | 392 | 344 | 48 |
| Get | Unconfigured | Overlap8 | -1.47 to 3.44 | 1.85 | 6104 | 5720 | 384 |
| Get | Unconfigured | WindowDeferred | -3.23 to 0.68 | -0.83 | 720 | 672 | 48 |
| Get | Unconfigured | WindowInline | -0.89 to 2.95 | 0.57 | 392 | 344 | 48 |
| Invoke | Finite | ObjectDeferred | 2.41 to 4.30 | 3.20 | 1192 | 840 | 352 |
| Invoke | Finite | ObjectInline | 2.79 to 10.00 | 6.34 | 864 | 512 | 352 |
| Invoke | Finite | Overlap8 | -3.73 to -0.74 | -2.77 | 9880 | 9080 | 800 |
| Invoke | Finite | WindowDeferred | 2.87 to 3.67 | 3.66 | 1192 | 840 | 352 |
| Invoke | Finite | WindowInline | -17.55 to 37.79 | -3.23 | 856 | 504 | 352 |
| Invoke | Unconfigured | ObjectDeferred | -1.70 to 0.91 | 0.36 | 792 | 744 | 48 |
| Invoke | Unconfigured | ObjectInline | -1.63 to 3.17 | 2.01 | 464 | 416 | 48 |
| Invoke | Unconfigured | Overlap8 | -1.03 to 1.11 | -0.10 | 6680 | 6296 | 384 |
| Invoke | Unconfigured | WindowDeferred | -0.67 to 1.49 | -0.09 | 792 | 744 | 48 |
| Invoke | Unconfigured | WindowInline | 0.21 to 2.56 | 0.41 | 464 | 416 | 48 |
| InvokeVoid | Finite | ObjectDeferred | 1.91 to 2.78 | 2.19 | 1312 | 960 | 352 |
| InvokeVoid | Finite | ObjectInline | 5.40 to 10.95 | 5.79 | 840 | 488 | 352 |
| InvokeVoid | Finite | Overlap8 | -3.77 to -2.13 | -2.55 | 10841 | 10041 | 800 |
| InvokeVoid | Finite | WindowDeferred | 1.84 to 5.12 | 4.17 | 1312 | 960 | 352 |
| InvokeVoid | Finite | WindowInline | 6.06 to 9.55 | 8.36 | 840 | 488 | 352 |
| InvokeVoid | Unconfigured | ObjectDeferred | -1.16 to 0.93 | 0.89 | 912 | 864 | 48 |
| InvokeVoid | Unconfigured | ObjectInline | -1.71 to 3.94 | -0.42 | 440 | 392 | 48 |
| InvokeVoid | Unconfigured | Overlap8 | -1.29 to 2.24 | 0.76 | 7640 | 7256 | 384 |
| InvokeVoid | Unconfigured | WindowDeferred | 0.00 to 1.26 | 0.65 | 912 | 864 | 48 |
| InvokeVoid | Unconfigured | WindowInline | -0.14 to 5.03 | 0.08 | 440 | 392 | 48 |
| Set | Finite | ObjectDeferred | 2.25 to 6.46 | 5.50 | 1336 | 984 | 352 |
| Set | Finite | ObjectInline | 3.88 to 10.48 | 9.46 | 864 | 512 | 352 |
| Set | Finite | Overlap8 | -3.69 to 0.34 | -1.93 | 11032 to 11033 | 10233 | 799 to 800 |
| Set | Finite | WindowDeferred | 0.45 to 5.02 | 4.38 | 1336 | 984 | 352 |
| Set | Finite | WindowInline | 3.85 to 10.21 | 8.08 | 864 | 512 | 352 |
| Set | Unconfigured | ObjectDeferred | 0.81 to 1.68 | 1.06 | 936 | 888 | 48 |
| Set | Unconfigured | ObjectInline | -0.56 to 4.23 | 2.11 | 464 | 416 | 48 |
| Set | Unconfigured | Overlap8 | 0.69 to 2.23 | 1.16 | 7832 | 7448 | 384 |
| Set | Unconfigured | WindowDeferred | -2.63 to 1.49 | 0.18 | 936 | 888 | 48 |
| Set | Unconfigured | WindowInline | 2.00 to 5.48 | 3.67 | 464 | 416 | 48 |

## Every actual paired outcome

| Pair | Operation | Default | Workload | Original mean ns | Proposed mean ns | Mean speedup % | Median speedup % | Original CV % | Proposed CV % | Original B/op | Proposed B/op |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Invoke | Finite | WindowInline | 1787.882 | 1845.653 | -3.23 | 0.37 | 36.87 | 43.15 | 856 | 504 |
| 1 | Invoke | Finite | WindowDeferred | 1097.909 | 1057.595 | 3.67 | 3.95 | 0.61 | 1.05 | 1192 | 840 |
| 1 | Invoke | Finite | ObjectInline | 885.110 | 796.601 | 10.00 | 8.99 | 4.50 | 0.92 | 864 | 512 |
| 1 | Invoke | Finite | ObjectDeferred | 1107.865 | 1072.442 | 3.20 | 3.58 | 0.96 | 1.73 | 1192 | 840 |
| 1 | Invoke | Finite | Overlap8 | 8911.515 | 9158.131 | -2.77 | -2.80 | 0.63 | 0.87 | 9880 | 9080 |
| 1 | Invoke | Unconfigured | WindowInline | 648.013 | 631.422 | 2.56 | 2.37 | 1.15 | 0.59 | 464 | 416 |
| 1 | Invoke | Unconfigured | WindowDeferred | 890.732 | 877.482 | 1.49 | 1.22 | 0.96 | 0.59 | 792 | 744 |
| 1 | Invoke | Unconfigured | ObjectInline | 660.161 | 639.230 | 3.17 | 2.56 | 1.81 | 0.67 | 464 | 416 |
| 1 | Invoke | Unconfigured | ObjectDeferred | 891.367 | 888.134 | 0.36 | 0.31 | 0.63 | 0.62 | 792 | 744 |
| 1 | Invoke | Unconfigured | Overlap8 | 6998.706 | 6920.824 | 1.11 | 1.06 | 0.49 | 0.76 | 6680 | 6296 |
| 1 | InvokeVoid | Finite | WindowInline | 930.171 | 841.353 | 9.55 | 9.91 | 0.81 | 1.69 | 840 | 488 |
| 1 | InvokeVoid | Finite | WindowDeferred | 1296.758 | 1230.315 | 5.12 | 5.49 | 0.91 | 1.00 | 1312 | 960 |
| 1 | InvokeVoid | Finite | ObjectInline | 937.051 | 834.404 | 10.95 | 10.71 | 0.64 | 0.45 | 840 | 488 |
| 1 | InvokeVoid | Finite | ObjectDeferred | 1307.976 | 1271.574 | 2.78 | 4.31 | 0.77 | 4.62 | 1312 | 960 |
| 1 | InvokeVoid | Finite | Overlap8 | 10231.086 | 10491.693 | -2.55 | -2.52 | 0.86 | 0.68 | 10841 | 10041 |
| 1 | InvokeVoid | Unconfigured | WindowInline | 705.442 | 669.968 | 5.03 | 5.05 | 0.77 | 1.01 | 440 | 392 |
| 1 | InvokeVoid | Unconfigured | WindowDeferred | 1085.468 | 1071.796 | 1.26 | 1.28 | 0.72 | 0.94 | 912 | 864 |
| 1 | InvokeVoid | Unconfigured | ObjectInline | 696.080 | 668.648 | 3.94 | 4.05 | 0.38 | 0.34 | 440 | 392 |
| 1 | InvokeVoid | Unconfigured | ObjectDeferred | 1085.586 | 1075.882 | 0.89 | 1.09 | 0.93 | 1.26 | 912 | 864 |
| 1 | InvokeVoid | Unconfigured | Overlap8 | 8357.294 | 8169.825 | 2.24 | 2.30 | 1.32 | 0.93 | 7640 | 7256 |
| 1 | Constructor | Finite | WindowInline | 1002.893 | 946.922 | 5.58 | 5.37 | 0.85 | 0.85 | 928 | 576 |
| 1 | Constructor | Finite | WindowDeferred | 1290.859 | 1219.027 | 5.56 | 5.75 | 0.48 | 1.00 | 1264 | 912 |
| 1 | Constructor | Finite | ObjectInline | 1005.988 | 947.009 | 5.86 | 5.16 | 1.91 | 0.83 | 928 | 576 |
| 1 | Constructor | Finite | ObjectDeferred | 1278.798 | 1223.803 | 4.30 | 4.40 | 0.90 | 1.15 | 1264 | 912 |
| 1 | Constructor | Finite | Overlap8 | 10174.284 | 10372.479 | -1.95 | -1.61 | 1.49 | 0.83 | 10457 | 9657 |
| 1 | Constructor | Unconfigured | WindowInline | 786.291 | 762.450 | 3.03 | 3.21 | 0.68 | 1.09 | 528 | 480 |
| 1 | Constructor | Unconfigured | WindowDeferred | 1068.838 | 1052.511 | 1.53 | 1.29 | 1.12 | 1.26 | 864 | 816 |
| 1 | Constructor | Unconfigured | ObjectInline | 787.966 | 754.068 | 4.30 | 3.94 | 1.15 | 0.71 | 528 | 480 |
| 1 | Constructor | Unconfigured | ObjectDeferred | 1071.071 | 1055.662 | 1.44 | 1.15 | 4.30 | 3.35 | 864 | 816 |
| 1 | Constructor | Unconfigured | Overlap8 | 8333.178 | 8480.772 | -1.77 | 0.92 | 0.44 | 5.48 | 7256 | 6872 |
| 1 | Get | Finite | WindowInline | 688.562 | 607.672 | 11.75 | 11.73 | 0.37 | 0.76 | 792 | 440 |
| 1 | Get | Finite | WindowDeferred | 934.667 | 885.611 | 5.25 | 8.85 | 0.89 | 10.96 | 1120 | 768 |
| 1 | Get | Finite | ObjectInline | 678.816 | 619.186 | 8.78 | 9.40 | 0.66 | 2.41 | 792 | 440 |
| 1 | Get | Finite | ObjectDeferred | 939.197 | 850.332 | 9.46 | 9.72 | 0.90 | 0.99 | 1120 | 768 |
| 1 | Get | Finite | Overlap8 | 7392.285 | 7555.247 | -2.20 | -1.97 | 0.68 | 1.28 | 9304 | 8504 |
| 1 | Get | Unconfigured | WindowInline | 460.460 | 446.877 | 2.95 | 1.91 | 3.68 | 1.32 | 392 | 344 |
| 1 | Get | Unconfigured | WindowDeferred | 691.363 | 686.693 | 0.68 | 2.52 | 0.69 | 4.85 | 720 | 672 |
| 1 | Get | Unconfigured | ObjectInline | 461.095 | 454.242 | 1.49 | 0.99 | 1.53 | 0.66 | 392 | 344 |
| 1 | Get | Unconfigured | ObjectDeferred | 706.014 | 683.299 | 3.22 | 3.07 | 1.21 | 0.88 | 720 | 672 |
| 1 | Get | Unconfigured | Overlap8 | 5781.061 | 5582.151 | 3.44 | 4.31 | 0.43 | 3.44 | 6104 | 5720 |
| 1 | Set | Finite | WindowInline | 862.635 | 774.556 | 10.21 | 10.26 | 1.40 | 1.02 | 864 | 512 |
| 1 | Set | Finite | WindowDeferred | 1292.899 | 1236.265 | 4.38 | 5.60 | 1.11 | 4.31 | 1336 | 984 |
| 1 | Set | Finite | ObjectInline | 902.562 | 817.194 | 9.46 | 10.44 | 0.67 | 2.40 | 864 | 512 |
| 1 | Set | Finite | ObjectDeferred | 1311.175 | 1239.005 | 5.50 | 3.94 | 3.89 | 0.49 | 1336 | 984 |
| 1 | Set | Finite | Overlap8 | 10000.551 | 10193.424 | -1.93 | -2.07 | 0.77 | 0.66 | 11033 | 10233 |
| 1 | Set | Unconfigured | WindowInline | 632.201 | 609.029 | 3.67 | 3.63 | 0.92 | 0.92 | 464 | 416 |
| 1 | Set | Unconfigured | WindowDeferred | 1046.679 | 1044.789 | 0.18 | 0.23 | 0.89 | 0.98 | 936 | 888 |
| 1 | Set | Unconfigured | ObjectInline | 676.621 | 647.979 | 4.23 | 4.84 | 0.63 | 1.24 | 464 | 416 |
| 1 | Set | Unconfigured | ObjectDeferred | 1076.898 | 1058.837 | 1.68 | 2.10 | 0.95 | 1.47 | 936 | 888 |
| 1 | Set | Unconfigured | Overlap8 | 8133.892 | 8077.654 | 0.69 | 0.53 | 0.96 | 0.92 | 7832 | 7448 |
| 2 | Invoke | Finite | WindowInline | 2578.702 | 1604.122 | 37.79 | 40.98 | 48.20 | 44.26 | 856 | 504 |
| 2 | Invoke | Finite | WindowDeferred | 1100.533 | 1060.303 | 3.66 | 3.63 | 2.59 | 1.99 | 1192 | 840 |
| 2 | Invoke | Finite | ObjectInline | 840.717 | 817.247 | 2.79 | 2.88 | 1.34 | 0.69 | 864 | 512 |
| 2 | Invoke | Finite | ObjectDeferred | 1103.869 | 1056.352 | 4.30 | 3.65 | 2.29 | 0.90 | 1192 | 840 |
| 2 | Invoke | Finite | Overlap8 | 8686.131 | 9010.214 | -3.73 | -3.63 | 0.82 | 1.35 | 9880 | 9080 |
| 2 | Invoke | Unconfigured | WindowInline | 647.891 | 645.230 | 0.41 | -0.05 | 0.94 | 0.94 | 464 | 416 |
| 2 | Invoke | Unconfigured | WindowDeferred | 874.233 | 880.059 | -0.67 | -0.31 | 0.90 | 1.06 | 792 | 744 |
| 2 | Invoke | Unconfigured | ObjectInline | 657.403 | 644.159 | 2.01 | 0.55 | 4.37 | 1.11 | 464 | 416 |
| 2 | Invoke | Unconfigured | ObjectDeferred | 877.777 | 892.669 | -1.70 | -2.09 | 0.93 | 1.47 | 792 | 744 |
| 2 | Invoke | Unconfigured | Overlap8 | 6889.230 | 6896.229 | -0.10 | -0.89 | 2.58 | 1.46 | 6680 | 6296 |
| 2 | InvokeVoid | Finite | WindowInline | 901.294 | 846.711 | 6.06 | 6.07 | 0.83 | 0.54 | 840 | 488 |
| 2 | InvokeVoid | Finite | WindowDeferred | 1243.409 | 1220.564 | 1.84 | 2.20 | 0.69 | 1.08 | 1312 | 960 |
| 2 | InvokeVoid | Finite | ObjectInline | 895.362 | 847.051 | 5.40 | 5.37 | 1.31 | 0.43 | 840 | 488 |
| 2 | InvokeVoid | Finite | ObjectDeferred | 1262.228 | 1234.544 | 2.19 | 1.15 | 3.74 | 0.60 | 1312 | 960 |
| 2 | InvokeVoid | Finite | Overlap8 | 10052.087 | 10431.493 | -3.77 | -3.80 | 0.94 | 1.25 | 10841 | 10041 |
| 2 | InvokeVoid | Unconfigured | WindowInline | 684.691 | 684.111 | 0.08 | 0.65 | 0.73 | 1.60 | 440 | 392 |
| 2 | InvokeVoid | Unconfigured | WindowDeferred | 1065.541 | 1065.527 | 0.00 | -1.10 | 3.14 | 1.04 | 912 | 864 |
| 2 | InvokeVoid | Unconfigured | ObjectInline | 684.603 | 687.449 | -0.42 | -0.08 | 0.84 | 1.42 | 440 | 392 |
| 2 | InvokeVoid | Unconfigured | ObjectDeferred | 1056.648 | 1068.894 | -1.16 | -1.14 | 0.82 | 0.79 | 912 | 864 |
| 2 | InvokeVoid | Unconfigured | Overlap8 | 8165.213 | 8270.889 | -1.29 | -1.80 | 0.66 | 1.12 | 7640 | 7256 |
| 2 | Constructor | Finite | WindowInline | 985.182 | 929.846 | 5.62 | 4.23 | 4.16 | 0.65 | 928 | 576 |
| 2 | Constructor | Finite | WindowDeferred | 1218.673 | 1231.599 | -1.06 | -0.67 | 1.24 | 1.51 | 1264 | 912 |
| 2 | Constructor | Finite | ObjectInline | 970.199 | 941.666 | 2.94 | 2.47 | 2.41 | 0.75 | 928 | 576 |
| 2 | Constructor | Finite | ObjectDeferred | 1237.227 | 1220.108 | 1.38 | 0.88 | 1.82 | 0.61 | 1264 | 912 |
| 2 | Constructor | Finite | Overlap8 | 9924.224 | 10588.273 | -6.69 | -7.54 | 3.36 | 0.62 | 10457 | 9657 |
| 2 | Constructor | Unconfigured | WindowInline | 773.396 | 762.830 | 1.37 | 0.87 | 1.51 | 1.15 | 528 | 480 |
| 2 | Constructor | Unconfigured | WindowDeferred | 1045.107 | 1040.229 | 0.47 | 0.33 | 1.05 | 0.76 | 864 | 816 |
| 2 | Constructor | Unconfigured | ObjectInline | 770.960 | 893.252 | -15.86 | -11.30 | 0.95 | 12.36 | 528 | 480 |
| 2 | Constructor | Unconfigured | ObjectDeferred | 1045.136 | 1063.876 | -1.79 | -0.33 | 0.63 | 4.35 | 864 | 816 |
| 2 | Constructor | Unconfigured | Overlap8 | 8436.716 | 8141.442 | 3.50 | 2.68 | 3.41 | 0.87 | 7256 | 6872 |
| 2 | Get | Finite | WindowInline | 647.060 | 611.835 | 5.44 | 4.94 | 1.65 | 0.78 | 792 | 440 |
| 2 | Get | Finite | WindowDeferred | 839.422 | 839.741 | -0.04 | -0.11 | 1.21 | 0.94 | 1120 | 768 |
| 2 | Get | Finite | ObjectInline | 638.612 | 604.991 | 5.26 | 5.19 | 0.79 | 0.58 | 792 | 440 |
| 2 | Get | Finite | ObjectDeferred | 846.922 | 845.049 | 0.22 | 0.43 | 1.35 | 0.79 | 1120 | 768 |
| 2 | Get | Finite | Overlap8 | 6720.239 | 7534.385 | -12.11 | -11.04 | 1.40 | 4.47 | 9304 | 8504 |
| 2 | Get | Unconfigured | WindowInline | 450.437 | 447.852 | 0.57 | 0.29 | 1.12 | 0.86 | 392 | 344 |
| 2 | Get | Unconfigured | WindowDeferred | 652.244 | 673.342 | -3.23 | -3.02 | 1.14 | 1.45 | 720 | 672 |
| 2 | Get | Unconfigured | ObjectInline | 454.993 | 449.671 | 1.17 | 1.15 | 0.55 | 0.87 | 392 | 344 |
| 2 | Get | Unconfigured | ObjectDeferred | 665.157 | 673.198 | -1.21 | -2.45 | 3.88 | 1.24 | 720 | 672 |
| 2 | Get | Unconfigured | Overlap8 | 5404.013 | 5483.215 | -1.47 | -2.92 | 4.14 | 0.64 | 6104 | 5720 |
| 2 | Set | Finite | WindowInline | 807.658 | 776.601 | 3.85 | 3.19 | 2.05 | 0.54 | 864 | 512 |
| 2 | Set | Finite | WindowDeferred | 1214.335 | 1208.883 | 0.45 | 0.19 | 1.93 | 2.35 | 1336 | 984 |
| 2 | Set | Finite | ObjectInline | 830.296 | 798.110 | 3.88 | 3.84 | 0.73 | 0.91 | 864 | 512 |
| 2 | Set | Finite | ObjectDeferred | 1231.952 | 1204.267 | 2.25 | 2.91 | 1.79 | 0.79 | 1336 | 984 |
| 2 | Set | Finite | Overlap8 | 9735.251 | 10094.121 | -3.69 | -3.57 | 1.82 | 1.83 | 11032 | 10233 |
| 2 | Set | Unconfigured | WindowInline | 638.787 | 625.995 | 2.00 | 2.53 | 2.04 | 4.56 | 464 | 416 |
| 2 | Set | Unconfigured | WindowDeferred | 1003.912 | 1030.360 | -2.63 | -2.21 | 1.22 | 1.28 | 936 | 888 |
| 2 | Set | Unconfigured | ObjectInline | 650.447 | 636.691 | 2.11 | 2.03 | 0.94 | 0.70 | 464 | 416 |
| 2 | Set | Unconfigured | ObjectDeferred | 1065.045 | 1056.444 | 0.81 | 2.13 | 0.96 | 2.48 | 936 | 888 |
| 2 | Set | Unconfigured | Overlap8 | 8025.558 | 7846.597 | 2.23 | 2.08 | 1.35 | 1.03 | 7832 | 7448 |
| 3 | Invoke | Finite | WindowInline | 1443.844 | 1697.196 | -17.55 | -28.26 | 47.12 | 52.25 | 856 | 504 |
| 3 | Invoke | Finite | WindowDeferred | 1104.374 | 1072.663 | 2.87 | 3.14 | 0.69 | 1.71 | 1192 | 840 |
| 3 | Invoke | Finite | ObjectInline | 859.629 | 805.163 | 6.34 | 6.03 | 1.12 | 1.42 | 864 | 512 |
| 3 | Invoke | Finite | ObjectDeferred | 1098.705 | 1072.189 | 2.41 | 3.33 | 0.65 | 2.60 | 1192 | 840 |
| 3 | Invoke | Finite | Overlap8 | 9081.686 | 9148.706 | -0.74 | -0.80 | 1.26 | 1.01 | 9880 | 9080 |
| 3 | Invoke | Unconfigured | WindowInline | 638.729 | 637.407 | 0.21 | 0.03 | 1.31 | 1.10 | 464 | 416 |
| 3 | Invoke | Unconfigured | WindowDeferred | 888.356 | 889.175 | -0.09 | -0.02 | 0.89 | 1.02 | 792 | 744 |
| 3 | Invoke | Unconfigured | ObjectInline | 637.488 | 647.893 | -1.63 | -1.96 | 1.12 | 1.53 | 464 | 416 |
| 3 | Invoke | Unconfigured | ObjectDeferred | 894.613 | 886.465 | 0.91 | 0.61 | 0.75 | 0.83 | 792 | 744 |
| 3 | Invoke | Unconfigured | Overlap8 | 7013.370 | 7085.456 | -1.03 | -0.66 | 1.19 | 1.40 | 6680 | 6296 |
| 3 | InvokeVoid | Finite | WindowInline | 936.704 | 858.424 | 8.36 | 8.47 | 1.45 | 2.00 | 840 | 488 |
| 3 | InvokeVoid | Finite | WindowDeferred | 1291.536 | 1237.699 | 4.17 | 4.16 | 0.75 | 0.71 | 1312 | 960 |
| 3 | InvokeVoid | Finite | ObjectInline | 921.706 | 868.326 | 5.79 | 5.34 | 2.05 | 1.39 | 840 | 488 |
| 3 | InvokeVoid | Finite | ObjectDeferred | 1289.872 | 1265.284 | 1.91 | 2.04 | 0.72 | 1.01 | 1312 | 960 |
| 3 | InvokeVoid | Finite | Overlap8 | 10268.595 | 10487.603 | -2.13 | -1.93 | 0.82 | 1.46 | 10841 | 10041 |
| 3 | InvokeVoid | Unconfigured | WindowInline | 687.887 | 688.854 | -0.14 | -0.06 | 0.80 | 0.70 | 440 | 392 |
| 3 | InvokeVoid | Unconfigured | WindowDeferred | 1069.630 | 1062.658 | 0.65 | 0.70 | 0.69 | 0.73 | 912 | 864 |
| 3 | InvokeVoid | Unconfigured | ObjectInline | 681.540 | 693.176 | -1.71 | -1.29 | 0.48 | 1.73 | 440 | 392 |
| 3 | InvokeVoid | Unconfigured | ObjectDeferred | 1090.106 | 1079.929 | 0.93 | 1.47 | 0.60 | 1.23 | 912 | 864 |
| 3 | InvokeVoid | Unconfigured | Overlap8 | 8444.220 | 8380.138 | 0.76 | 0.82 | 1.19 | 1.12 | 7640 | 7256 |
| 3 | Constructor | Finite | WindowInline | 996.076 | 937.096 | 5.92 | 5.80 | 1.08 | 1.55 | 928 | 576 |
| 3 | Constructor | Finite | WindowDeferred | 1267.979 | 1260.584 | 0.58 | 2.13 | 0.65 | 4.47 | 1264 | 912 |
| 3 | Constructor | Finite | ObjectInline | 998.113 | 974.337 | 2.38 | 4.25 | 0.34 | 6.83 | 928 | 576 |
| 3 | Constructor | Finite | ObjectDeferred | 1274.672 | 1221.048 | 4.21 | 3.97 | 1.23 | 0.84 | 1264 | 912 |
| 3 | Constructor | Finite | Overlap8 | 10171.340 | 10607.080 | -4.28 | -4.11 | 0.71 | 1.10 | 10457 | 9657 |
| 3 | Constructor | Unconfigured | WindowInline | 781.088 | 763.472 | 2.26 | 1.88 | 1.06 | 0.90 | 528 | 480 |
| 3 | Constructor | Unconfigured | WindowDeferred | 1044.760 | 1063.617 | -1.80 | -2.38 | 0.65 | 1.29 | 864 | 816 |
| 3 | Constructor | Unconfigured | ObjectInline | 783.544 | 763.105 | 2.61 | 3.52 | 1.04 | 1.30 | 528 | 480 |
| 3 | Constructor | Unconfigured | ObjectDeferred | 1053.705 | 1059.554 | -0.56 | 0.10 | 0.72 | 2.07 | 864 | 816 |
| 3 | Constructor | Unconfigured | Overlap8 | 8376.551 | 8291.605 | 1.01 | 0.48 | 2.46 | 1.16 | 7256 | 6872 |
| 3 | Get | Finite | WindowInline | 676.846 | 616.877 | 8.86 | 8.53 | 1.31 | 1.16 | 792 | 440 |
| 3 | Get | Finite | WindowDeferred | 945.341 | 854.356 | 9.62 | 9.38 | 2.56 | 2.33 | 1120 | 768 |
| 3 | Get | Finite | ObjectInline | 687.678 | 623.902 | 9.27 | 8.04 | 3.40 | 1.24 | 792 | 440 |
| 3 | Get | Finite | ObjectDeferred | 938.354 | 864.564 | 7.86 | 6.87 | 3.80 | 1.86 | 1120 | 768 |
| 3 | Get | Finite | Overlap8 | 7466.965 | 7684.927 | -2.92 | -3.53 | 2.36 | 2.50 | 9304 | 8504 |
| 3 | Get | Unconfigured | WindowInline | 457.277 | 461.355 | -0.89 | -1.11 | 1.81 | 1.78 | 392 | 344 |
| 3 | Get | Unconfigured | WindowDeferred | 704.122 | 709.934 | -0.83 | -2.32 | 4.37 | 1.89 | 720 | 672 |
| 3 | Get | Unconfigured | ObjectInline | 455.813 | 469.178 | -2.93 | -4.12 | 3.39 | 1.41 | 392 | 344 |
| 3 | Get | Unconfigured | ObjectDeferred | 717.461 | 710.231 | 1.01 | 1.35 | 1.67 | 1.64 | 720 | 672 |
| 3 | Get | Unconfigured | Overlap8 | 5667.631 | 5562.784 | 1.85 | 0.36 | 2.13 | 1.88 | 6104 | 5720 |
| 3 | Set | Finite | WindowInline | 862.443 | 792.792 | 8.08 | 8.44 | 1.64 | 2.14 | 864 | 512 |
| 3 | Set | Finite | WindowDeferred | 1294.547 | 1229.618 | 5.02 | 5.70 | 1.03 | 1.22 | 1336 | 984 |
| 3 | Set | Finite | ObjectInline | 910.762 | 815.354 | 10.48 | 9.29 | 3.84 | 2.05 | 864 | 512 |
| 3 | Set | Finite | ObjectDeferred | 1319.358 | 1234.069 | 6.46 | 6.20 | 3.31 | 1.41 | 1336 | 984 |
| 3 | Set | Finite | Overlap8 | 10117.577 | 10083.482 | 0.34 | 0.35 | 1.66 | 0.67 | 11033 | 10233 |
| 3 | Set | Unconfigured | WindowInline | 650.284 | 614.619 | 5.48 | 3.82 | 3.82 | 1.03 | 464 | 416 |
| 3 | Set | Unconfigured | WindowDeferred | 1059.346 | 1043.553 | 1.49 | 1.57 | 1.52 | 0.82 | 936 | 888 |
| 3 | Set | Unconfigured | ObjectInline | 654.669 | 658.338 | -0.56 | -0.95 | 1.27 | 1.07 | 464 | 416 |
| 3 | Set | Unconfigured | ObjectDeferred | 1069.493 | 1058.130 | 1.06 | 0.69 | 2.66 | 2.00 | 936 | 888 |
| 3 | Set | Unconfigured | Overlap8 | 8137.276 | 8042.513 | 1.16 | 1.51 | 0.98 | 1.41 | 7832 | 7448 |

300 actual outcomes/150 pairs,2400 actual retained results,900 actual warmups and300 exact owner/harness/PID-linked protocol/result setup receipts. Requested100ms iterations,3 warmups/8 retained results,DontRemove,in-process Release/x64/server-concurrent GC. This shared-machine sample is not isolated production throughput.

Raw console GC totals/rounding and actual retained-sample mean/variance/SD/SE/median are recomputed. Reported CI mean/SE/lower/upper arithmetic is checked; confidence-distribution quantiles are not independently recomputed. No-default controls save48B/call separately. Fresh-runtime observations and one-slot idle retention are not silently dropped.
