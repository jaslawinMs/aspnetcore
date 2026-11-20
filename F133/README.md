# F133: union-validation property lookup and actual metadata producers

**Not pursued as a justified optimization; no shipping change or performance PR.** Normal MVC metadata already retains the `PropertyInfo` used at this seam. The flagged `ContainerType.GetProperty(nameof(IUnion.Value))` is the fallback for **non-`DefaultModelMetadata`**, after a property-kind/name guard. Calling the helper for each entry does not mean executing that fallback for each entry.

**The original card already identifies non-default metadata. That specific extension scenario remains unmeasured.** This evaluation establishes the ordinary/decorated-default producer and its validation behavior, not a quantified refutation of the card's custom-metadata scenario. It does not show that custom metadata is unreachable, that all union reflection is cached, or that another cache has zero benefit. The rejection closes an unestablished optimization proposal, not a measured no-gain or a literal no-op.

## Connected artifacts

| Artifact | Link |
|---|---|
| Original finding, scope and predeclared acceptance | [Plan](plan.json), [SHA256 seal](plan-seal.json), [intake](finding-intake.json) |
| Guard and exact fallback | [Original strategy](images/Original/source/src/Mvc/Mvc.Core/src/ModelBinding/Validation/DefaultUnionValidationStrategy.cs), [actual-default strategy](images/Default/source/src/Mvc/Mvc.Core/src/ModelBinding/Validation/DefaultUnionValidationStrategy.cs) |
| Actual metadata producer and runtime-case handling | [Default provider](images/Original/source/src/Mvc/Mvc.Core/src/ModelBinding/Metadata/DefaultModelMetadataProvider.cs), [metadata](images/Original/source/src/Mvc/Mvc.Core/src/ModelBinding/Metadata/DefaultModelMetadata.cs), [visitor](images/Original/source/src/Mvc/Mvc.Core/src/ModelBinding/Validation/ValidationVisitor.cs) |
| Runnable C# 13 untimed probe | [Exact project](harness/AutoPerf.UnionMetadata.csproj), [Program](harness/Program.cs) |
| Initial public validation observations | [Original: 28](validation/original-characterize-001/observations.json), [actual default: 28](validation/default-characterize-001/observations.json) |
| Fresh exact-two-input reconstruction | [Receipt](reconstruction-001/verified-reproduction.json), [fresh project](reconstruction-001/project/AutoPerf.UnionMetadata.csproj), [fresh Program](reconstruction-001/project/Program.cs) |
| Rebuilt public validation observations | [Original: 28](validation/reconstruction-original-characterize-001/observations.json), [actual default: 28](validation/reconstruction-default-characterize-001/observations.json) |
| Existing integration coverage | [All 68 individually parsed XML executions](all-existing-tests-audit.json), [XML auditor](F133-audit-trx.ps1), [exact commands and results](validation-commands.md) |
| Complete consumer identities | [Original](images/Original/manifest.json), [actual default](images/Default/manifest.json), [rebuilt Original](reconstruction-001/Original/manifest.json), [rebuilt default](reconstruction-001/Default/manifest.json) |
| Decision, audit and preservation | [Decision](decision.json), [live audit](audit-summary.json), [recorded-evidence verifier](F133-verify.mjs), [preservation](preservation-baseline.json) |
| Permanently closed timing budget | [Zero authorizations used; three closed](diagnostic-budget.json), [exact pre-closure bytes](diagnostic-budget-before-closure.json) |
| Evidence completeness | [Authoritative copies](authoritative-copies.json), [individually hashed omitted bin/obj files](omitted-file-hashes.json), [immutable core seal](capsule-file-hashes.json) |

## What actually ran

The public `ServiceCollection.AddMvcCore().AddDataAnnotations()` registrations create the real metadata provider and `IObjectModelValidator`. Calling the public validator produces traversal, actual property getter calls, `IUnion.Value` reads and `IValidatableObject` execution. No framework callbacks, getters or validators are manually invoked to manufacture reachability.

Seven fixed profiles run twice under each of two provider modes, on Original, actual Default and independently rebuilt consumers: **112 public validation observations**, not 112 distinct tests. A forwarding decorator has a different provider CLR type but still returns actual `DefaultModelMetadata`. It is not a custom non-default metadata producer.

| Profile | Observable boundary |
|---|---|
| PublicInvalid / PublicValid | Public union value is traversed; exact `model.Value` error or valid state and one real case validation |
| ManyPropertiesInvalid | Seventeen actual reflected properties, one named `Value`, exact invalid-case result |
| ExplicitInvalid | No public reflected properties; real explicit-interface value and invalid payload validation |
| NamesakeRequired | Invalid public namesake retains its required error; the explicit value is read, and case validation is suppressed by the existing invalid key |
| NamesakeCase | Valid public namesake does not replace the explicit union case; exact invalid-case error |
| OrdinaryObject | Ordinary object property is read, but its runtime payload is not promoted to union-case validation |

