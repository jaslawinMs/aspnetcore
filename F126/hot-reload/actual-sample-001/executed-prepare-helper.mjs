import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F126');
const directory = path.join(run, 'hot-reload', 'actual-sample-001');
assert.equal(fs.existsSync(directory), false);
assert.equal(JSON.parse(fs.readFileSync(path.join(run, 'diagnostic-budget.json'))).authorizations.length, 0);
const controller = 'C:\\src\\aspnetcore\\src\\Security\\samples\\CustomPolicyProvider\\Controllers\\HomeController.cs';
const before = fs.readFileSync(controller);
const hash = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
assert.equal(hash(before), 'D39865D55C68F8863F83980C2621341A7B51595F601CCA60F4F77D1DDC09FD5F');
const text = before.toString('utf8');
assert.equal(text.split('[MinimumAgeAuthorize(10)]').length, 2);
const after = Buffer.from(text.replace('[MinimumAgeAuthorize(10)]', '[MinimumAgeAuthorize(11)]'), 'utf8');
const reservation = net.createServer();
await new Promise((resolve, reject) => {
  reservation.once('error', reject);
  reservation.listen(0, '127.0.0.1', resolve);
});
const port = reservation.address().port;
await new Promise((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()));
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'controller-before.cs'), before, { flag: 'wx' });
fs.writeFileSync(path.join(directory, 'controller-after.expected.cs'), after, { flag: 'wx' });
const configuration = {
  candidate: 'F126', actualPort: port, actualLoopbackOnlyUrl: `http://127.0.0.1:${port}`,
  actualController: controller, actualBeforeSha256: hash(before), actualAfterExpectedSha256: hash(after),
  actualChange: '[MinimumAgeAuthorize(10)] -> [MinimumAgeAuthorize(11)] on the real existing MVC action',
  actualNoShippingSourceModificationByThisPreparation: true, actualMaximumWatchSeconds: 600,
  actualMachineSettingsChanged: false, actualNoBrowserLaunch: true, actualComparisonAuthorizations: 0
};
fs.writeFileSync(path.join(directory, 'configuration.json'), JSON.stringify(configuration, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(configuration, null, 2));
