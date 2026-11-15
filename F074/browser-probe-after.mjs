import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const [baseUrl, outputPath, profilePath] = process.argv.slice(2);
assert(baseUrl && outputPath && profilePath, 'Expected URL, receipt, and owned profile.');
assert(!existsSync(profilePath), 'Do not reuse another browser profile.');
const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
assert(existsSync(browserPath), 'Expected the already-installed Edge browser.');

class Cdp
{
    constructor(url)
    {
        this.pending = new Map();
        this.listeners = [];
        this.nextId = 0;
        this.socket = new WebSocket(url);
        this.ready = new Promise((resolve, reject) =>
        {
            this.socket.addEventListener('open', resolve, { once: true });
            this.socket.addEventListener('error', reject, { once: true });
        });
        this.socket.addEventListener('message', event =>
        {
            const message = JSON.parse(event.data);
            if (message.id)
            {
                const request = this.pending.get(message.id);
                assert(request, `Unexpected command response ${message.id}.`);
                this.pending.delete(message.id);
                clearTimeout(request.timer);
                if (message.error)
                {
                    request.reject(new Error(JSON.stringify(message.error)));
                }
                else
                {
                    request.resolve(message.result);
                }
            }
            else
            {
                for (const listener of this.listeners)
                {
                    listener(message);
                }
            }
        });
    }

    async send(method, params = {})
    {
        await this.ready;
        const id = ++this.nextId;
        return await new Promise((resolve, reject) =>
        {
            const timer = setTimeout(() =>
            {
                this.pending.delete(id);
                reject(new Error(`CDP command timed out: ${method}.`));
            }, 30000);
            this.pending.set(id, { resolve, reject, timer });
            this.socket.send(JSON.stringify({ id, method, params }));
        });
    }

    async evaluate(expression)
    {
        const response = await this.send('Runtime.evaluate', {
            expression, awaitPromise: true, returnByValue: true,
        });
        assert(!response.exceptionDetails, JSON.stringify(response.exceptionDetails));
        return response.result.value;
    }
}

async function waitFor(check, description, timeout = 30000)
{
    const deadline = Date.now() + timeout;
    while (!await check())
    {
        assert(Date.now() < deadline, `Timed out waiting for ${description}.`);
        await delay(50);
    }
}

