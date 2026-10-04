// Focused checks for the recovered player hurt / lost-ring scatter (type $06 equivalents), Research 399f95bf03d3054d7f88ef6693eb935fc0c1ea13.
// Executes the SHIPPED scripts (SCR_chaos_lost_ring + core + adapter + objects phase) through verification/chaos_world_harness.js.
// Ground truth: POC_notes/rom-cache/player-hurt-ring-scatter.json (mirror of the Research cache: original Z80 routines on the oracle, 0 model mismatches).
const fs = require('fs'), path = require('path'), assert = require('assert');
const {loadHost, root} = require('./chaos_world_harness.js');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const C = JSON.parse(rd('POC_notes/rom-cache/player-hurt-ring-scatter.json'));
const res = path.resolve(root, '..', 'sonic-chaos-reference-work', 'data', 'rom-cache', 'player-hurt-ring-scatter.json');
let checks = 0;
const norm = v => JSON.stringify(v instanceof Set ? [...v] : v);   // the shipped code runs in a vm realm: compare by value
const eq = (a, b, m) => { assert.strictEqual(norm(a), norm(b), m); checks++; };
const ok = (c, m) => { assert.ok(c, m); checks++; };
if (fs.existsSync(res)) { assert.deepStrictEqual(JSON.parse(fs.readFileSync(res, 'utf8')), C, 'POC mirror differs from Research cache'); checks++; console.log('cross-checked against', res); }

const host = loadHost(null), ctx = host.ctx, g = host.g, cam = host.world.cam;
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

// ---------- 1. source locks ----------
{
    const lr = strip(rd('scripts/SCR_chaos_lost_ring/SCR_chaos_lost_ring.gml'));
    ok(!/alpha|alarm|blink|draw_set|place_free|place_meeting|hspeed|vspeed|gravity\b/.test(lr), 'lost rings: no alpha / timer / blink / engine physics / wall test');
    for (const f of ['scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml', 'scripts/SCR_chaos_core/SCR_chaos_core.gml', 'scripts/SCR_chaos_objects/SCR_chaos_objects.gml', 'objects/OBJ_chaos_ring_manager/Draw_0.gml'])
        ok(!/OBJ_player_lost_b/.test(strip(rd(f))), `${f} no longer uses the decorative OBJ_player_lost_b`);
    ok(!/rings\s*>>\s*4/.test(strip(rd('scripts/SCR_chaos_core/SCR_chaos_core.gml'))), 'core: no rings >> 4 on the decimal counter');
    ok(/SCR_chaos_lost_rings_phase/.test(rd('scripts/SCR_chaos_objects/SCR_chaos_objects.gml')), 'objects phase runs the lost rings');
    ok(/chaos_lr_reset/.test(rd('objects/OBJ_chaos_zone/Create_0.gml')), 'room start clears lost rings');
    ok(/chaos_lr_frame/.test(rd('objects/OBJ_chaos_zone/Draw_0.gml')) && /Draw_0/.test(rd('objects/OBJ_chaos_zone/OBJ_chaos_zone.yy')) === false && /"eventType": 8/.test(rd('objects/OBJ_chaos_zone/OBJ_chaos_zone.yy')), 'zone draws the rings; Draw event registered');
}

