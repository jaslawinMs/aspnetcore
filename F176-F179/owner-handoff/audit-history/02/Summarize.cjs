'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { sha } = require('./Inventories.cjs');
const root = __dirname;
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const graphs = read('graph-creation.json'), identity = read('identity-index.json'), selected = read('selected-records.json');
const terminal = read('TERMINAL.json'), closing = read('closing.json'), runtime = read('runtime-images.json');
const normal = read('native-images.json'), final = read('native-images-final.json'), other = read('supplemental-native-images.json');
const native = ['modules', 'hooked'].flatMap(mode => read(`native-reconciled-${mode}.json`).runs);
const commands = fs.readdirSync(path.join(root, 'evidence')).filter(name => name.endsWith('.receipt.json')).sort().map(name => {
  const command = read('evidence/' + name);
  return { label: command.label, tool: command.tool, checkout: command.checkout, activation: command.activation,
    executable: command.executable, arguments: command.arguments, exitCode: command.exitCode, result: command.exitCode === 0 ? 'Passed command' : 'Failed attempt preserved',
    receipt: 'evidence/' + name, stdout: `evidence/${command.label}.stdout.txt`, stderr: `evidence/${command.label}.stderr.txt`,
    processId: command.nativePid, creationUtc: command.nativeCreationUtc, bothStreamsDrained: command.bothStreamsDrained };
});
const compileHistory = ['01', '02', '03', '04', '05'].map(number => {
  const value = read(`consumer/compile-history/common-compile-${number}/attempt.json`);
  return { label: value.label, actualCompilerStarted: number !== '01', exitCode: value.exitCode, successful: value.successful,
    status: number === '01' ? 'Wrapper parameter binding failed before native/activation/csc' : number === '02' ? 'Csc CS0104 Route attribute ambiguity' :
      number === '03' ? 'Csc CS0117 explicit IReadOnlyList count access required' : number === '04' ? 'Successful, superseded; Original producer subsequently reached missing normal transitive StaticAssets dependency' :
        'Accepted successful C#13 compile against Original native references; exact same four files copied to both roles',
    outputs: value.outputs };
});
const commonStem = 'AutoPerf.Mvc.Initialization.Contracts';
const results = {
  findings: ['F176', 'F177', 'F178', 'F179'], status: 'PENDING', candidates: 0, comparisons: 0, measurements: 0,
  source: { original: graphs.originalCommit, defaultAtEntryAndBuild: graphs.defaultCommit, closingDefaultObservation: closing.lsRemote, closingObservedAtUtc: closing.observedAtUtc,
    boundary: closing.freshnessBoundary, endpointBlob: 'df6d1f42affe726840a5ad7a7fee6e397e654afd', razorBlob: '162da5dfaad6234ae31ad50fd2085c806fa1fdc3' },
  producerBoundaries: {
    F176: 'Real AddControllersWithViews, controller/action discovery, UseRouting-created DefaultEndpointRouteBuilder, MapControllers repeated reuse of one native data-source DefaultBuilder/concrete Dictionary<string,object>; real WithStaticAssets resolver and materialized attribute endpoint metadata. Public sharing of one native data source across two real builders preserves the first actual builder/resolver.',
    F177: 'Real repeated MapDefaultControllerRoute creates two conventional routes and separate returned route-builder Items while retaining shared DefaultBuilder.Items. Actual two action + one attribute + two link-only endpoints consume global/per-route conventions. WithStaticAssets on fresh returned route builder cannot find the separate default Items; characterized unchanged behavior, not a proposed bug or change.',
    F178: 'Real two named conventional mappings, separate returned route builders, reused data source/default items, actual route patterns/global/per-route conventions and real downstream static-resource metadata. Explicit public data-source sharing establishes retained first-builder identity without private setter/sentinel injection.',
    F179: 'Existing unchanged RazorBuildWebSite.Views precompiled assembly/factory/loader/ApplicationParts and real singleton compiler/provider/page factory. Three native view/page paths; actual task/descriptor identity, case-insensitive lookup, normalization, miss and view ExecuteAsync literal. Two collectible AssemblyLoadContexts of the same native PE produce real cross-part duplicate identifiers with distinct Type identities; both registration orders prove first-part wins through cache, factory and executed view. Constructed topology, not normal application prevalence.'
  },
  semanticBoundaries: [
    'DefaultBuilder.Items is concretely Dictionary<string,object> with actual case-sensitive default string comparer; it is not an arbitrary external IDictionary. Conventional-route builders own different empty Items.',
    'Compiler cache is concretely Dictionary<string,Task<CompiledViewDescriptor>> with StringComparer.OrdinalIgnoreCase; first actual descriptor/task identity is retained. No replacement/eager-value/concurrency equivalence is asserted.',
    'Original source guard avoids constructing Task.FromResult for rejected duplicate view descriptors. No implementation/candidate was authored or compared.',
    'Native Core tests inject action descriptors; native Razor unit tests inject/mock provider/part inputs. Their contract evidence does not establish public producer reachability by itself; supplemental real-producer scenarios supply the stated reachability.',
    'Same-part case-only duplicate rejection is native provider unit-contract evidence with mocked items, not demonstrated normal precompiled-asset topology.',
    'No HTTP hosting/request/render-pipeline or browser execution; Razor view page-factory plus actual native ExecuteAsync is the selected consumer boundary. No app cardinality/frequency, request hotness, performance, concurrent mapping, ALC reclamation or hot-reload claim. Compiler cache may also rebuild after hot reload; that path is excluded.'
  ],
  nativeRuns: native.map(run => ({ role: run.role, kind: run.kind, mode: run.mode, trx: run.trx, receipt: run.receipt, counters: run.counters, rows: run.rows })),
  supplemental: identity.supplemental,
  compilation: { accepted: 'common-compile-05', actualCscInvocations: 4, successfulCscInvocations: 2, acceptedArtifacts: 1,
    history: compileHistory, acceptedSha256: sha(fs.readFileSync(path.join(root, 'consumer', 'accepted', commonStem + '.dll'))),
    acceptedMvid: selected.pairs.find(pair => pair.kind === 'common-compile-05').mvid,
    explicitInputRecords: read('consumer/inputs.json').records.length,
    boundary: 'One accepted consumer compiled against Original, not separately compiled by role. Two failures and successful superseded compile04 are retained; do not describe the history as only one successful compilation. Actual compiler host/CoreCLR was not separately sampled; copied managed compiler/response/reference/source inputs do not attest a full native SDK/toolchain closure.' },
  dependencyRepair: 'Native test project refs use transitive PrivateAssets; unchanged Razor.Test.deps does not declare StaticAssets. After actual producer-01 FileNotFoundException, accepted consumer explicitly loads each role-own normally compiled StaticAssets PE from that graph. No native .deps/runtimeconfig or native project image was replaced/edited. Only exact common four-file helpers were added to native Razor output.',
  nativeImages: { initialCounts: Object.fromEntries(Object.entries(normal.images).map(([kind, roles]) => [kind, { original: roles.original.count, default: roles.default.count }])),
    finalCounts: Object.fromEntries(Object.entries(final.images).map(([kind, roles]) => [kind, { original: roles.original.count, default: roles.default.count }])),
    additionalCounts: Object.fromEntries(Object.entries(other.images).map(([kind, roles]) => [kind, { original: roles.original.count, default: roles.default.count }])),
    boundary: 'Full all-file unions/differences; no helper/JSON/PDB/EXE/non-DLL or prefix exemption. Every existing native file is unchanged between initial/final inventories; exactly the four validated common files were added per Razor output.' },
  runtime: { originalAssertion: runtime.images.assertion.original.version, defaultAssertion: runtime.images.assertion.default.version,
    sdk: runtime.images.sdk.original.version, actualHostfxr: runtime.selectedModules.filter(module => module.classification === 'assertion' && module.name === 'hostfxr.dll').map(module => ({ role: module.role, source: module.source, version: module.version })),
    counts: Object.fromEntries(Object.entries(runtime.images).map(([kind, roles]) => [kind, { original: roles.original.count, default: roles.default.count }])),
    boundary: 'Plain msbuild -getProperty RuntimeFrameworkVersion is empty before runtime-resolution targets; generated unchanged native runtimeconfig and actual loaded CoreLib/CoreCLR are independently checked instead. Actual native testhost initialize/targeted owner load records and unhooked/hooked bounded Process.Modules data establish the stated process/module identities. All four native testhost ProcessExit snapshots are absent; SDK exit snapshots are not assertion managed closure. Full runtime-directory hash inventories are not copied/exhaustive distribution attestations; Default inventory includes hostfxr.dll and WasiHttpWorld_component_type.wit without exemptions. Loaded hostfxr65 and SDK runner57 are not assertion CoreCLR69.' },
  selectedEvidence: { pePdbPairs: selected.pairs.length, pdbDocuments: selected.documents.length, actualRawDocumentRecords: selected.documents.filter(document => document.selected).length,
    logicalOnlyDocuments: selected.logicalOnlyDocuments, gitSourceProofs: read('git-source-proofs.json').proofs.length, rawCommitTreeObjects: read('git-source-proofs.json').objects.length,
    boundary: 'Exactly six historical D:\\k logical Documents (three per native Razor asset PDB) are declared by pinned checked-in C# #pragma checksum directives. Their original raw files are unavailable and not reconstructed/checksum-verified. All actual selected checked-in/generated/embedded C# document bytes are retained. Selected bytes, not a complete native output/runtime/SDK/distribution replay closure.' },
  priorFailures: { nativeCommandAttempts: terminal.nativeCommandCount, nativeSuccessfulCommands: terminal.nativeSuccesses, nativeFailedCommands: terminal.nativeFailuresPreserved,
    additionalPreserved: ['Initial local clone inherited alternates; assertion stopped before checkout/native work; private object store was repacked and dissociated, never donor-mutated.',
      'Initial GenerateFiles task restore and native project assets failures; later actual JS/ANCM prerequisite failures. Normal exact Node workspace prerequisites built after actual missing rimraf, no old Default bundle substitution. Supported UseIisNativeAssets=false used after ANCM prerequisite failure.',
      'Precompile input-copy failure for framework-supplied abstractions; partial files and exact original preparation script retained.',
      'Common wrapper01 invalid parameter, no csc start; failed csc02/03, successful superseded csc04, failed producer01, accepted csc05 and producer runs all preserved.',
      'Offline audit01 rejected an incorrect auditor assumption that plain property evaluation had already resolved RuntimeFrameworkVersion. Its failed manifest, changed source/result overlay, raw output and receipt are retained under audit-history/01; no native assertion failed or was rerun for this audit correction.'] },
  terminal: { knownProcessIdentities: terminal.knownProcessIdentityCount, nativeCommands: terminal.nativeCommandCount, remainingKnownOwnedNative: 0,
    boundary: terminal.boundary },
  audit: { command: 'node Audit.cjs', implementation: 'Read-only built-in Node, selected PE/PDB and EmbeddedSource parsing, raw source/Git Merkle proof, actual structured TRX rows/definitions/entries/counters, raw producer/identity records, full declared inventory unions and terminal-record consistency.',
    actualExecutionReceipt: 'See top-level sealed handoff/audit receipt; auditor does not modify or create capsule evidence. Saved summaries alone are not the audit.' }
};
fs.writeFileSync(path.join(root, 'COMMANDS.json'), JSON.stringify({ commands, boundary: 'Every actual recorded native command, including all failed commands, with exact activation/executable/argument arrays and individual raw result/terminal receipts. Additional pre-native failures and source/Git CLI receipts are retained separately.' }, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'RESULTS.json'), JSON.stringify(results, null, 2) + '\n');
const quote = value => '"' + value.replaceAll('"', '\\"') + '"';
const lines = [
  '# F176–F179 sealed preparation handoff',
  '',
  '**All four PENDING. Candidates 0; comparisons/measurements 0. Coordinator owns acceptance and any outcome/publication.**',
  '',
  '## Immutable source and freshness',
  `- Original: \`${graphs.originalCommit}\`.`,
  `- Whole independently observed entry Default built/tested: \`${graphs.defaultCommit}\` (entry observation 2026-11-20T12:20:08.3000035Z).`,
  `- Closing main observation: \`${closing.lsRemote}\` at ${closing.observedAtUtc}; upstream moved. Built source was NOT relabeled/rebased to this closing head.`,
  '- Endpoint target Git blob: `df6d1f42affe726840a5ad7a7fee6e397e654afd`; Razor compiler blob: `162da5dfaad6234ae31ad50fd2085c806fa1fdc3`. Both identical across the two build pins.',
  '- Private detached tracked-clean graphs with independent no-alternate/no-hardlink object-store creation receipts; coordinator/donors never written. Raw commit/tree membership proofs cover every retained pinned source bridge.',
  '',
  '## Real producer/consumer boundaries',
  ...Object.entries(results.producerBoundaries).map(([id, text]) => `- **${id}:** ${text}`),
  ...results.semanticBoundaries.map(text => '- ' + text),
  '',
  '## Native individual rows and real commands',
  '- Each role passed exactly 3 Core Facts and 8 Razor rows (including all 3 case-lookup InlineData rows) unhooked; the same individual rows were repeated with the identity hook. No unrelated discovery/skipped/support-project count is coverage.',
  '- `native-selection.json`, both `native-reconciled-*.json` and raw eight TRXs retain exact names, parameters, definition/entry/execution IDs, storage/codebase and zero-failure/skip counters. `Audit.cjs` reparses XML, not these summaries alone.',
  ...native.filter(run => run.role === 'original' && run.mode === 'modules').flatMap(run => run.rows.map(row => `  - \`${row.name}\`: Passed on both roles in both modes.`)),
  '',
  'Exact native test commands (from each role checkout after required activation/environment):',
  '```powershell',
  "$env:DOTNET_GENERATE_ASPNET_CERTIFICATE='false'; $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH='false'; $env:MSBUILDDISABLENODEREUSE='1'",
  '. .\\activate.ps1',
  ...commands.filter(command => command.label.endsWith('-modules') || command.label.endsWith('-hooked')).map(command =>
    `# ${command.label}; result: exit ${command.exitCode}, exact selected rows reconciled Passed\n& ${quote(command.executable)} ${command.arguments.map(quote).join(' ')}`),
  '```',
  '',
  '## Common compile and supplemental results',
  '- 9 real-producer rows / 94 checks passed per role. One accepted C#13 compile05 artifact (same DLL/PDB/deps/runtimeconfig bytes) runs with each role own unchanged native deps/runtimeconfig and actual normal runtime. Exact executable/arguments/results are in `COMMANDS.json` and raw receipts.',
  ...compileHistory.map(attempt => `- ${attempt.label}: ${attempt.status}; exit ${attempt.exitCode}.`),
  `- Accepted DLL SHA256: \`${results.compilation.acceptedSha256}\`; MVID \`${results.compilation.acceptedMvid}\`.`,
  '- Four actual csc invocations: two failures and two successes (superseded04, accepted05), plus one failed pre-native wrapper. All sources, response files, outputs, explicit 199 input records, actual 193 references and failed partial input-copy bytes are retained. Do not call this history a single successful compile.',
  '- Actual producer01 missing StaticAssets prerequisite is preserved. Accepted consumer loads the role-own normal StaticAssets PE explicitly because native transitive PrivateAssets excludes it from Razor.Test.deps; no native dependency/config/source substitution was made.',
  '',
  '## Identity, all-file inventories, and limits',
  `- Actual assertion CoreCLR/CoreLib: Original ${results.runtime.originalAssertion}; Default ${results.runtime.defaultAssertion}. Actual SDK/VSTest runner ${results.runtime.sdk} and loaded hostfxr65 are recorded separately.`,
  '- Native testhost PIDs/creation UTC match initialize/actual owner-load events and bounded module samples. **All four native testhost exit snapshots are absent. No full native managed-assembly exit/identity closure is claimed; SDK exit records do not substitute.**',
  '- Plain MSBuild property evaluation leaves RuntimeFrameworkVersion empty before resolution targets. Native generated runtimeconfigs and independently observed actual CoreLib/CoreCLR establish runtime selection; offline audit01’s mistaken plain-evaluation assumption and its prior seal/overlay are preserved under `audit-history/01`.',
  '- Full native/common/runtime inventories and exact unions/differences include helpers, JSON, PDB, EXE and non-DLL paths without prefix exemptions. Native images: Core 389/389 unchanged; Razor 533→537 per role (exact four common additions only); precompiled asset 86/86 unchanged. Additional StaticAssets/JS and SDK/assertion runtime inventories are retained.',
  '- Runtime-directory inventories retain Default extra hostfxr.dll/Wasi WIT and Original .version/differing DAC names. They do not prove an unmodified official SDK/runtime distribution, and uncopied bytes cannot be independently replay-attested.',
  `- Selected: ${selected.pairs.length} actual PE/PDB pairs, ${selected.documents.length} PDB Document records, ${results.selectedEvidence.actualRawDocumentRecords} actual raw document checks; ${results.selectedEvidence.gitSourceProofs} pinned source proofs through ${results.selectedEvidence.rawCommitTreeObjects} raw commit/tree objects.`,
  '- **Six historical logical Razor Documents lack original raw bytes.** Their exact PDB checksum declarations are freshly parsed and matched to pinned checked-in C# #pragma checksum witnesses. The D:\\k raw files were not fabricated or reconstructed. All actual selected native C# input documents (including real embedded generator output) are retained and checksum-checked.',
  '- No complete compiler-native-toolchain, distribution, exhaustive execution or historical process census promise. The capsule is portable offline *evidence*, not a copied full test execution closure.',
  '',
  '## Prior states and terminal ownership',
  `- ${terminal.nativeCommandCount} actual native commands: ${terminal.nativeSuccesses} successful, ${terminal.nativeFailuresPreserved} failed and retained. Initial inherited-alternates failure, missing tasks/assets/JS/ANCM/rimraf, precompile reference-copy failure, invalid wrapper, failed compiles and failed producer are all preserved.`,
  `- ${terminal.knownProcessIdentityCount} known PID+creation identities rechecked; no owned native roots, observed descendants or wrappers remain. Every recorded command stdout/stderr is persisted/drained. Exact UTC observations and PID reuse distinctions are in \`TERMINAL.json\`. This is not arbitrary-process absence.`,
  '- Explicit HOLD F140-027 acknowledgment and RELEASE observation are copied under `control`; all work drained before HOLD acknowledgment and resumed only after explicit release. No watcher/service was started.',
  '- Later sealing/auditor Node completion and manifest hash/selected file counts are in the top-level sealed handoff, outside this immutable capsule.',
  '',
  '## Offline audit',
  '```powershell',
  'node Audit.cjs',
  '```',
  '- Uses only built-in Node/local attributed helpers; no .NET SDK, original checkout, donor, network or package installation is required.',
  '- Manifest/digest are `MANIFEST.json` and `MANIFEST.sha256`; they exclude only themselves. Actual audit execution/result is separately recorded by the sealed top-level handoff. No performance/compatibility-candidate verdict follows from audit PASS.'
];
fs.writeFileSync(path.join(root, 'HANDOFF.md'), lines.join('\n') + '\n');
console.log(JSON.stringify({ nativeCommands: commands.length, nativeRuns: native.length, supplementalRows: 18, commonAccepted: 'common-compile-05', status: 'PENDING' }));
