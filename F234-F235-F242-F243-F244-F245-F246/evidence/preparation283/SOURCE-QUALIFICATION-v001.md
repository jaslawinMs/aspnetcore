# F243, F244, F245, F246 — bounded source-only qualification

## Disposition

Four **separate source-only, informational / no-material-candidate-established** decisions. None is rejected merely because the retained location is a snapshot. None is designated a duplicate or alias. No candidate implementation, runtime qualification, measured no-gain conclusion, campaign-status change, or publication is supplied.

The generator emits these searches into the consuming application's `Microsoft.AspNetCore.OpenApi.Generated.XmlCommentOperationTransformer.TransformAsync`. The selected tests have a real generated-compilation/application/document-provider path, not just snapshot verification. That path is established **in source**, not observed executing here. Small source-declared fixtures establish plausible reachability but not production workload distributions or optimization value.

## Pins, ownership, and evidence boundary

- Actual owner: `7edc5806-0226-40d8-81f6-5c50d73959bc`, policy slot F243 covering all four findings, exact 283 scope.
- Original: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
- Fresh upstream `dotnet/aspnetcore` default branch: `main`; observed immutable Default: `d3483989953ae3cccd773aea5ea04cb0c7198531`.
- Reserved navigation/object-store checkout HEAD was separately observed as `24875ef5dabb55567870b39f6eb0002170435e2f`. It is not Default. No checkout or product edit was performed.
- Exactly 15 captured whole repository product/doc/test/guidance inputs per role, including the shared instruction pointer and README charged to each role. All 15 corresponding files have identical Git blob IDs, modes, and complete-byte SHA256 between these two pins. This proves equality only for the selected files, not entire repositories, binaries, or runtime behavior.
- Fourteen direct Git/gh roots, including the empty, incorrectly targeted initial history probe. Every request, stdin, complete returned stdout/stderr, PID, and terminal result is preserved. No additional source roots or bodies are authorized by unused root capacity.
- `whole-inputs-v001.json` and `whole-inputs-v002.json` describe all 30 whole captures. Independent raw `ls-tree -z` outputs provide membership and modes; raw `cat-file --batch` outputs retain binary framing. Capture verifies Git blob SHA1 as well as SHA256, exact body lengths, member order, and complete consumption of each raw batch.
- Operational policy/registration/campaign copies and the injected anti-pattern skill instruction context are separate from repository source evidence. No card package, prepare/finalize scan workflow, package operation, telemetry, or publication was run. The injected generic skill is disclosed as an additional common instruction context, not silently represented as a captured repository body; if campaign accounting charges injected tool instructions against role body slots, parent review must resolve that conservative-budget interpretation before acceptance.

Source keys below are relative to each pinned commit:

| Key | Whole source |
|---|---|
| G | `src/OpenApi/gen/XmlCommentGenerator.cs` |
| E | `src/OpenApi/gen/XmlCommentGenerator.Emitter.cs` |
| P | `src/OpenApi/gen/XmlCommentGenerator.Parser.cs` |
| X | `src/OpenApi/gen/XmlComments/XmlComment.cs` |
| XP / XR | `src/OpenApi/gen/XmlComments/XmlParameterComment.cs` / `XmlResponseComment.cs` |
| C | `src/OpenApi/test/Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests/OperationTests.Controllers.cs` |
| M | `src/OpenApi/test/Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests/OperationTests.MinimalApis.cs` |
| H | `src/OpenApi/test/Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests/SnapshotTestHelper.cs` |
| S | The exact retained `OperationTests.DoesNotMisattributeDocumentationWhenMemberNameCollidesWithAnotherBindingName#OpenApiXmlCommentSupport.generated.verified.cs` snapshot |
| D | `src/OpenApi/src/Services/OpenApiDocumentService.cs` |
| MVC / EP | `src/Mvc/Mvc.ApiExplorer/src/DefaultApiDescriptionProvider.cs` / `EndpointMetadataApiDescriptionProvider.cs` |

## Generator → emitted owner → application → document

