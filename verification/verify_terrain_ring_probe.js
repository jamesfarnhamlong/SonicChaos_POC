// Ordinary terrain-ring collection ($753E point probe) and the shadow player animation counter (+$07). Executes the SHIPPED GML
// (SCR_chaos_anim_counter, SCR_chaos_anim_counter_data, SCR_chaos_terrain_ring, ring manager Step_2) against the Research fixtures mirrored in
// POC_notes/rom-cache/player-animation-counter.json and terrain-ring-collection.json (cross-checked against Research when the checkout sits next to this repo).
// No hand-authored oracle: counter values come from the original-engine fixtures; rectangles come from the controlled $753E sweep; rules from the audit.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const hex = t => t.replace(/(?<![\w"])\$([0-9A-Fa-f]+)/g, '0x$1').replace(/#macro (\w+) (\S+)/g, 'var $1 = $2;').replace(/\bmod\b/g, '%');
const strip = s => s.replace(/\/\/.*$/gm, '');
let checks = 0; const eq = (a, b, m) => { assert.strictEqual(a, b, m); checks++; }; const ok = (c, m) => { assert.ok(c, m); checks++; };
const deep = (a, b, m) => { assert.deepStrictEqual(a, b, m); checks++; };

const A = JSON.parse(rd('POC_notes/rom-cache/player-animation-counter.json')), T = JSON.parse(rd('POC_notes/rom-cache/terrain-ring-collection.json'));
const resDir = path.resolve(root, '..', 'sonic-chaos-reference-work', 'data', 'rom-cache');
if (fs.existsSync(path.join(resDir, 'player-animation-counter.json'))) {
    const ra = JSON.parse(fs.readFileSync(path.join(resDir, 'player-animation-counter.json'), 'utf8')), rt = JSON.parse(fs.readFileSync(path.join(resDir, 'terrain-ring-collection.json'), 'utf8'));
    deep(A.state_0b_fixture, ra.state_0b_fixture); deep(A.d448_audit, ra.d448_audit); deep(A.transition_fixtures, ra.transition_fixtures); deep(A.direct_write_fixtures, ra.direct_write_fixtures); deep(A.selector_sweep, ra.selector_sweep); deep(A.eligible_states, ra.eligible_states_static);
    deep(T.region_fixture, rt.region_fixture); deep(T.model, rt.model); deep(T.act_rings, rt.act_rings); deep(T.quadrant_tables, rt.quadrant_tables);
    for (const [k, v] of Object.entries(ra.schedules)) deep(A.first_40[k], v.first_40_counter_values_by_input_set, `first_40 ${k}`);
    console.log('mirrors cross-checked against', resDir);
}

// ---------- load the shipped scripts ----------
const g = {};
const ctx = vm.createContext({global: g, floor: Math.floor, abs: Math.abs, min: Math.min, max: Math.max, array_create: (n, v) => Array(n).fill(v), array_length: a => a.length, is_array: Array.isArray,
    variable_global_exists: k => k in g, variable_struct_exists: (o, k) => k in o});
for (const n of ['SCR_chaos_anim_counter_data', 'SCR_chaos_anim_counter', 'SCR_chaos_terrain_ring']) vm.runInContext(hex(rd(`scripts/${n}/${n}.gml`)), ctx, {filename: n});

