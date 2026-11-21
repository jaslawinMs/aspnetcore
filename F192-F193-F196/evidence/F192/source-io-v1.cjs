const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const ROOT = String.raw`C:\src\aspnetcore`;
const OUT = __dirname;
const receipts = [];
const utc = () => new Date().toISOString();
const hash = data => crypto.createHash("sha256").update(data).digest("hex");

function put(name, data) {
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const file = path.join(OUT, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes, { flag: "wx" });
    return { path: name, bytes: bytes.length, sha256: hash(bytes) };
}

function json(name, value) {
    return put(name, JSON.stringify(value, null, 2) + "\n");
}

function run(name, argv, required = false) {
    const startedUtc = utc();
    const child = spawnSync(argv[0], argv.slice(1), {
        cwd: ROOT,
        input: Buffer.alloc(0),
        env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_PAGER: "cat", GH_PAGER: "cat" },
        maxBuffer: 128 * 1024 * 1024,
        windowsHide: true
    });
    const stdout = child.stdout || Buffer.alloc(0);
    const stderr = child.stderr || Buffer.alloc(0);
    const row = {
        id: name, cwd: ROOT, argv, helperPid: process.pid,
        childPid: child.pid, startedUtc, completedUtc: utc(), exitCode: child.status,
        signal: child.signal, launchError: child.error ? String(child.error) : null,
        stdout: put(path.join("commands", name + ".stdout"), stdout),
        stderr: put(path.join("commands", name + ".stderr"), stderr),
        rootWaited: true, redirectedStdoutAndStderrFullyCollected: true
    };
    receipts.push(row);
    json(path.join("commands", name + ".json"), row);
    const limit = name.includes("generate-guid-mentions") ? 12000 : 2400;
    console.log(JSON.stringify({
        id: name, exitCode: row.exitCode, launchError: row.launchError,
        stdout: stdout.toString("utf8").slice(0, limit),
        stderr: stderr.toString("utf8").slice(0, 4000)
    }));
    if (required && (child.status !== 0 || child.error)) {
        throw new Error(name + " failed: " + child.status);
    }
    return { ...child, stdout, stderr };
}

function git(name, ...args) {
    return run(name, ["git", "--no-optional-locks", "--no-pager", "-C", ROOT, ...args]);
}

module.exports = { ROOT, OUT, receipts, utc, hash, put, json, run, git };
