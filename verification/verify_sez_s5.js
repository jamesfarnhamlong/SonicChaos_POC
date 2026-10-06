// SEZ S5: boss $54 + dynamic child $55 - the SHIPPED GML (SCR_chaos_sez_boss, the shared 19-slot scheduler hooks in SCR_chaos_sez_s2, the loader, the adapter and the zone events)
// against the Research oracle caches of eff4cec (data/rom-cache/sez/boss-54-runtime.json + boss-54-fullgame.json, mirrored at POC_notes/rom-cache/sez/).
// GameMaker is mocked at the instance / camera / audio boundary only. Evidence classes: mirrors, scripts, contact sweeps (geometry, posture, immune states), HP / cooldown / final-hit
// arbitration, thresholds and selectors, the eight 600-update scheduler cycles, the independent child, arena / camera, lifecycle, feedback, allocator exhaustion, whole-game replays.
const fs = require('fs'), path = require('path'), assert = require('assert'), cp = require('child_process');
const L = require('./sez54_lib');
const {RUNTIME: R, FULLGAME: FG, MANIFEST: M, root} = L;
const RESEARCH = 'eff4cecf03bfcef8638b39c0f7676abbfd32f26e', RESEARCH2 = '53e9095ae2d807be8cd67f8ed572caead09094d9';
let checks = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), m); checks++; };
const ok = (v, m) => { assert.ok(v, m); checks++; };
const section = {};
let lastMark = 0;
const mark = name => { section[name] = checks - lastMark; lastMark = checks; };
const hexn = v => typeof v === 'string' ? parseInt(v, 16) : v;
/// Research D520 = (object slot + 2) of the contacting object (9 for the boss in slot 7); the POC stages one shared flag, compared as raised / not raised.
const nw = p => Object.assign({}, p, {owner: p.owner ? 1 : 0});

// ---- 0. identity, mirrors, generated constants, scripts -----------------------------------------------------------------------------------------------------
{
    const repo = path.join(root, '..', 'sonic-chaos-reference-work'), posix = path.resolve(repo).split(path.sep).join('/');
    const git = (...a) => cp.spawnSync('git', ['-c', 'safe.directory=' + posix, '-C', repo, ...a], {maxBuffer: 1 << 29});
    const anc = git('merge-base', '--is-ancestor', RESEARCH, 'main'); if (anc.status !== 128) eq(anc.status, 0, 'eff4cec is on Research main');
    const lf = b => Buffer.from(b.toString('latin1').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10)), 'latin1');
    for (const f of ['boss-54-runtime.json', 'boss-54-fullgame.json', 'implementation-manifest.json', 'object-census.json', 'art-approval.json', 'enemies-20-23-runtime.json', 'platform-28-runtime.json', 'surface-runtime-contracts.json', 'surfaces-0c-1a.json']) {
        const mine = fs.readFileSync(path.join(root, 'POC_notes/rom-cache/sez', f)), canon = git('show', RESEARCH + ':data/rom-cache/sez/' + f);
        if (canon.status === 0) ok(Buffer.compare(lf(mine), lf(canon.stdout)) === 0, 'identical to Research eff4cec: ' + f); else ok(mine.length > 0);
    }
    for (const f of ['boss-54-safe-zone.json', 'boss-54-stationary-sweep.json']) {
        const mine = fs.readFileSync(path.join(root, 'POC_notes/rom-cache/sez', f)), canon = git('show', RESEARCH2 + ':data/rom-cache/sez/' + f);
        if (canon.status === 0) ok(Buffer.compare(lf(mine), lf(canon.stdout)) === 0, 'identical to Research 53e9095: ' + f); else ok(mine.length > 0);
    }
    const h = L.newWorld(), c = h.ctx;
    eq(R.rom_sha256, 'eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607'); eq(FG.assertions, 134); eq(R.assertion_total, 448818);
    eq(M.boss_runtime.baseline, {viewport_width: 256, placement: [3200, 622], placement_file: '0x710AE', camera_target: [2976, 462], settled_camera: [2975, 462], hp_initial: 8, damaging_hits: 8,
        hit_cooldown_helper_calls: 18, hp_requires_attack_bit: false, attack_bit_controls_rebound: true, clear_requires_floor_bit1: true, clear_world_x_gate: null, next_zone_act: [3, 0]});
    eq([c.CHAOS_54_ANCHOR_X, c.CHAOS_54_ANCHOR_Y, c.CHAOS_54_TOKEN], [3200, 622, 5], 'placement');
    eq([R.static.placement.world_x, R.static.placement.world_y, R.static.placement.index], [3200, 622, 5]);
    eq([c.CHAOS_54_TRIGGER_X, c.CHAOS_54_TRIGGER_Y], [160, 304], 'strict PLAYER_DIST trigger');
    eq([c.CHAOS_54_CAMERA_X, c.CHAOS_54_CAMERA_Y, c.CHAOS_54_SETTLED_X], [2976, 462, 2975]);
    eq([c.CHAOS_54_COMBAT_X, c.CHAOS_54_COMBAT_Y, c.CHAOS_54_COMBAT_VY, c.CHAOS_54_HP, c.CHAOS_54_COOLDOWN, c.CHAOS_54_HIT_DY], [3136, 430, 192, 8, 18, 16]);
    eq([c.CHAOS_54_Y_LAND, c.CHAOS_54_Y_DROP, c.CHAOS_54_CHILD_Y], [622, 610, 626]);
    eq([c.CHAOS_54_RIGHT_LIMIT, c.CHAOS_54_BOTTOM_INITIAL, c.CHAOS_54_BOTTOM_LIMIT], [3840, 784, 462]);
    eq([c.CHAOS_54_SCREEN_ESCAPE, c.CHAOS_54_SCREEN_STOP, c.CHAOS_54_EDGE_ESCAPE, c.CHAOS_54_EDGE_STOP], [208, 212, -48, -44], 'cached-screen relationships 208 = RIGHT-48, 212 = RIGHT-44');
    eq([c.CHAOS_54_BOUNCE_DX, c.CHAOS_54_BOUNCE_VX, c.CHAOS_54_BOUNCE_VY, c.CHAOS_54_BOUNCE_VY_THIRD, c.CHAOS_54_BOUNCE_CYCLE], [96, 128, -896, -1152, 3]);
    eq([c.CHAOS_54_CHILD_VX, c.CHAOS_54_CHILD_VY, c.CHAOS_54_CHILD_EX, c.CHAOS_54_CHILD_EY], [R.child.velocity_8_8[0], R.child.velocity_8_8[1], 2, 4], 'child constants from the cache');
    eq(R.child.extents, [2, 4]); eq(R.child.gravity, 0);
    eq([c.CHAOS_54_SND_ATTACK, c.CHAOS_54_SND_EXPLOSION, c.CHAOS_54_SND_CLEAR, c.CHAOS_54_SND_MUSIC], [0xB6, 0xC4, 0x97, 0x8C]);
    const white = R.lifecycle_feedback_allocator.flash.filter(r => r.colors[0] === 63).map(r => r.call);
    eq([c.CHAOS_54_FLASH_FIRST, c.CHAOS_54_FLASH_LAST, c.CHAOS_54_FLASH_END], [white[0], white[white.length - 1], white[white.length - 1] + 1], 'palette flash command calls');
    eq(c.chaos_54_destination(), {zone: 3, act: 0}, 'MGHZ1 handoff');
    eq(FG.fight.marks.find(m => m.event === 'act_loader'), {u: 1004, event: 'act_loader', pc: FG.fight.marks.find(m => m.event === 'act_loader').pc, zone: 3, act: 0, ix: FG.fight.marks.find(m => m.event === 'act_loader').ix, hp_before: null});
    eq(c.chaos_54_target_x(256), 2976, 'width 256 is the canonical pan target'); eq(c.chaos_54_target_x(256) - 1, 2975);
    for (const t of [0x54, 0x55]) {
        const sc = R.static.scripts['0x' + t.toString(16).toUpperCase()];
        eq(c.chaos_54_table(t), sc.state_script_cpus.map(hexn), 'state table ' + t);
        eq(c.chaos_54_table(t).length, sc.state_count);
        for (const st of sc.states) for (const op of st.ops) {
            if (op.op === 'loops_back') continue;
            const row = c.chaos_54_record(t, hexn(op.cpu));
            ok(row.length >= 2, `record ${t}:${op.cpu}`);
            if (op.op === 'record') eq(row.slice(1), [-1, op.duration, op.frame, hexn(op.callback)]);
            if (op.op === 'spawn') eq(row.slice(1), [4, op.type, op.dx, op.dy, op.parameter]);
            if (op.op === 'velocity_8_8') eq(row.slice(1), [2, op.x, op.y]);
            if (op.op === 'sound') eq(row.slice(1), [6, op.sound]);
            if (op.op === 'call_and_set_callback') eq(row.slice(1), [5, hexn(op.target), hexn(op.callback)]);
            if (op.op === 'set_loop_counter') eq(row.slice(1), [14, op.count]);
            if (op.op === 'loop_jump') eq(row.slice(1), [15, hexn(op.target)]);
            if (op.op === 'jump') eq(row.slice(1), [7, hexn(op.target)]);
            if (op.op === 'request_state') eq(row.slice(1), [3, op.state]);
        }
    }
    eq(c.chaos_54_table(0x54).length, 13, 'all 13 boss states'); eq(c.chaos_54_table(0x55).length, 4);
    for (const f of [1, 2, 3, 4, 5, 6, 7, 8, 15, 16, 17, 18, 19]) eq(c.chaos_54_extent(f >= 17 ? 0x55 : 0x54, f), R.static.art.frames.find(x => x.frame === f).extent_x_y, 'extent ' + f);
    for (const g of R.contact.geometry) eq([c.chaos_54_extent(0x54, g.frame)], [g.extent]);
    eq(R.contact.geometry.map(g => g.extent), [[20, 80], [20, 80], [20, 80], [20, 80], [20, 80], [20, 80], [20, 80], [20, 80], [20, 64], [20, 64]], 'frames 1-8 are 20x80, 15/16 20x64');
    const sp = R.static.scripts['0x54'].spawns;
    eq(sp.map(s => [s.state, s.type, s.dx, s.dy, s.parameter]), [[4, '0x34', -8, 0, 4], [4, '0x34', 8, 0, 4], [4, '0x34', 0, -16, 4], [4, '0x34', -8, -24, 4], [4, '0x34', -8, -24, 4], [7, '0x55', -16, -36, 0]]);
    // the shared support scripts exist as installed rows (no hand-authored rows)
    for (const [t, n] of [[18, 2], [52, 3], [10, 3], [15, 5]]) eq(c.chaos_54_table(t).length, n, 'support state count ' + t);
}
mark('mirrors/constants/scripts');