// ---------- 1. shadow counter vs the Research fixtures ----------
const SEL_INPUT = {all: [0, true, false, 0], hi0_floor: [0, true, false, 0], hi4_floor: [4, true, false, 0], hi4_air: [4, false, false, 0], hi4_floor_side: [4, true, true, 0], hi4_floor_d448: [4, true, false, 1]};
// every state's first 40 values for each input set (fresh engine: cur 0, first update loads the current state's script)
for (const [k, sets] of Object.entries(A.first_40)) for (const [label, seq] of Object.entries(sets)) {
    const st = parseInt(k, 16), a = ctx.SCR_cc_anim_new(), [hi, fl, sd, d4] = SEL_INPUT[label];
    deep(seq.map(() => ctx.SCR_cc_anim_step(a, st, hi, fl, sd, d4)), seq, `state ${k} ${label}`);
}
// 451 scripted transition updates: counter, state, selector/record reload (the harness starts in state 1 right after its 180 record)
let rows = 0;
for (const [name, list] of Object.entries(A.transition_fixtures.scenarios)) {
    const a = ctx.SCR_cc_anim_new(); a.cur = 1; a.t = 180; a.ptr = 1;
    for (const r of list) {
        const t = ctx.SCR_cc_anim_step(a, parseInt(r.requested, 16), r.x_speed_hi, r.floor, r.side_contact, name === 'spring_ascent_d448' ? 1 : 0);
        eq(t, r.counter_after, `${name} update ${r.update} counter`); eq(a.cur, parseInt(r.state_after, 16), `${name} update ${r.update} state`);
        eq(t & 1, r.bit0, `${name} update ${r.update} parity`); eq(ctx.chaos_ring_probe_point(1000, 500, t)[1] - 500, r.probe_y_from_anchor, `${name} update ${r.update} probe depth`); rows++;
    }
}
eq(rows, 451);
// selector sweep (608 cases in the Research cache; the cache keeps its samples): first counter value after entering each selector state
for (const s of A.selector_sweep.samples) { const a = ctx.SCR_cc_anim_new(); a.cur = 1; a.t = 180; a.ptr = 1;
    const sh = s.x_speed_hi > 127 ? s.x_speed_hi - 256 : s.x_speed_hi;   // the cache stores the raw $D517 byte
    eq(ctx.SCR_cc_anim_step(a, parseInt(s.state, 16), sh, s.floor, false, 0), s.first_counter, `selector sweep ${s.state} hi ${s.x_speed_hi} floor ${s.floor}`); eq(s.first_counter & 1, s.bit0); }
// selector thresholds straight from the Research tables, every |hi| 0..15 and its negative, floor / air / side
const W = A.selectors.selector_8ee1_walk_state_05.table, R = A.selectors.selector_8f76_states_09_0A_10_1B.table;
for (let hi = -15; hi <= 15; hi++) for (const side of [false, true]) for (const floor of [false, true]) {
    eq(ctx.SCR_cc_anim_selector(1, hi, floor, side), side ? 2 : W[Math.abs(hi)], `walk selector hi ${hi} side ${side}`);
    eq(ctx.SCR_cc_anim_selector(3, hi, floor, side), floor ? R[Math.abs(hi)] : 3, `roll/jump selector hi ${hi} floor ${floor}`);
}
deep([0, 1, 2, 3, 4, 5].map(hi => ctx.SCR_cc_anim_selector(1, hi, true, false)), [10, 8, 6, 4, 4, 4], 'walk thresholds 10, 8, 6, >=3 -> 4');
deep([0, 1, 2, 3, 4, 5, 6, 9].map(hi => ctx.SCR_cc_anim_selector(3, hi, true, false)), [10, 8, 6, 5, 4, 3, 2, 2], 'roll/jump thresholds');
eq(ctx.SCR_cc_anim_selector(2, 3, true, false), 4); eq(ctx.SCR_cc_anim_selector(4, 3, true, false), 3); eq(ctx.SCR_cc_anim_selector(5, 3, true, false), 6);
// direct-write fixtures: reload vs finishing the current record; the counter is never rewritten while running
{
    const run = (state, inputs) => { const a = ctx.SCR_cc_anim_new(); a.cur = 1; a.t = 180; a.ptr = 1; return inputs.map(([hi, fl, sd]) => ctx.SCR_cc_anim_step(a, state, hi, fl, sd, 0)); };
    const byCase = Object.fromEntries(A.direct_write_fixtures.rows.map(r => [r.case, r.counter_sequence]));
    deep(run(5, Array.from({length: 24}, (_, i) => [i < 4 ? 0 : 6, true, false])), byCase['walk speed 0 -> 6 at update 4'], 'walk speed 0 -> 6');
    deep(run(5, Array.from({length: 14}, (_, i) => [4, true, i >= 3 && i <= 6])).slice(0), byCase['side contact for updates 3..6 while walking'].map((v, i) => v), 'side contact only at reloads');
    deep(run(10, Array.from({length: 14}, (_, i) => [5, i < 5, false])), byCase['jump: floor bit set for the first 5 updates only'], 'floor bit only at reloads');
}
// same-state request: no effect; a state change replaces the counter at once (even between two states sharing a selector)
{ const a = ctx.SCR_cc_anim_new(); a.cur = 1; a.t = 180; a.ptr = 1; const s = [];
  for (let i = 0; i < 8; i++) s.push(ctx.SCR_cc_anim_step(a, 9, 4, true, false, 0));              // roll, floor, hi 4 -> 4,3,2,1,4,3,2,1
  deep(s, [4, 3, 2, 1, 4, 3, 2, 1], 'same state keeps counting');
  const b = ctx.SCR_cc_anim_step(a, 10, 0, true, false, 0); eq(b, 10, 'roll -> jump reloads at once with the new inputs'); eq(ctx.SCR_cc_anim_step(a, 10, 0, true, false, 0), 9, 'then counts'); }
