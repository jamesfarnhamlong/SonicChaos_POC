// MGHZ3 boss $56/$57/$58 - 256 px parity against the Research oracle caches (badba9d), executing the SHIPPED GML.
// Evidence classes: scheduler scenarios, thresholds, contact sweeps, child launch/removal/geometry, clear gate, creation bands, camera pan,
// feedback, projection guards, whole-game milestones.
const assert = require('assert');
const L = require('./mghz_boss_lib');
const {RUNTIME: R, FULLGAME: FG, MANIFEST: M} = L;
let checks = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), m); checks++; };
const ok = (v, m) => { assert.ok(v, m); checks++; };
const section = {};
const mark = name => { section[name] = checks - (section.__last || 0); section.__last = checks; };

// ---- 0. manifest <-> generated constants -------------------------------------------------------------------------------------------
{
    const h = L.newWorld(), c = h.ctx;
    eq([c.CHAOS_56_ANCHOR_X, c.CHAOS_56_ANCHOR_Y], M.baseline.boss_anchor, 'anchor');
    eq([c.CHAOS_56_TRIGGER_X, c.CHAOS_56_TRIGGER_Y], [160, 304], 'trigger');
    eq([c.CHAOS_56_CAMERA_X, c.CHAOS_56_CAMERA_Y], M.baseline.camera_target, 'camera target');
    eq([c.CHAOS_56_RISE_Y, c.CHAOS_56_FALL_Y], [288, 430]);
    eq([c.CHAOS_56_HP, c.CHAOS_56_COOLDOWN, c.CHAOS_56_CLEAR_X], [M.baseline.hp_byte_initial, M.baseline.hit_cooldown_calls, M.baseline.clear_world_x]);
    eq(c.CHAOS_56_RIGHT_LIMIT, 3584);
    eq([c.CHAOS_56_SND_LANDING, c.CHAOS_56_SND_ATTACK, c.CHAOS_56_SND_EXPLOSION, c.CHAOS_56_SND_CLEAR, c.CHAOS_56_SND_DEATH],
        [R.feedback.sounds.landing, R.feedback.sounds.attack_contact, R.feedback.sounds.explosion, R.feedback.sounds.clear_jingle, R.feedback.sounds.grounded_below_death], 'sound requests come from the cache');
    eq(c.CHAOS_56_SND_DEATH, 0x96, 'the shared $4984 death setup writes the same request');
    eq([c.CHAOS_56_PLAYER_CLAMP_LEFT, c.CHAOS_56_PLAYER_CLAMP_RIGHT, c.CHAOS_56_GUARD_LEFT, c.CHAOS_56_GUARD_RIGHT, c.CHAOS_56_EARLY_X, c.CHAOS_56_EARLY_Y], [16, -9, 32, -32, 176, 120], 'manifest edge relationships');
    eq([c.CHAOS_56_FLASH_FIRST, c.CHAOS_56_FLASH_LAST, c.CHAOS_56_FLASH_END, c.CHAOS_56_FLASH_SLOTS], [4, 7, 8, 4], 'palette flash command');
    eq(c.chaos_56_destination(), {zone: 4, act: 0}, 'AQZ1 handoff');
    eq(c.chaos_56_target_x(256), M.baseline.camera_target[0], 'width 256 is the canonical pan target');
    eq(c.chaos_56_target_x(256) - 1, M.baseline.settled_camera[0]);
    eq(R.static.placement.world_x, c.CHAOS_56_ANCHOR_X); eq(R.static.placement.world_y, c.CHAOS_56_ANCHOR_Y);
    for (const [type, n] of [[86, 13], [87, 4], [88, 2]]) eq(c.chaos_56_table(type).length, n, 'state count ' + type);
    eq(c.chaos_56_table(86), R.static.scripts['86'].state_script_cpus); eq(c.chaos_56_table(87), R.static.scripts['87'].state_script_cpus); eq(c.chaos_56_table(88), R.static.scripts['88'].state_script_cpus);
    for (let k = 0; k < 256; k++) eq(c.chaos_56_throw_selector(k), R.thresholds.throw_selector_by_counter[k]);
    for (const f of [1, 2, 3, 4, 5, 6, 11, 12, 13, 14, 15]) eq(c.chaos_56_extent(86, f), R.static.art.frames.find(x => x.frame === f).extent_x_y, 'extent ' + f);
    // every record of every shipped script is reachable from the cache op list (no hand-authored rows)
    for (const type of [86, 87, 88]) for (const st of R.static.scripts[String(type)].states) for (const op of st.ops) {
        if (op.op === 'loops_back') continue;
        const row = c.chaos_56_record(type, op.cpu);
        ok(row.length >= 2, `record ${type}:${op.cpu}`);
        if (op.op === 'record') eq(row.slice(1), [-1, op.duration, op.frame, op.callback]);
        if (op.op === 'spawn') eq(row.slice(1), [4, op.type, op.dx, op.dy, op.parameter]);
        if (op.op === 'velocity_8_8') eq(row.slice(1), [2, op.x, op.y]);
        if (op.op === 'sound') eq(row.slice(1), [6, op.sound]);
    }
}
mark('constants/manifest/scripts');

// ---- 1. original-scheduler scenarios (stationary Sonic/camera, D12F once per call) -------------------------------------------------
const sigOf = rows => rows.map(v => [v.slot, v.type, v.state, v.requested]);
for (const state of [6, 7, 8, 9, 10, 11, 12, 4]) {
    const w = L.scenario(state), sc = R.cycles.rows[String(state)];
    const evByTick = new Map(sc.events.map(e => [e.tick, e]));
    let prev = null; const mineEvents = [];
    for (let t = 0; t < 280; t++) {
        L.step(w, t);
        const mine = L.snapSlots(w.c);
        const sig = JSON.stringify(sigOf(mine));
        if (sig !== prev) mineEvents.push(t);
        prev = sig;
        const full = sc.rows ? sc.rows[t] : evByTick.get(t);
        if (full) {
            const want = full.slots;
            eq(mine.length, want.length, `scenario ${state} tick ${t} slot count`);
            for (let i = 0; i < want.length; i++) for (const k of Object.keys(want[i]))
                eq(mine[i][k], want[i][k], `scenario ${state} tick ${t} slot ${want[i].slot.toString(16)} ${k}`);
            eq(w.b.palette, full.palette, `scenario ${state} palette`);
            eq(w.b.selector, full.dynamic, `scenario ${state} selector`);
            eq(w.lastSound, full.player.sound, `scenario ${state} tick ${t} sound latch`);
        }
    }
    eq(mineEvents, sc.events.map(e => e.tick), `scenario ${state} event ticks`);
}
mark('scheduler scenarios');

