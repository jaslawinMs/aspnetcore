## Outcome

**No-gain; original source/product restored.** No optimization commit or performance PR.
The compatible internal cast in ValueProviderResult.GetEnumerator does not establish a
worthwhile real collection-binding gain.

Declared one-value collection-binding primary: **2.89% slower / 1.85% faster / 18.07%
slower**, with 1456 B/op unchanged. Prepared 8/64-value cases regress in all three pairs.
Small favorable query-producer/scaling cases, adverse unchanged controls and one-byte
allocation residual remain visible. No native JIT-causation or structural-allocation claim.

Three complete alternating pairs permanently close the three-slot budget:
six timed native members x20profiles x8results = **120rows/960samples**.

## Immutable evidence

- [Full result, boundaries and reproduction](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F035/README.md)
- [Every target/control comparison](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F035/comparison-results.md)
- [Audited disposition and limitations](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F035/decision.json)
- [Exact commands with actual exit codes](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F035/validation-commands.md)
- [Runnable benchmark project/source](https://github.com/jaslawinMs/aspnetcore/tree/@EVIDENCE_COMMIT@/F035/harness)
- [Preserved initial preparation failure](https://github.com/jaslawinMs/aspnetcore/tree/@EVIDENCE_COMMIT@/F035/preparation-original)
- [Preserved untimed metadata failure](https://github.com/jaslawinMs/aspnetcore/tree/@EVIDENCE_COMMIT@/F035/profiles/characterize-original)
- [Unchanged independent source branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F035-value-provider-enumeration)

## Owning behavior and validation

Actual public request-query parsing/factory/provider feeds ValueProviderResult and the real
CollectionModelBinder/SimpleTypeModelBinder, with fresh contexts and complete model/error/
score consumption. Query parsing/factory/binder construction are outside timing. Count0
binding intentionally bypasses the changed method. No hosted HTTP/network or application
frequency/throughput claim.

Both original and candidate pass34/34existing owning rows, zero skipped, including both
Boolean rows in each selected Core theory. Original/candidate/independently rebuilt
relocated source each pass61exact concrete observations, **including**20actual benchmark
lifecycles: cursor Current/Reset/Dispose/order/null/culture/mutation, real query/string
binding and invalid integer model-state behavior. Not61additional E2E cases.

**Compatibility:** Kept `IEnumerator<string> ValueProviderResult.GetEnumerator()` unchanged
because already-compiled consumers bind to that exact return signature and would throw
`MissingMethodException` if it changed. Rejected the proposed concrete-return replacement;
tested only a same-signature internal cast, then withdrew it. Existing Values.GetEnumerator
is already concrete. No API baseline, IVT or UnsafeAccessor change.

Measured304-file images share the exact harness DLL/PDB. Only the tested MVC.Abstractions
DLL/PDB differ:302unchanged total includes2harness files,leaving300other unchanged files.
Both owner-only forced rebuilds match earlier tested source/DLL/PDB. All6relocated source/
project files are byte-exact; rebuilt path-dependent harness PE/PDB need not match.

Initial standalone compilation fails with2warnings/1error; corrected standalone builds
have0warnings/0errors. First untimed metadata inspection fails an assumed generated async
state machine; actual compiled consumer uses runtime Async IL. Failed native exit retained;
its runtime PID was not captured. Two later non-timing probes fail initially and are corrected.
The publication authoring checker also initially fails a hash-table-expression parse;
it is corrected before the successful check and packaging,with its own retained receipt.

All960Workload.Result samples match stdout/JSON; mean/sample variance/SD/SE independently
recomputed. All240before/after settings observations match. Maximum CV15.09%.
Primary allocations unchanged; Count64 round2reports13392->13393B/op,not a saving.

Live audit rehashes1216frozen consumer files/834loaded-assembly binding observations/
1318unique files. Nine recorded successful native PIDs checked; failed untimed metadata
PID unknown. One hundred selected PE/PDB/source associations across ten invocations,not
complete compiler provenance or method coverage. Portable audit checks copied text,not
omitted native binaries.

Shared non-isolated Windows VM; no priority/affinity/power/OS-policy changes. Pinned net12
preview toolchain, not full latest-default integration or a general performance guarantee.
No unjustified performance PR; F036 remains a separate unfinished item.
