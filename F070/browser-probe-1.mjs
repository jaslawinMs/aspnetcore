import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const [baseUrl, outputPath, profilePath] = process.argv.slice(2);
assert(baseUrl && outputPath && profilePath, 'Expected URL, output file, and owned profile directory.');
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
                const pending = this.pending.get(message.id);
                assert(pending, `Unexpected command response ${message.id}.`);
                this.pending.delete(message.id);
                clearTimeout(pending.timer);
                if (message.error)
                {
                    pending.reject(new Error(JSON.stringify(message.error)));
                }
                else
                {
                    pending.resolve(message.result);
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
                reject(new Error(`CDP command timed out: ${method}`));
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
    '--headless=new', '--remote-debugging-port=0',
    `--user-data-dir=${profilePath}`, '--no-first-run', '--no-default-browser-check',
    'about:blank',
], { stdio: 'ignore' });
const browserExit = new Promise(resolve => browser.once('exit', resolve));
let browserCdp;
let page;
const errors = [];
const frameworkResponses = [];
const webSockets = [];
const records = [];
try
{
    const portPath = path.join(profilePath, 'DevToolsActivePort');
    await waitFor(() => existsSync(portPath), 'owned Edge remote-debugging readiness');
    const [port, browserSocketPath] = readFileSync(portPath, 'utf8').trim().split(/\r?\n/);
    browserCdp = new Cdp(`ws://127.0.0.1:${port}${browserSocketPath}`);
    await browserCdp.ready;
    const tabsResponse = await fetch(`http://127.0.0.1:${port}/json/list`);
    assert.equal(tabsResponse.status, 200);
    const tab = (await tabsResponse.json()).find(item => item.type === 'page');
    assert(tab, 'Expected an owned browser tab.');
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
            webSockets.push({ id: message.params.requestId, created: true });
        }
        if (message.method === 'Network.webSocketHandshakeResponseReceived')
        {
            const socket = webSockets.find(item => item.id === message.params.requestId);
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
        url: new URL('autoperf-navlink/alpha', baseUrl).href,
    });
    assert(!navigation.errorText, navigation.errorText);
    await waitFor(() => page.evaluate("!!document.querySelector('#f070-increment')"), 'diagnostic page');
    await waitFor(() => webSockets.some(socket => socket.status === 101), 'actual server circuit WebSocket');

    async function click(selector)
    {
        const point = await page.evaluate(`(() => {
            const element = document.querySelector(${JSON.stringify(selector)});
            if (!element) throw new Error('Missing click target');
            element.scrollIntoView({block:'center'});
            const box = element.getBoundingClientRect();
            return {x:box.x+box.width/2,y:box.y+box.height/2};
        })()`);
        await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
        await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
    }

    await click('#f070-increment');
    await waitFor(() => page.evaluate("document.querySelector('#f070-counter').textContent === '1'"), 'real interactive counter increment');
    const instance = await page.evaluate("document.querySelector('#f070-instance').textContent");
    assert(instance);

    async function snapshot(name, expectedIds)
    {
        await waitFor(() => page.evaluate(`(() => {
            const actual = [...document.querySelectorAll('#f070-links a.active')].map(a => a.id).sort();
            return JSON.stringify(actual) === ${JSON.stringify(JSON.stringify([...expectedIds].sort()))};
        })()`), `${name} active CSS`);
        const state = await page.evaluate(`(() => ({
            path: location.pathname, query: location.search, fragment: location.hash,
            counter: document.querySelector('#f070-counter').textContent,
            instance: document.querySelector('#f070-instance').textContent,
            links: [...document.querySelectorAll('#f070-links a')].map(a => ({
                id:a.id, href:a.getAttribute('href'), class:a.getAttribute('class'),
                aria:a.getAttribute('aria-current')
            }))
        }))()`);
        assert.equal(state.counter, '1', `${name}: retained interactive counter`);
        assert.equal(state.instance, instance, `${name}: retained component instance`);
        assert.equal(state.links.length, 8);
        for (const link of state.links)
        {
            assert.equal(link.aria, expectedIds.includes(link.id) ? 'page' : null, `${name}:${link.id} aria`);
        }
        records.push({ name, ...state, instance: undefined, retained_instance: true });
    }

    const alpha = ['f070-exact', 'f070-mixed', 'f070-slash', 'f070-query', 'f070-prefix'];
    await snapshot('InitialExact', alpha);
    await click('#f070-go-mixed');
    await waitFor(() => page.evaluate("location.pathname.endsWith('/ALPHA')"), 'mixed-case real navigation');
    await snapshot('MixedCase', alpha);
    await click('#f070-neighbor');
    await snapshot('ActualAnchorNeighbor', ['f070-neighbor']);
    await click('#f070-go-separator');
    await snapshot('UnreservedPrefixNonMatch', []);
    await click('#f070-go-child');
    await snapshot('PrefixChild', ['f070-prefix']);
    await click('#f070-go-query');
    await snapshot('QueryAndFragment', alpha);
    await click('#f070-go-slash');
    await snapshot('OneWayTrailingSlash', ['f070-slash', 'f070-prefix']);
    await click('#f070-go-unicode');
    await snapshot('EncodedUnicode', ['f070-unicode']);
    await click('#f070-go-exact');
    await snapshot('ReturnToExact', alpha);
    assert(frameworkResponses.some(response => response.path.endsWith('/blazor.web.js') && response.status === 200));
    assert(frameworkResponses.every(response => response.status === 200));
    assert.deepEqual(errors, [], 'No current-page browser errors');
    writeFileSync(outputPath, JSON.stringify({
        driver: 'dependency-free Node CDP against existing Edge; Playwright unavailable',
        browser_version: await browserCdp.send('Browser.getVersion'),
        browser_pid: browser.pid, baseline_or_proposal: path.basename(outputPath),
        cases: records, framework_responses: frameworkResponses,
        server_websocket_101: webSockets.some(socket => socket.status === 101),
        current_page_errors: errors, counter_action_verified: true,
    }, null, 2) + '\n');
    console.log(`Real browser: ${records.length} retained-instance navigation states passed; counter, CSS, aria, framework assets, and server circuit verified.`);
}
finally
{
    page?.socket.close();
    if (browserCdp)
    {
        await browserCdp.send('Browser.close');
        browserCdp.socket.close();
        await Promise.race([
            browserExit,
            delay(10000).then(() => { throw new Error(`Owned Edge ${browser.pid} did not exit.`); }),
        ]);
    }
}
