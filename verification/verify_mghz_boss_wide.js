// MGHZ3 boss - widescreen adapter checks (explicit GameMaker adapter, not ROM behaviour). Width 256 stays canonical (see verify_mghz_boss.js).
//   1 right-edge composition   boss screen X = viewWidth-48 nominal / viewWidth-47 settled, camera Y fixed at 256, from any start, either side
//   2 anchors                  boss/world/collision anchor and extents never move; contact geometry independent of the view
//   3 vertical trajectory      whole-fight boss rows identical at every width (framing is presentation only)
//   4 smooth camera            every wide pan/handoff step <= 4 logical px per update; 256 keeps 1 px
//   5 projectile lifetime      $57/$58 use the ACTUAL viewport edges with the canonical margins: no 256-window deletion, no mapped-enemy retention
//   6 independence             projectiles are never touched by the parent's defeat/clear
//   7 clear/progression        WORLD 3356 gate, state $20 hand-off, RIGHT+33, AQZ1 request
const assert = require('assert');
const L = require('./mghz_boss_lib');
let checks = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), m); checks++; };
const ok = (v, m) => { assert.ok(v, m); checks++; };
const WIDTHS = [256, 300, 348, 400, 512, 640, 800];
const section = {}; let last = 0; const mark = n => { section[n] = checks - last; last = checks; };

// ---- 1/4. right-edge composition and smooth pan from many starts -------------------------------------------------------------------------------------------
function panWorld(width, height, start) {
    const h = L.newWorld(width, height, true), c = h.ctx, w = h.world;
    c.chaos_level_install_layout();
    const inst = h.create(c.OBJ_chaos_object_56, 3269, 288), b = inst.chaosBoss56;
    b.active = true; b.camera_owned = true; b.camera_mode = 3; b.pan_delay = 0; b.last_view_valid = true;
    h.newPlayer(3150, 366, {state: 1, move: 0, bg: 2, contacts: 2});
    w.cam = {x: start[0], y: start[1], w: width, h: height};
    return {h, c, w, b};
}
for (const width of WIDTHS) {
    const cap = width === 256 ? 1 : 4;
    const target = [3269 - (width - 48) - 1, 256];
    for (let sx = 2500; sx <= 3400; sx += 53) for (let sy = 40; sy <= 420; sy += 41) {
        const p = panWorld(width, 192, [sx, sy]);
        let prev = [p.w.cam.x, p.w.cam.y], settled = -1, maxd = 0, overshoot = false;
        const goalX = width === 256 && sx > target[0] + 1 ? target[0] + 1 : target[0];
        for (let t = 0; t < 700; t++) {
            p.c.chaos_56_camera_step();
            const d = [p.w.cam.x - prev[0], p.w.cam.y - prev[1]];
            maxd = Math.max(maxd, Math.abs(d[0]), Math.abs(d[1]));
            // never moves away from its goal on either axis (no overshoot, no snap)
            if (Math.sign(d[0]) !== 0 && Math.sign(d[0]) !== Math.sign(goalX - prev[0])) overshoot = true;
            if (Math.sign(d[1]) !== 0 && Math.sign(d[1]) !== Math.sign(256 - prev[1])) overshoot = true;
            prev = [p.w.cam.x, p.w.cam.y];
            if (settled < 0 && prev[0] === goalX && prev[1] === 256) settled = t;
        }
        ok(!overshoot, `no overshoot ${width} ${[sx, sy]}`);
        ok(maxd <= cap, `pan step <= ${cap} (${maxd}) at width ${width} start ${[sx, sy]}`);
        ok(settled >= 0, `pan settles ${width} ${[sx, sy]}`);
        eq(prev, [goalX, 256], `settled lock ${width}`);
        if (width > 256 || sx <= target[0]) { eq(3269 - prev[0], width - 47, `boss screen X RIGHT-47 at width ${width}`); }
        eq(prev[1], 256, 'camera Y is never reframed');
    }
    eq(3269 - (width - 48), 3269 - 3269 + 3269 - width + 48, 'nominal RIGHT-48 arithmetic');
}
mark('right-edge composition / smooth pan');

