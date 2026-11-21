const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const args = [
  'api', 'repos/dotnet/aspnetcore/pulls/67969/files?per_page=100', '--jq',
  '[.[] | select(.filename == "src/Components/Analyzers/test/Verifiers/DiagnosticVerifier.cs" or .filename == "src/Components/Analyzers/test/Helpers/DiagnosticVerifier.Helper.cs") | {filename,status,additions,deletions,patch}]',
];
const result = cp.spawnSync('gh', args, {
  cwd: __dirname, encoding: null, maxBuffer: 2 * 1024 * 1024,
  env: { ...process.env, GH_PAGER: '', PAGER: '' }, windowsHide: true,
});
const prefix = path.join(__dirname, 'history-detail', 'current-related-pr-67969-verifier-patches');
fs.writeFileSync(prefix + '.stdout', result.stdout || '', { flag: 'wx' });
fs.writeFileSync(prefix + '.stderr', result.stderr || '', { flag: 'wx' });
fs.writeFileSync(prefix + '.command.json', JSON.stringify({
  argv: ['gh', ...args], cwd: __dirname, exitCode: result.status,
  readOnly: true, sourceRole: 'Unmerged related work; not Original or Default',
}, null, 2) + '\n', { flag: 'wx' });
if (result.error || result.status !== 0) throw new Error('Related patch read failed');
console.log(JSON.stringify({ selectedFiles: JSON.parse(result.stdout.toString()).length }));
