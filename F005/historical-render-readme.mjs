import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const session=path.dirname(fileURLToPath(import.meta.url)),run=path.join(session,'autoperf-runs','F005');
const read=name=>JSON.parse(fs.readFileSync(path.join(run,name),'utf8').replace(/^\uFEFF/,''));
const analysis=read('analysis.json'),audit=read('measurement-audit.json'),source=read('source-branch-publication.json');
assert.equal(audit.actualLiveAuditPassed,true);assert.equal(audit.exactHarnessControlledComparisons,2);
assert.equal(source.actualRemoteCanonicalBytesVerified,true);
const lines=[
'# F005: potential-loop-symbol membership - qualified allocation/scaling draft',
'',
'**Qualified trade-off proposal, not merge-ready or an established general speedup.** The four-line private-state candidate is retained in the independent fork source branch. In the two exact-harness controlled comparisons, the four large-promotion observations allocate 0.56-9.77% less process-wide. Small-target heap reversals, every control cost and high timing variability are retained. Production frequency and whole-build benefit are unknown.',
'',
`Source: [${source.branch}](https://github.com/jaslawinMs/aspnetcore/tree/${source.branch}), commit \`${source.commit}\`, one owner file/four existing lines, parent campaign baseline \`${source.parent}\`. Frozen binaries were built from baseline plus the recorded [patch](candidate.patch) **before** this source commit; they are not relabeled as built from the later commit. Actual fork ref and canonical source bytes were verified. Actual issue/draft/browser/publication identity is appended separately in [publication.json](publication.json).`,
'',
'## What changed and what produced the work',
'',
'F005 is `PotentialIterators.Any(SymbolEqualityComparer.Default.Equals(...))` in `ForLoopIteratorInClosureAnalyzer.ForLoopAnalyzerState.IsPotentialIterator`. The candidate uses a lazy nullable `HashSet<ILocalSymbol>` with `SymbolEqualityComparer.Default`, `Contains`, the existing guarded add and directly dependent `Remove` in place of `Where(...).ToList()` reconstruction. Both promotion callers are membership-guarded; the potential container has no ordering consumer. Iterators (F004), AllForVariables (F006), promotion branches, occurrence storage and diagnostic order remain unchanged. No public API/default/diagnostic/dependency/TFM/visibility change or new shipping test is included.',
'',
'Ordinary `for (int i = 0; ...; i++)` puts `i` in Iterators and short-circuits the potential add: it is **not** evidence of a growing potential list. The actual producer here is valid Roslyn `IForLoopOperation` binding with additional unincremented declarators: `for (int i = 0, p0 = 0, p1 = 0, ...; i < 3; i++)`. Actual callback bindings reference those real locals; real `p++`, `p += 1` or `p = 4` operations promote selected symbols. There is no fake symbol, seeded private collection, injected producer callback or copied list microbenchmark.',
'',
'The actual public in-tree analyzer runs through `CompilationWithAnalyzers` against actual `ComponentBase`, `RenderTreeBuilder` and `EventCallbackFactory` metadata. Producer proofs record actual loop/declarator counts, bottom-incremented versus potential symbols, distinct declaration spans and actual mutation targets. Completed exact BL0014 diagnostics and full-driver resources are the observed boundary.',
'',
'Potential16/64 have one loop, i plus 16/64 unincremented p locals and two callbacks; only i warns. Promoted16/64 mutate all p locals through alternating increment/compound assignment, repeat two mutations after removal, then bind another callback: 33/129 warnings and 18/66 potential-target mutation operations. Promoted/Unmutated exercise a real single potential local. NoLoops, canonical OneIterator and 64-method NonRender are controls. Sixteen/64 potential locals are scaling stressors, not production-frequency estimates.',
'',
'Both timed boundaries create a fresh serial analyzer driver. WarmCompilation reuses a warmed immutable compilation; FreshCompilation creates new compilation/semantic state over reused syntax and metadata. Parsing, references, compiler validation and correctness oracles are outside timing. Ordinary/generated and serial/concurrent behavior are characterized separately.',
'',
'## Binary identity and the closed three-comparison budget',
'',
'**Three comparison slots were spent, but only comparisons 2/3 are exact-harness owner comparisons.** Comparison1 ran seven shapes x two boundaries (14 cases/role); the independent audit found byte-different harness DLL/PDBs despite identical source. Those 28 reports are exploratory, not proof of isolated owner causality. No method-IL or full semantic binary-equivalence claim is made. Their actual hashes/differences are in [harness-identity-observation.json](harness-identity-observation.json).',
'',
'After comparison1, canonical OneIterator was correctly recognized as missing single-potential timing. The already-characterized Promoted/Unmutated shapes were added to a separate 18-case harness for comparisons2/3 without changing CompilerSamples or the four-line source candidate. Version2 was compiled once, then paired with the exact previously tested/frozen original and candidate owner DLL/PDBs. The two version2 images differ **only** in the actual owner DLL/PDB; their harness DLL/PDB and every other image byte are identical. Each role retains all non-harness bytes from its earlier image. This supplies 72 controlled reports, not a fictional third 18-case comparison.',
'',
'Comparison order is original/candidate, candidate/original, original/candidate. No fourth comparison, extra leaf benchmark or experiment rerun repaired an audit failure. [measurement-budget.json](measurement-budget.json) is permanently closed at 3/3.',
'',
'## All recorded outcomes, including contrary cases',
'',
'Columns are exploratory1 / controlled2 / controlled3. Ratios are candidate/original (below1 is faster); negative allocation means fewer bytes. A dash means not timed. BDN means retain its default upper-outlier filtering; the adjacent ratio independently uses all eight raw WorkloadActual samples without filtering or overhead subtraction. Full values and samples remain in [analysis.json](analysis.json), six raw console logs and all 100 report exports.',
'',
'| Shape / compilation | BDN time E1 / C2 / C3 | All-eight actual E1 / C2 / C3 | Process-wide allocated change % E1 / C2 / C3 |',
'|---|---|---|---|'
];
for(const row of analysis.cases){
    const format=field=>[1,2,3].map(id=>{
        const found=row.comparisons.find(value=>value.comparison===id);
        return found?found[field].toFixed(field==='allocatedChangePercent'?2:3):'-';
    }).join(' / ');
    lines.push(`| ${row.shape} / ${row.boundary==='WarmCompilation'?'warm':'fresh'} | ${format('reportedTimeRatio')} | ${format('allEightActualTimeRatio')} | ${format('allocatedChangePercent')} |`);
}
lines.push('',
'Controlled Promoted64 warm bytes/op are 649273 -> 585817 and 620368 -> 615701; fresh are 841012 -> 777596 and 812061 -> 807474. **Do not advertise a stable 38KB/63KB saving**: the final comparison saves only about4.6KB. Its four controlled BDN timing ratios are approximately0.959/0.954 warm and0.989/0.977 fresh; these observations do not establish a causal general analyzer/compiler speedup.',
'',
'All four true single-potential cases allocate less in comparison2 but **more** in comparison3. Promoted16 fresh comparison3 allocates0.22% more. NonRender BDN times are slower at both boundaries in all three recorded comparisons; controlled comparison2 fresh is24.8% slower with candidateCV18.2%. Canonical OneIterator moves20% faster in comparison3 despite not exercising potential-list growth. Maximum timingCV is19.8874%. These controls and process-wide heap movement prevent a universal improvement, stable-byte-saving or build-throughput claim.',
'',
'BDN0.13 on this pinned net12 runtime uses reflected `GC.GetTotalAllocatedBytes(precise:true)`. Bytes include compiler/driver/process-worker activity, not isolated set allocation. Raw GC totals/operation counts and midpoint-to-even B/op rounding are reconciled independently. [GcStats source provenance](investigation/bdn-memory-accounting/provenance.json) explicitly borrows source from F002 because all five actual BDN DLLs are byte-identical; it is not a fresh source fetch, direct delegate instrumentation or independent assembly-to-source binding.',
'',
'## Correctness, current main and excluded boundaries',
'',
'Original/candidate each passed all20 exact source-defined `ForLoopIteratorInClosureAnalyzerTest` Facts:40 fresh rows with unique definition/result/execution IDs, positive durations and zero skips. Version2 reuses those same owners and test evidence; it does not invent40 more test executions.',
'',
'Each of five frozen images passed112 checks:14 characterization shapes x ordinary/generated x serial/concurrent x warm/fresh. Total560 compiler checks and7040 exact BL0014 ID/severity/message/span observations. Each image includes57 producer records (56 normal plus the explicitly separate adjacent array control). PartialPromotion changes only two of four potentials; AssignmentPromotion uses actual simple assignment; SiblingPotentialSymbols promotes only the first of two same-name locals with different declaring spans. Cached/unmutated negatives and original binding/ChildContent/nested/local-copy controls remain included.',
'',
'Fresh current main was captured at `49147673007a4b1d676694e2c5f85b83ad76c36f`. All selected private state is unchanged there; the owner differs by the adjacent null-containing-namespace fix from dotnet/aspnetcore#70525. The actual captured class was rebuilt through the baseline shipping project after ten referenced project/API/BL0014 prerequisite checks. Its adjacent array control has no AD0001; original/candidate retain the existing AD0001 on that excluded control. The null fix was not transplanted or credited to F005. This is **selected current-class replay, not whole-current-default integration**.',
'',
'The permanent owning surface remains the existing analyzer test class; standalone compiler samples accompany the benchmark capsule rather than adding shipping tests. Real compiler binding/scheduling and observable diagnostics establish this compile-time analyzer boundary. No renderer/DOM/browser behavior changes: Server/WebAssembly/Auto, Selenium, UI speed and browser E2E are intentionally excluded.',
'',
'Shipping remains netstandard2.0 with the old VS2019-compatible Roslyn assembly references. This host uses Roslyn5.11 and net12, not measured VS2019/Roslyn3.3.1 host performance. Real Razor generation, production potential-list frequency, total project-build gain, all-TPA/native/SDK inventory and isolation remain unverified.',
'',
'## Execution, independent audit and preserved failures',
'',
`Exactly100 reports:800 raw actual iterations,765 retained results,35 upper-filtered samples,300 warmups and1999 actual overhead samples. The original comparison3 NoLoops/warm log has19 overhead samples, not an assumed20; all others have20. Source candidate is identical across all comparisons.`,
'',
`The settings-preserving emitted executor is explicitly attributed to F002, not the historical stock priority-raising executor. Guid.Empty power plan is required. All200 before/after observations are Normal process priority, Normal thread priority and affinity65535. This is a shared Windows VM, not a continuously observed or isolated host. No machine power/priority/affinity setting or unrelated process was adjusted.`,
'',
`The passed live independent audit rehashed490 physical image files (five98-file images) and155 source snapshots, reconciled40 exact TRX rows/560 compiler checks,26 PE/PDB bindings/48 source-document checks, raw/retained/overhead samples, GC rounding, sample statistics/R7 quantiles, reported confidence-bound arithmetic and both ratio forms. PE/PDB association is not method coverage or full build/SDK provenance. Confidence critical quantiles are not independently recomputed.`,
'',
'All builds and characterizations passed their first attempts. A read-only PowerShell result-inspection parser error is preserved without rerunning measurements. Audit attempt1 repaired manifest-population ordering in the auditor only. Attempt2 exposed the real first-pair harness-identity limitation and stopped; that comparison remains exploratory. Attempt3 exposed the auditor assumption of20 overhead samples, while the actual extracted analysis already correctly recorded1999. Attempt4 passed. Their actual source/log/exit records are included; no raw successful evidence was rewritten.',
'',
'The historical [pre-audit decision](final-evaluation.json) remains unchanged, including its then-pending status. [post-audit-decision.json](post-audit-decision.json) and [measurement-audit.json](measurement-audit.json) resolve the audit findings and restrict the proposal to the two exact-harness comparisons. Publisher/driver sources are included for reproducibility; execution records, not the presence of a script, identify what actually ran.',
'',
'[validation-commands.md](validation-commands.md), the authoritative copy manifest and raw-copy verification identify exact commands/results and byte-preserved evidence. DLL/PDB/native images and binlogs are deliberately omitted publicly. The copied portable audit checks source/TRX/compiler/log/PDB-witness/statistical consistency and cannot rehash those omitted bytes.',
'',
'## Reproduce analysis or the standalone benchmark',
'',
'Portable Node audit (no .NET runtime or package install needed):',
'',
'```powershell',
'node .\\reproduce-analysis.mjs . --verify',
'```',
'',
'The initial project is [harness/AutoPerf.Benchmarks.csproj](harness/AutoPerf.Benchmarks.csproj); the controlled/single-potential timing project is [harness-small-controls/AutoPerf.Benchmarks.csproj](harness-small-controls/AutoPerf.Benchmarks.csproj). Frozen sources, actual input files, metadata, source patch and exact historical commands/results are included. A fresh reproduction requires the matching baseline checkout, pinned SDK/runtime/packages and matching original/patched owner. Activate from repository root with `. .\\activate.ps1`, pass `-p:AspNetCoreRoot=C:\\src\\aspnetcore`, build Release with at most two nodes and use new explicit artifact paths, the matching frozen `--sources`, image `--context` and `--filter "*"`. To isolate the owner, compile the chosen harness once and substitute only the same-identity original/candidate owner DLL/PDB as in controlled comparisons2/3. Historical drivers refuse overwrite. These are reproduction instructions, **not additional campaign runs**.',
'');
fs.writeFileSync(path.join(session,'F005-results-readme.md'),lines.join('\n'));
console.log('F005 qualified report rendered:18 cases,all100 reports,two exact-harness comparisons and all contrary evidence disclosed.');