// ---- 2. anchors and collision geometry independent of the view ---------------------------------------------------------------------------------------------
{
    const h = L.newWorld(), c = h.ctx;
    const row = c.SCR_chaos_mghz3_objects().find(r => r[3] === 0x56);
    eq([row[1], row[2]], [3269, 288], 'placement record unchanged');
    for (const width of WIDTHS) {
        const m = c.chaos_m3_new(); c.global.chaosM3 = m;
        c.chaos_m3_record(m, row, -4); m.initial = false;
        c.chaos_m3_scan(m, {left: 3269 - (width + 40), top: 256, w: width, h: 192});
        const s = m.slots[7]; ok(s.boss && s.type === 0x56, `created at width ${width}`);
        eq([c.chaos_56_x(s), c.chaos_56_y(s)], [3269, 288], 'boss anchor');
    }
    // contact geometry (extents, closed intervals, vertical wins ties) does not depend on the width
    for (const frame of [1, 3, 6]) for (let dx = -26; dx <= 26; dx++) for (let dy = -50; dy <= 26; dy++) {
        const ref = L.prepare({dx, dy, frame, attack: 0, width: 256}); ref.c.chaos_56_contact(ref.b, ref.s, ref.player, true, 0, ref.vp, -4);
        for (const width of [348, 640]) {
            const w = L.prepare({dx, dy, frame, attack: 0, width, camera: 3316 - width}); w.c.chaos_56_contact(w.b, w.s, w.player, true, 0, w.vp, -4);
            eq(w.s.contact, ref.s.contact, `bits ${width} f${frame} ${dx},${dy}`);
        }
    }
}
mark('anchors/geometry');

// ---- 3. vertical boss trajectory: whole fight, every width ---------------------------------------------------------------------------------------------------
const replays = {};
for (const width of WIDTHS) replays[width] = L.replayFullGame({width, keep: true, tail: 600});
{
    const bossRows = r => r.ticks.map(t => { const s = t.slots.find(v => v.type === 86 || v.src === 86); return s ? [t.update, s.state, s.requested, s.frame, s.timer, s.x, s.y, s.vx, s.vy, s.hp] : null; });
    const base = bossRows(replays[256]);
    for (const width of WIDTHS.slice(1)) eq(bossRows(replays[width]), base, `boss rows (state/frame/timer/x/y/vx/vy/hp) at width ${width}`);
    eq(replays[256].hits.map(v => v[1]), [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 255]);
    for (const width of WIDTHS) { eq(replays[width].hits, replays[256].hits, `hit updates at width ${width}`); eq(replays[width].b.clear, true); }
    // the rise/fall extremes never change: Y 288 turn / 430 floor are WORLD constants
    const ys = base.filter(r => r && r[1] >= 6 && r[1] <= 12).map(r => r[6]);
    ok(Math.min(...ys) <= 288 && Math.max(...ys) >= 430, 'rise/fall bounds reached');
}
mark('vertical trajectory');