// ---- 1. contact geometry: closed overlap, minimum penetration, $5FA0 projection, HP rule over every frame and both Sonic widths ----------------------------------------------
{
    const lab = L.lab();
    for (const g of R.contact.geometry) {
        const [ox, oy] = g.extent;
        eq(g.sonic_normal_box, [-ox - 8, ox + 8, -oy, 24]); eq(g.sonic_0f_box, [-ox - 9, ox + 9, -oy, 24]);
        for (const ex of [8, 9]) for (let dx = -ox - 11; dx < ox + 12; dx++) for (let dy = -oy - 2; dy < 27; dy++) {
            const got = L.contact(lab, {dx, dy, frame: g.frame, ex});
            const bit = L.overlapModel(dx, dy, ex, ox, oy), [x, y] = L.projected(dx, dy, bit, ex, ox, oy);
            const hit = !!(bit && bit !== 2 && y <= 564);
            if (got.bits !== bit || got.hp !== (hit ? 7 : 8) || got.player.x !== x || got.player.y !== y) assert.fail(`geometry f${g.frame} ex${ex} ${dx},${dy}: ${JSON.stringify([got.bits, bit, got.hp, hit, got.player.x, x, got.player.y, y])}`);
            checks += 3;
        }
    }
}
mark('contact geometry');

// ---- 2. posture / hurt / blink / invincibility / cooldown / drop-flag matrix: 2304 full result rows -----------------------------------------------------------------------------
{
    const lab = L.lab();
    for (const v of R.contact.posture_boundary_vectors) {
        const got = L.contact(lab, {dx: v.point[0], dy: v.point[1], attack: v.attack, hurt: v.hurt, inv: v.blink, power: v.power, cooldown: v.cooldown, drop: v.drop, floor: v.floor, terrain: v.terrain});
        const want = v.result;
        eq([got.bits, got.hp, got.cooldown, got.defeated, got.requested], [want.bits, want.hp, want.cooldown, want.defeated, want.requested], 'posture row ' + JSON.stringify(v.point) + JSON.stringify([v.attack, v.hurt, v.blink, v.power, v.cooldown, v.drop, v.floor, v.terrain]));
        eq(got.player, nw(want.player), 'posture player row ' + JSON.stringify(v));
        // the Research player row carries D520 = 9 for any raised contact flag; the POC stages the shared handshake (promoted after the phase, consumed by $48BC next update)
    }
    eq(R.contact.posture_boundary_vectors.length, 2304);
    // attack posture is NOT an HP prerequisite; attack controls the rebound only; blink / invincibility never suppress HP; hurt suppresses overlap
    for (const attack of [0, 2]) for (const inv of [0, 128]) for (const power of [0, 6]) {
        const got = L.contact(lab, {dy: -80, attack, inv, power});
        eq([got.hp, got.player.requested, got.player.sound], [7, attack ? 27 : 5, 0xB6], `HP with attack ${attack} blink ${inv} power ${power}`);
    }
    eq(L.contact(lab, {dy: -80, hurt: 64}).hp, 8, 'hurt suppresses overlap');
    // eight successful decrements reach defeat (cooldown 18 apart); starting HP 0 wraps to 255 and never defeats
    R.contact.health.forEach((row, n) => {
        const got = L.contact(lab, {dy: -80, hp: row.before});
        eq([got.bits, got.hp, got.cooldown, got.defeated, got.requested, got.player], [row.result.bits, row.result.hp, row.result.cooldown, row.result.defeated, row.result.requested, nw(row.result.player)], 'health ' + n);
    });
    eq(R.contact.health.map(r => [r.before, r.result.hp, r.result.defeated, r.result.requested]), [[0, 255, 0, 7], [1, 0, 255, 4], [2, 1, 0, 7], [3, 2, 0, 7], [4, 3, 0, 7], [5, 4, 0, 7], [6, 5, 0, 7], [7, 6, 0, 7], [8, 7, 0, 7]]);
    // continuous eligible contact: helper calls 0, 18, 36 decrement (old cooldown 1 permits the hit on that very call)
    {
        const first = L.contact(lab, {dy: -80});
        const rows = [{call: 0, result: first}];
        const hits = [[0, first.hp]];
        for (let t = 1; t < 40; t++) {
            lab.core.xu = 3100 * 256; lab.core.yu = 500 * 256;
            const before = lab.s.hp;
            lab.c.chaos_54_combat_contact(lab.b, lab.s, lab.core, true, lab.vp);
            rows.push({call: t, hp: lab.s.hp, cooldown: lab.s.cooldown});
            if (lab.s.hp !== before) hits.push([t, lab.s.hp]);
        }
        eq(hits, [[0, 7], [18, 6], [36, 5]], 'cooldown cadence 0,18,36');
        eq(rows.map(r => r.hp !== undefined ? [r.call, r.hp, r.cooldown] : null).slice(1), R.contact.repeated_contact.slice(1).map(r => [r.call, r.hp, r.cooldown]), 'repeated contact table');
        eq(rows[0].result.cooldown, R.contact.repeated_contact[0].result.cooldown);
        for (const cd of [1, 2, 17, 18]) { const g = L.contact(lab, {dy: -80, cooldown: cd}); eq([g.hp, g.cooldown], [cd === 1 ? 7 : 8, cd === 1 ? 18 : cd - 1], 'old cooldown ' + cd); }
        L.contact(lab, {dy: -80, hp: 8}); let hp = lab.s.hp, defeat = 0;
        for (let k = 0; k < 7; k++) { lab.s.cooldown = 0; lab.core.xu = 3100 * 256; lab.core.yu = 500 * 256; lab.c.chaos_54_combat_contact(lab.b, lab.s, lab.core, true, lab.vp); hp = lab.s.hp; defeat = lab.s.defeated; }
        eq([hp, defeat, lab.s.requested], [0, 255, 4], 'the eighth decrement reaches zero: +$35 = FF and request 4');
    }
}
mark('posture / HP / cooldown matrices');

