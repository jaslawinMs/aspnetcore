# F243–F246: finite 290 source extension and four decisions

## Result and admission boundary

Completed the four-class source extension, not runtime qualification. Each finding remains a **distinct source-only informational / no-material-candidate-established recommendation**. None is dismissed as a snapshot-only artifact, designated an alias, or described as a measured no-gain result.

Parent receipt `OpenApi-accepted-and-advanced-289.json` accepts only the 283 bundle's 184 indexed / 186 complete bytes and inventory, and consumes actual `f243-246-283-final-seal-005` exit 0. It does **not** retroactively approve 283 scope accounting, raw-tree interpretation, runtime reachability, materiality, or final finding disposition. Its prospective sealer exit remains null. Those caveats and all 283 bytes are preserved unchanged.

The explicit fresh 290 cap is used as follows:

| Input accounting, per pinned role | Count |
|---|---:|
| Old 283 whole repository inputs, unchanged | 15 |
| Old injected common instruction context, unchanged and separately charged | 1 |
| New 290 whole repository bodies | 4 |
| Cumulative repository bodies | 19 |
| Cumulative repository bodies plus injected context | 20 |

Three new Git roots, fifteen through seventeen, were used: two metadata-only trees and one exact whole-body batch. Aggregate Git/gh roots are **17**. Both the new-body and direct-root budgets are closed. There was no new default-branch observation, HEAD check, fetch, checkout, build, test, source edit, generated-code execution, host, or measurement.

## Immutable roles and complete source custody

- Original: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Default: **reused observed-283 Default** `d3483989953ae3cccd773aea5ea04cb0c7198531`; not a fresh-current-Default claim.
- `C:\src\aspnetcore` was used only as the reserved Git object store/navigation repository, not as Default source or an execution tree.
- Before the first body request, both pinned `ls-tree -r -z` results were parsed and one unique existing blob was selected for each admitted filename/class in each role.
- The old proposal's unconfirmed `src/OpenApi/src/OpenApiOptions.cs` was corrected **by pre-body metadata** to the unique `src/OpenApi/src/Services/OpenApiOptions.cs`. No body failed, no guessed replacement followed a missing body, and no retry was performed.
- `confirmed-selection-before-first-body-batch-v001.json` precedes the body request in the helper's finite sequence. Roots 015/016 contain complete raw membership/mode metadata; root 017 retains exact `commit:path` stdin and binary `cat-file --batch` framing.
- Eight whole files were saved without EOL normalization or archives. Byte lengths, modes, Git object IDs, recomputed Git blob hashes, SHA256, frame offsets, exact order, and complete raw-batch consumption are recorded.
- All four new pairs have identical modes, blob IDs, and complete bytes between the reused pins. Together with the inherited whole-source byte evidence, all **19 selected repository paths** match across these two roles. This is not a binary/runtime or whole-repository equality claim.
- Before/after rehashes preserve the old 283 exact 186-file inventory, including executed helpers, the initially mistargeted history probe, all raw streams, failures/limits, source captures, final seal, and instruction-accounting caveat. Rehashing is byte custody, not retroactive parent approval.

## Source keys

New complete bodies in each role:

| Key | Confirmed source |
|---|---|
| A | `src/OpenApi/src/Extensions/OpenApiServiceCollectionExtensions.cs` |
| O | `src/OpenApi/src/Services/OpenApiOptions.cs` |
| R | `src/Http/Http.Extensions/src/RequestDelegateFactory.cs` |
| T | `src/Http/Http.Results/src/ResultsOfT.Generated.cs` |

Inherited 283 evidence is reused unchanged: generator/template E (`XmlCommentGenerator.Emitter.cs`), parser and XML-list models, exact retained snapshot S, controller fixture C, minimal-API fixture M, real generated-compilation/application helper H, `OpenApiDocumentService` D, and MVC/minimal API-description producers. Their full paths, lines, modes, bytes, raw-tree membership, and raw framing remain in the sealed 283 bundle and the cumulative verification inventory.

## What the four bodies establish

### Actual registration, storage, and dispatch

The inherited generator emits application-owned `XmlCommentOperationTransformer`, registers `new XmlCommentOperationTransformer()` through the generated `AddOpenApi` interceptor (E:675–715), and supplies that callback to the actual service extension.

A:57–74 lowercases the document name, calls `AddOpenApiCore`, records a named document service for build-time generation, and registers the document-specific `OpenApiOptions` configuration callback. A:130–143 calls `AddEndpointsApiExplorer`, registers keyed singleton OpenAPI services, and registers `IDocumentProvider` for build-time generation. These statements do not prove that the separately registered keyed service types share one instance, nor that documents themselves are cached.