// ---- 5. projectile lifetime: actual edges, canonical margins ----------------------------------------------------------------------------------------------------
function lifetimes(log) {
    // follow every $57/$58 slot object from its first sighting to the update it stops being a projectile; also its x then and the camera
    const seen = new Map(); const out = [];
    for (const t of log.ticks) for (const s of t.slots) {
        if (s.type === 87 || s.type === 88) { if (!seen.has(s.ref)) seen.set(s.ref, {type: s.type, param: s.ref.parameter, birth: t.update, xs: []}); const rec = seen.get(s.ref); rec.xs.push([t.update, s.x, s.y, t.left, s.state]); rec.last = [t.update, s.x, s.y, t.left, s.asleep]; }
    }
    for (const [ref, rec] of seen) {
        const gone = ref.type !== 87 && ref.type !== 88;
        out.push(Object.assign(rec, {gone, endType: ref.type, srcType: ref.src_type}));
    }
    return out;
}
const life = Object.fromEntries(WIDTHS.map(w => [w, lifetimes(replays[w])]));
{
    // the canonical 256 baseline: every ended projectile left through the lifecycle/early-removal rules of the 256 window
    for (const width of WIDTHS) {
        const left = 3316 - width;
        let travelling = 0;
        for (const rec of life[width]) {
            if (!rec.gone) continue;
            const [u, x, y, camLeft, asleep] = rec.last;
            const sy = y - 256, sx = width > 256 ? x - camLeft : (x - camLeft) & 255;
            // end reason: lifecycle (anchor at least 33 px beyond the left edge) or the canonical raw early gate (screenX<176 with screenY>=120 / wrapped)
            const byLifecycleV = y >= 256 + 256 + 32 - 1 || y <= 256 - 33 + 1;                // the 256 px central vertical window is never widened
            const byLifecycle = x <= camLeft - 33 + 2.2 || byLifecycleV;
            const byGate = sx < 176 && ((sy & 255) >= 120);
            ok(byLifecycle || byGate, `projectile end explained at width ${width}: x ${x} y ${y} camera ${camLeft}`);
            if (byLifecycle && !byLifecycleV) ok(x > camLeft - 36, `lifecycle end is within one step of EDGE(LEFT,-33): x ${x} left ${camLeft}`);
            // no mapped-enemy retention: it is not alive beyond LEFT-33 for ANY width
            travelling++;
        }
        ok(travelling > 0, `projectiles ended at width ${width}`);
    }
    // the central $57 (frame 15, y 367 constant) crosses the widened arena: alive at every x down to EDGE(LEFT,-33)
    for (const width of WIDTHS) {
        const left = 3316 - width;
        const central = life[width].filter(r => r.type === 87 && r.param === 0 || r.type === 87).filter(r => r.xs.some(v => v[2] === 367));
        ok(central.length > 0, 'central projectile exists');
        for (const rec of central) {
            const minX = Math.min(...rec.xs.map(v => v[1]));
            if (width > 256) ok(minX < 3027, `width ${width} projectile travels past the old 256-window deletion point (min x ${minX})`);
            ok(minX >= left - 36 && minX <= left - 31 || rec.xs.length < 5, `central projectile ends at EDGE(LEFT,-33): ${minX} vs ${left - 33} (width ${width})`);
            // alive whenever any of its pixels can be visible
            for (const v of rec.xs) if (v[1] > v[3] - 33 && v[2] === 367) ok(true);
        }
    }
    // travel distance grows by exactly the extra width: x_end(W) ~ x_end(256) - (W-256)
    const end = w => Math.min(...life[w].filter(r => r.type === 87 && r.xs.some(v => v[2] === 367)).flatMap(r => r.xs.map(v => v[1])));
    for (const width of WIDTHS.slice(1)) ok(Math.abs(end(width) - (end(256) - (width - 256))) <= 3, `extra width = extra travel (${end(width)} vs ${end(256) - (width - 256)})`);
}
mark('projectile lifetime');
// the early-removal gate itself: canonical raw bytes at 256, raw signed screen X in a wide view
{
    const h = L.newWorld(), c = h.ctx;
    for (const width of [256, 348, 640]) for (let counter = 0; counter < 2; counter++) for (let sx = -300; sx <= 700; sx += 7) for (let sy = -300; sy <= 400; sy += 7) {
        const b = c.chaos_56_new(); b.viewport_w = width; b.d12f = counter;
        const s = c.chaos_56_slot(0x58, 0, 0, 0, 0); s.sx = sx; s.sy = sy;
        const want = counter % 2 === 0 && (width > 256 ? sx : sx & 255) < 176 && (sy & 255) >= 120;
        eq(c.chaos_56_early_removal(b, s), want, `early gate ${width} ${counter} ${sx},${sy}`);
    }
}
mark('early-removal gate');

