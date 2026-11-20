import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, sha256, requireThat } from './Checks.mjs';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const capsule = path.join(root, 'capsule');
requireThat(!fs.existsSync(capsule), 'Preserve an existing capsule before attempting another seal');
const native = readJson(path.join(root, 'research', 'xml-portable-reconciliation.json'));
const consumer = readJson(path.join(root, 'research', 'consumer-summary.json'));
const metadata = readJson(path.join(root, 'research', 'metadata-records.json'));
const freshness = readJson(path.join(root, 'research', 'closing-source-freshness.json'));
const closing = readJson(path.join(root, 'research', 'closing-identity.json'));
const input = readJson(path.join(root, 'research', 'consumer-inputs.json'));
requireThat(native.actualRowExecutions === 38 && consumer.acceptedAssertions === 256 && closing.result === 'PASS' && freshness.result === 'PASS', 'Preparation acceptance evidence is incomplete');
const commandNames = fs.readdirSync(path.join(root, 'commands', 'raw')).filter(name => name.endsWith('.terminal.json')).sort();
const commands = commandNames.map(name => {
  const command = readJson(path.join(root, 'commands', 'raw', name));
  requireThat(command.state === 'terminal' && command.bothStreamsDrained && command.rootExited && command.observedDescendantsDrained, 'Incomplete recorded invocation cannot be sealed');
  return {
    label: command.label, executable: command.executable, arguments: command.arguments,
    workingDirectory: command.workingDirectory, exitCode: command.exitCode, root: command.root,
    bothStreamsDrained: command.bothStreamsDrained, observedDescendantsDrained: command.observedDescendantsDrained,
    receipt: `commands/raw/${name}`, receiptSha256: sha256(fs.readFileSync(path.join(root, 'commands', 'raw', name)))
  };
});
const requiredCases = {
  F187: ['F187_MissingDirectoryIdentityAndRegisteredState', 'F187_PublicRazorEnumeration_UsesRealProvider'],
  F188: ['F188_MissingFileContractAndMutableLookup', 'F188_PublicRazorMissingItemAndCompilerCache', 'F188_PublicFileVersionProvider_CacheAndHelperInvalidation'],
  F189: ['F189_ExistingHostedFixture_ExcludesNestedAndExecutesDiscoveredControl']
};
const result = {
  formatVersion: 1,
  preparationState: 'PREPARED_AWAITING_COORDINATOR_ACCEPTANCE',
  agentId: 'a46e395c-3977-48fa-b406-4126e927dd1e',
  findings: ['F187', 'F188', 'F189'].map(id => ({ id, status: 'PENDING', candidateImplemented: false, performanceMeasured: false, disposition: null, acceptedCommonCases: requiredCases[id] })),
  source: {
    original: '37e809ead5824bc753a1c3d56f11615bdb1296c5',
    testedDefault: '83d976704fa0f9aa4361327d1f9d929c93bd9256',
    closingMainSourceOnly: freshness.latestObservedHead,
    wholeLatestMainBinariesTested: false,
    provenance: ['research/source-records.json', 'research/source-records-supplement.json', 'research/source-records-producer.json', 'research/closing-source-freshness.json']
  },
  native: {
    actualExpandedRows: 38, rowsPerRole: native.byRole, assertionCount: null,
    reports: native.reports.map(report => ({ role: report.role, scenario: report.scenario, path: report.path, sha256: report.sha256, rows: report.rows.length, counters: report.counters })),
    reconciliations: ['research/xml-system-reconciliation.json', 'research/xml-portable-reconciliation.json'],
    assertionBoundary: 'Native framework assertions are not instrumented; do not invent an assertion count from case counts.'
  },
  common: {
    acceptedCohort: '002', acceptedRows: consumer.acceptedRows, acceptedAssertions: consumer.acceptedAssertions,
    rowsPerRole: 6, assertionsPerRole: 128,
    successfulCompilationsAllCohorts: consumer.successfulCommonCompilations,
    failedCompilationsAllCohorts: consumer.failedCommonCompilations,
    preservedEarlierCohort: { cohort: '001', actualRows: 12, actualAssertions: 238, passedAssertions: 236, failedAssertions: 2, accepted: false },
    language: 'C# 13',
    sharedAcceptedSha256: consumer.accepted[0].common.sha256,
    sharedAcceptedMvid: consumer.accepted[0].common.mvid,
    compilationAndExecutionDetails: 'research/consumer-summary.json',
    inputAndImageDetails: ['research/consumer-inputs.json', 'research/consumer-images.json'],
    source: 'testassets/PreparationConsumer/Program.cs',
    boundary: 'One byte-identical common consumer per compiled cohort across separate role-native graphs. Two successful compilations total, not just the accepted final one. Existing native graphs and supplemental actual identities remain separate.'
  },
  selectedMetadata: {
    ...metadata.counts,
    explicitCommonInputPeRecords: input.inputRecords.filter(record => record.pe).length,
    explicitCommonInputFiles: input.inputRecords.length,
    record: 'research/metadata-records.json',
    boundary: metadata.boundary
  },
  observations: {
    F187: 'Actual nonshipping TestFileProvider missing-directory results are empty/not found with distinct finite reference observations. Public DI reaches actual recursive Razor enumeration for an absent root and one absent child. Registered/replaced directories retain their actual references/state. This is not application frequency or required fresh-identity evidence.',
    F188: 'Actual private nested missing FileInfo reports Exists=false and throws NotImplementedException for Name/PhysicalPath/Length/IsDirectory/LastModified/CreateReadStream; it is not the public path-bearing similarly named type. Ordinal original keys, physical-path-only normalization, add/replace/delete and old-object state are exercised. Actual Razor/runtime-compiler and file-version consumers cache finite negative requests. Helper HasChanged is deliberately set; OS watcher production is excluded.',
    F189: 'Existing unchanged hosted fixture includes target assembly but excludes public nested target via real feature/action/DI discovery. Two target requests return HTTP404 with no target method/result events. Two discovered controls activate transient controllers and execute returned ContentResults to actual query/header-dependent HTTP bodies. Target Index/EmptyResult is never fabricated or directly invoked.',
    boundedMaterialWorkload: 'Evidence establishes finite correctness paths/cardinalities only in test support. No production hot-path, application invocation-frequency, material performance benefit, allocation rate or singleton/candidate justification is established.',
    actualAfterDiagnosticField: 'Unchanged ControllerActionInvoker passes controllerContext to AfterControllerActionMethod as Controller. Earlier consumer mistakenly equated that field with the activated instance and failed. Corrected passive observer preserves actual action-context identity and result execution identity without changing shipping code.',
    graphCohorts: 'Earlier successful native RuntimeCompilation outputs and later successful native Functional outputs have 13 byte-different requested binary overlaps per role. No reason for all byte differences is inferred. Actual common uses exact successful same-role Functional graph plus only absent Microsoft.AspNetCore.Mvc.Views.TestCommon/12.0.0-dev; rejected whole-graph merge and Azure.Core dependency mismatch are preserved.'
  },
  limitations: [
    'No candidate, shipping/permanent-test/config edits, benchmark, allocation/Stopwatch/performance-counter measurement, PR/issue, publication, policy/registry/ledger update or disposition.',
    'BuildNodeJS=false and StaticWebAssetsEnabled=false were explicit compiler-only native build boundaries; no static-assets, browser, whole-MVC-suite or whole-latest-main claim.',
    'SDK57 and SDK/VSTest/compiler runtime selection are not normal assertion CoreCLR/CoreLib62 Original or69 Default. Actual loaded hostfxr is65. Compiler-runtime in-memory identity was not sampled as a new claim.',
    'Native managed-module gaps remain gaps; supplemental reflection is not substituted. Selected native MVIDs are parsed only from path/hash-bound retained PEs where actually observed.',
    'Selected raw PE/PDB/source/tool/runtime bytes and dependency inventories do not attest omitted compiler, SDK, runtime or OS closures.',
    'PDB metadata includes 3930 document rows across retained cohorts; only the 96 selected raw document checks are claimed, with repeats across cohorts.',
    'Process sampling plus creation-bound roots/descendants/wrappers is bounded, not a complete historical OS process tree. Earlier PID reuse/progress DateTime mistakes and corrections are retained.',
    'Whole normal accepted image inventories are retained; only selected accepted binaries/configs are portable capsule inputs. The rejected earlier image remains as failure history.'
  ],
  processBoundary: 'research/closing-identity.json',
  commands,
  preservedNonzeroCommands: commands.filter(command => command.exitCode !== 0).map(command => ({ label: command.label, exitCode: command.exitCode, receipt: command.receipt })),
  capsuleSelfExclusions: ['MANIFEST.json', 'MANIFEST.sha256'],
  finalizerAndAuditReceipts: 'Outside immutable capsule under the evidence root audit-commands; final SEALED.json binds those actual terminal results and final manifest hash.'
};
fs.mkdirSync(capsule);
const copy = (origin, destination) => {
  const stat = fs.lstatSync(origin);
  requireThat(!stat.isSymbolicLink(), 'Do not copy an external linked graph into the capsule');
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const name of fs.readdirSync(origin).sort()) copy(path.join(origin, name), path.join(destination, name));
  } else {
    if (origin.startsWith(path.join(root, 'commands') + path.sep) && origin.toLowerCase().endsWith('.binlog')) return;
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(origin, destination);
  }
};
for (const name of ['commands', 'control', 'research', 'tools', 'testassets', 'source', 'git-objects', 'guidance', 'preparation-history', 'reports', 'selected']) copy(path.join(root, name), path.join(capsule, name));
copy(path.join(root, 'Audit.mjs'), path.join(capsule, 'Audit.mjs'));
fs.writeFileSync(path.join(capsule, 'RESULTS.json'), JSON.stringify(result, null, 2) + '\n');
const nativeCommands = commands.filter(command => ['original-runtimecompilation-compiler-only', 'default-runtimecompilation-compiler-only', 'original-functional-pinned-prerequisite', 'default-functional-pinned-prerequisite'].includes(command.label));
const argv = command => [command.executable, ...command.arguments].map(value => JSON.stringify(value)).join(' ');
const handoff = `# F187–F189 unchanged-source preparation

**All three findings remain PENDING for coordinator acceptance. No candidate, benchmark or disposition.**

Actual owner: \`a46e395c-3977-48fa-b406-4126e927dd1e\`. Entry native HOLD was honored and explicitly released by \`GO F187-F189-038\`; fresh exact-owner policy checks precede recorded starts. No later explicit HOLD was received.

## Frozen source and actual runtime boundaries

| Role | Source actually built/tested | Normal assertion runtime |
|---|---|---|
| Original | \`37e809ead5824bc753a1c3d56f11615bdb1296c5\` | Actual CoreCLR/CoreLib \`12.0.0-alpha.1.26562.105\` |
| Default | \`83d976704fa0f9aa4361327d1f9d929c93bd9256\` | Actual CoreCLR/CoreLib \`12.0.0-alpha.1.26569.107\` |

Closing independent main observation: \`${freshness.latestObservedHead}\`; only target commit/tree/blob freshness is proven there. **Newer whole-main binaries were not tested.** Raw checkout and immutable Git bytes are separate; no newline-normalized source checksum is used. There are 48 selected checkout documents per role, plus current contributor guidance.

SDK/compiler prerequisites use \`12.0.100-alpha.1.26557.102\` read-only. Actual normal testhost/supplemental hostfxr is65, not62/69. SDK/VSTest/compiler and normal assertion runtimes are never pooled. Selected loaded identities, paths, hashes and parsed MVIDs are in \`research/metadata-records.json\`; native observation gaps are explicit and never filled with supplemental reflection.

## Requirement coverage

| Requirement | Exact actual common case(s) and evidence |
|---|---|
| F187 real directory miss, registration/replacement, identity and actual Razor enumeration | \`F187_MissingDirectoryIdentityAndRegisteredState\`; \`F187_PublicRazorEnumeration_UsesRealProvider\` |
| F188 real missing-file path/name/state contract and actual cached consumers | \`F188_MissingFileContractAndMutableLookup\`; \`F188_PublicRazorMissingItemAndCompilerCache\`; \`F188_PublicFileVersionProvider_CacheAndHelperInvalidation\` |
| F189 actual hosted discovery/activation/result boundary, not a fabricated controller call | \`F189_ExistingHostedFixture_ExcludesNestedAndExecutesDiscoveredControl\` |

Accepted cohort002: six cases and128/128 assertions per role;12 cases and256/256 assertions total, all actually executed. Source and raw per-assertion observations are retained. The common DLL/PDB/deps/runtimeconfig are byte-identical across roles; actual commands explicitly override deps/runtimeconfig with each role's normal graph. Native tests independently passed19 expanded cases per role: nine existing Razor facts and ten existing hosted controller cases, including all four independently reconciled discovery-Theory rows. Native framework assertion counts are **not instrumented**.

### Observed contracts and bounded workload assessment

- **F187:** actual helper missing directories have \`Exists=false\` and empty generic/nongeneric enumeration. Repeated/different finite misses currently have distinct references; fresh identity is not asserted to be a required public contract. Actual public DI reaches the real recursive Razor file-system producer for a missing root and one missing child; registering that child changes the real returned item set.
- **F188:** the helper returns its **private nested** \`TestFileProvider.NotFoundFileInfo\`, not public path-bearing \`NotFoundFileInfo\`. Only \`Exists\` is usable; \`Name\`, \`PhysicalPath\`, \`Length\`, \`IsDirectory\`, \`LastModified\` and \`CreateReadStream\` throw \`NotImplementedException\`. Original ordinal keys are retained; only AddFile physical paths are normalized. Equal/case/slash keys, add/replace/delete and prior returned-object state are exercised. Real compiler negative caching reuses descriptors and avoids the repeated equal-path lookup; real file-version caching likewise bounds finite lookup cardinality. Mutating the helper's public \`HasChanged\` property proves the real consumer's response, **not an OS watcher producer**.
- **F189:** the owning class-library assembly really is an application part, but the nested type is not top-level public and is excluded by real feature/action/service discovery. Two actual nested-route requests return404 with no method/result diagnostics. Two discovered controls activate distinct real transient controllers, consume actual query/header services, and execute actual returned ContentResults to the expected HTTP bodies. The nested target's \`Index\` and \`new EmptyResult\` are never directly invoked or misrepresented as hosted execution.
- These are nonshipping test-support fixtures and finite correctness/cardinality observations, **not production frequency, allocation rate, material performance benefit, or singleton/candidate justification**. Other hosts/custom discovery, template compilation, physical filesystem notifications, browser/static assets and application-scale workloads are excluded.

## Native commands and real XML reconciliation

Documented focused project commands were used after each exact checkout activation. All selected final commands below exited0, drained both streams and passed their actual XML cases; they were not accepted from console summaries alone:

${nativeCommands.map(command => `- **${command.label}: passed, exit0.** Workdir \`${command.workingDirectory}\`.\n  \`\`\`text\n  ${argv(command)}\n  \`\`\``).join('\n\n')}

