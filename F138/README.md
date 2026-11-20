# F138: uniqueness-preserving OpenAPI body selection

**Disposition: rejected without admitting a candidate or comparison.** Classification: **unmeasured document-metadata query modernization**. The repeated filtered query is real, but no representative material benefit was established. This is **not measured no-gain**, a false-positive enumeration claim, or proof of zero cost. The comparison budget is permanently closed at **0 of 3**.

`ApiDescriptionExtensions.TryGetBodyParameter` asks whether there is **exactly one** Body parameter, not whether any exists. Its current `Where` / `Count() == 1` / `Single()` performs repeated selection on the successful path. **`Any()` would accept multiple Body parameters; `SingleOrDefault()` would throw instead of returning false.** A one-pass implementation is possible but would have to preserve all three cardinality states and the selected object's identity; none was applied.

| Body matches | Required return | Required out parameter |
|---:|---|---|
| 0 | false | null |
| 1 | true | The exact selected `ApiParameterDescription` |
| 2 or more | false | null |

## Real producer, consumer, and frequency

The fixture uses source-built `WebApplication`, real mapping/`RequestDelegateFactory`, DI/controller discovery, actual minimal/MVC ApiExplorer providers, and **real TestServer HTTP GETs to `MapOpenApi`**. There is no copied helper, mocked pipeline, private collection substitution, or injected provider result. Test-side reflection invokes the actual internal helper alongside document requests to check selected/out identity.

The real lists exercised contain **0-3 parameters**. Required/optional JSON, first/middle/last Body positions, path/query/header ordering, custom content types, and `.Accepts<Payload>()` synthetic Body metadata are covered. Minimal form metadata is actually FormFile, MVC form metadata is Form, and two files remain FormFile/FormFile. The helper correctly returns false/null for those non-Body sources while the separate form consumer emits a form request body.

A real endpoint with two `[FromBody]` parameters is rejected by `RequestDelegateFactory` **before the helper runs**. One separately labeled, unhosted public metadata-list guard control combines two real generated Body objects. It establishes helper multiplicity semantics, **not a shipping multiple-body producer**.

`OpenApiDocumentService.GetRequestBodyAsync` consumes the result during operation/document construction. ApiExplorer caches descriptions by action-descriptor version; document requests visit included descriptions. That is not evidence this helper executes on each business/API request, or that usually short metadata lists justify extra uniqueness-tracking code. Production frequency, representative expensive document workloads, allocation savings, and timing benefit remain unmeasured.

## Connected evidence

| Artifact | Actual result and boundary | Evidence |
|---|---|---|
| Original source graph | `37e809ead5824bc753a1c3d56f11615bdb1296c5`; own source/reference/restore graph | [Exact commands](owner-handoff/COMMANDS.md), [graph metadata](owner-handoff/project-graphs.json) |
| Observed default source graph | `00560e2dd1954a2acf2bc54b35422b0f32484bf1`; independently queried/built; 84 projects per restored graph | [Preparation facts](owner-handoff/README.md), [source catalog](owner-handoff/source-catalog.json) |
| Existing tests | **105 passed / 2 pre-existing skips per role**; each actual XML/theory row retained | [All test rows](owner-handoff/test-rows.json), [Original TRX](owner-handoff/results/baseline-existing/baseline.trx), [default TRX](owner-handoff/results/default-existing/default.trx) |
| Actual document/helper characterization | **29 passing assertions per role: 28 producer/output/cache/rejection + 1 isolated multiplicity control** | [Original assertions](owner-handoff/results/baseline-producer/assertions.json), [default assertions](owner-handoff/results/default-producer/assertions.json) |
| Runtime distinction | Existing tests: Original `12.0.0-alpha.1.26562.105`, default `12.0.0-alpha.1.26568.110`. **Both common HTTP probes ran 68**. SDK `12.0.100-alpha.1.26557.102`; untimed Debug characterization, not a Release comparison | [Runtime prerequisites](owner-handoff/runtime-prerequisites.json), [facts](owner-handoff/facts.json), [exact commands](owner-handoff/COMMANDS.md) |
| Common consumer | One successful C# 13 compilation; same canonical DLL/PDB/deps/runtimeconfig; DLL SHA/MVID observed in both processes. Other three hashes collected after both executions, not independently before the first | [Common files/source](owner-handoff/consumer), [facts](owner-handoff/facts.json) |
| Selected provenance | Fresh independent selected OpenAPI PE/PDB associations and **6 raw source checks per role**, plus common PE/PDB and **4 raw common documents**; 66 separate raw/Git source records | [Deep auditor](owner-handoff/audit_capsule.py), [coordinator audit](coordinator-owner-audit.json), [acceptance](coordinator-acceptance.json) |
| Executable-image comparison | **626 DLL/EXE entries: 330 identical / 296 different, including 295 non-target-owner differences; no prefix exclusions. Not a causal performance pair** | [All comparison entries](owner-handoff/image-comparison.json), [omitted output files](owner-handoff/omitted-output-files.json) |
| Performance proposal | No candidate, allocation/timing measurement, performance PR, or new browser window | [Closed budget](closed-budget.json); additive issue/index linkage will be in `publication.json` |

