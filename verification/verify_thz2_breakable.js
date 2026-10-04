// Executes the shipped GML core against the canonical THZ2 layout to verify the type-13 (block $9C) breakables.
// Expected values come from the recovered ROM handlers ($72B6/$72DD side, $6B2C floor, $7464 ceiling -> $7898).
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const gml = n => fs.readFileSync(path.join(root, 'scripts', n, n + '.gml'), 'utf8');
const ctx = vm.createContext({global: {}, floor: Math.floor, round: Math.round, abs: Math.abs, min: Math.min, max: Math.max,
    array_create: (n, v) => Array(n).fill(v), array_length: a => a.length, array_push: (a, v) => a.push(v),
    array_copy: (d, di, s, si, n) => { for (let i = 0; i < n; i++) d[di + i] = s[si + i]; },
    variable_global_exists: k => k in ctx.global, is_array: Array.isArray});
for (const n of ['SCR_chaos_motion_data', 'SCR_chaos_core_data', 'SCR_chaos_core', 'SCR_chaos_level_thz2_data'])
    vm.runInContext(gml(n), ctx, {filename: n + '.gml'});
// The adapter file mixes GameMaker-only code; execute only the break function verbatim.
const adapter = gml('SCR_chaos_adapter');
vm.runInContext(adapter.slice(adapter.indexOf('function SCR_chaos_break_block'),adapter.indexOf('function SCR_chaos_break16_block')), ctx);
ctx.SCR_chaos_motion_data(); ctx.SCR_chaos_core_data();

function fresh() {
    ctx.global.chaosTileIds = ctx.SCR_chaos_thz2_tile_ids().slice();
    ctx.global.chaosBrokenCells = [];
}
const idx = (x, y) => (y >> 5) * 128 + (x >> 5);
const CELLS = [[128, 704], [160, 704], [192, 704], [288, 704], [320, 704], [352, 704]];
fresh();
for (const [x, y] of CELLS) assert.strictEqual(ctx.global.chaosTileIds[idx(x, y)], 0x9C, `cell ${x},${y} is block $9C`);
assert.strictEqual(ctx.SCR_cc_lookup(130, 706, 0).flags & 31, 13, 'block $9C is surface type 13');
assert.strictEqual(ctx.SCR_cc_lookup(130, 706, 0).flags & 128, 128, 'block $9C is solid');

function rolling(x, y, vx, extra) {
    return Object.assign(ctx.SCR_cc_new(x, y), {state: 9, next: 9, move: 2, vx}, extra || {});
}
const results = {};
// Side, right probe: player x=121 puts probe x+9=130 in cell (128,704); y+6=706 is in row 22.
fresh(); let c = rolling(121, 700, 4 * 256);
ctx.SCR_cc_sides(c);
assert.strictEqual(ctx.global.chaosTileIds[idx(128, 704)], 0x9D, 'right side break writes $9D');
assert.strictEqual(c.vx, 4 * 256 + 64, 'right side high byte < 7 adds $40');
assert.strictEqual(c.bg & 4, 0, 'no wall projection on a breaking hit');
results.right_side = {vx_before: 1024, vx_after: c.vx, cell: idx(128, 704)};
// Side, right probe, high byte >= 7: velocity unchanged.
fresh(); c = rolling(121, 700, 8 * 256); ctx.SCR_cc_sides(c);
assert.strictEqual(ctx.global.chaosTileIds[idx(128, 704)], 0x9D); assert.strictEqual(c.vx, 8 * 256);
// Side, left probe: player x=376 -> right probe 385 is open, left probe 367 is in cell (352,704).
fresh(); c = rolling(376, 700, -4 * 256); ctx.SCR_cc_sides(c);
assert.strictEqual(ctx.global.chaosTileIds[idx(352, 704)], 0x9D, 'left side break writes $9D');
assert.strictEqual(c.vx, -4 * 256 - 64, 'left side negated high byte < 7 adds -$40');
results.left_side = {vx_before: -1024, vx_after: c.vx, cell: idx(352, 704)};
// Not rolling, or slower than 3.0: ordinary wall projection, no break.
fresh(); c = rolling(121, 700, 4 * 256, {move: 0}); ctx.SCR_cc_sides(c);
assert.strictEqual(ctx.global.chaosTileIds[idx(128, 704)], 0x9C, 'not rolling: no break');
assert.notStrictEqual(c.bg & 4, 0, 'not rolling: ordinary wall projection');
fresh(); c = rolling(121, 700, 2 * 256 + 255); ctx.SCR_cc_sides(c);
assert.strictEqual(ctx.global.chaosTileIds[idx(128, 704)], 0x9C, 'high byte 2: no break');
fresh(); c = rolling(121, 700, 3 * 256); ctx.SCR_cc_sides(c);
assert.strictEqual(ctx.global.chaosTileIds[idx(128, 704)], 0x9D, 'high byte 3: breaks');
// Floor entry $6B2C: rolling on top of the block.
fresh(); c = rolling(140, 704 - 18 + 2, 0, {state: 9, bg: 0, vy: 512, move: 3});
ctx.SCR_cc_floor(c);
assert.strictEqual(ctx.global.chaosTileIds[idx(128, 704)], 0x9D, 'floor entry breaks');
assert.strictEqual(c.vy, -1088, 'floor entry Y velocity $FBC0'); assert.strictEqual(c.move & 1, 1, 'airborne');
fresh(); c = rolling(140, 704 - 18 + 2, 0, {state: 16, bg: 0, vy: 512, move: 3}); ctx.SCR_cc_floor(c);
assert.strictEqual(ctx.global.chaosTileIds[idx(128, 704)], 0x9C, 'state $10 is excluded');
fresh(); c = rolling(140, 704 - 18 + 2, 0, {state: 5, bg: 0, vy: 512, move: 1}); ctx.SCR_cc_floor(c);
assert.strictEqual(ctx.global.chaosTileIds[idx(128, 704)], 0x9C, 'not rolling: no floor break');
// Ceiling entry $7464 -> $7898: moving upward, no floor contact, no platform support.
fresh(); c = rolling(140, 704 + 6 + 2, 0, {state: 10, vy: -256, bg: 0, move: 1});
ctx.SCR_cc_ceiling(c);
assert.strictEqual(ctx.global.chaosTileIds[idx(128, 704)], 0x9D, 'ceiling entry breaks');
// After a break the cell is empty ($9D, flags $00) and the broken list records it exactly once.
fresh(); c = rolling(121, 700, 4 * 256); ctx.SCR_cc_sides(c); ctx.SCR_chaos_break_block(idx(128, 704));
assert.deepStrictEqual(Array.from(ctx.global.chaosBrokenCells), [idx(128, 704)]);
assert.strictEqual(ctx.SCR_cc_lookup(130, 706, 0).flags, 0, 'block $9D has collision flags $00');
// THZ1 has no type-13 block, so THZ1 behaviour cannot change.
const thz1 = JSON.parse(fs.readFileSync(path.join(root, 'POC_notes/rom-cache/levels/thz1/layout.json'), 'utf8'));
assert.ok(!thz1.block_usage.some(b => b.collision_surface_type === 13), 'THZ1 layout has no type-13 block');
const report = {actual_gml_executed: true, cells: CELLS.length, layout: 'THZ2 canonical', cases: results,
    fragments: 'UNRESOLVED: four type-$07 objects are not presented', d3b2_timer: 'UNRESOLVED: set to $10 by the floor entry only'};
fs.writeFileSync(path.join(__dirname, 'thz2-breakable-results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
console.log('THZ2 BREAKABLE CHECKS PASSED');
