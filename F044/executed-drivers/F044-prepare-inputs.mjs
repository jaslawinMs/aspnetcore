import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F044');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const fixtures = [];
for (const [profile, expectedCount, padding] of [
  ['NoSections', 0, 0], ['One', 1, 0], ['Two', 2, 0],
  ['Eight', 8, 0], ['SixtyFour', 64, 0], ['EightLong', 8, 256]
]) {
  const file = path.join('Views', profile + '.cshtml');
  const source = fs.readFileSync(path.join(run, 'harness', file), 'utf8');
  assert.ok(source.startsWith('@inherits Microsoft.AspNetCore.Mvc.Razor.RazorPageBase\n'));
  const names = Array.from({ length: expectedCount }, (_, index) =>
    'Section' + 'A'.repeat(padding) + String(index).padStart(3, '0'));
  assert.deepEqual([...source.matchAll(/@section (\w+)\{/g)].map(match => match[1]), names);
  for (const name of names) assert.ok(source.includes(`@section ${name}{<s>${name}</s>}`));
  fixtures.push({
    profile, path: file, expectedCount, names, expectedRegistrationOutput: '',
    expectedFullViewHtml: '<body/>' + names.map(name => `<s>${name}</s>`).join(''),
    requiredDirectBase: 'Microsoft.AspNetCore.Mvc.Razor.RazorPageBase',
    sha256: sha(fs.readFileSync(path.join(run, 'harness', file)))
  });
}
fs.writeFileSync(path.join(run, 'compiled-fixture-inputs.json'), JSON.stringify({
  candidate: 'F044', actualCompilerInputFiles: true, actualCompilationNotYetClaimed: true,
  actualNormalRazorPageOverrideExcluded: true, fixtures
}, null, 2) + '\n', { flag: 'wx' });
const auditSource = fs.readFileSync(path.join(session, 'F043-audit-trx.ps1'), 'utf8');
const audit = auditSource.replaceAll('F043', 'F044')
  .replaceAll('DefineSection_RejectsCaseInsensitiveDuplicateWithoutReplacingWriter',
    'DefineSection_BaseImplementationRejectsCaseInsensitiveDuplicateWithoutReplacingWriter');
fs.writeFileSync(path.join(session, 'F044-audit-trx.ps1'), audit, { flag: 'wx' });
const related = JSON.parse(fs.readFileSync(path.join(run, 'related-upstream-70128.json'), 'utf8'));
assert.equal(related.actualFiles.length, 5);
assert.ok(related.actualFiles.every(file => file.patch && !file.patch.includes('DefineSection')));
const investigation = {
  candidate: 'F044', actualRelatedPrHead: related.head, actualAllFiveRelatedPatchesRead: true,
  actualRelatedWorkDoesNotModifyEitherDefineSectionBody: true,
  actualRelatedLazyStoreProposalDoesNotReplaceThisCase: true, exhaustiveUpstreamAbsenceClaimed: false,
  actualDocumentation: {
    url: 'https://learn.microsoft.com/en-us/aspnet/core/mvc/views/razor?view=aspnetcore-10.0#inherits',
    observedDocsCommit: '7e6be970565b61d251d839555bec7cf0a1a20a53',
    quotedContract: 'The @inherits directive provides full control of the class the view inherits.',
    boundary: 'The documented example derives from RazorPage<T>. Actual direct-base compiler/runtime reachability still must be established by the F044 fixtures, not inferred from that example.'
  },
  actualSourceInvariant: 'Private readonly IDictionary field initialized to exactly Dictionary<string,RenderAsyncDelegate>(StringComparer.OrdinalIgnoreCase), exposed by a get-only nonvirtual property.',
  actualProtectedLegacyAdapter: 'The protected Func<object?,Task> editor overload creates a deferred null-writer callback and forwards through the public virtual method.',
  actualOrdinaryProducerExclusion: 'RazorPage and RazorPage<T> use the distinct RazorPage override; no F043 result is reused.',
  actualCurrentDefaultManagedBuild: 'validation/default-managed-razor-build-001/result.json',
  actualFocusedUnitCases: [
    'DefineSection_BaseImplementationRejectsCaseInsensitiveDuplicateWithoutReplacingWriter("scripts")',
    'DefineSection_BaseImplementationRejectsCaseInsensitiveDuplicateWithoutReplacingWriter("SCRIPTS")'
  ],
  actualNoShippingEditBeforeBaseline: true, actualTimingConsumed: 0
};
fs.writeFileSync(path.join(run, 'investigation.json'), JSON.stringify(investigation, null, 2) + '\n', { flag: 'wx' });
console.log('Prepared six direct-base compiler inputs, exact preservation-row audit and documented investigation.');