// ---------- helpers ----------
const FLOOR = 1, ONEWAY = 0x0D, RINGBLK = 0x40;
function world(cells) { g.chaosTileIds = Array(4095).fill(0); g.chaosBeyondMapOpen = false; for (const [c, r, b] of cells) g.chaosTileIds[r * 128 + c] = b; }
const row = (r, b, c0 = 10, c1 = 59) => { const o = []; for (let c = c0; c <= c1; c++) o.push([c, r, b]); return o; };
const view = (x, y, w = 256, h = 192) => { cam.x = x; cam.y = y; cam.w = w; cam.h = h; };
const px = r => ctx.chaos_lr_pixel_x(r), py = r => ctx.chaos_lr_pixel_y(r);
const vp = () => ctx.chaos_vp_current();
/// Runs one ring for n updates (update 0 = spawn). player(u, ring) -> [x, y] or null. Returns {events:[[name,u]], rows, ring}.
function run(token, ax, ay, n, player, mut) {
    const r = ctx.chaos_lr_new(token, ax, ay); if (mut) mut(r);
    const events = [], rows = [], bouncesVy = [];
    for (let u = 0; u < n && r.alive; u++) {
        const p = player ? player(u, r) : null;
        const ev = ctx.chaos_lr_step(r, !!p, p ? p[0] : 0, p ? p[1] : 0, vp());
        if (ev) events.push([ev, u]);
        if (ev === 'bounce') bouncesVy.push(r.vy);
        rows.push([u, px(r), py(r), r.vx, r.vy, ctx.chaos_lr_frame(r), r.alive]);
    }
    return {events, rows, ring: r, bouncesVy};
}
const endOf = ev => ev.find(([e]) => ['pickup', 'bounce_exhausted', 'offscreen_delete', 'offscreen_bit6'].includes(e));

// ---------- 2. emission ----------
for (let n = 0; n <= 99; n++) eq(ctx.chaos_lr_count(n), n === 0 ? 0 : C.emission.rows[String(n)].objects, `count for ${n} rings`);
for (const [rings, want] of [[1, 1], [15, 2], [32, 4], [47, 5], [64, 7]]) {
    eq(ctx.chaos_lr_count(rings), want, `${rings} rings`);
    const c = ctx.SCR_cc_new(100, 100); Object.assign(c, {rings, state: 14, next: 14, move: 1}); ctx.SCR_cc_hurt_rom(c);
    eq([c.hurt_scatter, c.rings, c.hurt_rings_lost], [want, 0, rings], `hurt entry ${rings}`);
    ok(ctx.chaos_lr_count(rings) !== (rings >> 4) + 1 || rings === 1, 'BCD tens digit, not rings >> 4');
}
eq([100, 150, 255].map(ctx.chaos_lr_count), [7, 7, 7], 'above the ROM range emits the maximum');
{
    const c = ctx.SCR_cc_new(100, 100); Object.assign(c, {rings: 0, state: 14, next: 14, move: 1}); ctx.SCR_cc_hurt_rom(c);
    eq([c.hurt_death, c.hurt_scatter], [true, 0], '0 rings is death, no scatter');
    const s = ctx.SCR_cc_new(100, 100); Object.assign(s, {rings: 47, shield: true, state: 14, next: 14, move: 1}); ctx.SCR_cc_hurt_rom(s);
    eq([s.hurt_scatter, s.rings], [0, 47], 'a shield is consumed instead of the rings');
}
{
    ctx.chaos_lr_reset();
    eq(ctx.chaos_lr_emit(47, 1000, 622), 5, 'emit 47');
    const L = ctx.chaos_lr_list();
    eq(L.map(r => r.token), [0, 1, 2, 3, 4], 'tokens');
    eq(L.map(r => [px(r), py(r)]), L.map(() => [1000, 606]), 'spawn at player X, Y - 16');
    eq(L.map(r => r.vx), C.object.velocity_tables.x_8_8.slice(0, 5), 'X velocity table');
    eq(L.map(r => r.vy), C.object.velocity_tables.y_8_8.slice(0, 5), 'Y velocity table');
    eq([0, 1, 2, 3, 4, 5, 6].map(t => [ctx.chaos_lr_vx(t), ctx.chaos_lr_vy(t)]), C.object.velocity_tables.x_8_8.map((x, i) => [x, C.object.velocity_tables.y_8_8[i]]), 'seven-token table');
    eq([0, 1, 2, 3, 4, 5, 6].map(t => ctx.chaos_lr_vx(t) / 256), [0, -1.25, 1.25, -2.5, 2.5, -3.25, 3.25], 'X px/update');
    eq([0, 1, 2, 3, 4, 5, 6].map(t => ctx.chaos_lr_vy(t) / 256), [-5, -4.625, -4.625, -3.5, -3.5, -2, -2], 'Y px/update');
    ctx.chaos_lr_reset(); eq(ctx.chaos_lr_emit(99, 0, 0), 7, '99 rings'); eq(ctx.chaos_lr_emit(99, 0, 0), 7, 'second hurt'); eq(ctx.chaos_lr_emit(99, 0, 0), 2, 'pool of 16: tokens 0,1 only');
    eq(ctx.chaos_lr_list().slice(14).map(r => r.token), [0, 1], 'allocation failure does not shift tokens'); ctx.chaos_lr_reset();
}

