import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'autoperf-runs','F010'),out=path.join(root,'investigation','additional-canonical-proof');
assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const json=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8').replace(/^\uFEFF/,''));
const investigation=json('current-source-investigation.json'),addendum=json('logging-investigation-addendum.json');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex').toUpperCase(),commands=[];
for(const row of addendum.additionalCanonicalEqualSources){
    const working=fs.readFileSync(path.join(root,'investigation','additional-producer-source',row.file));
    assert.equal(sha(working),row.workingSha256);
    for(const[label,revision]of[['baseline',investigation.baseline],['captured-default',investigation.currentDefault]]){
        const args=['show',revision+':'+row.file.replaceAll('\\','/')],result=spawnSync('git',args,{cwd:String.raw`C:\src\aspnetcore`});
        assert.equal(result.status,0);assert.equal(result.stderr.length,0);
        assert.equal(result.stdout.toString('utf8').replaceAll('\r\n','\n'),working.toString('utf8').replaceAll('\r\n','\n'));
        const destination=path.join(out,label,row.file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,result.stdout);
        commands.push({entryPoint:'git',arguments:args,actualExitCode:result.status,file:row.file,role:label,sha256:sha(result.stdout)});
    }
}
fs.writeFileSync(path.join(out,'execution.json'),JSON.stringify({
    candidate:'F010',capturedUtc:new Date().toISOString(),phase:'Read-only postmeasurement materialization of immutable revisions originally compared by executed retirement/addendum guard;not new preimplementation timing or source observation.',
    rawOrExperimentChanged:false,timingRepeated:false,budgetReset:false,commands
},null,2)+'\n');
console.log('F010:4 actual immutable git blobs saved;both extra source triples match historical retained working bytes/canonical equality.');