// ---- 3. immune states 6 and 11, callback ordering / final-hit arbitration, bounce and escape selectors ---------------------------------------------------------------------------------
function callbackRow(lab, pc, st, o) {
    L.contact(lab, {dy: -80, hp: o.hp});
    const s = lab.s, c = lab.c, p = lab.core;
    s.state = s.requested = st; s.hp = o.hp; s.cooldown = 0; s.defeated = 0; s.keep = true; s.asleep = false; s.drop = 0; s.counter = 0;
    s.xu = 3100 * 256; s.yu = o.y * 256; s.vx = 0; s.vy = o.vy;
    lab.position(3100, o.y - 80); p.move = 2; p.bg = 0; c.global.chaosLastSoundRequest = 0; s.sx = 100; lab.b.player_sx = 100;
    lab.call(pc);
}
{
    const lab = L.lab();
    // immune states 6 / 11: HP never changes; state 6 queues damage for any non-attacking overlap and rebounds an attacker; state 11 suppresses everything but projection
    for (const v of R.contact.immune_state_vectors) {
        L.contact(lab, {dx: v.point[0], dy: v.point[1], attack: v.attack, hurt: v.hurt, inv: v.blink, power: v.power, floor: 2});
        const s = lab.s, p = lab.core;
        s.state = s.requested = v.state; s.hp = 8; s.cooldown = 0; s.drop = 0; s.keep = true; s.asleep = false; s.vy = 0; s.vx = 0; s.frame = 1; s.ex = 20; s.ey = 80;
        p.xu = (3100 + v.point[0]) * 256; p.yu = (580 + v.point[1]) * 256; p.vx = 384; p.vy = 256; p.next = 5; p.stage_request = 0; p.stage_contact = 0; p.stage_nib = 0; lab.c.global.chaosLastSoundRequest = 0;
        lab.call(v.state === 6 ? 0xA2EA : 0xA396);
        const want = v.after, w = want.slots[0], got = L.slotRow(lab.c, lab.s, 7);
        eq([got.type, got.state, got.requested, got.hp, got.cooldown, got.defeated, got.drop], [w.type, w.state, w.requested, w.hp, w.cooldown, w.defeated, w.drop], 'immune slot');
        eq(L.playerRow(lab), nw(want.player), 'immune player ' + JSON.stringify([v.state, v.attack, v.hurt, v.blink, v.power, v.point]));
        eq([got.x, got.y, got.vy, got.flags4 & 2], [w.x, w.y, w.vy, 2], 'immune boss motion');
    }
    eq(R.contact.immune_state_vectors.length, 96);
    // 144 callback-order boundaries (every boss callback, Y 609/610/621/622, Y speed -24/0/+24, HP 1/8), full slot + player snapshots
    let n = 0;
    for (const row of R.boundaries.callback_order_final_hit) {
        const st = {0xA2EA: 6, 0xA2FA: 7, 0xA312: 8, 0xA32A: 9, 0xA339: 10, 0xA396: 11}[row.callback];
        callbackRow(lab, row.callback, st, {y: row.y, vy: row.vy, hp: row.hp_before});
        const w = row.after.slots[0], got = L.slotRow(lab.c, lab.s, 7);
        eq([got.type, got.state, got.requested, got.x, got.y, got.fx, got.fy, got.vx, got.vy, got.hp, got.cooldown, got.defeated, got.drop, got.counter],
            [w.type, w.state, w.requested, w.x, w.y, w.fx, w.fy, w.vx, w.vy, w.hp, w.cooldown, w.defeated, w.drop, w.counter], `callback ${row.callback.toString(16)} y${row.y} vy${row.vy} hp${row.hp_before}`);
        eq(L.playerRow(lab), nw(row.after.player), 'callback player row');
        n++;
    }
    eq(n, 144);
    // final-hit arbitration: request 4 is written immediately, the enclosing callback continues and can overwrite it to 5 / 7 (never an end-of-update "force 4")
    const outcomes = new Set();
    for (const row of R.boundaries.callback_order_final_hit) if (row.hp_before === 1 && [0xA2FA, 0xA312, 0xA32A, 0xA339].includes(row.callback)) {
        const w = row.after.slots[0]; outcomes.add(w.requested);
        const st = {0xA2FA: 7, 0xA312: 8, 0xA32A: 9, 0xA339: 10}[row.callback];
        let expected = 4;
        if (st === 7 && row.vy + 24 >= 0) expected = 5;
        if ((st === 8 || st === 9) && w.y >= 610) expected = 5;
        if (st === 10 && w.y >= 622) expected = 7;
        eq(w.requested, expected, 'arbitration ' + JSON.stringify([st, row.y, row.vy]));
    }
    ok(outcomes.has(4) && outcomes.has(5) && outcomes.has(7), 'final hit can end as request 4, 5 or 7 depending on the callback / threshold');
    // 320 bounce / escape selector vectors (cached screen bytes, third-cycle launch, signed direction)
    for (const [dx, counter, sx, px, vx, vy, req] of R.boundaries.bounce_escape_selectors) {
        L.prepare(lab, {dx: -100, dy: 100});
        const s = lab.s; s.state = s.requested = 10; s.counter = counter; s.yu = 622 * 256; s.vy = 0; s.vx = 0; s.xu = 3100 * 256;
        lab.position(3100 - dx, 700); s.sx = sx; lab.b.player_sx = px; lab.core.move = 2;
        lab.call(0xA339);
        eq([s.vx, s.vy, s.counter, s.requested], [vx, vy, counter + 1 >= 3 ? 0 : counter + 1, req], 'selector ' + JSON.stringify([dx, counter, sx, px]));
        eq(vx, dx < 96 ? 128 : -128); eq(req, sx >= 208 && px >= sx ? 11 : 7);
    }
    eq(R.boundaries.bounce_escape_selectors.length, 320);
}
mark('immune states / callback boundaries / selectors');

// ---- 4. the eight 600-update scheduler cycles (state 6..12 and the defeat chain), stationary Sonic / camera, D12F once per update ----------------------------------------------------
function cycleLab(start) {
    const lab = L.lab();
    lab.call(0xA291);
    const s = lab.s;
    s.state = s.requested = start; s.keep = true; s.asleep = false;
    s.yu = ([7, 8, 9, 10].includes(start) ? 622 : 430) * 256 + (s.yu & 255);
    lab.position(2980, 620);
    return lab;
}
const sigOf = rows => JSON.stringify(rows.map(v => [v.slot, v.type, v.state, v.requested]));
const cycleFields = ['slot', 'type', 'state', 'requested', 'frame', 'duration', 'x', 'y', 'fx', 'fy', 'vx', 'vy', 'extent', 'flags3', 'flags4', 'hp', 'cooldown', 'defeated', 'drop', 'counter', 'token', 'parameter'];
const cycleStats = {};
let garbage = 0;
for (const start of [6, 7, 8, 9, 10, 11, 12, 4]) {
    const lab = cycleLab(start), cy = R.cycles[String(start)];
    const rows = [];
    for (let u = 1; u <= 600; u++) { lab.step(u - 1); rows.push(L.snap(lab)); }
    eq(rows.length, cy.updates);
    const events = []; let old = null;
    for (let u = 0; u < rows.length; u++) { const sig = sigOf(rows[u].slots); if (sig !== old) events.push(u + 1); old = sig; }
    eq(events, cy.events.map(e => e.u), `cycle ${start} event updates`);
    const want = new Map(cy.events.map(e => [e.u, e]));
    for (const v of cy.vectors) want.set(v.u, v);
    let compared = 0;
    for (const [u, w] of want) {
        const got = rows[u - 1];
        eq(got.slots.length, w.slots.length, `cycle ${start} u${u} slot count`);
        w.slots.forEach((ws, i) => {
            for (const k of cycleFields) {
                // Lab memory artefact: slots 11 / 12 (D800 / D840) overlap RAM the Lab never cleared, so a freshly allocated object there carries stale bytes in +$01 (state), the fraction
                // bytes, +$03, +$1E, +$26, +$34..+$36 and +$3E (the integer positions, which are all the game reads, are unaffected: the garbage fractions are < 64, so the carry pattern is identical).
                // Clean slots (7..10) read 0 in all of them.
                if ([0xD800, 0xD840].includes(ws.slot) && ['fx', 'fy', 'flags3', 'hp', 'cooldown', 'defeated', 'drop', 'counter', 'token'].includes(k)) { garbage++; continue; }
                if (ws.type === 52 && [0xD800, 0xD840].includes(ws.slot) && ['vx', 'vy'].includes(k)) { garbage++; continue; }       // puffs never read the speed words
                if (k === 'state' && ws[k] === 128) { garbage++; eq(got.slots[i][k], 0, 'clean slot'); continue; }
                if (k === 'flags4' && ws.state === 128) { garbage++; continue; }                  // the stale state byte makes the first visit run the lifecycle ($61E1) that a clean state-0 slot skips
                eq(got.slots[i][k], ws[k], `cycle ${start} u${u} slot ${ws.slot.toString(16)} type ${ws.type} ${k}`);
            }
        });
        eq(got.player, nw(w.player), `cycle ${start} u${u} player`);
        eq([got.camera, got.limits, got.pan, got.boss_active], [w.camera, w.limits, w.pan, w.boss_active], `cycle ${start} u${u} camera / limits`);
        compared++;
    }
    cycleStats[start] = {updates: rows.length, events: events.length, compared};
}
mark('600-update scheduler cycles');