\`research/xml-system-reconciliation.json\` uses real System.Xml namespace-aware parsing; \`research/xml-portable-reconciliation.json\` independently reconciles actual XML structure. Every expanded case's name, result, definition, method/codeBase/class, entry, execution ID, run/summary attributes and counters agree. Original/default row sets and identities remain separate.

Native compile boundaries explicitly include \`UseIisNativeAssets=false\`, \`BuildNodeJS=false\`, \`StaticWebAssetsEnabled=false\`, disabled shared compilation/node reuse and exact private package/scratch/output graphs. Missing generated imports/task/assets, static-asset manifests and MessagePack prerequisite failures are preserved before repairs. Pinned MessagePack \`be938cda59c823ee4a672d45d1d7d642a3f34396\` was cloned into independent owned submodule repositories; no donor/coordinator source or output was initialized or changed.

## Every common compilation and rejected preparation cohort

There were **two successful common C#13 compilations, zero failed common compilations**, not one. Compile001 and002 exact inputs/arguments and all warnings are retained. Initial two input-preparation failures and one rejected image/dependency preparation happened before common execution and are preserved separately.

Cohort001 actually ran six rows per role: five passed and the hosted diagnostic row failed after118/119 successful assertions. It incorrectly equated After-event \`Controller\` with the activated instance. Unchanged real \`ControllerActionInvoker\` passes \`controllerContext\` into that field; source/PDB and corrected real producer observations are retained. Cohort002 uses Before-event activation identities, explicitly verifies actual After context identity, and follows returned ContentResult identity through real result execution. No shipping code was changed. Earlier sources, compiler responses, binaries/PDBs, image inventories, failures and command streams remain available under \`preparation-history/common-cohort-001\` and raw reports.

Two normal native graph cohorts have13 byte-different requested overlaps per role; no source/semantic equivalence or single cause is inferred from that fact. The rejected wholesale dependency merge exposed an Azure.Core metadata mismatch. Accepted common images use each **exact successful native Functional graph**, adding only absent \`Microsoft.AspNetCore.Mvc.Views.TestCommon/12.0.0-dev\`. They do not merge unrelated earlier dependency selections. Every image choice/inventory and actual managed load identity is explicit.

## Portable evidence and process boundary

Fresh selected capture: ${metadata.counts.peRecords} PE records, ${metadata.counts.managedMvidRecords} managed MVID records, ${metadata.counts.portablePdbPairs} real PE/portable-PDB associations, ${metadata.counts.selectedRawDocumentChecks} selected raw-source checks. PDB metadata has ${metadata.counts.totalPdbDocumentMetadataRows} document rows across cohorts; **this is not all-document raw-source coverage**. ${input.inputRecords.filter(record => record.pe).length} explicit compiler/reference input PEs are additionally retained and reparsed by the audit. Selected dependencies/tool/runtime bytes do **not** attest omitted compiler, SDK, runtime or OS closures.

All recorded pre-seal command roots have durable started/terminal identities, exact arguments/workdir/environment-selection, real exits and drained stdout/stderr. Scoped roots/wrappers/observed descendants use PID **plus creation identity**. Earlier progress-only PID reuse and automatic PowerShell DateTime conversion mistakes/corrections are retained; they are not terminal proof. The final snapshot checks prior recorded creations, while explicitly excluding its own in-flight helper/wrapper until its recorder finishes. Bounded sampling is not a full historical OS process tree. No broad process-name stopping or machine-wide configuration changes were performed.

The capsule contains selected accepted inputs plus full preserved rejected preparation cohorts. Normal accepted whole images, package/CLI/scratch graphs, native build binlogs and isolated source checkouts remain outside; their inventories/command provenance are not mislabeled as retained complete toolchain closure. All raw text failure/command reports are retained.

## Offline verification and seal

Only \`MANIFEST.json\` and \`MANIFEST.sha256\` are self exclusions. \`SEALED.json\` and finalizer/audit command receipts are outside the immutable capsule. Run the exact available Node tool with:

\`\`\`powershell
node --permission --allow-fs-read="<absolute capsule path>" --no-addons "<absolute capsule path>\\Audit.mjs"
\`\`\`

The audit requires capsule-only filesystem reads, denied filesystem writes/children, no addons, no dependency install, and uses Node built-ins only. It reparses raw Git membership, all native XML/expanded identities/counters, selected actual PE/PDB/source checks, common input/row/assertion identities, native-vs-supplemental load boundaries, every recorded command closure and entire manifest membership/hash. Actual terminal audit commands/results and the post-audit whole-capsule rehash are bound by the outside \`SEALED.json\`. All F187/F188/F189 remain **PENDING**.
`;
fs.writeFileSync(path.join(capsule, 'HANDOFF.md'), handoff);
const entries = [];
const walk = (directory, prefix = '') => {
  for (const name of fs.readdirSync(directory).sort()) {
    const filename = path.join(directory, name), relative = prefix ? prefix + '/' + name : name;
    const stat = fs.lstatSync(filename);
    requireThat(!stat.isSymbolicLink(), 'Capsule contains a link');
    if (stat.isDirectory()) walk(filename, relative);
    else {
      const bytes = fs.readFileSync(filename);
      entries.push({ path: relative, bytes: bytes.length, sha256: sha256(bytes) });
    }
  }
};
walk(capsule);
const manifest = { formatVersion: 1, algorithm: 'SHA256', exclusions: ['MANIFEST.json', 'MANIFEST.sha256'], fileCount: entries.length, byteCount: entries.reduce((sum, entry) => sum + entry.bytes, 0), files: entries };
const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(capsule, 'MANIFEST.json'), manifestBytes);
fs.writeFileSync(path.join(capsule, 'MANIFEST.sha256'), sha256(manifestBytes) + '\n');
console.log(JSON.stringify({ result: 'PASS', capsule, manifestSha256: sha256(manifestBytes), files: manifest.fileCount, bytes: manifest.byteCount, nativeRows: 38, acceptedCommonRows: 12, acceptedAssertions: 256, successfulCommonCompilations: 2, failedCommonCompilations: 0, findingsStatus: 'PENDING' }));
