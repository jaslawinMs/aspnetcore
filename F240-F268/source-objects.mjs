import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const sha256 = content => crypto.createHash('sha256').update(content).digest('hex').toUpperCase();
export const gitId = (type, content) => crypto.createHash('sha1').update(`${type} ${content.length}\0`).update(content).digest('hex');
export function treeEntries(content)
{
    const entries = new Map();
    let offset = 0;
    while (offset < content.length)
    {
        const space = content.indexOf(32, offset);
        const nul = content.indexOf(0, space + 1);
        assert.ok(space > offset && nul > space && nul + 21 <= content.length);
        const name = content.subarray(space + 1, nul).toString('utf8');
        assert.equal(entries.has(name), false);
        entries.set(name, { mode: content.subarray(offset, space).toString('ascii'), sha: content.subarray(nul + 1, nul + 21).toString('hex') });
        offset = nul + 21;
    }
    return entries;
}
export function verifyMembership(root, index)
{
    const objects = new Map();
    for (const item of index.objects)
    {
        assert.ok(['commit', 'tree', 'blob'].includes(item.type));
        assert.match(item.sha, /^[a-f0-9]{40}$/);
        assert.equal(item.file, `raw-git/objects/${item.sha}.payload`);
        const content = fs.readFileSync(path.join(root, item.file));
        assert.equal(content.length, item.bytes);
        assert.equal(sha256(content), item.sha256);
        assert.equal(gitId(item.type, content), item.sha);
        assert.equal(objects.has(item.sha), false);
        objects.set(item.sha, { ...item, content });
    }
    const keys = new Set();
    for (const item of index.sources)
    {
        const key = `${item.finding}/${item.role}/${item.path}`;
        assert.equal(keys.has(key), false);
        keys.add(key);
        assert.equal(item.compilationSource, undefined);
        const commit = objects.get(item.commit);
        assert.equal(commit.type, 'commit');
        let current = commit.content.toString('utf8').match(/^tree ([a-f0-9]{40})$/m)[1];
        const parts = item.path.split('/');
        assert.ok(parts.every(part => part && part !== '.' && part !== '..'));
        for (const [index, part] of parts.entries())
        {
            const tree = objects.get(current);
            assert.equal(tree.type, 'tree');
            const entry = treeEntries(tree.content).get(part);
            assert.ok(entry, item.path);
            assert.equal(entry.mode, index === parts.length - 1 ? '100644' : '40000');
            current = entry.sha;
        }
        assert.equal(current, item.blob);
        assert.equal(objects.get(current).type, 'blob');
    }
    return { objects: objects.size, memberships: keys.size };
}