// state request timing: a request made by the callback of update n appears in update n+1's engine step (modelled by req being the NEXT input)
{ const a = ctx.SCR_cc_anim_new(); a.cur = 1; a.t = 180; a.ptr = 1; ctx.SCR_cc_anim_step(a, 1, 0, true, false, 0);
  eq(a.cur, 1); const t = ctx.SCR_cc_anim_step(a, 6, 5, true, false, 0); eq(a.cur, 6); eq(t, 4, 'run selector value visible to that update\'s probe'); }
// restart rules, loops: state 2 (impatient) and the $0B loops
{ const a = ctx.SCR_cc_anim_new(); a.cur = 1; a.t = 180; a.ptr = 1; const s = Array.from({length: 190}, () => ctx.SCR_cc_anim_step(a, 1, 0, true, false, 0));
  eq(s[179], 64, 'stand: 180 records then switch to state 2 in the same update'); eq(s[180], 180, 'requested state 1 re-adopted next update'); }
{ const a = ctx.SCR_cc_anim_new(); a.cur = 1; a.t = 180; a.ptr = 1; const s = Array.from({length: 14 * 4 + 3 * 6 + 8}, () => ctx.SCR_cc_anim_step(a, 11, 0, false, false, 0));
  eq(s.slice(0, 56).filter(v => v === 4).length, 14, 'spring ascent: fourteen 4-tick records first'); eq(s.slice(56, 74).filter(v => v === 6).length, 3, 'then three 6-tick records'); eq(s[74], 8, 'then the 8-tick record'); }

// ---------- 1b. state $0B and $D448: parity-faithful for the terrain-ring consumer (Research 90b4b05 state_0b_fixture / d448_audit) ----------
// $D448 bit 0 selects WHICH even durations state $0B loads; it never changes the parity sequence. The POC supplies d448 = 0 (no source exists), so the shadow
// counter is parity-faithful, not value-exact, for strong-spring $0B. Both paths are run here against the Research counter sequences.
{
    const F = A.state_0b_fixture, primed = () => { const a = ctx.SCR_cc_anim_new(); a.cur = 1; a.t = 180; a.ptr = 1; return a; };
    const run = (d448, n) => { const a = primed(); return Array.from({length: n}, () => ctx.SCR_cc_anim_step(a, 11, 0, false, false, d448)); };
    deep(run(0, 90), F.counter_sequence_d448_clear_first_90, 'd448 clear path counter sequence (weak spring / POC default)');
    deep(run(1, 90), F.counter_sequence_d448_set_first_90, 'd448 set path counter sequence (strong spring)');
    eq(F.first_update_where_counter_values_differ, 56); eq(F.parity_sequences_identical, true);
    const clear = run(0, 200), set = run(1, 200);
    ok(clear.some((v, i) => v !== set[i]), 'the exact values differ between the two paths');
    deep(clear.map(v => v & 1), set.map(v => v & 1), 'but the parity sequence (hence the probe depth) is identical for 200 updates');
    deep(clear.slice(0, 16).map(v => v & 1), F.parity_pattern_first_16, 'strict 0,1,0,1 alternation');
    deep(set.map(v => ctx.chaos_ring_probe_point(0, 100, v)[1]), clear.map(v => ctx.chaos_ring_probe_point(0, 100, v)[1]), 'strong and weak spring give the same probe depth at every update');
    // every record on both $0B paths has an even duration and no selector writes the counter
    const prog = A.programs['0x0B'], recs = prog.filter(o => o.record !== undefined).map(o => o.record);
    ok(recs.length > 0 && recs.every(d => d % 2 === 0), `every state $0B record duration is even (${[...new Set(recs)]})`); ok(!prog.some(o => o.cmd === 'FF 05'), 'no selector in state $0B');
    // seeded random d448 toggling every update (the Research test used 300 episodes / 60000 updates and the values 00, 01, FF, FE, 55)
    let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    let updates = 0;
    for (let ep = 0; ep < 300; ep++) { const a = primed(); let prev = null;
        for (let i = 0; i < 200; i++) { const d = F.d448_values_tried_in_toggle_test.map(h => parseInt(h, 16))[Math.floor(rnd() * 5)], t = ctx.SCR_cc_anim_step(a, 11, 0, false, false, d);
            if (prev !== null) eq((t & 1) !== (prev & 1), true, `episode ${ep} update ${i}: parity strictly alternates under d448 toggling`); prev = t; updates++; } }
    eq(updates, F.random_toggle_updates);
    // Research writers of $D448: terrain upright spring writes 0xFF (strong path), the diagonal spring clears it
    ok(A.d448_audit.writers.some(w => w.value === '0xFF' && /upright spring/.test(w.meaning)), 'audit: upright spring sets $D448 (strong path)');
}

