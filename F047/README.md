# F047: SSR parameter wrapping without temporary key arrays

**Allocation trade-off, not a demonstrated speedup; not merge-ready.**
The declared one-scalar fresh-boundary primary saves **56 B/op in all three pairs**
(1616 -> 1560 B/op, 3.47%). Its median paired less-time effect is **-1.43%**:
it is 2.48% and 1.43% slower in the two later pairs. The apparent first-pair
51.20% benefit has an unstable original baseline (42.69% CV) and is not a
credible speedup headline. All observations and unchanged controls are retained.

Classification: **Focused allocation reduction with an unproven latency trade-off**.
The predeclared alternative allocation gate is met; the timing gate is not.
There is no latency-neutrality, merge-readiness or application-throughput claim.
The campaign's three-comparison timing budget is permanently closed.

## Connected artifacts

| Artifact | Location |
|---|---|
| Source proposal | [Two-file source commit](https://github.com/jaslawinMs/aspnetcore/commit/8b48da8e48baed69648d2a34359b6fadaa4b30fe) |
| Tracking issue, draft PR, immutable evidence and browser receipt | [Additive publication connections](publication.json), populated after immutable publication |
| Runnable BenchmarkDotNet project | [Project](harness/AutoPerf.Benchmarks.csproj), [cases](harness/BoundaryBenchmarks.cs), [real boundary adapter](harness/BoundaryAccess.cs), [real renderer lifecycle](harness/BoundaryScenario.cs) |
| All measurements, adverse results and controls | [Every measured row](comparison-results.md), [independent arithmetic audit](audit-summary.json), [decision](decision.json) |
| Tests and exact commands/results | [Validation catalog](validation-commands.md), [original existing XML audit](original-existing-trx-audit.json), [original new rows](original-multiple-fragments-trx-audit.json), [candidate XML audit](candidate-trx-audit.json), [current-default XML audit](default-existing-trx-audit.json) |
| Real browser evidence | [Original sample](sample-original/browser-result.json), [candidate sample](sample-candidate/browser-result.json), [14 owning Selenium rows](selenium-candidate-001/all-trx-rows.json) |
| Source/binary bindings | [Original](source-inputs-original.json), [actual default](source-inputs-current-default.json), [candidate](source-inputs-candidate.json), [premeasurement seal](premeasurement-validation.json) |
| Runtime overwrite authority | [Recorded runtime PR](official-dictionary-overwrite-pr.json), [actual diff](official-dictionary-overwrite.diff), [runtime contract implementation](harness/Characterization.cs) |
| Independent eight-file project rebuild | [Untimed reconstruction receipt](reconstruction-paired-001/verified-reproduction.json) |
| Criteria and limit | [Preimplementation acceptance](acceptance-plan.json), [permanently closed budget](diagnostic-budget.json), [closure hash](permanent-budget-close.json) |
| Exact sample cleanup | [Archived sources](sample-source-archive.json), [only-two-file cleanup receipt](temporary-sample-cleanup.json) |
| Capsule integrity and omitted binary inventory | [SHA256 inventory](capsule-file-hashes.json), [omitted files](omitted-file-hashes.json) |

The classified root REPORT.md intentionally remains its previous 118-finalized
snapshot; this later case does not silently revise it.

## What changes and why it preserves the supported behavior

The real producers are EndpointHtmlRenderer.ResolveComponentForRenderMode and
EndpointHtmlRenderer.PrerenderComponentAsync. The boundary first makes its private
ParameterView.ToDictionary snapshot and validates it. When prerendering is enabled,
the original then materializes parametersDict.Keys.ToArray and reindexes each value.
The candidate enumerates the concrete dictionary's name/value pairs directly.
Only existing values are overwritten with the same RenderFragmentCapture delegates;
no entry is added or removed from that dictionary and no user fragment is executed
by the capture constructor. Snapshot, validation, captures, ordering, rendering
and serialization otherwise remain unchanged.

**Why does overwriting not invalidate enumeration?** Modern .NET explicitly permits
replacement of an existing Dictionary value without bumping its enumerator version:
[dotnet/runtime#34667](https://github.com/dotnet/runtime/pull/34667), merged in 2020.
The exact pinned runtime contract is also exercised on Original, Default and Candidate.
The general enumerator documentation's older Remove/Clear remarks do not themselves
establish this overwrite guarantee. No claim is made that this always worked on .NET Framework.

Keeping ToDictionary matters: it retains the private snapshot and duplicate-name
canonicalization. Re-enumerating the raw ParameterView instead would be a different
change. Mutating keys or adding/removing entries during the loop is not proposed.
No new shipping API, friend assembly, unsafe accessor, dependency, renderer cache,
cross-runtime protocol or DI lifetime is introduced.

The measured allocation differences fit removing the fresh snapshot's Keys wrapper
and temporary key array: 24 B for empty, 56 B for one key, 80 B for four, 112 B for eight.
The unchanged nonprerender controls save zero bytes. This is measured managed
allocation, not measured browser memory or a prediction of application GC impact.

## Faithful measurement boundary

Each operation constructs the actual internal boundary through a precompiled
expression adapter, uses the real framework Dispatcher and Renderer to assign a
fresh root, bind parameters and render its actual child, then removes/disposes the
root. Constructor adapter, dispatcher invocation, snapshot/validation, wrapping,
child binding/rendering and lifetime bookkeeping are timed. Prepared input frames,
reflection observations, marker serialization, HTTP hosting and browsers are not.
The wrapping algorithm is not copied into a surrogate benchmark.

Eight fixed profiles cover empty, one/four scalar, one fragment, mixed four,
eight fragments, and the unchanged nonprerender scalar controls. Primary:
PrerenderScalar1. Unchanged primary control: NonPrerenderScalar1. Scaled/fragment
profiles do not establish production frequency.

The eight authored project inputs and measured common harness DLL/PDB are identical
between sources. Each frozen image has 195 entries; only the Endpoints DLL/PDB
differ between Original and Candidate (193 entries unchanged).
The actual default checkout is separately restored, built, tested and characterized,
not relabeled original binaries. Its target blob matches the campaign baseline;
the selected Core Renderer source differs and that difference is retained.

Three loaded source-built owners have matching PE/PDB identities. Eight selected
framework documents are verified: five Endpoints and three Core; Web's image/PDB
is bound but has no separately selected required source document. All 19 selected
physical inputs are hashed. This is not complete compiler provenance.

## Results and limitations

| Pair | Order | Original primary ns/op | Candidate primary ns/op | Less time | B/op before -> after |
|---|---|---:|---:|---:|---:|
| 1 | Original then Candidate | 2689.55 | 1312.39 | 51.20% | 1616 -> 1560 |
| 2 | Candidate then Original | 1303.48 | 1335.84 | -2.48% | 1616 -> 1560 |
| 3 | Original then Candidate | 1306.09 | 1324.76 | -1.43% | 1616 -> 1560 |

Positive effect means less time. The median of paired percentages is -1.43%,
not a ratio of separately aggregated means. The predeclared timing threshold
(at least 5% median less time and faster in at least two pairs) is not met.
The separate predeclared allocation threshold (at least 32 B/op in two pairs)
is met in all three. Two later slower primary means remain a real adverse
observation, not proof of a statistically established causal regression.

The unchanged four-scalar nonprerender control swings -26.65%, +24.04%, -6.71%.
Mixed4 and Fragments8 regress 7.62% and 1.46% in pair 1. The original first
primary's eight samples decline from 3969.80 to 1261.18 ns/op; the cause is
unproven. No samples are removed. See the complete table for every case/CV.
This shared, non-isolated Windows box is not dedicated benchmarking hardware.

## Behavior and reconstruction evidence

Original: 98 existing managed rows plus all three new mode rows. Current default:
98 existing rows. Candidate: 101 rows. Existing owning RenderFragmentSerializationTest:
14 real Server/WebAssembly rows. All 314 passing XML rows are individually reparsed.
This is green/green preservation of behavior, not semantic-bug red/green.

The first Auto fixture failed before its assertion because explicit root-result
Auto prerendering is unsupported. Its named failed row and 100/101 output remain.
The corrected nested producer matches the real canonical sample and passes all
three rows on untouched shipping code before the candidate. Missing default
restore assets and the original controller post-parser correction are also
retained and explained in the validation catalog.

Original and candidate each pass six canonical sample cases and six real clicks
(Server/WebAssembly/Auto, prerender on/off), with two distinct prerendered fragment
slots, scalar/null preservation, live interactivity, asset responses and no real
browser errors. Existing nested-component Selenium coverage supplies its real
nested producer; the harness's nested fragment/region check is not substituted for it.
All owned helpers are stopped; only the two archived temporary pages are removed.

The independently relocated exact eight-file project is actually restored and
rebuilt. Both variants repeat all 24 renderer profiles, 12 invalid-delegate cases,
three expected disabled-fragment serialization failures, one nested-fragment case
and eight fresh benchmark lifecycles. Only its common harness DLL/PDB differs from
the measured image; owner/dependency bytes and the closed timing budget remain fixed.
No extra timing is used for reconstruction.

Unverified: cached/uncached Auto choice, global Router/template combinations,
enhanced navigation/streaming overlap, AOT/trimming, packaging and HTTP/application
throughput. No independent architecture review occurred; the recorded checkpoint
identifies this as a local behavior-preserving server enumeration, not a new
cross-runtime boundary.

## Reproduce and inspect

Checkout the linked source commit (parent baseline 37e809ead5824bc753a1c3d56f11615bdb1296c5).
Follow the repository BuildFromSource guide and Components AGENTS using build.cmd
on Windows. Activate the checkout first, and build the Release Endpoints test graph
with its normal dependencies. Do not substitute installed ASP.NET Core owners.
The captured scripts record exact SDK/build settings and each observed outcome.

Copy all eight harness files into a separate directory and override AspNetCoreRoot
when restoring/building the project, as in the actual independently executed
[restore](reconstruction-paired-001/Restore/command.ps1) and
[build](reconstruction-paired-001/Build/command.ps1) scripts. The original and
candidate checks use separately frozen Endpoints DLL/PDB pairs with all other
dependency bytes held fixed. Compiled/restored images are intentionally omitted
from Git and listed by hash, not pretended to be downloadable executables.

The included independent offline audit needs Node and PowerShell 7, not private
binary paths: run `node .\F047-verify.mjs . --require-seal` from this case.
It recomputes all 384 retained observations/allocations, parses the individual XML,
and verifies the immutable capsule seal without timing. Historical paths identify
the original run, not portable package-cache locations.
