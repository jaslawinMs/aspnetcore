# F122: concrete enumerator pattern - rejected for production fit

**No shipping change, no performance PR, no candidate comparison.** The suggested concrete struct-enumerator pattern has no established non-forwarding production consumer in the inspected MVC cohort. One original-only profile retains **32 cases / 256 observations**, including real interface allocations; the unused two timing authorizations are permanently closed.

## Connected artifacts

| Artifact | Link | Meaning |
|---|---|---|
| Tests-only source | [Independent fork branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F122-copy-on-write-enumerator), [exact commit](https://github.com/jaslawinMs/aspnetcore/commit/04a462f22aa2ae88d87f7efe1eb7ce5e711229d9) | `04a462f22aa2ae88d87f7efe1eb7ce5e711229d9`, parent `37e809ead5824bc753a1c3d56f11615bdb1296c5`; only the new test file differs |
| Unchanged shipping owner | [CopyOnWriteList.cs](https://github.com/jaslawinMs/aspnetcore/blob/04a462f22aa2ae88d87f7efe1eb7ce5e711229d9/src/Mvc/Mvc.Core/src/Infrastructure/CopyOnWriteList.cs) | Original interface-returning GetEnumerator preserved; no candidate implementation |
| Preservation tests | [Exact test source](https://github.com/jaslawinMs/aspnetcore/blob/04a462f22aa2ae88d87f7efe1eb7ce5e711229d9/src/Mvc/Mvc.Core/test/Infrastructure/CopyOnWriteListTest.cs), [tested physical snapshot](preservation-source/src/Mvc/Mvc.Core/test/Infrastructure/CopyOnWriteListTest.cs) | Six methods, twelve passing Boolean rows |
| Predeclared selection boundary | [Acceptance plan](acceptance-plan.json), [sealed passing baseline](baseline-validation.json) | Sealed before new tests, shipping edits or timing; do not invent a concrete caller |
| Actual compiled/public caller evidence | [Original IL audit](characterization-original-characterize-001/states/0006-bounded-shipping-il-audit.json), [current-default characterization](characterization-default-characterize-001/verified-characterization.json) | Two IList properties; fourteen-module cohorts, four constructor operands, only the nongeneric self-forwarder calls concrete GetEnumerator |
| Runnable BDN project | [Project](harness/AutoPerf.Benchmarks.csproj), [four timed methods](harness/CollectionBenchmarks.cs), [eight source hashes](harness-source-hashes.json) | Actual HTTP-produced collections; generic/nongeneric consumption, retained enumeration and unchanged IndexOf |
| All absolute observations | [Every case and variability](original-results.md), [raw recomputation](measurement-audit.json) | No before/after ratio, favorable-profile substitution or allocation-free claim |
| Correctness and commands | [Requirements, exact commands and results](validation-commands.md) | 68 historic passing XML executions, no hidden skips |
| Independent reconstruction | [Verified result](reconstruction-original-and-default-001/verified-reproduction.json), [exact copied project](reconstruction-original-and-default-001/project/AutoPerf.Benchmarks.csproj) | Actually restored/rebuilt all eight inputs and characterized original/default roles; no timing |
| Decision and closed budget | [Decision](decision.json), [budget](diagnostic-budget.json), [close receipt](permanent-budget-close.json) | Production-fit rejection, not a numerical no-gain verdict |
| Complete verification | [Portable verifier](F122-verify.mjs), [full audit](audit-summary.json), [individual XML parser](F122-audit-trx.ps1) | All 256 samples, ten runtime and 64 settings records, source bindings and individual XML rows checked |
| Exact-copy/omission inventories | [Authoritative copies](authoritative-copies.json), [omitted files](omitted-file-hashes.json), [immutable seal](capsule-file-hashes.json) | Compiled images/build caches are hashed but not shipped |

The tracking issue and final campaign/index receipt are created only after this immutable evidence is remotely verified. The later `publication.json` is additive and excluded from the core seal; it must not rewrite this historical capsule.

## Why not add the apparently faster struct enumerator?

The scan's syntactic observation is correct: the internal concrete type's public method returns `IEnumerator<T>`. But `ControllerContext.ValueProviderFactories` and `PageContext.ValueProviderFactories` expose **`IList<IValueProviderFactory>`**. A foreach through those properties uses the interface enumeration contract; it cannot select a new concrete-only pattern member. Actual interface maps also target the original public generic member and its explicit nongeneric forwarder.

The compiled audit decoded **9,771 IL bodies in fourteen frozen MVC modules per source role**, including 37,921 original / 37,918 default method operands. Four constructor operands reach the known controller/page producers. The sole concrete GetEnumerator operand is its own nongeneric forwarding member; no other concrete-pattern consumer was established in that cohort. Controller HTTP execution separately proves the real array-backed producer, public mutation and per-request/source isolation in both invoker modes. Compiled page constructor operands are inspected, but **a compiled Razor Page request was not executed**.

This is deliberately **bounded evidence**, not a whole-repository or arbitrary dynamic/external caller absence proof. The enclosing type is internal: this is **not a public-API-compatibility rejection**. A broader interface-path redesign might be worthwhile but would be a different optimization requiring its own concrete proposal and evidence.

Nor does rejection mean that enumeration is free. The actual original copied-five-factory generic loop reports **30.54 ns/op, 40 B/op**; the untouched-five-factory loop reports **52.23 ns/op, 32 B/op**. All generic/nongeneric, retained-enumerator and unchanged-control results remain in [original-results.md](original-results.md). No source-change speedup, typical request frequency, application gain or precise JIT explanation is inferred.

## Behavioral and reproducibility boundaries

The new tests preserve reference/null order and source isolation, cursor/Reset and nongeneric Current behavior, captured-before-copy versus already-copied mutation semantics, actual arbitrary-source identity/forwarding and disposal on loop break/failure. The actual nongeneric foreach is exercised directly; it is not replaced by a LINQ cast that can shortcut back to the generic interface.

Baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`; actual default `f78194260f43c48ae2092675f55757f2a42dd63d`. All eleven selected original/default inputs match in Git text. Seven selected portable-PDB documents match three actually loaded source-built owners. This is **not complete compiler provenance** or a full caller census.

SDK `12.0.100-alpha.1.26557.102`, x64 runtime `12.0.0-alpha.1.26562.105`, C# 13 and BDN 0.13.0. Three warmups, eight retained results, requested 100 ms, unroll one, no outlier removal. This is a shared, non-isolated Windows box: process/thread priority Normal and affinity 65535; no affinity, power, firewall, URL ACL or other machine setting changed. Exact hardware/runtime data are in the [raw report](original-profile-001/Original/reports/results/AutoPerf.CollectionBenchmarks-report-full.json).

The exact relocated common project was really restored/rebuilt and both untimed roles matched the earlier contract/metadata boundary, retaining each role's owner/dependency bytes. Public evidence omits compiled images/restore caches and does not promise turnkey byte-identical fresh-clone replay. The source commit follows the measured builds; physical snapshots, loaded image hashes and PE/PDB associations are historical authority, not a claim that a later commit ID alone reproduces measured binaries.

No compiled-page/browser, AOT/trimming, packaging, full-repository build or merge-readiness claim. No new public shipping API or framework assembly-boundary mechanism.

## Verify without running benchmarks

```powershell
node .\F122-verify.mjs . --require-seal
```

This recomputes historical observations only. **Do not replay consumed authorizations or reopen the closed budget.** Exact activated build/test commands and machine-specific source paths are disclosed in [validation-commands.md](validation-commands.md). The fixed classified report excludes rejected outcomes and remains unchanged.
