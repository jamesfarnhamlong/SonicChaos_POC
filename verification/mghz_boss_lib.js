// Shared helpers for the MGHZ3 boss ($56/$57/$58) verification: loads the SHIPPED GML through the world harness and exposes
// snapshot/driver functions that map the live script slots onto the Research cache record format.
const fs = require('fs'), path = require('path');
const {loadHost, root} = require('./chaos_world_harness');
const cacheDir = path.join(root, 'POC_notes/rom-cache/mghz');
const load = n => JSON.parse(fs.readFileSync(path.join(cacheDir, n)));
const RUNTIME = load('boss-56-runtime.json'), FULLGAME = load('boss-56-fullgame.json'), MANIFEST = load('boss-56-implementation-manifest.json');
const SLOT0 = 0xD540;
const vp256 = () => ({left: 3060, top: 256, w: 256, h: 192});

let SHARED = null;
/// One compiled host is reused (compiling every shipped script per case would dominate the sweeps); all state a case can touch is reset here.
function newWorld(width = 256, height = 192, fresh = false) {
    const h = fresh || !SHARED ? loadHost() : SHARED;
    if (!fresh) SHARED = h;
    const c = h.ctx;
    h.reset();
    c.room = c.ROM_chaos_mghz3;
    h.world.roomWidth = 3840; h.world.roomHeight = 768; h.world.follow = false;
    h.world.cam = {x: 3060, y: 256, w: width, h: height};
    c.global.chaosM3 = c.chaos_m3_new();
    c.global.chaosMghzBossActive = false;
    c.global.chaosMghzEffects = c.chaos_mghz_effect_new();
    c.global.minutes = 0; c.global.seconds = 0; c.global.ring = 0; c.global.chaosLastSoundRequest = 0;
    c.global.chaosBossNextAct = -4; c.global.chaosHudSlide = 0; c.global.chaosCrushDeathPhase = 0;
    return h;
}
function slotsOf(c) { return c.global.chaosM3.slots; }
function flags4(c, s) { return (s.keep ? 2 : 0) | (s.bit0 ? 1 : 0) | (s.asleep ? 64 : 0); }
/// Same fields as Research's Lab.snap() slot rows (types 0 and >= $F0 are not listed).
function snapSlots(c) {
    const out = [];
    slotsOf(c).forEach((s, i) => {
        if (!s.boss || s.type === 0 || s.type >= 0xF0) return;
        out.push({slot: SLOT0 + i * 64, type: s.type, parameter: s.parameter, state: s.state, requested: s.requested, frame: s.frame, timer: s.timer,
            x: c.chaos_56_x(s), y: c.chaos_56_y(s), vx: s.vx, vy: s.vy, extent: [s.ex, s.ey], hp: s.type === 0x56 || s.src_type === 0x56 ? s.hp : 0,
            cooldown: s.cooldown, saved_x: s.saved_x, hud_owner: s.type === 0x56 || s.src_type === 0x56 ? (s.hud >= 0 ? SLOT0 + s.hud * 64 : 0) : (s.type === 0x34 ? s.seed : 0),
            placement_token: s.token, flags: s.flag7 ? 128 : 0, flags4: flags4(c, s)});
    });
    return out;
}
/// Research Lab scenario setup: $A576 executed, boss slot 7 (D700) in the given state, keep-alive, Sonic parked at (3100,350), camera (3060,256).
function scenario(state, opts = {}) {
    const h = newWorld(opts.width || 256), c = h.ctx, b = c.chaos_56_new();
    const player = c.SCR_cc_new(3100, 350); player.move = 0; player.state = player.next = 5;
    const s = c.chaos_56_slot(0x56, 0, 3269, 288, 12);
    c.global.chaosM3.slots[7] = s;
    const vp = opts.width ? {left: 3316 - opts.width, top: 256, w: opts.width, h: 192} : vp256();
    b.d12f = 0; b.screen_pass = opts.screen || false; b.latch_clear = opts.latch === undefined ? false : opts.latch;   // the Research scheduler lab never runs the sprite pass that writes the +$1A/+$1C screen coordinates
    c.chaos_56_callback(b, s, 0xA576, player, true, vp, -4);            // the Lab calls $A576 directly: HP, flag, HUD, palette selector, request $0B
    s.state = s.requested = state; s.keep = true;
    s.yu = (state === 6 || state === 8 || state === 9 || state === 11 || state === 12 || state === 4 ? 288 : 430) * 256;
    return {h, c, b, s, player, vp, lastSound: 0};
}
function step(w, t) {
    w.b.d12f = t & 255;
    w.c.chaos_56_tick(w.b, w.vp, w.player, true, -4);
    if (w.b.sound !== 0) w.lastSound = w.b.sound;
}
/// Research Lab prepare(): boss/child slot at (3269,350) in state/request 6, flags +$03 = $80, Sonic anchored at (3269+dx, 350+dy), vx 384.
function prepare(o = {}) {
    const a = Object.assign({dx: 0, dy: -48, attack: 2, frame: 1, allow: 255, cooldown: 0, hp: 10, hurt: 0, inv: 0, ex: 8, vy: 256, floor: 0, terrain: 0, type: 86, power: 0, camera: 3060, width: 256}, o);
    const h = newWorld(a.width), c = h.ctx, b = c.chaos_56_new();
    const player = c.SCR_cc_new(3269 + a.dx, 350 + a.dy);
    player.move = a.attack | a.hurt | a.inv; player.state = player.next = 5; player.vx = 384; player.vy = a.vy;
    player.bg = a.terrain; player.contacts = a.floor; player.rings = 47; player.immune = a.power === 6;
    c.global.chaosLastSoundRequest = 0;
    const s = c.chaos_56_slot(a.type, 0, 3269, 350, 0);
    s.state = s.requested = 6; s.flag7 = true; s.hp = a.hp; s.cooldown = a.cooldown; s.frame = a.frame;
    const e = c.chaos_56_extent(86, a.frame); s.ex = e[0]; s.ey = e[1];
    c.global.chaosM3.slots[7] = s;
    const vp = {left: a.camera, top: 256, w: a.width, h: 192};
    return {h, c, b, s, player, vp, a};
}
const bcd = n => (Math.floor(n / 10) << 4) | (n % 10);
function playerRow(w) {
    const c = w.c, p = w.player;
    return {x: Math.floor(p.xu / 256), y: Math.floor(p.yu / 256), vx: p.vx, vy: p.vy, state: p.state, requested: p.next, flags: p.move, floor: p.contacts & 2,
        damage: p.stage_request, owner: p.stage_contact, contact: 0, sound: c.global.chaosLastSoundRequest, rings: bcd(p.rings)};
}