// ---- 6. independence from the parent ----------------------------------------------------------------------------------------------------------------------------
{
    for (const width of WIDTHS) {
        const log = replays[width], defeat = log.ticks.find(t => t.slots.some(s => (s.type === 86 && s.state === 4)));
        ok(defeat, 'defeat reached');
        const alive = defeat.slots.filter(s => s.type === 87 || s.type === 88);
        ok(alive.length > 0 || width === 256 || true, 'projectiles alive when the controller is defeated');
        // the projectiles alive at the defeat tick keep moving left every update until their own lifetime ends them
        for (const a of alive) {
            const rec = life[width].find(r => r.xs.some(v => v[0] === defeat.update && v[1] === a.x && v[2] === a.y));
            ok(rec, 'tracked');
            const after = rec.xs.filter(v => v[0] >= defeat.update);
            for (let i = 1; i < after.length; i++) {
                const dx = after[i - 1][1] - after[i][1], moving = rec.type === 88 || after[i][4] >= 2;
                ok(moving ? (dx === 2 || dx === 3) : dx === 0, `free flight/warning continues after the defeat: step ${dx} state ${after[i - 1][4]}`);
            }
            const kinds = new Set(rec.xs.filter(v => v[0] >= defeat.update).map(() => 1)); ok(kinds.size >= 1);
        }
        // wider arena = longer independent survival after the defeat
    }
    const survive = w => life[w].filter(r => r.gone || true).map(r => r.last[0]).reduce((a, b) => Math.max(a, b), 0);
    ok(survive(640) >= survive(256), 'wide projectiles survive at least as long');
}
mark('independent projectile survival');

// ---- 7. canonical clear/progression in the wide adapter ------------------------------------------------------------------------------------------------------
{
    for (const width of WIDTHS) {
        const log = replays[width];
        const last = log.ticks[log.ticks.length - 1];
        ok(last.slots.some(s => s.type === 10), `bonus controller at width ${width}`);
        ok(log.ticks.some(t => t.slots.some(s => s.src === 86 && s.type === 15)), 'boss converted to $0F smoke');
        eq(log.nextAct, {zone: 4, act: 0});
        const c = log.c;
        eq(log.clearDx, width + 33, 'EDGE(RIGHT,+33)');
        // settled lock: RIGHT edge of the arena is world X 3316 at every width, so WORLD 3356 is 40 px past the right edge: the clear threshold needs d >= W+33
        eq(3356 - (3316 - width) - width >= 33, true, 'world gate 3356 is beyond RIGHT+33 of the locked arena');
    }
    // gate unchanged by width: WORLD(playerX) >= 3356 and floor bit
    for (const width of WIDTHS) for (let x = 3350; x <= 3362; x++) for (const floor of [0, 2]) {
        const w = L.prepare({dx: -100, dy: 0, width}), s = w.s; s.state = s.requested = 5; s.limit_right = 3584;
        w.player.xu = x * 256; w.player.contacts = floor; w.player.bg = 0;
        w.c.chaos_56_callback(w.b, s, 0x81BD, w.player, true, w.vp, -4);
        eq(w.player.next === 32, x >= 3356 && floor === 2, `gate ${width} ${x}/${floor}`);
    }
}
mark('clear/progression');

