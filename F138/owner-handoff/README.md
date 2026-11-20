# F138 — untimed preparation facts

**Official state: PENDING.** This is a facts handoff, not an implementation, adopted candidate, performance result, or verdict. No shipping source, coordinator output, campaign ledger, public GitHub state, machine configuration, dependency pin, or existing sealed capsule was changed. No explicit HOLD/RELEASE was received.

## Source and acceptance boundary

- Baseline: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Fresh upstream `main`: `00560e2dd1954a2acf2bc54b35422b0f32484bf1`, independently obtained through `gh api repos/dotnet/aspnetcore/commits/main` at this preparation's start, then fetched into the private default clone. This is a timestamped snapshot, not a promise that upstream cannot advance.
- Coordinator checkout `24875ef5dabb55567870b39f6eb0002170435e2f` was read only. Neither its current outputs nor another owner's source/output graph supplied these builds.
- Each private role generated its own build props, restored its own assets, and built the real OpenAPI test project and its project references: **84 projects per restored graph**, with no foreign project paths. Both tracked working trees were clean afterward.
- The target helper and the inspected request-body consumer/endpoint producer are unchanged between these two commits. Raw selected sources, Git LF identities, exact history, pinned official documentation, and bounded existing-work searches are retained. The helper is present in the 2024 request-body introduction history / PR [55040](https://github.com/dotnet/aspnetcore/pull/55040). Search absence is not a global related-work census.

Acceptance was source-role characterization, real producer/output assertions, exact existing test rows, identity associations, and a small auditable handoff—not a candidate or red/green optimization experiment. The skipped cases below and broader excluded boundaries remain unverified.

## Contract and real producers

`src\OpenApi\src\Extensions\ApiDescriptionExtensions.cs:131–142` resets the out parameter, filters **Body only**, tests `Count() == 1`, then obtains `Single()`. Its observable stable-list contract is:

| Body matches | Result | Out parameter |
|---:|---|---|
| 0 | false | null |
| 1 | true | exact selected `ApiParameterDescription` identity |
| 2 or more | false | null |

`Any()` alone admits multiple matches; `SingleOrDefault()` throws on multiple matches. Neither is equivalent. No rewrite was applied, including the later unadopted rewrite mentioned in the campaign.

The bounded OpenAPI shipping-source search found the call in `OpenApiDocumentService.GetRequestBodyAsync` (`:691–706`), reached from operation construction (`:340`). A selected Body parameter determines JSON/stream/patch request-body metadata, schema, requiredness, description, and supported media types. With no selected Body, the consumer separately handles Form/FormFile, otherwise returns a null request body.

The fixture uses source-built `WebApplication`, real mapping/`RequestDelegateFactory`, DI/controller discovery, `EndpointMetadataApiDescriptionProvider` or MVC's `DefaultApiDescriptionProvider`, and **real TestServer HTTP GETs to `MapOpenApi`**. There is no copied helper, mocked pipeline, provider-result substitution, or private-state injection. Reflection only invokes the actual internal helper for its selected/out identity alongside the normal HTTP document path.

The consumer's document assertions cover request-body presence, requiredness, and media-type keys; the complete generated document is retained. They do not independently assert every schema or description field.

Observed distinctions:

- Empty/query-only descriptions return false/null and emit no request body.
- Body parameters at first, middle, and last positions preserve identity and surrounding Path/Query/Header order.
- Required/optional JSON, explicit custom content types, and the real `.Accepts<Payload>()` synthetic Body description produce their expected document output.
- Minimal `[FromForm]` is represented as **FormFile** by its real provider; MVC `[FromForm]` is **Form**. Two real file parameters remain FormFile/FormFile. All yield helper false/null while the separate form consumer emits the expected form request body.
- A real mapped endpoint with two `[FromBody]` parameters is rejected by `RequestDelegateFactory` while materializing endpoints, **before** ApiDescription/OpenAPI helper execution. Do not call it a shipping multiple-body producer.
- One separately labelled, unhosted **public metadata-list guard control** reuses two actual generated Body parameter objects and verifies false/null. It proves only helper multiplicity semantics, not producer reachability.

The real lists exercised here contain **0–3 parameters**. `ApiDescription.ParameterDescriptions` is the actual get-only List-backed property, and Source is a nonvirtual auto-property. No hypothetical throwing getter, predicate callback, concurrent collection mutation, or replacement private collection was tested.

## Frequency—not a hot-path claim

`ApiDescriptionGroupCollectionProvider` caches descriptions by action-descriptor version. OpenAPI document generation visits included descriptions to construct operations. `MapOpenApi` requests generate documents; `OpenApiDocumentProvider` also exposes the build-time generation path. This is **not evidence of execution on every business/API request**, production call frequency, or useful savings on usually short metadata lists. No timings, allocation counters, benchmarks, thresholds, or performance verdicts were produced. Runner-authored times are retained only as unchanged logs.

## Executed results

All actual native argument arrays, cwd, selected environment, PID, exit, and terminal state are in [COMMANDS.md](COMMANDS.md) and the receipt JSONs. Initial failures are retained, not replaced by later successes.

| Check | Baseline37 | Fresh default |
|---|---|---|
| Full dependency-aware test-project build; SDK `12.0.100-alpha.1.26557.102` | Passed | Passed |
| Exact existing selection: `ApiDescriptionExtensionsTests`, `GetRequestBody_*`, `GetOpenApiRequestBody_*` | **105 passed / 2 skipped** | **105 passed / 2 skipped** |
| Existing-test runtime, roll-forward disabled | `12.0.0-alpha.1.26562.105` | `12.0.0-alpha.1.26568.110` |
| Common C#13 consumer, exact runtime `12.0.0-alpha.1.26568.110` | **29 passed rows** | **29 passed rows** |
| Row boundary within those 29 | 28 producer/output/cache/rejection + 1 isolated guard control | Same |
| Loaded framework role boundary | 37 source-built ASP.NET Core assemblies; no foreign-role framework assembly | Same |

Every selected xUnit/theory row is preserved in the actual TRX and console output, with extracted names/outcomes in `test-rows.json`. No XML was manufactured.

Two pre-existing skipped tests did not reach assertions, both referring to [#55349](https://github.com/dotnet/aspnetcore/issues/55349):

- `OpenApiDocumentServiceTests.GetOpenApiRequestBody_HandlesFormWithMultipleMixedTypes_MvcAction`
- `OpenApiDocumentServiceTests.GetOpenApiRequestBody_HandlesStreamAndPipeReader_MvcAction`

The faithful validation boundary used instead is real ApiExplorer and TestServer/OpenAPI output for the explicit cases above; it **does not verify those two skipped scenarios**. Build-time generation execution, Native AOT/trimming, domain-handler request-body execution, third-party providers, and concurrent mutation were not validated.

Initial preparation failures: missing generated props (`MSB4019`), missing template task (`MSB4036`), then missing assets (`NETSDK1004`) preceded the corresponding restores. The first runner-help probe exited without rows and is not test evidence. The common consumer compiled successfully **once**, with three retained `CS0436` warnings resolving its local `Program` over the referenced sample's type; no analyzer blanket-disable or source repair was applied. A Windows Python alias failed; the already-installed Azure CLI CPython was used instead. Its embedded import isolation required an explicit local sibling import path; no Python installation or machine path change occurred.

## Provenance and audit

Both characterizations execute the **same canonical consumer DLL/PDB/deps/runtimeconfig**, with one successful compilation. DLL SHA/MVID were observed inside both processes. Hashes of the other three files were collected after both executions, not independently before the first. Host-resolution traces, actual runtime/CoreLib path/SHA/MVID/informational version, loaded owner paths/SHA/MVID, and complete inventoried image sets are retained.

The consumer emits its CoreLib identity in process. Existing-test runtime identity instead associates the actual host-resolution trace/version with separately hashed CoreLib/CoreCLR files; existing test bodies do not themselves emit those MVIDs.

The portable audit also associates the common consumer PE/PDB identity with its four included raw source documents (Program plus three generated files), without recompilation.

`owner-associations.json` and the unabridged metadata logs associate actual source-built OpenAPI, MVC ApiExplorer, MVC Abstractions, Http.Extensions, and existing tests with PE CodeView GUID/stamp, portable-PDB identity, and raw source-document checksums. OpenAPI's 53 available raw documents out of 62 match per role; unavailable generated documents are explicit. Selected OpenAPI DLL/PDB proofs are included. **These are metadata/source associations, not full compiler attestation.**

`source-catalog.json` keeps Git LF blob/SHA identities separate from Windows raw bytes and PDB checksums. The broader repository materialization audit is incomplete.

The complete inventory comparison covers **626 image entries**, with **330 identical / 296 different**, including **295 non-target-owner differences** and **no prefix exclusions**. Both restored graph revisions differ, and existing tests also use different runtimes. **This is not a causal performance pair.**

That union describes the common-consumer executions: every DLL/EXE in each complete test-output graph, every image in their shared runtime68 tree, and the common DLL. Baseline62 and SDK/VSTest-driver prerequisites are separately identified, not represented as a complete existing-test-process loaded-image census.

No complete clone, package cache, SDK, runtime, or obj/output tree is sealed. `project-graphs.json`, `omitted-output-files.json`, `runtime-prerequisites.json`, exact commits, and command receipts describe the external prerequisites and omitted complete test-output files.

Run the portable, metadata-only auditor with any available Python 3; it needs no packages, source checkout, .NET host, or execution of the target assemblies:

```powershell
python .\audit_capsule.py .
```

It verifies the manifest, PE MVID/CodeView versus portable PDB, selected raw document checksums, actual saved assertion/TRX rows, and every comparison entry. The optional C# metadata reader source and its once-built output are also included; running that reader requires its exact pinned .NET runtime. Audit does not promote F138 or authorize measurement/publication.

`terminal-state.json` closes the recorded preparation barrier, including process/stream completion and a bounded known-PID/direct-child check. Subsequent staging, sealing, and self-audit finish separately; their terminal receipts are retained beside, not written into, the immutable capsule.