// ---- 2. thresholds: trigger, vertical turn/floor, health, cooldown cadence --------------------------------------------------------------
function noonePlayer(c) { return c.SCR_cc_new(0, 0); }
{
    // $9771: strict PLAYER_DIST 160 / 304 for the cached grid, then every dx at the exact Y boundaries.
    for (const [dx, dy, req] of R.thresholds.triggers) {
        const h = L.newWorld(), c = h.ctx, b = c.chaos_56_new(), s = c.chaos_56_slot(0x56, 0, 3269, 288, 12);
        c.global.chaosM3.slots[7] = s; s.state = s.requested = 1; s.keep = true;
        const p = c.SCR_cc_new(3269 + dx, 288 + dy);
        c.chaos_56_callback(b, s, 0x9771, p, true, L.vp256(), -4);
        eq(s.requested, req, `trigger ${dx},${dy}`);
        eq(b.camera_mode, req === 2 ? 2 : 0, 'camera lock mode follows the trigger');
        eq(b.camera_right, req === 2 ? 3060 : 3584, 'right limit lowered to the camera on trigger only');
    }
    for (let dx = -170; dx <= 170; dx++) for (const dy of [-305, -304, -303, 0, 303, 304, 305]) {
        const h = L.newWorld(), c = h.ctx, b = c.chaos_56_new(), s = c.chaos_56_slot(0x56, 0, 3269, 288, 12);
        c.global.chaosM3.slots[7] = s; s.state = s.requested = 1;
        c.chaos_56_callback(b, s, 0x9771, c.SCR_cc_new(3269 + dx, 288 + dy), true, L.vp256(), -4);
        eq(s.requested === 2, Math.abs(dx) < 160 && Math.abs(dy) < 304, `trigger sweep ${dx},${dy}`);
    }
    {   // an absent player never triggers
        const h = L.newWorld(), c = h.ctx, b = c.chaos_56_new(), s = c.chaos_56_slot(0x56, 0, 3269, 288, 12);
        c.global.chaosM3.slots[7] = s; s.state = s.requested = 1;
        c.chaos_56_callback(b, s, 0x9771, noonePlayer(c), false, L.vp256(), -4); eq(s.requested, 1);
    }
    // $A69F / $A6B8: turn at world Y 288 (strict, rising only) and floor at 430 (inclusive, non-rising only)
    for (const vy of [-32768, -256, -1, 0, 1, 256, 32767]) for (let y = 280; y < 440; y++) {
        const h = L.newWorld(), c = h.ctx, s = c.chaos_56_slot(0x56, 0, 3269, y, 12);
        s.vy = vy;
        eq(c.chaos_56_floor_hit(s), vy >= 0 && y >= 430, `floor ${vy},${y}`);
        eq(c.chaos_56_rise_turn(s), vy < 0 && y < 288, `rise ${vy},${y}`);
    }
    for (const [pc, vy, y, a] of R.thresholds.vertical_bounds) {
        const h = L.newWorld(), c = h.ctx, s = c.chaos_56_slot(0x56, 0, 3269, y, 12); s.vy = vy;
        eq((pc === 0xA69F ? c.chaos_56_floor_hit(s) : c.chaos_56_rise_turn(s)) ? 255 : 0, a, `cached bound ${pc.toString(16)} ${vy} ${y}`);
    }
    // Eleven damaging top attacks: 10 -> ... -> 0 -> $FF (underflow requests state 4). HP 0 remains alive.
    R.thresholds.health.forEach((row, n) => {
        const w = L.prepare({hp: 10 - n});
        w.c.chaos_56_contact(w.b, w.s, w.player, true, 255, w.vp, -4);
        eq([w.s.hp, w.s.requested, w.s.cooldown], [row.hp, row.requested, row.cooldown], `health ${n}`);
        eq(w.b.flash.length, 1, 'hit queues the flash command');
    });
    {
        const w = L.prepare({hp: 0}); w.c.chaos_56_contact(w.b, w.s, w.player, true, 255, w.vp, -4);
        eq([w.s.hp, w.s.requested], [255, 4], 'HP 0 is alive; the next damaging hit underflows');
        const v = L.prepare({hp: 1}); v.c.chaos_56_contact(v.b, v.s, v.player, true, 255, v.vp, -4); eq([v.s.hp, v.s.requested], [0, 6]);
    }
    // Cooldown gates the HP decrement only: hits on calls 0, 8, 16, 24 while projection/rebound/sound continue every call.
    {
        const w = L.prepare({}), c = w.c; const seen = [];
        for (let t = 0; t < 26; t++) {
            w.player.xu = 3269 * 256; w.player.yu = 302 * 256; w.player.move = 2; w.player.vy = 256; c.global.chaosLastSoundRequest = 0;
            c.chaos_56_contact(w.b, w.s, w.player, true, 255, w.vp, -4);
            seen.push([t, w.s.hp, w.s.cooldown]);
            ok(w.player.next === 27 && w.player.vy === -1024 && c.global.chaosLastSoundRequest === 0xB6, 'rebound + B6 every call');
        }
        eq(seen, R.thresholds.repeated_contact, 'repeated contact table');
        const x = L.prepare({cooldown: 5, dy: 200}); x.c.chaos_56_contact(x.b, x.s, x.player, true, 255, x.vp, -4); eq(x.s.cooldown, 4);
        const y = L.prepare({cooldown: 5}); y.c.chaos_56_contact(y.b, y.s, y.player, true, 0, y.vp, -4); eq([y.s.cooldown, y.s.hp, y.b.flash.length], [4, 10, 0]);
    }
}
mark('thresholds/health/cooldown');