const browser = spawn(browserPath, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profilePath}`,
    '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: 'ignore' });
const browserExit = new Promise(resolve => browser.once('exit', resolve));
let browserCdp;
let page;
const errors = [];
const frameworkResponses = [];
const sockets = [];
const records = [];
const expectedUnicode = '\u00E9\u6F22\u{1F642} "quoted" \\ path <tag> & line\n'.repeat(64);
const expectedAttribute = '\u00E9\u6F22 "quote" \\ path <tag> & value';
try
{
    const portFile = path.join(profilePath, 'DevToolsActivePort');
    await waitFor(() => existsSync(portFile), 'owned Edge readiness');
    const [port, browserSocketPath] = readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
    browserCdp = new Cdp(`ws://127.0.0.1:${port}${browserSocketPath}`);
    await browserCdp.ready;
    const tabs = await fetch(`http://127.0.0.1:${port}/json/list`);
    assert.equal(tabs.status, 200);
    const tab = (await tabs.json()).find(item => item.type === 'page');
    assert(tab, 'Expected an owned page.');
    page = new Cdp(tab.webSocketDebuggerUrl);
    page.listeners.push(message =>
    {
        if (message.method === 'Runtime.exceptionThrown')
        {
            errors.push(message.params.exceptionDetails);
        }
        if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error')
        {
            errors.push(message.params.args.map(argument => argument.value ?? argument.description));
        }
        if (message.method === 'Network.responseReceived' &&
            new URL(message.params.response.url).pathname.includes('/_framework/'))
        {
            frameworkResponses.push({
                path: new URL(message.params.response.url).pathname,
                status: message.params.response.status,
            });
        }
        if (message.method === 'Network.webSocketCreated' &&
            message.params.url.includes('/_blazor'))
        {
            sockets.push({ id: message.params.requestId });
        }
        if (message.method === 'Network.webSocketHandshakeResponseReceived')
        {
            const socket = sockets.find(item => item.id === message.params.requestId);
            if (socket)
            {
                socket.status = message.params.response.status;
            }
        }
    });
    await page.send('Runtime.enable');
    await page.send('Network.enable');
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', {
        width: 1280, height: 960, deviceScaleFactor: 1, mobile: false,
    });
    const navigation = await page.send('Page.navigate', {
        url: new URL('autoperf-fragment', baseUrl).href,
    });
    assert(!navigation.errorText, navigation.errorText);
    await waitFor(() => sockets.some(socket => socket.status === 101), 'real Server WebSocket');
    await page.evaluate(`document.addEventListener('click', event => {
        window.f074LastClick = {id:event.target.id,trusted:event.isTrusted};
    }, true)`);

    for (const id of ['plain', 'unicode', 'empty'])
    {
        await waitFor(() => page.evaluate(`document.querySelector('#f074-${id}-interactive')?.textContent === 'True'`),
            `${id} interactive after-render`);
        await waitFor(() => page.evaluate(`(() => {
            const button = document.querySelector('#f074-${id}-increment');
            return Object.getOwnPropertyNames(button).some(key =>
                key.startsWith('_blazorEvents_') && button[key].getHandler('click'));
        })()`), `${id} real EventDelegator handler`);
    }

    async function snapshot(id, count)
    {
        const state = await page.evaluate(`(() => ({
            interactive:document.querySelector('#f074-${id}-interactive').textContent,
            count:document.querySelector('#f074-${id}-count').textContent,
            label:document.querySelector('#f074-${id}-label').textContent,
            child:document.querySelector('#f074-${id}-child').textContent,
            plain:document.querySelector('#f074-plain-content p').textContent,
            emphasis:document.querySelector('#f074-plain-emphasis').textContent,
            plain_attribute:document.querySelector('#f074-plain-content').getAttribute('data-value'),
            unicode:document.querySelector('#f074-unicode-content').textContent,
            unicode_attribute:document.querySelector('#f074-unicode-content').getAttribute('data-fragment')
        }))()`);
        assert.equal(state.interactive, 'True');
        assert.equal(state.count, String(count));
        assert.equal(state.plain, 'Hello from SSR');
        assert.equal(state.emphasis, 'nested content');
        assert.equal(state.plain_attribute, '42');
        assert.equal(state.unicode, expectedUnicode);
        assert.equal(state.unicode_attribute, expectedAttribute);
        assert.equal(state.label, {
            plain: 'ordinary typed label', unicode: 'escaped fragment', empty: 'no fragment control',
        }[id]);
        if (id === 'empty')
        {
            assert.equal(state.child, '');
        }
        records.push({ id, expected_count: count, ...state });
    }

    for (const id of ['plain', 'unicode', 'empty'])
    {
        await snapshot(id, 0);
        const selector = `#f074-${id}-increment`;
        const point = await page.evaluate(`(() => {
            const element = document.querySelector(${JSON.stringify(selector)});
            element.scrollIntoView({block:'center',behavior:'instant'});
            const box = element.getBoundingClientRect();
            const point = {x:box.x+box.width/2,y:box.y+box.height/2};
            const hit = document.elementFromPoint(point.x, point.y);
            if (hit !== element && !element.contains(hit)) throw new Error('Occluded input target');
            return point;
        })()`);
        await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
        await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
        await waitFor(() => page.evaluate(`window.f074LastClick?.id === ${JSON.stringify(selector.slice(1))} &&
            window.f074LastClick.trusted === true &&
            document.querySelector('#f074-${id}-count').textContent === '1'`),
            `${id} trusted input and resulting rerender`);
        await snapshot(id, 1);
    }

    const script = await page.evaluate("document.querySelector('script[src*=\"blazor.web\"]').src");
    const scriptPath = new URL(script).pathname;
    assert(/\/_framework\/blazor\.web(?:\.[a-z0-9]+)?\.js$/.test(scriptPath));
    assert(frameworkResponses.some(response => response.path === scriptPath && response.status === 200));
    assert(frameworkResponses.every(response => response.status === 200));
    assert.deepEqual(errors, [], 'No current-page errors.');
    writeFileSync(outputPath, JSON.stringify({
        driver: 'existing Edge via Node CDP; current Playwright MODULE_NOT_FOUND',
        browser_version: await browserCdp.send('Browser.getVersion'),
        browser_pid: browser.pid, cases: records, trusted_clicks: 3,
        server_websocket_101: true, actual_framework_script: scriptPath,
        framework_responses: frameworkResponses, current_page_errors: errors,
    }, null, 2) + '\n');
    console.log('Six original/restored fragment states passed: plain, escaped Unicode/large content, no-fragment control, and three trusted interactive rerenders.');
}
catch (error)
{
    const state = page ? await page.evaluate('({url:location.href,body:document.body.innerText,last_click:window.f074LastClick})') : null;
    writeFileSync(outputPath.replace(/\.json$/, '.failure.json'), JSON.stringify({
        error: String(error), stack: error.stack, observed_state: state,
        cases: records, current_page_errors: errors, framework_responses: frameworkResponses,
        web_sockets: sockets,
    }, null, 2) + '\n');
    throw error;
}
finally
{
    page?.socket.close();
    if (browserCdp)
    {
        await browserCdp.send('Browser.close');
        browserCdp.socket.close();
        await Promise.race([browserExit, delay(10000, undefined, { ref: false })]);
    }
    if (browser.exitCode === null)
    {
        const stopped = spawnSync('powershell.exe', [
            '-NoProfile', '-NonInteractive', '-Command',
            `Stop-Process -Id ${browser.pid} -ErrorAction Stop`,
        ], { encoding: 'utf8' });
        assert.equal(stopped.status, 0, `Could not stop owned Edge ${browser.pid}: ${stopped.stderr}`);
        await browserExit;
    }
}
