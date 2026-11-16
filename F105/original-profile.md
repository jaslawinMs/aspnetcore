# F105 original public-owner pressure profile

**Rejected incompatible struct-returning replacement;no compatible source comparison or improvement claimed.**
One24-case original profile,8 retained results/3 warmups each,DontRemove,in-process,100ms requested.
All values are warmed component measurements,not whole-request throughput or production frequencies.

| Profile | Original mean ns/op | Original B/op | CV % | Raw overhead samples |
|---|---:|---:|---:|---:|
| Concrete0 | 1.709 | 0 | 1.50 | 15 |
| Concrete1 | 45.797 | 56 | 0.99 | 15 |
| Concrete16 | 286.596 | 56 | 0.45 | 15 |
| Concrete128 | 1989.363 | 56 | 0.65 | 15 |
| Generic0 | 4.372 | 0 | 0.63 | 15 |
| Generic1 | 46.339 | 56 | 1.42 | 15 |
| Generic16 | 291.334 | 56 | 0.80 | 15 |
| Generic128 | 1992.224 | 56 | 0.93 | 20 |
| NonGeneric0 | 5.051 | 0 | 0.48 | 15 |
| NonGeneric1 | 56.421 | 88 | 2.26 | 15 |
| NonGeneric16 | 458.349 | 568 | 0.80 | 20 |
| NonGeneric128 | 3249.867 | 4152 | 3.49 | 20 |
| Retained0 | 6.858 | 0 | 1.57 | 15 |
| Retained1 | 50.934 | 56 | 0.57 | 15 |
| Retained16 | 300.017 | 56 | 1.12 | 15 |
| Retained128 | 2002.371 | 56 | 0.67 | 20 |
| ValidateNull | 563.252 | 1408 | 5.93 | 20 |
| ValidateEmpty | 690.190 | 1408 | 12.87 | 19 |
| ValidateSuppressed | 96.157 | 256 | 3.42 | 15 |
| ValidateRemapped | 576.215 | 1408 | 3.89 | 15 |
| ValidateExtra16 | 642.689 | 1408 | 2.28 | 20 |
| ValidateExtra128 | 666.530 | 1408 | 3.50 | 20 |
| ValidateMetadata | 114.627 | 256 | 3.77 | 15 |
| ValidateStrategy | 157.303 | 256 | 3.12 | 15 |

## Independent frozen-process precise allocation calipers

Two actual original processes,5 samples per input/65536 completed operations per sample,16384 warmup operations.
These process-wide totals retain background/transition allocations and all actual enclosing BDN-helper extras.
Concrete16/128 can have near-zero samples in separate processes while this BDN profile reports56B.
No JIT/escape-analysis or other cause was directly traced;do not erase either observation or assert universal boxing.
Validation null-state has some approximately1472B calipers versus1408B later/BDN;all rows remain.

| Profile | Original min B/op | Original max B/op |
|---|---:|---:|
| Concrete0 | 0.000000 | 0.015381 |
| Concrete1 | 56.000000 | 56.015381 |
| Concrete16 | 0.000000 | 56.020508 |
| Concrete128 | 0.015381 | 56.027466 |
| Generic0 | 0.000000 | 0.020508 |
| Generic1 | 56.000000 | 56.020508 |
| Generic16 | 56.000000 | 56.021240 |
| Generic128 | 56.000000 | 56.396240 |
| NonGeneric0 | 0.000000 | 0.027466 |
| NonGeneric1 | 88.000000 | 88.020508 |
| NonGeneric16 | 568.005859 | 568.021973 |
| NonGeneric128 | 4152.000000 | 4152.041260 |
| Retained0 | 0.000000 | 0.020508 |
| Retained1 | 56.000000 | 56.020508 |
| Retained16 | 56.000000 | 56.020508 |
| Retained128 | 56.000000 | 56.020508 |
| ValidateNull | 1408.000000 | 1472.029053 |
| ValidateEmpty | 1408.000000 | 1408.021240 |
| ValidateSuppressed | 256.000000 | 256.020508 |
| ValidateRemapped | 1408.000000 | 1408.021240 |
| ValidateExtra16 | 1408.000000 | 1408.020508 |
| ValidateExtra128 | 1408.000000 | 1408.020874 |
| ValidateMetadata | 256.000000 | 256.020508 |
| ValidateStrategy | 256.000000 | 256.016113 |

The actual visitor path reads state with TryGetValue. Extra16/128 means17/129 total stored entries,
not timed enumeration of those entries. Dictionary/DI/model-metadata construction and state population
are outside timing. Caller-retained interfaces deliberately characterize an escaping consumer.

Raw audit:24 outcomes/192 retained results/72 warmups/399 actual overhead samples/24 hash-PID setups/72 exact input proofs/48 independent frozen contracts/240 process-wide calipers/10 exact original Facts/17 image source-PDB associations.
N-1 variance/SE,R7,fences,actual overhead/GC rounding and recorded CI arithmetic are independently checked;
confidence-distribution critical values,omitted binary/PDB/runtime-pack bytes and method coverage are not.
Source/API assessment is local,not formal approval or an executed modified-binary compatibility test.
