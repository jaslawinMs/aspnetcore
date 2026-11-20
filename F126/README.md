# F126: reuse deterministic sample endpoint policies

**Focused allocation reduction in an internal educational sample; no reliable speedup or merge-ready claim.** The predeclared real age10 TestServer request saves **1246 / 1258 / 1269 reported B/op**, median **1258 B/op (about1.23KiB)**. The alternative allocation gate passes in all three pairs after matched-control adjustment. Timing is **inconclusive**: primary +0.97%/+5.71%/-0.04% less time is much smaller than the unchanged control's +26.73%/+23.76%/-38.69% movement. The permanently closed three-comparison budget retains all288 observations and every adverse/control result.

## Connected artifacts

| Artifact | Link | Meaning |
|---|---|---|
| Independent source | [Exact commit](https://github.com/jaslawinMs/aspnetcore/commit/906bf66c821a57490f2a0e1e50ef676221a744c5), [fork branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F126-cache-deterministic-sample-endpoint-policies) | Three files,53 insertions, no deletions; independent parent `37e809ead5824bc753a1c3d56f11615bdb1296c5` |
| Actual sample change | [Provider](https://github.com/jaslawinMs/aspnetcore/blob/906bf66c821a57490f2a0e1e50ef676221a744c5/src/Security/samples/CustomPolicyProvider/Authorization/MinimumAgePolicyProvider.cs), [sample explanation](https://github.com/jaslawinMs/aspnetcore/blob/906bf66c821a57490f2a0e1e50ef676221a744c5/src/Security/samples/CustomPolicyProvider/readme.md) | Existing AllowsCachingPolicies=true contract; no parser, framework default or private name cache |
| Real HTTP regression coverage | [Exact tests](https://github.com/jaslawinMs/aspnetcore/blob/906bf66c821a57490f2a0e1e50ef676221a744c5/src/Security/test/AuthSamples.FunctionalTests/CustomPolicyProviderTests.cs), [individual requirements and commands](validation-commands.md) | Two individually red->green cache rows; all existing different-user HTTP results preserved |
| Runnable benchmark | [Eight-input project](harness/AutoPerf.Benchmarks.csproj), [methods](harness/PolicyBenchmarks.cs), [actual host/pipeline](harness/PolicyScenario.cs), [hashes](common-inputs-prepared.json) | Actual source-built Startup/MVC/cookie pipeline, both real routes, explicit disabled-cache and direct controls |
| Every measurement | [All results and variability](comparison-results.md), [raw reduction](analysis.json), [independent arithmetic](independent-numerical-audit.json) | Allocation-only qualification, noisy timings and all secondary/adverse/control outcomes |
| Real Hot Reload and lifetime | [Verified live-edit receipt](hot-reload-verified.json), [raw watch log](hot-reload/actual-sample-003/watch.stdout.txt) | Real supported age10->11->10 controller attribute edit, two updates, same PID/no restart, actual handler logs and exact restore |
| Source/PDB and actual default | [Premeasurement seal](premeasurement-validation.json), [baseline](baseline-completed.json), [candidate](candidate-correctness-completed.json) |26 selected inputs/owner, six actual matching PE/PDB documents; actual-default seven HTTP cases on its own complete source graph |
| Independent fresh reconstruction | [Receipt](reconstruction-paired-001/verified-reproduction.json), [exact copied project](reconstruction-paired-001/project/AutoPerf.Benchmarks.csproj) | Exact eight inputs rebuilt, both measured source owners characterized, 350 of 352 image entries unchanged per owner, no more timing |
| Decision and closure | [Decision](decision.json), [closed budget](diagnostic-budget.json), [closure receipt](budget-closure.json) | Allocation alternative only; timing gate fails, direct-age10 guard does not reject; no retuning/replay |
| Portable historical audit | [Auditor](F126-verify.mjs), [native-inclusive result](native-inclusive-audit.stdout.txt), [XML parser](F126-audit-trx.ps1) |288 actual samples/36 GC records/32 individual XML executions; does not execute omitted binaries |
| Copies and omissions | [Copied authority](authoritative-copies.json), [every omitted file hash](omitted-file-hashes.json), [immutable seal](capsule-file-hashes.json) | Full compiled/restore images individually hashed but not publicly shipped |
| Later issue, draft and visible-window evidence | [Additive live publication receipt](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F126/publication.json) | Added after immutable core is remotely verified; no sealed file is rewritten |

## Why enabling this flag preserves the sample's work

The sample's actual Startup registers a singleton internal MinimumAgePolicyProvider. MVC produces its endpoint policy metadata from MinimumAgeAuthorizeAttribute. Without opt-in, the existing middleware reparses the same deterministic age name, builds requirements and combines a policy on each request. The new getter allows the framework's existing endpoint-keyed AuthorizationPolicyCache to reuse that combined policy. It does **not** cache a user's authorization result: the real handler still evaluates the current user's requirements on each request.

Direct GetPolicyAsync intentionally remains uncached; configured named/default/fallback delegation, malformed/unknown names and parsing stay untouched. There is no private unbounded string-name cache. Existing endpoint change-token/disposal machinery owns invalidation. The real watch experiment applies supported metadata changes twice without a restart; the actual handler sees10, then11, then10. Providers backed by independently changing data should keep the existing default false.

## Boundaries and adverse observations

- Qualification is allocation-only. Whole-request B/op savings are not exact policy-object sizes. The disabled-cache primary control's allocation changes -555/-19/+635B/op and very large timing movement remain visible.
- The second real warm route saves1315/1292/1291B/op but does not replace the primary. Direct age50 median timing is4.63% worse with unchanged allocations. No unchanged-path neutrality or causal/JIT explanation is assigned.
- The harness uses actual source-built ASP.NET Core owners, generic hosting and TestServer, disabled logging, ephemeral data protection and a documented Interlocked lookup observer INCLUDED in timing. It makes no socket/network or general framework/application throughput claim.
- Original/candidate images have352 entries,350 identical INCLUDING common harness DLL/PDB; only actual sample DLL/PDB differ. Some unchanged Microsoft.Extensions abstractions resolve from pinned Microsoft.NETCore.App; raw actual paths/bytes are retained. The default sample owner uses the common baseline framework image for characterization; its actual full-default graph was separately validated.
- Baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`; actual default744c772d93b79d4d52ff11c05818c4e8de55db6b. SDK12.0.100-alpha.1.26557.102; x64 runtime12.0.0-alpha.1.26562.105; C#13; BDN0.13.0. Three warmups/eight retained, requested100ms/unroll1/DontRemove; O->C,C->O,O->C.
- Shared non-isolated Windows box, Normal process/thread priority and affinity65535. No power, priority, affinity, firewall, URL ACL or other machine setting changes.
- The exact common project was rebuilt in a new directory and both measured owners characterized without timing. Measured owner/framework bytes were reused. Six selected owner documents/26 selected inputs are not complete compiler provenance or fresh-clone byte-identical replay. Measured binaries predate the later source commit.
- The supported live controller-attribute edit on this runtime is verified, not every possible metadata delta. Cold concurrent misses need not build once. No new public framework API, new assembly-boundary access, native/browser/static-asset production/packaging or merge-readiness claim.

## Audit without more timing

```powershell
node .\F126-verify.mjs . --require-seal
```

Requires Node and PowerShell7 for actual XML parsing, not SDK restore or timing. Never replay the consumed authorizations. The fixed classified REPORT.md remains its118-finalized snapshot; live campaign progress is separate.
