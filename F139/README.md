# F139: real Razor emission, but no admitted stream optimization

**Disposition: rejected without a candidate or comparison.** Classification: **development-time buffer/loader optimization with unestablished benefit and equivalence**. Growable `MemoryStream` emission and final `ToArray()` copies are real. This is **not measured no-gain**, proof that the copies are free, or a claim that no equivalent optimization is possible. The budget is permanently closed at **0 of 3**.

`RuntimeViewCompiler.CompileAndEmit` emits assembly data and optional portable symbols, retains the actual diagnostics on failure, rewinds the streams, and calls the existing `Assembly.Load(byte[], byte[]?)`. Avoiding copies is not merely substituting a collection method: the exact emitted bytes, optional PDB behavior, dependency loading, assembly identity, and load-context lifetime must remain correct. No `LoadFromStream` replacement or capacity estimate was implemented or proved equivalent.

## What actually ran

Public MVC/RuntimeCompilation registration and physical `.cshtml` files drive the actual `RuntimeViewCompilerProvider`, `RazorProjectEngine`, package Roslyn `Emit`, unchanged `Assembly.Load`, emitted view type, and **real `RazorView.RenderAsync` output**. This is not F137's precompiled-view lookup and not an injected compiler/change-token callback.

| Requirement | Actual observed evidence |
|---|---|
| Material view output | `KnownRenderedOutput`: exact `F139|42|rendered` plus LF, twice for each portable/none setting |
| Actual PDB consumption | `ActualLoadedPdbStackFrame`: emitted exception points to `Throw.cshtml`, line 1 with portable symbols; no emitted-frame file/line with none |
| Real failed C# compilation | `InvalidCSharp.cshtml-ExactDiagnostic`: exact CS0103 source diagnostic and source span |
| Real failed Razor processing | `InvalidRazor.cshtml-ExactDiagnostic`: exact RZ1006 missing-brace diagnostic and source span |
| Existing cache/lifetime | `RepeatedCompilerRetention` and failure-retention cases retain actual tasks, descriptors/types and exceptions; this is not source-change invalidation or a long-run retention test |

There are **26 passing common-consumer assertions and 26 passing existing native tests per source role**. Existing unit tests include lower-level direct Emit and mocked compiler-option cases; only the separate real-file/render fixture establishes the full producer/consumer boundary above.

## Connected artifacts

| Artifact | Result / link |
|---|---|
| Source pins and closing observation | Original `37e809ead5824bc753a1c3d56f11615bdb1296c5`; actual entry default `00560e2dd1954a2acf2bc54b35422b0f32484bf1` built independently. Closing `c97a797...` was **not built**. [Facts](owner-handoff/facts.json), [all commands](owner-handoff/commands.json) |
| Actual consumer assertions | [Original rows](owner-handoff/results/original-producer/rows.json), [default rows](owner-handoff/results/default-producer/rows.json); 26 each, exact diagnostic artifacts beside them |
| Existing native reports | [Original TRX](owner-handoff/native-tests/original.trx), [default TRX](owner-handoff/native-tests/default.trx), [all 52 named/identified rows](owner-handoff/native-test-rows.json) |
| Actual loaded owners/contexts | [Original loaded assemblies](owner-handoff/results/original-producer/loaded-assemblies.json), [default loaded assemblies](owner-handoff/results/default-producer/loaded-assemblies.json), [original emitted assemblies](owner-handoff/results/original-producer/emitted-assemblies.json), [default emitted assemblies](owner-handoff/results/default-producer/emitted-assemblies.json) |
| One common compilation | Same verifier, context fixture DLLs/PDB/deps/runtimeconfig reused across roles. [Common closure](owner-handoff/common-once.json), [actual context settings](owner-handoff/fixture-context-configuration.json), [literal LF fixture correction](owner-handoff/fixture-line-ending-receipt.json) |
| Fresh selected provenance | Eight selected owner PE/PDB associations: 11 raw documents per role, plus common `Program.cs`; 40 separate raw/Git source records. [Source catalog](owner-handoff/source-catalog.json), [portable deep auditor](owner-handoff/audit.mjs) |
| Every copied role-image difference | 59 entries: **5 identical / 54 different**, including 52 outside the target DLL/PDB. No prefix exceptions and **not a causal performance pair**. [All entries](coordinator-image-comparison.json), [original inventories](owner-handoff/image-inventories.json), [omitted inputs individually inventoried](owner-handoff/omitted-input-image-entries.json) |
| Independent coordinator acceptance | [Actual Node audit + real XML reconciliation of all 52 rows/definition/execution IDs](coordinator-owner-audit.json), [copied-capsule audit and bounded decision](coordinator-acceptance.json) |
| Budget / issue / PR | [Permanently closed 0-of-3 budget](closed-budget.json); no PR or browser window. Later tracking/index links are additive in `publication.json` |