1. G:13–56 connects additional XML and compilation comments through parsing/emission and detects `AddOpenApi` invocations. P:44–135 reads XML members and public-symbol documentation and calls `XmlComment.Parse`; P:138–185 identifies the real OpenAPI service-extension symbol and supported interception forms.
2. X:53–64 obtains `/member/param` and `/member/response` lists. XP:16–36 and XR:17–36 append entries with nonempty names/codes in navigator order, without local deduplication. E:767–844 serializes those lists into generated cache records in list order.
3. E:19–78 contains the generated-source template and lazy per-generated-owner documentation cache. E:319–575 contains the operation transformer and lookup helpers. E:670–716 registers an instance of that transformer through generated `AddOpenApi` interception; E:849–854 adds `OpenApiXmlCommentSupport.generated.cs` to the compilation.
4. S:58 contains the collision action's two parameter comments. Its operation-transformer class is compared as a complete byte span against the selected emitter template by `template-emitted-helper-identity-v001.json`; this is static source identity, not a generator execution or loaded-module identity claim.
5. C:214–265 builds a one-controller source application with two real `[FromQuery(Name=...)]` parameters, invokes the generator through H, then requests document verification. H:101–119 runs the generator into an updated compilation. H:127–235 emits/loads that compilation, resolves a host with a no-op server/lifetime, reflects the real document-provider service, invokes `GenerateAsync("v1", writer)`, reads an OpenAPI document, and calls the supplied assertions.
6. This is not proof that those assertions ran in this task. H can return when the host factory or document-provider type is missing. Its reflection invocation is not itself awaited at that call site. No assembly was emitted/loaded, host started, document requested, or test run here; asynchronous completion and actual assertion reachability remain unobserved.
7. D:247–343 groups admitted API descriptions, constructs operations, initializes operation context, and awaits configured operation transformers in order, followed by endpoint-specific transformers. MVC:64–126 supplies visible controller action/method descriptions. MVC:167–235 and 584–704 expand binding metadata into parameter descriptions, preserve binder names, and remove non-request sources. EP:44–166 supplies minimal-endpoint descriptions and consumes ordered binding metadata; EP:172–199 omits service parameters; EP:251–317 identifies binding names/sources; EP:522–532 creates property metadata when the supplied parameter-info member is a property.
8. D:576–640 creates operation parameters in description enumeration order while omitting request-body parameters and certain headers. D:691–706 selects JSON body or form-body construction. D:378–412 builds responses from supported-response metadata grouped by status key, with a default 200 response when none exists.

The direct registration implementation, `OpenApiOptions` registration storage, minimal-endpoint parameter-binding metadata producer, and typed-result union metadata producer are not whole-captured. Their call boundaries are visible, but their complete transitive implementation is **not** claimed closed. The finite optional source proposal names them; no recursive discovery followed the 15-input boundary.

## Separate decisions

### F243 — XML parameter comment → operation parameter

- Exact retained site S:335; generator owner E:352, within E:346–391. It loops method XML parameter comments, resolves the reflection parameter and its effective model name, then calls the first-match operation-parameter lookup at E:471–493.
- Producer chain: XP appends explicit nonempty XML `<param>` entries; the emitter retains their order; MVC/EP provide bound parameter names; D creates the operation parameter list; the generated transformer joins by effective model name.
- The retained collision test has **two declared XML comments and two explicitly named query parameters**. `sortColumn` binds to `order`; `order` binds to `sortBy`. C:253–265 expects their distinct descriptions on those OpenAPI names. M:128–139 supplies another two-comment method (`id`, `uuid`). These are source-declared/expected shapes, not observed runtime counts.
- Search work is bounded symbolically by comments × operation parameters for a fixed operation; the separate reflection-parameter search is not this finding. The captured source imposes no universal small upper bound on arbitrary applications.
- Decision: emitted, source-reachable behavior; **no material optimization candidate established by the admitted small fixtures/frequency evidence**. Not dead code, not “snapshot therefore cold,” and not an alias of F246.

### F244 — unmatched XML parameter comment → request-body description search

- Exact retained site S:349; generator owner E:366 and helper E:495–516. It runs only after F243 misses; nonempty effective names are matched against descriptions whose source is Body, Form, or FormFile.
- The retained collision fixture itself has successful query matches, so its body fallback is not evidence that this branch executes.
- Independent real source producers exist in C:269–366: an undocumented body model plus a documented cancellation token or `[FromServices]` parameter. Their callbacks expect the request-body description to remain unset. C:370–413 supplies **one documented `[FromForm] string`** and expects that description on the request body. C:68–75 and 94–96 supplies a documented body model with a body-description expectation. MVC's hidden-source filtering and D's body omission from `operation.Parameters` explain why the fallback must discriminate these cases.
- Symbolic work is unmatched nonempty XML-comment names × API-description count, with early true return on a matching body/form source/name. Many operation comments do not reach this search at all. The admitted cases use individual comments/body/form parameters, not a fabricated large unmatched-comment population.
- Decision: separately reachable fallback behavior; **no material candidate established**. Do not remove the binding-source gate or treat every missing operation parameter as a body parameter.

### F245 — operation response → XML response comment

- Exact retained site S:382; generator owner E:399 within E:395–405. Each existing response uses `SingleOrDefault` over XML response comments by exact string code.
- The retained collision snapshot has no response-comment list; its loop is not sufficient reachability evidence.
- M:91–108 defines a typed-results method with three declared outcome types and three explicit XML response comments (200, 201, 404). M:432–435 expects all three response descriptions. EP:321 onward consumes response metadata; D:378–412 groups supported response metadata into operation responses. The underlying typed-result metadata producer is a named remaining source boundary, so “three responses actually produced” is an expectation, not an observed count.
- XML comment list size is controlled by XML tags, while operation response keys are controlled by API response metadata. They are not necessarily equal: M's `Post6` and `Put7` explicitly declare XML codes whose inclusion is not established by the handler's `IResult` return type alone.
- Symbolic work is existing responses × XML response comments. Duplicate matching XML codes matter: `SingleOrDefault` preserves uniqueness checking for the code being queried; an eager dictionary can throw for a different, unused duplicate code or at a different point in mutation order.
- Decision: a **distinct response-join behavior**, source-reachable under the document path; **no material candidate established** from the admitted declared three-code case. Not a duplicate of either parameter join.

