'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname,consumer=path.join(root,'consumer');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const filename=path.join(consumer,'inputs.json'),prior=fs.readFileSync(filename),inputs=JSON.parse(prior);
const source=fs.readFileSync(path.join(consumer,'Program.cs')),old=inputs.records.find(r=>r.kind==='source');
let historical=source.toString('utf8');
const removal='        await store.RemoveFromRoleAsync(a, "Missing");\n        Check("F183-missing-role-with-empty-association-list-does-not-evaluate-null-dereference", a.Roles.Count == 0);\n';
assert(historical.includes(removal));historical=historical.replace(removal,'');
const start=historical.indexOf('    private static async Task PublicSetterEmptyName()\n');
const end=historical.indexOf('    private static string Hash',start);
assert(start>0&&end>start);historical=historical.slice(0,start)+historical.slice(end);
const run='        await Run("RoleNames_PublicSetterEmptyNormalizedName", "Actual public setter before validating Update; intentionally invalid stored name, not successful validated creation", PublicSetterEmptyName);\n';
assert(historical.includes(run));historical=historical.replace(run,'');
const historicalBytes=Buffer.from(historical);
assert.equal(hash(historicalBytes),old.sha256,'Recover exact pre-amendment input source against the immutable recorded preparation hash');
assert.equal(historicalBytes.length,old.bytes);
const archive=path.join(consumer,'preparation-v1');
assert(!fs.existsSync(archive));fs.mkdirSync(archive);
fs.writeFileSync(path.join(archive,'Program.cs'),historicalBytes);
fs.writeFileSync(path.join(archive,'inputs.json'),prior);
fs.copyFileSync(path.join(consumer,'compile.rsp'),path.join(archive,'compile.rsp'));
fs.writeFileSync(path.join(archive,'provenance.json'),JSON.stringify({
  compiled:false,compilerInvocations:0,sourceSha256:old.sha256,
  sourceRecovery:'Exact reverse of two precompiler amendments; bytes freshly match the prior successful input-preparation SHA256/length. The old source was not separately copied before those amendments; no compilation used it.',
  retainedOtherInputs:'All compiler/reference files are unchanged at the explicit retained selected paths in inputs.json.',
  amendment:'Add faithful empty-association missing-role branch and public-setter empty-name boundary before first C# compilation.'
},null,2)+'\n');
old.bytes=source.length;old.sha256=hash(source);
inputs.inputPreparationVersion='v2-after-precompiler-boundary-amendments';
inputs.priorSuccessfulInputPreparations=[{version:'v1',compiled:false,retained:'consumer/preparation-v1'}];
fs.writeFileSync(filename,JSON.stringify(inputs,null,2)+'\n');
console.log(JSON.stringify({result:'PASS',currentSourceSha256:old.sha256,archivedSourceSha256:hash(historicalBytes),cSharpCompilerInvocationsSoFar:0}));