// ---------- 2. probe geometry ----------
eq(T.model.probe_dy_by_bit0['0'] + T.model.anchor_bias, -8); eq(T.model.probe_dy_by_bit0['1'] + T.model.anchor_bias, 2);
for (const [anchorY, even, odd] of [[100, 92, 102], [8, 0, 10], [9, 1, 11], [2, 0, 4], [0, 0, 2]]) {
    eq(ctx.chaos_ring_probe_point(500, anchorY, 6)[1], even, `even counter anchorY ${anchorY}`); eq(ctx.chaos_ring_probe_point(500, anchorY, 7)[1], odd, `odd counter anchorY ${anchorY}`); }
for (const c of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 64, 179, 180, 223, 224]) eq(ctx.chaos_ring_probe_point(7, 300, c)[1], 300 + ((c & 1) ? 2 : -8), `parity (not frame number) controls depth: counter ${c}`);
eq(ctx.chaos_ring_probe_point(1234, 300, 3)[0], 1234, 'probe X = anchor X');
// the isolated-quadrant sweep from the controlled $753E run: block at cell (44, 2), quadrant pixels X 1408..1423, Y 64..79
{
    const q = T.region_fixture.quadrant_pixels, rec = [[0, q.left + 8, q.top + 8, 0x42, 2 * 128 + 44, 0]];
    const idx = ctx.chaos_terrain_ring_index(rec);
    for (const row of T.region_fixture.rows) {
        for (let x = q.left - 3; x <= q.right_inclusive + 3; x++) for (let y = q.top - 14; y <= q.bottom_inclusive + 14; y++) {
            const got = ctx.chaos_terrain_ring_at(idx, ...ctx.chaos_ring_probe_point(x, y, row.bit0)) === 0;
            const want = x >= row.expected.x[0] && x <= row.expected.x[1] && y >= row.expected.y[0] && y <= row.expected.y[1];
            eq(got, want, `region bit0=${row.bit0} anchor (${x},${y})`);
        }
        // exact edges and one pixel outside each edge
        const [x0, x1] = row.expected.x, [y0, y1] = row.expected.y, hit = (x, y) => ctx.chaos_terrain_ring_at(idx, ...ctx.chaos_ring_probe_point(x, y, row.bit0)) === 0;
        ok(hit(x0, y0) && hit(x1, y0) && hit(x0, y1) && hit(x1, y1), 'all four corners inclusive');
        ok(!hit(x0 - 1, y0) && !hit(x1 + 1, y0) && !hit(x0, y0 - 1) && !hit(x0, y1 + 1), 'one pixel outside each edge');
    }
    deep(T.region_fixture.overlap_anchor_y_both_parities, [72, 77]); deep(T.region_fixture.union_anchor_y_either_parity, [62, 87]);
}
// negative-Y clamp: anchor Y < 9 collects row-0 quadrants
{ const idx = ctx.chaos_terrain_ring_index([[0, 40, 8, 0x40, 0 * 128 + 1, 0], [1, 56, 8, 0x40, 0 * 128 + 1, 1]]);
  for (let ay = 0; ay <= 8; ay++) eq(ctx.chaos_terrain_ring_at(idx, ...ctx.chaos_ring_probe_point(32, ay, 0)), 0, `anchorY ${ay} clamps to row 0 (even)`);
  eq(ctx.chaos_terrain_ring_at(idx, ...ctx.chaos_ring_probe_point(32, 9, 0)), 0, 'anchorY 9 -> probe y 1, still the top-left quadrant of row 0'); eq(ctx.chaos_terrain_ring_at(idx, ...ctx.chaos_ring_probe_point(32, 24, 0)), -1, 'anchorY 24 -> probe y 16 is the bottom quadrant (no ring)'); }