O:16 stores operation transformers in an ordered list. O:114–120 null-checks and appends the provided **instance** without wrapping or deduplication. The generated concrete transformer resolves to this overload, not the generic type-based or delegate overload. Inherited D:137–149 copies ordinary instance transformers into its per-document dispatch array; D:306–310 awaits them in array order for each admitted operation, before endpoint-specific transformers.

This closes the previously unread direct registration/storage seam in source. The DI/options framework, `AddEndpointsApiExplorer` registration implementation, document-provider implementation, and real invocation remain outside this finite extension. H's early-return and asynchronous-invocation limitations remain unchanged; no test assertion was observed.

### Actual ordinary and `[AsParameters]` metadata construction

R:141–151 exposes metadata inference; R:390–418 builds arguments and, unless metadata was already inferred, invokes built-in response inference and `EndpointMetadataPopulator`. This is metadata/construction work, not execution of an application request handler.

R:648–699 visits actual handler reflection parameters. For a non-`[AsParameters]` argument it constructs one `ParameterBindingMetadata` with name, `ParameterInfo`, parse/bind flags, and optionality. For `[AsParameters]`, R:824–834 sets `isAsParameters`, rejects nested property use, and enters `BindParameterFromProperties`; it therefore does not add the outer container through the ordinary metadata branch.

R:1593–1667 first checks nullable-container support and calls `ParameterBindingMethodCache.FindConstructor`. If a constructor with parameters is selected, it constructs a `PropertyAsParameterInfo` and one `ParameterBindingMetadata` per selected constructor/property pair. Otherwise it enumerates reflected properties and adds metadata only for writable properties with a public setter. Both paths append property parameter information to the factory context and use `CreateArgument` to determine each property's binding behavior.

R:727–924 contains the explicit route/query/header/body/form/service handling, the `[AsParameters]` dispatch, framework-special parameters including cancellation tokens, parse/bind helpers, and service/body inference. R:2094–2114 constructs inferred accepts metadata; R:2351–2371 records a JSON body parameter and calls that metadata helper. R:679–695 rejects disallowed inferred bodies, simultaneous JSON/form bodies, and multiple JSON body parameters.

This is the actual captured constructor-call producer behind the inherited API-description consumer. It does **not** authorize assuming all reflected properties produce OpenAPI parameters: setter/constructor/binding prerequisites, service omission, body separation, and later API-description filtering still matter. `PropertyAsParameterInfo`, `ParameterBindingMetadata`, constructor-selection helpers, and routing/RDG selection delegate outside these four new bodies; their implementations were not chased.

### Actual typed-result union metadata dispatch

T:87–143 defines the three-type `Results<TResult1,TResult2,TResult3>` used by M's declared `Results<NotFound<string>, Ok<string?>, Created>` method. Its static `IEndpointMetadataProvider.PopulateMetadata` calls `ResultsOfTHelper.PopulateMetadataIfTargetIsIEndpointMetadataProvider` for **each of the three generic type arguments in order**, independent of the active returned result instance.

These are three sequential call sites, not three observed successful calls; an earlier exception can prevent a later helper call.

Its request-time `ExecuteAsync` at T:104–113 delegates only to the actual stored result. These are different mechanisms. The random branch in the retained handler is not evidence that document construction executes the handler or randomly chooses one response's documentation.

R:1034–1050 deliberately skips built-in response inference for `IResult` return types; R:412–415 instead reaches endpoint metadata population through a delegated helper. The captured union's helper calls establish the intended all-variant metadata path, **not** three verified response entries: `EndpointMetadataPopulator`, `ResultsOfTHelper`, and the concrete `NotFound` / `Ok` / `Created` metadata providers remain unread delegates. The inherited API-description provider and D:378–412 show the downstream metadata consumption/status grouping, not completion of those upstream delegates.

## Four separate decisions

| Finding | Source site and real producer distinction | Updated bounded recommendation |
|---|---|---|
| **F243** | S:335 / E:352 searches operation parameters for method XML `<param>` comments after effective-name resolution. XML-list production and the named-query controller fixture remain separate from property expansion. The newly captured A/O seam shows how that generated instance is registered, stored, and dispatched. | Real emitted application behavior; **no material candidate established** from the admitted two-comment/two-named-parameter fixture and unobserved document frequency. Not dead snapshot code and not F246. |
| **F244** | S:349 / E:366 searches API descriptions only after an XML-comment name misses `operation.Parameters`. Captured R emits body/form/service/special-parameter metadata; inherited MVC/minimal description filtering and D's body omission explain why cancellation/service misses must not become body descriptions. | Distinct body-source/name fallback; **no material candidate established**. Positive single-form/body fixtures and negative cancellation/service fixtures are source-declared expectations, not observed executions or a large unmatched-comment workload. |
| **F245** | S:382 / E:399 searches XML response comments by exact status key with `SingleOrDefault`. T proves ordered metadata-dispatch calls for every declared union type, not only the active result. XML `<response>` tags still do not themselves create operation responses. | Distinct response-code/uniqueness join; **no material candidate established**. Three XML comments and three declared result types are known source facts; three produced OpenAPI responses, real counts/frequency, and costs remain unobserved across delegated providers. |
| **F246** | S:406 / E:423 searches operation parameters only for eligible property-kind API descriptions with resolvable reflected property and documentation-cache hit. R now shows actual constructor/property expansion and its public-setter gate; inherited MVC property expansion is another real producer. | Distinct property-documentation phase; **no material candidate established**. The declared two inherited controller properties / five minimal-API properties are not an observed population, and not every API description performs the search. Sharing a helper with F243 does not make these aliases. |

