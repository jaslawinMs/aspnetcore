import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const session=path.dirname(fileURLToPath(import.meta.url)),root=String.raw`C:\src\aspnetcore`;
const run=path.join(session,'autoperf-runs','F006'),owner=String.raw`src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs`;
assert(!fs.existsSync(path.join(run,'source-patch-metadata.json')));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const canonical=bytes=>bytes.toString('utf8').replaceAll('\r\n','\n');
const original=fs.readFileSync(path.join(run,'producer-source',owner)),candidate=fs.readFileSync(path.join(root,owner));
const changes=[
    ['if (analyzerState.AllForVariables.Count == 0)','if (analyzerState.AllForVariables is not { Count: > 0 })'],
    ['public List<ILocalSymbol> AllForVariables { get; } = new();','public HashSet<ILocalSymbol>? AllForVariables { get; private set; }'],
    ['AllForVariables.Add(iterator);','(AllForVariables ??= new(SymbolEqualityComparer.Default)).Add(iterator);'],
    ['AllForVariables.Add(potentialIterator);','(AllForVariables ??= new(SymbolEqualityComparer.Default)).Add(potentialIterator);'],
    ['if (AllForVariables.Any(forVariable => SymbolEqualityComparer.Default.Equals(forVariable, variableReference.Local)))','if (AllForVariables?.Contains(variableReference.Local) ?? false)']
];
let expected=canonical(original);
for(const [before,after]of changes){assert.equal(expected.split(before).length,2);expected=expected.replace(before,after);}
assert.equal(canonical(candidate),expected,'Only five selected source statements may change.');
const scope=spawnSync('git',['--no-pager','diff','--name-only'],{cwd:root});
assert.equal(scope.status,0);assert.equal(scope.stdout.toString().trim().replaceAll('/','\\'),owner);
const result=spawnSync('git',['--no-pager','diff','--',owner],{cwd:root,maxBuffer:2**20});
assert.equal(result.status,0);assert(result.stdout.length>0);
fs.writeFileSync(path.join(run,'candidate.patch'),result.stdout);
fs.writeFileSync(path.join(run,'source-patch-metadata.json'),JSON.stringify({
    candidate:'F006',baseline:'37e809ead5824bc753a1c3d56f11615bdb1296c5',branch:'autoperf/F006-for-variable-symbol-membership',
    changedTrackedFiles:1,changedExistingLines:5,sourceCandidateShapes:1,originalSourceSha256:hash(original),candidateSourceSha256:hash(candidate),
    patchSha256:hash(result.stdout),sourceCandidateFixedBeforeTiming:true,otherMembershipsPromotionAndReportingUnchanged:true,
    noBehaviorNeutralExistingLineEdits:true,newApiDefaultsDependenciesTargetFrameworksOrVisibility:false
},null,2)+'\n');
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(run,'executed-capture-source.mjs'));
console.log('F006 exact five-statement candidate/patch captured;all other source bytes canonically unchanged,no performance claim.');