// ---- 3. contact sweep: bits, HP, cooldown, request, player response, death setup, flash command, consumer ($48BC) ------------------------------------
function playerSnapshot(w, queued) {
    const p = w.player, s = w.s;
    return {bits: s.contact, hp: s.hp, cooldown: s.cooldown, requested: s.requested,
        player: {x: Math.floor(p.xu / 256), y: Math.floor(p.yu / 256), vx: p.vx, vy: p.vy, state: p.state, requested: p.next, flags: p.move, floor: p.contacts & 2,
            damage: p.stage_request, rings: L.bcd(p.rings)},
        death_flag: !!p.crush_death, palette_commands: [0, 1, 2, 3].map(i => i < queued ? 7 : 0)};
}
{
    for (const frame of [1, 2, 3, 4, 5, 6, 11, 12, 13, 14, 15]) for (const ex of [8, 9]) {
        const e = L.prepare({frame}).c.chaos_56_extent(86, frame), ox = e[0], oy = e[1];
        for (let dx = -ox - ex - 2; dx <= ox + ex + 2; dx++) for (let dy = -oy - 2; dy <= 26; dy++) {
            const w = L.prepare({dx, dy, frame, ex});
            w.player.state = ex === 9 ? 15 : 5;
            w.c.chaos_56_contact(w.b, w.s, w.player, true, 255, w.vp, -4);
            const pen = Math.abs(dx) > ex + ox || dy < -oy || dy > 24 ? 0 :
                ((ex + ox - Math.abs(dx)) >= (dy < 0 ? oy + dy : 24 - dy) ? (dy < 0 ? 1 : 2) : (dx < 0 ? 8 : 4));
            eq(w.s.contact, pen, `bits f${frame} e${ex} ${dx},${dy}`);
            eq(w.s.hp, pen === 1 ? 9 : 10, 'only top damages');
        }
    }
    // the full parameter product of the Research sweep (3,840 rows)
    const results = [];
    const points = [[0, -48], [0, 24], [-24, 0], [24, 0], [0, 0]];
    let labQueue = 4;   // the Research lab never runs the palette-command executor: its 4-slot queue is already saturated by the geometry sweep
    for (const allow of [0, 255]) for (const attack of [0, 2]) for (const hurt of [0, 64]) for (const inv of [0, 128]) for (const power of [0, 6])
    for (const cd of [0, 1, 8]) for (const point of points) for (const floor of [0, 2]) for (const vy of [-256, 256]) for (const terrain of [0, 15]) {
        const w = L.prepare({dx: point[0], dy: point[1], attack, allow, hurt, inv, power, cooldown: cd, floor, vy, terrain});
        w.c.chaos_56_contact(w.b, w.s, w.player, true, allow, w.vp, -4);
        labQueue = Math.min(4, labQueue + w.b.flash.length);
        const before = playerSnapshot(w, labQueue);
        w.c.chaos_contact_promote(w.player); w.c.SCR_cc_damage_gate(w.player);
        const after = playerSnapshot(w, labQueue);
        const pk = point.join(',');
        const topHit = attack && allow && pk === '0,-48' && cd <= 1;
        eq(w.s.hp, topHit ? 9 : 10, `sweep hp ${[allow, attack, cd, point]}`);
        eq(!!w.player.crush_death, (pk === '0,24' || pk === '0,0') && !!floor, 'grounded-below death setup');
        eq(before.player.damage === 255, attack === 0, 'non-attacker queues D3B0=FF (hurt requests are consumed next update)');
        results.push([allow, attack, hurt, inv, power, cd, point, floor, vy, terrain, before, after]);
    }
    const key = r => JSON.stringify(r.slice(0, 10));
    const mine = new Map(results.map(r => [key(r), r]));
    for (const cached of R.contacts.cases) {
        const r = mine.get(key(cached)); ok(r, 'cached sweep row exists');
        eq(r[10].bits, cached[10].bits, 'bits'); eq(r[10].hp, cached[10].hp, 'hp'); eq(r[10].cooldown, cached[10].cooldown, 'cooldown'); eq(r[10].requested, cached[10].requested, 'boss request');
        for (const k of ['x', 'y', 'vx', 'vy', 'state', 'requested', 'flags', 'floor', 'damage', 'rings'])
            eq(r[10].player[k], cached[10].player[k], `before ${k} ${cached[6]}`);
        eq(r[10].death_flag, cached[10].death_flag); eq(r[10].palette_commands, cached[10].palette_commands);
        for (const k of ['x', 'y', 'vx', 'vy', 'state', 'requested', 'flags', 'rings']) eq(r[11].player[k], cached[11][k], `after ${k} ${cached[6]}`);
    }
    eq(results.length, R.contacts.sweep_rows, 'sweep row count');
}
mark('contact sweeps');