// ---------- 3. eligible / excluded states ----------
const ELIGIBLE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 20, 21, 23, 25, 26, 27, 28, 29, 30];
eq(ELIGIBLE.length, 26); deep(A.eligible_states.map(s => parseInt(s, 16)), ELIGIBLE, 'cache list equals the 26 states');
for (let s = 0; s < 80; s++) eq(ctx.chaos_ring_probe_eligible(s), ELIGIBLE.includes(s), `state ${s.toString(16)}`);
for (const s of [0x0C, 0x0D, 0x13, 0x22, 0x20, 0x21, 0x34, 0x16, 0x18, 0x1F]) eq(ctx.chaos_ring_probe_eligible(s), false, `excluded state $${s.toString(16)}`);
for (const s of [0x09, 0x0A, 0x0B, 0x0E, 0x05, 0x06, 0x1B, 0x1C]) eq(ctx.chaos_ring_probe_eligible(s), true, `rolling/jump/spring/fall states probe: $${s.toString(16)}`);
{ const c = {state: 0x22, xu: 5000 * 256, yu: 300 * 256, ring_probe_valid: true}; ctx.chaos_ring_probe_update(c, 3); eq(c.ring_probe_valid, false, 'twist publishes no probe');
  const d = {state: 0x0A, xu: 5000 * 256 + 255, yu: 300 * 256 + 255}; ctx.chaos_ring_probe_update(d, 3); ok(d.ring_probe_valid && d.ring_probe_x === 5000 && d.ring_probe_y === 302, 'integer anchor, odd counter -> +2'); }

