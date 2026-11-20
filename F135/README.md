# F135: no material owned-dictionary emptiness optimization established

**Optimization proposal not admitted; zero comparisons and no performance PR.** `CacheVaryByRules.HasVaryByValues` short-circuits null storage, then calls `Any()` on its genuine owned `Dictionary<string,string>`. The selected, actually loaded LINQ image records the `ICollection<T>.Count` fast path before enumeration. This producer/runtime does not establish the proposed enumeration/allocation mechanism.

Classification is `rejected` / `material-optimization-unestablished`, **not measured no-gain, zero residual dispatch cost, literal no-op, JIT-equivalence or proof that direct `Count` could never help**. Any remaining dispatch/inlining cost is unmeasured. No shipping source edit or performance comparison was admitted.

## Connected artifacts

| Artifact | Link | Outcome / scope |
|---|---|---|
| Coordinator disposition and bounded freshness | [Independent acceptance](coordinator-acceptance.json), [closed zero-comparison budget](closed-budget.json) | All 208 selected files independently rehashed; target Git identity checked at original, observed main and later live main; not a later complete framework rebuild |
| Historical preparation | [Selected handoff](owner-handoff/README.md), [historical pending-stage record](owner-handoff/handoff.json), [selected capsule seal](owner-handoff/manifest.json) | Preparation's original pending status is retained unchanged; this coordinator disposition is later |
| Real producer and all 54 observations | [Original 27 rows](owner-handoff/facts/rows-original.json), [observed-main 27 rows](owner-handoff/facts/rows-main.json), [executable consumer](owner-handoff/consumer/Program.cs) | Actual registered middleware, policy, key, store and cached HTTP response reuse; no direct helper invocation |
| Source and selected runtime | [36 physical/Git source associations](owner-handoff/facts/source-associations.json), [118 loaded associations](owner-handoff/facts/loaded-assemblies.json), [actual selected LINQ IL](owner-handoff/facts/runtime-any-il.json) | Genuine owned dictionary implements `ICollection<T>`; loaded LINQ SHA256 `2D478D07EE8A1B4170A7EEA7F5862392B82FD5BAEB8F7647D82DCDD61F590AF7`; static IL/type evidence, not a JIT or performance observation |
| Existing repository tests | [All six exact names, commands and results](owner-handoff/facts/existing-tests.json), [Original console](owner-handoff/runs/tests-original/stdout.txt), [main console](owner-handoff/runs/tests-main/stdout.txt) | Three per pin, zero failed/skipped; actual console outcomes, no manufactured XML |
| Runtime distinction | [Original test host](owner-handoff/runs/tests-original/host-resolution.txt), [main test host](owner-handoff/runs/tests-main/host-resolution.txt), [both producer facts](owner-handoff/facts/rows-original.json) | Original existing tests use runtime 62; main existing tests and both middleware probes use runtime 68 |
| Image and source/PDB boundaries | [All 193 entries/pin](owner-handoff/facts/images-original-main.json), [common consumer identity](owner-handoff/facts/common-consumer.json), [source/PDB historical receipts](owner-handoff/facts/preparation-handoff.json) | One common consumer build, four common files identical; 69 image differences, **67 non-owner differences**, correctly prohibit causal performance pairing |
| Exact executed commands and failures | [Command/result table and full arguments](owner-handoff/commands.md), [failure index](owner-handoff/facts/failed-prerequisites.json), [terminal processes](owner-handoff/facts/terminal-processes.json) | All 18 recorded .NET roots terminal; failed prerequisites retained; no producer/test reruns during packaging or acceptance |
| Integrity and omissions | [Copied hashes](authoritative-copies.json), [original 38,648-file manifest](owner-handoff/manifests/preparation-007.json), [omitted inputs](owner-handoff/omissions.json), [portable auditor](verify.mjs), [immutable core](capsule-file-hashes.json) | Original seal preserved; selected files rehashed. Omitted binaries are historical receipts, not newly parsed binary attestation |
| Tracking and final linkage | [Additive verified publication](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F135/publication.json) | Closed tracking issue; no performance PR/new browser window; fixed classified report unchanged |

## What actually ran

The real producer is `UseOutputCache` through its registered middleware, public policies, genuine `VaryByValuePolicy`, `OutputCacheKeyProvider.CreateStorageKey` / `TryAppendVaryByKey`, default store and HTTP response replay. A forwarding store decorator observes real reads/writes; read-only reflection observes the owned backing dictionary without calling the key helper.

Twenty-seven requests per pin distinguish default uninitialized storage from deliberately initialized-empty and populated-then-cleared **public-policy controls**. Other cases establish nonempty/sorted two-value keys, duplicate overwrite, repeated/different keys and values, case differences and empty values. Initialized-empty/cleared controls are not claims about the default producer. All exact keys, store events, endpoint call counts, response bodies and dictionary identities agree with their independently reconstructed oracles.

The three exact existing tests passed on each separately built source graph:

```text
Microsoft.AspNetCore.OutputCaching.Tests.OutputCacheKeyProviderTests.OutputCachingKeyProvider_CreateStorageKey_ReturnsCachedVaryByGuid_IfVaryByRulesIsEmpty
Microsoft.AspNetCore.OutputCaching.Tests.OutputCacheKeyProviderTests.OutputCachingKeyProvider_CreateStorageKey_ValuesAreSorted
Microsoft.AspNetCore.OutputCaching.Tests.OutputCachePolicyBuilderTests.BuildPolicy_CreatesVaryByValuePolicy
```

Original source is `37e809ead5824bc753a1c3d56f11615bdb1296c5`; observed main is `00560e2dd1954a2acf2bc54b35422b0f32484bf1`. Both middleware probes used exact runtime `12.0.0-alpha.1.26568.110`. Original existing tests used `12.0.0-alpha.1.26562.105`; main tests used runtime 68, with roll-forward disabled. The common consumer was compiled once, not independently per role.

## Audit and limits

These portable historical commands require only an existing modern Node.js:

```powershell
node .\verify.mjs . --require-seal
node .\owner-handoff\audit.cjs --self-test
```

**Passed during coordinator acceptance:** all 208 selected file hashes; all 54 independently reconstructed real middleware observations; each of six exact existing console outcomes and actual host selections; 118 historical loaded-assembly associations; 36 physical/Git source associations; ten historical owner source/PDB associations; all 193 image entries per role, unchanged common consumer and correctly rejected 67-non-owner-difference causal pair. Both negative controls reject a changed cached response and runtime 62/68 conflation. No new .NET process, native producer, allocation counter or timing was started.

Missing generated imports, a failed diagnostic-policy prototype, unavailable requested runtime selections, failed public runtime-source lookup (HTTP 404), missing Python, and runner help producing no tests are preserved. Ordinary runner-duration text is not adopted as performance data. The original build/source/PDB receipts and raw outputs remain historical evidence: omitted owner/test/consumer/runtime binary bytes are not freshly parsed or rehash-attested by this portable audit, and `fullCompilerInputAttestation` remains **false**.

Kestrel/TCP/IIS, concurrent mutation, expiration/eviction, error/cancellation paths, workload frequency and whole-application performance remain outside this bounded characterization. The selected-image Count path is not a measured improvement/no-gain result. No candidate, useful-gain gate, extra timing or performance PR is authorized; the zero-of-three comparison budget is permanently closed.