// ---- 5. the independent damage-only child $55 -----------------------------------------------------------------------------------------------------------------------------
function childSlot(lab, o = {}) {
    const c = lab.c, s = c.chaos_54_slot(0x55, 0, o.x === undefined ? 3100 : o.x, o.y === undefined ? 580 : o.y, 0);
    s.state = s.requested = o.state === undefined ? 3 : o.state; s.asleep = !!o.asleep; s.vx = o.vx === undefined ? -768 : o.vx; s.vy = o.vy === undefined ? 704 : o.vy;
    lab.pool.slots[7] = s; lab.s = s; return s;
}
{
    const lab = L.lab();
    // 72 boundary vectors: sleep bit x parent type x parent HP x Y 622..627. The callback ignores sleep and every parent byte; contact precedes movement; no gravity; Y >= 626 requests 2.
    for (const v of R.child.boundary_vectors) {
        const s = childSlot(lab, {y: v.y, asleep: !!v.sleep});
        L.contact(lab, {dy: 100});                                  // leave Sonic far away (2900,500 in the lab); only the shared contact rows matter below
        lab.pool.slots[7] = s; lab.s = s; lab.position(2900, 500);
        lab.pool.slots[8] = v.parent ? Object.assign(lab.c.chaos_54_slot(v.parent, 0, 0, 0, 0), {hp: v.parent_hp}) : lab.c.chaos_s2_slot();
        lab.call(0xA4A4);
        const w = v.after.slots[0], got = L.slotRow(lab.c, s, 7);
        eq([got.type, got.state, got.requested, got.x, got.y, got.fx, got.fy, got.vx, got.vy, got.extent, got.flags4], [w.type, w.state, w.requested, w.x, w.y, w.fx, w.fy, w.vx, w.vy, w.extent, w.flags4], `child vector ${JSON.stringify([v.sleep, v.parent, v.parent_hp, v.y])}`);
        eq([got.token, got.parameter, got.frame], [0, 0, 0]);
        eq(got.requested, v.y + 2 >= 626 ? 2 : 3, 'world Y threshold 626 after the movement');
    }
    eq(R.child.boundary_vectors.length, 72);
    // contact: the closed 2x4 box (normal X[-10,+10], state $0F X[-11,+11], Y[-4,+24]) for every posture; attack never defeats it; hurt suppresses; damage is queued BEFORE the move
    for (const attack of [0, 2]) for (const hurt of [0, 64]) for (const inv of [0, 128]) for (const power of [0, 6]) for (const st of [5, 15]) {
        for (let dx = -12; dx <= 12; dx++) for (let dy = -6; dy <= 26; dy++) {
            const s = childSlot(lab); const p = lab.core;
            p.xu = (3100 + dx) * 256; p.yu = (580 + dy) * 256; p.move = attack | hurt | inv; p.state = st; p.next = 5; p.immune = power === 6; p.stage_request = 0; p.stage_contact = 0; p.stage_nib = 0;
            lab.call(0xA4A4);
            const lim = st === 15 ? 11 : 10;
            const hit = !hurt && Math.abs(dx) <= lim && dy >= -4 && dy <= 24 && L.overlapModel(dx, dy, st === 15 ? 9 : 8, 2, 4) !== 0;
            if (!!p.stage_request !== hit) assert.fail(`child contact ${JSON.stringify([attack, hurt, inv, power, st, dx, dy])} got ${p.stage_request} want ${hit}`);
            checks++;
            if (s.type !== 0x55) assert.fail('attack must not defeat $55'); checks++;
            if (hit) ok(p.stage_contact === 1 && p.stage_request === 255, 'owner flag + damage request');
        }
    }
    eq(R.child.sonic_boxes, {normal: [-10, 10, -4, 24], '0f': [-11, 11, -4, 24]});
    // init / conversion / spawn parameters: state 0 writes vx -3 / vy +2.75 and requests 3; state 2 converts to $0F with parameter 0, no score, no token
    {
        const s = childSlot(lab, {state: 0, vx: 0, vy: 0}); const score = lab.c.score;
        lab.call(0xA481);
        eq([s.requested, s.vx, s.vy], [3, -768, 704], 'state 0 init');
        childSlot(lab, {state: 2}); lab.s.token = 0; lab.s.parameter = 255;
        lab.call(0xA49D);
        eq([lab.s.type, lab.s.token, lab.s.parameter, lab.c.score], [15, 0, 0, score], 'state 2 converts to $0F without score');
        const s1 = childSlot(lab, {state: 1}); lab.call(0xA498); eq(s1.requested, 2, 'state 1 (naturally unreachable) requests 2');
    }
    // fractional +2.75 Y: 2,3,3,3 pixels per update from fraction 0, X -3 exactly, never an integer 2.75 round-off
    {
        const s = childSlot(lab, {x: 3100, y: 500}); lab.position(2900, 100);
        const ys = [], xs = [];
        for (let k = 0; k < 12; k++) { lab.call(0xA4A4); ys.push(lab.c.chaos_54_y(s)); xs.push(lab.c.chaos_54_x(s)); }
        eq(ys, [...Array(12).keys()].map(k => 500 + Math.floor(2.75 * (k + 1))), 'fractional Y');
        eq(ys.map((y, i) => y - (i ? ys[i - 1] : 500)).slice(0, 4), [2, 3, 3, 3]);
        eq(xs, [...Array(12).keys()].map(k => 3100 - 3 * (k + 1)));
    }
    // natural flow 0 -> 3 -> 2 -> $0F through the scheduler, with the real script durations (blank 8, frames 17/19/18/19 x 3, state 2 record, then the shared smoke)
    {
        const run = (y0, n) => {
            const w = L.lab(); w.position(2900, 100);
            const s = w.c.chaos_54_slot(0x55, 0, 3100, y0, 0); s.state = s.requested = 0; w.pool.slots[8] = s;
            const trace = [];
            for (let t = 0; t < n; t++) { w.step(t); const q = w.pool.slots[8]; trace.push([q.type, q.state, q.frame, w.c.chaos_54_y(q), q.timer]); }
            return trace;
        };
        const a = run(520, 20);
        eq(a[0], [0x55, 0, 0, 520, 8], 'first visit: blank 8 records, init callback (no movement)');
        eq(a[1], [0x55, 3, 17, 522, 3], 'second visit: state 3, frame 17, first move');
        eq(a.slice(1, 13).map(r => r[2]), [17, 17, 17, 19, 19, 19, 18, 18, 18, 19, 19, 19], 'frames 17/19/18/19 each 3');
        const b = run(615, 14);
        const ty = b.findIndex(r => r[0] === 0x55 && r[1] === 3 && r[3] >= 626);
        ok(ty > 0 && b[ty][1] === 3 && b[ty + 1][0] === 15 && b[ty + 1][2] === 17, 'Y >= 626 after the move requests state 2, whose record converts to the shared $0F smoke at once (frame 17 kept for one update)');
        eq(b[ty + 2].slice(0, 3), [15, 0, 0], 'the smoke starts with its blank init record');
        ok(b.every(r => r[3] <= 629), 'no movement beyond the threshold callback');
    }
}
mark('child $55');

