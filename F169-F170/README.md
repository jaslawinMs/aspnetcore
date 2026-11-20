# F169-F170: conditional-pipeline test-helper lookups

**Not admitted as performance changes.** Both retained patterns are private helpers in `UseWhenExtensionsTests`, not shipped middleware. A `TryGetValue` cleanup is plausible, but no material suite benefit was established. Each finding is permanently closed **0 of 3** comparisons: no candidate, benchmark, allocation/timing result, performance PR or browser window. This is **not measured no-gain**, a zero-cost claim, or a correctness bug report.

| Finding | Actual code and workload | Assessment |
|---|---|---|
| F169 | `Increment` captures its key when middleware is configured; its body runs through real `UseWhen`/`Use`. The three native pipeline Facts create new contexts and increment each reached key once. | Their present-key increment branch is never reached. Supplemental seeded/repeated states establish real downstream behavior, not an existing suite or production hot path. The branch is not universally unreachable. |
| F170 | `Count` privately reads the completed test context. The three native pipeline Facts contain eight calls in total, derived from source rather than measured counters. | The extra lookup is real for present keys, but this small assertion-reader workload does not establish a material suite benefit. |

## Connected evidence

| Artifact | Direct evidence and boundary |
|---|---|
| Tracking and final publication | [Verified publication](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F169-F170/publication.json), including the fork tracking issue; no implementation PR. |
| Decision and own budgets | [Acceptance](coordinator-acceptance.json), [closed budgets](closed-budgets.json). |
| Accepted preparation | [Owner handoff](owner-handoff/HANDOFF.md), [requirements and boundaries](owner-handoff/requirements-and-boundaries.json), [original/default roles](owner-handoff/roles.json). |
| Native tests and raw results | [Exact cases, IDs, counters and raw-XML paths](owner-handoff/native-tests.json). Four Facts per role, eight passed executions total; the initial default runtime abort has zero cases. |
| Supplemental behavior | [Twelve exact checks per role and observations](owner-handoff/supplemental-results.json), [common C#13 inputs](owner-handoff/common/inputs/Program.cs), [project](owner-handoff/common/inputs/UseWhenPreparation.csproj). These are separate console checks, not discovered VSTest cases. |
| Source, loaded identities and image differences | [Raw-source facts](owner-handoff/source-facts.json), [selected images](owner-handoff/binary-selection.json), [all declared inventories](owner-handoff/inventories.json.gz), [all differences](owner-handoff/all-differences.json.gz), [actual loaded observations](owner-handoff/loaded-images.json.gz). |
| Independent coordinator checks | [Whole selection verification](coordinator-whole-payload-verification.json), [fresh real System.Xml reconciliation](coordinator-independent-system-xml.json), [unchanged authoritative copies](authoritative-copies.json). |
| Reproduction of the portable audit | `node verify.mjs --require-seal`; [owner auditor](owner-handoff/audit.mjs), [fresh metadata/XML parser](owner-handoff/evidence.mjs), [selection manifest](owner-handoff/manifest.json), [original selection seal](owner-selection-seal.json). This reads evidence only; it does not rerun native assertions. |

## Why the conditions matter

The actual default producer is `DefaultHttpContext` -> lazy `ItemsFeature` -> `ItemsDictionary` -> a backing `Dictionary<object, object?>` allocated on the first write. String keys use case-sensitive value equality under this observed default comparer. `Items` is replaceable: this is not a universal comparer or storage guarantee for custom dictionaries.

`Increment` performs the integer addition only when a present value is a boxed `Int32`; missing, null, string and boxed `Int64` values become 1. Native unchecked arithmetic wraps `Int32.MaxValue` to `Int32.MinValue`. `Count` returns the exact boxed `Int32` or 0 without writing. A proposed one-probe rewrite would have to preserve these type checks, not merely replace a missing-value default.

The twelve supplemental checks invoke the actual compiled private factory/reader by reflection, then execute the returned middleware through the real public `ApplicationBuilder`/`UseWhen`/`Use` pipeline. They cover reused/fresh contexts, seeded integer boundaries, null/wrong-type resets, string equality, real termination and false branches. The default terminal's real `__RequestUnhandled` write and 404 are observed; no fake next callback replaces it. Invalid null-key checks are explicitly private-helper/diagnostic input: they do not prove a valid HTTP producer. Custom `Items`, concurrent mutation and external HTTP traffic were not run.

## Execution and identity limits

The unchanged sources are Original `37e809ead5824bc753a1c3d56f11615bdb1296c5` and observed default `90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d`. Both target-source Git blobs are `b39f603e1bb068551cc57d62ff5f657682408ebf`. The successful native assertion testhosts genuinely use runtimes **62 and 69**. Both supplemental consoles and SDK/VSTest runners use **57**, in distinct processes. Hostfxr 65 is a loader, not the assertion runtime. The one accepted common C#13 consumer compiled successfully once and is byte-identical across roles.

All actual failed attempts remain: missing generated props, missing ANCM, missing common assets and the default zero-row runtime69 abort. The ancillary `UseIisNativeAssets=false` build retry followed the ANCM failure; this study exercises no IIS/native boundary. Exact69 was staged privately only after its runtime failure; it is not currently unavailable. Native preview language/analyzers were preserved, rather than describing the entire repo as a C#13 or clean default build.

The **173-file, 66,904,424-byte** owner selection is unchanged. The portable audit freshly parses **26 PE images, 11 portable PDBs and 26 selected raw-document checksum associations**, reconciles actual XML and the independent real-XML receipt, and verifies all **1,313 declared image-union rows / 831 differences** with no prefix exemptions. Omitted bytes have saved hashes only: there is no portable fresh omitted-file rehash, full compiler-input attestation, runnable whole-image closure or causal optimization pair. Bounded owner-load observations are not an exhaustive execution census. Awaited native roots/streams and fresh known-child checks are recorded, not uninterrupted host idleness.

The publication adds only this bounded decision and evidence. It does not revise the fixed classified `REPORT.md` snapshot or reopen a closed comparison budget.
