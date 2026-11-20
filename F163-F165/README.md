# F163-F165: initialization and scoped-map benefit is not established

**No candidate admitted; each finding closes at zero comparisons, with no
performance PR.** Correct lookup/diagnostic contracts are established at real
managed owner boundaries. A material cache-miss, asset-initialization or scoped
application workload justifying an optimization was not established.

Classification is `rejected` /
`initialization-or-data-shape-material-benefit-unestablished`, not measured
no-gain, zero cost or proof that compatible alternatives cannot help.

## Separate findings and actual reachability

| Finding | Actual owner/producer and observed effect | Why no performance proposal is admitted |
|---|---|---|
| F163 | Public parameter assignment reaches actual per-Type writer-cache construction and `MemberAssignment` inheritance/collision handling; existing Facts assert assigned values and exact duplicate exceptions. Collision keys use **Ordinal**, unlike the writer dictionary's **OrdinalIgnoreCase**. | This is cached metadata, not a fictional per-render reflection scan. Updating a single-property entry into a collision list is real state mutation. Material cache-miss/cardinality benefit from an alternative was not established. |
| F164 | Real static-asset manifest/default/group endpoint registration plus actual collection constructors/indexers/content-specific checks. Supplemental constructors assert the first duplicate's exact message, incoming label spelling and first recorded URL. | Label staging is initialization, not per-request URL indexing. Material constructor workload/benefit was not established. First-diagnostic order and staging comparer cannot simply be discarded. |
| F165 | Native and supplemental public `ImportMapDefinition.Combine` calls genuinely merge colliding scopes and assert exact JSON/precedence/order/isolation; native managed render-tree tests consume import maps. | The actual internal `ResourceCollectionConvention` supplies two maps whose **Scopes are null**. It does not produce this scoped-collision branch. A material colliding scoped-map application workload was not established. The public branch is valid, **not universally unreachable**. |

F163 already has source-visible Hot Reload cache-clear wiring through
`HotReloadManager`. No live delta, refresh defect or runtime invalidation behavior
was established, and no new cache was added.

F164's staging property/label matching is `OrdinalIgnoreCase`; this does not
silently assert untested mixed-case behavior of the final frozen lookups. The
constructor retains the supplied resource list; it does not sort/clone it.
The resolver sorts URLs Ordinal in source, but multi-resource runtime sorting
and manifest-produced duplicate failure were not exercised.

F165 uses default string equality for imports, scopes and integrity. Later values
replace earlier values without moving existing keys; new keys append. The
three-map public check preserves case-distinct `x`/`X`, exact ordering and the
first input's unchanged dictionary. Null-source exception observations are
unchanged invalid-input behavior, not a new supported-input promise.

## Connected artifacts

| Artifact | Link | Outcome / scope |
|---|---|---|
| Coordinator dispositions | [Acceptance](coordinator-acceptance.json), [three closed budgets](closed-budgets.json) | Each 0/3 permanently closed; no alternative implementation, counters or benchmark |
| Complete unchanged preparation | [Handoff](owner-handoff/HANDOFF.md), [manifest](owner-handoff/manifest.json), [requirements/boundaries](owner-handoff/requirements-and-boundaries.json) | All 166 selected files / 32,960,208 bytes preserved; historical PENDING status precedes this decision |
| Original native XML | [Components](owner-handoff/native/original37/components-loaded/components-loaded.trx), [Endpoints](owner-handoff/native/original37/endpoints-loaded/endpoints-loaded.trx) | 11 + 18 actual passed rows |
| Default native XML | [Components](owner-handoff/native/default/components-loaded/components-loaded.trx), [Endpoints](owner-handoff/native/default/endpoints-loaded/endpoints-loaded.trx), [initial abort](owner-handoff/native/default/components-initial-runtime/components-initial-runtime.trx) | Same 29 passed cases on normal runtime69; historical zero-row missing-runtime abort retained |
| Supplemental contracts and identity | [Facts](owner-handoff/facts.json), [loaded observations](owner-handoff/loaded-images.json), [common consumer](owner-handoff/common/Program.cs) | Seven real API checks per role; genuine VSTest observations kept separate from supplemental console observations |
| Independent coordinator audit | [Real System.Xml/native verification](coordinator-whole-payload-verification.json), [copied bytes](authoritative-copies.json), [portable wrapper](verify.mjs), [owner auditor](owner-handoff/audit.mjs) | Nine fresh PE/PDB associations, 43 raw Document checks, all 58 XML outcomes/IDs/counters and 14 supplemental checks |
| Complete declared differences/failures | [2,948 differences](owner-handoff/all-differences.json), [exact attempts](owner-handoff/command-bundle.json), [terminal native work](owner-handoff/terminal-native-work.json) | No fixture/shared/non-DLL prefix exemptions; cross-source closures are not a causal optimization pair |
| Artifact-preparation correction | [Initial read-only failure](preparation-failure-012.json), [unchanged failed preparer](executed-drivers/failed-prepare-012.mjs) | First metadata-key lookup failed before any copy/run directory/budget/native work; corrected preparer resolves the retained directory-prefixed key |
| Final linkage | [Verified publication](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F163-F165/publication.json) | Closed fork-only tracking issue; no PR/window; fixed classified report unchanged |

