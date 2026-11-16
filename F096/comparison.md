# F096 original managed interop pressure - not an optimization comparison

Original finite and infinity policies are different documented cancellation contracts. No source proposal is measured or justified. Every actual outcome is retained.

| Operation | Original deadline | Public reply | Mean ns | Median ns | CV % | Managed B/op |
|---|---|---|---:|---:|---:|---:|
| Constructor | Finite | Deferred | 1902.255 | 1780.480 | 48.93 | 920 |
| Constructor | Finite | Inline | 939.901 | 937.847 | 1.20 | 928 |
| Constructor | Infinite | Deferred | 715.346 | 712.999 | 0.99 | 528 |
| Constructor | Infinite | Inline | 719.628 | 718.153 | 0.61 | 528 |
| Get | Finite | Deferred | 638.877 | 637.320 | 0.93 | 792 |
| Get | Finite | Inline | 654.506 | 650.691 | 1.40 | 792 |
| Get | Infinite | Deferred | 430.230 | 430.030 | 0.87 | 392 |
| Get | Infinite | Inline | 438.805 | 437.689 | 0.66 | 392 |
| Invoke | Finite | Deferred | 971.572 | 969.037 | 1.03 | 1016 |
| Invoke | Finite | Inline | 886.512 | 880.511 | 1.69 | 936 |
| Invoke | Infinite | Deferred | 758.427 | 752.145 | 2.48 | 616 |
| Invoke | Infinite | Inline | 706.346 | 695.791 | 3.29 | 536 |
| InvokeVoid | Finite | Deferred | 1237.128 | 1227.764 | 14.75 | 992 |
| InvokeVoid | Finite | Inline | 869.691 | 869.508 | 0.86 | 840 |
| InvokeVoid | Infinite | Deferred | 768.268 | 767.657 | 0.90 | 592 |
| InvokeVoid | Infinite | Inline | 684.336 | 684.939 | 1.00 | 440 |
| Set | Finite | Deferred | 910.342 | 899.982 | 3.15 | 1008 |
| Set | Finite | Inline | 850.845 | 837.803 | 5.07 | 864 |
| Set | Infinite | Deferred | 745.091 | 745.523 | 0.84 | 608 |
| Set | Infinite | Inline | 656.426 | 657.163 | 0.82 | 464 |

20 actual outcomes,160 actual retained results,60 actual warmups and20 source/hash/PID-linked actual setup receipts. Requested100ms iterations,3 warmups/8 retained results,one in-process original-only sweep; DontRemove. Maximum CV is retained, not explained causally or discarded.

The warm5000-call batches show approximately400 incremental bytes per finite request, including the actual runtime cancellation-registration boundary, not just CTS size. Infinity already bypasses the CTS. Timed construction/get/set complete from harness-owned public replies before a deadline; they do not repair or validate the failing pending deadline.