### Important preparation limitations

**Integrity/observed data passed; CI cleanliness was not accepted.** The artifact has an unnecessary-to-date **local `ASPDEPR003` warning pragma** around deliberately obsolete registration: a genuine compiler blocker requiring it was **not demonstrated**. Native dependency warning policies were unchanged, but this is an explicit preparation guardrail limitation, not an approved exception. Eleven emitted common-build warnings remain visible. The verifier was not rebuilt to conceal either limitation.

The verifier/context artifacts are C# 13, but generated Razor is deliberately parsed as **C# 8** by the existing package Roslyn 4.0.0, using the owning dependency-context setting. Initially unsupported generated C# 13 metadata attempts and failures remain recorded. This **does not establish C# 13 Razor runtime-language compatibility**. Only four physical fixture line endings were normalized to LF after the unchanged literal-output assertion correctly rejected CRLF; no verifier or context assembly was recompiled.

Original executes exact runtime `12.0.0-alpha.1.26562.105`; default executes exact private `12.0.0-alpha.1.26568.110`. SDK is `12.0.100-alpha.1.26557.102`, roll-forward disabled, host traces retained. The copied 59-entry role images are **not a complete runtime/package/test-runner/all-file closure**. Omitted trees were not freshly rehashed by the coordinator. Full compiler-input attestation remains false.

Actual repeated compile/render and failure-cache identity establish reuse within provider lifetimes, not a representative expensive-edit workload or measured costs. Raw emitted PE/PDB payload length/capacity/trailing-byte behavior, a replacement loader's dependency/context matrix, material allocation benefit, full dependency resolution, source/file-change invalidation, long-run unloading, hosted HTTP, browser and Hot Reload remain unverified. No capacity, pooling, or loader change was admitted on that evidence.

## Integrity and replay boundary

The coordinator independently audited and copied **247 files / 40,207,210 bytes** unchanged; manifest SHA256 `3E6124B7CB8F62B4C45C54DAF862C5B7E5B8CE7154B58388DC3F897C5C2666A3`. All 53 recorded native commands/streams are terminal. Initial metadata-only PID gaps and the non-exhaustive fast-descendant census remain explicit in [terminal state](owner-handoff/terminal-state.json).

| Command | Observed result |
|---|---|
| `node .\verify.mjs` | Passed; copied hashes, every role-image entry/difference, receipts, closed budget and seal when present. Runs the copied read-only Node auditor, **not .NET or a test replay**. |
| `node .\owner-handoff\audit.mjs` | Passed; freshly parses selected PE/PDB/MVID/document checksums and reconciles saved native rows with XML text. Its XML matching is regex-based; the separate coordinator receipt adds **real `System.Xml.XmlDocument` parsing** of every native row, definition/execution ID and counter. |

The original capsule's `PENDING` values are preserved historical snapshots, not the current disposition. Publication-time source freshness checks only the target Git blob `b291f04441057c57092eb6e4731956b1be2d8bd6`; a matching later file is not a later full graph build. Existing stream growth/copy cost remains real but unmeasured.
