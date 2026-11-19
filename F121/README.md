# F121: MVC CopyTo copied-store experiment - no gain

**Disposition: no-gain; no performance PR and no merge recommendation.** The declared already-copied five-factory primary is **16.03%, 5.06% and 18.84% slower**. Median paired effect: **16.03% more time**. BenchmarkDotNet reports **0 B/op before and after** in all three pairs. Three complete comparisons retain **768 observations**; the timing budget is permanently closed.

## Connected artifacts

| Artifact | Link | Meaning |
|---|---|---|
| Diagnostic source | [Independent fork branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F121-copy-on-write-copyto), [exact source commit](https://github.com/jaslawinMs/aspnetcore/commit/f60d71e24d104529abc4b72edd3c1e786c772959) | `f60d71e24d104529abc4b72edd3c1e786c772959`, parent `37e809ead5824bc753a1c3d56f11615bdb1296c5`; not proposed for merge |
| Shipping seam | [CopyOnWriteList.cs](https://github.com/jaslawinMs/aspnetcore/blob/f60d71e24d104529abc4b72edd3c1e786c772959/src/Mvc/Mvc.Core/src/Infrastructure/CopyOnWriteList.cs) | Ten insertions only in `CopyTo`; source-backed loop untouched |
| Preservation tests | [Exact test source](https://github.com/jaslawinMs/aspnetcore/blob/f60d71e24d104529abc4b72edd3c1e786c772959/src/Mvc/Mvc.Core/test/Infrastructure/CopyOnWriteListTest.cs), [tested physical snapshot](preservation-source/src/Mvc/Mvc.Core/test/Infrastructure/CopyOnWriteListTest.cs) | Six methods, twelve Boolean rows, green on original and candidate |
| Runnable BDN project | [Project](harness/AutoPerf.Benchmarks.csproj), [timed methods](harness/CollectionBenchmarks.cs), [eight source hashes](harness-source-hashes.json) | Same common source/DLL/PDB for both measured variants |
| Real producer | [HostedProducer.cs](harness/HostedProducer.cs), [baseline seal](baseline-validation.json), [premeasurement seal](premeasurement-validation.json) | Actual routed MVC controller actions; no factory-property assignment or surrogate collection |
| All measurements | [Comparison tables](comparison-results.md), [independent raw recomputation](measurement-audit.json) | Every adverse, favorable and unchanged-control row retained |
| Correctness and commands | [Requirements, exact commands and outcomes](validation-commands.md) | 117 historical passing individual XML rows; no hidden skipped row |
| Independent reconstruction | [Verified result](reconstruction-paired-001/verified-reproduction.json), [exact copied project](reconstruction-paired-001/project/AutoPerf.Benchmarks.csproj) | Actually restored/rebuilt all eight inputs and characterized both source variants; no extra timing |
| Final decision and budget | [Decision](decision.json), [closed budget](diagnostic-budget.json), [close receipt](permanent-budget-close.json) | No primary timing/allocation qualification; no replay or retuning |
| Complete verification | [Portable verifier](F121-verify.mjs), [full audit](audit-summary.json), [XML parser](F121-audit-trx.ps1) | All samples, source bindings, owner/settings records and individual rows independently checked |
| Exact-copy and omission inventories | [Authoritative copies](authoritative-copies.json), [omitted files](omitted-file-hashes.json), [immutable seal](capsule-file-hashes.json) | Omitted binaries/build caches are hashed, not shipped |

Tracking and the final campaign/index receipt are added only after this immutable evidence commit is published. The later `publication.json` is additive and excluded from the core seal; it must not rewrite this historical capsule.

## Why this apparently simple change was not accepted

The scan identified interface enumeration in `CopyTo`. All four inspected controller/page producers cache arrays; a private exact `List<T>` exists only after a public write. The candidate enumerates that private concrete list while retaining the original per-item assignment and untouched source fallback.

The runtime measurements do **not** show the predicted copied-store allocation saving. Reported allocation is 0 B/op for both copied variants, including all three primary pairs. BDN rounds amortized per-operation bytes; that is not proof of no allocation anywhere, and no disassembly was collected to establish a JIT explanation.

Empty and ordinary source-backed profiles have favorable observations, but they do not replace the declared copied-store primary. The ordinary source-backed path itself was not edited, and unchanged controls also move. See every result and its variability in [comparison-results.md](comparison-results.md). There is no normal-request, whole-MVC or application-throughput claim.

## Behavioral compatibility

This legacy method deliberately retains its observed behavior, including no destination validation for an empty source and partial successful writes before bounds or covariant-array failures. Replacing it with `List<T>.CopyTo` or `Array.Copy` without additional analysis would not preserve that boundary. The original interface fallback also has to respect arbitrary supplied enumeration and disposal, rather than assuming an indexer or ordinary List subclass behavior.

The new tests preserve these contracts on both source-backed and already-copied stores. They are not semantic-bug regression claims. HTTP characterization exercises real per-request production, public mutation and source isolation, both controller invoker modes, direct CopyTo and real `Enumerable.ToArray` consumption. Existing managed page-producer tests pass, but **no compiled Razor Page request or browser validation is claimed**.

## Source, environment and reproducibility limits

- Campaign baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`; actual default checked and built: `f78194260f43c48ae2092675f55757f2a42dd63d`. All ten selected original/default inputs match in Git text.
- SDK `12.0.100-alpha.1.26557.102`, x64 runtime `12.0.0-alpha.1.26562.105`, C# 13 and BDN 0.13.0. Exact host/hardware and runtime data are retained in the [raw first report](comparison-001/Original/reports/results/AutoPerf.CollectionBenchmarks-report-full.json) and runtime records.
- Three warmups, eight retained results, requested 100 ms, unroll 1, no outlier removal. Source orders: Original -> Candidate, Candidate -> Original, Original -> Candidate.
- This is a shared, non-isolated Windows box. Process/thread priorities remain Normal and affinity 65535; no affinity, power, firewall, URL ACL or other machine setting was changed.
- Original/candidate images contain 328 files; 326 entries, including the common harness DLL/PDB, are identical. Only source-built MVC Core DLL/PDB differ. Six selected portable-PDB documents match three actually loaded owners; this is **not complete compiler provenance**.
- Measured binaries predate the later source publication commit. Physical source snapshots, image inventories and portable-PDB associations are historical authority; a later commit ID alone is not claimed to reproduce measured PE bytes.
- The exact relocated common project was actually restored and rebuilt. It reused measured owner/dependency bytes and verified both untimed variants. The public capsule omits compiled images/restore caches and does not promise turnkey byte-identical fresh-clone replay.
- No AOT/trimming, packaging, compiled-page/browser, representative call-frequency or merge-readiness claim. No new public API or framework assembly-boundary mechanism.

## Verify the capsule without running benchmarks

```powershell
node .\F121-verify.mjs . --require-seal
```

The audit recomputes the historical observations; it does not rerun timing. Historical authorizations are consumed. **Do not replay them.** Source-building commands use the activated repository and its unchanged feed configuration; machine-specific repository paths are recorded explicitly in [validation-commands.md](validation-commands.md).
