# F086: weak-key JSON Patch list element metadata

**Qualified warm-cache proposal, NOT MERGE-READY.** One actual AB comparison
shows 50.76-60.18% time gains on 15 primary warm list profiles. Normal int
Replace1/8 improve53.69%/56.33%, with120B/960B saved per ApplyTo.
**Non-generic rejection is8.75% slower,Poco control6.70% slower,array rejection
2.11% slower. Both first-use type profiles allocate81B more per patch.**
All costs and single-pair uncertainty remain; no universal benefit claim.

The user permits stopping after one comparison for a clear approximately50%
win. This finding's1/3 budget is closed; two comparisons are intentionally
unused. No unreported timing strategy or subsequent repetition exists.

## Source and actual producer

Fresh default main: `37e809ead5824bc753a1c3d56f11615bdb1296c5`.
Proposal: `4c2d4c04460429a9e49e5c78c2091d82ae53e324`, branch
`autoperf/F086-jsonpatch-list-element-type-cache`.
Two files,171 additions/zero deletions:11 owner lines and160 focused test
lines. No existing statement was rewritten,no public/protected API/default/
convention/dependency/config/assembly-visibility change.

The six ListAdapter methods previously rediscovered the closed IList<T>
through Shared ClosedGenericMatcher and fetched GenericTypeArguments on
every call. Default AdapterFactory creates new adapter objects,ObjectVisitor
visits interior lists,andpublic JsonPatchDocument.ApplyTo performs the actual
conversion/mutation/test/move/copy/error operation. This is not a reflection-
only proxy or a custom-adapter substitute.

Add a private static ConditionalWeakTable<Type,Type> storing only successful
element Type by exact runtime list Type. Keep the array guard first,the
existing matcher/ordinal FullName selection/miss/error branch,andall consumer
methods unchanged. Negative/non-generic results remain uncached. A concurrent
first miss can duplicate immutable discovery; AddOrUpdate is thread-safe,
not an exactly-once initialization guarantee.

Weak keys prevent this cache itself retaining collectible runtime list
types,including when its element Type shares that collectible assembly.
An unmeasured ConcurrentDictionary prototype demonstrably retains a real
RunAndCollect list Type. Do not replace the weak-key cache with a strong one.

Owner history includes dotnet/aspnetcore#61313 and dotnet/aspnetcore#65470; preserve actual
JsonArray traversal added by the latter. Bounded active-work research found
dotnet/aspnetcore#70323,whoseactual17-file patch does not change this modern
ListAdapter/cache seam. No exhaustive duplicate-absence claim.
GitHub semantic search returned404 andC# symbol/definition lookup no matches;
bounded known-source fallback andactual histories were used.

## All28 profiles and retained boundaries

[Every measured pair](comparison.md),[exact raw arithmetic/RSD](measurement-audit.json),
[complete raw before reports](round-1-before/results.json) and
[complete raw after reports](round-1-after/results.json).
The table's one-pair "median" is the sole paired mean percentage change,
not a repeated-strategy median,confidence interval or significance test.

Depth4/16/64/128 improve59.70%/59.18%/59.27%/58.62%,saving480B/1920B/7681B/
15362B per ApplyTo. Depth64Eight improves58.92%,saving61450B. Derived and
multiple-interface lists improve56.28%/60.18%,saving960B/1152B.
MixedReplace8/32 improve57.38%/56.90%,saving1921B/7683B.
IntAddRemove andIntMoveRoundTrip improve56.66%/59.01%.

Conversion/JSON-heavy paths benefit less: IntConverted8 improves28.74%,
IntCopyRemove42.16%,IntTest8 19.74%,JsonArray1/8 23.20%/23.54% andJsonArray
Depth16 49.37%. These are full actual ApplyTo calls with the stated number
of operations,not normalized isolated reflection calls.

FreshList64/FreshElement64 each perform one first ApplyTo on each of64
distinct newly emitted collectible runtime list types per iteration.
The actual job has InvocationCount1/UnrollFactor1,each raw result has64
operations,andraw console shows a distinct fresh64-type producer batch
immediately before every actual workload iteration. Emission,constructors
anddocument/value setup are outside timing. Process-first static cache
construction is not measured. Extra fresh batches cover JIT/warmup/memory
diagnostics; no private cache is populated or cleared by the harness.

Cold time means improve11.74%/5.72%,but batches are short anduncertainty is
wide; do not call either a verified cold-time win. Managed heap803->884B and
1790->1871B is retained. Native dependent handles,capacity/whole-process
cache footprint,cache growth for noncollectible runtime types andproduction
type/reuse distributions are not measured.

NonGenericRejected moves175.64->191.00ns with544B unchanged anduncached
fallback; source adds a weak lookup,but no experiment establishes how much
of its measured15.36ns delta is caused by that lookup.
PocoControl moves132.59->141.46ns with200B unchanged. It does not call list
metadata discovery; no JIT/code-layout/scheduler/GC/load cause is established.
ArrayRejected moves110.03->112.35ns with408B unchanged; it returns before
cache lookup. Do not dismiss these movements as harmless noise.

