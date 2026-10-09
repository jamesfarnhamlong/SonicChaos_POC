// Executes the shipped generic object loader (SCR_chaos_level) against the generated canonical THZ2 census with
// stubbed GameMaker instances, verifying dispatch, provenance and per-type configuration.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const hex = t => t.replace(/(?<![-\w"])\$([0-9A-Fa-f]+)/g, '0x$1');
const read = n => fs.readFileSync(path.join(root, 'scripts', n, n + '.gml'), 'utf8');
const levelSrc = read('SCR_chaos_level');
const loaderSrc = hex(levelSrc.slice(levelSrc.indexOf('function chaos_level_object_rows()'), levelSrc.indexOf('/// Loop centres/rows/planes')));
const created = [];
const obj = n => ({obj: n});
const ctx = vm.createContext({global: {}, array_create: (n, v) => Array(n).fill(v), array_length: a => a.length, array_push: (a, v) => a.push(v),
    noone: -4, instance_create: (x, y, o) => { const i = {x, y, object: o.obj}; created.push(i); return i; },
    OBJ_chaos_object_10: obj('10'), OBJ_chaos_object_18: obj('18'), OBJ_chaos_object_21: obj('21'), OBJ_chaos_object_27: obj('27'),
    OBJ_chaos_object_spring_26_normal: obj('26n'), OBJ_chaos_object_spring_26_weak: obj('26w'), OBJ_chaos_object_spring_26_span: obj('26s'),
    OBJ_chaos_platform: obj('28'), SPR_chaos_object_10: 'spr10', SPR_chaos_object_10_03: 'spr10_03', SPR_chaos_object_10_04: 'spr10_04',
    SPR_chaos_object_10_06: 'spr10_06', chaos_is_thz2: () => true, chaos_is_thz3: () => false,
    chaos_aqz_act: () => 0, chaos_is_aqz: () => false, chaos_sez_act: () => 0, chaos_is_sez: () => false, chaos_mghz_act: () => 0, chaos_gpz_act: () => 0, chaos_is_mghz: () => false, chaos_is_gpz: () => false});   // Shared loader act helpers; this is the THZ2 control fixture
vm.runInContext(hex(read('SCR_chaos_level_thz2_data')), ctx);
vm.runInContext(hex(read('SCR_chaos_platform')).replace(/#macro (\w+) (\S+)/g, 'var $1 = $2;'), ctx);   // chaos_platform28_configure (recovered type $28 model)
vm.runInContext(loaderSrc, ctx);
ctx.chaos_level_spawn_objects();
const byType = {};
created.forEach(i => byType[i.object] = (byType[i.object] || 0) + 1);
assert.deepStrictEqual(byType, {'10': 5, '18': 1, '21': 5, '27': 4, '26n': 8, '26w': 1, '26s': 1, '28': 3});
assert.strictEqual(created.length, 28, '41 raw records minus the 13 ring-manager type-$09 records');
const spawned = Array.from(ctx.global.chaosSpawnedByType);
assert.deepStrictEqual([0x10, 0x18, 0x21, 0x26, 0x27, 0x28, 0x09].map(t => spawned[t]), [5, 1, 5, 10, 4, 3, 0]);
assert.strictEqual(Array.from(ctx.global.chaosSkippedByType).reduce((a, b) => a + b, 0), 0, 'no unsupported type is silently dropped');
const idx = Array.from(ctx.global.chaosSpawnedIndices);
assert.strictEqual(new Set(idx).size, idx.length, 'no placement consumed twice');
// provenance and canonical coordinates
const rows = ctx.SCR_chaos_thz2_objects();
created.forEach(i => { assert.ok(i.chaosPlacementIndex && i.chaosPlacementRom !== undefined && i.chaosSourceClass.startsWith('object-$')); });
rows.filter(r => r[3] !== 9).forEach(r => {
    const i = created.find(c => c.chaosPlacementIndex === r[0]);
    assert.ok(i && i.x === r[1] && i.y === r[2], `record ${r[0]} at its canonical coordinates`);
});
// per-type configuration
const t10 = created.filter(i => i.object === '10').map(i => [i.x, i.y, i.chaosParameter, i.chaosGraphicsSelector, i.sprite_index]);
assert.deepStrictEqual(t10, [[1088, 206, 6, 6, 'spr10_06'], [336, 302, 3, 3, 'spr10_03'], [2784, 270, 3, 3, 'spr10_03'], [2544, 494, 4, 4, 'spr10_04'], [64, 718, 2, 2, 'spr10']]);
const t21 = created.filter(i => i.object === '21').map(i => [i.x, i.y, i.chaosParameter, i.chaosOriginX === undefined ? null : i.chaosLeftBound]);
created.filter(i => i.object === '21').forEach(i => { i.chaosOriginX = i.x; ctx.chaos_type21_configure(i, i.chaosParameter, 0); });
assert.deepStrictEqual(created.filter(i => i.object === '21').map(i => i.chaosLeftBound - i.x), [-64, -64, -48, -64, -48]);
const span = created.find(i => i.object === '26s');
assert.deepStrictEqual([span.x, span.y, span.chaosSpan], [1504, 896, 128]);
assert.deepStrictEqual(created.filter(i => i.object === '28').map(i => [i.chaosMode, i.chaosPeriod, i.chaosVY]), [[11, 400, -256], [11, 304, -256], [5, 0, 0]], 'THZ2 lifts (aux1 $19/$13 -> 16 x aux1) and the sag platform');
// the loader touches only the rows: THZ1 (no rows) spawns nothing
ctx.chaos_is_thz2 = () => false; created.length = 0; ctx.chaos_level_spawn_objects();
assert.strictEqual(created.length, 0);
console.log('THZ2 OBJECT LOADER CHECKS PASSED');