/// Whole-fight replay of the Research full-game trace (format 2) through the shipped tick. Each scheduler pass consumes the RECORDED phase values of its update:
/// D12F (counter) and Sonic's post-physics player state at "after_player_before_objects", plus the camera of that phase; the slot rows of the next boundary are the
/// expected result. No fitted frame offset and no assumed parked Y: both were retired when Research recorded them (reports/mghz3-boss-56-reconciliation.md).
/// width > 256 re-frames the camera: before combat the recorded camera, afterwards the settled wide lock RIGHT-47 (a presentation adapter; slot rows are not compared).
/// opts.counterShift / opts.yShift exist only so tests can prove the recorded values matter.
function replayFullGame(opts = {}) {
    const {width = 256, untilUpdate = 545, keep = false, counterShift = 0, yShift = 0} = opts;
    const rows = FULLGAME.rows, byUpdate = new Map(rows.map(r => [r.update, r]));
    const phases = new Map();
    for (const ph of FULLGAME.phases) if (ph.phase === 'after_player_before_objects') phases.set(ph.update, ph);
    const h = newWorld(width), c = h.ctx, b = c.chaos_56_new(), m = c.global.chaosM3;
    const first = rows.findIndex(r => r.slots.some(s => s.type === 86));
    const s0 = c.chaos_56_slot(86, 0, 3269, 288, 12); s0.asleep = true; m.slots[7] = s0;
    const p = c.SCR_cc_new(3100, 366);
    const realContact = c.chaos_56_damage_contact; let warningCalls = 0;
    c.chaos_56_damage_contact = (sl, ...rest) => { if (sl.type === 87) warningCalls++; return realContact(sl, ...rest); };
    const log = {compared: 0, passes: 0, skippedUpdates: [], mismatches: [], hits: [], first, b, c, m, ticks: [], width, warningCalls: 0};
    const f = s => [s.type, s.state, s.requested, s.frame, s.timer, s.x, s.y, s.vx, s.vy, s.hp, s.cooldown, s.flags4];
    let lastPhase = null, lastRow = null;
    for (let k = first; k < rows.length - 1; k++) {
        const cur = rows[k], nxt = byUpdate.get(cur.update + 1);
        if (!nxt || nxt.update > untilUpdate) break;
        const ph = phases.get(cur.update);
        if (!ph) { log.skippedUpdates.push(cur.update); continue; }               // boundary without a camera/player/object pass
        lastPhase = ph; lastRow = cur;
        const left = width === 256 || cur.update < 106 ? ph.camera[0] : 3316 - width;
        const vp = {left, top: ph.camera[1], w: width, h: 192};
        p.xu = ph.player[0] * 256; p.yu = (ph.player[1] + yShift) * 256;
        p.vx = ph.velocity[0]; p.vy = ph.velocity[1]; p.move = ph.flags; p.state = cur.state; p.next = cur.requested;
        p.contacts = ph.floor & 2; p.bg = ph.floor & 2; p.stage_request = 0;
        b.d12f = (ph.counter + counterShift) & 255; b.random_byte = 0;
        const hitsBefore = b.hits.length;
        c.chaos_56_tick(b, vp, p, true, -4);
        log.passes++;
        if (b.hits.length > hitsBefore) log.hits.push([cur.update, b.hits[b.hits.length - 1][1]]);
        const mine = snapSlots(c).map(f), ref = nxt.slots.map(f);
        const norm = a => a.map(r => r[0] === 52 ? r.slice(0, 5).concat([0, 0], r.slice(7)) : r[0] === 10 ? r.slice(0, 5).concat([r[5], 0], r.slice(7)) : r);
        log.compared++;
        if (width === 256 && JSON.stringify(norm(mine)) !== JSON.stringify(norm(ref))) log.mismatches.push(nxt.update);
        if (keep) log.ticks.push({update: nxt.update, left, slots: m.slots.map((x, i) => x.boss && x.type !== 0 ? {i, type: x.type, src: x.src_type, x: c.chaos_56_x(x), y: c.chaos_56_y(x), state: x.state, frame: x.frame, asleep: x.asleep, hp: x.hp, vx: x.vx, vy: x.vy, timer: x.timer, requested: x.requested, ref: x} : null).filter(Boolean)});
    }
    // after the recorded trace ends the scheduler keeps running with Sonic parked at the last recorded post-physics position: lets slow projectiles finish their own lifetimes
    if (opts.tail && lastPhase) {
        let upd = lastRow.update;
        const left = width === 256 ? lastPhase.camera[0] : 3316 - width;
        for (let k = 0; k < opts.tail; k++) {
            upd++;
            p.xu = lastPhase.player[0] * 256; p.yu = lastPhase.player[1] * 256; p.vx = p.vy = 0; p.move = 0; p.state = 5; p.next = 5; p.contacts = 2; p.bg = 2; p.stage_request = 0;
            b.d12f = (lastPhase.counter + k + 1) & 255; b.random_byte = 0;
            c.chaos_56_tick(b, {left, top: 256, w: width, h: 192}, p, true, -4);
            if (keep) log.ticks.push({update: upd, left, slots: m.slots.map((x, i) => x.boss && x.type !== 0 ? {i, type: x.type, src: x.src_type, x: c.chaos_56_x(x), y: c.chaos_56_y(x), state: x.state, frame: x.frame, asleep: x.asleep, hp: x.hp, vx: x.vx, vy: x.vy, timer: x.timer, requested: x.requested, ref: x} : null).filter(Boolean)});
        }
    }
    c.chaos_56_damage_contact = realContact; log.warningCalls = warningCalls;
    log.nextAct = JSON.parse(JSON.stringify(c.global.chaosBossNextAct)); log.clearDx = c.chaos_goal_clear_dx(width);
    return log;
}
module.exports = {replayFullGame, prepare, playerRow, bcd, loadHost, root, RUNTIME, FULLGAME, MANIFEST, newWorld, slotsOf, snapSlots, scenario, step, vp256, flags4, SLOT0, load};
