import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const session=path.dirname(fileURLToPath(import.meta.url)),root=String.raw`C:\src\aspnetcore`;
const run=path.join(session,'autoperf-runs','F006'),directory=path.join(run,'investigation');
const baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5',branch='autoperf/F006-for-variable-symbol-membership';
assert(!fs.existsSync(run),'Refusing to overwrite an actual investigation.');
fs.mkdirSync(directory,{recursive:true});
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(directory,'executed-source.mjs'));
fs.copyFileSync(path.join(session,'F006-acceptance.json'),path.join(run,'acceptance.json'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const canonical=bytes=>Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n'));
const commands=[];
function capture(entryPoint,args,label){
    const result=spawnSync(entryPoint,args,{cwd:root,maxBuffer:32*1024*1024,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
    fs.writeFileSync(path.join(directory,label+'.stdout'),result.stdout??Buffer.alloc(0));
    fs.writeFileSync(path.join(directory,label+'.stderr'),result.stderr??Buffer.alloc(0));
    commands.push({entryPoint,arguments:args,actualExitCode:result.status,label});
    fs.writeFileSync(path.join(directory,'execution.json'),JSON.stringify({candidate:'F006',commands},null,2)+'\n');
    assert.equal(result.status,0,label+':'+result.stderr?.toString());
    return result.stdout;
}
assert.equal(capture('git',['rev-parse','HEAD'],'working-head').toString().trim(),baseline);
assert.equal(capture('git',['branch','--show-current'],'independent-branch').toString().trim(),branch);
assert.equal(capture('git',['diff','--name-only'],'working-tracked-diff').length,0);
assert.equal(capture('git',['diff','--cached','--name-only'],'working-staged-diff').length,0);
capture('git',['status','--porcelain'],'working-status');
assert.match(capture('git',['remote','get-url','origin'],'upstream-url').toString().trim(),/^https:\/\/github\.com\/dotnet\/aspnetcore(?:\.git)?$/i);
const defaultBranch=capture('gh',['api','repos/dotnet/aspnetcore','--jq','.default_branch'],'default-branch').toString().trim();
assert.equal(defaultBranch,'main');
const current=capture('gh',['api',`repos/dotnet/aspnetcore/commits/${defaultBranch}`,'--jq','.sha'],'default-ref').toString().trim();
assert.match(current,/^[a-f0-9]{40}$/);
capture('git',['fetch','--quiet','--no-tags','origin',defaultBranch],'fetch-current-default');
capture('git',['cat-file','-t',current],'default-commit-present');
const owner=String.raw`src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs`;
const files=[owner,...['ComponentsApi.cs','DiagnosticDescriptors.cs','Resources.resx','Microsoft.AspNetCore.Components.Analyzers.csproj']
    .map(name=>path.win32.join('src','Components','Analyzers','src',name)),
    ...['ForLoopIteratorInClosureAnalyzerTest.cs','Microsoft.AspNetCore.Components.Analyzers.Tests.csproj']
    .map(name=>path.win32.join('src','Components','Analyzers','test',name))];
const sources=files.map((file,index)=>{
    const gitPath=file.replaceAll('\\','/');
    const before=capture('git',['show',`${baseline}:${gitPath}`],`baseline-source-${index}`);
    const after=capture('git',['show',`${current}:${gitPath}`],`default-source-${index}`);
    const working=fs.readFileSync(path.join(root,file));
    assert(canonical(before).equals(canonical(working)),'Working source is not independent original:'+file);
    for(const [name,bytes] of [['baseline-canonical',before],['current-default-canonical',after],['producer-source',working]]){
        const output=path.join(run,name,file);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,bytes);
    }
    return {file,baselineSha256:hash(before),currentDefaultSha256:hash(after),workingSha256:hash(working),
        baselineAndDefaultEquivalent:canonical(before).equals(canonical(after)),workingEqualsBaseline:true};
});
const original=canonical(fs.readFileSync(path.join(run,'baseline-canonical',owner))).toString();
const fresh=canonical(fs.readFileSync(path.join(run,'current-default-canonical',owner))).toString();
const marker='    private sealed class ForLoopAnalyzerState';
const originalState=original.slice(original.indexOf(marker)),freshState=fresh.slice(fresh.indexOf(marker));
assert(originalState.length>2000);assert.equal(originalState,freshState,'Selected membership state changed;inspect before a candidate.');
const beforeNull='conversionOperation.Operand.Type.ContainingNamespace.ToString().StartsWith(ComponentsApi.AssemblyName, StringComparison.Ordinal)';
const afterNull='conversionOperation.Operand.Type.ContainingNamespace?.ToString().StartsWith(ComponentsApi.AssemblyName, StringComparison.Ordinal) == true';
assert.equal(original.replace(beforeNull,afterNull),fresh,'Inspect an unexpected current-default owner delta.');
capture('git',['--no-pager','diff',baseline,current,'--',owner],'exact-default-owner-delta');
capture('git',['log',current,'--follow','--format=%H %ad %s','--date=iso-strict','--',owner],'current-default-owner-history');
for(const commit of ['70a531e2fccbd0d22f049e968604e3d62acc9558','cf0040c17ca3f506240b60ca4fc9219684a73302','1cb499475ebef1d44f9ab85a9f9fdc266a891a1d'])
    capture('git',['--no-pager','show',commit,'--',owner],'history-'+commit.slice(0,8));
capture('gh',['api','repos/dotnet/aspnetcore/pulls/67228'],'original-feature-pr');
capture('gh',['api','repos/dotnet/aspnetcore/issues/65234'],'original-feature-issue');
for(const query of ['ForLoopIteratorInClosureAnalyzer','AllForVariables'])
    capture('gh',['search','prs',query,'--repo','dotnet/aspnetcore','--limit','10','--json','number,title,state,url'],'related-work-'+query);
const consultedGuidance=[String.raw`src\Components\AGENTS.md`,String.raw`.github\instructions\components.instructions.md`,
    String.raw`.github\instructions\cross-cutting-guidance.instructions.md`,String.raw`docs\CrossCuttingGuidance.md`,
    String.raw`docs\BlazorComponentsGuidance.md`,String.raw`docs\BuildFromSource.md`]
    .map(file=>({file,sha256:hash(fs.readFileSync(path.join(root,file)))}));
fs.writeFileSync(path.join(run,'current-source-investigation.json'),JSON.stringify({
    candidate:'F006',baseline,branch,currentDefault:current,currentDefaultCapturedAt:new Date().toISOString(),
    scopedSourceFiles:sources.length,currentDefaultEquivalentFiles:sources.filter(row=>row.baselineAndDefaultEquivalent).length,sources,
    shippingSourceChanged:false,currentDefaultFullIntegrationExecuted:false,sourceComparisons:0,
    selectedMembershipStateCanonicalEqual:true,selectedMembershipStateSha256:hash(Buffer.from(originalState)),
    exactDefaultOwnerDelta:{commit:'1cb499475ebef1d44f9ab85a9f9fdc266a891a1d',before:beforeNull,after:afterNull,
        site:'AnalyzeInvocation conversion operand null containing namespace',notMembershipFix:true,fullOwnerCanonicalEqual:false},
    observedSourceBoundary:'Fresh C# LSP AllForVariables has5 references:declaration279,Count guard157,adds299/308,membership325. AddRelatedOccurrences has one incoming method AnalyzeInvocation155,call213. Only Count/Add/membership consumers,no enumeration/order consumer. Each state belongs to one operation-block action.',
    producerReachability:'Actual AddAttribute/EventCallbackFactory anonymous delegate branch produces Descendants().OfType<ILocalReferenceOperation>();AddRelatedOccurrences scans retained real loop locals for each candidate. Both unmutated potential locals and iterators are membership hits;cached non-for-locals are misses,not equivalent to every zero-diagnostic case. Non-render methods fail the actual owner guard.',
    codeIntelligence:'Repository target/path are already known;fresh C# LSP binding references/incoming call plus full owner source used. Configured Azure DevOps graph is not this GitHub repo;no graph-completeness or empty-probe claim.',
    consultedGuidance,priorWork:'F004 no-gain and F005 qualified fork draft119 are finalized independently. Source starts fresh baseline,not either candidate;original owner must be rebuilt before execution. Exact-harness identity required from comparison1,unlike exploratory F005 pair1.',
    prototypeProposal:'Lazy comparer-backed all-for-variable set,dependent null/empty guard,two add sites,membership only;five lines,not implemented or claimed gain.',
    componentsBoundary:'Compile-time analyzer-owned behavior-preserving experiment,actual Roslyn producers/exact diagnostics/full-owner resources. Existing analyzer test class permanent surface;no renderer/browser/render-mode/E2E or UI claim.',
    limitation:'Selected state is source-equivalent on fresh default;adjacent null fix excluded and not transplanted. Full current-default integration remains unexecuted.'
},null,2)+'\n');
fs.writeFileSync(path.join(run,'measurement-budget.json'),JSON.stringify({
    candidate:'F006',maximumComparisons:3,usedComparisons:0,originalProfiles:0,candidateProfiles:0,sourceShapesMeasured:0,closed:false
},null,2)+'\n');
console.log(`F006 fresh default${current.slice(0,8)},7 source triples/${sources.filter(row=>row.baselineAndDefaultEquivalent).length} fully equal;selected all-variable state unchanged. Acceptance captured,0 comparisons,no shipping change.`);
