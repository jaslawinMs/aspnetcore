import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, sha256, requireThat } from './Checks.mjs';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const consumer = path.join(root, 'testassets', 'PreparationConsumer');
const inputs = readJson(path.join(root, 'research', 'consumer-inputs.json'));
for (const input of inputs.inputRecords) {
  const bytes = fs.readFileSync(path.join(root, input.path));
  requireThat(bytes.length === input.bytes && sha256(bytes) === input.sha256, 'Compiler/reference input changed between cohorts');
}
const responsePath = path.join(consumer, 'compile.rsp');
const response = fs.readFileSync(responsePath, 'utf8').replace(/^\/noconfig\r?\n/, '');
fs.writeFileSync(responsePath, response);
inputs.cohort = 2;
inputs.source = { path: 'testassets/PreparationConsumer/Program.cs', sha256: sha256(fs.readFileSync(path.join(consumer, 'Program.cs'))), bytes: fs.statSync(path.join(consumer, 'Program.cs')).size };
inputs.response = { path: 'testassets/PreparationConsumer/compile.rsp', sha256: sha256(Buffer.from(response)), arguments: response.split(/\r?\n/).filter(Boolean) };
inputs.compilerCommandLineOptions = ['/noconfig'];
inputs.noDefaultResponseInPrivateCompilerDirectory = !fs.existsSync(path.join(consumer, 'inputs', 'compiler', 'csc.rsp'));
inputs.predecessor = 'preparation-history/common-cohort-001/consumer-inputs.json';
inputs.change = 'Correct only the passive diagnostic consumer identity assumption: real unchanged AfterControllerActionMethod producer supplies controllerContext as Controller. Keep actual activation identity from Before event, reconcile shared action context and returned/result-executed object identities, and retain observations before assertions. /noconfig moves to actual compiler command line after the first compile warning; no reference/compiler bytes changed.';
inputs.boundary = 'Actual successful native Functional graph as execution primary, augmented only with its absent test-helper owner. Earlier native RuntimeCompilation graph is independent evidence, not merged wholesale. One shared consumer per compiled cohort; no performance measurement.';
fs.writeFileSync(path.join(root, 'research', 'consumer-inputs.json'), JSON.stringify(inputs, null, 2) + '\n');
console.log(JSON.stringify({ result: 'PASS', cohort: 2, compilerInputsUnchanged: inputs.inputRecords.length, sourceSha256: inputs.source.sha256, compilationInvoked: false }));
