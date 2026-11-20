# Generated XML-comment findings: source-verified aliases

**Nineteen retained records are duplicate emission sites of ten still-pending canonical studies. This is not nineteen fixes or measured improvements.** All original IDs and exact finding records remain in the campaign. Different test fixtures are not removed or called redundant tests.

The source scanner found repeated copies of generated boilerplate in four checked-in OpenAPI snapshots. The actual owner is the raw C# output template in `XmlCommentGenerator.GenerateXmlCommentSupportSource`, not each snapshot independently. One justified owner fix, if one is eventually established, would flow through the common generator. Canonical performance/correctness decisions are **not** made by this source-only classification.

## Original IDs and shared owner map

| Canonical study | Alias records | Finding | Actual generated method |
|---|---|---|---|
| F142 (pending) | F143, F144 | Each XML parameter comment snapshots every MethodInfo parameter and scans by name. | `XmlCommentOperationTransformer.TransformAsync(global::Microsoft.OpenApi.OpenApiOperation operation, global::Microsoft.AspNetCore.OpenApi.OpenApiOperationTransformerContext context, global::System.Threading.CancellationToken cancellationToken)` |
| F243 (pending) | F247, F251 | Operation parameters are linearly searched for every XML parameter comment. | `XmlCommentOperationTransformer.TransformAsync(global::Microsoft.OpenApi.OpenApiOperation operation, global::Microsoft.AspNetCore.OpenApi.OpenApiOperationTransformerContext context, global::System.Threading.CancellationToken cancellationToken)` |
| F244 (pending) | F248, F252 | Request-body parameter descriptions are linearly searched for each unmatched XML parameter comment. | `XmlCommentOperationTransformer.TransformAsync(global::Microsoft.OpenApi.OpenApiOperation operation, global::Microsoft.AspNetCore.OpenApi.OpenApiOperationTransformerContext context, global::System.Threading.CancellationToken cancellationToken)` |
| F245 (pending) | F249, F253 | XML response comments are linearly searched for every OpenAPI response. | `XmlCommentOperationTransformer.TransformAsync(global::Microsoft.OpenApi.OpenApiOperation operation, global::Microsoft.AspNetCore.OpenApi.OpenApiOperationTransformerContext context, global::System.Threading.CancellationToken cancellationToken)` |
| F246 (pending) | F250, F254 | Operation parameters are linearly searched for every API parameter description. | `XmlCommentOperationTransformer.TransformAsync(global::Microsoft.OpenApi.OpenApiOperation operation, global::Microsoft.AspNetCore.OpenApi.OpenApiOperationTransformerContext context, global::System.Threading.CancellationToken cancellationToken)` |
| F303 (pending) | F305, F307 | Method documentation ID generation uses composite formatting for a single integer. | `DocumentationCommentIdHelper.CreateDocumentationId(this global::System.Reflection.MethodInfo method)` |
| F306 (pending) | F308 | Type documentation ID generation uses composite formatting for a single integer. | `DocumentationCommentIdHelper.GetTypeDocId(global::System.Type type, bool includeGenericArguments, bool omitGenericArity)` |
| F325 (pending) | F332, F337 | Property documentation ID generation re-queries indexer metadata for each property. | `DocumentationCommentIdHelper.CreateDocumentationId(this global::System.Reflection.PropertyInfo property)` |
| F328 (pending) | F335, F340 | Property metadata is rediscovered for every OpenAPI parameter description. | `XmlCommentOperationTransformer.GetPropertyInfo(global::System.Type containerType, string propertyName)` |
| F329 (pending) | F336, F341 | Model-name resolution repeatedly materializes and scans custom attributes. | `XmlCommentOperationTransformer.GetModelName(global::System.Reflection.ICustomAttributeProvider? attributeProvider, string? name)` |

F306 is the lowest **verified** member of its two-record group, not proof that the similar F304 is independent. F304 did not meet this pass's exact reported-span criterion and remains pending. Other distinct same-method patterns, such as F142, F243, F244, F245 and F246, retain separate canonical studies even though their containing method hashes match.

## Connected artifacts

