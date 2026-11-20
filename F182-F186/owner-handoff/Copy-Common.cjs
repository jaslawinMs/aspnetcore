'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname,work=path.dirname(root),name='AutoPerf.Identity.RoleNames';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const payload=path.join(root,'consumer','accepted'),files=[];
const names=fs.readdirSync(payload).sort();
assert.deepEqual(names,['deps.json','dll','pdb','runtimeconfig.json'].map(s=>`${name}.${s}`).sort());
const common=names.map(n=>{const b=fs.readFileSync(path.join(payload,n));return {path:n,bytes:b.length,sha256:sha(b)};});
for(const role of ['original','default'])for(const file of common){
  const source=`consumer/accepted/${file.path}`,destination=path.join(work,'images',role,file.path),b=fs.readFileSync(path.join(root,source));
  assert(!fs.existsSync(destination));fs.copyFileSync(path.join(root,source),destination,fs.constants.COPYFILE_EXCL);
  assert.equal(sha(fs.readFileSync(destination)),file.sha256);
  files.push({role,source,destination,bytes:b.length,sha256:sha(b)});
}
const result={boundary:'Every accepted common payload file; same compiled DLL/PDB/config/deps bytes copied to both complete normal native images. Role runtime/deps explicitly override prepared Original configs.',
  common:{directory:payload,count:common.length,bytes:common.reduce((s,f)=>s+f.bytes,0),files:common},files};
assert(!fs.existsSync(path.join(root,'consumer','copies.json')));
fs.writeFileSync(path.join(root,'consumer','copies.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({result:'PASS',common:result.common,copies:files.length}));