// ---------- 4. canonical terrain rings: THZ1 and THZ2 (THZ3 has no POC layout) ----------
const dataCtx = vm.createContext({array_create: (n, v) => Array(n).fill(v)});
vm.runInContext(hex(rd('scripts/SCR_chaos_ring_data/SCR_chaos_ring_data.gml')), dataCtx);
const thz2src = rd('scripts/SCR_chaos_level_thz2_data/SCR_chaos_level_thz2_data.gml');
vm.runInContext(hex(thz2src.slice(thz2src.indexOf('function SCR_chaos_thz2_terrain_rings()'), thz2src.indexOf('}', thz2src.indexOf('function SCR_chaos_thz2_terrain_rings()')) + 1)), dataCtx);
const ACTS = {thz1: dataCtx.SCR_chaos_ring_data(), thz2: dataCtx.SCR_chaos_thz2_terrain_rings()};
eq(ACTS.thz1.length, T.act_rings.thz1.ring_quadrants); eq(ACTS.thz2.length, T.act_rings.thz2.ring_quadrants);
let swept = 0;
for (const [act, recs] of Object.entries(ACTS)) {
    const idx = ctx.chaos_terrain_ring_index(recs), seen = new Set();
    let minLeft = 1e9, maxRight = -1e9;
    for (let i = 0; i < recs.length; i++) {
        const r = recs[i], cell = r[4], q = r[5], col = cell % 128, row = Math.floor(cell / 128);
        eq(r[1], col * 32 + 16 * (q & 1) + 8, `${act} ring ${i} X is the quadrant centre`); eq(r[2], row * 32 + 16 * (q >> 1) + 8, `${act} ring ${i} Y is the quadrant centre`);
        ok(!seen.has(cell * 4 + q), 'unique quadrant'); seen.add(cell * 4 + q);
        const left = r[1] - 8, top = r[2] - 8; minLeft = Math.min(minLeft, left); maxRight = Math.max(maxRight, left + 15);
        for (const bit of [0, 1]) for (let ax = left - 2; ax <= left + 17; ax++) for (let ay = top - 12; ay <= top + 27; ay++) {
            const [px, py] = ctx.chaos_ring_probe_point(ax, ay, bit), got = ctx.chaos_terrain_ring_at(idx, px, py);
            const inside = px >= left && px <= left + 15 && py >= top && py <= top + 15;
            if (inside) eq(got, i, `${act} ring ${i} bit ${bit} anchor (${ax},${ay}) inside`);
            else ok(got !== i, `${act} ring ${i} bit ${bit} anchor (${ax},${ay}) outside`);
            swept++;
        }
    }
    if (act === 'thz1') deep([minLeft, maxRight], T.collection_fixture.thz1.accepted_anchor_x_span_over_all_rings, 'THZ1 accepted anchor X span equals the Research sweep');
}
// collected count per record equals the ROM block/quadrant relation: the lookup never maps a point to a quadrant without a ring
for (const [act, recs] of Object.entries(ACTS)) { const idx = ctx.chaos_terrain_ring_index(recs); let n = 0;
    for (let px = 0; px < 4096; px += 4) for (let py = 0; py < 1024; py += 4) { const r = ctx.chaos_terrain_ring_at(idx, px, py); if (r >= 0) { n++; const rec = recs[r]; ok(Math.abs(px - rec[1]) <= 8 && Math.abs(py - rec[2]) <= 8, 'maps only into its own quadrant'); } }
    ok(n > 1000, `${act} lookup populated`); }
for (const [px, py] of [[-1, 10], [10, -1], [4096, 10], [10, 2048], [5000, 5000]]) eq(ctx.chaos_terrain_ring_at(ctx.chaos_terrain_ring_index(ACTS.thz1), px, py), -1, `outside the layout ${px},${py}`);

