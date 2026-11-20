'use strict';
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = __dirname, work = path.dirname(root), par = path.dirname(work);
const donor = path.join(par,'finding-F173-F175-013','capsule'), reused = path.join(root,'reuse','capsule');
const sha = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const readJson = p => JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
function write(n,b) { const p=path.join(root,n);fs.mkdirSync(path.dirname(p),{recursive:true});assert(!fs.existsSync(p),n);fs.writeFileSync(p,b); }
const json=(n,x)=>write(n,JSON.stringify(x,null,2)+'\n');
const commands=[];
function observe(label,exe,args,cwd='C:\\src\\aspnetcore') {
  const startedAt=new Date().toISOString();
  const r=cp.spawnSync(exe,args,{cwd,encoding:null,windowsHide:true,maxBuffer:32*1024*1024});
  write(`evidence/${label}.stdout.txt`,r.stdout??'');write(`evidence/${label}.stderr.txt`,r.stderr??'');
  const record={label,executable:exe,arguments:args,checkout:cwd,processId:r.pid,startedAt,exitedAt:new Date().toISOString(),
    exitCode:r.status,signal:r.signal,error:r.error?.message??null,exited:r.status!==null,bothStreamsDrained:true};
  commands.push(record);json(`evidence/${label}.observation.json`,record);
  assert.equal(r.status,0,`${label}: ${r.stderr}`);
  return r.stdout.toString('utf8').trim();
}
const git=(label,repo,args)=>observe(label,'git',['--no-optional-locks','--no-pager','-C',repo,...args],repo);
function inventory(directory,relative='') {
  const files=[];
  for(const e of fs.readdirSync(path.join(directory,relative),{withFileTypes:true})) {
    const n=path.join(relative,e.name);assert(!e.isSymbolicLink(),n);
    if(e.isDirectory())files.push(...inventory(directory,n));
    else {const b=fs.readFileSync(path.join(directory,n));files.push({path:n.replaceAll('\\','/'),bytes:b.length,sha256:sha(b)});}
  }
  return files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
const prior=readJson(path.join(reused,'graph-creation.json'));
const upstreamRepository=JSON.parse(observe('entry-upstream','gh',['api','repos/dotnet/aspnetcore','--jq','{full_name,default_branch,pushed_at}']));
const lsRemote=observe('entry-ls-remote','git',['ls-remote','https://github.com/dotnet/aspnetcore.git','refs/heads/main']);
assert.equal(upstreamRepository.default_branch,'main');
const graphs={originalCommit:prior.originalCommit,defaultCommit:lsRemote.split(/\s+/)[0],originalPath:prior.originalPath,defaultPath:'C:\\src\\ap-F182-d022',
  originalReusedReadOnly:true,defaultIndependentFreshClone:true,previousDefaultCommit:prior.defaultCommit};
const coordinator={branch:git('entry-coordinator-branch','C:\\src\\aspnetcore',['branch','--show-current']),
  head:git('entry-coordinator-head','C:\\src\\aspnetcore',['rev-parse','HEAD']),
  status:git('entry-coordinator-status','C:\\src\\aspnetcore',['status','--porcelain=v1','--untracked-files=all']),
  indexSha256:sha(fs.readFileSync('C:\\src\\aspnetcore\\.git\\index'))};
const policyBytes=fs.readFileSync(path.join(par,'policy.json')),policy=JSON.parse(policyBytes);
write('entry-policy.json',policyBytes);assert(!policy.actualWorkerBuildHoldActive&&policy.workersMayBuildOrTest);
const findings=['F182','F183','F184','F185','F186'];
const candidates=readJson(path.join(par,'..','autoperf-campaign.json')).candidates.filter(c=>findings.includes(c.id));
assert.deepEqual(candidates.map(c=>c.id).sort(),findings);assert(candidates.every(c=>c.status.toLowerCase()==='pending'));
json('candidates-entry.json',candidates);
const manifestBytes=fs.readFileSync(path.join(reused,'MANIFEST.json')),manifest=JSON.parse(manifestBytes);
assert.equal(sha(manifestBytes),sha(fs.readFileSync(path.join(donor,'MANIFEST.json'))));
for(const f of manifest.files) {
  const b=fs.readFileSync(path.join(reused,f.path));assert.equal(b.length,f.bytes,f.path);assert.equal(sha(b),f.sha256,f.path);
}
for(const name of ['Metadata.cjs','PeExtras.cjs','GitObjects.cjs','Xml.cjs','Reconcile.cjs'])write(name,fs.readFileSync(path.join(reused,name)));
const donorImages=readJson(path.join(reused,'native-images-final.json'));
const donorRuntimes=readJson(path.join(reused,'runtime-images.json'));
const donorChecks=[];
for(const role of ['original','default']) {
  const checkout=prior[`${role}Path`],commit=prior[`${role}Commit`];
  const head=git(`entry-donor-${role}-head`,checkout,['rev-parse','HEAD']);
  const status=git(`entry-donor-${role}-status`,checkout,['status','--porcelain=v1','--untracked-files=all']);
  assert.equal(head,commit);assert.equal(status,'');
  const target='src/Identity/test/InMemory.Test/InMemoryStore.cs';
  const blob=git(`entry-donor-${role}-target`,checkout,['rev-parse',`${commit}:${target}`]);
  const b=fs.readFileSync(path.join(checkout,target)),raw=fs.readFileSync(path.join(reused,'source',role,target));
  assert(Buffer.from(b.toString('utf8').replace(/\r\n/g,'\n')).equals(raw));
  assert.deepEqual(inventory(donorImages.images[role].directory),donorImages.images[role].files);
  const runtime=donorRuntimes.images.find(r=>r.role===role);assert.deepEqual(inventory(runtime.directory),runtime.files);
  donorChecks.push({role,checkout,commit,head,status,target,blob,checkoutSha256:sha(b),rawGitSha256:sha(raw),nativeFilesVerified:donorImages.images[role].count,
    runtimeFilesVerified:runtime.count,sdkDirectory:fs.realpathSync(path.join(checkout,'.dotnet'))});
}
assert(!fs.existsSync(graphs.defaultPath),'Independent Default path must be new');
observe('clone-default','git',['clone','--quiet','--no-hardlinks','--no-checkout',prior.defaultPath,graphs.defaultPath]);
observe('fetch-default','git',['--no-pager','-C',graphs.defaultPath,'fetch','--quiet','--no-tags','https://github.com/dotnet/aspnetcore.git',graphs.defaultCommit]);
git('checkout-default',graphs.defaultPath,['checkout','--detach',graphs.defaultCommit]);
assert.equal(git('entry-default-head',graphs.defaultPath,['rev-parse','HEAD']),graphs.defaultCommit);
assert.equal(git('entry-default-status',graphs.defaultPath,['status','--porcelain=v1','--untracked-files=all']),'');
assert(!fs.existsSync(path.join(graphs.defaultPath,'.git','objects','info','alternates')));
const sdk=fs.realpathSync(path.join(prior.defaultPath,'.dotnet'));
fs.symlinkSync(sdk,path.join(graphs.defaultPath,'.dotnet'),'junction');
const originalDirectory=path.join(work,'images','original');
fs.mkdirSync(path.dirname(originalDirectory),{recursive:true});
fs.cpSync(donorImages.images.original.directory,originalDirectory,{recursive:true,errorOnExist:true,force:false,dereference:true});
const originalFiles=inventory(originalDirectory);assert.deepEqual(originalFiles,donorImages.images.original.files);
json('native-images-initial.json',{boundary:'Full private Original image copy, including all historical common companions, without exclusions. Fresh Default will be normally built separately.',
  images:{original:{role:'original',commit:graphs.originalCommit,donorDirectory:donorImages.images.original.directory,directory:originalDirectory,
    files:originalFiles,count:originalFiles.length,bytes:originalFiles.reduce((s,f)=>s+f.bytes,0)}}});
json('graph-creation.json',graphs);
json('reuse/provenance.json',{donorCapsule:donor,selected:'reuse/capsule',donorManifestSha256:sha(manifestBytes),files:manifest.count,bytes:manifest.bytes,
  copiedWholeSealedCapsule:true,allDonorManifestFilesFreshlyVerified:true,donorChecks,
  attribution:'F173-F175-013 complete sealed immutable evidence and built-in Node PE/PDB/XML/Git helper approach. Retained unchanged, not newly generated work.',
  boundary:'Historical tests and previous common compilation in the reused capsule do not count as new F182-F186 tests or common compilations. Inventories are not complete copied execution/toolchain closures.'});
json('entry.json',{observedAt:new Date().toISOString(),...graphs,upstreamRepository,lsRemote,coordinator,donorChecks,commands,
  deviation:'First fail-closed initialization rejected newly advanced main. All original script/streams/observations are retained under initialization-failure-v0. Original donor reused; fresh whole Default built at new observed pin.'});
console.log(JSON.stringify({result:'PASS',defaultCommit:graphs.defaultCommit,defaultPath:graphs.defaultPath,originalPrivateFiles:originalFiles.length,donorChecks}));
