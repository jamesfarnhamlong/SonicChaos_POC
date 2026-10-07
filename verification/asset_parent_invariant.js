// Source locks may permit only approved virtual parents, never gameplay edits.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const {isDeepStrictEqual} = require('util');

function unchangedExceptAssetParents(root, revision, paths) {
    const diff = cp.spawnSync('git', ['diff', '--name-only', revision, '--', ...paths],
        {cwd: root, encoding: 'utf8'});
    if (diff.status !== 0) return 1;
    const parents = new Map(fs.readFileSync(path.join(root, 'verification/chaos_asset_parents.csv'), 'utf8')
        .trim().split(/\r?\n/).slice(1).map(line => {
            const [name, resourcePath, parent] = line.split(',');
            return [resourcePath, {name: parent.split('/').pop().slice(0, -3), path: parent}];
        }));
    const parse = text => JSON.parse(text.replace(/,\s*([}\]])/g, '$1'));
    for (const file of diff.stdout.trim().split(/\r?\n/).filter(Boolean)) {
        if (!file.endsWith('.yy') || !parents.has(file)) return 1;
        const old = cp.spawnSync('git', ['show', revision + ':' + file],
            {cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
        if (old.status !== 0 || !fs.existsSync(path.join(root, file))) return 1;
        const before = parse(old.stdout), after = parse(fs.readFileSync(path.join(root, file), 'utf8'));
        if (!isDeepStrictEqual(after.parent, parents.get(file))) return 1;
        delete before.parent; delete after.parent;
        if (!isDeepStrictEqual(before, after)) return 1;
    }
    return 0;
}

module.exports = {unchangedExceptAssetParents};
