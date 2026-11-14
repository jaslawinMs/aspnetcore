# F295 pre-implementation acceptance criteria

Independent fresh default baseline:
37e809ead5824bc753a1c3d56f11615bdb1296c5.
The retained informational finding is immutable per-character string growth in
shared ServiceDescriptorHelpers.FormatUnderscoreName. LSP resolves its actual
local caller in ResolveBodyDescriptor: a real protobuf field name is converted
with pascalCase true/preservePeriod false, then used to select the CLR property.
The source project explicitly links this shared file. This is descriptor setup,
not ordinary per-request serialization.

Preserve the actual character producer: lower/upper invariant casing, first
uppercase handling, digits causing next-letter capitalization, repeated
separators, optional periods, trailing # marker, empty/no-output inputs and
UTF-16 surrogate behavior. Verify all four flag combinations per fixed input.
Add faithful actual ResolveBodyDescriptor cases using existing generated
protobuf descriptors and observable selected property/field/value identities.
Confirm original-source rows before shipping edits and all rows afterward.
Do not change existing policies or public API, add metadata caches, new IVT or
UnsafeAccessor, or modify pinned build/package manifests.

Evaluate a local StringBuilder replacement, preserving capitalization local,
loop, branches and comments. Consider small/empty/no-output allocation
regressions explicitly. No global mutable state or hot-reload handler is needed.
Do not tune into unrelated metadata/reflection caches.

The standalone benchmark must call the actual owning compiled formatter via a
cached delegate resolved outside timing, not copy the proposed algorithm.
Include empty/single/ordinary underscore names, digit/acronym/Unicode/period/
marker boundaries, representative longer/stress inputs and unchanged controls.
Include complete ResolveBodyDescriptor scenarios backed by real Google.Protobuf
descriptors and actual CLR properties, with reflection bridge outside timing.
Validate exact output/property identity in setup before both snapshots.
Long artificial names are stress boundaries, not common production inputs.

Freeze identical original harness DLL/PDB/runtime/deps and an exact owner-only
recursive DLL/JSON closure. Verify actual load location/MVID and retain every
case/time/allocation/SD and preparation failure. Serialize all measurements on
the shared box without changing machine settings or other users' processes.
At most three pairs; a clear large target gain may stop after one, otherwise
use the remaining budget and record no-gain if no supported benefit remains.

Publish a justified fork-only draft only after compatibility/build/formatting
and complete evidence pass, preserving the repository PR template, linking
origin/source/raw results and immediately requesting browser-open. Incompatible
or no-gain changes get an honest disposition rather than a speculative PR.
Keep metadata-setup observations distinct from endpoint/HTTP throughput,
cold start, concurrency, other runtimes/architectures and combined proposals.

Fixed pre-measurement matrix: 22 cases (17 real formatter inputs, two complete
Google.Protobuf HttpRule body descriptors with actual CLR property/value
identity, and three untouched star/missing-field/echo controls). Three longer
inputs are explicit stress boundaries. Separators-only and empty cases must
retain any extra buffer allocations. Native IIS, ReadyToRun and installer
packaging are excluded identically with UseIisNativeAssets=false,
CrossgenOutput=false and GenerateInstallers=false. The unit suite uses the
actual source-built 12.0.0-dev ASP.NET framework installed only in repo-local
.dotnet; preserve prerequisite failures and framework hashes.

After the first pair, preserve the StringBuilder implementation/results but
tune away its empty/one-character/no-output allocations with a bounded
operation-local char buffer: at most 128 chars/256 bytes on stack, heap array
otherwise. Each input char emits at most one output char; trailing # is
discarded before emitting its replacement underscore, so input.Length is a
valid upper bound. Keep every original capitalization branch unchanged.
Add six exact-output rows at 0/1/127/128/129/1,024, covering letters, no-output
separators and marker replacement. Reestablish all 29 new rows on the original
source before applying this second implementation. Benchmark matrix/harness
remain frozen at 22 cases; threshold boundaries have unit, not timing, evidence.
Heap cost of large no-output inputs and stack/concurrency pressure are unmeasured.
