# F103 all three actual comparisons

Allocation-focused qualified draft, not a causal global speedup or whole-build claim. All source comparisons and raw variation retained.
Comparisons2/3 repeat identical final source/owner and each include a fresh exact-frozen-original control.

## Comparison 1 - System.Lazy proposal

| Actual driver case | Original mean ms | Proposed mean ms | Original B/op | Proposed B/op | Allocation reduction |
|---|---:|---:|---:|---:|---:|
| Empty/Serial | 58.278 | 24.161 | 2803480 | 2566780 | 8.44% |
| Empty/Concurrent | 16.156 | 11.465 | 2817280 | 2602478 | 7.62% |
| LifecycleOnly/Serial | 88.305 | 48.478 | 4617000 | 4457824 | 3.45% |
| LifecycleOnly/Concurrent | 21.677 | 19.332 | 4504944 | 4413332 | 2.03% |
| EventOnly/Serial | 58.486 | 41.640 | 7205736 | 6925144 | 3.89% |
| EventOnly/Concurrent | 13.714 | 9.745 | 7520578 | 7289758 | 3.07% |
| SmallPopulated/Serial | 20.221 | 6.773 | 3078022 | 3084249 | -0.20% |
| SmallPopulated/Concurrent | 5.681 | 4.486 | 3414466 | 3308254 | 3.11% |
| WidePartials/Serial | 20.388 | 13.437 | 8830962 | 8847267 | -0.18% |
| WidePartials/Concurrent | 23.929 | 15.529 | 8977462 | 9008626 | -0.35% |

## Comparison 2 - final four-argument LazyInitializer proposal

| Actual driver case | Original mean ms | Proposed mean ms | Original B/op | Proposed B/op | Allocation reduction |
|---|---:|---:|---:|---:|---:|
| Empty/Serial | 57.248 | 25.028 | 2829096 | 2546378 | 9.99% |
| Empty/Concurrent | 15.625 | 11.170 | 2953088 | 2596390 | 12.08% |
| LifecycleOnly/Serial | 83.577 | 35.447 | 4508768 | 4398836 | 2.44% |
| LifecycleOnly/Concurrent | 20.614 | 10.295 | 4573748 | 4376815 | 4.31% |
| EventOnly/Serial | 48.407 | 27.438 | 6929080 | 6757914 | 2.47% |
| EventOnly/Concurrent | 9.305 | 7.585 | 7544843 | 7337311 | 2.75% |
| SmallPopulated/Serial | 8.215 | 5.946 | 3007238 | 2989942 | 0.58% |
| SmallPopulated/Concurrent | 4.740 | 3.602 | 3335198 | 3329030 | 0.18% |
| WidePartials/Serial | 18.802 | 13.208 | 8874926 | 8829338 | 0.51% |
| WidePartials/Concurrent | 18.018 | 16.737 | 8957692 | 8976946 | -0.21% |

## Comparison 3 - final four-argument LazyInitializer proposal

| Actual driver case | Original mean ms | Proposed mean ms | Original B/op | Proposed B/op | Allocation reduction |
|---|---:|---:|---:|---:|---:|
| Empty/Serial | 66.318 | 22.660 | 2970808 | 2533626 | 14.72% |
| Empty/Concurrent | 16.928 | 11.231 | 2830304 | 2652893 | 6.27% |
| LifecycleOnly/Serial | 86.473 | 42.995 | 4611480 | 4349636 | 5.68% |
| LifecycleOnly/Concurrent | 15.474 | 12.744 | 4641946 | 4527006 | 2.48% |
| EventOnly/Serial | 48.615 | 36.715 | 6958368 | 6841332 | 1.68% |
| EventOnly/Concurrent | 10.612 | 8.242 | 7460889 | 7366169 | 1.27% |
| SmallPopulated/Serial | 8.956 | 6.119 | 3018555 | 3066250 | -1.58% |
| SmallPopulated/Concurrent | 4.769 | 3.874 | 3379150 | 3369375 | 0.29% |
| WidePartials/Serial | 20.415 | 11.829 | 8878936 | 8808329 | 0.80% |
| WidePartials/Concurrent | 21.655 | 14.756 | 8980500 | 8956480 | 0.27% |

## Actual process-wide empty-input calipers

| Final image/case | Original B/complete run | Proposed B/complete run | Reduction |
|---|---:|---:|---:|
| candidate-2/Empty/Serial | 2887230.4 | 2550501.6 | 11.66% |
| candidate-2/Empty/Concurrent | 2886556.8 | 2558968.8 | 11.35% |
| candidate-3/Empty/Serial | 2887230.4 | 2594236.8 | 10.15% |
| candidate-3/Empty/Concurrent | 2886556.8 | 2674199.2 | 7.36% |

B/op is rounded exactly as the pinned actual BDN GC helper; raw byte totals/operation counts and all samples remain in the console/full JSON.
The caliper encloses10 actual completed driver runs after3 warmups. It includes worker threads/driver/tasks/diagnostics/metadata/cache work, not isolated dictionary bytes.
Raw BDN processor name/core counts remain Unknown/null; separately recorded Environment.ProcessorCount is not substituted into that report.
