import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const session=path.dirname(fileURLToPath(import.meta.url)),root=String.raw`C:\src\aspnetcore`,run=path.join(session,'autoperf-runs','F004');
const baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5',branch='autoperf/F004-loop-iterator-symbol-membership';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const canonical=bytes=>Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n'));
assert(!fs.existsSync(path.join(run,'current-source-investigation.json')));
const first=read(path.join(run,'investigation','execution.json'));assert(first.commands.every(row=>row.actualExitCode===0));
const current=fs.readFileSync(path.join(run,'investigation','default-ref.stdout'),'utf8').trim();
assert.equal(current,'49147673007a4b1d676694e2c5f85b83ad76c36f');
const owner=String.raw`src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs`;
const original=canonical(fs.readFileSync(path.join(run,'baseline-canonical',owner))).toString();
const fresh=canonical(fs.readFileSync(path.join(run,'current-default-canonical',owner))).toString();
const oldExpression='conversionOperation.Operand.Type.ContainingNamespace.ToString().StartsWith(ComponentsApi.AssemblyName, StringComparison.Ordinal)';
const newExpression='conversionOperation.Operand.Type.ContainingNamespace?.ToString().StartsWith(ComponentsApi.AssemblyName, StringComparison.Ordinal) == true';
assert.equal(original.split(oldExpression).length,2);assert.equal(original.replace(oldExpression,newExpression),fresh);
const marker='    private sealed class ForLoopAnalyzerState';
const originalState=original.slice(original.indexOf(marker)),freshState=fresh.slice(fresh.indexOf(marker));
assert(originalState.length>2000);assert.equal(originalState,freshState);
const directory=path.join(run,'investigation-completion');fs.mkdirSync(directory);
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(directory,'executed-source.mjs'));
const commands=[];
function capture(entryPoint,args,label){
    const result=spawnSync(entryPoint,args,{cwd:root,maxBuffer:32*1024*1024});
    fs.writeFileSync(path.join(directory,label+'.stdout'),result.stdout??Buffer.alloc(0));
    fs.writeFileSync(path.join(directory,label+'.stderr'),result.stderr??Buffer.alloc(0));
    commands.push({entryPoint,arguments:args,actualExitCode:result.status,label});
    fs.writeFileSync(path.join(directory,'execution.json'),JSON.stringify({candidate:'F004',commands},null,2)+'\n');
    assert.equal(result.status,0,label+':'+result.stderr?.toString());
    return result.stdout;
}
assert.equal(capture('git',['branch','--show-current'],'current-branch').toString().trim(),branch);
assert.equal(capture('git',['rev-parse','HEAD'],'current-head').toString().trim(),baseline);
assert.equal(capture('git',['diff','--name-only'],'tracked-diff').length,0);
const files=fs.readdirSync(path.join(run,'investigation')).filter(name=>/^baseline-source-\d+\.stdout$/.test(name))
    .map(name=>first.commands.find(row=>row.label===name.slice(0,-7)).arguments[1].slice(baseline.length+1).replaceAll('/','\\'));
const sources=files.map(file=>{
    const before=fs.readFileSync(path.join(run,'baseline-canonical',file));
    const after=fs.readFileSync(path.join(run,'current-default-canonical',file));
    const working=fs.readFileSync(path.join(run,'producer-source',file));
    assert(canonical(before).equals(canonical(working)));
    return {file,baselineSha256:hash(before),currentDefaultSha256:hash(after),workingSha256:hash(working),
        baselineAndDefaultEquivalent:canonical(before).equals(canonical(after)),workingEqualsBaseline:true};
});
assert.equal(sources.length,7);
capture('git',['--no-pager','diff',baseline,current,'--',owner],'exact-default-owner-delta');
capture('git',['log',current,'--follow','--format=%H %ad %s','--date=iso-strict','--',owner],'current-default-owner-history');
for(const commit of ['70a531e2fccbd0d22f049e968604e3d62acc9558','cf0040c17ca3f506240b60ca4fc9219684a73302','1cb499475ebef1d44f9ab85a9f9fdc266a891a1d'])
    capture('git',['--no-pager','show',commit,'--',owner],'history-'+commit.slice(0,8));