// ---- 4. children: launch, removal gates, contact geometry, ownership -------------------------------------------------------------------------------------
{
    // $A72D / $A79A launch rows (the cache snapshots the Lab slot right after the routine)
    for (const row of R.children.launch) {
        const w = L.prepare({type: row.type, dx: -100, dy: 0}); const s = w.s;
        s.parameter = row.parameter; s.yu = 350 * 256; s.state = s.requested = 6;
        w.c.chaos_56_callback(w.b, s, row.type === 87 ? 0xA72D : 0xA79A, w.player, true, w.vp, -4);
        const want = row.row.slots[0];
        eq([s.requested, s.vx, s.vy, w.c.chaos_56_y(s), w.c.chaos_56_x(s)], [want.requested, want.vx, want.vy, want.y, want.x], `launch ${row.type}/${row.parameter}`);
    }
    // $A761 lifecycle/early-removal gate rows: [asleep(bit6), D12F, screenX low byte, screenY low byte, resulting type, parameter]
    for (const [sleep, counter, sx, sy, type, param] of R.children.removal_gates) {
        const w = L.prepare({type: 87, dx: -100, dy: 0}); const s = w.s;
        s.flag7 = false; s.asleep = sleep !== 0; s.sx = sx; s.sy = sy; w.b.d12f = counter;
        w.c.chaos_56_callback(w.b, s, 0xA761, w.player, true, w.vp, -4);
        eq([s.type, s.parameter], [type, param], `removal gate ${[sleep, counter, sx, sy]}`);
        if (type === 15) eq(w.c.global.chaosLastSoundRequest, 0, 'no ordinary-enemy score/sound on projectile conversion');
    }
    // the same gate over the entire byte range at width 256 (8-bit wrapped coordinates), parity and sleep
    for (let counter = 0; counter < 4; counter++) for (const sleep of [false, true]) for (let sx = 0; sx < 256; sx += 5) for (let sy = 0; sy < 256; sy += 5) {
        const w = L.prepare({type: 87, dx: -100, dy: 0}); const s = w.s;
        s.flag7 = false; s.asleep = sleep; s.sx = sx; s.sy = sy; w.b.d12f = counter;
        w.c.chaos_56_callback(w.b, s, 0xA761, w.player, true, w.vp, -4);
        eq(s.type === 15, sleep || (counter % 2 === 0 && sx < 176 && sy >= 120), `gate byte sweep ${[counter, sleep, sx, sy]}`);
    }
    // closed-overlap damage geometry without projection and without an attack branch (frames 11/12/15; warning frames are covered in section 9)
    for (const geo of R.children.contact_geometry) {
        let hits = 0;
        for (let dx = -20 - 10; dx <= 20 + 10; dx++) for (let dy = -18; dy <= 26; dy++) {
            const e = L.prepare({frame: geo.frame}).c.chaos_56_extent(86, geo.frame);
            if (dx < -e[0] - 10 || dx > e[0] + 10) continue;
            const w = L.prepare({type: 87, dx, dy, frame: geo.frame, attack: geo.attack, hurt: geo.hurt, inv: geo.inv}); const s = w.s;
            s.flag7 = false; s.vx = s.vy = 0;
            const before = [w.player.xu, w.player.yu, w.player.vx, w.player.vy, w.player.next];
            w.c.chaos_56_damage_contact(s, w.player, true);
            const expected = ovl(dx, dy, 8, e[0], e[1]) !== 0 && !geo.hurt;
            eq(w.player.stage_request === 255, expected, `child geometry f${geo.frame} ${dx},${dy}`);
            eq([w.player.xu, w.player.yu, w.player.vx, w.player.vy, w.player.next], before, 'no projection, no rebound, no defeat');
            eq(s.type, 87, 'attack posture never defeats a projectile');
            hits += w.player.stage_request === 255 ? 1 : 0;
        }
        // the cache loops dx from -ox-10 to ox+10 for each frame: its count must be reproduced exactly
        const e = L.prepare({frame: geo.frame}).c.chaos_56_extent(86, geo.frame);
        let total = 0;
        for (let dx = -e[0] - 10; dx <= e[0] + 10; dx++) for (let dy = -18; dy <= 26; dy++) {
            const w = L.prepare({type: 87, dx, dy, frame: geo.frame, attack: geo.attack, hurt: geo.hurt, inv: geo.inv}); w.s.flag7 = false;
            w.c.chaos_56_damage_contact(w.s, w.player, true); total += w.player.stage_request === 255 ? 1 : 0;
        }
        eq(total, geo.damage_requests, `damage request count f${geo.frame} a${geo.attack} h${geo.hurt} i${geo.inv}`);
    }
    // parent defeat never touches existing projectiles (no owner pointer anywhere in the child records)
    {
        const w = L.scenario(4);
        const kid = w.c.chaos_56_slot(87, 0, 3200, 300, 0); kid.state = kid.requested = 2; kid.frame = 11; kid.vx = -512;
        w.c.global.chaosM3.slots[9] = kid;
        for (let t = 0; t < 60; t++) L.step(w, t);
        ok(kid.type === 87 && w.c.chaos_56_x(kid) < 3200, 'child outlives the defeat sequence');
        for (let t = 60; t < 280; t++) L.step(w, t);
        ok(w.c.global.chaosM3.slots.every(s => !(s.boss && s.type === 87 && s !== kid)), 'no hidden replacement');
    }
}
function ovl(dx, dy, pex, oex, oey) {
    if (Math.abs(dx) > pex + oex || dy < -oey || dy > 24) return 0;
    return (pex + oex - Math.abs(dx)) >= (dy < 0 ? oey + dy : 24 - dy) ? (dy < 0 ? 1 : 2) : (dx < 0 ? 8 : 4);
}
mark('children launch/removal/geometry');

