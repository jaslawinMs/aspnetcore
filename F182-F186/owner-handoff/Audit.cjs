'use strict';
// Adapted from the attributed, unchanged F173-F175-013 auditor and its parsers.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {pe,portablePdb,typeMethods}=require('./Metadata.cjs');
const {inspectPe}=require('./PeExtras.cjs');
const {objectId,treeEntries,commitTree}=require('./GitObjects.cjs');
const {reconcile}=require('./Reconcile.cjs');
const root=__dirname,findings=['F182','F183','F184','F185','F186'];
function local(name){
  assert.equal(typeof name,'string');assert(!path.posix.isAbsolute(name)&&!path.win32.isAbsolute(name));
  assert(!name.split(/[\\/]/).includes('..'));
  const filename=path.resolve(root,...name.split(/[\\/]/));assert(filename.startsWith(root+path.sep));return filename;
}
const read=n=>fs.readFileSync(local(n));
const text=n=>read(n).toString('utf8').replace(/^\uFEFF/,'');
const json=n=>JSON.parse(text(n));
const hash=(b,algorithm='sha256')=>crypto.createHash(algorithm).update(b).digest('hex').toUpperCase();
function walk(directory,relative=''){
  const names=[];for(const e of fs.readdirSync(path.join(directory,relative),{withFileTypes:true})){
    const n=path.join(relative,e.name);assert(!e.isSymbolicLink(),'No donor/symlink dependency in capsule');
    if(e.isDirectory())names.push(...walk(directory,n));else names.push(n.replaceAll('\\','/'));
  }return names.sort();
}
const manifestBytes=read('MANIFEST.json'),manifest=JSON.parse(manifestBytes);
assert.equal(text('MANIFEST.sha256').trim(),`${hash(manifestBytes)}  MANIFEST.json`);
assert.deepEqual(manifest.excludedSelfFiles,['MANIFEST.json','MANIFEST.sha256']);
assert.equal(manifest.files.length,manifest.count);
assert.equal(new Set(manifest.files.map(f=>f.path)).size,manifest.count);
assert.deepEqual(walk(root).filter(n=>!manifest.excludedSelfFiles.includes(n)),manifest.files.map(f=>f.path).sort());
let total=0;const peFiles=new Map(),pdbFiles=new Map();
for(const f of manifest.files){
  const b=read(f.path);assert.equal(b.length,f.bytes,f.path);assert.equal(hash(b),f.sha256,f.path);total+=b.length;
  if(/\.(dll|exe)$/i.test(f.path)&&!peFiles.has(f.sha256)){
    const extra=inspectPe(b);peFiles.set(f.sha256,{extra,parsed:extra.managed?pe(b):null});
  }
  if(/\.pdb$/i.test(f.path)&&!pdbFiles.has(f.sha256))pdbFiles.set(f.sha256,portablePdb(b));
}
assert.equal(total,manifest.bytes);
const reuse=json('reuse/provenance.json'),reusedManifest=read('reuse/capsule/MANIFEST.json');
assert.equal(hash(reusedManifest),reuse.donorManifestSha256);
const previousArgv=process.argv;
try{
  process.argv=[process.execPath,path.join(root,'reuse','capsule','Audit.cjs')];
  require('./reuse/capsule/Audit.cjs');
}finally{process.argv=previousArgv;}
const graphs=json('graph-creation.json'),entry=json('entry.json'),selected=json('selected-records.json');
const candidates=json('candidates-entry.json');
assert.deepEqual(candidates.map(c=>c.id).sort(),findings);assert(candidates.every(c=>c.status==='pending'));
assert.equal(graphs.originalCommit,'37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(graphs.defaultCommit,entry.lsRemote.split(/\s+/)[0]);
assert.equal(entry.upstreamRepository.default_branch,'main');
assert.equal(graphs.previousDefaultCommit,'90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d');
assert(graphs.originalReusedReadOnly&&graphs.defaultIndependentFreshClone);
assert.equal(json('initialization-failure-v1/evidence/entry-ls-remote.stdout.txt'.replace('.stdout.txt','.observation.json')).exitCode,0);
const sources=[...json('source-records.json').records,...json('additional-source-records.json').records];
for(const s of sources.filter(s=>!s.absent)){
  const b=read(s.selected);assert.equal(b.length,s.bytes);assert.equal(hash(b),s.sha256);assert.equal(objectId('blob',b),s.blob);
  assert.equal(s.commit,graphs[`${s.role}Commit`]);
}
const target='src/Identity/test/InMemory.Test/InMemoryStore.cs';
assert.equal(sources.find(s=>s.role==='original'&&s.source===target).blob,sources.find(s=>s.role==='default'&&s.source===target).blob);
const proofs=json('git-source-proofs.json'),objects=new Map();
for(const o of proofs.objects){
  const b=read(o.selected);assert.equal(b.length,o.bytes);assert.equal(objectId(o.type,b),o.id);objects.set(o.id,{type:o.type,bytes:b});
}
for(const p of proofs.proofs){
  assert.equal(p.commit,graphs[`${p.role}Commit`]);const c=objects.get(p.commit);assert.equal(c?.type,'commit');
  let tree=commitTree(c.bytes),absent=false;assert.equal(tree,p.rootTree);const parts=p.path.split('/');
  for(const [index,name]of parts.entries()){
    const o=objects.get(tree);assert.equal(o?.type,'tree');const item=treeEntries(o.bytes).find(e=>e.name===name);
    if(!item){absent=true;break;}
    if(index===parts.length-1){assert(!p.absent);assert.equal(item.object,p.blob);assert.equal(objectId('blob',read(p.selected)),item.object);}
    else{assert.equal(item.mode,'40000');tree=item.object;}
  }assert.equal(absent,p.absent);
}
for(const s of sources)assert(proofs.proofs.some(p=>p.role===s.role&&p.path===s.source&&p.blob===(s.blob??null)));
const images=new Map();
for(const f of selected.files){const b=read(f.selected);assert.equal(b.length,f.bytes);assert.equal(hash(b),f.sha256);}
for(const i of selected.images){
  const parsed=peFiles.get(i.sha256)?.parsed;assert(parsed,i.selected);assert.equal(parsed.mvid,i.mvid);assert.deepEqual(parsed.codeviews,i.codeviews);
  images.set(i.selected,{...i,parsed});
}
const pairedPdbs=new Set(),usedDocuments=new Set();
for(const pair of selected.pairs){
  const image=images.get(pair.image),pdbHash=hash(read(pair.pdb)),pdb=pdbFiles.get(pdbHash);assert(image&&pdb);
  assert(pair.allPdbDocumentsSelected);assert(image.parsed.codeviews.some(c=>c.guid===pdb.guid&&c.stamp===pdb.stamp&&c.age===1));
  assert.equal(pair.guid,pdb.guid);assert.equal(pair.stamp,pdb.stamp);assert.equal(pair.documents.length,pdb.documents.length);pairedPdbs.add(pdbHash);
  for(const [index,id]of pair.documents.entries()){
    assert(!usedDocuments.has(id));usedDocuments.add(id);
    const actual=pdb.documents[index],r=selected.documents[id];assert.equal(r.id,id);assert.equal(r.role,pair.role);assert.equal(r.pair+'.dll',pair.image);
    for(const k of ['name','algorithm','checksum','language'])assert.equal(r[k],actual[k]);
    const b=read(r.selected),algorithm=actual.algorithm==='8829d00f-11b8-4213-878b-770e8597ac16'?'sha256':actual.algorithm==='ff1816ec-aa5e-4d10-87f7-6f4963833460'?'sha1':null;
    assert(algorithm);assert.equal(hash(b,algorithm),actual.checksum);assert.equal(hash(b),r.sha256);assert.equal(b.length,r.bytes);
    if(r.immutableSource){
      const s=r.immutableSource,raw=read(s.rawGitBlob);assert.equal(s.commit,graphs[`${r.role}Commit`]);assert.equal(objectId('blob',raw),s.blob);
      assert(proofs.proofs.some(p=>p.role===r.role&&p.path===s.source&&p.blob===s.blob));
      assert(['byte-identical','git-LF-vs-compiler-CRLF'].includes(s.checkoutRelation));
      assert(raw.equals(s.checkoutRelation==='byte-identical'?b:Buffer.from(b.toString('utf8').replace(/\r\n/g,'\n'))));
    }
    if(pair.role==='common'){assert.equal(r.name,'/_/autoperf-private/Program.cs');assert(b.equals(read('consumer/Program.cs')));}
  }
}
assert.equal(usedDocuments.size,selected.documents.length);
for(const p of json('reuse/capsule/selected-records.json').pairs)pairedPdbs.add(hash(read('reuse/capsule/'+p.pdb)));
for(const h of pdbFiles.keys())assert(pairedPdbs.has(h),'Every retained unique PDB has complete raw documents and a PE association');
function validateInventory(i){
  assert.equal(i.count,i.files.length);assert.equal(i.bytes,i.files.reduce((s,f)=>s+f.bytes,0));assert.equal(new Set(i.files.map(f=>f.path)).size,i.count);
  for(const f of i.files){assert(Number.isInteger(f.bytes)&&f.bytes>=0);assert(/^[0-9A-F]{64}$/.test(f.sha256));}
}
function union(a,b){
  const x=new Map(a.map(f=>[f.path,f])),y=new Map(b.map(f=>[f.path,f]));
  return [...new Set([...x.keys(),...y.keys()])].sort().map(p=>({path:p,original:x.get(p)??null,default:y.get(p)??null}));
}
function differences(a,b){return union(a,b).filter(r=>r.original?.sha256!==r.default?.sha256);}
const initial=json('native-images.json'),final=json('native-images-final.json'),runtimes=json('runtime-images.json'),copies=json('consumer/copies.json');
const historicalPreparationRoot=path.win32.dirname(path.win32.dirname(initial.images.original.directory));
for(const inventory of [initial,final]){
  for(const role of ['original','default']){validateInventory(inventory.images[role]);assert.equal(inventory.images[role].commit,graphs[`${role}Commit`]);}
  assert.deepEqual(inventory.union,union(inventory.images.original.files,inventory.images.default.files));
  assert.deepEqual(inventory.differences,differences(inventory.images.original.files,inventory.images.default.files));
}
for(const r of runtimes.images)validateInventory(r);
assert.deepEqual(runtimes.union,union(runtimes.images[0].files,runtimes.images[1].files));
assert.deepEqual(runtimes.differences,differences(runtimes.images[0].files,runtimes.images[1].files));
validateInventory(copies.common);assert.equal(copies.common.count,4);
assert.deepEqual(copies.common.files.map(f=>f.path).sort(),['deps.json','dll','pdb','runtimeconfig.json'].map(s=>`AutoPerf.Identity.RoleNames.${s}`).sort());
for(const f of copies.common.files){const b=read(`consumer/accepted/${f.path}`);assert.equal(hash(b),f.sha256);assert.equal(b.length,f.bytes);}
for(const c of copies.files){
  const b=read(c.source);assert.equal(hash(b),c.sha256);assert.equal(b.length,c.bytes);
  const f=final.images[c.role].files.find(f=>f.path===path.posix.basename(c.source));assert.deepEqual(f,{path:path.posix.basename(c.source),bytes:c.bytes,sha256:c.sha256});
}
const compilation=json('consumer/inputs.json'),rsp=text('consumer/compile.rsp').trim().split(/\r?\n/);
assert.equal(compilation.languageVersion,'13');assert(compilation.noConfig&&compilation.noStandardLibrary);assert.equal(compilation.analyzers.length,0);
for(const input of compilation.records){const b=read(input.selected);assert.equal(b.length,input.bytes);assert.equal(hash(b),input.sha256);}
for(const argument of ['/nostdlib+','/target:exe','/main:Program','/langversion:13','/nullable:enable','/deterministic+','/optimize+','/debug:portable'])assert(rsp.includes(argument));
const refs=compilation.records.filter(r=>['framework-reference','normal-original-reference'].includes(r.kind));
const rspRefs=rsp.filter(s=>s.startsWith('/reference:')).map(s=>s.slice(11).replace(/^"|"$/g,''));
assert.equal(refs.length,rspRefs.length);assert.equal(refs.length,179);
for(const r of refs)assert(rspRefs.some(n=>n.replaceAll('\\','/').endsWith('/'+r.selected)));
for(const r of refs.filter(r=>r.kind==='normal-original-reference'))assert.equal(r.sha256,hash(read('selected/original/'+path.posix.basename(r.selected))));
const priorInput=json('consumer/preparation-v1/inputs.json').records.find(r=>r.kind==='source');
assert.equal(hash(read('consumer/preparation-v1/Program.cs')),priorInput.sha256);
assert.equal(read('consumer/preparation-v1/Program.cs').length,priorInput.bytes);
assert.equal(json('consumer/preparation-v1/provenance.json').compilerInvocations,0);
const receiptNames=manifest.files.map(f=>f.path).filter(n=>n.startsWith('evidence/')&&n.endsWith('.receipt.json'));
const native=receiptNames.map(n=>({name:n,record:json(n)})).filter(r=>Number.isInteger(r.record.nativePid));
assert.equal(native.length,12);
for(const {record:r}of native){
  assert(r.nativeExited&&r.bothStreamsDrained&&r.observedDescendantsDrained);assert.equal(r.activation,'. .\\activate.ps1');
  for(const [k,v]of Object.entries({DOTNET_GENERATE_ASPNET_CERTIFICATE:'false',DOTNET_ADD_GLOBAL_TOOLS_TO_PATH:'false',MSBUILDDISABLENODEREUSE:'1'}))assert.equal(r.environment[k],v);
  assert.equal(r.policyHoldActive,false);assert.equal(r.exhaustiveDescendantCensus,false);
  assert(r.nativeCreationTimeUtc&&r.wrapperCreationTimeUtc);assert(!r.environment.DOTNET_STARTUP_HOOKS);
  assert(r.environment.DOTNET_CLI_HOME.startsWith(historicalPreparationRoot+'\\work\\'));
  for(const p of r.observedProcesses)assert(p.creationDate);
  if(r.recorderSha256)assert.equal(r.recorderSha256,hash(read('Run-Native.ps1')));
  else{assert.equal(r.label,'default-generate-norestore');assert.equal(r.recorderVersion,'F182-F186-022-private-scratch-atomic-identities');}
  read(`evidence/${r.label}.stdout.txt`);read(`evidence/${r.label}.stderr.txt`);
}
const byLabel=new Map(native.map(r=>[r.record.label,r.record]));
const compiles=native.filter(r=>r.record.arguments[0]==='exec'&&path.win32.basename(r.record.arguments[1]).toLowerCase()==='csc.dll');
assert.equal(compiles.length,1);assert.equal(compiles[0].record.exitCode,0);assert(compiles[0].record.arguments.includes('/noconfig'));
assert.deepEqual(native.filter(r=>r.record.exitCode!==0).map(r=>r.record.label).sort(),['default-generate-norestore','default-native-assets-check']);
assert(text('evidence/default-generate-norestore.stdout.txt').includes('MSB4036'));
assert(text('evidence/default-native-assets-check.stdout.txt').includes('NETSDK1004'));
const selection=json('native-selection.json'),reconciliation=json('native-reconciliation.json'),supplemental=json('supplemental-selection.json');
const common=images.get('selected/common/AutoPerf.Identity.RoleNames.dll');assert(common);
const summaries=[];
for(const role of ['original','default']){
  const directory=initial.images[role].directory,before=new Map(initial.images[role].files.map(f=>[f.path,f])),after=new Map(final.images[role].files.map(f=>[f.path,f]));
  for(const f of before.values())assert.deepEqual(after.get(f.path),f);
  assert.equal(after.size-before.size,4);
  for(const f of selected.files.filter(f=>f.role===role&&f.source.toLowerCase().startsWith((directory+'\\').toLowerCase()))){
    const relative=f.source.slice(directory.length+1).replaceAll('\\','/'),declared=before.get(relative);assert(declared);assert.equal(declared.sha256,f.sha256);assert.equal(declared.bytes,f.bytes);
  }
  const evaluation=json(role==='original'?'reuse/capsule/evidence/original-native-evaluation.stdout.txt':'evidence/default-native-evaluation.stdout.txt').Properties;
  assert.equal(evaluation.TargetFramework,'net12.0');assert.equal(evaluation.IsTestProject,'true');assert.equal(evaluation.IsUnitTestProject,'true');assert.equal(evaluation.IsShipping,'false');
  const depsPath=`selected/${role}/${selection.assembly}.deps.json`,deps=json(depsPath),declaration=json('native-declarations.json').find(d=>d.role===role);
  assert.equal(declaration.commit,graphs[`${role}Commit`]);assert.equal(declaration.completeDependencyDeclaration,depsPath);assert.deepEqual(declaration.target,deps.runtimeTarget);
  assert.deepEqual(declaration.sourceBuiltProjects,Object.entries(deps.libraries).filter(([,v])=>v.type==='project').map(([name,value])=>({name,...value})));
  assert.deepEqual(declaration.packages,Object.entries(deps.libraries).filter(([,v])=>v.type==='package').map(([name,value])=>({name,...value})));
  const reports=reconciliation.reports.filter(r=>r.role===role);assert.equal(reports.length,1);
  for(const report of reports){
    const {role:recordedRole,report:filename,invocation,...saved}=report;assert.equal(recordedRole,role);
    assert.deepEqual(reconcile(text(filename),selection,directory),saved);assert.equal(byLabel.get(invocation)?.exitCode,0);
  }
  const owner=images.get(`selected/${role}/${selection.assembly}.dll`),producer=images.get(`selected/${role}/Microsoft.Extensions.Identity.Core.dll`);
  const coreLib=images.get(`selected/${role}/runtime/System.Private.CoreLib.dll`),result=json(`evidence/${role}-supplemental-v1.json`);
  const receipt=byLabel.get(`${role}-supplemental-v1`);assert.equal(receipt?.exitCode,0);assert.equal(receipt.checkout,graphs[`${role}Path`]);
  for(const [option,suffix]of [['--depsfile','deps.json'],['--runtimeconfig','runtimeconfig.json']]){
    const index=receipt.arguments.indexOf(option);assert(index>=0);assert.equal(receipt.arguments[index+1],`${directory}\\${selection.assembly}.${suffix}`);
  }
  assert.equal(result.role,role);assert.equal(result.exitCode,0);assert.equal(result.complete,true);assert.equal(result.rows.length,supplemental.rows.length);
  for(const [reported,actual]of [[result.owner,owner],[result.managerProducer,producer],[result.coreLib,coreLib],[result.consumer,common]]){
    assert.equal(reported.sha256,actual.sha256);assert.equal(reported.mvid,actual.parsed.mvid);
  }
  assert.equal(result.owner.location,`${directory}\\${selection.assembly}.dll`);
  assert.equal(result.managerProducer.location,`${directory}\\Microsoft.Extensions.Identity.Core.dll`);
  let checks=0;
  for(const expected of supplemental.rows){
    const rows=result.rows.filter(r=>r.name===expected.name);assert.equal(rows.length,1);const r=rows[0];assert.equal(r.outcome,'Passed');assert.equal(r.failure,null);
    assert.equal(r.checks.length,expected.assertions);assert(r.checks.every(c=>c.passed===true));
    assert.equal(new Set(r.checks.map(c=>c.name)).size,r.checks.length);
    for(const required of expected.requiredChecks)assert(r.checks.some(c=>c.name===required));
    if(Object.hasOwn(expected.parameters,'nullFirst'))assert.equal(r.checks.find(c=>c.name==='null-property-and-enumeration-order-observed').observed.nullFirst,expected.parameters.nullFirst);
    checks+=r.checks.length;
  }assert.equal(checks,185);
  const modules=json(`evidence/${role}-native-role-names.modules.json`),nativeReceipt=byLabel.get(`${role}-native-role-names`);
  assert(modules.completed&&modules.observations.length>0);assert(nativeReceipt&&!nativeReceipt.environment.DOTNET_STARTUP_HOOKS);
  const pids=new Set(nativeReceipt.observedProcesses.filter(p=>p.name==='testhost.exe').map(p=>p.processId));
  for(const observation of modules.observations)assert(pids.has(observation.processId));
  const runtime=runtimes.images.find(r=>r.role===role),requested=json(`selected/${role}/${selection.assembly}.runtimeconfig.json`).runtimeOptions.framework.version;
  assert(runtime.directory.endsWith(requested));
  for(const [filename,actual]of [['testhost.exe',null],['testhost.dll',null],[`${selection.assembly}.dll`,owner],['Microsoft.Extensions.Identity.Core.dll',producer]]){
    const observed=modules.files.find(f=>path.win32.basename(f.path).toLowerCase()===filename.toLowerCase());
    assert(observed,'Actual native testhost snapshot includes '+filename);assert(modules.observations.some(o=>o.modulePaths.includes(observed.path)));
    assert.equal(observed.sha256,actual?.sha256??hash(read(`selected/${role}/${filename}`)));
  }
  for(const observed of runtime.selected){
    assert(modules.files.some(f=>f.path===observed.path&&f.sha256===observed.sha256));assert(modules.observations.some(o=>o.modulePaths.includes(observed.path)));
    const b=read(observed.selected);assert.equal(hash(b),observed.sha256);assert.deepEqual(inspectPe(b).version,{fileVersion:observed.fileVersion,productVersion:observed.productVersion});
    const relative=path.win32.relative(runtime.directory,observed.path);
    if(!relative.startsWith('..'))assert.equal(runtime.files.find(f=>f.path===relative.replaceAll('\\','/'))?.sha256,observed.sha256);
  }
  const nativeCoreLib=runtime.selected.find(f=>path.posix.basename(f.selected)==='System.Private.CoreLib.dll');
  const nativeClr=runtime.selected.find(f=>path.posix.basename(f.selected)==='coreclr.dll');assert(nativeCoreLib&&nativeClr);
  assert.equal(nativeCoreLib.sha256,result.coreLib.sha256);
  for(const suffix of ['-identity.json.entry.json','-identity.json']){
    const identity=json(`evidence/${role}-supplemental-v1${suffix}`);assert(identity.creationTimeUtc);assert.equal(identity.coreLib.sha256,nativeCoreLib.sha256);
    assert(identity.nativeModules.some(m=>m.name==='coreclr.dll'&&m.sha256===nativeClr.sha256));
    for(const assembly of identity.assemblies.filter(a=>a.location)){
      const ownRelative=path.win32.relative(directory,assembly.location),runtimeRelative=path.win32.relative(runtime.directory,assembly.location);
      const file=!ownRelative.startsWith('..')?after.get(ownRelative.replaceAll('\\','/')):!runtimeRelative.startsWith('..')?runtime.files.find(f=>f.path===runtimeRelative.replaceAll('\\','/')):null;
      assert(file,'Observed supplemental managed assembly belongs to declared complete role image/shared runtime');assert.equal(file.sha256,assembly.sha256);
    }
  }
  const methods=typeMethods(read(owner.selected),'Microsoft.AspNetCore.Identity.InMemory','InMemoryStore`2');
  for(const name of ['AddToRoleAsync','RemoveFromRoleAsync','IsInRoleAsync','GetUsersInRoleAsync'])assert(methods.includes(name));
  assert(methods.some(n=>n.endsWith('.FindByNameAsync')));
  summaries.push({role,nativeRows:reports[0].rows.length,supplementalRows:result.rows.length,assertions:checks,requestedRuntime:requested,
    ownerMvid:owner.parsed.mvid,managerMvid:producer.parsed.mvid,coreLibMvid:coreLib.parsed.mvid,nativeSnapshots:modules.observations.length,nativeModuleFiles:modules.files.length});
}
const closing=json('closing.json'),terminal=json('TERMINAL.json');
const priorClosing=json('closing-attempt-v0/closing.json'),results=json('RESULTS.json');
assert.deepEqual(closing.candidates.map(c=>c.id).sort(),findings);assert(closing.candidates.every(c=>c.status==='pending'));
assert.equal(text('evidence/closing-ls-remote.stdout.txt').trim(),closing.lsRemote);assert.deepEqual(json('evidence/closing-upstream-repository.stdout.txt'),closing.upstreamRepository);
assert.equal(closing.coordinatorHead,entry.coordinator.head);assert.equal(closing.coordinatorBranch,entry.coordinator.branch);
assert.deepEqual(closing.coordinatorStatus,entry.coordinator.status?entry.coordinator.status.split(/\r?\n/):[]);
for(const g of closing.privateGraphs){assert.equal(g.head,graphs[`${g.role}Commit`]);assert.deepEqual(g.status,[]);}
assert(closing.commands.every(c=>c.exitCode===0&&c.exited&&c.bothStreamsDrained&&c.creationTimeUtc));
assert.deepEqual(closing.commands.slice(0,priorClosing.commands.length),priorClosing.commands);
assert.equal(closing.commands.length,13);
assert.equal(closing.reusedDefaultGraph.head,graphs.previousDefaultCommit);assert.deepEqual(closing.reusedDefaultGraph.status,[]);
assert.equal(closing.reusedDefaultGraph.checkout,'C:\\src\\ap-F173-d013');
for(const suffix of ['head','status']){
  const invalid=closing.commands.find(c=>c.label===`closing-reused-default-${suffix}`);
  assert.equal(invalid.arguments[2],null);
  const label=`closing-reused-default-${suffix}-v1`,corrected=closing.commands.find(c=>c.label===label);
  assert(corrected&&closing.scopeCorrection.correctedCommands.includes(label));
  assert.deepEqual(corrected.arguments,['--no-pager','-C',closing.reusedDefaultGraph.checkout,...(suffix==='head'?['rev-parse','HEAD']:['status','--porcelain=v1','-uall'])]);
  assert.deepEqual(json(`evidence/${label}.closing-command.json`),corrected);
  assert.equal(text(`evidence/${label}.stdout.txt`).trim(),suffix==='head'?graphs.previousDefaultCommit:'');
  assert.equal(text(`evidence/${label}.stderr.txt`),'');
}
assert(terminal.allRecordedNativeInvocationsTerminal&&terminal.bothStreamsDrained&&terminal.observedDescendantsDrained);
assert.equal(terminal.dotnetInvocationCount,native.length);assert.equal(terminal.stillOwned.length,0);assert.equal(terminal.exhaustiveHistoricalPidCensus,false);
assert.equal(terminal.closingReadOnlyCliInvocations,closing.commands.length);
assert.deepEqual(terminal.labels.sort(),native.map(r=>r.record.label).sort());
assert.equal(json('closing-reuse-integrity.json').allDonorNativeRuntimeAndTargetFilesUnchanged,true);
assert.deepEqual(results.findings,findings);assert(results.state.startsWith('PENDING'));
assert.equal(results.source.original,graphs.originalCommit);assert.equal(results.source.defaultObservedAtEntryAndBuilt,graphs.defaultCommit);
assert.equal(results.source.defaultAtClosing,closing.lsRemote.split(/\s+/)[0]);
assert.equal(results.source.closingMainWasNotBuiltOrTested,results.source.defaultAtClosing!==graphs.defaultCommit);
assert.deepEqual(results.native,reconciliation.reports);
assert.equal(results.newNativeRowExecutions,reconciliation.reports.reduce((n,r)=>n+r.rows.length,0));
for(const s of summaries){
  const saved=results.supplemental.find(r=>r.role===s.role),raw=json(`evidence/${s.role}-supplemental-v1.json`);
  assert.equal(saved.passedAssertions,s.assertions);assert.equal(saved.rows.length,s.supplementalRows);
  assert.deepEqual(saved.rows.map(r=>[r.name,r.outcome,r.assertions,r.failedAssertions]),raw.rows.map(r=>[r.name,r.outcome,r.checks.length,r.checks.filter(c=>!c.passed).length]));
}
assert.equal(results.commonCompilation.newSuccessfulExplicitConsumerCompilations,compiles.length);
for(const c of results.commands){
  const r=byLabel.get(c.label);assert(r);assert.equal(c.executable,r.executable);assert.deepEqual(c.arguments,r.arguments);
  assert.equal(c.nativePid,r.nativePid);assert.equal(c.creationTimeUtc,r.nativeCreationTimeUtc);assert.equal(c.exitCode,r.exitCode);
}
assert.equal(results.commands.length,native.length);
console.log(JSON.stringify({result:'PASS',scope:'NEW F182-F186 preparation; findings remain PENDING',readOnly:true,manifestFiles:manifest.count,manifestBytes:manifest.bytes,
  manifestSha256:hash(manifestBytes),freshUniquePeImages:peFiles.size,freshUniquePortablePdbs:pdbFiles.size,
  selectedManagedImages:selected.images.length,associatedPdbPairs:selected.pairs.length,rawPdbDocuments:selected.documents.length,gitMerkleSourceProofs:proofs.proofs.length,
  newNativeReports:reconciliation.reports.length,newNativeRowExecutions:18,supplemental:summaries,newCommonConsumerCompilations:compiles.length,
  newDotnetRoots:native.length,nativeUnion:final.union.length,nativeDifferences:final.differences.length,runtimeUnion:runtimes.union.length,runtimeDifferences:runtimes.differences.length,
  reusedHistoricalCapsule:{files:reuse.files,bytes:reuse.bytes,manifestSha256:reuse.donorManifestSha256},
  boundary:'Fresh byte/PE/PDB/document/Git-Merkle verification and real XML/result reconciliation only; no native execution or complete execution/compiler/OS closure.'},null,2));
