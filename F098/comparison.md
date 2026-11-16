# F098 original runtime timeout pressure - not an optimization comparison

No compatible generic finite-timeout source removal/reset/reuse is proposed. Infinity already bypasses the CTS; explicit-None is also no deadline, but uses a different pending adapter. All original observations remain.

| Original policy | Public reply workload | Mean ns | Median ns | CV % | Managed B/op |
|---|---|---:|---:|---:|---:|
| Finite | Inline | 805.262 | 810.406 | 1.79 | 864 |
| Finite | Deferred | 919.827 | 919.449 | 1.56 | 1016 |
| Finite | Overlap8 | 7409.248 | 7405.056 | 1.39 | 8472 |
| Infinite | Inline | 608.795 | 607.200 | 1.04 | 464 |
| Infinite | Deferred | 730.187 | 729.114 | 0.76 | 616 |
| Infinite | Overlap8 | 5728.479 | 5749.621 | 1.21 | 5272 |
| ExplicitNone | Inline | 586.535 | 587.348 | 0.71 | 464 |
| ExplicitNone | Deferred | 612.463 | 601.398 | 5.13 | 464 |
| ExplicitNone | Overlap8 | 4854.700 | 4832.947 | 1.13 | 4056 |

9 actual outcomes/72 retained results/27 warmups/9 owner-harness-PID-linked exact public-protocol setup receipts. Requested100ms iterations,3 warmups/8 retained results,one in-process original-only sweep; DontRemove. Overlap8 is per eight-request batch, not per-call normalized.

Finite-minus-infinity reported allocation is400B per single call/3200B per eight-call batch, including actual runtime registration behavior, not just CTS size. Both are original source with different deadline contracts, not a performance improvement. Infinity Deferred/Overlap8 additionally carry152B/1216B relative to explicit-None; actual adapter differences are disclosed, not silently fixed. Exact warmed/fresh-runtime calipers and their variation remain in resource-deltas.json. No isolated layout/first-use attribution.