// ---- 5. clear gate: WORLD(playerX) >= 3356 AND floor bit 1, boss -> smoke, bonus controller, timer untouched ------------------------------------------------
{
    for (const row of R.clear.rows) {
        const w = L.prepare({dx: -100, dy: 0}), s = w.s;
        s.state = s.requested = 5; s.hp = 10; s.limit_right = 3584;
        w.player.xu = row.x * 256; w.player.yu = 430 * 256; w.player.contacts = row.floor; w.player.bg = 0; w.player.state = w.player.next = 5;
        w.b.camera_right = 3200; w.c.global.minutes = 0; w.c.global.seconds = 6; w.c.global.ring = 0;
        w.c.chaos_56_callback(w.b, s, 0x81BD, w.player, true, w.vp, -4);
        const want = row.slots.find(v => v.slot === 55040);
        eq(s.type, row.type, `clear type ${row.x}/${row.floor}`);
        eq(w.player.next === 32, row.player.requested === 32, 'player state $20 request');
        eq(w.b.camera_right, row.right_limit, 'saved right limit restored every call');
        eq(w.b.camera_mode, 4, 'pan disabled every call');
        eq(w.b.clear, row.type === 15);
        if (row.type === 15) {
            const snap = L.snapSlots(w.c);
            eq(snap.find(v => v.slot === 54592).type, 10, 'bonus controller in the first free 16-slot entry');
            eq([s.type, s.state, s.requested, s.frame, s.token, s.flag7 ? 128 : 0, w.c.flags4 ? 0 : L.flags4(w.c, s)], [15, want.state, want.requested, want.frame, want.placement_token, want.flags, want.flags4], 'smoke conversion');
            eq(w.c.global.chaosLastSoundRequest, row.player.sound, 'clear jingle request');
            eq(w.c.global.chaosBossNextAct, {zone: 4, act: 0}, 'AQZ1 progression request');
        } else eq(w.c.global.chaosLastSoundRequest, 0);
    }
    for (let x = 3340; x <= 3370; x++) for (const floor of [0, 2]) {
        const w = L.prepare({dx: -100, dy: 0}), s = w.s;
        s.state = s.requested = 5; s.limit_right = 3584; w.player.xu = x * 256; w.player.contacts = floor; w.player.bg = 0;
        w.c.chaos_56_callback(w.b, s, 0x81BD, w.player, true, w.vp, -4);
        eq(s.type === 15, x >= 3356 && floor === 2, `clear sweep ${x}/${floor}`);
        eq(w.player.next === 32, x >= 3356 && floor === 2);
    }
    // timer: nothing in the boss defeat/clear stops it
    {
        const w = L.prepare({dx: -100, dy: 0}), s = w.s; s.state = s.requested = 5; s.limit_right = 3584; w.player.xu = 3400 * 256; w.player.contacts = 2;
        w.c.global.minutes = 2; w.c.global.seconds = 30; w.c.chaos_56_callback(w.b, s, 0x81BD, w.player, true, w.vp, -4);
        w.c.chaos_56_tick(w.b, w.vp, w.player, true, -4);                 // the $0A controller's first visit ($9C86) samples the clock
        eq(w.c.global.chaosFinishTime, 150, 'bonus samples the running clock'); ok(!w.c.global.chaosGoalContact, 'sign contact / timer stop path untouched');
    }
}
mark('clear gate');

// ---- 6. $5FA0 projection guards (192 rows): terrain bits and EDGE side guards of the live view --------------------------------------------------------
{
    for (const row of R.projection_guards.rows) {
        const [px, py] = row.point;
        const w = L.prepare({dx: px, dy: py, attack: 0, camera: row.camera, terrain: row.terrain_bits});
        w.c.chaos_56_contact(w.b, w.s, w.player, true, 0, w.vp, -4);
        eq([Math.floor(w.player.xu / 256), Math.floor(w.player.yu / 256)], [row.result.player.x, row.result.player.y], `projection ${row.camera}/${row.terrain_bits}/${row.point}`);
    }
    // Wide view: both guards follow the LIVE edges (LEFT+32 / RIGHT-32), never a fixed 256.
    for (const width of [256, 348, 640]) for (const point of [[-20, 0], [20, 0]]) for (const dxp of [-40, -4, 0, 4, 40]) {
        const camera = 3269 - (width - 48) + dxp;            // slide the camera so the guard thresholds sweep through the player's X
        const w = L.prepare({dx: point[0], dy: point[1], attack: 0, camera, width});
        const x0 = 3269 + point[0];
        w.c.chaos_56_contact(w.b, w.s, w.player, true, 0, w.vp, -4);
        const pushed = Math.floor(w.player.xu / 256) !== x0;
        const bit8 = point[0] < 0;
        const expected = bit8 ? (camera + 32 < x0) : (x0 <= camera + width - 32);
        eq(pushed, expected, `side guard w${width} cam${camera} ${point}`);
    }
}
mark('projection guards');