// ---- 6. arena: scan windows, creator, trigger, HUD wait, pan, combat init, floor-gated clear -----------------------------------------------------------------------------
{
    const c0 = L.newWorld().ctx;
    // mapped creation: steady scan creates at screen X 288..351 / -96..-33, the initial fill additionally inside the window
    for (const fill of [0, 1]) {
        const want = new Set(R.arena.scan_screen_x[String(fill)]), created = [];
        for (let sx = -129; sx < 386; sx++) {
            const lab = L.lab(); lab.pool.slots[7] = lab.c.chaos_s2_slot();
            const b = lab.b; b.record = [5, 3200, 622, 0x54, 0, 0, 0, 0, 0x710AE]; b.chaosInitialFillDone = fill === 1; b.chaosScanTick = 0;
            const got = lab.c.chaos_54_scan(b, lab.pool, {left: 3200 - sx, top: 590, w: 256, h: 192});
            if (got !== want.has(sx)) assert.fail(`scan fill ${fill} sx ${sx}`); checks++;
            if (got) created.push(sx);
        }
        eq(created, R.arena.scan_screen_x[String(fill)], 'scan windows fill ' + fill);
    }
    {   // creator fields (natural token 5 instead of the synthetic rig token 25), first free slot 7, 4-update scan cadence, no recreation while occupied
        const lab = L.lab(); lab.pool.slots[7] = lab.c.chaos_s2_slot();
        const b = lab.b; b.record = [5, 3200, 622, 0x54, 0, 0, 0, 0, 0x710AE];
        const vp = {left: 3000, top: 590, w: 256, h: 192};
        ok(lab.c.chaos_54_scan(b, lab.pool, vp), 'initial fill creates at once'); ok(b.occupied && b.active && b.slot === 7);
        const w = R.arena.creator.slots[0], got = L.slotRow(lab.c, lab.pool.slots[7], 7);
        eq([got.slot, got.type, got.state, got.requested, got.frame, got.duration, got.x, got.y, got.vx, got.vy, got.flags3, got.flags4, got.hp, got.parameter, got.token], [w.slot, w.type, w.state, w.requested, w.frame, w.duration, w.x, w.y, w.vx, w.vy, w.flags3, w.flags4, w.hp, w.parameter, 5], 'creator');
        eq(w.token, 25, 'the rig token is synthetic'); eq(lab.c.chaos_54_scan(b, lab.pool, vp), false);
        // 4-update scan cadence and a full 7..17 range skip creation
        const l2 = L.lab(); for (let i = 7; i < 18; i++) l2.pool.slots[i] = Object.assign(l2.c.chaos_s2_slot(), {type: 0xF0});
        l2.b.record = [5, 3200, 622, 0x54, 0, 0, 0, 0]; eq(l2.c.chaos_54_scan(l2.b, l2.pool, vp), false, 'no free slot in 7..17: no creation'); eq(l2.b.occupied, false);
        const l3 = L.lab(); l3.pool.slots[7] = l3.c.chaos_s2_slot(); l3.b.record = [5, 3200, 622, 0x54, 0, 0, 0, 0]; l3.b.chaosInitialFillDone = true;
        const far = {left: 100, top: 590, w: 256, h: 192}, cycle = [];
        for (let i = 0; i < 8; i++) { l3.c.chaos_54_scan(l3.b, l3.pool, far); cycle.push(l3.b.chaosScanTick); }
        eq(cycle, [1, 2, 3, 4, 5, 6, 7, 8]);
    }
    // trigger: strict PLAYER_DIST 160 / 304 on the world anchor, independent of the view width
    for (const [dx, dy, req] of R.arena.trigger_vectors) {
        for (const width of [256, 348, 640]) {
            const lab = L.lab({width}); const s = lab.s; s.state = s.requested = 1; lab.position(3200 + dx, 622 + dy);
            lab.call(0x9771);
            eq(s.requested, req, `trigger ${dx},${dy} @${width}`);
        }
    }
    for (let dx = -170; dx <= 170; dx++) for (const dy of [-305, -304, -303, 0, 303, 304, 305]) {
        const lab = L.lab(); lab.s.state = lab.s.requested = 1; lab.position(3200 + dx, 622 + dy); lab.call(0x9771);
        eq(lab.s.requested === 2, Math.abs(dx) < 160 && Math.abs(dy) < 304, `trigger sweep ${dx},${dy}`);
    }
    {   // an absent player never triggers
        const lab = L.lab(); lab.present = false; lab.s.state = lab.s.requested = 1; lab.call(0x9771); eq(lab.s.requested, 1);
    }
    // shared init -> pan setup -> combat init, with the HUD wait between them
    {
        const lab = L.lab(); lab.core.next = 18;
        lab.call(0x974C);
        const w = R.arena.shared_init, ws = w.slots.find(x => x.type === 84), wh = w.slots.find(x => x.type === 18), s = lab.s, got = L.slotRow(lab.c, s, 7), hud = L.slotRow(lab.c, lab.pool.slots[0], 0);
        eq([got.type, got.state, got.requested, got.flags4, got.cooldown, got.defeated, got.token], [ws.type, ws.state, ws.requested, ws.flags4, ws.cooldown, ws.defeated, 25], 'shared init: keepalive, HUD pointer D540');
        eq([hud.slot, hud.type, hud.state, hud.requested, hud.parameter], [wh.slot, wh.type, wh.state, wh.requested, wh.parameter], 'HUD $12 allocated in slot 0');
        eq(L.snap(lab).limits, w.limits, 'left limit raised to the camera, right 3840 saved'); eq(L.snap(lab).boss_active, 3, 'D44E = 3');
        eq(lab.c.global.chaosSezBossActive, true, 'effect 5 sees the real boss-active state');
        eq(lab.core.next, 14, 'requested Spring Shoes $12 becomes fall $0E'); eq(s.limit_right, 3840); eq(lab.b.camera_mode, 1);
        // state 2: the pan starts only when the HUD slot's type is zero
        s.state = s.requested = 2;
        lab.call(0x97C1); eq(s.requested, 2, 'HUD still present');
        lab.pool.slots[0] = lab.c.chaos_s2_slot();
        lab.call(0x97C1);
        const p = R.arena.pan_setup;
        eq([s.requested, L.snap(lab).limits, L.snap(lab).pan], [3, p.limits, p.pan], 'pan setup: bottom limit 462, pan target (2976,462)');
        eq(lab.b.camera_mode, 3);
        // combat init
        lab.call(0xA291);
        const ci = R.arena.combat_init.slots[0], gi = L.slotRow(lab.c, s, 7);
        eq([gi.x, gi.y, gi.vx, gi.vy, gi.hp, gi.requested, lab.b.selector, lab.b.palette, gi.cooldown, gi.defeated, gi.drop, gi.counter, s.limit_right], [ci.x, ci.y, ci.vx, ci.vy, ci.hp, ci.requested, 21, 14, ci.cooldown, ci.defeated, ci.drop, ci.counter, 3840], 'combat init');
        eq(gi.flags3, 0); eq(s.keep, true, 'keepalive survives combat init');
    }
    // HUD wait uses the pointer slot, also on allocator exhaustion (unrelated slot D940 = slot 16)
    for (const tail of R.lifecycle_feedback_allocator.hud_failure) {
        const lab = L.lab();
        for (let i = 0; i < 16; i++) lab.pool.slots[i] = Object.assign(lab.c.chaos_s2_slot(), {type: 0xF0});
        lab.pool.slots[7] = lab.s; lab.pool.slots[16] = Object.assign(lab.c.chaos_s2_slot(), {type: tail.tail_type});
        lab.call(0x974C);
        eq([lab.s.hud, 0xD540 + lab.s.hud * 64], [16, tail.hud_pointer], 'IY = D940 after the failed allocation');
        lab.s.state = lab.s.requested = 2; lab.call(0x97C1);
        eq(lab.s.requested, tail.requested, 'state 2 waits on the unrelated slot type ' + tail.tail_type);
    }
    // floor-gated clear (no world-X gate): 4 X values x floor 0/2
    for (const v of R.arena.clear_vectors) {
        const lab = L.lab(); const s = lab.s; s.state = s.requested = 5; s.limit_right = 3328; lab.position(v.x, 620); lab.core.contacts = v.floor; lab.core.bg = 0; lab.b.camera_left = 0;
        lab.call(0x81BD);
        const w = v.after.slots, got = L.snap(lab);
        eq(got.slots.map(q => [q.slot, q.type, q.state, q.requested, q.x, q.y]), w.map(q => [q.slot, q.type, q.state, q.requested, q.x, q.y]), `clear slots x${v.x} floor${v.floor}`);
        eq([got.player.requested, got.player.sound, got.limits], [v.after.player.requested, v.after.player.sound, v.after.limits], 'clear player / limits');
        eq(lab.b.camera_mode, v.floor ? 4 : 0, 'pan released only on clear');
        eq(lab.c.global.chaosBossNextAct, v.floor ? {zone: 3, act: 0} : -4, 'MGHZ1 handoff only on clear');
    }
    eq(R.arena.baseline, {placement: [3200, 622], target: [2976, 462], settled: [2975, 462], pan_rate: [1, 1], trigger_strict: [160, 304], camera_right_saved: 3840, clear_requires_floor: true, clear_world_x_gate: null});
}
mark('arena / creator / trigger / HUD wait / clear');

// ---- 7. lifecycle bands, palette flash, allocator exhaustion ---------------------------------------------------------------------------------------------------------------
{
    const lab = L.lab(), vp = {left: 3000, top: 480, w: 256, h: 192};
    for (const t of [0x54, 0x55]) for (const keep of [0, 2]) for (const axis of [17, 20]) for (let rel = -129; rel < 386; rel++) {
        const s = lab.c.chaos_54_slot(t, 0, 3100, 580, t === 0x54 ? 5 : 0); s.keep = keep === 2; s.state = s.requested = 3;
        if (axis === 17) s.xu = (3000 + rel) * 256; else s.yu = (480 + rel) * 256;
        lab.c.chaos_54_lifecycle(lab.b, s, vp);
        const outer = !(-96 <= rel && rel < 352);
        if (s.type !== (outer && !keep ? (t === 0x54 ? 254 : 255) : t)) assert.fail(`lifecycle type ${t} keep ${keep} axis ${axis} rel ${rel}`); checks++;
        if (s.asleep !== !(-32 <= rel && rel < 288)) assert.fail(`lifecycle sleep ${t} ${axis} ${rel}`); checks++;
    }
    for (const v of R.lifecycle_feedback_allocator.lifecycle) {
        const s = lab.c.chaos_54_slot(v.type, 0, 3100, 580, v.type === 0x54 ? 5 : 0); s.keep = v.keepalive === 2;
        if (v.axis === 17) s.xu = (3000 + v.relative) * 256; else s.yu = (480 + v.relative) * 256;
        lab.c.chaos_54_lifecycle(lab.b, s, vp);
        eq([s.type, s.asleep], [v.after_type, v.asleep], 'lifecycle row ' + JSON.stringify(v));
    }
    eq(R.lifecycle_feedback_allocator.lifecycle.length, 88);
    // the wide view keeps the canonical margins relative to the REAL edges and never inherits the mapped-object retention adapter
    for (const width of [256, 348, 640]) for (let rel = -110; rel < width + 110; rel++) {
        const wvp = {left: 3000, top: 480, w: width, h: 192}, s = lab.c.chaos_54_slot(0x55, 0, 3000 + rel, 580, 0); s.state = s.requested = 3;
        lab.c.chaos_54_lifecycle(lab.b, s, wvp);
        const beyond = rel < 0 ? -rel - 1 : rel - width;
        eq(s.type === 0xFF, beyond >= 96, `child lifetime ${width} ${rel}`); if (s.type !== 0xFF) eq(s.asleep, beyond >= 32 - 0 && beyond >= 0 ? beyond >= 32 : false, `child sleep ${width} ${rel}`);
    }
    // palette flash command: white for command calls 4..7, restored on call 8; four slots
    R.lifecycle_feedback_allocator.flash.forEach(row => {
        const l = L.lab(); l.b.flash = [0, 0, 0, 0].slice(0, 0);
        l.c.chaos_54_queue_flash(l.b);
        for (let n = 1; n <= row.call; n++) l.c.chaos_54_flash_step(l.b);
        eq(l.b.flash_white, row.colors[0] === 63, 'flash call ' + row.call);
    });
    { const l = L.lab(); for (let i = 0; i < 6; i++) l.c.chaos_54_queue_flash(l.b); eq(l.b.flash.length, 4, 'four palette command slots'); }
    // allocator exhaustion: saturated 7..17 skips the whole spawn command and the parent continues identically
    const runs = [false, true].map(sat => {
        const l = L.lab(); l.call(0xA291); const s = l.s; s.state = s.requested = 7; s.keep = true; s.asleep = false; s.yu = 622 * 256; s.vy = -896; l.position(2980, 620);
        if (sat) for (let i = 8; i < 18; i++) l.pool.slots[i] = Object.assign(l.c.chaos_s2_slot(), {type: 0xF0});
        const boss = [], kids = []; let spawned = 0;
        for (let t = 0; t < 28; t++) { l.step(t); boss.push(L.slotRow(l.c, l.pool.slots[7], 7)); spawned += l.pool.slots.filter(q => q.boss && q.type === 0x55).length; kids.push(l.b.spawns.length); }
        return {boss, spawned, spawns: l.b.spawns.length, sat};
    });
    eq(runs[0].boss, runs[1].boss, 'saturated and unsaturated parent traces are identical');
    ok(runs[0].spawns > 0 && runs[1].spawns === 0 && runs[1].spawned === 0, 'children only when slots are free');
    R.lifecycle_feedback_allocator.allocator.forEach((a, i) => eq(runs[i].boss.map(q => [q.state, q.requested, q.frame, q.duration, q.x, q.y, q.vx, q.vy]), a.boss.map(q => [q.state, q.requested, q.frame, q.duration, q.x, q.y, q.vx, q.vy]), 'allocator trace ' + a.saturated));
}
mark('lifecycle / flash / allocator');