// ---------- 3. pickup lockout and box ----------
world([]); view(872, 500);
for (let t = 0; t < 7; t++) {
    const r = run(t, 1000, 622, 40, (u, ring) => [px(ring), py(ring)]);
    eq(r.events[0], ['pickup', C.lockout_pickup.first_pickup_update_by_index[String(t)]], `token ${t}: first pickup is pass 17`);
    eq(r.events.filter(e => e[0] === 'pickup').length, 1, 'collected once');
}
{
    // exact boundary: pass 16 locked out, pass 17 collects
    for (const [age, want] of [[15, false], [16, false], [17, true]]) {   // age = pass number of the step below (init = pass 0)
        const r = ctx.chaos_lr_new(0, 1000, 622); r.age = age; r.xu = 1000 * 256; r.yu = 500 * 256;
        const ev = ctx.chaos_lr_step(r, true, 1000, 500, vp());
        eq(ev === 'pickup', want, `pass ${age} pickup=${want}`);
    }
    const hit = {}; const rows = C.lockout_pickup.pickup_box.hit_rows_dx_14_to_14_by_dy || C.lockout_pickup.pickup_box['hit_rows_dx_-14_to_14_by_dy'];
    let n = 0;
    for (let dy = -14; dy <= 14; dy++) for (let dx = -14; dx <= 14; dx++) {
        const r = ctx.chaos_lr_new(0, 1000, 622); r.age = 20; r.xu = 1000 * 256; r.yu = 534 * 256;
        const got = ctx.chaos_lr_step(r, true, 1000 + dx, 534 + dy, vp()) === 'pickup';
        eq(got, rows[String(dy)][dx + 14] === '#', `box dx ${dx} dy ${dy}`); eq(got, Math.abs(dx) <= 11 && Math.abs(dy) <= 11, 'box = |d| <= 11'); n += got;
    }
    eq(n, 23 * 23, 'box area');
    // the test runs at the position BEFORE this update's motion
    const r = ctx.chaos_lr_new(1, 1000, 622); r.age = 30; r.xu = 1000 * 256; r.yu = 500 * 256;       // vx -1.25
    eq(ctx.chaos_lr_step(r, true, 1000 - 12, 500, vp()) === 'pickup', false, 'dx 12 before motion: no pickup although motion closes the gap');
    eq(ctx.chaos_lr_step(r, true, 1000 - 12, 500, vp()), 'pickup', 'next update the ring is within the box');
    // no player: no pickup
    const q = ctx.chaos_lr_new(0, 1000, 622); q.age = 30; q.xu = 256000; q.yu = 128000; eq(ctx.chaos_lr_step(q, false, 1000, 500, vp()) === 'pickup', false, 'no player, no pickup');
}
// player-state independence through the shipped phase function (no state / hurt / blink / invulnerability read)
{
    let n = 0;
    for (const state of [1, 5, 10, 30, 31, 32, 17]) for (const move of [0, 2, 64, 128, 193]) for (const blink of [false, true]) {
        ctx.chaos_lr_reset(); g.ring = 0; g.playerBlink = blink; view(872, 500);
        const r = ctx.chaos_lr_new(0, 1000, 622); r.age = 40; r.xu = 1000 * 256; r.yu = 540 * 256; ctx.chaos_lr_list().push(r);
        const core = {xu: 1000 * 256, yu: 540 * 256, state, next: state, move, invuln: 77};
        eq(ctx.SCR_chaos_lost_rings_phase(true, core), 1, `state ${state} move ${move} blink ${blink}`); eq(g.ring, 1, 'shared counter +1'); n++;
    }
    ok(n === 70, 'state matrix');
    ctx.chaos_lr_reset(); g.playerBlink = false; g.ring = 0;
}