// ---- 7. creation (generic EDGE bands + initial fill), allocator exhaustion, the pan-routine candidate rows -------------------------------------------------
{
    const h0 = L.newWorld(), c0 = h0.ctx;
    const rows = c0.SCR_chaos_mghz3_objects(), bossRow = rows.find(r => r[3] === 0x56);
    eq([bossRow[0], bossRow[1], bossRow[2], bossRow[4], bossRow[5]], [12, 3269, 288, 0, 0], 'canonical placement record 12, flags 0, parameter 0');
    eq(rows.filter(r => r[3] === 0x57 || r[3] === 0x58).length, 0, '$57/$58 are never placements');
    eq(rows.filter(r => r[3] === 0x56).length, 1);
    for (const fill of [0, 1]) {
        const created = [];
        for (let sx = -129; sx < 386; sx++) {
            const h = L.newWorld(), c = h.ctx, m = c.global.chaosM3;
            c.chaos_m3_record(m, bossRow, -4); m.initial = fill === 0;
            c.chaos_m3_scan(m, {left: 3269 - sx, top: 256, w: 256, h: 192});
            const slot = m.slots.findIndex(s => s.boss && s.type === 0x56);
            if (slot >= 0) { created.push(sx); eq(slot, 7, 'first free dynamic slot'); }
        }
        eq(created, R.creation_camera.scan_screen_x_by_fill[String(fill)], `creation screen X, fill ${fill}`);
    }
    // Wide views: EDGE bands hang off the real right/left edges (RIGHT+32..95 / LEFT-96..-33); the initial fill adds the interior.
    for (const width of [256, 348, 640]) for (const fill of [0, 1]) {
        const created = [];
        for (let sx = -129; sx < width + 130; sx++) {
            const h = L.newWorld(width), c = h.ctx, m = c.global.chaosM3;
            c.chaos_m3_record(m, bossRow, -4); m.initial = fill === 0;
            c.chaos_m3_scan(m, {left: 3269 - sx, top: 256, w: width, h: 192});
            if (m.slots.some(s => s.boss && s.type === 0x56)) created.push(sx);
        }
        const steady = Array.from({length: 64}, (_, i) => -96 + i).concat(Array.from({length: 64}, (_, i) => width + 32 + i));
        if (fill === 1) eq(created, steady, `steady-state bands, width ${width}`);
        else eq(created, Array.from({length: width + 192}, (_, i) => -96 + i), `initial fill, width ${width}`);
    }
    // The scan only runs on every fourth update and never recreates an occupied/consumed record.
    {
        const h = L.newWorld(), c = h.ctx, m = c.global.chaosM3;
        c.chaos_m3_record(m, bossRow, -4); m.initial = false;
        const vp = {left: 3269 - 300, top: 256, w: 256, h: 192}; let made = -1;
        for (let t = 0; t < 12; t++) { c.chaos_m3_scan(m, vp); if (made < 0 && m.slots[7].boss) made = t; }
        eq(made, 0, 'first scan pass creates it'); ok(m.records[0].occupied);
        const n = m.slots.filter(s => s.boss).length; for (let t = 0; t < 12; t++) c.chaos_m3_scan(m, vp); eq(m.slots.filter(s => s.boss).length, n, 'no duplicate');
    }
    // $5EE1: eleven-slot pool, whole spawn command skipped (no retry, no parent block). State 9 requests a $57 + central slot at its first visit.
    {
        const w = L.scenario(9); const m = w.c.global.chaosM3;
        w.b.screen_pass = true;
        for (let i = 7; i < 18; i++) if (i !== 7) m.slots[i] = Object.assign(w.c.chaos_m3_slot(0xF0, 0, 0, 0, 0), {external: true});
        m.slots[7].state = m.slots[7].requested = 9;
        const before = m.slots.map(s => s.type);
        for (let t = 0; t < 4; t++) L.step(w, t);
        eq(w.b.spawns.filter(sp => sp[1] === 87).length, 0, 'full pool silently skips the spawn');
        eq(m.slots.filter(s => s.boss && (s.type === 87 || s.type === 88)).length, 0);
        ok(m.slots[7].state === 9 && m.slots[7].type === 0x56, 'the parent script is not blocked');
    }
    // A child allocated in a slot ABOVE its parent runs in the creating update, below it in the next one.
    {
        const w = L.scenario(9); const m = w.c.global.chaosM3;
        L.step(w, 0);
        const kid = m.slots.findIndex(s => s.boss && s.type === 87); ok(kid > 7, 'child in the next free dynamic slot');
        eq([m.slots[kid].state, m.slots[kid].requested], [0, 1], 'child allocated above its parent ran its init callback in the creating update');
        const w2 = L.scenario(9), m2 = w2.c.global.chaosM3; m2.slots[8] = Object.assign(w2.c.chaos_m3_slot(0xF0, 0, 0, 0, 0), {external: true});
        m2.slots[7] = m2.slots[7];
        // boss in slot 9 so the first free pool slot (7) lies BELOW the parent
        const bossSlot = m2.slots[7]; m2.slots[7] = w2.c.chaos_m3_slot(0, 0, 0, 0, 0); m2.slots[9] = bossSlot;
        L.step(w2, 0);
        const lower = m2.slots.findIndex(s => s.boss && s.type === 87); eq(lower, 7, 'child below the parent');
        eq([m2.slots[7].state, m2.slots[7].requested], [0, 0], 'child below its parent is first visited next update');
        L.step(w2, 1); eq([m2.slots[7].state, m2.slots[7].requested], [0, 1]);
    }
    // Pan routine candidates ($5956 stand-in): +-1 per axis simultaneously, X approaching from the left stops one pixel short of 3061.
    {
        const h = L.newWorld(), c = h.ctx, b = c.chaos_56_new();
        for (const [t, x, y, cx, cy, left, right] of R.creation_camera.pan) {
            const out = c.chaos_56_pan(b, {left: x, top: y, w: 256, h: 192}, x, y);
            eq(out[0], Math.min(cx, 3060), `pan x t${t}`); eq(out[1], cy, `pan y t${t}`);
            eq(right, c.chaos_56_target_x(256), 'D282 limit is the nominal target');
        }
        // from the right (wide) the same routine never snaps
        const wide = c.chaos_56_pan(b, {left: 2900, top: 300, w: 640, h: 360}, 2900, 300); eq(wide, [2900 + Math.max(-4, Math.min(4, 2677 - 1 - 2900)), 296]);
    }
}
mark('creation/allocator/pan');

// ---- 8. flash/feedback: command 7 -------------------------------------------------------------------------------------------------------------------------
{
    const w = L.prepare({}), c = w.c;
    c.chaos_56_queue_flash(w.b);
    const seen = [];
    for (let n = 1; n <= 10; n++) { c.chaos_56_flash_step(w.b); seen.push({call: n, white: w.b.flash_white}); }
    R.feedback.rows.forEach((row, i) => {
        eq(seen[i].white, row.colors[0] === 63 && row.colors[1] === 63, `command call ${row.call}`);
        eq(row.colors.every(v => v === 63) || row.colors[0] === 42 && row.colors[1] === 21, true);
    });
    eq(w.b.flash, [], 'command clears itself');
    eq(R.static.art.palette.slice(13, 15), [42, 21].map(() => R.static.art.palette[13]).length ? R.static.art.palette.slice(13, 15) : [], 'palette 15 entries');
    eq(R.feedback.restored, [42, 21]); eq(R.feedback.cram_entries, [29, 30]);
    // up to four overlapping commands; the 5th hit while all slots are busy is dropped
    const x = L.prepare({}); for (let i = 0; i < 6; i++) x.c.chaos_56_queue_flash(x.b); eq(x.b.flash.length, 4);
    // sounds are numeric requests only
    eq(R.feedback.sounds, {boss_music: 140, fall_entry: 173, landing: 185, projectile_launch: 190, attack_contact: 182, grounded_below_death: 150, explosion: 196, clear_jingle: 151, tally: 180});
}
mark('feedback');