### F246 — eligible API property description → operation parameter

- Exact retained site S:406; generator owner E:423 within E:407–468. The retained wording “for every API parameter description” overstates the actual gate: the search requires property-kind model metadata, container/property names, successful hierarchy-aware reflection lookup, and a documentation-cache hit.
- The retained collision snapshot has no property documentation entries, so it is not the appropriate positive fixture.
- M:211–265 and 265–405 supplies `[AsParameters]` classes; its callbacks at M:478–538 expect expanded property descriptions/examples and custom names. `XmlDocPriorityParametersClass` declares five documented properties. MVC controller fixtures C:417–550 separately declare inherited and shadowed query properties and expect the correct descriptions. MVC's visitor provides a directly captured property-expansion producer; EP captures the property-metadata consumer boundary for minimal APIs.
- Thus eligible documented properties × operation parameters, not all description entries × all parameters, describes this lookup. Source-declared shapes include two inherited controller properties and five minimal-API properties; no runtime count, metadata-production completion, or large-property workload is claimed.
- Decision: **separate property-documentation phase, no material candidate established**. Sharing `GetOperationParameter` with F243 does not make the sites aliases: the loop driver, eligibility, comment source, body fallback, and overwrite phase differ.

## Contracts any future candidate must retain

- Effective `[IModelNameProvider]` name selection precedes matching; compare names with `StringComparison.Ordinal`, not case folding or raw CLR names.
- `GetOperationParameter` returns the **first** matching name in current list order, disregarding location. Do not reject duplicates or silently choose the last one.
- XML parameter comments remain ordered; duplicate comment entries can repeatedly mutate a target, with later entries overwriting earlier descriptions/deprecation/example effects.
- The request-body helper reads binding source before comparing name, accepts only the three specified body/form sources, and returns at the first qualifying match.
- Response `SingleOrDefault` uniqueness and exact-code matching, absence behavior, and exception timing relative to preceding mutations are observable contracts. Do not replace them with unconditional all-key dictionary validation.
- The property phase runs after method XML parameters/responses, can overwrite prior descriptions, combines Summary/Value as written, handles missing/inherited/shadowed reflected properties, and keeps its distinct body-source gate and reference unwrapping/error behavior.
- The generated method is synchronous and returns `Task.CompletedTask`; its cancellation token is unused here. Do not add scheduling, new async suspension, new cancellation checks, collection snapshotting, or changed mutation/exception ordering as “free” cleanup.
- Existing earlier transformers can supply mutated operation collections; no candidate may assume a global immutable parameter index. The captured ordinary implementation mutates descriptions/examples/deprecation, not collection membership. Custom getter/enumerator side effects were not executed and remain unverified.
- XML-example JSON parsing is out of this decision set. **F201 and pending F202/F203 aliases are neither accepted, rejected, nor conflated here.**

## Frequency and materiality limits

D:62–100 creates a fresh document for each `GetOpenApiDocumentAsync` invocation, and D:282–320 dispatches transformers per admitted operation during that construction. Its operation-context cache is not proof of document-output caching. The generated static XML cache avoids reparsing XML into records at document time, but these joins remain per transformation.

Therefore the sites are not established as one-time startup work or as ordinary application-handler request loops. External request rate, document-provider frequency, any endpoint/output caching, actual collection sizes, total process cost, allocation, timing, useful savings, and regression gates are all **unobserved**. Twenty-two route declarations in the selected minimal-API source are not a license to synthesize repeated document generations or claim observed transformer counts.

The owner history metadata names the model-name matching change `a1c5f7c64c23bd666cbf404068aa5b82078e4c52` (#64535), property `[AsParameters]` support `a7e8fa464114d0a8c23d64fc90ee166d16322c5e`, and initial XML document support `0b520c3fd8dc0304de01693c7684a94b28e5491c`. These are history metadata, not reconstructed historical source evidence. The first history root used incorrect paths and returned no entries; it is retained and superseded only for history discovery by the corrected root. No selected generator/test changes were listed in Original..observed-Default; whole-byte equality is the stronger selected-file evidence.

## Stop and handoff

The repository-body budget is closed at 15 per role. `additional-source-proposal-v001.json` is a finite **unexecuted, not-authorized** source proposal if the parent requires the remaining registration and low-level metadata producers. This report does not authorize SDK activation, restore/build/test, emitted-code execution, application hosting, candidates, measurements, edits, cleanup, remote work, other agents, ledger updates, or publication.

`source-verification-v001.json`, the raw custody files, and the final full artifact index/seal are the handoff. Root/stream terminal evidence and observed-child point checks are deliberately limited: they do not prove unseen descendants or machine idleness. The final outer tool receipt exists only after the tool returns; the parent must capture/accept that returned receipt and decide retirement/finalization without altering sealed evidence.
