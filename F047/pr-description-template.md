**Allocation-only research draft; no demonstrated speedup and not merge-ready.**
The declared one-scalar fresh-boundary primary saves **56 B/op in all three pairs**
(1616 -> 1560 B/op, 3.47%), but its median paired less-time effect is **-1.43%**.
It is **2.48% and 1.43% slower in pairs 2 and 3**. The first apparent 51.20%
benefit has an unstable original baseline (42.69% CV); it is not a credible
speedup headline. This qualifies only the allocation alternative declared
before implementation. No latency-neutrality or application-throughput claim.

### Proposal and preservation rationale

Enumerate the private `SSRRenderModeBoundary` parameter snapshot's name/value
pairs instead of allocating `Keys.ToArray()` and reindexing every value.
Keep `ParameterView.ToDictionary()`, validation, render-mode branches, fragment
captures, ordering, rendering and serialization intact. This dictionary only
replaces existing values; it never adds/removes entries during the loop.
Capture construction does not execute user fragments.

Modern `Dictionary` explicitly supports existing-value overwrites during
enumeration: [dotnet/runtime#34667](https://github.com/dotnet/runtime/pull/34667).
The pinned runtime contract is exercised on original/default/candidate.
Re-enumerating raw `ParameterView` instead would not preserve the same snapshot
and duplicate-name canonicalization. There is no new shipping API, dependency,
friend assembly, unsafe accessor, cache or cross-runtime protocol boundary.

### All primary comparisons, including adverse observations

| Pair | Order | Original ns/op | Candidate ns/op | Less time | B/op before -> after |
|---|---|---:|---:|---:|---:|
| 1 | Original then Candidate | 2689.55 | 1312.39 | +51.20% (unstable baseline) | 1616 -> 1560 |
| 2 | Candidate then Original | 1303.48 | 1335.84 | -2.48% | 1616 -> 1560 |
| 3 | Original then Candidate | 1306.09 | 1324.76 | -1.43% | 1616 -> 1560 |

Positive effect means less time. Median is of paired percentages, not a ratio of
separately aggregated means. The declared timing gate is **not met**; the declared
allocation gate (at least 32 B/op in two pairs) is met in all three.
The later modest slowdowns are retained, not claimed to establish a statistically
significant causal regression. Pair 1's original samples decline from 3969.80 to
1261.18 ns/op; the cause is unproven and no sample is removed.

Both unchanged nonprerender controls save zero bytes. The unchanged four-scalar
control swings -26.65%, +24.04%, -6.71%; Mixed4 and Fragments8 regress 7.62% and
1.46% in pair 1. See all eight profiles and every CV below. This is shared,
non-isolated hardware and three comparisons, not application-level evidence.
The timing budget is permanently closed.

### Connected artifacts

| Artifact | Link |
|---|---|
| Tracking | [jaslawinMs/aspnetcore#{{TRACKING_NUMBER}}](https://github.com/jaslawinMs/aspnetcore/issues/{{TRACKING_NUMBER}}) |
| Exact two-file source proposal | [Source commit](https://github.com/jaslawinMs/aspnetcore/commit/{{SOURCE_COMMIT}}) |
| Immutable case guide and runnable BenchmarkDotNet project | [Guide/project connections](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F047/README.md) |
| All comparisons, controls, variability and raw reports | [Complete results](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F047/comparison-results.md) |
| Exact commands/results, individual XML and browser boundaries | [Validation catalog](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F047/validation-commands.md) |
| Raw arithmetic audit and independent untimed rebuild | [Audit](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F047/audit-summary.json) |

### What was actually measured and checked

Every timed operation constructs the actual internal boundary through a
precompiled expression adapter, uses the real Dispatcher/Renderer for fresh root
assignment, parameter binding and child rendering, then removes/disposes the root.
The wrapping algorithm is not copied. Preparation, reflection observations,
marker serialization, HTTP hosting and browser work are outside timing.

The eight-input common harness DLL/PDB is byte-identical across measured sources.
Only the Endpoints DLL/PDB differs in each 195-entry image; 193 entries are
unchanged. Three loaded source-built owners have matching PE/PDBs and eight
selected framework documents (five Endpoints, three Core). Complete compiler
provenance is not claimed. Current default is separately built and characterized,
including its different selected Core Renderer source.

Original: 98 existing managed rows plus all three new Server/WebAssembly/Auto
preservation rows. Current default: 98 existing rows. Candidate: 101 rows.
The new theory checks actual rendering, unmodified original fragment delegates,
ordered scalar/null values and both serialized fragment bodies through the real
nested render-mode producer. This is green/green preservation, not a bug fix.

The initial Auto fixture failed before its assertion because explicit root-result
Auto prerendering is unsupported. That named failure and its 100/101 invocation
remain; the corrected nested producer passes all three rows before shipping edits.
Missing default restore assets and the successful original characterization's
post-parser correction are also retained, not hidden.

Original and candidate each pass six canonical sample cases and six real clicks:
Server/WebAssembly/Auto with prerendering on/off. Existing owning
`RenderFragmentSerializationTest` passes all 14 real Server/WebAssembly rows,
including its nested-component producer and child interactions. All 314 passing
XML rows are individually reparsed. All task-owned helpers are stopped and only
the two archived temporary sample pages are removed.

Independent relocation, restore and rebuild of the exact eight-file project
passes both complete untimed characterization matrices, with only its rebuilt
harness DLL/PDB differing from measured images. No extra timing is used.
The audit reconstructs all 384 retained samples/allocations, 22 runtime records
and 96 per-benchmark settings records.

Unverified: cached/uncached Auto choice, global Router/template combinations,
enhanced navigation/streaming overlap, AOT/trimming, packaging and HTTP/application
throughput. No independent architecture review occurred; the recorded checkpoint
identifies this as local server enumeration, not a new cross-runtime boundary.
