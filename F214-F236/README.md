# F214 and F236: bounded qualification, no justified performance change

| Finding | Disposition | Supported boundary |
| --- | --- | --- |
| F214 | Rejected for the inspected source/runtime boundary | Located shipping dictionary keys are strings. Captured ordinary .NET 12 Windows x64 Tier0 null guards do not box the tested reference, integer, or nullable-integer keys. |
| F236 | Rejected as an unsubstantiated material workload/candidate | The constructor/property scan is real, but retained metadata is cached and the reviewed record fixture has only one to four constructor parameters. No justified replacement or material benefit was established. |

Neither is a measured no-gain result, a universal false-positive claim, or a performance improvement. No product candidate, shipping change, benchmark, warmup, allocation measurement, comparison authorization, performance PR, or browser window accompanies these dispositions. The fixed historical classified `REPORT.md` is not changed.

## Frozen source and complete evidence

Original is `37e809ead5824bc753a1c3d56f11615bdb1296c5`; the separately observed upstream Default is `d3483989953ae3cccd773aea5ea04cb0c7198531`. These are source roles, not interchangeable runtime qualifications.

[source-membership.json](source-membership.json) binds complete raw Git commit, tree, and blob payloads to each source path and role. Captured compilation-source bytes are retained separately, with explicit raw-hash representation and LF-projection checks where worktree line endings differ. This is stronger than a filename or source-hash list alone; the portable verifier recomputes Git object IDs and traverses the actual trees.

[evidence-index.json](evidence-index.json) binds every copied handoff payload, including failures and superseded observations. The original owner indices and parent integrity audits remain intact. Absolute paths in historical commands describe their original execution environment, not portable commands to execute blindly.

## F214: inspect the native guard, not just generic IL

The target is `AdaptiveCapacityDictionary<TKey, TValue>` in the shared dictionary source. [caller-evidence.json](evidence/F214/caller-evidence.json) identifies six located construction sites and three closed shipping types in the pinned tracked source: query accumulators use `string` keys with `StringValues` or `List<string>` values, and cookie parsing uses `string` keys and values. A value-type **value** is not a value-type key. Actual query/cookie producers and selected unchanged canonical tests were linked into private diagnostic assemblies; no hosted HTTP or deployed frequency/distribution claim follows from that boundary. No shipping direct caller of the flagged internal `TryAdd` was located. External, reflective, generated, unpublished, or future uses are not ruled out.

[jit-determination.json](evidence/F214/jit-determination.json) and the [Original](evidence/F214/original-jit-disassembly.txt) / [Default](evidence/F214/default-jit-disassembly.txt) complete captures show six dictionary method bodies per role: `ContainsKey` and `TryAdd` for reference, `int`, and deliberately out-of-annotation `int?` keys. Reference guards compare the reference directly; integer guards are eliminated; nullable guards test `HasValue`. No surviving boxing was observed in those guards. The incidental `System.Text.Json` dictionary body is excluded.

The observed runtime was `.NET 12.0.0-alpha.1.26557.102`, Windows x64, ordinary Tier0/minopt. Only diagnostic disassembly flags were set; no tiering/PGO/ReadyToRun/inlining tuning, timing, warmup, or allocation counters were used. This does **not** establish that whole operations allocate nothing or cover all structs, tiers, runtimes, AOT/Mono/browser, platforms, or shipping value-key producers. `notnull` is not a runtime null guarantee: the private nullable-key cases also explain why blindly bypassing guards for every value type would change runtime behavior.

The [Original](evidence/F214/original-unit-results.xml) and [Default](evidence/F214/default-unit-results.xml) linked-source xUnit reports each contain **18 passed, zero failed, zero skipped rows**. These characterize unchanged producer/null/comparer contracts, not an optimization's red/green result. Exact commands, arguments, exits, and row names are in [commands.json](evidence/F214/commands.json) and the role row manifests.