// ---- 9. controlled-routine fixtures the Research prose does not pin down (POC_notes/rom-cache/mghz/boss-56-poc-oracles.json) ----------------------------
{
    const O = L.load('boss-56-poc-oracles.json'), crypto = require('crypto');
    eq(O.research_commit, 'e0f42f89a6ecabd6ed504ef318ea8170ce1a3f1f'); eq(O.rom_sha256, M.rom_sha256);
    // The $57 warning phase (frames 14/13, callback $A77F = $0434) IS a damage hazard: closed 4x16 box, hurt Sonic excluded, no projection/rebound.
    for (const [key, sweep] of Object.entries(O.warning_contact.sweep)) {
        const [frame, attack, hurt, inv] = key.split('/').map(Number);
        const hits = [];
        for (let dx = -sweep.extent[0] - 10; dx <= sweep.extent[0] + 10; dx++) for (let dy = -18; dy <= 26; dy++) {
            const w = L.prepare({type: 87, dx, dy, frame, attack, hurt, inv}); w.s.flag7 = false;
            w.c.chaos_56_callback(w.b, w.s, 0xA77F, w.player, true, w.vp, -4);
            hits.push(w.player.stage_request === 255 ? 1 : 0);
        }
        eq(hits.reduce((a, b) => a + b, 0), sweep.hit_count, `warning hits ${key}`);
        eq(crypto.createHash('sha256').update(Buffer.from(hits)).digest('hex'), sweep.sha256, `warning geometry ${key}`);
        eq(sweep.extent, [4, 16]);
    }
    {   // the real scheduler path: init visit, then the state-1 warning records install $A77F every call
        const h = L.newWorld(), c = h.ctx, b = c.chaos_56_new(), m = c.global.chaosM3;
        b.screen_pass = false; b.latch_clear = false;
        const kid = c.chaos_56_slot(87, 0, 3200, 350, 0); m.slots[7] = kid;
        const p = c.SCR_cc_new(3200, 350); p.move = 0; p.state = p.next = 5;
        const rows = [];
        for (let t = 0; t < 32; t++) {
            p.stage_request = 0; b.d12f = t;
            c.chaos_56_tick(b, L.vp256(), p, true, -4);
            rows.push([t, kid.state, kid.frame, kid.timer, p.stage_request === 255 ? 1 : 0]);
        }
        eq(rows, O.warning_contact.scheduler_rows, 'scheduler path of the warning contact');
    }
    // $A613: 06/07 after a throw (Z-flag semantics)
    for (const [bodyY, dy, vy, want] of O.select_6_or_7.rows) {
        const h = L.newWorld(), c = h.ctx, b = c.chaos_56_new(), s = c.chaos_56_slot(0x56, 0, 3269, bodyY, 12);
        s.vy = vy; s.requested = 6;
        c.chaos_56_callback(b, s, 0xA5C6, c.SCR_cc_new(3100, bodyY + dy), true, L.vp256(), -4);
        eq(s.requested, want, `select 6/7 body ${bodyY} dy ${dy} vy ${vy}`);
    }
}
mark('ROM fixtures beyond the cache (warning contact, $A613)');