// ---------- 5. ring manager Step_2: one-shot, effect at the probe point, no mask path ----------
const stepSrc = hex(rd('objects/OBJ_chaos_ring_manager/Step_2.gml')).replace(/\bexit;/g, 'return;');
function manager(recs, W) {
    const w = {effects: [], ring: 0};
    const core = {ring_probe_valid: false, ring_probe_x: 0, ring_probe_y: 0, xu: 0, yu: 0};
    const player = new Proxy({chaosCore: core, object_index: 'char'}, {get(t, k) { if (typeof k === 'string' && /^bbox_|^sprite|^mask|^image_/.test(k)) throw new Error('mask/sprite bounds must not be read: ' + k); return t[k]; }});
    w.core = core; w.mgr = {chaosRingSourceCount: recs.length, chaosRingRecords: recs, chaosRingActive: recs.map(() => true), chaosRingQuadIndex: ctx.chaos_terrain_ring_index(recs),
        chaosType09SourceCount: 0, chaosType09Records: [], chaosType09Collected: [], chaosType09State: [], chaosType09SparkleTimer: [], chaosRingGlobalFrame: 0};
    w.ctx = vm.createContext({global: {ring: 0, music: 0}, floor: Math.floor, abs: Math.abs, max: Math.max, chaos_in_level: () => true, instance_exists: () => true, instance_find: () => player,
        OBJ_player: 1, OBJ_player_char: 'char', OBJ_player_char_spin: 'spin', variable_instance_exists: (o, k) => k in o, variable_struct_exists: (o, k) => k in o, SCR_chaos_core_attach: () => {},
        instance_create: (x, y, o) => { w.effects.push([x, y]); }, audio_is_playing: () => false, audio_stop_sound: () => {}, audio_play_sound: () => {}, SFX_ring: 0, OBJ_ring_stars: 0,
        camera_get_view_width: () => W, chaos_terrain_ring_at: ctx.chaos_terrain_ring_at, chaos_ring_proximity: () => false});
    w.ctx.b = w.mgr; w.script = new vm.Script(`(function(){ with (b) { ${stepSrc} } })()`); w.step = () => w.script.runInContext(w.ctx);
    return w;
}
for (const [act, recs] of Object.entries(ACTS)) for (const W of [256, 290, 348, 400, 640]) for (const ri of [0, 5, recs.length - 1]) {
    const r = recs[ri], left = r[1] - 8, top = r[2] - 8;
    for (const bit of [0, 1]) for (const [dx, dy, inside] of [[0, 0, true], [15, 15, true], [-1, 0, false], [16, 0, false], [0, -1, false], [0, 16, false], [7, 7, true]]) {
        const w = manager(recs, W), px = left + dx, py = top + dy;
        w.core.ring_probe_valid = true; w.core.ring_probe_x = px; w.core.ring_probe_y = py;
        w.step(); eq(w.mgr.chaosRingActive[ri], !inside, `${act} W${W} ring ${ri} probe (${dx},${dy})`);
        if (inside) { eq(w.ctx.global.ring, 1); deep(w.effects, [[px, py]], 'effect position equals the probe point, not the ring centre'); w.step(); w.step(); eq(w.ctx.global.ring, 1, 'collected ring counts once'); eq(w.effects.length, 1); }
        else eq(w.ctx.global.ring, w.mgr.chaosRingActive.filter(v => !v).length, 'a neighbouring ring may be hit instead, never this one; count equals collected records');
        // not valid (excluded state / loop / twist / act clear): nothing is collected even with the point inside
        const v = manager(recs, W); v.core.ring_probe_valid = false; v.core.ring_probe_x = left + 7; v.core.ring_probe_y = top + 7; v.step(); eq(v.mgr.chaosRingActive[ri], true, 'no probe -> no collection (no mask fallback)');
    }
}

// ---------- 6. the real core drives the counter: inputs are taken from core fields ----------
{
    const cg = {}, cc = vm.createContext({global: cg, floor: Math.floor, round: Math.round, abs: Math.abs, min: Math.min, max: Math.max, clamp: (v, a, b) => Math.min(Math.max(v, a), b),
        array_create: (n, v) => Array(n).fill(v), array_length: a => a.length, array_push: (a, v) => a.push(v), array_copy: (d, di, s, si, n) => { for (let i = 0; i < n; i++) d[di + i] = s[si + i]; },
        variable_global_exists: k => k in cg, variable_struct_exists: (o, k) => k in o, is_array: Array.isArray, noone: -4});
    for (const n of ['SCR_chaos_motion_data', 'SCR_chaos_core_data', 'SCR_chaos_core', 'SCR_chaos_box_contact', 'SCR_chaos_anim_counter_data', 'SCR_chaos_anim_counter', 'SCR_chaos_terrain_ring'])
        vm.runInContext(hex(rd(`scripts/${n}/${n}.gml`)), cc, {filename: n});
    cc.SCR_chaos_motion_data(); cc.SCR_chaos_core_data();
    const c = cc.SCR_cc_new(142, 640); c.state = c.next = 14; c.move = 1;
    const log = [];
    for (let i = 0; i < 120; i++) {                              // adapter order: engine, callback + movement, probe
        const t = cc.SCR_cc_anim_update(c); cc.SCR_cc_tick(c); cc.chaos_ring_probe_update(c, t);
        log.push([c.state, t, c.ring_probe_valid, c.ring_probe_valid ? c.ring_probe_y - Math.floor(c.yu / 256) : null]);
    }
    for (const [st, t, valid, dy] of log) { if (valid) eq(dy, (t & 1) ? 2 : -8, 'probe depth follows the counter parity'); }
    ok(log.some(r => r[0] === 14) && log.some(r => r[0] !== 14), 'the core changed state during the run (fall -> landing)');
    ok(log.every(r => r[2] === ELIGIBLE.includes(r[0])), 'probe validity follows the recovered state list for every core state reached');
    // gameplay-side inputs: requested state, high byte of X speed, floor (bg bit 1), side contacts (contacts & 12)
    const primed = () => { const p = ctx.SCR_cc_anim_new(); p.cur = 1; p.t = 180; p.ptr = 1; return p; };
    const probeIn = {next: 9, vx: 4 * 256 + 17, bg: 2, contacts: 0, anim: primed()};
    eq(ctx.SCR_cc_anim_update(probeIn), 4, 'roll on the floor, high byte 4 -> 4'); const air = {next: 9, vx: 4 * 256, bg: 0, contacts: 0, anim: primed()}; eq(ctx.SCR_cc_anim_update(air), 3, 'roll in the air -> 3');
    const neg = {next: 5, vx: -3 * 256, bg: 2, contacts: 0, anim: primed()}; eq(ctx.SCR_cc_anim_update(neg), 4, 'walk, negative speed uses |hi| (hi -3 -> 4)'); const side = {next: 5, vx: 0, bg: 2, contacts: 4, anim: primed()}; eq(ctx.SCR_cc_anim_update(side), 2, 'walk with a side contact -> 2');
}

