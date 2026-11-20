# F132: cached cascading-parameter name hashes

**No qualified gain; no shipping change or optimization PR.** The realistic short-name primary was numerically faster by **2.82% median** across three comparisons, below the sealed **10%** useful-gain gate. It saved **0 B/parent tick**. The intentionally long-name secondary improved **17.33% median**, but cannot replace the predeclared primary after timing.

The prototype also grows each metadata record 24->32 bytes, subscription key 16->24 and retained cascading-state record 40->48. These are actual struct sizes, not a complete retained-heap measurement. The status `no-gain` means unqualified under the agreed gate, not literally zero numerical improvement. Three authorizations are used and permanently closed.

## Connected artifacts

| Artifact | Link |
|---|---|
| Finding and sealed acceptance | [Original F132 and protocol](plan.json), [seal](plan-seal.json), [pre-edit baseline proof](baseline-completed.json) |
| Actual tested source | [Four-file throwaway patch](prototype.patch), [original key](images-v2/Original/source/src/Components/Components/src/ComponentSubscriptionKey.cs), [candidate key](images-v2/Candidate/source/src/Components/Components/src/ComponentSubscriptionKey.cs) |
| Runnable C#13 benchmark/probe | [Exact two-input project](harness/AutoPerf.CascadingHashes.csproj), [Program](harness/Program.cs) |
| Measurements and gate | [All raw-derived analysis](measurement-analysis.json), [three closed authorizations](diagnostic-budget.json), [frozen images accepted before timing](accepted-images-before-timing.json) |
| Actual renderer lifetimes | [Original](validation/original-characterize-002/observations.json), [actual default](validation/default-characterize-001/observations.json), [candidate](validation/candidate-characterize-001/observations.json), [restored original](validation/restored-characterize-001/observations.json) |
| Existing tests | [All 330 individual XML executions](all-existing-tests-audit.json), [exact commands and results](validation-commands.md), [auditor](F132-audit-trx.ps1) |
| Fresh-project reproducibility | [Actual rebuild and both untimed roles](reconstruction-001/verified-reproduction.json), [fresh source](reconstruction-001/project/Program.cs) |
| Exact restoration | [Physical source proof](source-restoration.json), [byte-identical original](images-v2/Original/manifest.json) and [restored consumer](images-v2/RestoredOriginal/manifest.json) |
| Narrow decision and audit | [Decision](decision.json), [live evidence audit](audit-summary.json), [portable verifier](F132-verify.mjs) |
| Completeness and omitted binaries | [Authoritative copies](authoritative-copies.json), [every owned bin/obj omission](omitted-file-hashes.json), [core seal](capsule-file-hashes.json) |

## Why caching is not free

The actual source reconstructs a `ComponentSubscriptionKey` for every get/subscribe/unsubscribe. Caching a hash only in that fresh key would not amortize string hashing. This prototype instead computes the name hash in the **already existing per-component-type cascading metadata cache**, then carries the integer in each key. Subscriber identity and ordinal property-name equality remain unchanged; direct captured-key checks confirm exactly the original hash formula, equal strings with distinct references, case/property/subscriber distinctions, default keys and default metadata.

No separate static cache or public signature is added. Existing CascadingParameterState cache clearing creates fresh derived hashes with replacement metadata, and existing retained-component refresh rebuilds bindings/subscriptions. Those source paths and existing tests are not a claim of an actual live metadata delta. The now-unused standalone property-name local was removed only at the constructor seam that consumes the complete metadata record; no cleanup was mixed elsewhere.

Ordinary `CascadingValueSource` does **not** use these subscription-key dictionaries. The generic custom-attribute provider is registered by the real public `TryAddCascadingValueSupplier`; the persistent-state provider also uses the key. This experiment does not claim all cascading values or applications pay this cost.

## Measurements

Each operation is one synchronous real parent tick delivering four cascading values to 64 retained children and completing their renders. Each process runs three warmup and eight retained batches of 256 ticks, with every sample retained. Orders are Original/Candidate, Candidate/Original, Original/Candidate. Positive means less elapsed time; negative means slower.

| Pair | Short-name primary | Long-name secondary | Ordinary-source matched control |
|---|---|---|---|
| 1 | 1.97% | 17.33% | 0.54% |
| 2 | 2.82% | 16.89% | -1.37% |
| 3 | 4.49% | 19.18% | 1.62% |

No profile saved update allocations. See raw values, full variability and actual producer counts below. The shared non-isolated box and fixed JIT settings limit extrapolation. Process-only overrides are TieredCompilation=0, TieredPGO=0, ReadyToRun=0; no power, affinity, priority or machine settings changed.

