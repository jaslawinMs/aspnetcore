# F160-F162: generator lookup/set benefit is not established

**No candidate admitted; each finding closes at zero comparisons, with no PR.**
F160 already retrieves and consumes the first candidate with `TryGetValue`.
F161/F162 are plausible **data-structure simplifications**: only dictionary
membership is consumed, not their stored values. Material compiler-workload
benefit and an implemented alternative were not established.

Classification is `rejected` /
`generator-lookup-or-membership-simplification-material-benefit-unestablished`,
not measured no-gain, zero cost or proof that compatible alternatives cannot help.

## Separate findings and declared-target facts

| Finding | Actual source/contract | Assessment |
|---|---|---|
| F160 | `ToolBlockEmitter.cs:188-197` uses `TryGetValue`; `existing.ClassName` at193 identifies the **first** duplicate candidate. Later duplicates do not replace it. | Not a redundant `ContainsKey` plus getter. The first-candidate value is genuinely required; no material replacement was established. |
| F161 | `seenKeys`: declaration116, membership `ContainsKey`136, property-name value write143. These are all uses; stored values are never read and the dictionary does not escape. | A set is a plausible representation, but no set implementation or material parsing-workload benefit was established. |
| F162 | `seenResultKeys`: declaration160, membership180, value write187; likewise membership-only, no escaping dictionary/value reads. | Same bounded simplification opportunity, separately indexed. |

The generator actually targets **netstandard2.0**. Its selected real
NETStandard.Library2.0.3 reference image has no `Dictionary.TryAdd` instance
method, but **does include `HashSet.Add`**. Missing `TryAdd` therefore does **not**
establish that no compatible improvement exists. The new verifier decodes both
method inventories from the actual selected reference bytes. The earlier owner's
unestablished HashSet availability is superseded only by this additive fact,
not silently rewritten.

These are local compile-time collision collections, not per-request/render
runtime dictionaries. All use default string dictionary equality, with
case-distinct keys preserved; parameter/result maps are independent.
Null/empty attribute Name falls back to the real property name. Unusable setters
are diagnosed before reserving a key. Exact diagnostic order, identifier spans,
first retained mapping and generated registrations are contract-relevant.

## Connected artifacts

| Artifact | Link | Outcome / scope |
|---|---|---|
| Coordinator dispositions | [Acceptance](coordinator-acceptance.json), [three closed budgets](closed-budgets.json) | Each 0/3 permanently closed; no candidate, counters or benchmark |
| Full unchanged preparation | [Handoff](owner-handoff/HANDOFF.md), [manifest](owner-handoff/MANIFEST.json), [native/private results](owner-handoff/RESULTS.json) | All 175 selected files / 51,534,666 bytes preserved; historical PENDING status precedes this decision |
| Value-usage and API clarification | [Additive coordinator facts](coordinator-membership-clarification.json), [actual reference DLL](owner-handoff/selected/reference/netstandard.dll), [metadata parser](owner-handoff/Metadata.cjs) | Membership-only locals versus F160's consumed first-candidate data; actual HashSet.Add presence, not a missing-TryAdd impossibility argument |
| Actual native XML | [Original15](owner-handoff/evidence/native-original.trx), [default69 15](owner-handoff/evidence/native-default69.trx), [initial default abort](owner-handoff/evidence/native-default.trx) | 13 generator rows + two fixture rows per role, all five declaration-theory values separately passed; initial zero-row abort retained |
| Detailed real generator probes | [Original V2](owner-handoff/evidence/probe-original-v2/result.json), [target-only default V2](owner-handoff/evidence/probe-projected-default-v2/result.json) | Real Roslyn generator, emitted consumer and registrations; default target-only under common Original producer/runtime62 |
| Independent coordinator audit | [Real System.Xml/native verification](coordinator-whole-payload-verification.json), [copied bytes](authoritative-copies.json), [portable wrapper](verify.mjs), [owner auditor](owner-handoff/Audit.cjs) | Eight fresh PE/PDB associations, 26 raw Document checks, all native IDs/executions/counters and actual reference API inventories |
| Full declared image differences | [All image differences](owner-handoff/evidence/image-differences.json), [complete compressed catalogs](owner-handoff/evidence/complete-image-catalogs.json.gz), [terminal native work](owner-handoff/TERMINAL-RECEIPT.json) | Projected image differs only in generator DLL/PDB; normal native graphs have 48 differences, not a causal optimization pair |
| Final linkage | [Verified publication](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F160-F162/publication.json) | Closed fork-only tracking issue; no PR/window; fixed classified report unchanged |

## Producer, diagnostics and honest runtime boundary

The real `ToolBlockGenerator` runs through Roslyn `GeneratorDriver`, parses actual
symbols/attributes and emits source. The private checks compile/emit that output,
load its actual consumer and execute generated registration twice. They do not
reimplement or extract the generator.

Exact private rows are
`F160_DuplicateToolNamesKeepFirstAndRegisterEveryCandidate`,
`F161_DuplicateParametersKeepFirstOrdinalKeysAndUsableSetter`,
`F162_DuplicateResultsKeepFirstOrdinalKeysAndUsableSetter`, and
`IndependentParameterResultDictionariesAndInheritedPropertyControl`.
Their emitted in-memory consumer identities are saved observations; those
ephemeral PE images were not retained or freshly re-parsed offline.

Duplicate-name diagnostics retain the first candidate but **do not remove later
duplicate candidates from emitted registrations**. The private consumer
intentionally runs emitted output despite generator Error diagnostics; those
errors ordinarily prevent a successful user build. This is not an error-free
shipping-app or browser/render reachability claim. No automatic application
invocation rate or material compiler input cardinality was established.

Original native source is `37e809ead5824bc753a1c3d56f11615bdb1296c5`, actual
runtime62. Fresh native default
`90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d` genuinely passed its unchanged suite
on its normal runtime69 after a retained missing-runtime abort. Both native runs
include `ToolBlockGeneratorTests.DuplicateToolNames_ReportDiagnostic`,
`InvalidPropertyMappings_ReportDiagnostics`, every BAIC001-BAIC005 row of
`InvalidBlock_ReportsDeclarationDiagnostic`, and the separately counted
`AlwaysTestTests.SuccessfulTests` fixture rows.

The four detailed private rows use the same common Original AI producer/runtime62
for both generator owners: **default generator target-only**, not a full-default
private execution. Seventeen actual default-native module snapshots cover106
distinct files and observe test consumer/CoreLib/CoreCLR/hostpolicy/clrjit69 plus
hostfxr65. They did **not** observe the generator/AI-producer assemblies; built or
separate-console identities are not relabeled as those module witnesses.

Accepted V2 compiled successfully once, but V1 also successfully compiled and
then failed at runtime by dereferencing an ExternalFile diagnostic's absent
SourceTree. Both are retained: **two successful verifier compilations overall**,
not a literal one-success total. Corrected V2 uses the actual external path/span;
the same accepted V2 bytes are reused across roles.

`node .\verify.mjs` verifies all selected hashes, invokes only the selected Node
read-only auditor, and freshly decodes HashSet/Dictionary reference methods.
No .NET target, test rerun, counter or benchmark starts. All32 owned native
invocations are recorded terminal/drained; descendant sampling was not exhaustive.
Omitted whole images/packages/runtime bytes and saved module events are not fresh
omitted-byte rehash, full compiler-input attestation or live recapture.
Compiler-only assets exclusions, native/fixture/theory and failed-attempt
boundaries remain explicit. All three 0/3 budgets remain permanently closed.