Caching only removes repeated metadata discovery/argument-array work.
ObjectAdapter/ObjectVisitor/new ListAdapter/ParsedPath,conversion/JSON,
list values/mutations andother real operation allocations remain.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Runtime element Type andconversion,all six operations acrossnew adapters | Patch_RepeatedAdaptersPreserveRuntimeListElementTypes: Int,String,Derived,Multiple,JsonArray assert initial/read/replacement/traversal/test/remove/final exact typed values andcount |
| Multiple closed IList<T> deterministic winner | Same Multiple row uses a real List<int>/IList<string> implementation; actual conversion/mutation must retain the original ordinal int winner |
| Concurrent cache-key/type safety | Patch_ConcurrentAdaptersPreserveRuntimeListElementTypes:64 actual parallel int/string list mutations,read values andremovals ondistinct adapter instances |
| No process-lifetime list/element Type root | Get_DoesNotRetainCollectibleListOrElementTypes creates real RunAndCollect list/element types,gets actual element reference andasserts both weak references collected |
| Expected-red new-cache hazard,not original correctness bug | Original/weak83/83;strong prototype82pass/1 expected lifetime failure. Its first list-Type assertion fails; following element-Type assertion was not reached |
| Original positions/null/reference/conversion/error/JsonArray traversal | All76 existing ListAdapter/ObjectVisitor/AdapterFactory rows pass before/after;exact original/proposal case sets match |
| Actual public-operation andretained state effects | JsonPatchFixture.Capture runs every warm profile twice andchecks full actual state/error count;26 warm andtwo64-target cold contracts agree,56 exact state files match |
| Genuine cold producer,not reflection-only/cleared-cache timing | JsonPatchColdFixture creates distinct emitted runtime list types;every actual iteration hasits own fresh64-type batch;actual Invocation1/Unroll1 and64 operations verified |
| Executing source/owner/complete closure | Eight source/PDB checks,actual tested owners,58 executing-owner markers,152-file/70-runtime-asset owner-only closure pass |
| Preserve unrelated existing source formatting | Actual main/selected full-file formatter both exit2 for3 identical old test-file diagnostics;native diff ranges provezero added-line violations andzero existing statement rewrites |

All249 actual TRX outcomes are parsed asXML:248passes,one expected unmeasured
strong-cache failure,no skips. Original/selected83/83 andall seven new rows
pass individually. The original code was functionally green; this proposes
performance work,not a pre-existing correctness-defect fix.

An initial new-test compilation failed for a missing System import before
any assertions; corrected test source thenpasses. Full-file formatter still
reports pre-existing lines525/570 onmain,mapped to531/576 after added usings.
These were deliberately not cleaned up. The changed-line audit passes.

## Reproduction and evidence

Authored C#13,BenchmarkDotNet0.13.0,SDK12.0.100-alpha.1.26557.102,
.NET12.0.0(12.0.26.56305),X64 in-process,concurrent serverGC,three warmups,
eight result iterations,100ms target,DontRemove outliers. Cold fixed-invoke
short batches do not achieve that target. Shared Windows host,serialized
CPU-heavy commands,two MSBuild workers,no power/affinity/unrelated-process
changes. [Actual host](hardware.json),[executing runtime](execution-runtimeconfig.json).

Activate `. .\activate.ps1` fromthe repo root before every dotnet command.
[Exact commands andresults](validation-commands.md),[actual two timing commands](all-execution.json),
[actual source/test patch](source.patch),[external four-file project](harness/AutoPerf.Benchmarks.csproj).
Build owning tests first withthe stated Release/disabled-native/Node/crossgen/
installer flags,thenbuild the external harness against that actual test-bin
dependency set. Snapshot original/selected owners;keep identical harness/
runtime/deps. Do not silently substitute installed ASP.NET assemblies or
an older SDK/runtime. Restore only for newmanifest/missing dependencies.

With Node andexisting PowerShell fromthisWindows environment:

```powershell
node .\reproduce-analysis.mjs . --verify
```

This performs no timing/writes:recomputes all448 actual result means,
checks448 logged actual workloads andfresh-type adjacency,all249 actualXML
rows,56 state hashes,eight exact PDB sources,tested/executing hashes,
closure receipts,summary andbaseline-only format diagnostics.
Raw executables are not published;source/tools/identities are.

Initial audit errors assumed Actual-stage records existed inBDN0.13 JSON
(actual export stores Result-only),thenfound Python unavailable. Corrected
audit uses actual console rows andexisting PowerShell XML;failed logs and
successful recovery are retained. No measurement/source rerun.
A post-push read-only SHA check mishandled PowerShell native invocation/
string indexing;actual fork refregex verification succeeded without
repeating thecommit orpush.

## Hot Reload,trimming andunverified environments

The cached datum is an existing runtime Type's closed IList<T> argument
identity,not editable member/property/attribute metadata orcompiled accessors.
Current repository/Roslyn guidance treats base/interface/type-parameter
changes as rude edits; supported member edits retain that structural answer,
andnew runtime types receive new weak keys. No unrelated metadata-update
handler was added andno live-delta/no-restart validation is claimed.

The original annotated Shared ClosedGenericMatcher reflection remains;
no new reflection targets orassembly-boundary mechanism. No trimmed/
NativeAOT execution,hosted request/browser/network/serialization-input end-
to-end,production throughput/type distribution,otherOS/architecture/runtime
oruniversal improvement is claimed. Those boundaries remain unverified.
