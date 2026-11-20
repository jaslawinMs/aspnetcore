'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname,work=path.dirname(root),par=path.dirname(work),reused=path.join(root,'reuse','capsule'),failed=path.join(root,'initialization-failure-v1');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
function write(n,b){const p=path.join(root,n);fs.mkdirSync(path.dirname(p),{recursive:true});assert(!fs.existsSync(p),n);fs.writeFileSync(p,b);}
const json=(n,x)=>write(n,JSON.stringify(x,null,2)+'\n');
const commands=[];
function observe(label,exe,args,cwd='C:\\src\\aspnetcore'){
  const startedAt=new Date().toISOString(),r=cp.spawnSync(exe,args,{cwd,encoding:null,windowsHide:true,maxBuffer:32*1024*1024});
  write(`evidence/${label}.stdout.txt`,r.stdout??'');write(`evidence/${label}.stderr.txt`,r.stderr??'');
  const record={label,executable:exe,arguments:args,checkout:cwd,processId:r.pid,startedAt,exitedAt:new Date().toISOString(),exitCode:r.status,
    error:r.error?.message??null,exited:r.status!==null,bothStreamsDrained:true};
  commands.push(record);json(`evidence/${label}.observation.json`,record);assert.equal(r.status,0,`${label}: ${r.stderr}`);
  return r.stdout.toString('utf8').trim();
}
const git=(label,repo,args)=>observe(label,'git',['--no-optional-locks','--no-pager','-C',repo,...args],repo);
function inventory(directory,relative=''){
  const files=[];for(const e of fs.readdirSync(path.join(directory,relative),{withFileTypes:true})){
    const n=path.join(relative,e.name);assert(!e.isSymbolicLink(),n);
    if(e.isDirectory())files.push(...inventory(directory,n));else{const b=fs.readFileSync(path.join(directory,n));files.push({path:n.replaceAll('\\','/'),bytes:b.length,sha256:sha(b)});}
  }return files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
const prior=readJson(path.join(reused,'graph-creation.json'));
const lsRemote=fs.readFileSync(path.join(failed,'evidence','entry-ls-remote.stdout.txt'),'utf8').trim();
const upstreamRepository=readJson(path.join(failed,'evidence','entry-upstream.stdout.txt'));
const graphs={originalCommit:prior.originalCommit,defaultCommit:lsRemote.split(/\s+/)[0],originalPath:prior.originalPath,defaultPath:'C:\\src\\ap-F182-d022',
  originalReusedReadOnly:true,defaultIndependentFreshClone:true,previousDefaultCommit:prior.defaultCommit};
git('repair-default-repack',graphs.defaultPath,['repack','-a','-d']);
const alternate=path.join(graphs.defaultPath,'.git','objects','info','alternates');
const alternateBytes=fs.readFileSync(alternate);
assert(alternateBytes.equals(fs.readFileSync(path.join(failed,'copied-alternates.raw.txt'))));
fs.unlinkSync(alternate);
git('repair-default-fsck',graphs.defaultPath,['fsck','--no-dangling']);
assert(!fs.existsSync(alternate));
const target='src/Identity/test/InMemory.Test/InMemoryStore.cs';
assert.equal(git('resume-default-head',graphs.defaultPath,['rev-parse','HEAD']),graphs.defaultCommit);
assert.equal(git('resume-default-status',graphs.defaultPath,['status','--porcelain=v1','--untracked-files=all']),'');
const sdk=fs.realpathSync(path.join(prior.defaultPath,'.dotnet'));fs.symlinkSync(sdk,path.join(graphs.defaultPath,'.dotnet'),'junction');
const previousImages=readJson(path.join(reused,'native-images-final.json'));
const previousRuntimes=readJson(path.join(reused,'runtime-images.json'));
const donorChecks=[];
for(const role of ['original','default']){
  const checkout=prior[`${role}Path`],commit=prior[`${role}Commit`];
  assert.equal(git(`resume-donor-${role}-head`,checkout,['rev-parse','HEAD']),commit);
  assert.equal(git(`resume-donor-${role}-status`,checkout,['status','--porcelain=v1','--untracked-files=all']),'');
  const blob=git(`resume-donor-${role}-target`,checkout,['rev-parse',`${commit}:${target}`]);
  const b=fs.readFileSync(path.join(checkout,target)),raw=fs.readFileSync(path.join(reused,'source',role,target));
  assert(Buffer.from(b.toString('utf8').replace(/\r\n/g,'\n')).equals(raw));
  assert.deepEqual(inventory(previousImages.images[role].directory),previousImages.images[role].files);
  const runtime=previousRuntimes.images.find(r=>r.role===role);assert.deepEqual(inventory(runtime.directory),runtime.files);
  donorChecks.push({role,checkout,commit,target,blob,clean:true,checkoutSha256:sha(b),rawGitSha256:sha(raw),nativeFilesVerified:previousImages.images[role].count,
    runtimeFilesVerified:runtime.count,sdkDirectory:fs.realpathSync(path.join(checkout,'.dotnet'))});
}
const destination=path.join(work,'images','original');assert(!fs.existsSync(destination));fs.mkdirSync(path.dirname(destination),{recursive:true});
fs.cpSync(previousImages.images.original.directory,destination,{recursive:true,errorOnExist:true,force:false,dereference:true});
const files=inventory(destination);assert.deepEqual(files,previousImages.images.original.files);
json('native-images-initial.json',{boundary:'All-file private Original copy including historical F173 common companions; fresh Default will be normal-build copied, not TARGET-ONLY.',
  images:{original:{role:'original',commit:graphs.originalCommit,donorDirectory:previousImages.images.original.directory,directory:destination,files,count:files.length,bytes:files.reduce((s,f)=>s+f.bytes,0)}}});
json('graph-creation.json',graphs);
const policyBytes=fs.readFileSync(path.join(par,'policy.json'));write('entry-policy.json',policyBytes);
const policy=JSON.parse(policyBytes);assert(!policy.actualWorkerBuildHoldActive&&policy.workersMayBuildOrTest);
write('candidates-entry.json',fs.readFileSync(path.join(failed,'candidates-entry.json')));
const failureRead=n=>fs.readFileSync(path.join(failed,'evidence',n+'.stdout.txt'),'utf8').trim();
const coordinator={branch:failureRead('entry-coordinator-branch'),head:failureRead('entry-coordinator-head'),status:failureRead('entry-coordinator-status')};
const manifestBytes=fs.readFileSync(path.join(reused,'MANIFEST.json')),manifest=JSON.parse(manifestBytes);
json('reuse/provenance.json',{donorCapsule:path.join(par,'finding-F173-F175-013','capsule'),selected:'reuse/capsule',donorManifestSha256:sha(manifestBytes),
  files:manifest.count,bytes:manifest.bytes,copiedWholeSealedCapsule:true,allDonorManifestFilesFreshlyVerified:true,donorChecks,
  attribution:'F173-F175-013 whole immutable evidence capsule and built-in Node PE/PDB/XML/Git helper approach, retained unchanged.',
  boundary:'Historical tests and prior common compilation are reused evidence only; not new F182-F186 executions or new common compilations.'});
json('entry.json',{observedAt:new Date().toISOString(),...graphs,upstreamRepository,lsRemote,coordinator,donorChecks,commands,
  initializationHistory:[
    {attempt:'v0',outcome:'Rejected moved main before native work',evidence:'initialization-failure-v0'},
    {attempt:'v1',outcome:'Clone --no-hardlinks inherited donor alternates unexpectedly; fail-closed, no dotnet started',evidence:'initialization-failure-v1'},
    {attempt:'resume',outcome:'Repacked all borrowed objects into owned clone; retained raw alternates then removed only owned alternates; fsck passed',
      independentObjectStore:true,noAlternatesAtNativeStart:true,noHardlinksCloneFlag:true}
  ]});
console.log(JSON.stringify({result:'PASS',defaultCommit:graphs.defaultCommit,defaultPath:graphs.defaultPath,originalPrivateFiles:files.length,donorChecks}));