Each decision has its own loop driver, eligibility, producer, and update semantics. No alias is inferred from common file, snapshot, card, or shared helper. **F201 XML-example JSON parsing and pending F202/F203 aliases are not qualified, aliased, or otherwise changed here.**

## Cardinality, frequency, and behavior contracts

For a fixed operation, let C be emitted method XML parameter comments, P the current operation parameter count, U unmatched nonempty effective XML-comment names, D the API-description count, X XML response comments, Q eligible documented property descriptions, and Rsp operation response keys:

- F243: symbolic nested work C × P, separate from its reflection-parameter scan.
- F244: U × D with binding-source filtering and early true return; U is not every method parameter.
- F245: Rsp × X with `SingleOrDefault` uniqueness checking.
- F246: Q × P where Q ≤ D; metadata/property/cache gates run before this lookup.

These are source structure, not counted runtime events. None of the captured producers provides a universal production-sized bound or distribution for these dimensions. The small actual fixture declarations are not padded with fabricated properties, comments, responses, operations, or repeated document requests.

The generated documentation cache is lazy per generated owner, whereas D constructs a fresh document and transforms admitted operations on each document-generation invocation. The options instance retains the generated transformer instance; it is not recreated simply because D allocates a dispatch array. Metadata-construction caching in R is not document-output caching. There is no observed OpenAPI request rate, document-provider frequency, endpoint/output-cache behavior, production cardinality, elapsed time, allocation, useful saving, or regression result.

Future changes would still need to preserve:

- Effective model names, `Ordinal` equality, first matching parameter by current list order, duplicate names, and location-independent matching.
- Ordered XML comments, repeated updates from duplicates, and the method/response/property phase ordering.
- The body/form source gate rather than treating every missing operation parameter as a body parameter.
- Response `SingleOrDefault` duplicate-key exception behavior only for queried keys, and exception timing relative to preceding mutations.
- Property hierarchy/shadowing resolution, Summary/Value behavior, body fallback, reference unwrapping, and mutation/exception behavior.
- Instance-registration order and duplicates in O, upstream transformer mutations, current collection reads, and existing synchronous `Task.CompletedTask` behavior in the generated XML transformer. No async/cancellation/getter/enumeration semantic changes were authored or verified.
- R's real constructor/setter/nullable/nested-parameter/error prerequisites and the distinction between typed-result metadata population and request-time result execution.

## STOP: delegates and unobserved boundaries

No more source bodies, metadata discovery roots, guessed filename replacements, or dependency traversal were performed after roots 015–017. No extra source proposal is automatically authorized.

The explicit remaining boundaries are:

1. `PropertyAsParameterInfo`, `ParameterBindingMetadata`, and `ParameterBindingMethodCache.FindConstructor` implementations behind R's visible construction/selection calls.
2. `EndpointMetadataPopulator`, `ResultsOfTHelper`, and concrete typed-result metadata providers behind the visible return-type dispatch.
3. Routing/request-delegate-generator selection and the consumer application's actual build/project/TFM/interceptor configuration.
4. DI/options and API-explorer registration internals, document-provider/endpoint execution, H assertion reachability, actual material effect, and any production workload/performance evidence.

The bounded extension narrows source gaps; it does not claim complete transitive producer closure or runtime proof. Those limits support honest no-material-candidate-established recommendations, not a measured rejection.

## Handoff

`SOURCE-QUALIFICATION-v001.json` contains four separate decisions and source-boundary evidence. `source-verification-v001.json` contains the cumulative whole-source identity and raw-stream checks. `inherited-byte-chain-before-v001.json` / `inherited-byte-chain-after-v001.json` preserve byte-only custody. `artifact-index-v001.json` / `artifact-seal-v001.json` seal the new complete artifact inventory, with the two self-referential seal/index files explicitly outside their own recursive listing.

Fresh actual-ID/exact290scope/pending-four/no-lease/no-HOLD/nonquiesced guards are recorded before each Git root. Root waits, full raw streams, known-child point observations, and their limits are retained; they do not prove unseen descendants or machine idleness. The sealer must keep its prospective outer exit null. Only the actual outer tool result after return supplies that exit receipt; parent acceptance, retirement, and finalization remain parent actions.
