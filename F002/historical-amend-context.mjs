import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const session=path.dirname(fileURLToPath(import.meta.url)),run=path.join(session,'autoperf-runs','F002'),root=String.raw`C:\src\aspnetcore`;
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const prior=read(path.join(run,'current-source-investigation.json'));
const target=path.join(run,'context-amendment.json');
assert(!fs.existsSync(target));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const canonical=bytes=>Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n'));
const commands=[],rows=[];
for(const file of [String.raw`src\Servers\Kestrel\Transport.Quic\src\Internal\QuicConnectionListener.cs`,String.raw`src\Shared\TestResources.cs`]){
    const raw=[];
    for(const commit of [prior.baseline,prior.currentDefault]){
        const args=['show',commit+':'+file.replaceAll('\\','/')],result=spawnSync('git',args,{cwd:root,maxBuffer:16*1024*1024});
        commands.push({entryPoint:'git',arguments:args,actualExitCode:result.status});
        assert.equal(result.status,0);raw.push(result.stdout);
    }
    const working=fs.readFileSync(path.join(root,file));
    assert(canonical(working).equals(canonical(raw[0])));
    for(const [directory,bytes] of [['baseline-canonical',raw[0]],['current-default-canonical',raw[1]],['producer-source',working]]){
        const destination=path.join(run,directory,file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes);
    }
    rows.push({file,baselineSha256:hash(raw[0]),currentDefaultSha256:hash(raw[1]),workingSha256:hash(working),
        baselineAndDefaultEquivalent:canonical(raw[0]).equals(canonical(raw[1])),workingEqualsBaseline:true});
}
fs.writeFileSync(target,JSON.stringify({
    candidate:'F002',additionalSources:rows,totalScopedSources:prior.scopedSourceFiles+rows.length,
    totalDefaultEquivalent:prior.currentDefaultEquivalentFiles+rows.filter(row=>row.baselineAndDefaultEquivalent).length,commands,
    actualNativeFailureBeforeFinAssertion:'Attempt4 actual native-log event24 explicitly reports AuthenticationException:platform does not support ephemeral keys;clientUserCanceled and eventual bounded server accept cancellation preserved.',
    preparationCorrection:'Use actual already-compiled TestResources.GetTestCertificate existing fixture/import/global-mutex behavior with repository test PFX,matching QuicTestHelpers. No store/global configuration edits,no private key/certificate bytes copied to public evidence. All successful existing test/PDB checks preserved without repetition.',
    failureIsNotOptimizationComparisonOrPerformanceEvidence:true
},null,2)+'\n');
console.log('F002 actual native TLS cause/source amendment captured;28 scoped triples,owning existing certificate helper selected,no timing or shipping edit.');
