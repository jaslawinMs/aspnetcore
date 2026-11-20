'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname,work=path.dirname(root),par=path.dirname(work);
const json=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8').replace(/^\uFEFF/,''));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
function inventory(directory,relative=''){
  const files=[];
  for(const entry of fs.readdirSync(path.join(directory,relative),{withFileTypes:true})){
    const n=path.join(relative,entry.name);assert(!entry.isSymbolicLink(),n);
    if(entry.isDirectory())files.push(...inventory(directory,n));
    else{const b=fs.readFileSync(path.join(directory,n));files.push({path:n.replaceAll('\\','/'),bytes:b.length,sha256:sha(b)});}
  }
  return files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
const policy=JSON.parse(fs.readFileSync(path.join(par,'policy.json'),'utf8'));
assert(!policy.actualWorkerBuildHoldActive&&policy.workersMayBuildOrTest,'Actual HOLD blocks source-heavy verification');
const graphs=json('graph-creation.json'),prior=json('reuse/capsule/graph-creation.json'),closing=json('closing.json');
assert.equal(closing.reusedDefaultGraph.head,prior.defaultCommit);assert.deepEqual(closing.reusedDefaultGraph.status,[]);
const priorNative=json('reuse/capsule/native-images-final.json'),priorRuntimes=json('reuse/capsule/runtime-images.json');
const currentNative=json('native-images-final.json'),currentRuntime=json('runtime-images.json');
const checks=[];
for(const role of ['original','default']){
  const target='src/Identity/test/InMemory.Test/InMemoryStore.cs',checkout=prior[`${role}Path`];
  const source=fs.readFileSync(path.join(checkout,target)),raw=fs.readFileSync(path.join(root,'reuse','capsule','source',role,target));
  assert(Buffer.from(source.toString('utf8').replace(/\r\n/g,'\n')).equals(raw));
  assert.deepEqual(inventory(priorNative.images[role].directory),priorNative.images[role].files);
  const runtime=priorRuntimes.images.find(r=>r.role===role);assert.deepEqual(inventory(runtime.directory),runtime.files);
  assert.deepEqual(inventory(currentNative.images[role].directory),currentNative.images[role].files);
  const actualRuntime=currentRuntime.images.find(r=>r.role===role);assert.deepEqual(inventory(actualRuntime.directory),actualRuntime.files);
  const compiler=[];
  for(const reference of json('reuse/capsule/consumer/inputs.json').records.filter(r=>r.kind==='compiler-managed-closure')){
    const filename=path.join(checkout,'.dotnet','sdk','12.0.100-alpha.1.26557.102','Roslyn','bincore',path.win32.basename(reference.source));
    const b=fs.readFileSync(filename);assert.equal(sha(b),reference.sha256);assert.equal(b.length,reference.bytes);
    compiler.push({path:filename,bytes:b.length,sha256:sha(b)});
  }
  const identity=json(`evidence/${role}-supplemental-v1-identity.json`),host=identity.nativeModules.find(m=>m.name==='dotnet.exe');
  assert(host);const hostBytes=fs.readFileSync(host.location);assert.equal(sha(hostBytes),host.sha256);
  checks.push({role,donorCheckout:checkout,donorTargetSha256:sha(source),donorNativeFiles:priorNative.images[role].count,donorRuntimeFiles:runtime.count,
    currentPrivateNativeFiles:currentNative.images[role].count,currentSharedRuntimeFiles:actualRuntime.count,compiler,actualHost:{path:host.location,bytes:hostBytes.length,sha256:sha(hostBytes)}});
}
const donor=path.join(par,'finding-F173-F175-013','capsule'),retained=path.join(root,'reuse','capsule');
const originalDonorFiles=inventory(donor),copiedDonorFiles=inventory(retained);
assert.deepEqual(originalDonorFiles,copiedDonorFiles,'Complete donor capsule, including its manifests, remains equal to retained immutable copy');
assert(!fs.existsSync(path.join(graphs.defaultPath,'.git','objects','info','alternates')));
const report={observedAt:new Date().toISOString(),allDonorNativeRuntimeAndTargetFilesUnchanged:true,checks,donorCapsuleFiles:originalDonorFiles.length,
  donorCapsuleBytes:originalDonorFiles.reduce((s,f)=>s+f.bytes,0),donorManifestSha256:sha(fs.readFileSync(path.join(donor,'MANIFEST.json'))),
  privateNativeImagesUnchangedAfterAllExecutions:true,independentDefaultObjectStoreAlternatesAbsent:true,
  boundary:'Full native image/shared-runtime and target-source byte/hash checks, selected SDK managed-compiler/actual host hashes, and complete reused capsule equality. Not donor-wide SDK/OS/ACL/timestamp or full compiler/execution closure attestation.'};
const output=path.join(root,'closing-reuse-integrity.json');assert(!fs.existsSync(output));fs.writeFileSync(output+'.stage',JSON.stringify(report,null,2)+'\n');fs.renameSync(output+'.stage',output);
console.log(JSON.stringify({result:'PASS',donorCapsuleFiles:report.donorCapsuleFiles,checks:checks.map(c=>({role:c.role,donorNativeFiles:c.donorNativeFiles,donorRuntimeFiles:c.donorRuntimeFiles,currentPrivateNativeFiles:c.currentPrivateNativeFiles}))}));
