import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const session=path.dirname(fileURLToPath(import.meta.url)),run=path.join(session,'autoperf-runs','F006');
const read=name=>JSON.parse(fs.readFileSync(path.join(run,name),'utf8').replace(/^\uFEFF/,''));
const analysis=read('analysis.json'),audit=read('measurement-audit.json'),source=read('source-branch-publication.json');
const restored=read('source-restoration.json'),evaluation=read('final-evaluation.json');
assert(audit.actualLiveAuditPassed&&!audit.performancePrJustified&&restored.sourceByteExact&&restored.restoredOwnerDllAndPdbByteExact);
assert(source.actualRemoteRefVerified&&source.actualRemoteCanonicalSourceVerified&&!source.sourceChanged);
const lines=[
'# F006: for-variable symbol membership - conservative no-gain trade-off',
'',
'**No generalized optimization PR: net benefit is not established. This does not mean every local case failed to improve.** The real miss-heavy Cached64 stressor is repeatedly about2-3% faster with less process-wide allocation, but Potential16/64 are slower in11/12 outcomes and promotion cases allocate more in8/12. The production workload mix is unknown; synthetic cases are not averaged into a claimed production result. All five candidate statements and the original owner DLL/PDB were restored byte-exact.',
'',
`The independent [fork branch](https://github.com/jaslawinMs/aspnetcore/tree/${source.branch}) retains unchanged campaign baseline \`${source.commit}\`; its actual remote ref and canonical source were verified. No new source commit, empty draft or speculative performance PR was created. The actual built/tested/measured five-statement candidate remains in [candidate.patch](candidate.patch) and frozen candidate sources, not in shipping code. Final verified publication identity is appended separately in [publication.json](publication.json).`,
'',
'## Exact seam and actual producer',
'',
'The finding is the `AllForVariables.Any(forVariable => SymbolEqualityComparer.Default.Equals(forVariable, variableReference.Local))` predicate in `ForLoopIteratorInClosureAnalyzer.ForLoopAnalyzerState.AddRelatedOccurrences`, not an `IsForVariable` method. The attempted candidate uses a lazy nullable comparer-backed `HashSet<ILocalSymbol>`, the directly dependent count guard and two existing adds, and `Contains`: exactly five existing source statements. Iterators (F004), PotentialIterators (F005), promotion branches, occurrence storage and diagnostic order remain unchanged. No externally exposed API/default/dependency/TFM/visibility or permanent-test change was proposed.',
'',
'Actual `IForLoopOperation` declarations populate the state. The real analyzer branch binds `RenderTreeBuilder.AddAttribute` and an `EventCallbackFactory` delegate, then traverses real `ILocalReferenceOperation` descendants. `CompilerSamples` validates the actual component override, callback binding, enclosing method, symbol identity/declaration spans and membership status before timing. No fake symbols, seeded private collection, injected producer event or copied collection-only microbenchmark is used.',
'',
'**An absent diagnostic is not proof of a membership miss.** Potential64 has65 tracked for-locals and65 membership hits, although only i warns. Unmutated has one tracked hit but no warning. Cached references a non-for copy and produces one genuine miss. Cached64 declares i plus64 unincremented potential locals, copies those64 locals inside the loop, and binds two callbacks:65 actual related-reference candidates, one tracked hit and64 non-for-variable misses; only i warns. NonRender has64 compiler-bound callbacks outside the render override and zero eligible membership candidates.',
'',
'Potential16/64 and Promoted16/64 have one loop with16/64 additional potential locals. Real increment/compound/simple-assignment operations promote selected symbols. SiblingSymbols, SiblingPotentialSymbols, PartialPromotion and AssignmentPromotion characterize symbol scope and promotion correctness. Cached64 is deliberately miss-heavy scaling stress, not an observed production distribution.',
'',
'Both timed boundaries create a fresh serial analyzer driver and await completed actual diagnostics through `CompilationWithAnalyzers`, using actual in-tree ComponentBase/RenderTreeBuilder/EventCallbackFactory metadata. WarmCompilation reuses a warmed immutable compilation; FreshCompilation creates new compilation/semantic state over reused syntax/metadata. Input generation, parsing, references, compiler validation and the diagnostic oracle are outside timing. Ordinary/generated and serial/concurrent behavior are characterized separately.',
'',
'## One exact harness, three closed comparisons',
'',
'The22-case standalone harness was compiled **once against the original owner** before candidate implementation. Original, candidate and captured-current-class images share the exact same harness DLL/PDB and every other nonowner image byte. The only two changed image files are the actual same-identity owner DLL/PDB. Each image has98 files and31 frozen source snapshots. This identity was checked physically before/after each profile, starting in comparison1; there is no exploratory different-harness pair or later harness correction.',
'',
'Exactly three fixed22-case comparisons ran: original/candidate, candidate/original, original/candidate. All11 shapes were timed at both boundaries in every pair. The source candidate did not change. [measurement-budget.json](measurement-budget.json) is permanently closed3/3; no fourth comparison, extra leaf profile, validation rerun for statistics, OS setting change or unrelated-process termination was performed.',
'',
'## Every recorded outcome',
'',
'Columns are comparison1 /2 /3. Ratios are candidate/original; below1 is faster. Negative allocation percentages mean fewer process-wide bytes. BDN means retain default upper-outlier filtering; the adjacent ratio uses all eight actual samples without filtering or overhead subtraction. Full unrounded rows, raw measurements, JSON/CSV/HTML reports and console stages remain in [analysis.json](analysis.json) and six profile directories.',
'',
'| Shape / compilation | BDN time1 /2 /3 | All-eight actual1 /2 /3 | Process-wide allocated change %1 /2 /3 |',
'|---|---|---|---|'
];
for(const row of analysis.cases){
    const format=field=>row.comparisons.map(value=>value[field].toFixed(field==='allocatedChangePercent'?2:3)).join(' / ');
    lines.push(`| ${row.shape} / ${row.boundary==='WarmCompilation'?'warm':'fresh'} | ${format('reportedTimeRatio')} | ${format('allEightActualTimeRatio')} | ${format('allocatedChangePercent')} |`);
}
lines.push('',
`Cached64 has lower BDN and all-eight raw timing ratios and lower heap in all six outcomes: BDN reductions${evaluation.cached64MinimumBdnReductionPercent.toFixed(2)}-${evaluation.cached64MaximumBdnReductionPercent.toFixed(2)}%, process-wide allocation reductions${evaluation.cached64MinimumProcessAllocatedReductionPercent.toFixed(2)}-${evaluation.cached64MaximumProcessAllocatedReductionPercent.toFixed(2)}%. Warm bytes/op are477526->473547,478438->474591,477936->473745; fresh669363->665492,670363->666413,669765->665565. These specific local observations are retained,not relabeled zero improvement.`,
'',
'The contrary evidence blocks a general proposal: Potential16 is slower in all six outcomes; Potential64 is slower in five of six, including all three fresh cases (about11-24% slower), despite lower allocations. Promoted16 is slower in five of six and its heap increases in four; Promoted64 heap increases in both boundaries in comparisons2/3. Small-potential heap reversals and every other control/non-win remain in the table.',
'',
`NoLoops fresh changes from about29.7% faster in comparison2 to47.1% slower in3; warm also reverses. This constructor/lazy-allocation control is not claimed to be untouched source or proof of the cause of the timing variation. Maximum caseCV is${audit.maximumCvPercent.toFixed(4)}%. A small repeatable miss-heavy win,large contrary observations and unknown production frequency do not establish a generalized analyzer/compiler/build-throughput benefit on this shared host.`,
'',
'BDN0.13 on this pinned net12 runtime uses reflected `GC.GetTotalAllocatedBytes(precise:true)`. Bytes include compiler/driver/process-worker activity, not isolated set allocation. The audit reconciles raw GC totals/operation counts and midpoint-to-even B/op rounding. [Accounting provenance](investigation/bdn-memory-accounting/provenance.json) explicitly attributes the upstream GcStats source to F002 because all three actual BDN DLLs are byte-identical; this is not a fresh source fetch, direct delegate instrumentation or independent assembly/source binding.',
'',
'## Correctness, current main and excluded boundaries',
'',
'Original/candidate each freshly rebuilt the shipping owner and owning test project and passed all20 source-defined `ForLoopIteratorInClosureAnalyzerTest` Facts:40 rows with unique result/definition/execution identities, positive durations and zero skips. Existing stub-framework tests are distinct from the real-framework-metadata compiler checks. This is behavior-preserving performance characterization,not a bug-fix red/green claim.',
'',
'Each of the three images passed120 checks:15 shapes x ordinary/generated x serial/concurrent x warm/fresh. Total360 checks and4248 exact BL0014 ID/severity/message/span observations. Characterization retains61 producer records/image (60 normal plus one separate adjacent array control); timing records22 normal proofs/profile. The independent audit reconciles312 normal real-compiler producer proofs and their source input hashes,including actual hits versus misses.',
'',
'Current default was freshly captured at `49147673007a4b1d676694e2c5f85b83ad76c36f`. The entire selected private state is unchanged there. Its owner differs only in the adjacent null-containing-namespace fix from dotnet/aspnetcore#70525. The actual captured class was rebuilt through the baseline shipping project after ten referenced project/API/BL0014 prerequisite checks,paired with the exact original harness,and passed120 new-input checks. Its adjacent array control has no AD0001; original/candidate retain the existing AD0001 there. That null fix was not transplanted or credited to F006. This is **selected current-class replay,not whole-current-default integration**.',
'',
'Shipping remains netstandard2.0 with VS2019-compatible old Roslyn references; this host uses net12/Roslyn5.11,not measured Roslyn3.3.1 host performance. Real Razor generation,production frequencies,total project-build gain,full native/SDK/all-TPA provenance and machine isolation are unverified. No renderer/DOM/browser behavior changes are proposed; Server/WebAssembly/Auto,UI performance and browser E2E are intentionally outside this compile-time analyzer boundary.',
'',
'## Independent audit,restoration and provenance limits',
'',
`All builds,owning tests,characterizations,profiles and the first independent live audit passed. Actual totals:132 reports,1056 raw actual iterations,1014 retained results,42 upper-filtered samples,396 warmups and2635 overhead samples. Overhead counts are derived from the logs,not assumed20/report: ${Object.entries(audit.overheadCountDistribution).map(([count,reports])=>`${reports} reports have${count}`).join('; ')}.`,
'',
'The live audit rehashed294 physical image files and93 source snapshots; reconciled40 TRX rows,360 compiler checks,312 normal producer proofs,20 PE/PDB bindings/38 source documents,264 unchanged before/after settings observations,raw/retained/overhead correspondence,GC rounding,sample statistics/R7 quantiles,recorded confidence-bound arithmetic and both ratio forms. Confidence critical quantiles are not independently recomputed. Source/PDB association is not method coverage or complete build/SDK provenance.',
'',
'The settings-preserving emitted executor is explicitly attributed to F002. Guid.Empty power plan is required;captured before/after process/thread priorities are Normal and affinity65535. This is not a continuously observed or isolated machine. No machine power/priority/affinity setting or unrelated process was adjusted.',
'',
'[source-restoration.json](source-restoration.json) verifies exact original source bytes and freshly rebuilt original DLL/PDB bytes after reverting only the five candidate statements. Tracked source is clean;unrelated untracked reports were preserved. The measured candidate remains frozen in the capsule. The historical [pre-audit evaluation](final-evaluation.json) retains its then-pending status;[post-audit-decision.json](post-audit-decision.json) resolves the audit/restoration and recommends no-gain. The final receipt resolves actual publication persistence.',
'',
'[validation-commands.md](validation-commands.md) lists exact recorded commands and observed exit results. Historical source and execution records are included;the presence of a driver is not evidence that every branch was executed. The authoritative copy manifest and raw-copy verification identify byte-preserved files. DLL/PDB/native images and binlogs are deliberately omitted publicly. The copied portable audit checks source/TRX/compiler/log/PDB-witness/statistical consistency,but cannot rehash those omitted bytes.',
'',
'## Reproduce the analysis or benchmark',
'',
'Portable Node audit,no package install or .NET runtime needed:',
'',
'```powershell',
'node .\\reproduce-analysis.mjs . --verify',
'```',
'',
'The standalone [harness project](harness/AutoPerf.Benchmarks.csproj) pins net12,C#13,BDN0.13 and the captured Roslyn host. Reproduction requires the matching baseline checkout,SDK/runtime and packages. Activate from repository root with `. .\\activate.ps1`,build Release with at most two nodes and `-p:AspNetCoreRoot=C:\\src\\aspnetcore`. Compile the harness once against original;clone the image and substitute only the same-identity candidate owner DLL/PDB from baseline plus the archived patch. Do not separately compile a candidate harness and call equal source identical executable evidence. Pass a new absolute `--artifacts` path,the matching frozen `--sources`,explicit `--context` and `--filter "*"`. Historical drivers refuse overwrite. These are reproduction instructions,not additional authorized campaign runs.',
'');
fs.writeFileSync(path.join(session,'F006-results-readme.md'),lines.join('\n'));
console.log('F006 no-gain report rendered:all22 cases/132 reports,repeatable local wins and contrary trade-offs retained;source/owner restored,no PR.');