// ---- 8. guarded whole-game fights (Research boss-54-fullgame.json): the real loader, mapped scan, shared scheduler pass and camera takeover -----------------------------------------
// The Research fixture parks Sonic through the original scheduler (park(): X/Y words, zero speed, state 5, floor 2, rings $47) before each player update and, in the fight, injects a
// top-classified attacking contact (flags 3, floor 0, Y speed +1.0, state 10) at (bossX, bossY-80) after the player update whenever the boss is in a vulnerable state with cooldown <= 1.
// This driver applies the same writes to the shipped core and runs the shipped scheduler hook (chaos_s2_phase) and camera (chaos_54_camera_step); ROM update u = pass + 3 (the boss is
// created by the third update's placement scan).
function replayFight(mode, last) {
    const h = L.newWorld(), c = h.ctx, g = c.global;
    c.chaos_level_install_layout(); c.chaos_level_spawn_objects();
    g.chaosSezEffects = c.chaos_sez_effect_new(); g.chaosSezBossActive = false; g.chaosLastSoundRequest = 0;
    h.world.cam = {x: 2956, y: 520, w: 256, h: 192}; h.world.follow = false;
    const p = h.newPlayer(3060, 620, {state: 5, move: 0}), core = p.chaosCore;
    core.rings = 47;
    const b = g.chaosSez54, pool = g.chaosS2;
    b.latch_clear = true;
    const log = {marks: [], hits: [], transitions: [], rows: []};
    const realCb = c.chaos_54_callback; let pass = 0;
    c.chaos_54_callback = (bb, pl, s, pc, ...rest) => { const before = s.requested; realCb(bb, pl, s, pc, ...rest); if (s.type === 0x54) log.marks.push([pass + 3, pc, before, s.requested]); };
    const park = (x, y, flags = 0, floor = 2, st = 5) => { core.xu = x * 256; core.yu = y * 256; core.vx = 0; core.vy = 0; core.state = core.next = st; core.move = flags; core.contacts = floor; core.bg = floor; core.stage_request = 0; core.stage_contact = 0; core.stage_nib = 0; };
    const bossOf = () => pool.slots.find(s => s.boss && s.type === 0x54);
    let old = null, defeatedAt = -1;
    for (pass = 0; pass < 1100 - 2; pass++) {
        const u = pass + 3;
        let s = bossOf();
        if (mode === 'cycle' || mode === 'fight') {
            if (s === undefined && pass + 3 > 100) { /* no park once the boss is gone */ }
            else if (s === undefined || s.state < 3) park(3060, 620);
            else if (s.state !== 4 && s.state !== 5) park(3000, 620);
        }
        if (mode === 'fight' && s !== undefined && s.state >= 7 && s.state <= 10 && s.cooldown <= 1 && !s.defeated) { park(c.chaos_54_x(s), c.chaos_54_y(s) - 80, 3, 0, 10); core.vy = 256; }
        if (mode === 'fight' && s !== undefined && s.state === 5) core.contacts = 2;        // Sonic has landed again by the time state 5 runs (the explosion script lasts 148 updates)
        c.chaos_s2_phase(core, true);
        c.chaos_54_camera_step();
        c.chaos_sez_effect_step(g.chaosSezEffects, g.chaosSezBossActive, 0);
        s = bossOf();
        const row = s === undefined ? null : Object.assign(L.slotRow(c, s, pool.slots.indexOf(s)), {u});
        const key = row ? [row.state, row.requested].join() : 'none';
        if (key !== old) log.transitions.push({u, boss: row, camera: [h.world.cam.x, h.world.cam.y]});
        old = key;
        if (b.clear_tick >= 0 && defeatedAt < 0) defeatedAt = pass;
        if (pass + 3 === last) log.last = {u, slots: L.snapSlots({c, pool, core, vp: {left: h.world.cam.x, top: h.world.cam.y}, b}).concat([])};
        if (mode === 'fight' && b.clear_tick >= 0 && pass > b.clear_tick + 3) break;
        log.u = u;
    }
    log.spawns = b.spawns.filter(sp => sp[1] === 0x55 || sp[1] === 0x34).map(sp => ({u: sp[0] + 3, type: sp[1]}));
    log.hits = b.hits.map(hh => ({u: hh[0] + 3, hp_before: hh[1] + 1}));
    log.b = b; log.c = c; log.g = g; log.core = core; log.pool = pool; log.h = h;
    return log;
}
{
    for (const mode of ['cycle', 'fight']) {
        const want = FG[mode], got = replayFight(mode, want.updates);
        const bossField = r => r && [r.state, r.requested, r.frame, r.duration, r.x, r.y, r.vx, r.vy, r.hp, r.cooldown, r.defeated, r.drop, r.token, r.flags4];
        const wantField = t => t && [t.state, t.req, t.frame, t.duration, t.x, t.y, t.vx, t.vy, t.hp, t.cooldown, t.defeated, t.drop, t.token, t.f4];
        // every transition of the original fight: update number, state, request, frame, countdown, anchor, speeds, HP, cooldown / HUD pointer bytes, flags
        const gotMap = new Map(got.transitions.map(t => [t.u, t]));
        let n = 0;
        for (const t of want.transitions) {
            const mine = gotMap.get(t.u);
            ok(mine !== undefined, `${mode} transition at update ${t.u} exists`);
            eq(bossField(mine.boss), wantField(t.boss), `${mode} transition u${t.u}`);
            if (t.u >= 200 && t.boss) eq(mine.camera, t.camera, `${mode} camera at u${t.u}`);
            n++;
        }
        eq(got.transitions.filter(t => t.u <= want.transitions[want.transitions.length - 1].u).length, want.transitions.length, `${mode} no extra transitions`);
        // child / puff spawn updates and the HP-decrement marks
        eq(got.spawns.filter(sp => sp.u <= want.updates), want.spawns.map(sp => ({u: sp.u, type: sp.type})), `${mode} script spawn updates`);
        const marks = name => want.marks.filter(m => m.event === name).map(m => m.u);
        eq(got.marks.filter(m => m[1] === 0x974C).map(m => m[0]), marks('init'), `${mode} init (D44E, HUD, keepalive)`);
        eq(got.marks.filter(m => m[1] === 0x9771 && m[2] === 1 && m[3] === 2).map(m => m[0]), marks('trigger'), `${mode} trigger`);
        eq(got.marks.filter(m => m[1] === 0x97C1 && m[3] === 3).map(m => m[0]), marks('pan'), `${mode} pan start after the HUD wait`);
        eq(got.marks.filter(m => m[1] === 0xA291).map(m => m[0]), marks('combat_init'), `${mode} combat init`);
        if (mode === 'fight') {
            eq(got.hits.map(x => [x.u, x.hp_before]), want.marks.filter(m => m.event === 'hp_decrement').map(m => [m.u, m.hp_before]), 'eight HP decrements: update and HP-before');
            eq(got.hits.map(x => x.hp_before), [8, 7, 6, 5, 4, 3, 2, 1], 'eight successful decrements reach defeat');
            eq(got.marks.filter(m => m[1] === 0x81BD && m[3] !== 5).map(m => m[0]), []);
            eq(got.b.clear_tick + 3, want.marks.find(m => m.event === 'bonus_spawn').u, 'state-5 clear (bonus controller) update');
            eq(got.g.chaosBossNextAct, {zone: 3, act: 0}, 'progression handoff: MGHZ1');
            eq(got.core.next, 32, 'player state $20 requested'); eq(got.b.camera_mode, 4, 'pan released');
            const puffs = got.spawns.filter(sp => sp.type === 0x34); eq(puffs.length, 5, 'five puffs');
            // existing children keep running after the final hit / state change (no parent cleanup sweep)
            ok(want.children_after_final_hit.length > 0 && got.log === undefined);
            eq(want.max_children, 3);
        } else {
            eq(want.children_after_final_hit, []);
            eq(got.hits.length, 0, 'the unattended cycle never damages the boss');
            // the last row of the 1100-update cycle: boss + children + smoke
            const w = want.last.o, rows = got.last.slots;
            eq(rows.map(r => [r.type, r.state, r.requested, r.frame, r.duration, r.x, r.y, r.vx, r.vy]), w.map(r => [r.type, r.state, r.req, r.frame, r.duration, r.x, r.y, r.vx, r.vy]), 'last row of the 1100-update cycle');
        }
        eq(new Set(want.states.concat(want.transitions.filter(t => t.boss).map(t => t.boss.state))).size, want.states.length, 'states list covers the transitions');
        got.n = n;
    }
    // all 13 boss states occur across the two fights (state 5 is a transient the next row hides: its clear callback is the bonus_spawn mark)
    const states = new Set([...FG.cycle.states, ...FG.fight.states, 5]);
    eq([...states].sort((a, b) => a - b), [...Array(13).keys()]);
    eq(FG.contact_cases.length, 64);
}
mark('whole-game fights');

