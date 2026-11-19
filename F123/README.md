# F123: MVC copied-store IndexOf experiment - no gain

**No-gain; no performance PR or merge recommendation.** The declared copied-five-factory IndexOf primary has paired less-time effects **-56.51% / -53.66% / 81.23%**; negative means slower. Median paired effect: **53.66% more time**. Both sources report **0 B/op** in every primary pair. All **1,152 observations** remain; the three-slot timing budget is permanently closed.

## Connected artifacts

| Artifact | Link | Meaning |
|---|---|---|
| Diagnostic source | [Independent fork branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F123-copy-on-write-indexof), [exact commit](https://github.com/jaslawinMs/aspnetcore/commit/8f72875eb6c2a108e529b93714dd56e3d8e0c154) | `8f72875eb6c2a108e529b93714dd56e3d8e0c154`, parent `37e809ead5824bc753a1c3d56f11615bdb1296c5`; not recommended for merge |
| Shipping seam | [CopyOnWriteList.cs](https://github.com/jaslawinMs/aspnetcore/blob/8f72875eb6c2a108e529b93714dd56e3d8e0c154/src/Mvc/Mvc.Core/src/Infrastructure/CopyOnWriteList.cs), [exact seam verification](candidate-seam-verification.json) | Fifteen inserted lines in IndexOf; every original prefix/suffix byte and the complete source fallback preserved |
| Preservation tests | [Exact committed tests](https://github.com/jaslawinMs/aspnetcore/blob/8f72875eb6c2a108e529b93714dd56e3d8e0c154/src/Mvc/Mvc.Core/test/Infrastructure/CopyOnWriteListTest.cs), [tested physical snapshot](preservation-source/src/Mvc/Mvc.Core/test/Infrastructure/CopyOnWriteListTest.cs) | Six methods, twelve Boolean rows, green on original and candidate |
| Runnable BDN project | [Project](harness/AutoPerf.Benchmarks.csproj), [methods](harness/CollectionBenchmarks.cs), [eight source hashes](harness-source-hashes.json) | Twelve profiles, two methods, identical measured common harness DLL/PDB |
| Real producer and consumer | [HostedProducer.cs](harness/HostedProducer.cs), [baseline seal](baseline-validation.json), [premeasurement seal](premeasurement-validation.json) | Actual routed MVC actions call public IList.IndexOf and expose its result in HTTP, both invoker modes; no property substitution |
| All measurements | [Every result and variability](comparison-results.md), [raw recomputation](measurement-audit.json) | Primary, favorable ordinary-source, first/last-hit, empty and unchanged Contains rows all retained |
| Correctness and commands | [Requirements, commands and exact outcomes](validation-commands.md) | 117 accepted passing XML executions; initial fixture/report-routing limitation explicitly disclosed |
| Independent reconstruction | [Verified result](reconstruction-paired-001/verified-reproduction.json), [exact copied project](reconstruction-paired-001/project/AutoPerf.Benchmarks.csproj) | Actually restored/rebuilt all eight inputs and exercised both owner/dependency variants without timing |
| Decision and budget | [Decision](decision.json), [closed budget](diagnostic-budget.json), [close receipt](permanent-budget-close.json) | No primary timing/allocation qualification; no replay, retuning or primary substitution |
| Complete verification | [Portable auditor](F123-verify.mjs), [full audit](audit-summary.json), [XML parser](F123-audit-trx.ps1) | All numerical, source, owner, settings and accepted XML evidence independently recomputed |
| Copy and omission inventories | [Authoritative copies](authoritative-copies.json), [omitted files](omitted-file-hashes.json), [immutable seal](capsule-file-hashes.json) | Compiled images/build caches are hashed but not shipped |

Tracking and a directly connected final publication receipt are added only after this immutable evidence is remotely verified. The additive `publication.json` is excluded from the core seal; it must not rewrite this historical capsule.

## Why this plausible optimization was not selected

The scan identified a foreach through the interface-typed Readable property. Actual MVC controller/page producers cache arrays; public mutation creates a private exact List. Unlike F122's rejected concrete-only enumeration pattern, **the existing public IList.IndexOf consumer is reachable**: this harness executes it through the real ControllerContext property and checks its -1/0/4 HTTP response.

That production fit does not prove a performance opportunity. The private-list candidate preserves object.Equals, the explanatory index counter and the complete original fallback, but the copied-five primary regresses and has no reported allocation saving. BDN rounds amortized managed bytes; 0 B/op is not a proof of no allocation anywhere. No disassembly or specific JIT-cause claim is supplied.

The unmodified ordinary-source path has favorable measurements, and every such result is retained. It does not replace the declared copied-store primary. Unchanged Contains movement and every profile's variability remain visible. These are local optional application-consumer observations, **not normal-request frequency or request-throughput gains**.

## Why List.IndexOf is not an equivalent shortcut

The legacy code calls `object.Equals(storedElement, item)`, in order, and stops at the first match. `List<T>.IndexOf` can select `IEquatable<T>` equality instead. The tests deliberately supply both reference and value types whose object equality works but typed equality throws. They also preserve stored-left receiver/order, version detection after real copied-list mutation, matching early return before another MoveNext, and arbitrary-source enumeration/disposal on completion, match and exact Current/equality failure.

The new tests preserve existing behavior on original and candidate; no semantic bug is claimed. Existing managed page-producer tests pass, but **no compiled Razor Page request or browser validation is claimed**.

## Environment and reproducibility limits

- Baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`; actual default `f78194260f43c48ae2092675f55757f2a42dd63d`. All eleven selected original/default inputs match in Git text.
- SDK `12.0.100-alpha.1.26557.102`, x64 runtime `12.0.0-alpha.1.26562.105`, C# 13 and BDN 0.13.0. Host/runtime details remain in the [first raw report](comparison-001/Original/reports/results/AutoPerf.CollectionBenchmarks-report-full.json) and actual runtime records.
- Three warmups, eight retained results, requested 100 ms, unroll 1, DontRemove; orders Original -> Candidate, Candidate -> Original, Original -> Candidate.
- Shared non-isolated Windows box. Process/thread priorities stay Normal and affinity 65535; no power, affinity, firewall, URL ACL or other machine setting was changed.
- Each measured image has 328 entries; 326, including the common harness DLL/PDB, are identical. Only Core DLL/PDB change. Seven selected source documents match portable PDBs for three loaded owners; this is **not complete compiler provenance**.
- Measured binaries predate the source publication commit. Physical snapshots, image manifests and source/PE-PDB records are historical authority; a later commit alone does not reproduce the measured PE bytes.
- The relocated exact-eight-input project was actually restored/rebuilt; both untimed variants reuse measured owner/dependency bytes. Public compiled images/restore caches are intentionally omitted, so turnkey byte-identical fresh-clone replay is not promised.
- No AOT/trimming, packaging, compiled-page/browser, representative call-frequency, application-throughput or merge-readiness claim. No new public API or framework assembly-boundary mechanism.

## Audit without running benchmarks

```powershell
node .\F123-verify.mjs . --require-seal
```

This recomputes historical evidence without more timing. **Do not replay consumed authorizations or reopen the budget.** Exact machine-specific paths and activated commands are disclosed in [validation-commands.md](validation-commands.md). The classified report remains its fixed snapshot and excludes no-gain outcomes.
