import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const session=path.dirname(fileURLToPath(import.meta.url)),run=path.join(session,'autoperf-runs','F007');
const repo=String.raw`C:\src\aspnetcore`,read=file=>JSON.parse(fs.readFileSync(path.join(run,file),'utf8').replace(/^\uFEFF/,''));
const output=path.join(run,'preimplementation-reproduction.json');
assert(!fs.existsSync(output),'Preserve actual preimplementation record.');
const investigation=read('current-source-investigation.json'),ready=read('ready-original.json'),tests=read('tests/original/actual-test-audit.json');
const budget=read('measurement-budget.json'),manifest=read('manifest-original.json');
assert.equal(ready.actualOwnerChecks,129);assert.equal(ready.actualProducerProofs,107);assert.equal(tests.actualTests,33);
assert(tests.rows.every(row=>row.outcome==='Passed'));assert.equal(budget.usedComparisons,0);
assert.equal(investigation.currentDefaultEquivalentFiles,15);assert(investigation.wholeDefaultOwnerCanonicalEqual);
function git(args){
    const result=spawnSync('git',args,{cwd:repo,maxBuffer:16*1024*1024});
    assert.equal(result.status,0,result.stderr?.toString());return result.stdout;
}
assert.equal(git(['diff','--name-only']).length,0);assert.equal(git(['diff','--cached','--name-only']).length,0);
const supplemental=['src\\Components\\Server\\src\\CircuitRootComponentOptions.cs','src\\Components\\Shared\\src\\WebRootComponentManager.cs',
    'src\\Shared\\Components\\ComponentMarker.cs','src\\Shared\\Components\\ServerComponentInvocationSequence.cs',
    'src\\Components\\Web.JS\\src\\Services\\WebRootComponentManager.ts'];
const sources=supplemental.map(file=>{
    const key=file.replaceAll('\\','/'),base=git(['show',`${investigation.baseline}:${key}`]);
    const current=git(['show',`${investigation.currentDefault}:${key}`]);
    const normalize=bytes=>bytes.toString('utf8').replaceAll('\r\n','\n');
    assert.equal(normalize(base),normalize(current),file+':inspect default delta before proceeding.');
    const destination=path.join(run,'supplemental-current-context',file);
    fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,current);
    return{file,baselineAndDefaultEquivalent:true,currentSha256:crypto.createHash('sha256').update(current).digest('hex').toUpperCase()};
});
const sdkDelta=git(['diff',investigation.baseline,investigation.currentDefault,'--','global.json','eng/Versions.props']);
fs.writeFileSync(path.join(run,'investigation','current-build-sdk-context.patch'),sdkDelta);
const states=fs.readdirSync(path.join(run,'characterization','original-attempt1','states'));
const runtimeName=states.find(name=>name.endsWith('-runtime.json'));
assert(runtimeName);const runtime=read(path.join('characterization','original-attempt1','states',runtimeName));
assert.equal(runtime.publicDefaultMaximumRootComponents,100);
fs.writeFileSync(output,JSON.stringify({
    candidate:'F007',recordedAt:new Date().toISOString(),implementationStarted:false,measuredComparisons:0,
    currentDefault:investigation.currentDefault,selectedWholeDefaultClassAnd15FilesEqual:true,supplementalDefaultSources:sources,
    defaultContextBoundary:'Current selected owner/producers/callers/test source is canonically equal;actual owner tests/companion execute that source in original campaign SDK/dependency context. Current global Arcade/Helix/shared-framework SDK inputs differ. No whole-current-default integration/build/test claim;global.json/manifests remain unchanged.',
    owningTests:33,actualCompanionChecks:129,actualProducerProofs:107,originalImageFiles:manifest.files.length,
    finalOnceCompiledHarnessAcrossAllOwnerRoles:true,earlierUnmeasuredHarnessVersionAndMetadataFreezeFailurePreserved:true,
    actualDefaultRootLimit:100,
    supportedClaimBoundary:'Parser method accepts large JSON arrays,but downstream root manager applies configured simultaneous-root limit (default100). Batch count is not proved identical to root count. No production size/frequency estimate or downstream dispatch/browser success is inferred from parser success.',
    predeclaredTimedShapes:22,
    timedRoles:'Warm actual full JSON parser over repeated deterministic Remove batches or marker-disabled resume inputs;five duplicate-position controls. Cached expression wrapper and real result. Full actual marker/parameter and retained state characterized untimed,including >128 inputs.',
    excludedClaims:['whole-main integration','browser queue producer execution','rendering/circuit-dispatch speed','real marker-conversion throughput','production workload mix'],
    decision:'Proceed with one private >128 per-batch integer-set candidate while keeping original small stack path and sequential error/log/state contracts. Treat scan hot-path/high confidence as unproven performance prioritization,not measured benefit.'
},null,2)+'\n');
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(run,'investigation','executed-finish-reproduction.mjs'));
console.log('F007 original reproduction:33 owning Facts,129 checks/107 actual producer proofs;22 fixed timed shapes,0 comparisons. Default100-root and original-context/current-source limits recorded.');