| Artifact | Evidence |
|---|---|
| Strict pre-execution scope and acceptance | [Plan](alias-analysis-plan.json), [SHA256 seal](alias-plan-seal.json) |
| All41 original retained records | [Full unchanged findings](retained-snapshot-findings.json) |
| Complete source pins and identities | [Ten source snapshots and Git blob/SHA256/byte identities](alias-source-manifest.json) |
| Actual common producer | [Original emitter](alias-source/Original/src/OpenApi/gen/XmlCommentGenerator.Emitter.cs), [observed-default emitter](alias-source/Default/src/OpenApi/gen/XmlCommentGenerator.Emitter.cs) |
| Runnable C#13 Roslyn source-analysis utility | [Project](alias-tool/AutoPerf.OpenApiSourceAliases.csproj), [Program](alias-tool/Program.cs) |
| Actual execution | [Activated runner](run-alias-tool.ps1), [full command/result/hash receipt](alias-validation/receipt.json), [build output](alias-validation/build-001.stdout.txt), [execution output](alias-validation/execute-001.stdout.txt) |
| Complete method/source observations and exclusions | [Actual58 mapped role observations,10 groups,24 excluded role rows](alias-observations.json) |
| Independent recorded-source audit | [Passed audit](alias-audit-summary.json), [verifier](F142-verify-aliases.mjs) |
| Narrow disposition and closed alias-only budgets | [Decision](alias-decision.json), [19 individual closed budgets](closed-alias-budgets.json) |
| Preparation failure and recovery | [Actual native failure/correction](alias-preparation-001/correction.json), [source capture helper](F142-capture-alias-source.mjs) |
| Preservation and completeness | [Baseline](alias-preservation-baseline.json), [authoritative copies](authoritative-copies.json), [omitted files](omitted-file-hashes.json), [core seal](capsule-file-hashes.json) |

## What the proof establishes

Original is `37e809ead5824bc753a1c3d56f11615bdb1296c5`; the live default observed during intake was `ae89581dfd24c6277b4267a9779d05f7b9f047f1`. Pinned Git trees resolve the exact paths, and raw blob reads are checked by Git blob identity as well as SHA256 and byte length.

Roslyn parses each exact source snapshot, locates the actual method containing the reported span and checks that the original snippet occurs uniquely in that method and in its reported span. Each accepted group has the same card, containing type, method token kind/text identity and snippet. The entire method text must also occur in a literal chunk of the actual generator's interpolated raw string. Original/default identities are both retained.

The separate Node verifier independently recomputes all58 exact whole-method text hashes from physical line ranges, finds the literal whole method in the actual emitter source and requires byte-identical normalized-newline whole-method text within every published group. It verifies source Git blobs, all native/managed command streams and the original input hashes. This is stronger source evidence than matching one line or grouping by file/card alone; it still is **not** resolved runtime dispatch or full generated-assembly equivalence.

Of41 assessed records,29 mapped on both revisions: ten canonical studies and19 aliases. **Twelve unaccepted records remain pending:** F201, F202, F203, F304, F326, F327, F330, F331, F333, F334, F338, F339. No mapping failure is a false duplicate or a no-gain decision.

## Execution and limits

The isolated syntax utility actually built and ran under the activated installed SDK: two commands exited0; compilation had zero warnings/errors. It is an untimed source analysis, **not a benchmark or product test**. There is no runtime producer, speed, allocation, safety, public-API, Hot Reload, trimming/AOT or whole-app claim for the canonical candidates.

The first inline native capture stopped on Git's long revision:path argument before any .NET execution or plan seal. Exact native arguments/streams and partial source are preserved. The corrected helper resolves short-prefix pinned trees and reads immutable blobs by ID; no persistent Git/Windows long-path setting was changed. Its capture helper is a historical execution script with fixed machine paths, not a clean path-agnostic bootstrap.

All19 alias budgets have zero authorizations and three unused authorizations permanently closed **per alias**. Canonical budgets remain untouched; measurements, if justified later, must pass the exclusive gateway. No shipping source/config, permanent test, source branch, source PR or browser launch was produced. The fixed classified report remains unchanged.

With matching SDK/Roslyn references, the two-input source-analysis project and captured inputs can reproduce the observations. `node .\F142-verify-aliases.mjs . --require-budgets --require-seal` verifies the recorded public capsule without omitted bin/obj files. The immutable core predates the additive publication receipt and live campaign-index update.
