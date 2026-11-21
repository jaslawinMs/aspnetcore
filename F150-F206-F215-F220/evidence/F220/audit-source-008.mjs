import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { here, repo, owner, original, write, guard, git, gh, text, sha256, execute } from './capture-core-002.mjs';

execute(fileURLToPath(import.meta.url), () => {
  guard('008-audit-entry');
  const checks = [];
  const check = (name, condition, evidence) => {
    checks.push({ name, passed: Boolean(condition), evidence });
  };
  const readJson = name => JSON.parse(fs.readFileSync(path.join(here, name)));
  const readSource = (role, file) => text(fs.readFileSync(path.join(here, 'sources', role, file)));
  const blob = bytes => crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  const pins = readJson('source-pins-002.json');
  const bindings = [
    'source-bindings-003.json', 'source-bindings-004.json',
    'source-bindings-005.json', 'source-bindings-006.json',
    'dependency-source-bindings-005.json', 'dependency-source-bindings-006.json',
    'dependency-source-bindings-007.json',
  ].flatMap(readJson);
  const trees = {};
  for (const role of ['original', 'default']) {
    trees[role] = new Map(text(fs.readFileSync(path.join(here, 'commands', `003-${role}-whole-tree.stdout.bin`))).split('\0').filter(Boolean).map(row => {
      const m = /^([0-9]+) (\S+) ([a-f0-9]{40})\t([\s\S]*)$/.exec(row);
      return [m[4], m[3]];
    }));
  }
  for (const binding of bindings) {
    const bytes = fs.readFileSync(path.join(here, binding.artifact));
    check(`whole-raw-source:${binding.artifact}`, bytes.length === binding.bytes && sha256(bytes) === binding.sha256 && blob(bytes) === binding.gitBlob, binding);
    if (binding.repository === 'dotnet/aspnetcore') {
      check(`pinned-tree-object:${binding.artifact}`, trees[binding.role].get(binding.repositoryPath.replaceAll('\\', '/')) === binding.gitBlob, { commit: binding.commit, gitBlob: binding.gitBlob });
    } else {
      const metadata = JSON.parse(fs.readFileSync(path.join(here, 'commands', `${binding.commandLabel}.stdout.bin`)));
      check(`pinned-public-source:${binding.artifact}`, metadata.sha === binding.gitBlob && Buffer.from(metadata.content, 'base64').equals(bytes), { commandLabel: binding.commandLabel, gitBlob: metadata.sha });
    }
  }
  const commandFiles = fs.readdirSync(path.join(here, 'commands')).filter(n => n.endsWith('.receipt.json')).sort();
  const sourceRoots = [];
  for (const name of commandFiles) {
    const receipt = readJson(path.join('commands', name));
    const stem = path.join('commands', name.slice(0, -'.receipt.json'.length));
    const stdout = fs.readFileSync(path.join(here, `${stem}.stdout.bin`));
    const stderr = fs.readFileSync(path.join(here, `${stem}.stderr.bin`));
    const request = readJson(`${stem}.request.json`);
    const sourceGuard = readJson(receipt.guard);
    const policyBytes = fs.readFileSync(path.join(here, sourceGuard.policySnapshot));
    const policy = JSON.parse(policyBytes);
    check(`source-root-and-raw-streams:${receipt.label}`, receipt.synchronousRootAndBothStreamsReturned && receipt.signal === null && receipt.error === null && receipt.allowedExitCodes.includes(receipt.status) && Number.isInteger(receipt.childRootPidObservedBySpawnSync) && stdout.length === receipt.stdoutBytes && stderr.length === receipt.stderrBytes && sha256(stdout) === receipt.stdoutSha256 && sha256(stderr) === receipt.stderrSha256 && JSON.stringify(request.argv) === JSON.stringify(receipt.argv), { childRootPid: receipt.childRootPidObservedBySpawnSync, status: receipt.status, signal: receipt.signal, stderrBytes: stderr.length });
    check(`fresh-command-guard:${receipt.label}`, sourceGuard.owner === owner && sourceGuard.registrationOwner === owner && sourceGuard.ownerCount <= 4 && sourceGuard.scopeCount <= 4 && !sourceGuard.leaseExists && sourceGuard.HOLD === false && sourceGuard.quiesced === false && sha256(policyBytes) === sourceGuard.policySha256 && policy.independentFindingPreparationWorkers.F220 === owner, { observedUtc: sourceGuard.observedUtc, policySha256: sourceGuard.policySha256 });
    sourceRoots.push({ label: receipt.label, executable: receipt.executable, argv: receipt.argv, childRootPidObservedBySpawnSync: receipt.childRootPidObservedBySpawnSync, status: receipt.status, signal: receipt.signal, rootAndBothStreamsReturned: receipt.synchronousRootAndBothStreamsReturned });
  }
  const helperResults = fs.readdirSync(here).filter(n => n.endsWith('.result.json') && /^(pin-and-prior|capture-)/.test(n));
  for (const name of helperResults) {
    const result = readJson(name);
    check(`executed-helper-bytes:${name}`, sha256(fs.readFileSync(result.entryPath)) === result.entrySha256 && sha256(fs.readFileSync(result.corePath)) === result.coreSha256 && result.bodyReturned === true, { entryPath: result.entryPath, entrySha256: result.entrySha256, coreSha256: result.coreSha256 });
  }
  for (const version of ['004', '005', '006', '007']) {
    const request = readJson(`launch-${version}.request.json`);
    const receipt = readJson(`launch-${version}.receipt.json`);
    check(`captured-helper-terminal:${version}`, request.launcherSha256 === sha256(fs.readFileSync(request.launcherPath)) && request.entrySha256 === sha256(fs.readFileSync(request.entry)) && receipt.childRootWaitReturned && receipt.bothRawStreamCopiesReturned && receipt.childExitCodeAfterWait === 0 && receipt.stdoutSha256 === sha256(fs.readFileSync(path.join(here, `launch-${version}.stdout.bin`))) && receipt.stderrSha256 === sha256(fs.readFileSync(path.join(here, `launch-${version}.stderr.bin`))), receipt);
  }
  const constants = Object.fromEntries([...readSource('original', 'src\\ProjectTemplates\\Shared\\PageUrls.cs').matchAll(/public const string (\w+) = "([^"]*)";/g)].map(m => [m[1], m[2]]));
  const blockAt = (source, opening) => {
    let depth = 0;
    for (let i = opening; i < source.length; i++) {
      if (source[i] === '{') depth++;
      if (source[i] === '}' && --depth < 0) throw new Error('Unbalanced producer initializer.');
      if (source[i] === '}' && depth === 0) return source.slice(opening, i + 1);
    }
    throw new Error('Unterminated producer initializer.');
  };
  const producerMatrices = {};
  for (const role of ['original', 'default']) {
    const sites = [];
    for (const [file, methods] of [
      ['MvcTemplateTest.cs', ['MvcTemplateCore', 'MvcTemplate_IndividualAuth_Core', 'MvcTemplate_SingleFileExe']],
      ['RazorPagesTemplateTest.cs', ['RazorPagesTemplate_NoAuth', 'RazorPagesTemplate_IndividualAuth_Core']],
    ]) {
      const repositoryPath = `src\\ProjectTemplates\\test\\Templates.Mvc.Tests\\${file}`;
      const source = readSource(role, repositoryPath);
      for (const match of source.matchAll(/new Page\s*\{/g)) {
        const opening = source.indexOf('{', match.index);
        const body = blockAt(source, opening);
        const url = /Url\s*=\s*PageUrls\.(\w+)/.exec(body)?.[1];
        const linkMatch = /Links\s*=\s*(new\s*\[\s*\]\s*\{[\s\S]*?\}|menuLinks(?:\.Append\(PageUrls\.DocsUrl\))?\.Concat\(footerLinks\))/.exec(body);
        if (!url || !linkMatch) throw new Error(`Unrecognized actual Page initializer: ${role} ${file}`);
        const expression = linkMatch[1];
        const methodSite = methods.map(name => ({ name, index: source.lastIndexOf(` ${name}(`, match.index) })).sort((a, b) => b.index - a.index)[0];
        const method = methodSite.name;
        const pipeline = expression.startsWith('menuLinks');
        const methodPrefix = source.slice(methodSite.index, match.index);
        const menu = pipeline ? /menuLinks\s*=\s*(new List<string>|new\s*\[\s*\])\s*\{([\s\S]*?)\};/.exec(methodPrefix) : null;
        const footer = pipeline ? /footerLinks\s*=\s*new\s*(?:string\s*)?\[\s*\]\s*\{([\s\S]*?)\};/.exec(methodPrefix) : null;
        if (pipeline && (!menu || !footer)) throw new Error('Actual menu/footer construction not recognized.');
        const menuConstants = menu ? [...menu[2].matchAll(/PageUrls\.(\w+)/g)].map(m => m[1]) : [];
        const footerConstants = footer ? [...footer[1].matchAll(/PageUrls\.(\w+)/g)].map(m => m[1]) : [];
        const links = pipeline
          ? [...menuConstants, ...(expression.includes('.Append(') ? ['DocsUrl'] : []), ...footerConstants]
          : [...expression.matchAll(/PageUrls\.(\w+)/g)].map(m => m[1]);
        if (links.some(name => constants[name] === undefined)) throw new Error('Expected URL constant missing.');
        const actualMenuConstruction = menu ? `${menu[1].includes('List') ? 'List<string>' : 'string[]'}, ${menuConstants.length} literal entries` : null;
        sites.push({ repositoryPath, line: source.slice(0, match.index).split('\n').length, method, pageUrlConstant: url, pageUrl: constants[url], linksExpression: expression, expectedLinkConstantsInOrder: links, expectedUrlsInOrder: links.map(x => constants[x]), count: links.length, shape: pipeline ? 'Concat2Iterator<string>; home has nested AppendPrepend1Iterator<string>' : 'string[]', menuConstruction: actualMenuConstruction, footerConstruction: pipeline ? 'string[], one literal entry' : null, countTraversesExpectedElementsOnInspectedLinq: false, observedRuntimeType: false });
      }
    }
    const arrays = sites.filter(x => x.shape === 'string[]');
    const pipelines = sites.filter(x => x.shape !== 'string[]');
    const distribution = arrays.reduce((m, x) => ({ ...m, [x.count]: (m[x.count] ?? 0) + 1 }), {});
    check(`real-producer-sites:${role}`, sites.length === 16 && arrays.length === 12 && pipelines.length === 4 && JSON.stringify(distribution) === JSON.stringify({ 4: 1, 5: 1, 6: 4, 7: 4, 10: 2 }), { sites: sites.length, arrays: arrays.length, pipelines: pipelines.length, distribution });
    const blazor = readSource(role, 'src\\ProjectTemplates\\test\\Templates.Mvc.Tests\\BlazorTemplateTest.cs');
    check(`outer-blazor-iterator-is-not-Links-producer:${role}`, [...blazor.matchAll(/yield return new\(/g)].length === 7 && !/\bLinks\s*=/.test(blazor), { yieldPageConstructionSites: [...blazor.matchAll(/yield return new\(/g)].length });
    const target = readSource(role, 'src\\ProjectTemplates\\Shared\\AspNetProcess.cs');
    const assertionLine = target.split('\n').find(x => x.includes('Assert.True(html.Links.Length == page.Links.Count()'));
    check(`assertion-and-ordered-validation-seam:${role}`, assertionLine && [...assertionLine.matchAll(/page\.Links\.Count\(\)/g)].length === 2 && [...assertionLine.matchAll(/html\.Links\.Length/g)].length === 2 && target.includes('html.Links.Zip(page.Links, Tuple.Create)') && target.includes('if (page.Links?.Count() > 0)') && target.includes('public IEnumerable<string> Links { get; set; }'), { assertionLine, zip: 'html.Links.Zip(page.Links, Tuple.Create)' });
    producerMatrices[role] = { derivedFrom: 'Fresh pinned complete sources, not prior F190 matrix or native output', annotatorLimit: 'Bounded source annotator for the exact manually inspected constant initializer grammar, not a C# compiler or general semantic scanner', sites, arrayCountDistribution: distribution, pipelineCounts: pipelines.map(x => x.count) };
  }
  check('independent-role-producer-equivalence', JSON.stringify(producerMatrices.original.sites) === JSON.stringify(producerMatrices.default.sites), 'Complete selected producer source is byte-identical; current ProjectTemplates tree matches Original.');
  write('producer-matrix.json', producerMatrices);
  for (const name of ['Count.cs', 'Concat.cs', 'Concat.SpeedOpt.cs', 'AppendPrepend.cs', 'AppendPrepend.SpeedOpt.cs', 'Zip.cs', 'Iterator.cs', 'Enumerable.cs']) {
    const originalBytes = fs.readFileSync(path.join(here, 'dependencies', 'linq-original', name));
    const defaultBytes = fs.readFileSync(path.join(here, 'dependencies', 'linq-default', name));
    check(`declared-LINQ-source-role-equivalence:${name}`, originalBytes.equals(defaultBytes), { originalSha256: sha256(originalBytes), defaultSha256: sha256(defaultBytes) });
  }
  const count = text(fs.readFileSync(path.join(here, 'dependencies', 'linq-original', 'Count.cs')));
  const concat = text(fs.readFileSync(path.join(here, 'dependencies', 'linq-original', 'Concat.SpeedOpt.cs')));
  const append = text(fs.readFileSync(path.join(here, 'dependencies', 'linq-original', 'AppendPrepend.SpeedOpt.cs')));
  check('actual-count-fastpaths-source', count.includes('source is ICollection<TSource> collectionoft') && count.includes('return collectionoft.Count;') && count.includes('iterator.GetCount(onlyIfCheap: false)') && concat.includes('_first.TryGetNonEnumeratedCount') && concat.includes('_second.TryGetNonEnumeratedCount') && append.includes('_source is ICollection<TSource> ? checked(_source.Count() + 1)'), ['Count.cs', 'Concat.SpeedOpt.cs', 'AppendPrepend.SpeedOpt.cs']);
  const assertion = text(fs.readFileSync(path.join(here, 'dependencies', 'xunit-assert-2.9.2', 'BooleanAsserts.cs')));
  const trueException = text(fs.readFileSync(path.join(here, 'dependencies', 'xunit-assert-2.9.2', 'Sdk', 'Exceptions', 'TrueException.cs')));
  check('string-not-lazy-assert-overload-source', assertion.includes('bool condition,') && assertion.includes('string userMessage) =>') && assertion.includes('True((bool?)condition, userMessage);') && !assertion.includes('Func<string>') && trueException.includes('message ??'), 'Exact xunit.assert 2.9.2 submodule source; no native assembly binding claim.');
  const domDocument = text(fs.readFileSync(path.join(here, 'dependencies', 'anglesharp-1.5.2', 'src', 'AngleSharp', 'Dom', 'Internal', 'Document.cs')));
  const domCollection = text(fs.readFileSync(path.join(here, 'dependencies', 'anglesharp-1.5.2', 'src', 'AngleSharp', 'Dom', 'Internal', 'HtmlCollection.cs')));
  const domProducer = text(fs.readFileSync(path.join(here, 'dependencies', 'dom-producer-007', 'src', 'AngleSharp', 'Dom', 'Internal', 'CollectionExtensions.cs')));
  check('separate-real-DOM-query-not-conflated-with-expected-links', domDocument.includes('Links => _links ??= new HtmlCollection<IElement>(this, predicate: IsLink)') && domCollection.includes('Length => _elements.Count()') && domCollection.includes('_elements = parent.GetNodes(deep, predicate)') && domProducer.includes('new NodeEnumerable(parent).OfType<T>().Where(predicate)'), 'Declared AngleSharp1.5.2 source. No native DOM size, traversal counts or materiality was observed.');
  const roleTrees = readJson('role-trees-003.json');
  check('whole-ProjectTemplates-tree-role-equivalence', roleTrees.original.projectTemplatesTree === roleTrees.default.projectTemplatesTree && roleTrees.original.projectTemplatesTree === 'b29d825ba287dc360512f8da8e3e6a06e235c96a', roleTrees);
  const prior = readJson('prior-F190\\HANDOFF.json');
  check('F190-is-not-an-exact-retained-implementation-duplicate', prior.card === 'enumerable-count-vs-any' && prior.sourcePins.targetLine === 117 && prior.candidateRetained === false && fs.statSync(path.join(here, 'prior-F190', 'candidate.diff')).size === 0, { priorCard: prior.card, priorTarget: prior.sourcePins.targetLine, currentCard: 'ienumerable-count-before-reenumeration', currentTarget: [162, 163] });
  const head = text(git('008-final-reserved-head', ['rev-parse', 'HEAD'])).trim();
  const status = text(git('008-final-reserved-status', ['status', '--porcelain=v1', '--untracked-files=normal']));
  const diff = git('008-final-target-diff', ['diff', '--no-ext-diff', '--', 'src/ProjectTemplates']);
  const cachedDiff = git('008-final-target-cached-diff', ['diff', '--cached', '--no-ext-diff', '--', 'src/ProjectTemplates']);
  const latest = JSON.parse(text(gh('008-final-main-reobservation', ['api', '--method', 'GET', 'repos/dotnet/aspnetcore/commits/main'])));
  check('reserved-root-footprint-unchanged', head === pins.reserved.head && status === pins.reserved.status && diff.length === 0 && cachedDiff.length === 0, { head, status, targetDiffBytes: diff.length, targetCachedDiffBytes: cachedDiff.length });
  check('fresh-default-pin-still-current-at-final-source-audit', latest.sha === pins.defaultCommit, { initiallyObservedDefault: pins.defaultCommit, finalObservedDefault: latest.sha });
  const protectedReports = [
    'autoperf-issue-70219-deduplicated-report.html',
    'autoperf-issue-70219-duplicate-report.html',
    'autoperf-scan-report.md',
    'performance-antipattern-findings.md',
  ].map(name => {
    const bytes = fs.readFileSync(path.join(repo, name));
    return { path: path.join(repo, name), bytes: bytes.length, sha256: sha256(bytes), observation: 'First content-hash observation by this owner is at final source audit; initial status established presence. No owner writes to these files occurred.' };
  });
  write('reserved-report-hashes-008.json', protectedReports);
  write('candidate.diff', '');
  const assessment = readJson('assessment.json');
  check('bounded-no-candidate-not-no-gain', assessment.disposition === 'bounded-source-only-no-material-candidate' && assessment.candidateRetained === false && assessment.implementationAndValidation.nativeBuildTestAppStarts === 0 && assessment.implementationAndValidation.comparisonCount === 0, assessment.implementationAndValidation);
  write('source-root-terminal-index-008.json', sourceRoots);
  const failed = checks.filter(x => !x.passed);
  const result = {
    finding: 'F220',
    scope: 243,
    observedUtc: new Date().toISOString(),
    kind: 'source-evidence-integrity-and-bounded-qualification-audit, not product tests',
    checksPassed: checks.length - failed.length,
    checksFailed: failed.length,
    completeRawSourceBindings: bindings.length,
    sourceRootsAuditedBeforeThisAuditFinalReads: sourceRoots.length,
    additionalFinalReadLabels: ['008-final-reserved-head', '008-final-reserved-status', '008-final-target-diff', '008-final-target-cached-diff', '008-final-main-reobservation'],
    sourcePins: { original, default: pins.defaultCommit, finalObservedDefault: latest.sha },
    protectedReports,
    sourceOnly: true,
    nativeBuildTestAppStarts: 0,
    comparisonCount: 0,
    checks,
    failed,
    finalGuard: guard('008-audit-finished'),
    ownProcessFutureExitNotAttested: true,
  };
  write('source-audit-results-008.json', result);
  if (failed.length) throw new Error(`${failed.length} source-evidence audit checks failed; all results retained, no replay authorized.`);
  return { checksPassed: result.checksPassed, checksFailed: result.checksFailed, completeRawSourceBindings: bindings.length, producerSitesPerRole: producerMatrices.original.sites.length, comparisonCount: 0, nativeBuildTestAppStarts: 0, audit: 'source-audit-results-008.json' };
});