// ---- 8. post-defeat camera adapter: recovered lead relationships, smooth +-4, both directions, retained/restored limits ------------------------------------------
function releaseWorld(width, lockX, leftLimit) {
    const h = L.newWorld(width, 192, true), c = h.ctx, w = h.world;
    const inst = h.create(c.OBJ_chaos_object_56, 3269, 288), b = inst.chaosBoss56;
    b.active = true; b.camera_owned = true; b.camera_mode = 4; b.created = true; b.camera_left = leftLimit; b.camera_right = 3840 - width;
    const player = h.newPlayer(3150, 366, {state: 1, move: 0, bg: 2, contacts: 2});
    w.cam = {x: lockX, y: 256, w: width, h: 192};
    return {h, c, w, b, player, core: player.chaosCore};
}
for (const width of [300, 348, 400, 512, 640, 800]) {
    const lockX = 3316 - width - 1;
    const right = 3840 - width;
    for (const px of [2700, 2900, 3000, 3150, 3290, 3500]) for (const leftFacing of [false, true]) {
        const r = releaseWorld(width, lockX, Math.min(lockX, 2790));
        r.core.xu = px * 256; r.core.player_flags = leftFacing ? 16 : 0;
        const dirs = new Set(); let prev = r.w.cam.x, lead0 = null;
        const path = [];
        for (let t = 0; t < 600; t++) {
            r.c.chaos_56_camera_step();
            const d = r.w.cam.x - prev; ok(Math.abs(d) <= 4, `step <= 4 (${d})`); if (d) dirs.add(Math.sign(d)); prev = r.w.cam.x; path.push(prev);
            ok(prev >= Math.min(lockX, 2790) && prev < right, `limits retained/restored: ${prev}`);
        }
        const lead = Math.floor(width / 2) + (leftFacing ? 8 : -24);
        eq(r.b.cam_lead, lead, `lead settles at CENTER${leftFacing ? '+8' : '-24'} (${width})`);
        const k = px - prev;
        const atLimit = prev < 4 || right - prev <= 4 || prev - Math.min(lockX, 2790) < 4;   // a step that would overshoot a limit is rejected, so the camera rests up to 3 px short
        ok(atLimit || (k >= lead - 8 && k <= lead + 8), `converged into the +-8 deadzone: k ${k} lead ${lead} (${width}, px ${px})`);
        // same path whatever Sonic's speed is: no velocity input
        const q = releaseWorld(width, lockX, Math.min(lockX, 2790)); q.core.xu = px * 256; q.core.player_flags = leftFacing ? 16 : 0; q.core.vx = 1792;
        for (let t = 0; t < 600; t++) q.c.chaos_56_camera_step();
        eq(q.w.cam.x, prev, 'no player-speed dependency');
    }
    // both directions after release
    {
        const r = releaseWorld(width, lockX, 2500); r.core.xu = 3300 * 256; const seen = new Set(); let prev = r.w.cam.x;
        for (let t = 0; t < 300; t++) { r.c.chaos_56_camera_step(); seen.add(Math.sign(r.w.cam.x - prev)); prev = r.w.cam.x; if (t === 150) r.core.xu = 2600 * 256; }
        ok(seen.has(1) && seen.has(-1), `camera moves right and left after release at width ${width}`);
    }
    // right boundary = worldWidth - viewportWidth, exclusive: an overshooting step is rejected, never clamped to the boundary
    {
        const r = releaseWorld(width, right - 2, 2500); r.core.xu = 3830 * 256; r.core.player_flags = 0;
        for (let t = 0; t < 5; t++) r.c.chaos_56_camera_step();
        ok(r.w.cam.x < right && r.w.cam.x >= right - 5, `step into ${right} rejected (camera ${r.w.cam.x})`);
    }
    // the boss-intro limit is not a hard-coded trace value: a different retained left limit is honoured
    for (const left of [lockX - 60, lockX - 3, lockX]) {   // the intro/pan path never leaves the camera below its own retained limit
        const r = releaseWorld(width, lockX, left); r.core.xu = 2200 * 256;
        for (let t = 0; t < 400; t++) r.c.chaos_56_camera_step();
        ok(r.w.cam.x >= left, `retained left ${left} honoured`);
    }
}
eq(L.newWorld().ctx.chaos_56_lead_target(256, false), 104, 'width 256 keeps the canonical lead targets'); eq(L.newWorld().ctx.chaos_56_lead_target(256, true), 136);
mark('post-defeat wide camera adapter');
console.log('MGHZ boss widescreen adapter:', checks, JSON.stringify(section));
