'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=__dirname,read=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8').replace(/^\uFEFF/,''));
const graphs=read('graph-creation.json'),closing=read('closing.json'),terminal=read('TERMINAL.json');
const selected=read('selected-records.json'),native=read('native-reconciliation.json'),common=read('consumer/copies.json');
const invocations=fs.readdirSync(path.join(root,'evidence')).filter(n=>n.endsWith('.receipt.json'))
  .map(n=>({receipt:`evidence/${n}`,...read(`evidence/${n}`)})).filter(r=>Number.isInteger(r.nativePid)).sort((a,b)=>a.startedAt.localeCompare(b.startedAt));
assert.equal(invocations.length,12);assert.equal(invocations.filter(r=>r.arguments[0]==='exec'&&path.win32.basename(r.arguments[1]).toLowerCase()==='csc.dll').length,1);
const supplemental=['original','default'].map(role=>{
  const result=read(`evidence/${role}-supplemental-v1.json`),identity=read(`evidence/${role}-supplemental-v1-identity.json`);
  assert(result.complete&&result.exitCode===0);
  return {role,report:`evidence/${role}-supplemental-v1.json`,identity:`evidence/${role}-supplemental-v1-identity.json`,
    identities:{owner:result.owner,managerProducer:result.managerProducer,coreLib:result.coreLib,consumer:result.consumer,
      frameworkDescription:identity.frameworkDescription,nativeModules:identity.nativeModules},
    rows:result.rows.map(r=>({name:r.name,outcome:r.outcome,boundary:r.boundary,assertions:r.checks.length,failedAssertions:r.checks.filter(c=>!c.passed).length})),
    passedAssertions:result.rows.reduce((s,r)=>s+r.checks.length,0)};
});
const images=read('native-images-final.json'),runtimes=read('runtime-images.json'),declarations=read('native-declarations.json');
const results={
  state:'PENDING bounded preparation only; parent acceptance/outcomes not inferred',
  findings:['F182','F183','F184','F185','F186'],
  actualAgentId:'d766df6d-0b55-44d6-846d-7050b83f2eea',
  scope:'One nonshipping Identity in-memory test-store class; actual public managers and real store native consumer paths; no candidate or performance work',
  source:{original:graphs.originalCommit,defaultObservedAtEntryAndBuilt:graphs.defaultCommit,defaultAtClosing:closing.lsRemote.split(/\s+/)[0],
    closingMainWasNotBuiltOrTested:closing.lsRemote.split(/\s+/)[0]!==graphs.defaultCommit,originalReusedReadOnly:graphs.originalPath,
    independentWholeDefault:graphs.defaultPath,donorDefaultReadOnly:'C:\\src\\ap-F173-d013',donorDefaultCommit:graphs.previousDefaultCommit,
    target:'src/Identity/test/InMemory.Test/InMemoryStore.cs',targetBlob:'e5522d97b7fe906dca749215c6f01019bd5fb55b',
    ownership:'OWNERSHIP.json',coordinatorEntryAndClosingBranch:closing.coordinatorBranch,coordinatorEntryAndClosingHead:closing.coordinatorHead,
    coordinatorStatusUnchanged:true,coordinatorReportsOrIndexByteIdentityNotAttested:true},
  nativeBoundary:'Actual unchanged source-built project VSTest execution, not NativeAOT; nine unconditional inherited InMemoryStoreTest Facts, no selected Theory rows; no SQLite fixture claim',
  native:native.reports,
  uniqueNativeFacts:9,newNativeRowExecutions:18,
  supplemental,
  commonCompilation:{
    newSuccessfulExplicitConsumerCompilations:1,newFailedConsumerCompilations:0,acceptedVersion:'v1',
    historicalReusedF173ConsumerCompilationNotNewWork:1,
    successfulNewInputPreparation:1,precompilerSourceFinalization:'Two boundary amendments before first C# compilation; exact earlier source recovered and checksum/length matched to prior preparation, retained under consumer/preparation-v1.',
    preparationOnlyFinalizerFailure:'consumer-input-finalization-failure-v0 (CRLF/LF assumption), preserved before correction; no compiler started',
    compilerSdk:'12.0.100-alpha.1.26557.102',languageVersion:'13',explicitFrameworkReferences:176,explicitNormalOriginalReferences:3,
    explicitInputRecords:185,explicitResponseFile:'consumer/compile.rsp',inputs:'consumer/inputs.json',acceptedSource:'consumer/Program.cs',
    acceptedPayload:common.common,copyRecords:'consumer/copies.json',
    execution:'Same DLL/PDB/deps/runtimeconfig bytes in both whole native graphs. Each process explicitly overrides deps/runtimeconfig with its complete normal role owner configs.'},
  graphInventories:{
    native:Object.fromEntries(Object.entries(images.images).map(([role,i])=>[role,{files:i.count,bytes:i.bytes,commit:i.commit}])),
    nativeUnion:images.union.length,nativeDifferences:images.differences.length,
    runtime:runtimes.images.map(i=>({role:i.role,files:i.count,bytes:i.bytes,directory:i.directory})),
    runtimeUnion:runtimes.union.length,runtimeDifferences:runtimes.differences.length,
    nativeDeclared:declarations.map(d=>({role:d.role,sourceBuiltProjects:d.sourceBuiltProjects.length,packages:d.packages.length})),
    boundary:'Every owner/common/shared-runtime file path, including JSON/PDB/EXE/nonDLL paths, is inventoried and keyed unions/differences are recomputed by auditor. Inventories are not complete copied execution or compiler closures.',
    originalHistoricalExtraFiles:'Original private image retains four older F173 common companions from the full 275-file donor copy; they are not new compilations or executed F182 common payloads.'},
  attestation:{selectedFiles:selected.files.length,selectedManagedImages:selected.images.length,completePortablePdbPairs:selected.pairs.length,
    allRawDocumentsOfSelectedPdbs:selected.documents.length,gitMerkleProofs:read('git-source-proofs.json').proofs.length,rawCommitTreeObjects:read('git-source-proofs.json').objects.length,
    selected:'selected-records.json',sourceProofs:'git-source-proofs.json',rawNativeXml:'evidence/native-original/original-role-names.trx and evidence/native-default/default-role-names.trx',
    readOnlyAudit:'node --permission --allow-fs-read=\"<capsule>\" --no-addons \"<capsule>\\Audit.cjs\"',
    auditorBoundary:'Only built-in Node and retained JS helpers. Fresh PE/MVID/CodeView/PDB ID/Document/raw checksum/Merkle and structural XML/definition/result/entry validation; not a replay or complete compiler/runtime/OS closure attestation.'},
  initializationAndFailureHistory:[
    {state:'initialization-failure-v0',failure:'Fresh main advanced from expected 90f48 to adf2; rejected before native work'},
    {state:'initialization-failure-v1',failure:'Local clone --no-hardlinks inherited donor alternates unexpectedly; fail-closed before dotnet. Raw alternate retained; owned repack copied borrowed objects, removed only owned alternates, fsck passed.'},
    {state:'evidence/default-generate-norestore.receipt.json',failure:'MSB4036 missing GenerateFileFromTemplate; exact project restored after real missing dependency and normal generation passed'},
    {state:'evidence/default-native-assets-check.receipt.json',failure:'NETSDK1004 missing new checkout assets; unchanged normal dependency restore/build passed'},
    {state:'consumer-input-finalization-failure-v0',failure:'Preparation-only LF assumption failed on actual CRLF; exact script/streams retained; corrected before first C# compile'},
    {state:'closing-attempt-v0',failure:'Two donor Git -C arguments were null due function-local path variable. Native command success did not prove donor scope; integrity assertion caught wrong coordinator HEAD. Exact raw results retained; two explicit-path read-only commands corrected donor proof, no test/compiler rerun.'}
  ],
  commands:invocations.map(r=>({label:r.label,receipt:r.receipt,checkout:r.checkout,executable:r.executable,arguments:r.arguments,
    nativePid:r.nativePid,creationTimeUtc:r.nativeCreationTimeUtc,startedAt:r.startedAt,exitedAt:r.exitedAt,exitCode:r.exitCode,
    stdout:`evidence/${r.label}.stdout.txt`,stderr:`evidence/${r.label}.stderr.txt`,nativeExited:r.nativeExited,bothStreamsDrained:r.bothStreamsDrained,
    observedDescendantsDrained:r.observedDescendantsDrained})),
  holdRelease:{id:'F140-027',ack:'evidence/F140-HOLD-027-ack.json',release:'evidence/F140-RELEASE-027-observed.json',
    heldWorkQuiesced:true,noNewDotnetAfterRelease:true,remainingWork:'Offline verification/reporting/seal only'},
  terminal:{record:'TERMINAL.json',newDotnetRoots:terminal.dotnetInvocationCount,successes:terminal.successes,prerequisiteFailures:terminal.prerequisiteFailures,
    knownPidCreationObservations:terminal.processObservations.length,ownedRemaining:terminal.stillOwned.length,bothStreamsDrained:terminal.bothStreamsDrained,
    observedDescendantsDrained:terminal.observedDescendantsDrained,closingReadOnlyCliRoots:terminal.closingReadOnlyCliInvocations,
    boundary:terminal.boundary},
  exclusions:[
    'No implementation/candidate, metric, benchmark, outcome, publication, policy/ledger mutation, source/config/permanent-test change, browser/hosted execution, or new scope.',
    'Closing main 0328b915263b84541e57b75f824e79a75f2d5ed3 was not built or tested; whole-Default evidence is explicitly entry pin adf2e9d22addd1461c6c25e8a8f411be28b81100.',
    'Different-ID same-name re-creation with retained orphan membership was not run; new-ID case follows cleanup. Unselected native/theory rows, custom normalizers/validators, arbitrary direct property mutation, concurrency, broad culture/Unicode/cardinality and cancellation/disposal matrices unexecuted.',
    'Native module snapshots are sampled and not an exhaustive historical assembly/module/process census. Native MVID is freshly parsed selected file identity tied to sampled file hashes, not native in-process reflection; reflection observations are supplemental.',
    'Selected PE-only dependencies/compiler/references/native modules have no selected PDB source completeness beyond the seven paired PDBs. Full owner/runtime inventories are not all copied bytes; all explicit common inputs retained but not full SDK/native compiler/execution/OS closure.',
    'Source reachability is pinned Identity source/history/literal references plus local LSP, not a resolved whole-repository consumer census. No hotness/native/material/suite-speedup or universal multi-application inference.'
  ],
  seal:'MANIFEST.json includes every capsule file except itself and MANIFEST.sha256, including all historical/helper/reused files. Exact final counts/hash and read-only audit process receipts are outside the sealed capsule under the preparation root.'
};
const output=path.join(root,'RESULTS.json');assert(!fs.existsSync(output));fs.writeFileSync(output,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify({result:'PASS',nativeFacts:9,nativeExecutions:18,supplemental:supplemental.map(s=>({role:s.role,rows:s.rows.length,assertions:s.passedAssertions})),
  newCommonCompilations:1,defaultAtEntry:graphs.defaultCommit,mainAtClosing:results.source.defaultAtClosing,dotnetRoots:terminal.dotnetInvocationCount,ownedRemaining:terminal.stillOwned.length}));
