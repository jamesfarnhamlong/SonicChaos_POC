// Spring interaction on the recovered ROM model: mapped type $26 (SCR_chaos_spring), terrain upright / diagonal / horizontal (SCR_chaos_core), the attack
// posture they supply, $D448, the special-state gating and the top-of-screen death diagnostic. Executes the SHIPPED GML against the Research fixtures mirrored in
// POC_notes/rom-cache/spring-interaction.json (cross-checked against Research when the checkout sits next to this repo). No hand-authored oracle: the terrain
// activation regions are Research's controlled grids (3 x 46,656 cases + 40,967 horizontal cases) replayed through the POC's real terrain pipeline.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert'), cp = require('child_process');
const root = path.resolve(__dirname, '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const hex = t => t.replace(/(?<![\w"])\$([0-9A-Fa-f]+)/g, '0x$1').replace(/#macro (\w+) (\S+)/g, 'var $1 = $2;').replace(/\bmod\b/g, '%');
const strip = s => s.replace(/\/\/.*$/gm, '');
let checks = 0; const eq = (a, b, m) => { assert.strictEqual(a, b, m); checks++; }; const ok = (c, m) => { assert.ok(c, m); checks++; }; const deep = (a, b, m) => { assert.deepStrictEqual(a, b, m); checks++; };
const S = JSON.parse(rd('POC_notes/rom-cache/spring-interaction.json'));
const resFile = path.resolve(root, '..', 'sonic-chaos-reference-work', 'data', 'rom-cache', 'spring-interaction.json');
if (fs.existsSync(resFile)) { const r = JSON.parse(fs.readFileSync(resFile, 'utf8'));
    for (const k of Object.keys(S)) if (!['source', 'source_sha256', 'trimmed'].includes(k)) deep(S[k], r[k], `mirror ${k}`);
    console.log('mirror cross-checked against', resFile); }
const s16 = v => (v & 0x8000) ? v - 0x10000 : v;

// ---------- load the shipped scripts ----------
const g = {music: 0};
const base = {global: g, chaos_is_sez: () => false, floor: Math.floor, round: Math.round, abs: Math.abs, min: Math.min, max: Math.max, sign: Math.sign, clamp: (v, a, b) => Math.min(Math.max(v, a), b),
    array_create: (n, v) => Array(n).fill(v), array_length: a => a.length, array_push: (a, v) => a.push(v), array_copy: (d, di, s, si, n) => { for (let i = 0; i < n; i++) d[di + i] = s[si + i]; },
    variable_global_exists: k => k in g, variable_struct_exists: (o, k) => k in o, variable_instance_exists: (o, k) => k in o, is_array: Array.isArray, noone: -4};
const cc = vm.createContext(Object.assign({}, base));
for (const n of ['SCR_chaos_motion_data', 'SCR_chaos_core_data', 'SCR_chaos_core', 'SCR_chaos_level_thz2_data']) vm.runInContext(hex(rd(`scripts/${n}/${n}.gml`)), cc, {filename: n});
cc.SCR_chaos_motion_data(); cc.SCR_chaos_core_data();
const ids1 = g.chaosTileIds.slice(), ids2 = cc.SCR_chaos_thz2_tile_ids().slice();

// ---------- 1. type $26: geometry, gates, launch (shipped pure helpers) ----------
const sp = vm.createContext(Object.assign({}, base, {global: g}));
vm.runInContext(hex(rd('scripts/SCR_chaos_spring/SCR_chaos_spring.gml')), sp, {filename: 'SCR_chaos_spring'});
{
    const G = S.type26_geometry, fixed = (dx, dy, oy = 876) => sp.chaos_spring26_fixed_contact(1000 + dx, oy + dy, 1000, oy);
    deep(G.horizontal_pass_dx_ranges, [[-11, 11]]); deep(G.vertical_pass_ranges_relative_to_object_y, [[-33, -28]]);
    for (const e of G.horizontal_edges) eq(fixed(e.dx, -30), e.launch, `dx ${e.dx}`);
    for (const e of G.vertical_edges) eq(fixed(0, e.player_y_minus_object_y), e.launch, `dy ${e.player_y_minus_object_y}`);
    for (const dx of [-13, -12, -11, -10, 10, 11, 12, 13]) eq(fixed(dx, -30), Math.abs(dx) < 12, `strict dx ${dx}`);       // |dx| < 12: 12 FAILS
    for (const dy of [-35, -34, -33, -32, -29, -28, -27, -26]) eq(fixed(0, dy), dy >= -33 && dy <= -28, `vertical edge ${dy}`);
    let n = 0; for (let dx = -20; dx <= 20; dx++) for (let dy = -45; dy <= -15; dy++) { eq(fixed(dx, dy), Math.abs(dx) <= 11 && dy >= -33 && dy <= -28); n++; }
    for (const pl of [...S.type26_placements.thz1, ...S.type26_placements.thz2, ...S.type26_placements.thz3].filter(p => p.form === 'fixed')) {
        const oy = pl.world_y + 12, ox = pl.world_x, [y0, y1] = pl.contact_player_y_window_inclusive;
        deep([y0, y1], [pl.world_y - 21, pl.world_y - 16], `placement ${ox},${pl.world_y} window relative to placement Y`);
        for (let py = y0 - 2; py <= y1 + 2; py++) for (const dx of [-12, -11, 0, 11, 12]) eq(sp.chaos_spring26_fixed_contact(ox + dx, py, ox, oy), py >= y0 && py <= y1 && Math.abs(dx) < 12, `canonical ${ox},${pl.world_y} (${dx},${py})`);
        deep(pl.contact_player_x_window, [ox - 11, ox + 11]);
    }
    // span: X0 inclusive, X0+span exclusive, |dy| < $30; no |dx| < 12 rule
    const SP = S.type26_span; deep(SP.x_pass_ranges_relative_to_x0, [[0, 159]]); deep(SP.y_pass_ranges_relative_to_object_y, [[-47, 47]]);
    for (const pl of [...S.type26_placements.thz1, ...S.type26_placements.thz2].filter(p => p.form === 'span')) {
        const w = (parseInt(pl.parameter, 16) & 0x7F) * 16, oy = pl.world_y + 12; eq(w, pl.span_width_px);
        for (const dx of [-1, 0, 1, 11, 12, 50, w - 1, w, w + 1]) for (const dy of [-48, -47, 0, 47, 48]) eq(sp.chaos_spring26_span_contact(pl.world_x + dx, oy + dy, pl.world_x, w, oy), dx >= 0 && dx < w && Math.abs(dy) < 48, `span ${pl.parameter} dx ${dx} dy ${dy}`);
        ok(sp.chaos_spring26_span_contact(pl.world_x + 60, oy - 40, pl.world_x, w, oy) && !sp.chaos_spring26_fixed_contact(pl.world_x + 60, oy - 40, pl.world_x, oy), 'span does not use the fixed |dx|<12 / 6-row rule');
    }
    eq(S.type26_placements.thz1.filter(p => p.form === 'span')[0].span_width_px, 160); eq(S.type26_placements.thz2.filter(p => p.form === 'span')[0].span_width_px, 128);
    // gates
    for (const [raw, want] of Object.entries(S.type26_gates.vy_raw_to_launch)) eq(sp.chaos_spring26_gate(s16(parseInt(raw, 16)), true, 5), want, `vy ${raw}`);
    for (const [fl, want] of Object.entries(S.type26_gates.floor_flag_$D522)) eq(sp.chaos_spring26_gate(0, (parseInt(fl, 16) & 2) !== 0, 5), want, `floor flag ${fl}`);
    for (const [st, want] of Object.entries(S.type26_state_matrix.requested_state_launches)) eq(sp.chaos_spring26_gate(0, true, parseInt(st, 16)), want, `requested state ${st}`);
    deep(S.type26_state_matrix.blocked, ['0x21']);
    eq(sp.chaos_spring26_gate(0, true, 0x0C) && sp.chaos_spring26_gate(0, true, 0x0D) && sp.chaos_spring26_gate(0, true, 0x13) && sp.chaos_spring26_gate(0, true, 0x22) && sp.chaos_spring26_gate(0, true, 0x20), true, 'loop/twist/act-clear requests do not block $26');
    // launch values: parameters 0 / nonzero, aux1-derived span strength
    for (const row of S.type26_parameters.rows) {
        const param = parseInt(row.parameter, 16), aux1 = parseInt(row.aux1, 16), span = (param & 0x80) !== 0;
        const strong = span ? aux1 === 0 : param === 0, c = {vy: 0, move: 3, bg: 2, contacts: 2, next: 5, vx: 0x123, d448: 85, sound: 0};
        eq(sp.chaos_spring26_launch(c, strong), true); eq(c.vy / 256, row.launch_vy_signed, `launch vy param ${row.parameter} aux1 ${row.aux1}`);
        eq(c.d448, parseInt(row.d448, 16), `D448 param ${row.parameter} aux1 ${row.aux1}`); eq(c.next, 11); eq(c.move & 3, 1, 'airborne, attack clear'); eq(c.vx, 0x123, 'X speed untouched'); eq(c.bg & 2, 0);
    }
    { const c = {vy: -256, move: 3, bg: 2, contacts: 2, next: 5, d448: 85}; eq(sp.chaos_spring26_launch(c, true), false); eq(c.d448, 255, 'D448 written even when the setter rejects'); eq(c.vy, -256); eq(c.next, 5); }
}

// ---------- 2. type $26 object cycle through the shipped step: contact, launch, 42 / 20 update lockout, span two-step ----------
{
    const mk = () => {
        const w = {audio: 0}; const core = {xu: 0, yu: 0, vy: 0, vx: 0x123, bg: 2, contacts: 2, move: 0, next: 5, state: 5, d448: 85, sound: 0};
        w.player = {x: 9999, y: 9999, chaosCore: core, object_index: 'char', chaosLoopActive: false}; w.core = core;
        w.ctx = vm.createContext(Object.assign({}, base, {global: {music: 0}, OBJ_player: 1, OBJ_player_char: 'char', OBJ_player_char_spin: 'spin', instance_find: () => w.player, instance_exists: () => true,
            SCR_chaos_core_attach: () => {}, SCR_player_sprites: () => {}, SPR_player_jump: 1, audio_play_sound: () => { w.audio++; }, SFX_sonic_spring: 0}));
        vm.runInContext(hex(rd('scripts/SCR_chaos_spring/SCR_chaos_spring.gml')), w.ctx);
        w.obj = (x, y, param, span) => Object.assign({chaosParameter: param, chaosBaseX: x, chaosLayoutY: y, chaosBaseY: y + 12, chaosDrawX: x, chaosSpan: span, chaosRestState: span ? 8 : 7, chaosState: span ? 8 : 7, chaosOffset: 0, chaosTimer: 0});
        w.at = (px, py, vy = 0) => { core.xu = px * 256 + 100; core.yu = py * 256 + 50; core.vy = vy; core.bg = 2; core.contacts = 2; core.next = 5; };
        w.step = o => { w.ctx.b = o; vm.runInContext('(function(){ with (b) { SCR_chaos_object_spring_step(b); } })()', w.ctx); };
        return w;
    };
    for (const [name, param, lock, vy, d448] of [['strong', 0, 42, -1888, 255], ['weak', 1, 20, -1280, 0]]) {
        const w = mk(), o = w.obj(688, 864, param, 0); w.player.x = 12345; w.player.y = 12345;                  // GameMaker position is deliberately unrelated to the anchor
        const launches = [];
        for (let u = 0; u < 130; u++) { w.at(688 + 5, 864 + 12 - 30, 0); const before = w.core.vy; w.step(o); if (w.core.vy !== before) launches.push(u); }
        eq(launches[0], 0, `${name}: launches on the first contact update`); eq(launches[1] - launches[0], lock + 1, `${name}: next contact is evaluated ${lock} updates after the launch update (${lock} free)`);
        eq(w.core.d448, d448); ok(launches.length >= 2, 'retrigger exists');
        // extension timeline: offsets 7,14,21,28 over four updates, hold, retract to 0
        const w2 = mk(), o2 = w2.obj(688, 864, param, 0), offs = []; w2.at(693, 846, 0); w2.step(o2); for (let u = 1; u <= lock + 1; u++) { w2.core.vy = -999; w2.step(o2); offs.push(o2.chaosOffset); }
        deep(offs.slice(0, 4), [7, 14, 21, 28]); eq(offs[lock - 1], 0, `${name}: fully retracted when the lockout ends`); ok(offs.slice(3, lock - 4).every(v => v === 28), 'held at 28');
        // gates through the step: negative Y speed, no floor, requested $21, asleep-equivalent states
        for (const [label, setup] of [['negative vy', c => { c.vy = -1; }], ['no floor', c => { c.bg = 0; }], ['requested $21', c => { c.next = 33; }]]) {
            const w3 = mk(), o3 = w3.obj(688, 864, param, 0); w3.at(688, 846, 0); setup(w3.core); const vy0 = w3.core.vy; w3.step(o3); eq(w3.core.vy, vy0, `${name}: ${label} rejects`); eq(o3.chaosState, o3.chaosRestState); }
        for (const st of [0x0C, 0x0D, 0x13, 0x22, 0x20, 5, 9, 10, 11, 14, 28]) { const w3 = mk(), o3 = w3.obj(688, 864, param, 0); w3.at(688, 846, 0); w3.core.state = st; w3.step(o3); eq(w3.core.vy, vy, `${name}: fires from current state $${st.toString(16)}`); }
        const w4 = mk(), o4 = w4.obj(688, 864, param, 0); w4.at(688, 846, 0); w4.step(o4);
        eq(w4.core.vy, vy); eq(w4.core.move & 3, 1, 'attack clear'); eq(w4.core.vx, 0x123, 'vx untouched'); eq(w4.core.next, 11); eq(w4.core.d448, d448);
    }
    // boundary through the real step (canonical anchors only)
    for (const [dx, dy, want] of [[11, -30, true], [12, -30, false], [-11, -30, true], [-12, -30, false], [0, -33, true], [0, -34, false], [0, -28, true], [0, -27, false]]) {
        const w = mk(), o = w.obj(688, 864, 0, 0); w.at(688 + dx, 876 + dy, 0); const v0 = w.core.vy; w.step(o); eq(w.core.vy !== v0, want, `step boundary dx ${dx} dy ${dy}`); }
    // span: two-step sequence, taller trigger window, strength from aux1 (all canonical records weak), launch even if the setter rejects
    for (const [param, span, strongFlag] of [[1, 160, false], [1, 128, false], [0, 160, true]]) {
        const w = mk(), o = w.obj(1296, 608, param, span); w.at(1296 + 100, 620 - 40, 0); w.step(o);
        eq(o.chaosState, 9, 'trigger update only arms state 9'); eq(w.core.vy, 0, 'no launch on the trigger update'); w.at(1296 + 100 + 7, 620 - 40, 0); w.step(o);
        eq(o.chaosDrawX, (1296 + 107) & 0xFFF0, 'object X := playerX & $FFF0'); eq(w.core.vy, strongFlag ? -1888 : -1280); eq(w.core.d448, strongFlag ? 255 : 0); eq(o.chaosState, param === 1 ? 3 : 1);
        const wr = mk(), orr = wr.obj(1296, 608, param, span); wr.at(1296 + 100, 620 - 40, 0); wr.step(orr); wr.at(1296 + 100, 620 - 40, -512); wr.step(orr);
        eq(wr.core.vy, -512, 'state 9 does not re-test the gates: a negative Y speed is not overwritten'); eq(wr.core.d448, param === 1 ? 0 : 255, 'but D448 is written'); eq(orr.chaosState, param === 1 ? 3 : 1, 'and the extension still plays');
        const wo = mk(), oo = wo.obj(1296, 608, param, span); wo.at(1296 + span, 620, 0); wo.step(oo); eq(oo.chaosState, span ? 8 : 9, 'span end exclusive');
    }
    ok(rd('objects/OBJ_chaos_object_spring_26_span/Create_0.gml').includes('chaosSpan = 160') && rd('scripts/SCR_chaos_level/SCR_chaos_level.gml').includes('(cp_param & $7F) * 16'), 'span width = (parameter & $7F) * 16 in the level loader');
}

// ---------- 3. terrain upright / diagonal / horizontal: Research grids through the POC terrain pipeline ----------
let grid = 0;
for (const [key, launchState] of [['terrain_upright', 11], ['terrain_diagonal_right_launch', 28], ['terrain_diagonal_left_launch', 28]]) {
    const t = S[key], [cx0, cy0] = t.cell; eq(t.model_mismatches, 0);
    g.chaosTileIds = ids1; g.chaosBrokenCells = [];
    for (const r of t.rows) {
        const inX = x => r.cell_x_ranges.some(([a, b]) => x >= a && x <= b), inY = y => r.probe_y_ranges_relative_to_cell.some(([a, b]) => y >= a && y <= b);
        for (let cx = 0; cx < 32; cx++) for (let cy = 0; cy < 32; cy++) {
            const c = cc.SCR_cc_new(cx0 + cx, cy0 + cy - 18); c.state = 5; c.next = 5; c.previous = parseInt(r.previous_flags, 16); c.bg = r.floor_flag ? 2 : 0; c.vy = r.vy_hi * 256; c.move = 0;
            cc.SCR_cc_floor(c); eq(c.next === launchState, inX(cx) && inY(cy), `${key} ${r.previous_surface} floor ${r.floor_flag} vy ${r.vy_hi} probe (${cx},${cy})`); grid++;
        }
    }
}
let hgrid = 0;
for (const [key, b] of Object.entries(S.terrain_horizontal.blocks)) {
    const m = /^(thz\d):(0x\w+)@\((\d+),(\d+)\)$/.exec(key), X = +m[3], Y = +m[4], baseIds = m[1] === 'thz1' ? ids1 : ids2;
    const iso = baseIds.map(() => 254), ci = (Y >> 5) * 128 + (X >> 5); iso[ci] = baseIds[ci]; g.chaosTileIds = iso; g.chaosBrokenCells = [];
    for (const [probe, sgn] of [['right_probe_$716B', -1], ['left_probe_$7210', 1]]) {
        const e = b[probe], inX = x => e.player_x_ranges_relative_to_cell.some(([a, z]) => x >= a && x <= z), inY = y => e.player_y_ranges_relative_to_cell.some(([a, z]) => y >= a && y <= z);
        for (let cx = -14; cx <= 46; cx++) for (let cy = -4; cy <= 34; cy++) for (const vy of [-1024, 0, 512]) {                  // the Y speed must NOT gate it
            const c = cc.SCR_cc_new(X + cx, Y + cy); c.state = 5; c.next = 5; c.vx = 0; c.vy = vy; c.move = 0; c.bg = 0;                 // and neither must the floor flag
            cc.SCR_cc_sides(c); eq(c.next === 9 && c.vx === sgn * 1536, inX(cx) && inY(cy), `horizontal ${key} ${probe} (${cx},${cy}) vy ${vy}`); hgrid++;
        }
    }
}
// gates, launch values, D448, facing and the diagonal write-before-reject quirk against terrain_gates / launch_table
{
    g.chaosTileIds = ids1; g.chaosBrokenCells = [];
    const spot = {upright_blk30: [928 + 16, 640 + 16, 11], diagonal_right_blk36: [2464 + 16, 256 + 16, 28], diagonal_left_blk38: [1664 + 16, 512 + 16, 28]};
    for (const [name, [x, y, state]] of Object.entries(spot)) {
        const TG = S.terrain_gates[name];
        const mkc = (vy, cur) => { const c = cc.SCR_cc_new(x, y - 18); c.state = cur; c.next = 5; c.previous = 0x81; c.bg = 2; c.vy = s16(vy); c.vx = 0; c.move = 0; c.d448 = 85; c.sound = 0; cc.SCR_cc_floor(c); return c; };
        for (const key of Object.keys(TG).filter(k => k.startsWith('vy_'))) { const e = TG[key], vin = parseInt(key.slice(3), 16), c = mkc(vin, 5);
            eq(c.next === state, e.launched, `${name} ${key} launched`); eq(c.vx, s16(parseInt(e.vx, 16)), `${name} ${key} vx`); eq(c.d448, e.d448, `${name} ${key} D448`); eq(c.sound === 2 ? 166 : 0, e.snd, `${name} ${key} sound`);
            eq((c.player_flags & 16) ? 16 : 0, e.f4, `${name} ${key} facing`); eq(c.vy, s16(parseInt(e.vy, 16)), `${name} ${key} resulting Y speed`); }
        for (const [st, want] of Object.entries(TG.current_state_launches)) eq(mkc(0, parseInt(st, 16)).next === state, want, `${name} current state ${st}`);
    }
    // excluded states: the terrain spring is inert in loop / twist / act-clear states (the ROM never runs the terrain dispatch there)
    for (const st of [12, 13, 19, 32, 34]) for (const [x, y] of [[928 + 16, 640 + 16], [2464 + 16, 256 + 16]]) { const c = cc.SCR_cc_new(x, y - 18); c.state = st; c.next = st; c.previous = 0x81; c.bg = 2; c.vy = 0; cc.SCR_cc_floor(c); eq(c.next, st, `inert in state ${st}`); eq(c.vy, 0); }
    for (const st of [1, 5, 6, 9, 10, 11, 14, 28, 27]) { const c = cc.SCR_cc_new(928 + 16, 640 + 16 - 18); c.state = st; c.next = st; c.previous = 0x81; c.bg = 2; c.vy = 0; cc.SCR_cc_floor(c); eq(c.next, 11, `active in state ${st}`); }
    g.chaosTileIds = Object.assign(ids2.map(() => 254), {}); const ci = (256 >> 5) * 128 + (3264 >> 5); g.chaosTileIds[ci] = ids2[ci];
    for (const st of [12, 13, 19, 32, 34]) { const c = cc.SCR_cc_new(3264 + 30, 256 + 10); c.state = st; c.next = st; c.vx = 0; cc.SCR_cc_sides(c); eq(c.next, st, `horizontal inert in state ${st}`); }
    { const c = cc.SCR_cc_new(3264 + 30, 256 + 10); c.state = 17; c.next = 17; cc.SCR_cc_sides(c); eq(c.next, 17, 'state $11 blocks the horizontal spring'); }
    g.chaosTileIds = ids1;
    // launch_table rows: attack posture (f3), speeds, cap, D448, facing - upright clears the attack bit; diagonal and horizontal set it
    const LT = Object.fromEntries(S.launch_table.rows.map(r => [r.mechanism, r.after]));
    const up = LT['terrain upright (type 9) $6A75'], dr = LT['terrain diagonal, block < $38 $6A90'], dl = LT['terrain diagonal, block >= $38 $6A90'];
    { const c = cc.SCR_cc_new(928 + 16, 640 + 16 - 18); c.state = 10; c.next = 10; c.previous = 0x81; c.bg = 2; c.vy = 256; c.vx = 0x123; c.move = 3; c.maximum = 0x555; c.d448 = 85; cc.SCR_cc_floor(c);
      eq(c.move & 3, up.f3, 'upright f3'); eq(c.vx, 0x123); eq(c.vy, s16(parseInt(up.vy, 16))); eq(c.next, up.req); eq(c.d448, up.d448); eq(c.maximum, 0x555, 'cap untouched'); eq(c.bg & 2, 0); }
    for (const [x, y, e] of [[2464 + 16, 256 + 16, dr], [1664 + 16, 512 + 16, dl]]) { const c = cc.SCR_cc_new(x, y - 18); c.state = 10; c.next = 10; c.previous = 0x81; c.bg = 2; c.vy = 256; c.vx = 0x123; c.move = 3; c.maximum = 0x555; c.d448 = 85; cc.SCR_cc_floor(c);
      eq(c.move & 3, e.f3, 'diagonal f3 (attack set)'); eq(c.vx, s16(parseInt(e.vx, 16))); eq(c.vy, s16(parseInt(e.vy, 16))); eq(c.next, e.req); eq(c.d448, e.d448); eq((c.player_flags & 16) ? 16 : 0, e.f4); eq(c.maximum, 0x555); }
    g.chaosTileIds = ids1.map(() => 254); const ci1 = (832 >> 5) * 128 + (3200 >> 5); g.chaosTileIds[ci1] = ids1[ci1];
    { const c = cc.SCR_cc_new(3200 + 6, 832 + 10); c.state = 14; c.next = 14; c.vx = 0; c.vy = -777; c.move = 1; c.maximum = 0x400; c.d448 = 85; cc.SCR_cc_sides(c);
      eq(c.next, 9); eq(c.vx, -1536); eq(c.vy, -777, 'Y speed unchanged'); eq(c.maximum, 0x600, 'cap $0600'); eq(c.move & 3, 2, 'attack posture set, airborne clear'); eq(c.d448, 85, 'horizontal does not touch D448'); }
    g.chaosTileIds = ids1;
}

// ---------- 4. attack posture published to the badnik layer ----------
{
    const ad = rd('scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml'), i = ad.indexOf('function SCR_chaos_core_publish'), fn = ad.slice(i, ad.indexOf('\nfunction ', i + 10));
    const pc = vm.createContext(Object.assign({}, base, {global: {}, chaos_signed_world_y: sp.chaos_signed_world_y, chaos_signed_yu: sp.chaos_signed_yu}));
    vm.runInContext(hex(fn), pc);
    const att = move => { const p = {chaosCoreLastX: 0, chaosCoreLastY: 0, chaosAnchorOffset: 0}; p.chaosCore = {xu: 0, yu: 256 * 100, move, contacts: 0, modifier: 0, previous: 0, plane: 0, tile: 0, state: 14, next: 14}; pc.SCR_chaos_core_publish(p); return p.chaosAttack; };
    eq(att(1), false, 'airborne with the attack bit clear (upright spring flight, falling) is NOT attacking'); eq(att(3), true, 'diagonal spring / jump'); eq(att(2), true, 'horizontal spring / roll'); eq(att(0), false);
    const c1 = {vy: 0, move: 0, bg: 2, contacts: 2, next: 5, d448: 0}; sp.chaos_spring26_launch(c1, true); eq(att(c1.move), false, 'type $26 launch -> not attacking');
    eq(att(3), true, 'ordinary jump posture is attacking');
}

// ---------- 5. independence from masks / viewport, canonical data unchanged ----------
{
    const spr = strip(rd('scripts/SCR_chaos_spring/SCR_chaos_spring.gml').split('// THZ1 off-top death DIAGNOSTIC')[0]);
    ok(!/bbox_|place_meeting|mask_index|camera_get_view|view_camera|chaos_vp_/.test(spr), 'type $26 gameplay reads no mask, sprite bound, camera or viewport');
    ok(!/cp_p\.x|cp_p\.y/.test(spr.slice(spr.indexOf('function SCR_chaos_object_spring_step'))), 'type $26 step contact uses the core anchors, not the GameMaker position');
    const core = strip(rd('scripts/SCR_chaos_core/SCR_chaos_core.gml')), springSrc = core.slice(core.indexOf('function SCR_cc_terrain_spring_state'), core.indexOf('function SCR_cc_twist_enter'));
    ok(!/bbox_|place_meeting|mask_index|camera|view_/.test(springSrc), 'terrain springs read no mask or viewport');
    const dirty = require('./asset_parent_invariant.js').unchangedExceptAssetParents(root, 'HEAD', ['rooms/ROM_chaos_thz1', 'scripts/SCR_chaos_level_thz2_data', 'scripts/SCR_chaos_core_data', 'scripts/SCR_chaos_motion_data', 'objects/OBJ_chaos_object_spring_26_normal', 'objects/OBJ_chaos_object_spring_26_weak', 'objects/OBJ_chaos_object_spring_26_span']);
    eq(dirty, 0, 'canonical rooms, spring placements and terrain/level data are identical to HEAD except approved virtual parents');
    const l1 = rd('rooms/ROM_chaos_thz1/ROM_chaos_thz1.yy');
    for (const [nm, key] of [['OBJ_chaos_object_spring_26_normal', 'strong'], ['OBJ_chaos_object_spring_26_weak', 'weak'], ['OBJ_chaos_object_spring_26_span', 'span']]) {
        const pos = []; const needle = '\"name\": \"' + nm + '\",'; const objDir = 'objects/' + nm; let at = -1;
        while ((at = l1.indexOf(needle, at + 1)) >= 0) { const xi = l1.indexOf('\"x\": ', at), yi = l1.indexOf('\"y\": ', xi), pi = l1.indexOf('\"path\"', at); if (pi < 0 || l1.slice(pi, pi + 120).indexOf(objDir) < 0) continue; pos.push([parseFloat(l1.slice(xi + 5)), parseFloat(l1.slice(yi + 5))]); }
        const want = S.type26_placements.thz1.filter(p => (key === 'span' ? p.form === 'span' : (key === 'strong' ? p.strong && p.form === 'fixed' : !p.strong && p.form === 'fixed'))).map(p => [p.world_x, p.world_y]);
        deep(pos.sort(), want.sort(), `THZ1 ${key} placements`); }
    const lv = rd('scripts/SCR_chaos_level_thz2_data/SCR_chaos_level_thz2_data.gml'), t2 = lv.split(String.fromCharCode(10)).filter(l => l.indexOf(',$26,') > 0).map(l => { const f = l.trim().replace('[', '').split(','); return [+f[1], +f[2]]; });
    deep(t2.sort(), S.type26_placements.thz2.map(p => [p.world_x, p.world_y]).sort(), 'THZ2 type $26 records');
}

// ---------- 6. top-of-screen death: diagnostic evidence (no gameplay change) ----------
{
    for (const r of S.death_boundary.rows) eq(sp.chaos_rom_screen_death(r.screen_y_$D51C), r.died, `ROM rule at screen Y ${r.screen_y_$D51C}`);
    eq(sp.chaos_signed_world_y(256 * 65483), -53); eq(sp.chaos_signed_world_y(256 * 100), 100);
    // Research's forced thrust: the POC core keeps Y unsigned, so crossing world Y 0 publishes ~65535 (the POC death tests are y > room_height); the ROM test is signed
    g.chaosTileIds = ids1.map(() => 254); g.chaosBrokenCells = [];
    const c = cc.SCR_cc_new(2470, 120); c.state = 14; c.next = 14; c.move = 1; let wrapped = null, deepest = 0, died = false;
    for (let u = 0; u < 120; u++) { c.vy = -2048; cc.SCR_cc_tick(c); const raw = Math.floor(c.yu / 256), signed = sp.chaos_signed_world_y(c.yu); deepest = Math.min(deepest, signed);
        if (signed < 0 && wrapped === null) wrapped = {raw, signed, pocFatal: raw > 1024, romFatal: sp.chaos_rom_screen_death(signed - 8)}; }
    ok(wrapped !== null && wrapped.signed < 0 && wrapped.raw > 60000 && wrapped.pocFatal === true && wrapped.romFatal === false, `latent unsigned wrap: world Y ${wrapped.signed} reads as ${wrapped.raw}; POC y>room_height says fatal, ROM rule says not fatal`);
    g.chaosTileIds = ids1;
    // canonical launches never get near world Y 0 (no gameplay change made; the wrap cannot be reached by the recovered speeds)
    const out = [];
    for (const sc of S.terrain_spring_cells.thz1.filter(s => !s.kind.startsWith('horizontal'))) {
        const cx = cc.SCR_cc_new(sc.world_x + 16, sc.world_y + 16 - 18); cx.state = cx.next = 5; cx.previous = 0x81; cx.bg = 2; cx.vy = 0; cc.SCR_cc_floor(cx); let minY = 1e9;
        for (let u = 0; u < 200; u++) { cc.SCR_cc_tick(cx); minY = Math.min(minY, sp.chaos_signed_world_y(cx.yu)); } out.push(minY); }
    ok(Math.min(...out) > 100, `every canonical THZ1 terrain spring flight stays far below the top (lowest world Y ${Math.min(...out)}; Research: highest apex y 127)`);
    console.log('top-of-screen diagnostic: forced thrust wraps to', JSON.stringify(wrapped), '; lowest canonical flight Y', Math.min(...out));
}
console.log(`SPRING INTERACTION CHECKS PASSED (${checks} assertions; ${grid} upright/diagonal grid cells, ${hgrid} horizontal grid cells)`);
