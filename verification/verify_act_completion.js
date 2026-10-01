// Executes the shipped act-clear chain (type $18 -> $19 -> player state $20 -> act clear -> progression) against ROM-recovered rules
// (sonic-chaos-reference-work docs/object-18-act-clear.md, f138130). THZ1 and THZ2 run through the identical functions.
// This proves logic only; it is not proof of Windows-visible behaviour.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const gml = n => rd(`scripts/${n}/${n}.gml`);
const hex = s => s.replace(/\$([0-9A-Fa-f]+)/g, '0x$1').replace(/#macro (\w+) (\S+)/g, 'var $1 = $2;');
const g = {zoneGoto: 1, minutes: 1, seconds: 5, ring: 12, chaosComplete: false, chaosGoalContact: false};
let saved = 0, alarms = 0, room = 'thz1';
const ctx = vm.createContext({global: g, floor: Math.floor, round: Math.round, abs: Math.abs, min: Math.min, max: Math.max, sign: Math.sign,
    clamp: (v, a, b) => Math.min(Math.max(v, a), b), array_create: (n, v) => Array(n).fill(v), array_length: a => a.length,
    array_push: (a, v) => a.push(v), array_copy: (d, di, s, si, n) => { for (let i = 0; i < n; i++) d[di + i] = s[si + i]; },
    variable_global_exists: k => k in ctx.global, is_array: Array.isArray,
    ROM_chaos_thz1: 'thz1', ROM_chaos_thz2: 'thz2', SCR_save_game: () => { saved++; }, noone: -4,
    ctx_alarm: () => { alarms++; },
    get room() { return room; }});
for (const n of ['SCR_chaos_motion_data', 'SCR_chaos_core_data', 'SCR_chaos_core', 'SCR_chaos_level_thz2_data', 'SCR_chaos_box_contact'])
    vm.runInContext(gml(n), ctx, {filename: n + '.gml'});
vm.runInContext(hex(gml('SCR_chaos_viewport')), ctx, {filename: 'SCR_chaos_viewport.gml'});
vm.runInContext(hex(gml('SCR_chaos_goal')), ctx, {filename: 'SCR_chaos_goal.gml'});
ctx.SCR_chaos_motion_data(); ctx.SCR_chaos_core_data();
const thz1Ids = ctx.global.chaosTileIds.slice();
const thz2Ids = ctx.SCR_chaos_thz2_tile_ids().slice();
const level = gml('SCR_chaos_level');
const tail = level.slice(level.indexOf('function chaos_acts()'));
const pure = tail.slice(0, tail.indexOf('/// Type $18 contact'));   // act table, progress, index_for_room, chaos_act_complete
vm.runInContext(pure.replace(/\bmod\b/g, '%'), ctx, {filename: 'SCR_chaos_level.gml'});
const beginSrc = tail.slice(tail.indexOf('function chaos_goal_begin'), tail.indexOf('/// Camera for the act-clear chain'));
assert.ok(beginSrc.includes('with (OBJ_count_time) alarm[0] = -1;'));
vm.runInContext(beginSrc.replace('with (OBJ_count_time) alarm[0] = -1;', 'ctx_alarm();'), ctx);

// ---------- 1. contact geometry: shared overlap, Sonic 8 x 24 vs sign 12 x 42, inclusive, both directions ----------
const SX = 3960, SY = 558;
const expectedBox = (dx, dy) => Math.abs(dx) <= 20 && dy >= -42 && dy <= 24;
let cells = 0;
for (let dx = -30; dx <= 30; dx++) for (let dy = -55; dy <= 40; dy++) {
    assert.strictEqual(ctx.chaos_goal_contact(SX + dx, SY + dy, 256, 1, SX, SY), expectedBox(dx, dy), `box ${dx},${dy}`);
    cells++;
}
for (const [dx, dy, want] of [[20, 0, true], [21, 0, false], [-20, 0, true], [-21, 0, false], [0, 24, true], [0, 25, false],
    [0, -42, true], [0, -43, false], [20, 24, true], [-20, -42, true], [21, 25, false]])
    assert.strictEqual(ctx.chaos_goal_contact(SX + dx, SY + dy, 256, 1, SX, SY), want, `edge ${dx},${dy}`);
// 8 x 24 specifically: a (superseded) 9 x 18 player would reach dx 21 and stop at dy 18
assert.strictEqual(ctx.chaos_goal_contact(SX, SY + 24, 1, 1, SX, SY), true);
assert.strictEqual(ctx.chaos_goal_contact(SX + 21, SY, 1, 1, SX, SY), false);
// gate: stationary never triggers; either direction triggers; requested state $18 permits contact while stationary
assert.strictEqual(ctx.chaos_goal_contact(SX, SY, 0, 1, SX, SY), false, 'stationary');
assert.strictEqual(ctx.chaos_goal_contact(SX, SY, 0, 2, SX, SY), false, 'stationary, other requested state');
assert.strictEqual(ctx.chaos_goal_contact(SX, SY, 0, 0x12, SX, SY), false);
assert.strictEqual(ctx.chaos_goal_contact(SX, SY, 0, 0x18, SX, SY), true, 'requested state $18');
assert.strictEqual(ctx.chaos_goal_contact(SX + 5, SY, 0x0400, 5, SX, SY), true, 'moving right');
assert.strictEqual(ctx.chaos_goal_contact(SX + 5, SY, -0x0400, 5, SX, SY), true, 'moving left');
assert.strictEqual(ctx.chaos_goal_contact(SX + 5, SY, 1, 9, SX, SY), true, 'any non-zero X speed, rolling');
assert.strictEqual(ctx.chaos_goal_contact(SX + 25, SY, 0x0400, 5, SX, SY), false, 'moving but outside the box');

// ---------- 2. contact begins the sequence: timer stops, progression untouched, sign-pan mode starts ----------
g.zoneGoto = 1; saved = 0; alarms = 0; g.chaosPan = ctx.chaos_goal_pan_new();
ctx.chaos_goal_begin({x: SX, y: 558});
assert.strictEqual(g.chaosGoalContact, true); assert.strictEqual(alarms, 1, 'timer stopped at contact');
assert.strictEqual(g.chaosFinishTime, 65);
assert.strictEqual(g.chaosPan.active, true, 'pan mode starts at contact');
assert.strictEqual(ctx.chaos_goal_pan_target_x(g.chaosPan, 256), SX - 0x80, 'pan target signX-$80 on the 256 px view (sign at CENTER(0))');
assert.strictEqual(ctx.chaos_goal_pan_target_y(g.chaosPan), 558 - 0x99, 'pan target signY-$99');
assert.strictEqual(g.zoneGoto, 1, 'progression unchanged at contact'); assert.strictEqual(saved, 0, 'nothing saved at contact');
assert.strictEqual(g.chaosComplete, false, 'contact is not act completion');

// ---------- 3. sign sequence ----------
let s = ctx.chaos_goal_sign_new(), apex = 0, landed = -1, spawned = -1, contactTick = -1;
for (let t = 0; t < 200; t++) {
    ctx.chaos_goal_sign_step(s, t === 5);   // contact at update 5; ticks below are relative to it
    if (s.contact) contactTick = t;
    if (contactTick >= 0) {
        apex = Math.min(apex, s.hop_yu / 256);
        if (s.state === 5 && landed < 0) landed = t - contactTick;
        if (s.spawn_child && spawned < 0) spawned = t - contactTick;
    }
}
assert.strictEqual(contactTick, 5); assert.strictEqual(landed, 130, 'sign lands 130 updates after contact');
assert.strictEqual(spawned, 131, '$19 child exists 131 updates after contact');
assert.ok(apex <= -125 && apex >= -128, `hop apex ~126 px (${apex})`);
assert.strictEqual(s.hop_yu, 0, 'landed on the canonical anchor');
const s2 = ctx.chaos_goal_sign_new(); ctx.chaos_goal_sign_step(s2, true); ctx.chaos_goal_sign_step(s2, true);
assert.strictEqual(s2.state, 4); assert.strictEqual(s2.tick, 1, 'a second contact while hopping does nothing');

// ---------- 4. $19 child: request state $20 at +279 only when grounded ----------
function childRun(groundedFrom) {
    const c = ctx.chaos_goal_child_new(); let at = -1;
    for (let t = 1; t < 600; t++) if (ctx.chaos_goal_child_step(c, t + 131 >= groundedFrom, false)) { at = t + 131; break; }
    return at;
}
assert.strictEqual(childRun(0), 279, 'earliest request +279 after contact');
assert.strictEqual(childRun(400), 400, 'waits for the floor, no timeout');
const cc = ctx.chaos_goal_child_new(); let early = false;
for (let i = 0; i < 147; i++) early = early || ctx.chaos_goal_child_step(cc, true, false);
assert.strictEqual(early, false);
assert.strictEqual(ctx.chaos_goal_child_step(cc, true, true), false, 'no request while already in state $20');

// ---------- 5. full chain on real terrain, THZ1 and THZ2 through the same code ----------
function settle(ids, x, y) {
    ctx.global.chaosTileIds = ids; ctx.global.chaosBrokenCells = [];
    const c = ctx.SCR_cc_new(x, y); c.state = c.next = 14; c.move = 1;
    for (let i = 0; i < 200 && !((c.contacts & 2) && !(c.move & 1)); i++) ctx.SCR_cc_tick(c);
    return c;
}
// Shared act-clear camera (SCR_chaos_goal + SCR_chaos_viewport): before contact the POC view follows Sonic (modelled as a fixed offset); from
// contact the recovered 1 px/update X+Y pan runs, the player edge clamp is EDGE(LEFT,+16)..EDGE(RIGHT,-9), the camera freezes at EDGE(RIGHT,-7)
// once state $20 runs, and the clear threshold is EDGE(RIGHT,+33) of the frozen camera.
const ROOM_W = 4096, ROOM_H = 1024, exposed = {};
function chain(name, ids, signY, roomName, W = 348, camOff = 197, leftWalk = 0, holdRight = false) {
    room = roomName; g.zoneGoto = 1; g.chaosComplete = false; g.chaosGoalContact = false; g.chaosPan = ctx.chaos_goal_pan_new(); saved = 0; alarms = 0;
    const c = settle(ids, SX - 60, signY);
    assert.ok((c.contacts & 2) !== 0, `${name}: player settles on floor`);
    assert.strictEqual(Math.floor(c.yu / 256), signY, `${name}: standing anchor Y equals canonical sign Y`);
    c.state = c.next = 5; c.vx = 0x0400; c.held = 8; c.maximum = 1024;
    const px = () => Math.floor(c.xu / 256), maxCam = ROOM_W - W, H = 196;
    let cam = Math.min(Math.max(px() - camOff, 0), maxCam), camY = Math.min(Math.max(signY - 120, 0), ROOM_H - H);
    const sign = ctx.chaos_goal_sign_new(); let child = null, t0 = -1, req = -1, clear = -1, progAtReq = null, frozenAt = -1, panDoneX = -1, panDoneY = -1;
    let frozenScreen = -1, minScreen = 1e9, maxScreenBefore20 = -1e9, camStart = null, camYStart = null, maxStepX = 0, maxStepY = 0, simultaneous = true;
    for (let t = 0; t < 1500; t++) {
        const in20 = c.state === 32 || c.next === 32;
        if (!g.chaosPan.active) cam = Math.min(Math.max(px() - camOff, 0), maxCam);
        else {
            if (camStart === null) { camStart = cam; camYStart = camY; }
            const before = [cam, camY];
            ctx.chaos_goal_pan_step(g.chaosPan, cam, camY, W, H, ROOM_W, ROOM_H, px(), in20);
            cam = g.chaosPan.x; camY = g.chaosPan.y;
            maxStepX = Math.max(maxStepX, Math.abs(cam - before[0])); maxStepY = Math.max(maxStepY, Math.abs(camY - before[1]));
            if (panDoneX < 0 && cam === before[0] && !g.chaosPan.frozen && t > t0) panDoneX = t - t0;
            if (panDoneY < 0 && camY === before[1] && !g.chaosPan.frozen && t > t0) panDoneY = t - t0;
            if (g.chaosPan.frozen && frozenAt < 0) { frozenAt = t - t0; frozenScreen = px() - Math.floor(cam); }
        }
        c.camera_x = Math.floor(cam); c.clear_dx = ctx.chaos_goal_clear_dx(W);
        const contact = sign.state === 3 && ctx.chaos_goal_contact(px(), Math.floor(c.yu / 256), c.vx, c.next, SX, signY);
        ctx.chaos_goal_sign_step(sign, contact);
        if (sign.contact) { ctx.chaos_goal_begin({x: SX, y: signY}); t0 = t; c.vx = 0; c.next = 1; c.state = 1; c.held = leftWalk ? 4 : (holdRight ? 8 : 0); }
        if (t0 >= 0 && leftWalk && t - t0 > leftWalk) c.held = 0;
        const born = child === null && sign.spawn_child;   // the child's first Step is the update after its creation
        if (sign.spawn_child) child = ctx.chaos_goal_child_new();
        if (child && !born && ctx.chaos_goal_child_step(child, (c.contacts & 2) !== 0 && !(c.move & 1), c.state === 32 || c.next === 32)) {
            ctx.chaos_goal_request_state20(c); req = t - t0; progAtReq = [g.zoneGoto, saved, g.chaosComplete];
            c.held = 1 | 2 | 4 | 16; c.pressed = 16; // hostile input must be ignored
        }
        ctx.SCR_cc_tick(c);
        // adapter: GameMaker room boundary for the player (not applied to state $20), then the player edge clamp between contact and state $20
        if (c.state !== 32 && (c.xu < 16 * 256 || c.xu > (ROOM_W - 9) * 256)) { c.xu = Math.min(Math.max(c.xu, 16 * 256), (ROOM_W - 9) * 256); c.vx = 0; }
        if (g.chaosGoalContact && c.state !== 32 && c.next !== 32) {
            const k = ctx.chaos_goal_clamp_player(ctx.chaos_vp_new(Math.floor(cam), Math.floor(camY), W, H), c.xu, c.vx); c.xu = k.xu; c.vx = k.vx;
        }
        if (t0 >= 0 && c.state !== 32 && c.next !== 32) { const sx = px() - Math.floor(cam); minScreen = Math.min(minScreen, sx); maxScreenBefore20 = Math.max(maxScreenBefore20, sx); }
        if (c.act_clear && clear < 0) { clear = t - t0; ctx.chaos_act_complete(); }
        if (t0 >= 0 && clear < 0) assert.strictEqual(g.zoneGoto, 1, 'progression never moves before the final clear');
        if (clear >= 0 && t - t0 - clear > 3) break;
    }
    assert.ok(t0 >= 0, `${name}: contact happened`);
    assert.strictEqual(req, 279, `${name}: $20 requested 279 updates after contact`);
    assert.deepStrictEqual(progAtReq, [1, 0, false], `${name}: no progression at $20 request`);
    assert.ok(clear > req, `${name} W${W} off${camOff}: act clear after $20 starts (${clear}) x=${px()} cam=${c.camera_x} vx=${c.vx}`);
    assert.strictEqual(g.chaosComplete, true);
    assert.strictEqual(g.zoneGoto, 2); assert.strictEqual(saved, 1, `${name}: saved exactly once, at the final clear`);
    // recovered pan: never faster than 1 px/update per axis; the sign ends at CENTER(0)-1 unless the room edge limits it
    assert.ok(maxStepX <= 1 && maxStepY <= 1, `${name} W${W}: pan is 1 px/update per axis (${maxStepX},${maxStepY})`);
    const wantX = Math.max(camStart, Math.min(SX - W / 2 - 1, ROOM_W - W)), wantY = Math.min(Math.max(signY - 0x99, 0), ROOM_H - H);
    assert.strictEqual(c.camera_x, wantX, `${name} W${W}: camera X settles at min(signX-W/2-1, worldRight-W) (${c.camera_x} vs ${wantX})`);
    assert.strictEqual(Math.floor(camY), wantY, `${name} W${W}: camera Y settles at signY-153`);
    exposed[W] = Math.max(exposed[W] || 0, c.camera_x + W - 1);
    assert.ok(c.camera_x + W - 1 <= ROOM_W - 1 || camStart + W - 1 > ROOM_W - 1, `${name} W${W}: no visible column beyond the canonical map (${c.camera_x + W - 1})`);
    if (W === 256 && camStart <= SX - 129) assert.strictEqual(c.camera_x, SX - 129, `${name}: 256 px view reproduces the recovered camera signX-129`);
    // framing: controllable the whole wait, kept inside the displayed view by the EDGE(LEFT,+16)..EDGE(RIGHT,-9) clamp
    assert.ok(minScreen >= 16 && maxScreenBefore20 <= W - 9, `${name} W${W}: clamped to LEFT+16..RIGHT-9 through the sign sequence (screen x ${minScreen}..${maxScreenBefore20})`);
    // freeze: only after $20 runs and once Sonic is at EDGE(RIGHT,-7) or beyond; the camera never moves afterwards. Holding RIGHT through the
    // wait parks Sonic at RIGHT-9, so the freeze lands within a few updates (original: about +3).
    assert.ok(frozenAt > req && frozenScreen >= W - 7, `${name} W${W}: camera freezes after $20 starts at screen x ${frozenScreen} >= RIGHT-7`);
    if (holdRight && cam + W <= ROOM_W) assert.ok(frozenAt - req <= 8, `${name} W${W}: RIGHT held, freeze +${frozenAt - req} updates after $20 starts`);
    // clear only once Sonic is 33 px beyond the visible right edge of the frozen camera, i.e. fully off screen
    const screenAtClear = px() - c.camera_x;
    assert.ok(screenAtClear >= W + 33 && screenAtClear < W + 33 + 8, `${name} W${W}: clears at view right edge + 33 (screen x ${screenAtClear})`);
    assert.strictEqual(c.camera_x, Math.floor(cam), 'camera frozen until the clear');
    return {contact: t0, request: req, frozen: frozenAt - req, clear, finalX: px(), cameraX: c.camera_x, W, screenAtClear};
}
const results = [];
for (const [name, ids, y, rm] of [['THZ1', thz1Ids, 558, 'thz1'], ['THZ2', thz2Ids, 654, 'thz2']])
    for (const W of [256, 290, 348, 400, 640])
        for (const camOff of [40, 120, 197, 230]) { if (camOff > W - 24 - 1) continue; results.push(chain(name, ids, y, rm, W, camOff)); }
// Sonic walking LEFT while still player-controlled (the reported "disappears off the left" failure mode)
for (const [name, ids, y, rm] of [['THZ1', thz1Ids, 558, 'thz1'], ['THZ2', thz2Ids, 654, 'thz2']])
    for (const W of [290, 348]) results.push(chain(name, ids, y, rm, W, 120, 200));
// RIGHT held through the whole wait (the emulated original run): Sonic parks at RIGHT-9 and state $20 freezes the camera within a few updates
for (const [name, ids, y, rm] of [['THZ1', thz1Ids, 558, 'thz1'], ['THZ2', thz2Ids, 654, 'thz2']])
    for (const W of [256, 290, 348, 400, 640]) results.push(chain(name, ids, y, rm, W, 197, 0, true));
console.log('last visible world column at act clear (canonical map edge 4095):', JSON.stringify(exposed));
console.log('chain cases', results.length, 'sample', JSON.stringify(results.find(r => r.W === 348)), JSON.stringify(results.filter(r => r.W === 256)[0]));
// widescreen threshold derives from the live view width; canonical SMS relationship stays documented
assert.strictEqual(ctx.CHAOS_ACT_CLEAR_DX_SMS, 0x121); assert.strictEqual(ctx.CHAOS_VP_SMS_W, 256);
assert.strictEqual(ctx.CHAOS_ACT_CLEAR_EDGE, 0x121 - 256); assert.strictEqual(ctx.CHAOS_ACT_FREEZE_EDGE, 0xF9 - 256);
assert.strictEqual(ctx.chaos_goal_clear_dx(256), 0x121, 'on the 256 px SMS screen the adapter equals the canonical $121');
for (const W of [256, 290, 348, 400, 1024]) assert.strictEqual(ctx.chaos_goal_clear_dx(W), W + 33, `view ${W}`);
assert.strictEqual(ctx.SCR_cc_new(0, 0).clear_dx, 0x121, 'core default stays canonical $121');
assert.ok(/clear_dx\s*=\s*chaos_goal_clear_dx\(camera_get_view_width\(view_camera\[0\]\)\)/.test(gml('SCR_chaos_adapter')), 'adapter feeds the live view width');

// ---------- 6. state $20 core details ----------
{
    let c = settle(thz2Ids, 3960, 654); c.camera_x = 3960 - 100; c.next = 32; c.vx = -0x300; c.held = 5; c.pressed = 16;
    ctx.SCR_cc_tick(c); assert.strictEqual(c.vx, 16, 'negative speed restarts from 0 then +$10'); assert.strictEqual(c.vy, 0);
    const speeds = [c.vx]; for (let i = 0; i < 3; i++) { c.camera_x = Math.floor(c.xu / 256) - 100; ctx.SCR_cc_tick(c); speeds.push(c.vx); }
    assert.deepStrictEqual(speeds, [16, 32, 48, 64]);
    c.vx = 0x05F0; const capped = [];
    for (let i = 0; i < 4; i++) { c.camera_x = Math.floor(c.xu / 256) - 100; ctx.SCR_cc_tick(c); capped.push(c.vx); }
    assert.deepStrictEqual(capped, [0x0600, 0x0600, 0x0600, 0x0600], 'cap $0600');
    assert.strictEqual(c.act_clear, false);
    for (const [d, want] of [[0x120, false], [0x121, true]]) {
        c = settle(thz2Ids, 3960, 654); c.next = 32; c.camera_x = Math.floor(c.xu / 256) - d; ctx.SCR_cc_tick(c);
        assert.strictEqual(c.act_clear, want, `d=${d.toString(16)}`);
    }
    c = settle(thz2Ids, 3960, 654); c.next = 32; c.camera_x = Math.floor(c.xu / 256) + 5; c.vx = 0x500; ctx.SCR_cc_tick(c);
    assert.strictEqual(c.act_clear, true, 'negative d compares as a huge value'); assert.strictEqual(c.vx, 0);
}

// ---------- 6b. safety: state $20 beyond the nominal 4096 room width ----------
// Terrain lookups must stay inside the tile array, nothing may clamp Sonic before the canonical $121 threshold, and the flag must
// arrive deterministically. A Proxy records every tile-array read made while state $20 runs.
{
    const outcomes = [];
    for (const [name, ids, y] of [['THZ1', thz1Ids, 558], ['THZ2', thz2Ids, 654]]) for (const [camX, clearDx] of [[3832, 0x121], [3748, 348 + 33], [3840, 256 + 33]]) for (const startX of [3940, 3960, 3980]) {
        const reads = []; const watched = new Proxy(ids, {get(t, k, r) { if (typeof k === 'string' && /^-?\d+$/.test(k)) reads.push(Number(k)); return Reflect.get(t, k, r); }});
        const run = () => {
            ctx.global.chaosTileIds = watched; ctx.global.chaosBrokenCells = [];
            const c = settle(watched, startX, y); reads.length = 0;
            c.next = 32; const trace = [];
            for (let i = 0; i < 400 && !c.act_clear; i++) { c.camera_x = camX; c.clear_dx = clearDx; ctx.SCR_cc_tick(c); trace.push(Math.floor(c.xu / 256)); }
            return {c, trace};
        };
        const a = run(), readsA = reads.slice(), b = run();
        assert.ok(a.c.act_clear, `${name}@${startX}/cam${camX}: flag reached`);
        assert.deepStrictEqual(a.trace, b.trace, `${name}@${startX}/cam${camX}: deterministic`);
        assert.ok(readsA.length > 0 && readsA.every(i => Number.isInteger(i) && i >= 0 && i < ids.length), `${name}@${startX}/cam${camX}: every tile read in bounds`);
        const x = Math.floor(a.c.xu / 256);
        assert.ok(x - camX >= clearDx, `${name}@${startX}/cam${camX}: flag at d>=$121 (x=${x})`);
        assert.ok(a.trace.slice(0, -2).every(v => v - camX < clearDx) && a.trace.at(-2) - camX >= clearDx, 'no earlier clamp/stop: the flag tick follows the first d>=$121 position');
        assert.ok(a.trace.every((v, i) => i === 0 || v >= a.trace[i - 1]), 'never moves backwards');
        assert.ok(x > 4096 - 9 || startX > 3980, `${name}@${startX}/cam${camX}: ran past the old room-edge clamp (${x})`);
        if (startX === 3960) outcomes.push(`${name}@${startX}/cam${camX}->x${x},y${Math.floor(a.c.yu / 256)}`);
    }
    // the GameMaker room-edge clamp must not apply to state $20 (the only GML-specific piece), and the lookup index guard is in the core
    const adapter = gml('SCR_chaos_adapter');
    assert.ok(/cp_c\.state != 32 && \(cp_c\.xu < 16\*256 \|\| cp_c\.xu > \(room_width-9\)\*256\)/.test(adapter), 'room-edge clamp yields to state $20');
    assert.ok(gml('SCR_chaos_core').includes('index:-1'), 'out-of-map lookups return the guarded empty cell');
    assert.strictEqual(ctx.SCR_cc_lookup(5000, 654, 0).tile === undefined, false);
    // presentation adapter: columns past the canonical 4096 px map are open ONLY while the state $20 tick runs; inside the map nothing changes
    ctx.global.chaosBeyondMapOpen = false; const wrapped = ctx.SCR_cc_lookup(4200, 654, 0), inside = ctx.SCR_cc_lookup(4000, 654, 0);
    ctx.global.chaosBeyondMapOpen = true; const open = ctx.SCR_cc_lookup(4200, 654, 0), insideOpen = ctx.SCR_cc_lookup(4000, 654, 0);
    ctx.global.chaosBeyondMapOpen = false;
    assert.strictEqual(open.index, -1, 'state $20: past-the-map column is open'); assert.notStrictEqual(wrapped.index, -1, 'normal play keeps the ROM lookup');
    assert.deepStrictEqual(insideOpen, inside, 'inside the canonical map the flag changes nothing');
    // the flag is hermetic: true only inside the state $20 tick, false before/after every tick (any state), at room start and after the clear
    const seen = []; let flag = false;
    Object.defineProperty(ctx.global, 'chaosBeyondMapOpen', {configurable: true, get: () => flag, set: v => { seen.push(v); flag = v; }});
    for (const [stateNext, wantTrue] of [[32, true], [1, false], [5, false], [30, false], [34, false], [32, true]]) {
        const cc = settle(thz2Ids, 3960, 654); seen.length = 0; cc.next = stateNext; cc.camera_x = 3800; cc.clear_dx = 0x121; ctx.SCR_cc_tick(cc);
        assert.strictEqual(flag, false, `flag is false after a state ${stateNext} tick`);
        assert.strictEqual(seen.includes(true), wantTrue, `flag raised only by the state $20 tick (state ${stateNext})`);
    }
    { const cc = settle(thz2Ids, 3960, 654); cc.next = 32; cc.camera_x = 3960 - 100; cc.clear_dx = 20; ctx.SCR_cc_tick(cc); ctx.SCR_cc_tick(cc); assert.strictEqual(cc.act_clear, true); assert.strictEqual(flag, false, 'false after the clearing tick too'); }
    assert.ok(/global\.chaosBeyondMapOpen = false;/.test(rd('objects/OBJ_chaos_zone/Create_0.gml')), 'reset at every room start / restart / act transition (zone Create)');
    // vertical position is held explicitly while the run is beyond the canonical map
    for (const [name, ids, y] of [['THZ1', thz1Ids, 558], ['THZ2', thz2Ids, 654]]) {
        const cc = settle(ids, 4080, y); cc.next = 32; let heldY = null;
        for (let i = 0; i < 200 && !cc.act_clear; i++) { cc.camera_x = 3748; cc.clear_dx = 348 + 33; const before = Math.floor(cc.xu / 256); ctx.SCR_cc_tick(cc); if (before >= 4096) { if (heldY === null) heldY = cc.yu; assert.strictEqual(cc.yu, heldY, `${name}: Y held beyond the map`); } }
        assert.ok(cc.act_clear && heldY !== null, `${name}: ran beyond the map and cleared with Y held`);
    }
    delete ctx.global.chaosBeyondMapOpen; ctx.global.chaosBeyondMapOpen = false;
    console.log('state $20 beyond-edge safety:', outcomes.join(' '));
}

// ---------- 7. canonical placements unchanged, one shared mechanism, no act coordinates ----------
assert.ok(/inst_C1800001.*"objectId":\{"name":"OBJ_chaos_object_18".*"x":3960\.0,"y":558\.0/.test(rd('rooms/ROM_chaos_thz1/ROM_chaos_thz1.yy')), 'THZ1 $18 (3960,558)');
assert.ok(gml('SCR_chaos_level_thz2_data').includes('[41,3960,654,$18,$00,$00,$00,$00,$708F4,"object-$18"]'));
const step = rd('objects/OBJ_chaos_controls/Step_0.gml'), s18 = rd('objects/OBJ_chaos_object_18/Step_0.gml'), goal = gml('SCR_chaos_goal');
const strip = src => src.replace(/\/\/.*$/gm, '');
for (const [n, src] of [['controls', step], ['sign', s18], ['goal', goal], ['level', tail]]) {
    assert.ok(!/3970|3960|\b558\b|\b654\b|y - 108|chaos_goal_reached/.test(strip(src)), `${n}: no act coordinate / assumed adapter`);
}
assert.ok(!/chaosComplete = true/.test(step) && step.includes('act_clear') && step.includes('chaos_act_complete()'));
assert.ok(s18.includes('chaos_goal_contact(') && s18.includes('chaos_goal_sign_step(') && s18.includes('chaos_goal_begin(id)'));
assert.ok(!/chaos_act_progress|zoneGoto|SCR_save_game/.test(strip(s18 + goal + rd('objects/OBJ_chaos_object_19/Step_0.gml'))), 'sign/$19/goal never touch progression');
const completeSrc = pure.slice(pure.indexOf('function chaos_act_complete'));
assert.ok(completeSrc.includes('chaos_act_progress(global.zoneGoto, cp_act)') && completeSrc.includes('SCR_save_game()'));
assert.ok(!/chaos_act_progress|SCR_save_game/.test(strip(beginSrc)), 'chaos_goal_begin never advances progression');
const yyp = rd('SonicChaos_POC.yyp'); assert.ok(yyp.includes('"OBJ_chaos_object_19"') && yyp.includes('"SCR_chaos_goal"'));
assert.ok(rd('objects/OBJ_chaos_object_18/Draw_0.gml').includes('chaosHopDy'), 'hop is a draw offset; instance y stays canonical');
// GameMaker rejects string literals that span lines (a build-breaking defect found on Windows): scan the act-clear GML.
for (const f of ['scripts/SCR_chaos_level/SCR_chaos_level.gml', 'scripts/SCR_chaos_goal/SCR_chaos_goal.gml', 'scripts/SCR_chaos_core/SCR_chaos_core.gml',
    'scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml', 'objects/OBJ_chaos_controls/Step_0.gml', 'objects/OBJ_chaos_object_18/Step_0.gml',
    'objects/OBJ_chaos_object_19/Step_0.gml', 'objects/OBJ_chaos_zone/Create_0.gml'])
    rd(f).split(/\r?\n/).forEach((line, i) => {
        const code = line.trim().startsWith('//') ? '' : line;
        assert.strictEqual((code.match(/"/g) || []).length % 2, 0, `${f}:${i + 1} unbalanced string literal`);
    });
console.log(`ACT COMPLETION CHECKS PASSED (${cells} contact-grid cells)`);