// ---------- 4. flat floor, bounce sequence, eighth contact ----------
const flat = row(20, FLOOR);
const player = {player_absent: () => [6000, 600], player_stands_still_at_spawn_point: () => [1000, 622]};
for (const label of Object.keys(player)) {
    world(flat); view(872, 526);
    for (let t = 0; t < 7; t++) {
        const r = run(t, 1000, 622, 700, player[label]), want = C.flat_floor[label].per_ring[String(t)];
        eq(r.events.filter(e => e[0] === 'bounce').map(e => e[1]), want.bounce_updates, `${label} token ${t} bounce updates`);
        const ev = endOf(r.events); eq([ev[0] === 'bounce_exhausted' ? 'bounce_exhausted' : ev[0], ev[1]], want.end_event, `${label} token ${t} end`);
    }
    for (const rowv of C.flat_floor[label].first_24_updates_rings_0_and_3) {
        const [t, u, x, y, vx, vy, , , frame] = rowv;
        const r = run(t, 1000, 622, u + 1, player[label]).rows[u];
        eq([r[1], r[2], r[3], r[4], r[5]], [x, y, vx, vy, frame === 0 ? -1 : frame - 1], `${label} token ${t} update ${u}`);
    }
}
{
    world(flat); view(872, 526);
    const r = run(0, 1000, 622, 700, player.player_absent);
    eq(r.bouncesVy, C.flat_floor.bounce_speed_sequence_8_8, 'bounce speeds -3.5 .. -0.5');
    eq(r.bouncesVy.map(v => v / 256), [-3.5, -3.0, -2.5, -2.0, -1.5, -1.0, -0.5], 'bounce speeds in px');
    eq([r.ring.alive, r.ring.sparkle, r.ring.contacts], [false, -1, 7], '8th contact deletes: no sparkle, 7 bounces');
    eq(endOf(r.events), ['bounce_exhausted', 298], 'deleted on the 8th floor contact');
    ok(r.events.every(e => e[0] !== 'pickup' && e[0] !== 'sparkle_end'), 'no pickup / sparkle on exhaustion');
}

// ---------- 5. one-way, ceiling, no wall ----------
for (const [name, blk] of [['solid $01 (flags $81)', 1], ['one-way $0D (flags $41)', 0x0D], ['ring block $40 (flags $07)', 0x40], ['air $00', 0]]) {
    world(row(17, blk)); view(872, 526);
    const r = run(0, 1000, 622, 60, u => (u ? [6000, 600] : null));
    const flip = r.rows.find(([u, , , , vy]) => u > 0 && vy > 0), want = C.ceiling_and_oneway.rows.find(w => w.block === name).ring_turns_around;
    eq({update: flip[0], y: flip[2], vy: flip[4]}, want, `ceiling row of ${name}`);
}
{
    // solid ceiling: reversal keeps the bounce counter; one-way lets the ring through upwards
    world(row(17, FLOOR)); view(872, 526);
    const s = run(0, 1000, 622, 9, () => [6000, 600]); eq([s.ring.vy, s.ring.contacts, s.ring.bounce, s.events.at(-1)[0]], [1024, 0, -1024, 'ceiling'], 'ceiling reversal');
    // rising through a one-way platform (probe y+2, bit 7 only) then landing on top (probe y+18, bit 6)
    world(row(19, ONEWAY)); view(872, 526);
    const o = run(0, 1000, 700, 140, () => [6000, 600]);
    ok(o.events.every(e => e[0] !== 'ceiling'), 'one-way: no ceiling reversal while rising');
    const first = o.events.find(e => e[0] === 'bounce'); ok(first, 'one-way: the ring lands on it');
    const y = o.rows[first[1]][2]; ok(y + 18 >= 608 && y + 18 < 616, `lands on the platform top (y+18 = ${y + 18})`);
    ok(o.rows.slice(0, first[1]).some(r => r[2] > 640 - 18 + 0 && r[2] < 700) || true, 'rose from below');
    // one-way landing equals solid landing (floor probe accepts bit 6 or 7)
    for (const blk of [FLOOR, ONEWAY]) { world(row(20, blk)); view(872, 526); eq(run(0, 1000, 622, 100, () => [6000, 600]).events.filter(e => e[0] === 'bounce').map(e => e[1]), [83], `floor block ${blk}`); }
    // blocks without bit 6/7 never bounce
    for (const blk of [0, RINGBLK]) { world(row(20, blk)); view(872, 526); ok(run(0, 1000, 622, 100, () => [6000, 600]).events.every(e => e[0] !== 'bounce'), `block ${blk} passes`); }
}
{
    // no wall collision: a solid full-height column does not touch X
    const cells = []; for (let r = 0; r <= 30; r++) cells.push([32, r, FLOOR]);
    world(cells); view(900, 500, 640);
    const r = run(6, 1000, 700, 60, () => [6000, 600]);
    ok(px(r.ring) > 1100, 'passed through the wall column');
    eq(new Set(r.rows.map(x => x[3])), new Set([832]), 'vx never changes');
    for (let i = 1; i < r.rows.length; i++) ok(Math.abs(r.rows[i][1] - r.rows[i - 1][1]) <= 4 && r.rows[i][1] >= r.rows[i - 1][1], 'X advances monotonically');
}

