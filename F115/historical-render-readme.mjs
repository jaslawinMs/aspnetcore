import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const session = path.dirname(fileURLToPath(import.meta.url)), root = path.join(session, 'autoperf-runs', 'F115');
const read = name => JSON.parse(fs.readFileSync(path.join(root, ...name.split('\\')), 'utf8').replace(/^\uFEFF/, ''));
const a = read('measurement-audit.json'), p = read('source-branch-publication.json'), m = read('measurements\\original\\preprofile-machine-observation.json');
assert.equal(a.sourceComparisons, 0); assert.equal(p.trackedFilesChanged, 0); assert.equal(a.actualBenchmarkOutcomes, 28);
const body = `# F115: JSON Patch object-valued list reads

**Disposition: reject the suggested blanket/local boxing removal. No source change, before/after gain or performance PR.** The actual helper boxes \`int\`/populated \`int?\` at **24 B/read** and the exercised 16-byte values at **32 B/read**. A generic \`IList<int>\` read returning \`object\` still allocates **24 B/read**. The separate **0 B** native-int diagnostic changes the result/escape contract;it is **not a replacement or improvement**.

The current helper,adapter,visitor and deep-equality/serialization path is internal and object-valued. This does not prove that every future generic adapter/serializer redesign or caching strategy is impossible. No compatible local candidate was measured;all three allowed source comparisons remain unused and the budget is closed. One complete original-pressure sweep is retained instead of inventing a comparison.

## Finding and unchanged source

Retained finding F115,card \`object-typed-scalar-factory-boxing\`,targets \`GenericListOrJsonArrayUtilities.GetElementAt\` and its non-generic \`IList\` indexer. The observed boxing is real;the scanner's severity/frequency labels do not establish production impact or an interchangeable optimization.

- Exact measured baseline: \`37e809ead5824bc753a1c3d56f11615bdb1296c5\`.
- Fresh default: \`18781e9d03cba0f3df9cdf7fae90f77771ca9f00\`;all14 scoped default/baseline/working source identities match. [Investigation](current-source-investigation.json),actual source snapshots and bounded history/search logs are retained. The helper is unchanged since the initial implementation;the existing JsonArray traversal fix from dotnet/aspnetcore#65470 is preserved. Bounded searches are not exhaustive novelty proof;LSP coverage was incomplete.
- [Independent fork branch](https://github.com/jaslawinMs/aspnetcore/tree/${p.branch}): \`${p.branch}\` points to the unchanged baseline,not a fabricated source commit. The previous F086 metadata-cache change is not inherited.
- [Pre-edit acceptance](acceptance.json),[final evaluation](final-evaluation.json),[closed budget](measurement-budget.json),[source branch verification](source-branch-publication.json).

No shipping source,tests,visibility,public API,default,TFM or dependency manifest is modified. \`ListAdapter\` and \`IAdapter\` are **internal**,not public APIs. Harness-only reflection bindings established outside timing do not add shipping cross-assembly access.

## Actual producer,contracts and counterexamples

The harness references the actual in-tree product and owning-test dependencies. Direct rows bind the real GetElementAt once outside timing. Get/traverse rows bind the adapter selected by the real factory. Public patch rows deserialize operation documents through the actual JsonPatchDocument converter,then execute real public \`ApplyTo\` inside timing:

\`JsonPatchDocument.ApplyTo -> ObjectAdapter -> ObjectVisitor/AdapterFactory -> ListAdapter -> actual IList/JsonArray indexer\`.

The factory's current receiver selection is preserved. Generic-only custom IList<T> receivers are not assumed to be list-supported. Arrays/non-generic-only lists exercise actual rejection controls;JsonArray uses its real separate indexer/traversal path.

The public boundary probe supplies a legal dual-interface list whose generic indexer returns731 and non-generic IList indexer returns1731. A real converter-created public Test expecting1731 passes;the nearest-opposite Test expecting731 throws the actual JsonPatchException. Exactly two non-generic reads prove the real owning producer was reached. Substituting a generic indexer can change this behavior,not merely remove an allocation.

The real helper also observes list mutation731 ->997 on the next read while a previously escaped boxed value stays731. A boxed mutable struct can be mutated through its interface without mutating list storage or a subsequent read. This is isolation/current-value evidence,not a newly invented fresh-box-reference-identity contract or a universal ban on caching immutable values.

All28 cases assert exact result values/runtime types,nullable null/value behavior,reference/JsonNode identity where applicable,and the complete final model. Cases cover int/long/decimal/Guid/mutable struct,nullable values/nulls,strings,references,preboxed objects,JsonArray values/nulls,actual get/traverse,and public Test/Copy operations including eight tests per call and nested value/reference/JsonArray traversal. Copy destinations are scalar properties,so repeated invocations do not grow a list.

Models,documents,binding and fixture work are prepared outside timing. Public adapter creation,traversal,conversions and serialization remain inside. No assertions,fixture reads,hashes or reflection occur inside timed Run. These are warmed owning-component operations,not HTTP,end-to-end application,production-frequency or cold-start measurements.

## Actual original measurements and controls

[All28 original outcomes](original-outcomes.md) retain every target/control and the shared-machine variation. There is no candidate column or speedup ratio. The maximum observed CV is **${a.maximumCvPercent.toFixed(2)}%**,at GetNullableValue;this variability is not filtered out or called an optimization.

The direct reference,preboxed-object,nullable-null and JsonArray read controls allocate0 B/read. Original adapter/public rows include other real work;for example GetInt allocates144 B and public PatchTestInt768 B/call. The native typed-return diagnostic's0 B cannot be subtracted from those totals as a demonstrated product saving.

**${a.actualBenchmarkOutcomes} actual outcomes,${a.actualRetainedResultSamples} retained results,${a.actualWorkloadWarmups} warmups,${a.actualRetainedOverheadSamples} actual overhead samples**,all28 exact setup/hash/PID observations and56 before/after settings records. Every case retains8 results after3 warmups/requested100ms iterations/DontRemove.

There are28 full benchmark identities but only27 distinct truncated BDN DisplayInfo strings:PatchTestJsonArrayMember and PatchTestReferenceMember collide visually. The auditor joins raw blocks by their exact emitted setup Case and full JSON identity,then verifies the display header;it never attributes results using a truncated label alone.

There are56 captured per-case contracts (28 characterization+28 timing),28 separately captured fixture outputs,140 allocation calipers and10 separate different-contract typed/native diagnostic samples. Four standalone boundary-probe records are retained,including the zero-workload parser attempt. Caliper elapsed times are diagnostic only,not an extra BDN comparison.

## Existing owning tests and all failed attempts

The existing ListAdapterTest,ObjectVisitorTest and AnonymousObjectIntegrationTest scope passes **81 actual results,0 failed,0 skipped**,from61 discovered definitions. Seven source-defined MemberData methods expand those definitions by20 rows. Every positive-duration result is linked by actual execution/test IDs to its definition and entry;repeated test IDs/display names are legitimate. The test/owner DLL/PDB identities were captured before the later harness build;this is not full-test-closure or in-test loaded-hash proof.

All attempts are preserved without repeating tests or benchmarks to repair audit code:

- The first test auditor incorrectly required61 results rather than61 definitions/81 expanded results. The actual rebuild/discovery/test commands exited0;an audit-only correction validated all81 existing rows.
- The first CLI launch rejected unsupported exporter \`jsonfull\`,exit-532462766,**before any benchmark workload/setup/result**. All exact bytes were archived;the budget explicitly records one parser failure and zero timings there. The same frozen image was then launched with known BDN0.13 \`json csv\` exporter arguments.
- The complete actual28-case profile exited0. Its outer helper exited1 only because \`*-full.json\` did not match the real \`-report-full-compressed.json\` export. Audit-only recovery verified the actual224 results and unchanged152-file closure;no timing rerun.
- The first numerical auditor selected a colliding truncated DisplayInfo rather than exact Case and rejected the resulting setup mismatch. Its exact source/log are retained. The corrected auditor validates all28 full identities/raw blocks without changing any measurement.

Exact historical commands and actual outcomes are in [validation-commands.md](validation-commands.md). A helper failure is not relabeled as a successful helper run,and expectedCases28 in a parser-failed execution record is not an actual outcome count.

## Shared-machine settings and execution identity

Shared VM point observation:Windows \`${m.os.Version}\`,${m.computer.Model},${m.cpu[0].Name.trim()},${m.cpu[0].NumberOfCores}cores/${m.cpu[0].NumberOfLogicalProcessors}logical. BDN's own Unknown processor metadata is retained,not replaced by CIM. This is not a dedicated,known-idle or continuously traced machine. CPU-heavy work is serialized,max2 build nodes;no unrelated process is stopped or tuned.

The harness uses stock emitted generator/builder/public RunnableProgram/engine/diagnosers with a settings-preserving custom IExecutor. It omits the stock InProcessEmitExecutor's High/Highest priority changes and worker wrapper. Guid.Empty disables BDN power-plan application. Startup/setup/before-after observations are Normal process/Normal thread/all16-CPU affinity65535;read-only pre/post power-scheme observations agree. These records and explicit no-mutation configuration are not continuous OS tracing.

Pinned SDK \`12.0.100-alpha.1.26557.102\`,runtime \`12.0.0-alpha.1.26562.105\`,net12.0/C#13,x64/server+concurrent GC,only Microsoft.NETCore.App,RollForward Disable,BDN0.13.0. Runtime.Version reports12.0.0;captured CoreLib/System.Text.Json informational versions identify the alpha build.

The actual frozen image has152 copied files/70 declared runtime assets. The owner exactly matches the captured tested owner. [Manifest](original-manifest.json),[closure](execution-closure-original.json),runtime/deps metadata and setup identities are retained. Fifteen portable-PDB source-document checks are **not PE/PDB binding or method coverage**.

Raw DLL/PDB/runtime bytes,binlogs and build images are omitted from public evidence. The live audit rehashes the complete retained application image;the portable public audit verifies copied source/fixture/TRX/PDB-document/settings/measurement data and captured omitted-binary identities,not omitted bytes. Confidence-interval arithmetic uses recorded margins;critical values are not independently recomputed.

## Reproduction

Activate this repository's SDK with \`. .\\activate.ps1\`,build the unchanged owning product/test dependencies in Release,then build [the standalone harness](harness/AutoPerf.Benchmarks.csproj) with \`-p:AspNetCoreRoot=<your checkout>\`. Use max2 nodes and serialize CPU-heavy work. Do not substitute installed ASP.NET Core assemblies. Follow historical freeze/closure scripts and retain fresh artifacts rather than overwriting this closed evaluation.

Use the real fixtures and actual helper/factory/public producers. Characterize every case before the one pressure sweep. Preserve the program's settings-preserving emitted job;do not add --inProcess or --job. Record fresh runtime/owner/settings/closure identities;fresh builds are not promised byte-identical.

Offline audit from this results checkout:

\`\`\`powershell
node .\\F115\\reproduce-analysis.mjs (Resolve-Path .\\F115).Path --verify
\`\`\`

The [copy manifest](authoritative-copy-manifest.json) maps every authoritative retained source/raw artifact to byte-exact public copies. No performance PR or browser dispatch is appropriate for this rejected local suggestion.
`;
fs.writeFileSync(path.join(session, 'F115-results-readme.md'), body, { flag: 'wx' });
console.log('F115 rejection report generated:original pressure only,all controls and failed attempts retained,no fabricated gain.');
