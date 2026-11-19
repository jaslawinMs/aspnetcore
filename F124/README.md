# F124: bounded public Program analyzer traversal

**Qualified private-predicate trade-off, not an analyzer/build/IDE speedup or merge-ready recommendation.** The predeclared 38-node predicate primary has **83.73% median less time**, but **112 -> 168 reported B/op (+56)**. The actual fresh-driver MinimalProgram secondary shows **no demonstrated improvement (median 1.79% more time)**; a lone-declaration predicate is **13.83% slower**. Unchanged EarlyGuard measurements are highly unstable and narrowly avoid the predeclared rejection threshold. All **576 observations** and every adverse/control outcome remain; the three-slot budget is permanently closed.

## Connected artifacts

| Artifact | Link | Meaning |
|---|---|---|
| Independent source | [Fork branch](https://github.com/jaslawinMs/aspnetcore/tree/autoperf/F124-bounded-program-analyzer-traversal), [exact commit](https://github.com/jaslawinMs/aspnetcore/commit/720598d890234636942304ec853a598f41a1e985) | Two files, parent baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`; no stacked change |
| Shipping seam | [PublicPartialProgramClassAnalyzer.cs](https://github.com/jaslawinMs/aspnetcore/blob/720598d890234636942304ec853a598f41a1e985/src/Framework/AspNetCoreAnalyzers/src/Analyzers/WebApplicationBuilder/PublicPartialProgramClassAnalyzer.cs), [byte-exact seam](candidate-seam-verification.json) | Only Count() > 1 becomes Skip(1).Any(); every other source byte preserved |
| Preservation tests | [Exact committed class](https://github.com/jaslawinMs/aspnetcore/blob/720598d890234636942304ec853a598f41a1e985/src/Framework/AspNetCoreAnalyzers/test/WebApplicationBuilder/PublicPartialProgramClassTest.cs), [tested physical snapshot](source-files-candidate-002/src/Framework/AspNetCoreAnalyzers/test/WebApplicationBuilder/PublicPartialProgramClassTest.cs) | Two theory methods/six rows, all pass on original and candidate |
| Runnable benchmark | [Project](harness/AutoPerf.Benchmarks.csproj), [methods](harness/AnalyzerBenchmarks.cs), [eight source hashes](harness-source-hashes-002.json) | Four exact profiles/three methods; identical measured common harness DLL/PDB |
| Actual owning producer | [Real parser/compiler/driver](harness/AnalyzerScenario.cs), [characterization](harness/Characterization.cs), [premeasurement seal](premeasurement-validation.json) | Fresh CompilationWithAnalyzers; exact ASP0027 ID/severity/message/class spans and real generated-code policy |
| Every measurement | [All results and variability](comparison-results.md), [raw recomputation](measurement-audit.json) | Ordinary primary, scaling, one-node regression, full-driver secondaries and unchanged controls |
| Tests and exact commands | [Requirements and all outcomes](validation-commands.md) | 63 accepted XML executions; every failed prerequisite and successful successor disclosed |
| Independent reconstruction | [Verified receipt](reconstruction-paired-001/verified-reproduction.json), [exact copied project](reconstruction-paired-001/project/AutoPerf.Benchmarks.csproj) | Actually restored/rebuilt all eight inputs and exercised both measured owner/dependency variants without timing |
| Decision and timing closure | [Decision](decision.json), [closed budget](diagnostic-budget.json), [close receipt](permanent-budget-close.json) | Primary-only time qualification; allocation gate fails; no replay/retuning |
| Complete verification | [Portable auditor](F124-verify.mjs), [full audit](audit-summary.json), [XML parser](F124-audit-trx.ps1) | Raw statistics, allocations, images, PDB/source associations, actual settings and every accepted test row |
| Copy and omission inventories | [Authoritative copies](authoritative-copies.json), [omitted files](omitted-file-hashes.json), [immutable seal](capsule-file-hashes.json) | Full compiled/restore images are individually hashed but not shipped |
| Later issue, draft PR and visible-window evidence | [Additive live publication receipt](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F124/publication.json) | Added only after this immutable capsule is remotely verified; no sealed file is rewritten |

## Why the condition is equivalent

This syntax-only predicate is reached by the real registered class-declaration callback, but traversal occurs only after the empty public partial Program guards pass. Count() > 1 asks whether there is a second descendant. Skip(1).Any() discards the first and returns as soon as the second exists, rather than visiting the complete immutable Roslyn tree. **Any() alone would be incorrect:** a file containing only the empty Program class has exactly one descendant.

The focused tests deliberately put the real top-level entry point in a second compiler tree, so the one-node file remains valid C# without changing its per-file threshold. An empty sibling class plus Program gives exactly two nodes and the existing diagnostic/code fix. Tokens and default-excluded structured trivia do not turn a one-node file into two. Escaped @Program preserves ValueText. Generated files still follow the actual analyzer's generated-code suppression, even when the private predicate itself returns true.

## Qualification is deliberately narrow

The three primary effects are **83.73% / 83.58% / 85.71% less time** and exceed absolute same-profile unchanged location movement in every pair. The allocation-only gate fails. Full-driver primary effects are **-1.79% / -8.84% / +2.95%**; there is no demonstrated analyzer-wide improvement.

Unchanged EarlyGuard has **-522.24% / -8.94% / +83.34%** paired less-time effects, versus its unchanged location control's **-83.27% / +2.82% / +78.48%**. Its median slowdown **8.94%** is narrowly below the sealed **10%** rejection threshold; both adverse pairs remain. Do not interpret that as neutral or repeatable ordinary-path performance. No disassembly or specific JIT/environmental cause is assigned.

The 128-registration LargeProgram result is an explicit scaling probe, not ordinary workload frequency. More iterator allocation and the one-node regression are real trade-offs. This proposal is **not merge-ready**.

## Environment and reconstruction limits

- Baseline `37e809ead5824bc753a1c3d56f11615bdb1296c5`; actual default `744c772d93b79d4d52ff11c05818c4e8de55db6b`. All nine selected inputs matched in Git text before new test authorship.
- SDK 12.0.100-alpha.1.26557.102; x64 runtime 12.0.0-alpha.1.26562.105; C# 13; BDN 0.13.0; Roslyn 5.11.0-1.26420.103. Three warmups/eight retained, requested 100 ms/unroll 1/DontRemove; orders Original -> Candidate, Candidate -> Original, Original -> Candidate.
- Shared non-isolated Windows box. Process/thread Normal, affinity 65535. No power, affinity, priority, firewall, URL ACL or other machine changes.
- Each accepted measured image has 237 entries; **235**, including the common harness DLL/PDB and compiler reference metadata, are identical between measured Original/Candidate. Only actual analyzer DLL/PDB change. Two selected source documents match the loaded owner PDB; **not complete compiler provenance**.
- Actual default tests ran on its own genuine source-built graph, with existing command-scoped managed-only exclusions. Characterization uses that default owner with the same common harness/reference metadata. It is not complete-default binary isolation.
- Measured binaries predate the source commit. Physical snapshots and PE/PDB associations are historical authority; a later commit or SourceLink URL alone does not reproduce those measured bytes.
- The relocated project was actually rebuilt from its exact eight inputs and exercised both measured owner/dependency images without extra timing. Public compiled/restore images are omitted; turnkey byte-identical fresh-clone replay is not promised. The project accepts AspNetCoreRoot for an already built source tree.
- No request/application throughput, cold parse/build, full IDE, AOT/trimming, packaging, native/browser or merge-readiness claim. No new public API or framework assembly-boundary access mechanism.

## Audit without running benchmarks

```powershell
node .\F124-verify.mjs . --require-seal
```

This audits the historical capsule without more timing. **Do not replay consumed authorizations or reopen the budget.** See the exact activated commands and corrected prerequisites above. The classified REPORT.md remains its fixed 118-finalized snapshot.