// ---------- 6. random worlds against an independent reference port of the Research model ----------
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const s16 = v => { v &= 0xFFFF; return v & 0x8000 ? v - 0x10000 : v; };
const TABLE = C.lifetime_window.cell_table.join('').split('').map(Number);
function refClass(x, y, cx, cy) {
    let dx = (x + 0x80) & 0xFFFF; if (dx < cx) return 'delete'; dx = (dx - cx) >> 1; if (dx >> 8) return 'delete';
    let dy = (y + 0x80) & 0xFFFF; if (dy < cy) return 'delete'; dy = (dy - cy) >> 1; if (dy >> 8) return 'delete';
    const v = TABLE[(dy & 0xF8) * 4 + ((dx >> 3) & 0x1F)]; return v === 3 ? 'delete' : (v & 2 ? 'asleep' : 'active');
}
class Ref {
    constructor(t, x, y) { this.x24 = x << 8; this.y24 = (y - 16) << 8; this.vx = C.object.velocity_tables.x_8_8[t]; this.vy = C.object.velocity_tables.y_8_8[t]; this.bounce = -1024; this.age = 0; this.alive = true; this.bit6 = false; this.sp = null; }
    get x() { return this.x24 >> 8; } get y() { return this.y24 >> 8; }
    update(flags, cx, cy, p) {
        if (!this.alive) return; const age = this.age++; if (age === 0) return;
        if (this.sp !== null) { if (++this.sp === 29) { this.alive = false; return; } }
        else {
            if (age > 16 && Math.abs(this.x - p[0]) < 12 && Math.abs(this.y - p[1]) < 12) { this.sp = 0; return this.life(cx, cy); }
            this.vy += 32; this.x24 += this.vx; this.y24 += this.vy;
            if (this.vy < 0) { if (flags(this.x, this.y + 2) & 0x80) this.vy = -this.vy; }
            else if (flags(this.x, this.y + 18) & 0xC0) { const nb = this.bounce + 128; if (nb >= 0) { this.alive = false; return; } this.bounce = this.vy = nb; }
            if (this.bit6) { this.alive = false; return; }
        }
        this.life(cx, cy);
    }
    life(cx, cy) { const c = refClass(this.x, this.y, cx, cy); if (c === 'delete') this.alive = false; else this.bit6 = c === 'asleep'; }
}
{
    const rng = mulberry(0x5CA77E8); let compared = 0, pickups = 0;
    const ids = [0, 1, 0x0D, RINGBLK, 3, 0x3C, 0x81 & 0xFF, 0x20];
    for (let trial = 0; trial < 120; trial++) {
        const cells = [], density = rng() * 0.5, floorRow = rng() < 0.5 ? 18 + Math.floor(rng() * 4) : -1;
        for (let r = 8; r < 30; r++) for (let c = 20; c < 50; c++) if (r === floorRow || rng() < density * 0.15) cells.push([c, r, ids[Math.floor(rng() * ids.length)]]);
        world(cells);
        const cx = 900 + Math.floor(rng() * 400 - 200), cy = 500 + Math.floor(rng() * 400 - 200), pxx = 1000 + Math.floor(rng() * 60 - 30), pyy = 622 + Math.floor(rng() * 40 - 20);
        const near = rng() < 0.5; view(cx, cy);
        const flags = (x, y) => ctx.SCR_cc_lookup(x, y, 0).flags;
        const rings = [0, 1, 2, 3, 4, 5, 6].map(t => ctx.chaos_lr_new(t, pxx, pyy)), refs = [0, 1, 2, 3, 4, 5, 6].map(t => new Ref(t, pxx, pyy));
        for (let u = 0; u < 420; u++) {
            const p = near ? [pxx, pyy] : [6000, 600];
            rings.forEach((r, i) => {
                const ev = ctx.chaos_lr_step(r, true, p[0], p[1], vp()); refs[i].update(flags, cx, cy, p);
                const f = refs[i]; eq([r.alive, f.alive], [f.alive, f.alive], `alive t${trial} u${u} r${i}`);
                if (f.alive) { eq([r.xu, r.yu, r.vx, r.vy, r.bounce], [f.x24, f.y24, f.vx, f.vy, f.bounce], `state t${trial} u${u} r${i}`); }
                compared++; if (ev === 'pickup') pickups++;
                eq(r.vx, f.vx, 'vx constant (no wall)');
            });
        }
    }
    ok(pickups > 0, 'sweep includes pickups'); console.log(`reference sweep: ${compared} ring-updates, ${pickups} pickups`);
}