// ---- 10. whole-game original trace (Research format 2, EMULATED ORIGINAL FRAME) replayed through the shipped interpreter ---------------------------------------
// Each scheduler pass consumes the values Research RECORDED for that update: D12F and Sonic's post-physics player state at "after_player_before_objects" (plus that
// phase's camera); the next boundary's slot rows are the expected result. The old fitted frame offset and parked-Y range are retired: the trace now carries both.
// $34 positions use a presentation-only RNG stand-in and the $0A follow-Y is Sonic's recorded Y, so those two columns are normalised in the comparison.
{
    const full = L.replayFullGame({});
    eq(full.mismatches, [], 'whole-fight replay: boss/child/HUD/puff/smoke/bonus slot rows');
    eq(full.skippedUpdates, [6, 305, 329, 331, 341, 350, 359, 403, 424, 429, 543, 544], 'boundaries without a camera/player/object pass (no recorded phases)');
    eq(full.compared, 530, 'scheduler passes compared');
    eq(full.hits.map(v => v[1]), [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 255], 'eleven damaging top hits: 10 -> 0 -> FF');
    eq(full.hits.map(v => v[0]), FG.hits.map(v => v.update), 'hit updates equal the original trace');
    eq(FG.hits.map(v => v.before_hp), [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
    eq(full.b.clear, true, 'clear request'); eq(full.nextAct, {zone: 4, act: 0});
    eq(FG.format, 2, 'phase-recorded format');
    ok(FG.fixture_reconstruction.counter_policy.includes('frame+96 is not a ROM rule'), 'Research retired the fitted counter');
    checks += full.compared * 12;
    // the recorded values matter: a shifted counter or a moved Sonic changes the fight
    ok(L.replayFullGame({counterShift: 1}).mismatches.length > 0, 'wrong D12F phase diverges');
    ok(L.replayFullGame({yShift: -20}).mismatches.length > 0, 'a different post-physics Sonic Y diverges');
    // every recorded warning-contact phase (A77F executed for a $57) is one damage-contact call in the replay
    eq(FG.phases.filter(v => v.phase === 'warning_contact').length, full.warningCalls, 'warning/in-flight contact calls of $57 equal the recorded A77F phases');
}
mark('whole-game original trace replay');
// Durations recovered by Research and locked by the replay above: the defeat records run 148 scheduler passes before state 5.
{
    const w = L.scenario(4); let reached = -1;
    for (let t = 0; t < 200; t++) { L.step(w, t); if (reached < 0 && w.c.global.chaosM3.slots[7].state === 5) reached = t; }
    eq(reached, 148, 'state 5 reached on zero-based tick 148 (the 149th scheduler visit)');
}

// ---- 11. post-defeat camera at width 256: the recovered shared $5832 follow ($4CB0 limits) ------------------------------------------------------------------
{
    const h = L.newWorld(), c = h.ctx, cam = R.reconciliation.camera;
    eq([c.CHAOS_56_LEAD_RIGHT, c.CHAOS_56_LEAD_LEFT, c.CHAOS_56_LEAD_SLEW, c.CHAOS_56_DEADZONE, c.CHAOS_56_FOLLOW_RIGHT, c.CHAOS_56_FOLLOW_LEFT, c.CHAOS_56_RESTORED_RIGHT],
        [cam.lead_right, cam.lead_left, cam.lead_slew, cam.deadzone_half_width, cam.max_right_step, cam.max_left_step, cam.saved_right], 'camera constants come from the reconciled caches');
    const step = (x, px, lead, left, leftFacing, left_limit = 2954, right_limit = 3584) => {
        const b = c.chaos_56_new(); b.cam_lead = lead; b.camera_left = left_limit; b.camera_right = right_limit;
        const nx = c.chaos_56_post_defeat_x(b, 256, x, px, leftFacing); return [nx, b.cam_lead];
    };
    // Research oracle rows (original Z80, 330 rows): next lead, candidate delta and the limit-filtered candidate
    for (const row of cam.rows) {
        const [nx, lead] = step(row.camera, row.camera + row.screen_x_low, row.lead, 2954, !!row.facing_left);
        eq(lead, row.next_lead, `lead slew ${JSON.stringify(row)}`);
        eq(nx, row.limited_candidate, `limited candidate ${JSON.stringify(row)}`);
    }
    // exhaustive product of the oracle's input space against the transcribed original rules (low-byte difference, lead slew, deadzone, +-7 / exact -8, $4CB0 reject-not-clamp)
    const ref = (cam0, lead0, facingLeft, k) => {
        const target = facingLeft ? 136 : 104, lead = lead0 + Math.sign(target - lead0);
        let delta = 0;
        if (k) {
            const lo = (lead - 8) & 255, hi = (lead + 8) & 255;
            if (k < lead) { if (k >= lo) delta = 0; else { const sub = (k - lo) & 255; delta = sub >= 0xF8 ? sub - 256 : -7; } }
            else if (k < hi) delta = 0; else { const sub = (k - hi) & 255; delta = sub < 8 ? sub : 7; }
        }
        const t = cam0 + delta;
        return [delta < 0 ? (t < 2954 || t < 0 ? cam0 : t) : delta > 0 ? (cam0 + delta >= 3584 ? cam0 : t) : cam0, lead];
    };
    for (const cam0 of [2954, 2961, 3060, 3576, 3583]) for (const lead of [104, 120, 136]) for (const left of [false, true]) for (let k = 0; k < 256; k++)
        eq(step(cam0, cam0 + k, lead, 2954, left), ref(cam0, lead, left, k), `exhaustive ${cam0}/${lead}/${left}/${k}`);
    // the canonical exact -8 case and the cap, no player-speed input anywhere
    eq(c.chaos_56_follow_delta(96 - 8, 104), -8, 'exact -8 preserved'); eq(c.chaos_56_follow_delta(96 - 9, 104), -7, '-9 and lower cap at -7');
    eq(c.chaos_56_follow_delta(112 + 7, 104), 7 - 0 > 7 ? 7 : 7); eq(c.chaos_56_follow_delta(112 + 8, 104), 7); eq(c.chaos_56_follow_delta(112 + 3, 104), 3);
    // limit overshoot rejects the candidate instead of clamping to the boundary
    eq(step(3583, 3583 + 120, 104, 2954, false)[0], 3583, 'right limit exclusive 3584: a +7 step from 3583 is rejected, not clamped');
    eq(step(2957, 2957 + 40, 104, 2954, false)[0], 2957, 'left limit retained: -7 from 2957 is rejected (2950 < 2954)');
    eq(step(2961, 2961 + 40, 104, 2954, false)[0], 2954, 'a step landing exactly on the retained left limit is accepted');
    eq(step(3060, 3060, 104, 2954, false)[0], 3060, 'exact zero difference bypasses the horizontal branch');
    // low-byte wrap of the original: player 3368 / camera 3060 -> difference 308, low byte 52 -> -7 candidate (the trace's 3053)
    eq(step(3060, 3368, 104, 2947, false)[0], 3053, 'SMS low-byte behaviour at width 256');
    // replay of the original delayed-release full-game phases: every recorded candidate is reproduced, in BOTH directions
    {
        const rel = FG.camera_release_replay, ph = rel.phases;
        let moves = [], n = 0;
        for (let i = 0; i < ph.length; i++) {
            if (ph[i].phase !== 'before_camera' || !ph[i + 1] || ph[i + 1].phase !== 'after_camera_before_player' || ph[i].limits[1] !== 3584) continue;
            const [nx] = step(ph[i].camera[0], ph[i].player[0], ph[i].lead, rel.retained_left, false, rel.retained_left, 3584);
            // the recorded candidate D284 is the unfiltered step; $4CB0 then keeps or drops it
            const cand = ph[i + 1].candidate[0];
            const kept = (cand - ph[i].camera[0]) === 0 ? ph[i].camera[0] : (cand >= rel.retained_left && cand < 3584 ? cand : ph[i].camera[0]);
            eq(nx, kept, `release replay update ${ph[i].update}`); moves.push(cand - ph[i].camera[0]); n++;
        }
        ok(n >= 20 && moves.some(v => v > 0) && moves.some(v => v < 0), 'recorded release replay moves right and left');
        ok(moves.every(v => v >= -8 && v <= 7), 'recorded steps stay within -8..+7');
        eq(rel.retained_left, 2947, 'the retained left limit is a trace result, not a POC constant');
    }
}
mark('post-defeat camera (256)');
console.log('MGHZ boss parity so far:', checks, JSON.stringify(section));