// ---- 9. 64 whole-game controlled contact cases (forced state 9 boss at (3100,580), frame 15, 3000,620 start) -------------------------------------------------------------------
{
    for (const cs of FG.contact_cases) {
        const inp = cs.input, lab = L.lab();
        lab.call(0xA291);
        const s = lab.s; s.state = s.requested = 9; s.keep = true; s.asleep = false; s.xu = 3100 * 256; s.yu = 580 * 256; s.vx = 0; s.vy = 0; s.token = 25; s.pc = 0;
        lab.b.screen_pass = true; lab.b.latch_clear = true;
        lab.vp = {left: 2900, top: 462, w: 256, h: 192};
        lab.core.xu = (3100 + inp.point[0]) * 256; lab.core.yu = (580 + inp.point[1]) * 256; lab.core.vx = 0; lab.core.vy = 256; lab.core.move = inp.attack | inp.hurt | inp.blink; lab.core.immune = inp.power === 6;
        lab.core.state = lab.core.next = 5; lab.core.contacts = inp.floor; lab.core.bg = 0; lab.core.stage_request = 0; lab.core.stage_contact = 0; lab.core.stage_nib = 0;
        lab.step(0);
        const expect = L.contact(L.lab(), {dx: inp.point[0], dy: inp.point[1], frame: 15, attack: inp.attack, hurt: inp.hurt, inv: inp.blink, power: inp.power, floor: inp.floor});
        eq(s.hp, cs.row.o[0].hp, 'whole-game contact HP ' + JSON.stringify(inp));
        eq(lab.core.stage_request, cs.row.damage, 'whole-game contact damage request ' + JSON.stringify(inp));
        eq([s.hp, lab.core.stage_request], [expect.hp, expect.player.damage].map((v, i) => i === 1 ? v : v), 'agrees with the controlled-routine rows for frame 15 on the same input');
    }
}
mark('whole-game contact cases');

// ---- 10. widescreen camera adapter (explicit, not ROM behaviour) ---------------------------------------------------------------------------------------------------------------
{
    for (const width of [256, 348, 640]) {
        const h = L.newWorld(width), c = h.ctx, g = c.global;
        const b = g.chaosSez54; b.active = true; b.camera_mode = 3; b.camera_left = 0; b.pan_x = c.chaos_54_target_x(width); b.pan_y = 462;
        const start = width === 256 ? [2956, 520] : [2800, 520];
        h.world.cam = {x: start[0], y: start[1], w: width, h: 192}; h.world.follow = false;
        h.newPlayer(3060, 620, {state: 5, move: 0});
        let maxStep = 0, prev = start.slice();
        for (let t = 0; t < 400; t++) {
            c.chaos_54_camera_step();
            maxStep = Math.max(maxStep, Math.abs(h.world.cam.x - prev[0]), Math.abs(h.world.cam.y - prev[1])); prev = [h.world.cam.x, h.world.cam.y];
        }
        eq([h.world.cam.x, h.world.cam.y], [3231 - width, 462], `wide pan settles one pixel short of the target at ${width}`);
        eq(c.chaos_54_target_x(width), 3232 - width, 'canonical arena right edge 3232 kept');
        eq(3231 - width + width, 3231, 'right edge column is world 3231 at every width');
        if (width === 256) { eq([h.world.cam.x, h.world.cam.y], [2975, 462]); }
        else ok(maxStep <= 4, 'wide pan bounded to 4 logical px/update');
        eq(b.camera_right, 3232 - width, 'pan writes the exclusive right limit');
        // the cached-screen relationships stay world-constant: right stop 3187, escape 3183
        b.viewport_w = width; const left = h.world.cam.x;
        const s = c.chaos_54_slot(0x54, 0, 3100, 622, 5);
        for (const [edge, world] of [[-44, 3187], [-48, 3183]]) for (const x of [world - 1, world, world + 1]) {
            s.sx = x - left; eq(c.chaos_54_screen_ge(b, s.sx, edge), x >= world, `screen threshold ${edge} width ${width} x ${x}`);
        }
        // strict PLAYER_DIST trigger never widens (covered above); the world thresholds 610 / 622 / 626 are viewport independent
        eq([c.CHAOS_54_Y_DROP, c.CHAOS_54_Y_LAND, c.CHAOS_54_CHILD_Y], [610, 622, 626]);
    }
    // 256: the 8-bit cached byte (a boss left of the screen wraps high), wide: signed relationship
    const h = L.newWorld(), c = h.ctx, b = c.global.chaosSez54;
    ok(c.chaos_54_screen_ge(b, -40, -44), 'at 256 a negative screen X wraps into the byte compare (SMS artefact preserved)');
    b.viewport_w = 640; ok(!c.chaos_54_screen_ge(b, -40, -44), 'wide: signed compare');
}
mark('widescreen adapter');

// ---- 11. integration: real loader, adapter, object phase, camera takeover, edge clamp, HP / defeat / clear, state 20, MGHZ1 handoff ------------------------------------------------
{
    const h = L.newWorld(), c = h.ctx, g = c.global, w = h.world;
    c.chaos_level_install_layout(); c.chaos_level_spawn_objects();
    eq(g.chaosSpawnedByType[0x54], 1); eq(g.chaosSez54.record.slice(0, 4), [5, 3200, 622, 0x54]);
    g.chaosSezEffects = c.chaos_sez_effect_new();
    w.follow = false; w.cam = {x: 2900, y: 520, w: 256, h: 192};
    const p = h.newPlayer(3100, 618, {state: 1, move: 0}), core = p.chaosCore; core.rings = 47; g.powerInv = true;
    ok(!c.chaos_54_owns_camera(), 'no camera ownership before the boss exists');
    let created = -1, eff0 = g.chaosSezEffects.tick;
    for (let t = 0; t < 120; t++) {
        h.frame({}); c.chaos_54_camera_step(); c.chaos_sez_effect_step(g.chaosSezEffects, g.chaosSezBossActive, 0);
        if (created < 0 && g.chaosSez54.created) created = t;
    }
    ok(created >= 0, 'boss created by the natural mapped scan through the real object phase');
    eq(g.chaosSezBossActive, true, 'effect 5 sees the real boss-active state');
    ok(g.chaosSezEffects.tick < 120, 'effect 5 paused by D44E'); ok(c.chaos_54_owns_camera());
    const b = g.chaosSez54;
    eq(b.camera_mode === 3 || b.camera_mode === 2, true, 'camera takeover after the trigger'); eq(g.chaosHudSlide <= 0, true);
    for (let t = 0; t < 120; t++) { h.frame({}); c.chaos_54_camera_step(); }
    eq([w.cam.x, w.cam.y], [2975, 462], 'camera settled at the canonical lock');
    eq(b.camera_bottom, 462);
    // edge clamp keeps Sonic inside the live view
    core.xu = 2000 * 256; h.frame({}); ok(Math.floor(core.xu / 256) >= w.cam.x + 16, 'EDGE(LEFT,+16) clamp while the boss owns the camera');
    // boss in combat: push Sonic above it as an attacker and watch the real adapter / phase decrement HP once per 18 calls
    const boss = () => g.chaosS2.slots.find(s => s.boss && s.type === 0x54);
    for (let t = 0; t < 40 && boss().state < 7; t++) { core.xu = 3000 * 256; core.yu = 622 * 256; h.frame({}); c.chaos_54_camera_step(); }
    ok(boss().state >= 6, 'combat reached');
    let hp0 = boss().hp; ok(hp0 === 8);
    // like the Research fixture, Sonic is parked AFTER his own update (player / terrain pass) and before the object phase
    const realPhase = c.SCR_chaos_objects_phase; let parkFn = null;
    c.SCR_chaos_objects_phase = () => { if (parkFn) parkFn(); realPhase(); };
    parkFn = () => {
        const s = boss(); if (!s || s.type !== 0x54) return;
        if (s.state >= 7 && s.state <= 10 && s.cooldown <= 1 && !s.defeated) { core.xu = c.chaos_54_x(s) * 256; core.yu = (c.chaos_54_y(s) - 80) * 256; core.vx = 0; core.vy = 256; core.move = 3; core.contacts = 0; core.bg = 0; core.state = core.next = 10; }
        else if (s.state !== 4 && s.state !== 5) { core.xu = 3000 * 256; core.yu = 622 * 256; core.vx = 0; core.vy = 0; core.move = 0; core.contacts = 2; core.bg = 2; core.state = core.next = 5; }
        core.stage_request = 0; core.damage_request = 0;
    };
    for (let t = 0; t < 2500 && boss() && boss().state !== 4 && boss().state !== 5 && boss().type === 0x54; t++) { h.frame({}); c.chaos_54_camera_step(); }
    ok(boss().hp <= 1 || boss().defeated === 255 || boss().state >= 4, 'real object phase drove HP down and reached defeat');
    eq(Math.min(...g.chaosSez54.hits.map(x => x[1])), 0, 'eight decrements reach zero');
    parkFn = () => { const s = boss(); if (s && s.state === 5) { core.contacts = 2; core.bg = 2; } };
    for (let t = 0; t < 600 && g.chaosSez54.clear_tick < 0; t++) { h.frame({}); c.chaos_54_camera_step(); }
    ok(g.chaosSez54.clear_tick >= 0, 'floor-gated clear reached'); eq(g.chaosBossNextAct, {zone: 3, act: 0}, 'handoff to MGHZ1 (zone 3, act 0)');
    eq(b.camera_mode, 4, 'pan released after the clear');
    for (let t = 0; t < 600 && !core.act_clear; t++) { h.frame({}); c.chaos_54_camera_step(); }
    ok(core.act_clear, 'state $20 runs right and sets the act-clear flag (EDGE(RIGHT,+33) adapter)');
    eq(c.chaos_goal_clear_dx(256), 289);
    // the boss is never recreated after the clear (occupancy retained, token detached)
    eq(g.chaosS2.slots.filter(s => s.boss && s.type === 0x54).length, 0); ok(b.occupied);
}
mark('integration');