## Exact named coverage and runtime limits

F163 native `ParameterViewTest` Facts include
`IncomingParameterMatchesAnnotatedPrivateProperty_SetsValue`,
`IncomingParameterMatchesDeclaredParameterCaseInsensitively_SetsValue`,
`IncomingParameterMatchesInheritedDeclaredParameter_SetsValue`,
`IncomingParameterMatchesOverriddenParameter_ThatDoesNotHaveAttribute`,
`DeclaredParametersVaryOnlyByCase_Throws`, and
`DeclaredParameterClashesWithInheritedParameter_Throws`.

F164's five collection Facts are `CanCreateResourceCollection`,
`CanResolveFingerprintedResources`,
`ResolvingNoFingerprintedResourcesReturnsSameUrl`,
`ResolvingNonExistentResourceReturnsSameUrl`, and
`CanDetermineContentSpecificUrls`; nine existing `WithStaticAssets` Facts cover
real endpoint conventions. F165 has five `ImportMapDefinitionTest` Facts
including `CanCombine_ImportMaps` and four `ImportMapTest` managed-render cases.
Every exact name, ID, counter and assertion-owned boundary is retained in the
linked requirement file and native XML.

The seven supplemental names are
`F164.FirstDuplicateDiagnosticAndCaseInsensitiveLabelDetection`,
`F164.DuplicateLabelWithinOneResource`,
`F164.InputEnumerationAndNullProperties`,
`F165.ZeroSourcesAndNullSections`,
`F165.EmptySectionsRemainPresent`,
`F165.ThreeMapScopedPrecedenceCaseOrderingAndInputIsolation`, and
`F165.NullSourceInputsHaveNoCustomDiagnostic`.

Original source is `37e809ead5824bc753a1c3d56f11615bdb1296c5`, actual runtime62;
default is `90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d`, actual normal runtime69.
The native testhosts genuinely observed selected owner/test/CoreLib/CoreCLR
identities. One common C#13 executable compiled successfully once and was reused
byte-identically across roles. A separate closing main/three-blob observation
checks target freshness without pretending a new rebuild.

No browser import-map/module loading, WebAssembly/AOT, live Hot Reload or real
production workload frequency was established. Compiler/static-assets/IIS
exclusions and all failed attempts remain explicit; managed render-tree evidence
is not browser DOM evidence.

`node .\verify.mjs` verifies selected hashes, then invokes only the selected Node
owner auditor under a read-only filesystem permission scope. It freshly parses
selected PE/PDB/Documents/XML but starts no .NET target, test rerun, counter or
benchmark. Saved loaded-image events and omitted image/input hashes are not live
recapture, omitted-byte rehash, full compiler-input attestation or a portable
runnable whole distribution. All three 0/3 budgets remain permanently closed.
