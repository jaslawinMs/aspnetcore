import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const session=path.dirname(fileURLToPath(import.meta.url)),run=path.join(session,'autoperf-runs','F007');
const repo=String.raw`C:\src\aspnetcore`,file=String.raw`src\Components\Server\src\Circuits\ServerComponentDeserializer.cs`;
const output=path.join(run,'source-patch-metadata.json'),canonical=bytes=>bytes.toString('utf8').replaceAll('\r\n','\n');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
assert(!fs.existsSync(output),'Preserve captured source experiment.');
const reproduction=JSON.parse(fs.readFileSync(path.join(run,'preimplementation-reproduction.json'),'utf8'));
assert.equal(reproduction.implementationStarted,false);assert.equal(reproduction.actualCompanionChecks,129);
const before=fs.readFileSync(path.join(run,'frozen-source','original','owner','ServerComponentDeserializer.cs'));
const after=fs.readFileSync(path.join(repo,file));let expected=canonical(before);
function replace(oldText,newText){
    assert.equal(expected.split(oldText).length,2,'Exact selected source seam required:'+oldText);
    expected=expected.replace(oldText,newText);
}
replace('using System.Buffers;\n','');
replace('        int[]? seenComponentIdsStorage = null;\n','');
replace('                : (seenComponentIdsStorage = ArrayPool<int>.Shared.Rent(operations.Length)).AsSpan(0, operations.Length);',
    '                : default;\n            var seenSsrComponentIdSet = operations.Length > 128 ? new HashSet<int>(operations.Length) : null;');
replace('                if (seenSsrComponentIds[0..currentSsrComponentIdIndex].Contains(operation.SsrComponentId))',
    '                if (seenSsrComponentIdSet is not null\n                    ? !seenSsrComponentIdSet.Add(operation.SsrComponentId)\n                    : seenSsrComponentIds[0..currentSsrComponentIdIndex].Contains(operation.SsrComponentId))');
replace('                seenSsrComponentIds[currentSsrComponentIdIndex++] = operation.SsrComponentId;',
    '                if (seenSsrComponentIdSet is null)\n                {\n                    seenSsrComponentIds[currentSsrComponentIdIndex++] = operation.SsrComponentId;\n                }');
replace('        finally\n        {\n            if (seenComponentIdsStorage != null)\n            {\n                ArrayPool<int>.Shared.Return(seenComponentIdsStorage);\n            }\n        }\n','');
assert.equal(canonical(after),expected,'Only selected membership and directly obsolete buffer lifetime may change.');
function git(args){
    const result=spawnSync('git',args,{cwd:repo,maxBuffer:16*1024*1024});assert.equal(result.status,0,result.stderr?.toString());return result.stdout;
}
assert.equal(git(['branch','--show-current']).toString().trim(),'autoperf/F007-root-operation-id-membership');
assert.equal(git(['rev-parse','HEAD']).toString().trim(),'37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(git(['diff','--cached','--name-only']).length,0);
assert.equal(git(['diff','--name-only']).toString().trim(),file.replaceAll('\\','/'));
git(['diff','--check']);
const patch=git(['diff','--',file]);fs.writeFileSync(path.join(run,'candidate.patch'),patch);
fs.writeFileSync(output,JSON.stringify({
    candidate:'F007',variant:'candidate-1',baseline:'37e809ead5824bc753a1c3d56f11615bdb1296c5',
    branch:'autoperf/F007-root-operation-id-membership',file,originalSourceSha256:hash(before),candidateSourceSha256:hash(after),
    patchSha256:hash(patch),threshold:128,
    sourceExperiment:'Keep <=128 stack-prefix path. For >128,use per-call capacity-sized HashSet<int>.Add for duplicate detection in original sequential validation order. Remove only directly obsolete array rental/return/local/using. Extra large-batch/early-failure allocation is a measured trade-off,not hidden.',
    exactExpectedSourceTransformationMatched:true,noApiDependencyVisibilityOrTestChange:true,
    preimplementationActualChecks:129,preimplementationOwningTests:33,measuredComparisonsAtCapture:0,
    explicitCurrentDefaultBoundary:reproduction.defaultContextBoundary
},null,2)+'\n');
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(run,'executed-capture-source.mjs'));
console.log('F007 exact private candidate captured:one shipping source file,small128 path retained,sequential collection-only change and directly obsolete buffer cleanup;0 comparisons.');
