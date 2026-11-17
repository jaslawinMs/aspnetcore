import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const session=path.dirname(fileURLToPath(import.meta.url)),run=path.join(session,'autoperf-runs','F004');
const read=name=>JSON.parse(fs.readFileSync(path.join(run,name),'utf8').replace(/^\uFEFF/,''));
const analysis=read('analysis.json'),audit=read('measurement-audit.json'),source=read('source-branch-publication.json');
assert.equal(audit.disposition,'no-gain');assert.equal(audit.sourceComparisons,3);assert.equal(source.actualRemoteRefVerified,true);
const lines=[
'# F004: iterator-symbol membership - no established net win',
'',
'**Disposition: `no-gain` / mixed trade-off, not literally zero improvement.** One lazy `HashSet<ILocalSymbol>` candidate was built, validated and measured in three paired comparisons. Some larger controlled inputs allocate less, but timing gains are small/mixed and simpler controls trend slower. The evidence does not justify a performance PR. The four changed source lines were restored byte-for-byte; the exact candidate remains in [candidate.patch](candidate.patch) and the frozen source snapshots.',
'',
`The independent fork branch [${source.branch}](https://github.com/jaslawinMs/aspnetcore/tree/${source.branch}) retains campaign baseline \`${source.baseline}\`. No shipping-source commit, API/default/dependency change, new permanent test or PR was created. F005/F006 remain separate pending findings, not silently included or declared duplicates.`,
'',
'## What was actually exercised',
'',
'F004 is the `Iterators.Any(SymbolEqualityComparer.Default.Equals(...))` membership in `ForLoopIteratorInClosureAnalyzer.ForLoopAnalyzerState.IsIterator`. The candidate only changes the private iterator container, membership call and two existing add statements. Potential-iterator/all-variable lists, promotion branches and diagnostic-occurrence ordering remain untouched.',
'',
'The benchmark invokes the actual public in-tree analyzer through `CompilationWithAnalyzers`, using valid C# 13 compilations bound to actual `ComponentBase`, `RenderTreeBuilder` and `EventCallbackFactory` metadata. It consumes completed diagnostics, not a copied collection algorithm, fake symbol, seeded private state or injected callback.',
'',
'Five measured shapes: no-loop render override; one iterator/one callback; 16 nested iterators/16 callbacks/256 warnings; 64 nested iterators/32 callbacks/2048 warnings; and 64 non-render methods containing real loops/callback bindings. Nested inputs are scaling stressors, not production-frequency estimates.',
'',
'Both boundaries create a fresh analyzer driver. **WarmCompilation** reuses a warmed immutable compilation; **FreshCompilation** creates a new compilation/semantic state over reused parsed syntax and metadata. Parsing, reference creation, compiler-input validation and correctness oracles are outside timing. Measured driver mode is serial; ordinary/generated and serial/concurrent behavior are characterized separately.',
'',
'## All ten cases, all three comparisons',
'',
'Each slash-separated triple is comparisons 1/2/3. Time ratios are candidate/original: below 1 is faster. Negative allocation percentages mean fewer bytes. BDN-reported means use its default upper-outlier filtering; the adjacent column independently averages all eight raw WorkloadActual samples without that filtering or overhead subtraction. Full values, samples and case-specific data are in [analysis.json](analysis.json); all raw stages remain in the six console logs.',
'',
'| Shape / compilation | BDN time ratio 1/2/3 | All-eight actual time ratio 1/2/3 | Process-wide allocated change % 1/2/3 |',
'|---|---|---|---|'
];
for(const row of analysis.cases){
    const time=row.comparisons.map(value=>value.reportedTimeRatio.toFixed(3)).join(' / ');
    const actual=row.comparisons.map(value=>value.allEightActualTimeRatio.toFixed(3)).join(' / ');
    const bytes=row.comparisons.map(value=>value.allocatedChangePercent.toFixed(2)).join(' / ');
    lines.push(`| ${row.shape} / ${row.boundary==='WarmCompilation'?'warm':'fresh'} | ${time} | ${actual} | ${bytes} |`);
}
lines.push('',
'The positive allocation observations are real and retained: Nested16 is approximately 1.1-2.0% lower in every pair at both boundaries; Nested64 fresh is approximately 2.1-3.5% lower. However, the Nested64 warm allocation change ranges from 17.9% lower to 1.6% higher. NoLoops fresh BDN means are 3.2-7.0% slower and OneIterator warm 0.9-6.0% slower in all three pairs. These shared-machine observations are not proof of universal causal regressions, nor grounds for an overall speedup or build-time claim.',
'',
'BDN 0.13 uses process-wide `GC.GetTotalAllocatedBytes(precise: true)` when available on this pinned net12 runtime. Bytes include compiler/driver/async process work, not isolated private-set allocation. Allocation values are independently reconciled against raw GC totals/operation counts with midpoint-to-even rounding. [Source provenance](investigation/bdn-memory-accounting/provenance.json) explicitly reuses upstream source from F002 because the measured BDN DLL is byte-identical; it is not a new source fetch or delegate instrumentation.',
'',
'## Correctness, current main and validation boundary',
'',
'The original and candidate each passed all 20 exact source-defined `ForLoopIteratorInClosureAnalyzerTest` facts: 40 new passing rows, positive durations, unique result/definition/execution IDs, zero skips. No borrowed test rows. Existing coverage includes binding/ChildContent, promotion, local copies, nested control flow and same-name symbols.',
'',
'Each of original, candidate and the captured current-main analyzer class passed 72 full-owner sample/boundary checks: nine shapes, ordinary/generated input, serial/concurrent driver and warm/fresh compilation. These preserve exact BL0014 ID/severity/message/spans and include cached/unmutated negatives, later promotion and same-name distinct-symbol positives. There are 216 checks and 55,392 observed BL0014 diagnostics, not 216 additional permanent tests.',
'',
'Fresh current main was captured at `49147673007a4b1d676694e2c5f85b83ad76c36f`. The entire private membership-state class is unchanged there, but the owner has the adjacent `1cb49947` null-containing-namespace fix. The actual captured class was rebuilt through the unchanged shipping project in baseline context after checking all ten referenced project/API/BL0014 prerequisites. Its array-attribute control has no AD0001; original/candidate retain their pre-existing AD0001 on that excluded adjacent case. It is not credited as this optimization, silently fixed, or mislabeled a candidate regression. This is **selected current-class replay, not whole-current-default assembly/repository integration**.',
'',
'Components boundary: the owner is the compile-time analyzer; the real producer is Roslyn symbol/operation binding and operation-block scheduling; the final observable is BL0014 diagnostics plus full-owner resource observations; the permanent surface is the existing analyzer test class. A private-set-only test could miss actual compiler reachability. No renderer/DOM/browser behavior changes: Server/WebAssembly/Auto, Selenium, UI speed and browser/E2E claims are intentionally excluded.',
'',
'The shipping analyzer still builds for netstandard2.0 against its VS2019-compatible Roslyn assembly references. The actual benchmark/test host uses Roslyn 5.11 and net12; this is not measured VS2019/Roslyn3.3.1-host runtime performance. Production workload frequency, total project build-time benefit, all-TPA/native-runtime inventory and machine isolation are unverified boundaries.',
'',
'## Execution and independent audit',
'',
`Exactly **3/3 comparisons**, six ten-case profiles, ${audit.actualWorkloadIterations} raw actual iterations, ${audit.retainedResults} retained results, ${audit.filteredUpperSamples} filtered upper samples, ${audit.actualWarmups} warmups and ${audit.actualOverheadIterations} overhead samples. Comparison2 reverses image order. No fourth run or extra leaf benchmark was used.`,
'',
`The settings-preserving in-process emitted executor is an exact explicitly attributed copy from F002, not the historical stock priority-raising executor. Guid.Empty power plan is required. All ${audit.capturedSettingsRecords} before/after observations are Normal process priority, Normal thread priority and affinity65535. This is not a continuous OS trace or an isolated-machine claim; unrelated processes and system settings were not adjusted.`,
'',
'The independent live audit reconciles raw actual/overhead/result samples with exported statistics, retained sample membership, GC totals, both forms of ratios, exact TRX identities, compiler/source snapshots, current-class prerequisites and source restoration. It rehashed 294 physical frozen-image files across three 98-file images, 93 source snapshots, 20 actual PE/portable-PDB bindings and 38 document checks. PE/PDB identity is not method coverage or complete build provenance. Confidence bounds are checked for consistency, not independently recomputed critical quantiles.',
'',
'Preparation failures are retained: the initial whole-owner source guard; first harness build CS1061/CS0021 before adding ToArray; two current-context scope guards; and first independent-analysis statement-boundary assertion (`Iterators` versus `PotentialIterators`). Their exact source snapshots/inner logs/outcomes are included. Outer guard-console observations are explicitly labeled where no separate raw outer-console file was captured. No successful experiment was rerun to repair an analysis script.',
'',
'[measurement-audit.json](measurement-audit.json), [final-evaluation.json](final-evaluation.json), [measurement-budget.json](measurement-budget.json), [validation-commands.md](validation-commands.md), and the authoritative copy manifest identify exact evidence. Raw DLL/PDB/native images and binlogs are deliberately omitted from the public capsule; portable auditing checks copied evidence/self-consistency and cannot rehash those omitted bytes.',
'',
'## Reproduce the portable analysis or benchmark',
'',
'No package install or .NET runtime is required for the portable Node audit:',
'',
'```powershell',
'node .\\reproduce-analysis.mjs . --verify',
'```',
'',
'The runnable BDN project is [harness/AutoPerf.Benchmarks.csproj](harness/AutoPerf.Benchmarks.csproj). Frozen original/candidate harness and owner source, exact hashes, runtime/deps metadata, historical commands/results and the four-line patch are included. A fresh benchmark requires the matching baseline checkout, pinned SDK/runtime/packages and matching original or patched owner; activate from the repository root with `. .\\activate.ps1`, pass `-p:AspNetCoreRoot=C:\\src\\aspnetcore`, build Release with at most two nodes, then run with explicit new `--artifacts`, matching frozen `--sources`, `--context original` or `candidate-1`, and `--filter "*"`. Historical drivers intentionally refuse to overwrite completed outputs. The campaign budget is closed: these are reproduction instructions, not a claim that additional runs were made.',
'');
fs.writeFileSync(path.join(session,'F004-results-readme.md'),lines.join('\n'));
console.log('F004 exact no-net-win report rendered with all30 paired case outcomes/both statistics boundaries and limitations.');
