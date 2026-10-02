// Executes shipped GML against canonical layouts: (1) loop centres derived from the ROM entry tiles $51/$52 must
// reproduce the former THZ1 constants exactly and yield THZ2's loops; (2) the shared twist core traverses every
// THZ2 strip in both directions using the same fixtures/relative offsets as the accepted THZ1 traversal.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const gml = n => fs.readFileSync(path.join(root, 'scripts', n, n + '.gml'), 'utf8');
const ctx = vm.createContext({global: {}, floor: Math.floor, round: Math.round, abs: Math.abs, min: Math.min, max: Math.max,
    array_create: (n, v) => Array(n).fill(v), array_length: a => a.length, array_push: (a, v) => a.push(v),
    array_copy: (d, di, s, si, n) => { for (let i = 0; i < n; i++) d[di + i] = s[si + i]; }, is_array: Array.isArray, variable_global_exists: k => k in ctx.global});
for (const n of ['SCR_chaos_motion_data', 'SCR_chaos_core_data', 'SCR_chaos_core', 'SCR_chaos_loop_layout', 'SCR_chaos_level_thz2_data'])
    vm.runInContext(gml(n), ctx, {filename: n + '.gml'});
ctx.SCR_chaos_motion_data(); ctx.SCR_chaos_core_data();
const thz1Ids = ctx.global.chaosTileIds.slice();
const thz2Ids = ctx.SCR_chaos_thz2_tile_ids().slice();

// --- loops -------------------------------------------------------------------------------------------------
const l1 = ctx.SCR_chaos_loop_layout(thz1Ids);
assert.deepStrictEqual(Array.from(l1.centers), [2368, 2880], 'THZ1 centres reproduced from the layout');
assert.deepStrictEqual(Array.from(l1.rows), [416, 512], 'THZ1 rows reproduced from the layout');
assert.deepStrictEqual(Array.from(ctx.global.chaosLoopCenters), Array.from(l1.centers), 'matches the previously hard-coded data');
const l2 = ctx.SCR_chaos_loop_layout(thz2Ids);
assert.deepStrictEqual(Array.from(l2.centers), [1088, 2528]);
assert.deepStrictEqual(Array.from(l2.rows), [384, 672]);
// The ROM plane-switch columns ($A1 left, $A2 right) sit at centre-96 / centre+64 in both levels, which is what the
// adapter's plane-selection thresholds (centre-96, centre+96) assume.
function planeColumns(ids, centers, rows) {
    centers.forEach((cx, i) => {
        const row = rows[i] / 32;
        let left = 0, right = 0;
        for (let r = 0; r < 32; r++) {
            if (ids[r * 128 + (cx - 96) / 32] === 0xA1) left++;
            if (ids[r * 128 + (cx + 64) / 32] === 0xA2) right++;
        }
        assert.ok(left >= 5 && right >= 5, `loop ${i}: plane columns present (${left}/${right})`);
        assert.strictEqual(ids[row * 128 + cx / 32 - 1], 0x51); assert.strictEqual(ids[row * 128 + cx / 32], 0x52);
    });
}
planeColumns(thz1Ids, l1.centers, l1.rows); planeColumns(thz2Ids, l2.centers, l2.rows);
assert.ok(!thz2Ids.includes(0x57) && !thz1Ids.includes(0x57), 'alternate-exit entry tile $57 is unused in both levels');

// --- twist ---------------------------------------------------------------------------------------------------
function core(v) { return Object.assign(ctx.SCR_cc_new(200, 200), v); }
function traverse(x, y, vx, held) {
    const c = core({xu: x * 256, yu: y * 256, state: 5, next: 5, vx, move: 0, bg: 2, contacts: 2, previous: 0x97, held});
    let entered = false;
    for (let tick = 0; tick < 400; tick++) {
        ctx.SCR_cc_tick(c); entered = entered || c.state == 34 || c.next == 34;
        if (entered && c.next != 34) return {c, tick};
    }
    throw new Error(`twist traversal failed from ${x},${y} at ${vx}`);
}
// THZ1 control (accepted): entry tile $59 at (3072,576), start (3060,538); exit tile $73 at (3328,576), start (3340,520).
const results = {thz1_control: {}, thz2: []};
ctx.global.chaosTileIds = thz1Ids.slice();
const c1r = traverse(3060, 538, 1024, 8), c1l = traverse(3340, 520, -1024, 4);
assert(c1r.c.xu / 256 > 3350 && c1r.c.next == 9 && c1l.c.xu / 256 < 3080 && c1l.c.next == 9);
results.thz1_control = {right_updates: c1r.tick + 1, left_updates: c1l.tick + 1};
// THZ2: identical relative offsets from each canonical gate tile.
ctx.global.chaosTileIds = thz2Ids.slice();
const cells = t => thz2Ids.map((v, i) => v === t ? [(i % 128) * 32, Math.floor(i / 128) * 32] : null).filter(Boolean);
const gatesR = cells(0x59), gatesL = cells(0x73);
assert.strictEqual(gatesR.length, 3); assert.strictEqual(gatesL.length, 3);
gatesR.forEach(([gx, gy], i) => {
    const [ex, ey] = gatesL[i];
    const r = traverse(gx - 12, gy - 38, 1024, 8);
    assert(r.c.xu / 256 > ex + 12 && r.c.next == 9, `THZ2 strip ${i} rightward exit`);
    const l = traverse(ex + 12, ey - 56, -1024, 4);
    assert(l.c.xu / 256 < gx + 8 && l.c.next == 9, `THZ2 strip ${i} leftward exit`);
    results.thz2.push({strip: i, gate: [gx, gy], right_updates: r.tick + 1, left_updates: l.tick + 1});
});
// Too slow / wrong direction: the shared gate logic rejects entry (fixtures from the accepted THZ1 core).
let slow = core({state: 5, next: 5, vx: 767});
assert.strictEqual(ctx.SCR_cc_twist_enter(slow, 0x59), false, 'rightward entry below $0300 rejected');
assert.notStrictEqual(slow.next, 34);
slow = core({state: 5, next: 5, vx: -768});
assert.strictEqual(ctx.SCR_cc_twist_enter(slow, 0x73), false, 'leftward entry at -$0300 rejected');
slow = core({state: 5, next: 5, vx: 768});
assert.strictEqual(ctx.SCR_cc_twist_enter(slow, 0x59), true, 'rightward entry at $0300 accepted');
fs.writeFileSync(path.join(__dirname, 'thz2-loops-twist-results.json'), JSON.stringify({
    loops: {thz1: l1, thz2: l2}, twist: results, actual_gml_executed: true,
    loop_adapter_note: 'loop path following is a GameMaker instance adapter (OBJ_player based); only its layout-derived inputs are executed here'}, null, 2) + '\n');
console.log(JSON.stringify({loops: {thz1: l1, thz2: l2}, twist: results}, null, 2));
console.log('THZ2 LOOP/TWIST CHECKS PASSED');