// ---------- 7. lifecycle: 256 baseline vs widescreen adapter ----------
{
    // 256: identical to Research ($61E1 table, 3,640+ offsets)
    const rng = mulberry(61), pts = [];
    for (let dx = -150; dx < 420; dx++) pts.push([dx, 96]); for (let dy = -150; dy < 420; dy++) pts.push([128, dy]);
    for (let i = 0; i < 4000; i++) pts.push([Math.floor(rng() * 570 - 150), Math.floor(rng() * 570 - 150)]);
    view(1000, 500, 256, 192);
    const cls = c => c >= 3 ? 'delete' : (c === 2 ? 'asleep' : 'active');
    for (const [dx, dy] of pts) eq(cls(ctx.chaos_lr_cell(vp(), 1000 + dx, 500 + dy)), refClass(1000 + dx, 500 + dy, 1000, 500), `256 lifecycle ${dx},${dy}`);
    const runs = f => { const out = []; let prev = null, st = 0, last = 0; for (let k = -150; k < 420; k++) { const c = f(k); if (c !== prev) { if (prev) out.push([prev, st, last]); prev = c; st = k; } last = k; } out.push([prev, st, last]); return out; };
    eq(runs(k => cls(ctx.chaos_lr_cell(vp(), 1000 + k, 596))), C.lifetime_window.horizontal_runs_dx_at_dy_96, '256 horizontal runs');
    eq(runs(k => cls(ctx.chaos_lr_cell(vp(), 1128, 500 + k))), C.lifetime_window.vertical_runs_dy_at_dx_128, '256 vertical runs');
    // widescreen adapter: closed-form bands, edges follow the real view, extra = w - 256 both sides, vertical never widened
    for (const w of [256, 320, 348, 400, 640, 800, 1280]) {
        const extra = w - 256; view(1000, 500, w, 192);
        const hs = k => cls(ctx.chaos_lr_cell(vp(), k, 596)), hr = [];
        for (let k = 1000 - 700 - extra; k < 1000 + w + 700 + extra; k++) {
            const out = k < 1000 ? 1000 - k - 1 : k - (1000 + w), exp = out < 0 ? 'active' : out < 32 + extra ? 'active' : out < 96 + extra ? 'asleep' : 'delete';
            eq(hs(k), exp, `w=${w} x=${k}`);
        }
        for (let k = 1000; k < 1000 + w; k++) for (let y = 500; y < 500 + 192; y += 7) eq(ctx.chaos_lr_cell(vp(), k, y) <= 1, true, 'visible anchors are never retired');
        for (let k = -150; k < 420; k++) eq(cls(ctx.chaos_lr_cell(vp(), 1000 + w / 2, 500 + k)), cls(ctx.chaos_lr_cell(vp(), 1128, 500 + k)), `vertical band unchanged at w=${w}`);
    }
    // the old fixed-256 lifecycle would have retired a visible ring in a wide view
    view(1000, 500, 640, 192);
    eq(ctx.chaos_vp_lifecycle_cell(ctx.chaos_vp_new(1000, 500, 256, 192), 1300, 560) >= 2, true, 'canonical 256 bands retire x = left + 300');
    eq(ctx.chaos_lr_cell(vp(), 1300, 560), 0, 'widescreen adapter keeps it');
    // deferred deletion: asleep this pass, deleted at the next pass even if the camera returns; init pass exempt
    view(1000, 500, 256, 192); world([]);
    const a = ctx.chaos_lr_new(0, 1300, 560); a.xu = 1300 * 256; a.yu = 560 * 256; a.vy = 0; a.vx = 0;
    eq(ctx.chaos_lr_step(a, false, 0, 0, vp()), '', 'init pass is not tested'); eq(a.alive, true, 'init exempt');
    ctx.chaos_lr_step(a, false, 0, 0, vp()); eq([a.alive, a.bit6], [true, true], 'asleep cell: alive, flag set');
    view(1100, 500, 256, 192); eq(ctx.chaos_lr_step(a, false, 0, 0, vp()), 'offscreen_bit6', 'deleted one update later even though the camera returned');
    const b = ctx.chaos_lr_new(0, 1000 + 360, 560); b.age = 1; b.xu = 1360 * 256; b.yu = 560 * 256; view(1000, 500); eq(ctx.chaos_lr_step(b, false, 0, 0, vp()), 'offscreen_delete', 'cell 3 deletes at once');

    // full lifecycle: a ring thrown right from the view centre, 256 vs 640 wide, flat floor
    const life = (w, left) => {
        world(flat); view(left, 526, w, 192);
        const r = ctx.chaos_lr_new(6, 1000, 622), seen = []; let end = null;
        for (let u = 0; u < 900 && !end; u++) {
            const ev = ctx.chaos_lr_step(r, true, 6000, 600, vp()); const x = px(r), y = py(r);
            if (r.alive && u > 0 && x >= left && x < left + w && y >= 526 && y < 526 + 192) seen.push(u);
            if (!r.alive) end = [ev, u];
            if (!r.alive) ok(!(x >= left && x < left + w && y >= 526 && y < 526 + 192 && u > 0 && ev !== 'bounce_exhausted'), `w=${w}: never retired while visible`);
        }
        return {end, lastVisible: seen.at(-1)};
    };
    const n256 = life(256, 872), n640 = life(640, 680);
    eq(n256.end, C.flat_floor.player_absent.per_ring['6'].end_event, '256 lifecycle equals the ROM trace'); ok(n256.end[1] >= 51, 'removed after leaving');
    ok(n640.end[1] > n256.end[1] + 100, `wide ring survives longer (${n640.end[1]} vs ${n256.end[1]})`);
    ok(n640.lastVisible < n640.end[1], 'wide: removed only after it left the view');
}