All observations preserve actual root/property metadata references, expected validity, exact error keys/messages and actual getter/case-validation counts. The many-property model has **one Value-name candidate, not seventeen property lookups**.

`SourcePredicateFallbackEligibleMetadata` is explicitly a source predicate over observed real root/property metadata. **It is not instrumentation counting calls to `GetProperty`, nor a census of every metadata object constructed inside the visitor.** The source includes `GetInterfaceMap`, base-definition comparisons and synthetic metadata handling; none is declared absent or free. The visitor can also call the helper, so this is not a claim of one helper invocation per whole validation.

The existing `UnionValidationIntegrationTest` class also ran on both source revisions: **34 passed each, 68 individual XML executions, zero failed/skipped**. The diagnostic probe adds no permanent test and does not claim the existing suite had been missing.

## Identity and reproduction

Original is `37e809ead5824bc753a1c3d56f11615bdb1296c5`; actual default observed during intake is `ae89581dfd24c6277b4267a9779d05f7b9f047f1`. The target strategy and six other selected files are unchanged. Supplemental `Mvc.Abstractions/ModelMetadata.cs` genuinely differs: default computes its identity hash in its constructor rather than lazily. That committed delta and both physical inputs are retained; the initial overbroad equality assumption stopped before plan seal or execution.

Each frozen consumer has **279 individually hashed files** from the source-built integration dependency closure, including unused dependencies. Original/default are complete distinct owner graphs with recorded binary/dependency differences, not a two-file A/B performance isolation. They share exactly the same common harness DLL/PDB/deps/runtimeconfig within each pair. The probe verifies loaded ASP.NET Core owners resolve inside its frozen bin and match their manifest.

The genuinely fresh project rebuilds **exactly two unchanged common inputs**, explicitly referencing frozen Original owners. Both resulting untimed consumers preserve **277 corresponding other consumer files**; only the common harness DLL/PDB differ because of the fresh build/source paths. This is not a full reconstruction of every owner graph, package or compiler input.

There are **24 selected source/PE/PDB associations** and **88 runtime assembly records** across four probe executions. Six selected physical Core/Abstractions documents per role match their actual portable PDB document hashes; the probe checks the PE CodeView GUID/stamp against that PDB. This is selected-source provenance, not full compiler-input attestation.

## Execution and preparation boundaries

There were **zero performance comparisons, zero benchmark authorizations and no performance threshold outcome**. All three unused timing authorizations are permanently closed. No prototype, static cache, API, source commit, published source branch, permanent test, source PR or browser launch was produced.

Three missing-assets attempts are retained: the initial default integration test, the new common-project build and the genuinely fresh reconstruction build each reported `NETSDK1004`. Each restore occurred only after its actual failure. The later executions succeeded. The common project's second successful compilation preceded a pre-execution metadata-array-length guard; accepted frozen probe inputs begin at `harness-build-003`. No runtime observation from the earlier compilation is claimed.

Exact activated commands, exits and complete streams are linked in [validation-commands.md](validation-commands.md). No power, affinity, priority or machine settings changed. The private images remain available locally; generated binaries/obj files are omitted from this public capsule and individually inventoried, not represented as checked-in runnable historical binaries.

After obtaining matching source-built owners, the two-input project can be built with `-p:ReferencePathRoot=<owner-directory>`. Its only mode is `characterize <role> <output.json>`; it has no measurement mode and requires the documented frozen bin/source/manifest layout. The archived driver records exact machine paths; it is a historical execution helper, not a path-agnostic clean checkout bootstrap.

On Windows with Node.js and PowerShell 7, `node .\F133-verify.mjs . --require-seal` audits the recorded capsule without the omitted images. `--live-images` additionally verifies locally retained binaries/runtime paths and is not expected to work from a public capsule alone.

## Limits

The faithful observed boundary is MVC's actual public managed validator and default metadata production, below HTTP. A real custom non-default metadata implementation, its workload frequency and any measurable benefit/cost of caching this fallback remain unverified. No HTTP, browser, live Hot Reload delta, collectible type lifetime, trimming/AOT, cold-start, whole-app or global caller-coverage claim is made. Adding a process-wide metadata cache would require a separately justified lifecycle/refresh design; none was added here.

The immutable core predates the additive publication receipt and live campaign-index update. The fixed classified report is unchanged.