| Pair / role | Activated command | Raw profiles, clocks, allocations and provenance |
|---|---|---|
| 1 / Original | [Exact command](comparison-001/Original/command.ps1) | [Raw observations](comparison-001/Original/observations.json) |
| 1 / Candidate | [Exact command](comparison-001/Candidate/command.ps1) | [Raw observations](comparison-001/Candidate/observations.json) |
| 2 / Original | [Exact command](comparison-002/Original/command.ps1) | [Raw observations](comparison-002/Original/observations.json) |
| 2 / Candidate | [Exact command](comparison-002/Candidate/command.ps1) | [Raw observations](comparison-002/Candidate/observations.json) |
| 3 / Original | [Exact command](comparison-003/Original/command.ps1) | [Raw observations](comparison-003/Original/observations.json) |
| 3 / Candidate | [Exact command](comparison-003/Candidate/command.ps1) | [Raw observations](comparison-003/Candidate/observations.json) |

## Faithful boundary and corrections

Normal reflected attributes, real DI registration and actual HtmlRenderer-created component state produce the subscriptions. Changed parent-to-child Generation values cause normal parameter delivery; the harness never manually calls framework GetCurrentValue, subscription callbacks, render methods or metadata-update events as reachability proof. Each accepted lifetime verifies exact output/read counts, retained identity, child removal, reactivation and a second real child-removal unsubscribe. All 25 original consumer files were finally restored byte for byte; original/candidate differ only in actual Components DLL/PDB, with 23 other consumer files identical.

There are **54 accepted untimed lifetime observations**, **18 timed profile lifetimes**, **378 direct key-invariant rows**, **116 selected source/PE/PDB associations** and **123 actual runtime assembly records** across the retained executions. These are repetitions of three profiles, not that many unique tests. The direct key checks are an additional invariant boundary, not the producer proof.

The initial nine-row diagnostic is retained with six expected-to-be-corrected terminal assertion failures: renderer-wide DisposeAsync does not take the same unsubscribe path as render-batch child removal. [Exact initial source and explanation](preparation-corrections.json) remain. The corrected probe explicitly removes reactivated children through the real producer before renderer disposal; no product defect is asserted here.

All 330 existing XML executions passed: **264** belong to accepted original/default/candidate/restored runs; **66** are a separately retained first restoration attempt that still consumed the exact stale candidate owner. Copying older source mtimes let incremental compilation skip the owner; the byte-identity guard caught it. [The actual timestamp/hash diagnosis](preparation-001/stale-restoration-owner.json), explicit owner Rebuild, repeated tests and successful frozen restoration remain. Do not treat that first green test run as original-owner proof.

Two numeric MemberData rows share a display name/testId, but have distinct executionId values; both XML rows are retained and checked. Three missing-assets attempts triggered restores only after NETSDK1004. The supplemental twentieth Renderer source differs on actual default in unrelated event/error routing; [the recorded delta](research/supplemental-renderer-default-diff.stdout.txt) and [default snapshot correction](preparation-001/default-freeze-correction.json) remain. Only the original 19 selected inputs were claimed Git-text identical.

## Reproduce without historical timing replay

After checking out this evidence branch, run `node .\F132\F132-verify.mjs .\F132 --require-seal` with Node and PowerShell 7. This audits the portable recorded evidence; compiled images are deliberately omitted and hashed, so it is not newly established historical binary provenance.

To run the diagnostic afresh, genuinely build the source owners from the stated commits (Core.Tests and the Media.Tests dependency graph supplying Web/JSInterop), activating the appropriate checkout first. Copy the exact two project inputs, override ReferencePathRoot and ComponentsOwnerRoot to those compiled directories, and build the project. Its runtime is pinned to 12.0.0-alpha.1.26562.105 and C# 13. Restore only if missing assets require it. Create sibling `bin` and `source` directories matching the recorded manifest; put the selected physical source snapshots under `source`. Invoke `dotnet <bin>\AutoPerf.CascadingHashes.dll characterize <role> <output.json>`. The independently rebuilt inputs and exact executed commands are linked above. Private orchestration scripts have this machine's absolute paths and are retained as execution evidence, not advertised as a portable bootstrap.

Do **not** replay the exhausted `measure` comparisons for this finding. The fresh two-input reconstruction actually repeated both original and candidate diagnostic roles while preserving each corresponding image's 23 other consumer files. It does not rebuild every historical owner/compiler input.

Original source baseline: 37e809ead5824bc753a1c3d56f11615bdb1296c5. Actual default tested: ae89581dfd24c6277b4267a9779d05f7b9f047f1. Scope excludes real Session/TempData I/O, persistence navigation, native browser/DOM, Server/WASM/Auto lifecycle, trimming/AOT, complete compiler provenance and whole-app performance. Any future shipping proposal still needs the applicable implementation, sample/permanent-coverage and live-edit work. No source PR or browser window is created for this unqualified result.