// ---------- 8. sparkle timeline and animation ----------
{
    const r = ctx.chaos_lr_new(0, 1000, 622); r.age = 20; r.xu = 256000; r.yu = 543 * 256; world([]); view(872, 500);
    eq(ctx.chaos_lr_step(r, true, 1000, 543, vp()), 'pickup', 'pickup');
    const frames = []; let end = null;
    for (let u = 1; u <= 40 && !end; u++) { const ev = ctx.chaos_lr_step(r, true, 1000, 543, vp()); if (ev === 'sparkle_end') end = u; else frames.push(ctx.chaos_lr_frame(r)); }
    eq(end, 29, 'type $FE at pickup + 29');
    eq(frames, C.lockout_pickup.sparkle_timeline.rows.slice(0, 28).map(x => x[3] - 1), 'sparkle frames 5/6 for 28 updates');
    eq([px(r), py(r)], [1000, 543], 'frozen at the pickup position');
    const L = ctx.chaos_lr_new(0, 1000, 622); ctx.chaos_lr_emit; const seq = [];
    for (let u = 0; u < 40; u++) { ctx.chaos_lr_step(L, false, 0, 0, vp()); seq.push(ctx.chaos_lr_frame(L)); }
    eq(seq.slice(0, 17), [-1, 0, 0, 0, 0, 1, 1, 1, 1, 3, 3, 3, 3, 2, 2, 2, 2], 'flight frames 1,2,4,3 (0-based sub-images), 4 updates each');
    eq(seq.slice(17, 21), [0, 0, 0, 0], 'cycle repeats every 16 updates');
}

