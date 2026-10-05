// THZ3 foundation regression: canonical data, ROM row stride (80), terrain blocks, rings and ordinary objects. Type $50 is now loaded by the boss package.
// Executes the SHIPPED GML (generated data script, SCR_cc_lookup / terrain pipeline, loader, ring probe helpers, spike rules) against the vendored Research level package.
// Usage: node verification/verify_thz3_foundation.js
const fs = require('fs'), path = require('path'), assert = require('assert'), crypto = require('crypto'), cp = require('child_process');
const {loadHost} = require('./chaos_world_harness.js');
const root = path.resolve(__dirname, '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
let checks = 0; const eq = (a, b, m) => { assert.strictEqual(a, b, m); checks++; }; const ok = (c, m) => { assert.ok(c, m); checks++; }; const deep = (a, b, m) => { assert.deepStrictEqual(a, b, m); checks++; };
const PK = n => JSON.parse(rd(`POC_notes/rom-cache/levels/thz3/${n}.json`));
const layout = PK('layout'), rings = PK('rings'), objects = PK('objects'), manifest = PK('manifest');

// ---------- 1. vendored package == Research main; generated script == generator output ----------
const research = path.resolve(root, '..', 'sonic-chaos-reference-work', 'data', 'rom-cache', 'levels', 'thz3');
if (fs.existsSync(research)) { for (const n of ['layout', 'rings', 'manifest', 'objects', 'assets']) eq(sha(fs.readFileSync(path.join(research, n + '.json'))), sha(fs.readFileSync(path.join(root, `POC_notes/rom-cache/levels/thz3/${n}.json`))), `vendored ${n}.json is byte-identical to Research`); console.log('level package cross-checked against', research); }
{
    const before = fs.readFileSync(path.join(root, 'scripts/SCR_chaos_level_thz3_data/SCR_chaos_level_thz3_data.gml'));
    const r = cp.spawnSync(process.env.PYTHON || 'python', ['POC_notes/generate_chaos_level_data_thz3.py'], {cwd: root}); eq(r.status, 0, 'generator runs (all pinned hashes hold)');
    eq(sha(fs.readFileSync(path.join(root, 'scripts/SCR_chaos_level_thz3_data/SCR_chaos_level_thz3_data.gml'))), sha(before), 'generated data script is reproducible');
}
const host = loadHost(null), ctx = host.ctx, g = host.g;
const ids3 = ctx.SCR_chaos_thz3_tile_ids();
eq(ids3.length, 4096); deep(Array.from(ids3.slice(0, 1280)), layout.rows.flat(), 'cells = canonical layout at the ROM stride'); ok(Array.from(ids3.slice(1280)).every(v => v === 254), 'padding is the empty block');
eq(sha(Buffer.from(ids3.slice(0, 1280))), layout.runtime_cells_sha256);
eq(ctx.SCR_chaos_thz3_map_width(), 80); eq(ctx.SCR_chaos_thz3_width(), 2560); eq(ctx.SCR_chaos_thz3_height(), 512); deep(Array.from(ctx.SCR_chaos_thz3_start()), [110, 224]);

// ---------- 2. ROM row stride: lookup addressing with width 80, wrap and bounds ----------
g.chaosTileIds = ids3; g.chaosMapWidth = 80; g.chaosBrokenCells = [];
for (let row = 0; row < 16; row++) for (let col = 0; col < 80; col++) {
    const s = ctx.SCR_cc_lookup(col * 32 + 7, row * 32 + 3, 0); eq(s.tile, layout.rows[row][col], `cell ${col},${row}`); eq(s.index, row * 80 + col);
}
{   // columns past the map edge wrap into the next row (ROM addressing), rows past the stream read the padded RAM
    eq(ctx.SCR_cc_lookup(2560, 0, 0).tile, layout.rows[1][0], 'x = 2560 wraps to the next row'); eq(ctx.SCR_cc_lookup(2560 + 31 * 32, 5 * 32, 0).tile, layout.rows[6][31], 'wrap, row 5');
    eq(ctx.SCR_cc_lookup(100, 16 * 32, 0).tile, 254, 'below the map: padded empty block'); eq(ctx.SCR_cc_lookup(0, 51 * 32, 0).index, 51 * 80, 'index of row 51'); eq(ctx.SCR_cc_lookup(100, 52 * 32, 0).index, -1, 'beyond $CFFF: block $FF');
}
g.chaosMapWidth = 128; g.chaosTileIds = host.ids1; eq(ctx.SCR_cc_lookup(40 * 32, 5 * 32, 0).index, 5 * 128 + 40, 'THZ1 / THZ2 keep stride 128');

// ---------- 3. all 77 terrain blocks resolve through supported behaviour ----------
{
    const used = layout.block_usage.map(b => parseInt(b.block_id, 16)); eq(used.length, 77, '77 THZ3 terrain blocks');
    const known = new Set([...PK_act('thz1'), ...PK_act('thz2')]);
    function PK_act(a) { return JSON.parse(rd(`POC_notes/rom-cache/levels/${a}/layout.json`)).block_usage.map(b => parseInt(b.block_id, 16)); }
    for (const b of used) ok(known.has(b), `block $${b.toString(16)} already occurs in THZ1/THZ2 (no new block)`);
    const h1 = Object.fromEntries(JSON.parse(rd('POC_notes/rom-cache/levels/thz1/layout.json')).block_usage.map(b => [b.block_id, b])), h2 = Object.fromEntries(JSON.parse(rd('POC_notes/rom-cache/levels/thz2/layout.json')).block_usage.map(b => [b.block_id, b]));
    for (const b of layout.block_usage) { const ref = h1[b.block_id] || h2[b.block_id]; eq(ref.collision_header_flags, b.collision_header_flags, `header flags of ${b.block_id} identical in the other acts`); eq(ref.collision_surface_type, b.collision_surface_type); }
    // dispatch coverage: every surface type is one of the kinds the shared core already handles (SCR_cc_floor / sides / ceiling), exercised on every block with a probe grid
    const types = new Set(layout.block_usage.map(b => b.collision_surface_type)); deep([...types].sort((a, b) => a - b), [0, 1, 2, 3, 7, 9, 13, 20, 23, 24], 'surface types present in THZ3');
    const unsupportedKinds = {};
    g.chaosMapWidth = 80;
    for (const b of layout.block_usage) {
        const id = parseInt(b.block_id, 16), iso = ids3.map(() => 254); iso[3 * 80 + 10] = id; g.chaosTileIds = iso; g.chaosBrokenCells = [];
        for (let x = 10 * 32 - 12; x < 11 * 32 + 12; x += 5) for (let y = 3 * 32 - 24; y < 4 * 32 + 20; y += 5) for (const [state, vy, bg, prev] of [[5, 0, 2, 0x81], [14, 300, 0, 0x81], [14, -300, 0, 0]]) {
            const c = ctx.SCR_cc_new(x, y); Object.assign(c, {state, next: state, vy, bg, contacts: bg, previous: prev, move: bg ? 0 : 1, rings: 3});
            ctx.SCR_cc_floor(c); ctx.SCR_cc_sides(c); ctx.SCR_cc_ceiling(c); ctx.SCR_cc_merge(c);
            if (c.unsupported) unsupportedKinds[c.unsupported] = (unsupportedKinds[c.unsupported] || 0) + 1;
        }
    }
    g.chaosMapWidth = 128; g.chaosTileIds = host.ids1;
    // 'unsupported' records are the core's documented bounded dispatches (special tiles never reached on the THZ route); THZ3 may only produce kinds that THZ1/THZ2 blocks also produce
    const other = {};
    for (const [act, ids, w] of [['thz1', host.ids1, 128], ['thz2', host.ids2, 128]]) {
        g.chaosMapWidth = w; const blocks = JSON.parse(rd(`POC_notes/rom-cache/levels/${act}/layout.json`)).block_usage.map(b => parseInt(b.block_id, 16));
        for (const id of blocks) { const iso = ids.map(() => 254); iso[3 * 128 + 10] = id; g.chaosTileIds = iso; for (let x = 10 * 32 - 12; x < 11 * 32 + 12; x += 5) for (let y = 3 * 32 - 24; y < 4 * 32 + 20; y += 5) for (const [state, vy, bg, prev] of [[5, 0, 2, 0x81], [14, 300, 0, 0x81], [14, -300, 0, 0]]) {
            const c = ctx.SCR_cc_new(x, y); Object.assign(c, {state, next: state, vy, bg, contacts: bg, previous: prev, move: bg ? 0 : 1, rings: 3}); ctx.SCR_cc_floor(c); ctx.SCR_cc_sides(c); ctx.SCR_cc_ceiling(c); if (c.unsupported) other[c.unsupported] = 1; } }
    }
    g.chaosMapWidth = 128; g.chaosTileIds = host.ids1;
    for (const k of Object.keys(unsupportedKinds)) ok(other[k], `unsupported kind ${k} also arises in THZ1/THZ2 blocks (nothing new)`);
    console.log('THZ3 blocks: 77, types', [...types].join(','), 'bounded-dispatch kinds', JSON.stringify(unsupportedKinds));
}

// ---------- 4. rings ----------
{
    const terr = ctx.SCR_chaos_thz3_terrain_rings(), t9 = ctx.SCR_chaos_thz3_type09();
    eq(terr.length, 6); eq(t9.length, 3); ok(t9.every(r => r[3] === 0), 'three visible type $09'); eq(rings.counts.initial_visible_population, 9);
    g.chaosMapWidth = 80; const idx = ctx.chaos_terrain_ring_index(terr);
    for (let i = 0; i < terr.length; i++) { const [, x, y, block, cell, quad] = terr[i]; eq(cell, (y >> 5) * 80 + (x >> 5)); eq(ids3[cell], block); eq(ctx.chaos_terrain_ring_at(idx, x, y), i, `ring ${i} found by the probe lookup`); eq(ctx.chaos_terrain_ring_at(idx, x + 64, y + 64), -1, 'away from the ring cell'); }
    eq(ctx.chaos_terrain_ring_at(idx, 2560 + 8, 8), -1, 'beyond the map width'); g.chaosMapWidth = 128;
    eq(ctx.SCR_chaos_thz3_terrain_hash(), rings.hashes.terrain_coordinates_sha256); eq(ctx.SCR_chaos_thz3_all_rings_hash(), rings.hashes.all_rings_sha256);
}

// ---------- 5. the generic loader: canonical placements, including the dormant boss ----------
{
    ctx.room = host.ids.ROM_chaos_thz3; host.reset(); g.chaosMapWidth = 80;
    const rows = ctx.SCR_chaos_thz3_objects(); eq(rows.length, 10);
    deep(Array.from(rows.map(r => r[3])), objects.records.map(r => parseInt(r.type_id, 16)), 'package order and types');
    ctx.chaos_level_spawn_objects();
    const spawned = Array.from(g.chaosSpawnedByType), skipped = Array.from(g.chaosSkippedByType);
    eq(spawned[0x26], 4); eq(spawned[0x10], 1); eq(spawned[0x1B], 1); eq(spawned[0x09], 0, 'type $09 belongs to the ring manager'); eq(spawned[0x50], 1, 'canonical boss record is loaded'); eq(skipped.reduce((a, b) => a + b, 0), 0);
    eq(host.world.bosses.length, 1); deep([host.world.bosses[0].x,host.world.bosses[0].y],[1936,238]); eq(host.world.bosses[0].chaosBoss.state,-1,'boss waits for right-edge creation band');
    eq(host.world.spikes.length, 1); const sp = host.world.spikes[0]; eq(sp.x, 752); eq(sp.y, 128); eq(sp.chaosBaseY, 128, 'canonical anchor is the cycle base');
    const t10 = host.world.badniks.filter(b => b.object_index === host.ids.OBJ_chaos_object_10); eq(t10.length, 1); deep([t10[0].x, t10[0].y], [1456, 366]);   // the harness now hosts real $10 instances (M2)
    eq(host.world.created.filter(c => c[0] === host.ids.OBJ_chaos_object_spring_26_normal).length, 4, 'four strong springs (parameter $00)');
    ok(rd('scripts/SCR_chaos_level/SCR_chaos_level.gml').includes('OBJ_chaos_object_50'), 'boss comes from the generic canonical loader');
    g.chaosMapWidth = 128; ctx.room = host.ids.ROM_chaos_thz1;
}

// ---------- 6. type $10 parameter 1: ten rings, selector-$01 art ----------
{
    const lv = rd('scripts/SCR_chaos_level/SCR_chaos_level.gml'); ok(/case \$01: cp_inst\.sprite_index = SPR_chaos_object_10_01/.test(lv), 'selector $01 art');
    host.reset(); g.ring = 12; g.chaosType10D29A = 0; ctx.SCR_chaos_type10_reward(0x01, {}); eq(g.ring, 22, 'parameter 1 adds ten rings'); eq(g.chaosType10D29A, 0x10, 'BCD counter mirrored');
    const m = JSON.parse(rd('POC_notes/rom-cache/levels/thz3/object-10-selector-01.json')); eq(m.selector, '0x01'); eq(m.resource, 'SPR_chaos_object_10_01');
    for (const f of m.frames) ok(fs.existsSync(path.join(root, f.root_png)), 'sprite frame present');
}

// ---------- 7. moving spike at (752,128): same cycle, relative to its own base ----------
{
    host.reset(); host.world.camHint = [752 - 128, 128 - 96]; host.g.chaosTileIds = host.ids1; const s = host.create(host.ids.OBJ_chaos_spikes, 752, 128); const offs = [];
    for (let i = 0; i < 210; i++) { host.frame({}); offs.push(s.chaosOffset); }
    const i0 = offs.indexOf(6), cyc = [6, 12, 18, ...Array(48).fill(18), 12, 6, 0, ...Array(48).fill(0)]; deep(Array.from(offs.slice(i0, i0 + 204)), [...cyc, ...cyc], 'cycle 3/48/3/48 from base 128');
    // cone against the pre-move anchor 128 (raised hold: anchor 110)
    const p = host.newPlayer(752, 128 - 30, {state: 14, move: 1}); ok(!!p, 'player');
}

// ---------- 8. wiring ----------
{
    const yyp = rd('SonicChaos_POC.yyp');
    for (const n of ['ROM_chaos_thz3', 'OBJ_chaos_thz3_terrain', 'SCR_chaos_level_thz3_data', 'SPR_chaos_thz3_terrain_0', 'SPR_chaos_thz3_terrain_1', 'SPR_chaos_thz3_terrain_2', 'SPR_chaos_object_10_01']) ok(yyp.includes(`"name": "${n}"`), `${n} registered`);
    ok(/"roomId": \{\s*"name": "ROM_chaos_thz3"/.test(yyp), 'room order node');
    const room = rd('rooms/ROM_chaos_thz3/ROM_chaos_thz3.yy'); ok(/"Width": 2560/.test(room) && /"Height": 512/.test(room), 'room is 2560x512'); ok(room.includes('OBJ_chaos_thz3_terrain') && room.includes('OBJ_chaos_zone'), 'room holds only the terrain object and the zone object (nothing is placed by hand)');
    eq((room.match(/"%Name": "inst_/g) || []).length, 2);
    for (const q of [0, 1, 2]) { const sd = `sprites/SPR_chaos_thz3_terrain_${q}`; ok(fs.existsSync(path.join(root, sd, `SPR_chaos_thz3_terrain_${q}.yy`)), `terrain sprite ${q}`); }
    const man = JSON.parse(rd('POC_notes/rom-cache/levels/thz3/terrain-assets.json')); eq(man.assets.length, 3); eq(man.layout_runtime_cells_sha256, layout.runtime_cells_sha256, 'sprites rendered from the pinned layout');
    for (const a of man.assets) eq(sha(fs.readFileSync(path.join(root, a.root_png))), a.sha256, 'sprite hash');
    const lv = rd('scripts/SCR_chaos_level/SCR_chaos_level.gml'); ok(/room: ROM_chaos_thz3/.test(lv) && /chaos_is_thz3\(\)/.test(lv), 'act table and level helpers');
    ok(/chaos_is_thz3\(\) \? SCR_chaos_thz3_terrain_rings/.test(rd('objects/OBJ_chaos_ring_manager/Create_0.gml')), 'ring manager uses the THZ3 data');
    // canonical data of the other acts untouched
    eq(cp.spawnSync('git', ['diff', '--quiet', 'HEAD', '--', 'rooms/ROM_chaos_thz1', 'rooms/ROM_chaos_thz2', 'scripts/SCR_chaos_level_thz2_data', 'POC_notes/rom-cache/levels/thz1', 'POC_notes/rom-cache/levels/thz2'], {cwd: root}).status, 0, 'THZ1 / THZ2 canonical data byte-identical to HEAD');
}
console.log(`THZ3 FOUNDATION CHECKS PASSED (${checks} assertions)`);
