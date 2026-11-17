**Qualified fork-only draft,not merge-ready.** Use the existing keyed provider lookup only for exact default manager/provider types;leave the original virtual first-match sequence path for all custom/derived types. Default null/empty display filtering,whitespace,ordinal names,live updates,principal/properties references and tokens remain unchanged.

Tracking:@ISSUE_URL@

Source:[`@SOURCE_COMMIT@`](https://github.com/jaslawinMs/aspnetcore/commit/@SOURCE_COMMIT@).

Runnable BenchmarkDotNet project,raw reports,exact validation commands,source/PE/PDB witnesses,initial failed attempts and bounded research:[immutable F028 evidence](https://github.com/jaslawinMs/aspnetcore/tree/@EVIDENCE_COMMIT@/F028).

### Measurements:one actual comparison,all rows retained

| Actual public wrapper | Original ns/op | Selected ns/op | Less time % | Original/selected B/op |
|---|---:|---:|---:|---:|
| Default,1scheme,hit |210.97|180.02|14.67|576/472|
| Default,4schemes,tail (primary) |237.50|180.25|24.11|576/472|
| Default,128schemes,tail (synthetic primary) |1340.29|182.30|86.40|576/472|
| Default,128schemes,missing |1346.64|177.19|86.84|576/472|
| Default,128schemes,hidden display |1352.44|182.01|86.54|576/472|
| Default,128schemes,head |210.94|187.74|10.99|576/472|
| Default,empty,missing |189.62|174.67|7.89|528/472|
| Derived manager,4schemes,tail |246.11|260.19|-5.72|576/576|
| Derived provider,4schemes,tail |246.94|263.05|-6.53|576/576|
| No authentication result,lookup unreached |31.83|31.72|0.35|24/24|

Derived controls get no allocation benefit and were slower;they traverse the new type guard/larger method,not byte-identical IL. The128scheme primary is explicitly synthetic scaling,not evidence that applications commonly register128schemes. All unfavorable first observations remain in `comparison.md`;single observations include fixture/provider/DI/UserManager/JIT/metadata and are not isolated entry or cold-start conclusions.

Stopped under the declared>=50%primary rule:128scheme tail reported intervals are separated. One actual comparison used6native profiles/20warm rows/4first observations. Remaining slots are permanently closed;no tuning or extra comparison.

### Compatibility and scope

Kept `GetExternalLoginInfoAsync(string? expectedXsrf = null)` and `GetExternalAuthenticationSchemesAsync()` signatures,virtuality and API baselines unchanged. An unconditional replacement would bypass supported custom sequence/first-match behavior;the exact-type guard retains it. No cache,new API,IVT or cross-assembly accessor was added.

The provider already returns its reused snapshot. This removes per-call filter/scan work,not a snapshot rebuild. Only11shipping insertions/1deletion plus222lines/17focused rows in the existing test class. Both public `Context` properties are assigned equally for the owning allocation comparison.

### Actual validation

Original existing121/121pass. Corrected expanded original137pass plus one expected resource red,`Default:55832;derived:55832`;selected138/138pass,0skipped. Every focused parameter row and original preservation row was independently checked from fresh TRX. Initial73264/55832result had unequal mocked/real context accessors and is preserved but excluded as isolated resource proof.

@VALIDATION_COMMANDS@

Separate explicit owning build and targeted repository whitespace verification pass. Both frozen consumers and the physically relocated fresh standalone build pass10actual public wrappers/20value-reference-token contracts/18additional live-update/custom-override/pending/failure/metadata contracts. Fresh build0warnings/errors,Characterize only,no additional timing. The initial untimed standalone missing-Http.Features failure is retained;the corrected132-file consumers were frozen before timing.

Shared Windows VM,not sandboxed,dedicated or isolated;no priority,affinity or power changes. Actual public owner and real registered scheme provider,with a prepared synchronous `IAuthenticationService` result seam. **Not full external login,cookie,HTTP/network,asynchronous-authentication throughput,production-frequency or application-speedup evidence.**

Measured at baseline37e809e plus the scoped uncommitted patch,not claimed as a build at the later source commit. Eleven selected source/test/project/API file pairs match captured current default;not whole-current-default SDK integration. Only actual Identity DLL/PDBvary in the132-file closure;one common frozen harness.264physical closure bindings and36runtime bindings were rehashed. Selected-document PE/PDB identity is not complete compiler provenance or method coverage;the copied-text audit does not reproduce omitted binaries/runtime files.