The canonical `Microsoft.AspNetCore.Shared.Tests` command filtered to `AdaptiveCapacityDictionaryTests` did **not** reach assertions: `artifacts\bin\GenerateFiles\Directory.Build.props` was missing. The linked-source boundary above is the observed substitute, not a passed canonical project run.

An execution-control failure is preserved explicitly: malformed initial build argv unintentionally enabled shared compilation. The failed command and later separate-argument correction were retained; the finalizer detected the actual owned compiler server and recorded identity-checked, PID-specific cleanup in [owned-descendant-cleanup.json](evidence/F214/owned-descendant-cleanup.json). This attempt was **not fully compliant** with the no-shared-compilation preparation policy. All recorded native roots and streams were terminal at handoff; that is not a universal unrelated-process or environment-isolation claim.

## F236: real scan, but no demonstrated material candidate

The source owner is `DefaultBindingMetadataProvider.GetBoundConstructor`, reached while creating model metadata. It recognizes records through the public `<Clone>$` convention, requires one public constructor with nonzero parameters, and matches every parameter to a visible property by exact ordinal name and exact type. Extra properties are permitted and property order is irrelevant. `PropertyHelper` visibility/hiding behavior cannot be replaced by a raw name-only reflection dictionary without preserving those semantics.

The reviewed metadata/provider/property-helper paths retain metadata by identity. This is **not** an ordinary per-request repeat after initialization, nor a globally once-per-Type guarantee: providers, identities, concurrent first use, and invalidation still matter. Existing hot-reload cache invalidation was not changed or live-tested. Original and observed Default target/helper/fixture blobs agree; the unrelated `ModelMetadata.cs` hash-initialization difference is preserved as separate role evidence, not copied into Original.

[native-fixture-cardinalities-v2.json](evidence/F236/native-fixture-cardinalities-v2.json) contains the bounded static inventory of **52** one-line record declarations in the existing integration fixture: **18 with one, 31 with two, two with three, and one with four constructor parameters**. It is not application telemetry, an exhaustive record inventory, or proof that larger customer models do not exist. The earlier incorrect histogram is retained and explicitly superseded. No synthetic large schema, per-request repetition assumption, transient hash structure, or new cache was used to manufacture a gain.

The same-role native Debug `Microsoft.AspNetCore.Mvc.Core` product compiled. However, **all 13 requested source rows were blocked before discovery**, including `GetBoundConstructor_ReturnsPrimaryConstructor_ForRecordType`, both `GetBoundConstructor_ReturnsNull_ForRecordTypeWithParameterlessConstructor` rows, and `DefaultModelMetadataProviderTest.GetMetadataForType_Cached`. [correctness-test-results.json](evidence/F236/correctness-test-results.json) names every blocked method/row and preserves the existing fixture limitations. The final prerequisite was four graph-local Blazor JS assets: `blazor.web.js`, `blazor.server.js`, and their `.map` files under `src\Components\Web.JS\dist\Debug\_framework`. No test assertion, native constructor/cache behavior, Default execution, or fix red/green result is claimed. The faithful observed boundary is a compiled Original MVC product plus source-level qualification, not an executed MVC test.

## Offline audit and limits

From a checkout containing this folder:

```powershell
node .\verify.mjs .
```

After publication, `node .\verify.mjs . --require-seal` additionally requires and checks the sealed file inventory. The auditor validates complete copied bytes, original handoff indices, raw Git object/tree membership, source representations, reported rows, observed JIT-section coverage, the corrected fixture inventory, and explicit blocked-test/no-candidate boundaries. It does not execute native tests, reinterpret every machine instruction, establish deployed materiality, or turn the historical receipts into a fresh runtime experiment.

Documentation observations retain their recorded source attribution and provenance. The two preserved F236 model-binding documentation captures originate from the Microsoft/dotnet ASP.NET Core documentation contributors under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); their pinned upstream attribution is in [docs-observation.json](evidence/F236/docs-observation.json). The failed line-split extraction is explicitly superseded by the pinned raw capture. Framework source retains its existing license headers.
