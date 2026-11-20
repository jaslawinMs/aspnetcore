const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const sourcePath = 'src\\Shared\\runtime\\Http3\\Http3StreamType.cs';
const observation = JSON.parse(fs.readFileSync(path.join(__dirname, 'source-observations.json'), 'utf8'));
const inputs = [], commands = [];
for (const [role, pin] of Object.entries(observation.pins)) {
  const gitPath = sourcePath.replaceAll('\\', '/');
  const argv = ['--no-pager', '-C', 'C:\\src\\aspnetcore', 'show', `${pin}:${gitPath}`];
  const result = cp.spawnSync('git', argv);
  commands.push({ executable: 'git', argv, exitCode: result.status, stderr: String(result.stderr) });
  assert.equal(result.status, 0);
  const savedPath = path.join('evidence', role, sourcePath);
  fs.mkdirSync(path.dirname(path.join(__dirname, savedPath)), { recursive: true });
  fs.writeFileSync(path.join(__dirname, savedPath), result.stdout, { flag: 'wx' });
  inputs.push({
    role, commit: pin, sourcePath, savedPath,
    sha256: crypto.createHash('sha256').update(result.stdout).digest('hex'),
    gitBlob: crypto.createHash('sha1').update(`blob ${result.stdout.length}\0`).update(result.stdout).digest('hex'),
  });
}
fs.writeFileSync(path.join(__dirname, 'supplemental-stream-type.json'), JSON.stringify({ inputs, commands }, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ inputs: inputs.length, captured: true }));