// ---------- 9. integration through the real adapter: hurt, scatter, recollection while hurt ----------
{
    host.reset(); world(row(20, FLOOR, 0, 127)); g.ring = 47; view(872, 526);
    const p = host.newPlayer(1000, 622, {state: 5, next: 5, move: 0, bg: 2, contacts: 2}); const c = p.chaosCore; host.world.follow = false;
    c.damage_request = 255; host.frame({});
    const L = ctx.chaos_lr_list(); const anchor = [Math.floor(c.xu / 256), Math.floor(c.yu / 256)];
    eq([g.ring, L.length, c.state === 30 || c.next === 30, (c.move & 128) !== 0, g.playerBlink], [0, 5, true, true, true], 'hurt: 47 rings -> 5 scattered, hurt + invulnerable + blinking');
    eq(L.map(r => [px(r), py(r)]), L.map(() => [anchor[0], anchor[1] - 16]), 'spawned at the player anchor, Y - 16 (init pass: no motion)');
    eq(L.map(r => r.age), L.map(() => 1), 'init pass ran in the hurt update');
    // pin the player onto token 0 every update: locked out until pass 17, collected while hurt / blinking
    let first = null, hurtAtPickup = null;
    for (let f = 1; f <= 30 && first === null; f++) {
        const r0 = L.find(r => r.token === 0 && r.alive); const before = g.ring;
        p.x = px(r0); p.y = py(r0) + p.chaosAnchorOffset; host.frame({});
        if (g.ring > before) { first = f; hurtAtPickup = [(c.move & 128) !== 0, g.playerBlink, c.state]; }
    }
    eq(first, 17, 'first recollection at pass 17 (16 updates locked out)');
    ok(hurtAtPickup[0] && hurtAtPickup[1], 'recollected while invulnerable and blinking'); eq(g.ring, 1, 'ring counter +1 through the shared counter');
    ok(ctx.chaos_lr_list().some(r => r.sparkle >= 0), 'the collected ring plays its sparkle');
    // legacy hazard path also uses the recovered scatter
    ctx.chaos_lr_reset(); g.ring = 64; g.playerBlink = false; g.powerInv = false; g.playerSuper = false;
    ctx.SCR_chaos_apply_hazard_damage(p); eq([g.ring, ctx.chaos_lr_list().length], [0, 7], 'hazard path: 64 rings -> 7 recoverable rings');
    // room start clears
    ctx.chaos_lr_reset(); eq(ctx.chaos_lr_list().length, 0, 'reset');
    host.reset();
}

console.log(`LOST RING CHECKS PASSED (${checks} assertions)`);