capture('gh',['api','repos/dotnet/aspnetcore/pulls/67228'],'original-feature-pr');
capture('gh',['api','repos/dotnet/aspnetcore/issues/65234'],'original-feature-issue');
capture('gh',['search','code','ForLoopIteratorInClosureAnalyzer','--repo','dotnet/aspnetcore','--limit','10','--json','path'],'actual-test-source-lookup');
capture('gh',['search','prs','ForLoopIteratorInClosureAnalyzer','--repo','dotnet/aspnetcore','--limit','10','--json','number,title,state,url'],'related-work-bounded-query');
const consultedGuidance=[String.raw`src\Components\AGENTS.md`,String.raw`.github\instructions\components.instructions.md`,
    String.raw`docs\CrossCuttingGuidance.md`,String.raw`docs\BlazorComponentsGuidance.md`,String.raw`docs\BuildFromSource.md`]
    .map(file=>({file,sha256:hash(fs.readFileSync(path.join(root,file)))}));
fs.writeFileSync(path.join(run,'investigation','initial-guard-failure-observation.json'),JSON.stringify({
    candidate:'F004',entryPoint:'node',arguments:[path.join(session,'F004-investigate.mjs')],observedActualExitCode:1,
    observedError:'AssertionError:Target changed on current default;characterize before proposing a baseline-only fix.',
    failurePoint:'F004-investigate.mjs:54,after7 complete raw source triples,before history/final metadata/budget/ledger update.',
    actualToolConsoleObserved:true,separateOuterConsoleFileCaptured:false,notRelabeledAsRawStderrCapture:true,
    successfulSourceCommandsNotRepeated:true,shippingEditsOrMeasurementsBeforeFailure:false,
    resolution:'Exact whole-owner delta independently narrowed to one null-containing-namespace fix in AnalyzeInvocation;entire private membership-state class is canonical byte-identical. Do not silently call whole owner/default integration equivalent.'
},null,2)+'\n');
fs.writeFileSync(path.join(run,'current-source-investigation.json'),JSON.stringify({
    candidate:'F004',baseline,branch,currentDefault:current,currentDefaultCapturedAt:new Date().toISOString(),
    scopedSourceFiles:sources.length,currentDefaultEquivalentFiles:sources.filter(row=>row.baselineAndDefaultEquivalent).length,sources,
    shippingSourceChanged:false,currentDefaultFullIntegrationExecuted:false,sourceComparisons:0,
    selectedMembershipStateCanonicalEqual:true,selectedMembershipStateSha256:hash(Buffer.from(originalState)),
    exactDefaultOwnerDelta:{commit:'1cb499475ebef1d44f9ab85a9f9fdc266a891a1d',before:oldExpression,after:newExpression,
        site:'AnalyzeInvocation conversion operand null containing namespace',notMembershipFix:true,fullOwnerCanonicalEqual:false},
    observedSourceBoundary:'Iterators has4 local LSP property references,declaration/IsIterator/AddIterator/OnPotentialIteratorChanged;no enumeration consumer observed. F005/F006 lists and occurrence ordering unchanged by the proposed scope.',
    codeIntelligence:'GitHub semantic tool actual repository HTTP404. Targeted actual GitHub code lookup and known-file source used;LSP property references returned274/286/298/317. Empty probes are not graph-completeness evidence.',
    consultedGuidance,
    prototypeProposal:'Lazy SymbolEqualityComparer.Default-backed private iterator set;not implemented,not a verified gain.',
    priorWork:'F103 same project finalized independently;fresh owner required because its same-assembly StateHasChanged proposal must not contaminate baseline.',
    componentsBoundary:'Compiler-owned performance-only change;actual CSharp compiler samples/real Roslyn driver/actual component metadata/exact existing20 tests. No runtime/browser/Server-Wasm-Auto behavior claim.',
    initialWholeOwnerEqualityGuardFailurePreserved:true,
    limitation:'The selected state/cost path is source-identical on fresh current default;not whole-default executable/integration verification. Its pre-existing adjacent null-namespace fix is preserved as an explicitly different boundary,not transplanted or credited as this optimization.'
},null,2)+'\n');
fs.writeFileSync(path.join(run,'measurement-budget.json'),JSON.stringify({
    candidate:'F004',maximumComparisons:3,usedComparisons:0,originalProfiles:0,candidateProfiles:0,sourceShapesMeasured:0,closed:false
},null,2)+'\n');
console.log(`F004:7 source triples,${sources.filter(row=>row.baselineAndDefaultEquivalent).length} fully equal;entire selected membership state identical;exact adjacent current-default null fix/history preserved. No shipping edit/profile.`);