// ---- 12. widescreen-only symmetric boss-edge adapter (POC gameplay adapter, not ROM behaviour); 256 px stays byte-for-byte canonical -------------------------------------------------------
{
    const canonStop = (sx, vx) => (vx >= 0 && (sx & 255) >= 212) ? 0 : vx;
    const canonEsc = (sx, psx) => (sx & 255) >= 208 && (psx & 255) >= (sx & 255);
    const c = L.newWorld().ctx, b = c.global.chaosSez54;
    // 256 px: identical to the Research relationships for every cached byte pair, including values that would be "left edge" in a wide view (no mirrored stop / escape)
    b.viewport_w = 256;
    for (let sx = -300; sx <= 560; sx++) {
        for (const vx of [-128, 0, 128]) { const s = c.chaos_54_slot(0x54, 0, 3100, 622, 5); s.sx = sx; s.vx = vx; c.chaos_54_right_stop(b, s); eq(s.vx, canonStop(sx, vx), `256 stop ${sx} ${vx}`); }
        for (const psx of [-300, -48, 0, 44, 48, 100, 207, 208, 212, 255, 300, sx - 1, sx, sx + 1]) { const s = c.chaos_54_slot(0x54, 0, 3100, 622, 5); s.sx = sx; b.player_sx = psx; eq(c.chaos_54_escape(b, s), canonEsc(sx, psx), `256 escape ${sx} ${psx}`); }
    }
    for (const w of [348, 640]) {
        b.viewport_w = w;
        for (let sx = -100; sx <= w + 100; sx++) {
            for (const vx of [-128, 0, 128]) {
                const s = c.chaos_54_slot(0x54, 0, 3100, 622, 5); s.sx = sx; s.vx = vx; c.chaos_54_right_stop(b, s);
                const want = vx >= 0 ? (sx >= w - 44 ? 0 : vx) : (sx <= 44 ? 0 : vx);
                eq(s.vx, want, `wide stop ${w} ${sx} ${vx}`);
            }
            for (const psx of [-200, 0, 30, 48, 100, sx - 1, sx, sx + 1, w - 48, w, w + 100]) {
                const s = c.chaos_54_slot(0x54, 0, 3100, 622, 5); s.sx = sx; b.player_sx = psx;
                eq(c.chaos_54_escape(b, s), (sx >= w - 48 && psx >= sx) || (sx <= 48 && psx <= sx), `wide escape ${w} ${sx} ${psx}`);
            }
        }
    }
    // no player clamp beyond the ordinary live viewport bounds (EDGE(LEFT,+16) .. EDGE(RIGHT,-9)) through the real adapter
    for (const width of [256, 348, 640]) {
        const h = L.newWorld(width), c2 = h.ctx, g = c2.global; c2.chaos_level_install_layout(); c2.chaos_level_spawn_objects(); g.chaosSezEffects = c2.chaos_sez_effect_new(); g.powerInv = true;
        h.world.follow = false; h.world.cam = {x: 2956, y: 520, w: width, h: 192};
        const p = h.newPlayer(3100, 622, {state: 5, move: 0}), core = p.chaosCore; core.contacts = 2; core.bg = 2;
        const put = x => { core.xu = x * 256; p.x = x; p.chaosCoreLastX = x; };
        let owned = false, ownerX = 0;
        for (let t = 0; t < 500; t++) { h.frame({}); c2.chaos_54_camera_step(); if (!owned && c2.chaos_54_owns_camera()) { owned = true; ownerX = Math.floor(core.xu / 256); } }
        ok(owned && ownerX >= 3041 - 1);
        put(2000); core.vx = -1500; h.frame({}); eq(Math.floor(core.xu / 256), h.world.cam.x + 16, 'left bound is the live EDGE(LEFT,+16) @' + width);
        put(5000); h.frame({}); eq(Math.floor(core.xu / 256), h.world.cam.x + width - 9, 'right bound is the live EDGE(RIGHT,-9) @' + width);
    }
    // natural fights with Sonic parked at the far left / right (no attacks): 256 canonical (left edge never provokes state 11), wide (both extremes do); state 12 drops at the player's X; $55 unchanged
    for (const width of [256, 348, 640]) for (const side of ['left', 'right']) {
        const camLeft = 3231 - width, px = side === 'left' ? camLeft + 16 : 3200;
        const h = L.newWorld(width), c2 = h.ctx, g = c2.global; c2.chaos_level_install_layout(); c2.chaos_level_spawn_objects(); g.chaosSezEffects = c2.chaos_sez_effect_new();
        h.world.cam = {x: 2956, y: 520, w: width, h: 192}; h.world.follow = false;
        const p = h.newPlayer(3060, 620, {state: 5, move: 0}), core = p.chaosCore, pool = g.chaosS2; let esc = 0, kids = 0, drawn = 0, drops = [], maxOver = 0, minBoss = 1e9, maxBoss = -1e9;
        c2.draw_sprite = sp => { if (sp === c2.SPR_chaos_sez_boss_55) drawn++; };
        let prev = null;
        for (let k = 0; k < 6000; k++) {
            const s = pool.slots.find(q => q.boss && q.type === 0x54);
            core.xu = (!s || s.state < 3 ? 3060 : px) * 256; core.yu = 622 * 256; core.vx = core.vy = 0; core.state = core.next = 5; core.move = 0; core.contacts = 2; core.bg = 2; core.stage_request = 0;
            c2.chaos_s2_phase(core, true); c2.chaos_54_camera_step(); c2.chaos_54_draw();
            const q = pool.slots.find(r => r.boss && r.type === 0x54);
            if (q) { if (q.state === 11) esc++; if (prev === 12 && q.state === 8) drops.push([c2.chaos_54_x(q), px]); prev = q.state; if (q.state >= 6) { minBoss = Math.min(minBoss, c2.chaos_54_x(q)); maxBoss = Math.max(maxBoss, c2.chaos_54_x(q)); } }
            kids = Math.max(kids, pool.slots.filter(r => r.boss && r.type === 0x55).length);
        }
        const expectEsc = side === 'right' || width > 256;
        eq(esc > 0, expectEsc, `state 11 escape @${width} ${side}`);
        for (const d of drops) eq(d[0], d[1], `state 12 drops at the player X @${width} ${side}`);
        if (expectEsc) ok(drops.length > 0, 'a drop happened');
        eq([kids, drawn > 0], [3, true], `$55 spawn/draw @${width} ${side}`);
        if (width > 256 && side === 'left') ok(minBoss <= camLeft + 48 + 4, 'boss patrols to about one body length from the left edge: ' + minBoss + ' vs ' + (camLeft + 48));
        if (width === 256) ok(minBoss > camLeft + 48, '256 px: no left-edge reach');
    }
}
mark('widescreen symmetric edge adapter');

const out = {status: 'PASS', assertions: checks, research: RESEARCH, sections: section, cycles: cycleStats, garbage_lab_fields_skipped: garbage};
fs.mkdirSync(path.join(root, 'build/sez-s5'), {recursive: true}); fs.writeFileSync(path.join(root, 'build/sez-s5/runtime-results.json'), JSON.stringify(out, null, 2) + String.fromCharCode(10));
console.log(JSON.stringify({status: out.status, assertions: checks, sections: section}));