### Skipped cases are not verified

These exact existing tests did not reach assertions on either role, both citing [dotnet/aspnetcore#55349](https://github.com/dotnet/aspnetcore/issues/55349):

- `OpenApiDocumentServiceTests.GetOpenApiRequestBody_HandlesFormWithMultipleMixedTypes_MvcAction`
- `OpenApiDocumentServiceTests.GetOpenApiRequestBody_HandlesStreamAndPipeReader_MvcAction`

The faithful validation boundary used instead is real ApiExplorer and TestServer/OpenAPI output for the explicit cases above. It **does not verify these two scenarios**. Domain-handler body execution, build-time generation execution, Native AOT/trimming, third-party providers, and concurrent collection mutation remain excluded.

## Integrity and replay boundary

The coordinator independently audited and copied **243 selected files / 11,730,526 bytes** without altering the original capsule. Manifest SHA256: `D0273C0482DF6B7F1C78917C678EAA5A4BF9BDDEA2EFE72D12844112355DCD19`. The copied deep audit is also executed before publication.

| Portable command | Observed result |
|---|---|
| `node .\verify.mjs` | Passed; copied hashes, source records, saved facts, every inventoried image-comparison entry, budget, and seal when present. No fresh binary/XML parsing in this Node wrapper. |
| `python -B .\owner-handoff\audit_capsule.py .\owner-handoff` | Passed; standard-library-only parsing of selected PE/PDB/raw-source metadata and every saved native XML row. No .NET process, test replay, or benchmark starts. |

Exact interpreter path/hash, arguments, PIDs, exits, and fully drained outputs are retained in the acceptance receipts. These portable spellings do not install Python or claim the Windows `python` alias works. The preserved preparation's `PENDING` labels are historical snapshots, not the current disposition.

The target Git blob is `6758d349fbaf281f093656ad7d6560c4ba9ce46f`. Raw compiled Windows SHA256 is `68630FFC68DA7EBA1934A98B711C0B0BB3BB70560FAD537F57139EB2FBC5AB93`; its LF/Git identity is tracked separately. Publication-time freshness is target-file-only, not a later full graph rebuild.

Broader metadata-reader logs associate additional owners and available documents; the independently copied deep audit does not freshly attest every omitted owner binary or full compiler input. The 626-entry union covers both common-probe test-output image graphs, their shared runtime68 images, and the common DLL. Baseline62 and SDK/VSTest prerequisites are separate: this is **not** a complete existing-test-process loaded-image census or all-file closure. Omitted graphs/output/runtime/SDK/package trees were not freshly rehashed by the coordinator. `fullCompilerInputAttestation` remains false.

Initial missing props/task/assets, runner-help non-evidence, and embedded Python import-isolation failures remain recorded. The one successful consumer compilation retained three `CS0436` Program-name warnings; no analyzer blanket-disable or source repair was applied. All 75 recorded native commands/streams are terminal; subsequent seal/audit terminal receipts remain outside the original immutable capsule.