// ---------- 7. static guarantees: no mask path, adapter order, type $09 untouched ----------
const step = strip(rd('objects/OBJ_chaos_ring_manager/Step_2.gml'));
const terr = step.slice(0, step.indexOf('var cp_have_anchor'));
ok(!/bbox_|place_meeting|sprite_|mask_index|cp_x-6|cp_y-8|chaosRingRecords\[cp_i\]/.test(terr), 'terrain-ring collection no longer reads any mask, sprite or box');
ok(/chaos_terrain_ring_at\(chaosRingQuadIndex/.test(terr) && /instance_create\(cp_player\.chaosCore\.ring_probe_x,cp_player\.chaosCore\.ring_probe_y,OBJ_ring_stars\)/.test(terr), 'probe lookup and effect at the probe point');
const ad = strip(rd('scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml'));
const iAnim = ad.indexOf('SCR_cc_anim_update(cp_c)'), iTick = ad.indexOf('SCR_cc_tick(cp_c);', iAnim), iClamp = ad.indexOf('chaos_goal_clamp_player', iTick), iPlat = ad.indexOf('SCR_chaos_platform_overlap', iTick), iProbe = ad.indexOf('chaos_ring_probe_update(cp_c, cp_anim_t)');
ok(iAnim > 0 && iAnim < iTick && iTick < iClamp && iClamp < iPlat && iPlat < iProbe, 'order: counter engine -> callback/movement -> adapters/platform -> ring probe');
ok(/cp_c\.ring_probe_valid = false/.test(ad), 'probe cleared at the start of each update (loop states return before reaching it)');
ok(!/image_index|image_speed/.test(strip(rd('scripts/SCR_chaos_anim_counter/SCR_chaos_anim_counter.gml'))), 'the counter never reads GameMaker animation state');
const dirty = require('child_process').spawnSync('git', ['diff', '--quiet', '35fc7fc2b66cc5a06d72cf5c39469252b74a7a30', '--', 'scripts/SCR_chaos_ring_data', 'scripts/SCR_chaos_type09_data', 'scripts/SCR_chaos_level_thz2_data', 'objects/OBJ_chaos_ring_manager/Draw_0.gml'], {cwd: root}).status;
eq(dirty, 0, 'canonical ring data and ring drawing byte-identical to the type-09 checkpoint');
const t09 = step.slice(step.indexOf('var cp_have_anchor'));
ok(/chaos_ring_proximity\(cp_anchor_x,cp_anchor_y,cp_t09_record\[1\],cp_t09_record\[2\]\)/.test(t09) && /cp_t09_parameter == 1 && \(chaosRingGlobalFrame mod 2\) != 0/.test(t09), 'type $09 section unchanged');
console.log(`TERRAIN RING PROBE CHECKS PASSED (${checks} assertions, ${rows} transition updates, ${swept} real-ring sweep cells)`);
