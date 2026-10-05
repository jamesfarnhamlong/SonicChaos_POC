// MGHZ Package M2: type $21 (flags $10 start path), Rocket Shoes (player state $11 / monitor $10 parameter 4) and Spring Shoes (type $2F / player state $12).
// Executes the SHIPPED GML (core, adapter, object Create/Step events, level loader) through verification/chaos_world_harness.js; GameMaker is mocked at the instance / camera /
// audio boundary only. Oracles: the Research caches mirrored in POC_notes/rom-cache (mghz/object-census.json controlled patrol traces for all 15 MGHZ $21 records,
// powerup-shoes.json fixtures from the original routines) and docs/object-21.md for the THZ control fixtures. Research inputs: ac04dfe, 7315df2, a779fde, 150977e.
const fs = require('fs'), path = require('path'), assert = require('assert');
const {loadHost, root} = require('./chaos_world_harness.js');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8').split('\r\n').join('\n');
const read = p => JSON.parse(rd(p));
let checks = 0;
const norm = v => JSON.stringify(v instanceof Set ? [...v] : v);
const eq = (a, b, m) => { const A = norm(a), B = norm(b); if (A !== B) { let i = 0; while (i < Math.min(A?.length ?? 0, B?.length ?? 0) && A[i] === B[i]) i++; throw new Error(`${m}
  actual:   ${String(A).slice(Math.max(0, i - 60), i + 120)}
  expected: ${String(B).slice(Math.max(0, i - 60), i + 120)}`); } checks++; };
const ok = (c, m) => { assert.ok(c, m); checks++; };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const section = {};
const count = name => { const n = checks - (section.last || 0); section.last = checks; section[name] = n; };

const CENSUS = read('POC_notes/rom-cache/mghz/object-census.json');
const FOOT = read('POC_notes/rom-cache/powerup-shoes.json');
const host = loadHost(null), c = host.ctx, g = host.g, w = host.world;

function level(act, width = 256, follow = true) {
    c.room = c[`ROM_chaos_mghz${act}`]; c.chaos_level_install_layout();
    g.chaosMghzEffects = c.chaos_mghz_effect_new();
    host.reset(); w.cam.w = width; w.cam.h = 192; w.follow = follow;
    Object.assign(g, {chaosPowerCode: 0, chaosPowerTimer: 0, chaosLastSoundRequest: 0, chaosMusicRestoreRequested: false, ring: 0, chaosLostRings: []});
    if (c.chaos_lr_reset) c.chaos_lr_reset();
    g.chaosType10D29A = 0; g.chaosType10QueuedMask = 0;
    return act;
}
const EMPTY = 254;
function emptyWorld(cells = []) {       // MGHZ headers stay installed; every cell is the empty block except the listed ones
    g.chaosTileIds = Array(4096).fill(EMPTY); g.chaosBrokenCells = [];
    for (const [cx, cy, b] of cells) g.chaosTileIds[cy * g.chaosMapWidth + cx] = b;
}
const SOLID = 1;                         // MGHZ block $01: full 32 px solid block (flags $81)

// ======================================================================================================================================
// 1. TYPE $21 IN MGHZ
// ======================================================================================================================================
const t21 = CENSUS.enemies['0x21'];
const ids21 = new Set();
for (const act of [1, 2]) {
    level(act); c.chaos_level_spawn_objects();
    const rows = c.chaos_level_object_rows().filter(r => r[3] === 0x21);
    const want = t21.placements.filter(p => p.act === `mghz${act}`);
    eq(rows.length, want.length, `mghz${act} $21 record count`);
    const made = w.badniks.filter(o => o.object_index === host.ids.OBJ_chaos_object_21);
    eq(made.length, want.length, `mghz${act}: every $21 record is spawned`);
    eq(g.chaosSpawnedByType[0x21], want.length, 'spawn counter');
    want.forEach((p, i) => {
        const o = made.find(m => m.chaosPlacementIndex === p.index);
        ok(o, `record ${p.index} instantiated`);
        eq([o.x, o.y, o.chaosParameter], [p.world_x, p.world_y, parseInt(p.parameter, 16)], `record ${p.index}: canonical X/Y and parameter`);
        eq([o.chaosOriginX, o.chaosLeftBound], [p.world_x, p.world_x - parseInt(p.parameter, 16) * 16], `record ${p.index}: patrol bound = parameter * 16 left of the origin`);
        eq([o.chaosAltStart, o.chaosPlacementFlags, parseInt(p.flags, 16)], [true, 16, 16], `record ${p.index}: flags $10 selects the alternate start`);
        eq(o.sprite_index, host.ids.SPR_chaos_mghz_object_21, 'MGHZ art resource');
        ids21.add(`${act}:${p.index}`);
    });
}
eq(ids21.size, 15, 'all 15 MGHZ $21 placements');
count('$21 placements');

// ---- 1b. controlled patrol traces: original callbacks on the MGHZ layouts (Research), replayed through the shipped object Step event ----
function patrol(act, index, x, y, param, flags, updates, extra) {
    level(act); w.follow = false;
    const o = host.newInstance('OBJ_chaos_object_21', x, y);
    c.chaos_type21_configure(o, param, flags);
    const log = [];
    let last = null;
    for (let u = 1; u <= updates; u++) {
        w.cam.x = Math.max(0, Math.floor(o.x) - 128); w.cam.y = Math.floor(o.y) - 96;        // the camera follows: the patrol stays in the awake band at any viewport
        host.runEvent(o, 'objects/OBJ_chaos_object_21/Step_0.gml');
        if (extra) extra(o, u);
        const cur = o.chaosState;
        if (cur !== last) log.push({update: u, state: cur, x: Math.floor(o.x), y: o.y, vx: o.chaosVX});
        last = cur;
    }
    return {o, log};
}
for (const tr of t21.controlled_patrol_traces) {
    const act = Number(tr.act.slice(-1));
    const rec = t21.placements.find(p => p.act === tr.act && p.index === tr.index);
    const {o, log} = patrol(act, tr.index, rec.world_x, rec.world_y, parseInt(rec.parameter, 16), 16, tr.updates_traced);
    const want = tr.state_log.map(e => ({update: e.update, state: e.requested_state, x: e.x, y: e.y, vx: e.vx_8_8}));
    eq(log.length - 1, tr.reversal_count, `${tr.act} #${tr.index}: total reversals over ${tr.updates_traced} updates`);
    eq(log.slice(0, want.length), want, `${tr.act} #${tr.index} (param ${rec.parameter}): state log, X/Y and X speed at every state change match the original-routine trace`);
    eq(tr.state_log[0].requested_state, 5, 'starts in state 5');
    eq(tr.first_reversal_update, 2 + 32 * parseInt(rec.parameter, 16) + 1, `${tr.act} #${tr.index}: first reversal is 2 init updates + 32 * parameter + 1 patrol updates`);
    eq(tr.span_pixels, parseInt(rec.parameter, 16) * 16, 'span = parameter * 16');
}
count('$21 patrol traces (flags $10 states 5/6)');

// ---- 1c. flags $10 initialisation versus the THZ start path ----
{
    level(1); w.follow = false;
    const o = host.newInstance('OBJ_chaos_object_21', 1744, 238); c.chaos_type21_configure(o, 10, 0x10);
    w.cam.x = 1744 - 128; w.cam.y = 238 - 96;
    host.runEvent(o, 'objects/OBJ_chaos_object_21/Step_0.gml');                    // update 1: creation = the $B210 init record
    eq([o.chaosState, o.chaosLatch, o.chaosBit4, o.chaosVX, o.chaosVY, o.chaosInitDelay], [5, 1, false, -0x80, 0x200, 1], 'init (one of the two init updates spent): latch 1, requested state 5, bit 4 clear, vx -$0080, vy +$0200');
    eq([o.x, o.y], [1744, 238], 'init does not move the object');
    host.runEvent(o, 'objects/OBJ_chaos_object_21/Step_0.gml');                    // update 2: state switch
    eq([o.x, o.y, o.chaosInitDelay], [1744, 238, 0], 'update 2: still no patrol callback');
    host.runEvent(o, 'objects/OBJ_chaos_object_21/Step_0.gml');                    // update 3: first patrol
    eq(o.x, 1743.5, 'first patrol update moves by -$0080');
    const th = host.newInstance('OBJ_chaos_object_21', 2400, 254); c.chaos_type21_configure(th, 2, 0);
    eq([th.chaosAltStart, th.sprite_index], [false, -1], 'THZ record (flags $00): standard start, no MGHZ resource');
}
count('$21 flags $10 initialisation');

// ---- 1d. THZ control fixtures (docs/object-21.md): the accepted THZ start path is unchanged ----
{
    c.room = c.ROM_chaos_thz1; g.chaosTileIds = host.ids1.slice(); g.chaosMapWidth = 128; host.reset(); w.follow = false;
    for (const [x, y, param, first, ret, stable] of [[2400, 254, 2, 65, 132, 238], [800, 606, 8, 257, 516, 590]]) {
        const o = host.newInstance('OBJ_chaos_object_21', x, y); c.chaos_type21_configure(o, param, 0);
        const changes = []; let last = null;
        for (let u = 1; u <= ret + 1; u++) {
            w.cam.x = Math.max(0, Math.floor(o.x) - 128); w.cam.y = Math.floor(o.y) - 96;
            host.runEvent(o, 'objects/OBJ_chaos_object_21/Step_0.gml');
            if (o.chaosState !== last) changes.push([u, o.chaosState, o.image_xscale]);
            last = o.chaosState;
        }
        eq(changes.map(r => r.slice(0, 2)), [[1, 3], [first, 4], [ret, 3]], `THZ ${x},${y}: states 3/4 reverse at patrol updates ${first} / ${ret} (docs/object-21.md)`);
        eq(changes.map(r => r[2]), [-1, 1, -1], 'THZ orientation: state 3 (moving left) mirrored, state 4 plain');
        eq(o.y, stable, 'THZ vertical settling unchanged');
        eq(o.chaosState, 3, 'THZ never touches the latch path');
    }
}
count('$21 THZ control fixtures');

// ---- 1e. orientation/art parity: both runtime orientations, both frames, state-driven (bit 4), no whole-bitmap flip ----
{
    level(1); w.follow = false;
    const o = host.newInstance('OBJ_chaos_object_21', 1744, 238); c.chaos_type21_configure(o, 1, 0x10);
    const seen = new Map();                                         // state -> {bit4 -> frames}
    for (let u = 1; u <= 200; u++) {
        w.cam.x = Math.max(0, Math.floor(o.x) - 128); w.cam.y = Math.floor(o.y) - 96;
        host.runEvent(o, 'objects/OBJ_chaos_object_21/Step_0.gml');
        if (u < 3) { ok(!o.visible || u >= 2, 'invisible during the init record'); continue; }
        if (o.chaosOrientPending) continue;      // the update of the reversal still shows the previous (current) state; the requested state switches on the next update
        const key = `${o.chaosState}/${o.chaosBit4 ? 1 : 0}`;
        if (!seen.has(key)) seen.set(key, new Set());
        seen.get(key).add(o.image_index);
        eq(o.image_xscale, 1, 'MGHZ art is never whole-bitmap flipped');
        eq(o.image_index >> 1, o.chaosBit4 ? 1 : 0, 'sprite frames 0,1 = bit 4 clear; 2,3 = bit 4 set');
    }
    eq([...seen.keys()].sort(), ['5/0', '6/1'], 'state 5 draws bit 4 = 0, state 6 draws bit 4 = 1 (THZ is the opposite: state 3 = bit 4 set)');
    eq([...seen.get('5/0')].sort(), [0, 1], 'both animation frames in the left-moving orientation');
    eq([...seen.get('6/1')].sort(), [2, 3], 'both animation frames in the right-moving orientation');
    const draw = strip(rd('objects/OBJ_chaos_object_21/Draw_0.gml'));
    ok(/chaosAltStart \? 0/.test(draw), 'MGHZ draws at the anchor; the approved registration (+1,+18) lives in the sprite origin');
    const gen = read('POC_notes/rom-cache/mghz/footwear-assets.json');
    eq(gen.registration, [1, 18], 'registration recorded with the assets');
    const spr = JSON.parse(rd('sprites/SPR_chaos_mghz_object_21/SPR_chaos_mghz_object_21.yy'));
    eq([spr.frames.length, spr.sequence.xorigin, spr.sequence.yorigin], [4, gen.anchor[0] - 1, gen.anchor[1] - 18], 'sprite: 4 frames, origin folds the registration');
}
count('$21 orientation/art parity');

// ---- 1f. contact: top stomp before the attack branch, side/low attack defeat, ordinary hurt ----
function contactScenario(o) {
    level(1); w.follow = false; emptyWorld();
    g.ring = o.rings ?? 5; g.powerInv = !!o.inv;
    const ox = 1500, oy = 800;
    const p = host.newPlayer(ox + (o.dx || 0), oy + (o.dy || 0), {state: o.state ?? 10, move: o.move ?? 3, vy: o.vy ?? 256, vx: o.vx || 0});
    const obj = host.newInstance('OBJ_chaos_object_21', ox, oy); c.chaos_type21_configure(obj, 4, 0x10);
    Object.assign(obj, {chaosActive: true, chaosAsleep: false, chaosWoken: true, chaosScanTick: 1, chaosInitialFillDone: true, chaosInitDelay: 0, chaosState: 5, chaosVX: 0, chaosVY: 0,   // standing still: the contact geometry is evaluated on exact integer anchors

        chaosXU: ox * 256, chaosYU: oy * 256, chaosOriginX: ox + 40, chaosLeftBound: ox - 400});
    const saved = c.SCR_chaos_object_floor_project; c.SCR_chaos_object_floor_project = (x, y) => ({grounded: true, y});     // contact-only matrix: a supported object pose
    obj.stepPath = 'objects/OBJ_chaos_object_21/Step_0.gml'; w.badniks.push(obj);
    w.cam.x = ox - 128; w.cam.y = oy - 96;
    const rec = [];
    for (let i = 0; i < 3; i++) { host.frame({}); rec.push({vy: p.chaosCore.vy, next: p.chaosCore.next, move: p.chaosCore.move, ring: g.ring, destroyed: !!obj.destroyed, dead: !!p.dead,
        scatter: c.chaos_lr_list ? c.chaos_lr_list().length : 0, req: p.chaosCore.damage_request}); }
    c.SCR_chaos_object_floor_project = saved;
    return {p, obj, rec};
}
{
    // top stomp (playerY <= objectY - 4): any posture, Y speed -6.75, state $0B, attack cleared, the badnik survives
    for (const [label, st, mv] of [['attacking jump', 10, 3], ['rolling', 9, 2], ['upright (non-attacking) fall', 14, 1]]) {
        const s = contactScenario({dy: -10, state: st, move: mv, vy: 256});
        eq(s.rec[0].vy, -1728, `${label}: top stomp rebounds at -6.75`);
        eq([s.rec[0].next, s.rec[0].move & 2, s.rec[0].destroyed], [11, 0, false], `${label}: state $0B, attack posture cleared, $21 survives`);
        eq(s.rec[0].ring, 5, 'no damage');
    }
    // vy -48 + this update's gravity (+48) leaves the anchor exactly where it was placed: the boundary is evaluated on the integer anchor
    eq(contactScenario({dy: -4, state: 10, move: 3, vy: -48}).rec[0].vy, -1728, 'boundary: playerY == objectY - 4 is still a stomp (an attacking Sonic does NOT defeat it)');
    ok(contactScenario({dy: -3, state: 10, move: 3, vy: -48}).rec[0].destroyed, 'boundary: playerY == objectY - 3 is side/low (an attacking Sonic defeats it)');
    // side / low attack defeats it (no rebound), converts to $0F (smoke), score bytes written
    for (const [label, dy, dx] of [['side', 0, 12], ['low', 20, 4], ['side from the left', 5, -18]]) {
        const s = contactScenario({dy, dx, state: 10, move: 3, vy: 0});
        ok(s.rec[0].destroyed, `${label} attack: defeated`);
        eq(s.rec[0].ring, 5, 'no damage'); ok(s.rec[0].vy !== -1728, 'no rebound');
        eq([g.chaosLastEnemyScore0, g.chaosLastEnemyScore1, g.chaosLastEnemyScore2], [0x10, 0, 0], 'score table value $10 00 00');
        const smoke = w.smoke[w.smoke.length - 1];
        ok(smoke && smoke.sprite_index === host.ids.SPR_chaos_mghz_poof && smoke.chaosAnchorDraw === true, `${label}: converted to the MGHZ $0F poof (smoke object created at the anchor)`);
    }
    // invincibility ($D532 == 6) defeats from the side exactly like the attack bit
    ok(contactScenario({dy: 0, dx: 10, state: 5, move: 0, vy: 0, inv: true}).rec[0].destroyed, 'invincibility defeats');
    // side/low non-attacking contact hurts Sonic in the FOLLOWING player update ($D3B0 -> $48BC): 5 rings -> scatter, rings 0
    for (const [label, dy, dx] of [['side', 0, 12], ['low', 20, 4]]) {
        const s = contactScenario({dy, dx, state: 14, move: 1, vy: 0});
        ok(!s.rec[0].destroyed && !s.rec[1].destroyed, `${label} non-attacking: the $21 survives`);
        eq(s.rec[0].ring, 5, 'update of the overlap: no damage yet');
        eq([s.rec[1].ring, s.rec[1].scatter > 0], [0, true], `${label} non-attacking: hurt in the next update, rings lost to the scatter`);
    }
    // reach: dx +-19, dy -26..+24 (inclusive); one more pixel is no contact
    for (const [dx, dy, hit] of [[19, 0, true], [20, 0, false], [-19, 0, true], [-20, 0, false], [0, -26, true], [0, -27, false], [0, 24, true], [0, 25, false]]) {
        const s = contactScenario({dx, dy, state: 14, move: 1, vy: 0});
        const touched = s.rec[0].vy === -1728 || s.rec[0].destroyed || s.rec[1].ring === 0;
        eq(touched, hit, `contact reach dx ${dx} dy ${dy}`);
    }
}
count('$21 contact');

// ---- 1g. lifecycle and placement persistence ----
{
    level(1); w.follow = false;
    const o = host.newInstance('OBJ_chaos_object_21', 1744, 238); c.chaos_type21_configure(o, 10, 0x10);
    const step = () => host.runEvent(o, 'objects/OBJ_chaos_object_21/Step_0.gml');
    w.cam.x = 0; w.cam.y = 0;
    for (let i = 0; i < 8; i++) step();
    eq([o.chaosActive, o.visible], [false, false], 'far from the camera the placement is not created');
    const vp = c.chaos_vp_current();
    w.cam.x = 1744 - vp.w - 40; w.cam.y = 238 - 96;                  // outer band on the right of the object (object at screen X > view + 32)
    for (let i = 0; i < 8 && !o.chaosActive; i++) step();
    ok(o.chaosActive, 'created in the outer ring');
    eq(o.chaosAsleep, true, 'outer ring: asleep');
    const x0 = o.x; for (let i = 0; i < 20; i++) step();
    eq(o.x, x0, 'asleep: the patrol does not move');
    w.cam.x = 1744 - 128;                                           // interior: awake and walking
    for (let i = 0; i < 40; i++) step();
    ok(o.x < 1744 && !o.chaosAsleep, 'interior: awake, patrol resumes');
    w.cam.x = 0;                                                    // far away: removed, occupancy released
    for (let i = 0; i < 4; i++) step();
    eq(o.chaosActive, false, 'removed beyond the lifetime window');
    w.cam.x = 1744 - 128; w.cam.y = 238 - 96;
    for (let i = 0; i < 8; i++) step();
    eq(o.chaosActive, false, 'jumping straight into the interior does not recreate it (interior cells create only during the initial fill)');
    w.cam.x = 1744 - vp.w - 40;                                     // approach from the outer ring like a scrolling camera
    for (let i = 0; i < 8 && !o.chaosActive; i++) step();
    eq([o.chaosActive, o.x, o.y, o.chaosState, o.chaosLatch], [true, 1744, 238, 5, 1], 'recreated from the canonical record: origin position, state 5, patrol phase reset');
    // defeat keeps the placement dead: the room instance is destroyed (the ROM never clears the occupancy byte), it never respawns
    const s = contactScenario({dy: 0, dx: 12, state: 10, move: 3, vy: 0});
    ok(s.obj.destroyed && s.obj.chaosDefeated, 'defeated $21 stays defeated (placement shell destroyed)');
}
count('$21 lifecycle');

// ======================================================================================================================================
// 2. ROCKET SHOES (monitor $10 / parameter $04, selector $D532 = 4, player state $11)
// ======================================================================================================================================
const mapW = () => g.chaosMapWidth;
/// A player already flying in state $11 over empty terrain, camera following (screen Y 96).
function rocket(x, y, o = {}) {
    level(o.act || 1); emptyWorld(o.cells || []);
    const p = host.newPlayer(x, y, {state: 17, move: 0, vx: o.vx || 0, vy: o.vy || 0});
    const k = p.chaosCore;
    c.SCR_cc_state11_enter(k); k.vx = o.vx || 0; k.vy = o.vy || 0; k.state = 17; k.next = 17;
    if (o.left) { k.player_flags |= 16; p.image_xscale = -1; }
    if (o.water) k.water = 1;
    g.chaosPowerCode = 4; g.chaosPowerTimer = o.timer ?? 300;
    return p;
}
const timers = [];
const origTick = c.SCR_cc_state11_tick;
c.SCR_cc_state11_tick = cp => { timers.push([g.chaosPowerTimer, cp.state11_active]); origTick(cp); };

// ---- 2a. activation: queued by the monitor, applied by the next player update, first full callback one update later ----
{
    level(1); emptyWorld();
    const p = host.newPlayer(1312, 560, {state: 10, move: 3, vy: 1024, vx: 300});
    const k = p.chaosCore;
    const mon = host.newInstance('OBJ_chaos_object_10', 1312, 640); c.chaos_type10_configure(mon, 4);
    eq([mon.chaosParameter, mon.sprite_index], [4, host.ids.SPR_chaos_mghz_monitor_04], 'Rocket monitor = type $10 parameter $04 with the MGHZ selector-4 resource');
    Object.assign(mon, {chaosActive: true, chaosAsleep: false, chaosWoken: true, chaosScanTick: 1, chaosInitialFillDone: true, chaosState: 2});
    mon.stepPath = 'objects/OBJ_chaos_object_10/Step_0.gml'; w.badniks.push(mon);
    let broke = -1, log = [];
    for (let i = 0; i < 80 && broke < 0; i++) { host.frame({}); if (mon.chaosConsumed) broke = i; }
    ok(broke >= 0, 'the attacking Sonic breaks the monitor');
    eq([k.reward_queue, g.chaosPowerCode, g.chaosPowerTimer], [8, 0, 0], 'object phase N: only $D3A3 bit 3 is queued; selector/timer untouched');
    ok(k.next !== 17 && k.state !== 17, 'player still in the old state');
    eq(k.vy, -1024, 'monitor rebound is the ordinary one');
    timers.length = 0;
    host.frame({});                                                     // player update N+1: old state runs, then the reward dispatcher
    eq([k.state === 17, k.next], [false, 17], 'N+1: the OLD state ran; $11 is requested');
    eq([g.chaosPowerCode, g.chaosPowerTimer, k.reward_queue], [4, 300, 0], 'N+1: selector $D532 = 4, timer $D44C = 300, queue consumed');
    eq([k.vx, k.vy, k.maximum, k.move & 66, g.chaosLastSoundRequest], [0, 0, 0x700, 0, 0x85], 'entry: both speeds zero, maximum 7.0, attack/roll flags clear, sound $85');
    eq(timers.length, 0, 'no state-$11 callback in update N+1');
    host.frame({});
    eq([k.state, timers.length, timers[0][0], g.chaosPowerTimer], [17, 1, 300, 299], 'N+2: first full callback enters with the timer at 300; decremented at the end of the update');
    eq(strip(rd('scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml')).includes('SCR_cc_state11_enter(cp_p.chaosCore)'), false, 'the monitor no longer enters $11 itself');
    // the reward is applied for the Rocket only when the player is player 1 (the original gives other characters ten rings): unchanged
    g.player = 2; const q = host.newPlayer(0, 0, {}); g.chaosType10D29A = 0; c.SCR_chaos_type10_reward(4, q); eq([q.chaosCore.reward_queue, g.chaosType10D29A], [0, 0x10], 'other characters: ten rings, no Rocket'); g.player = 1;
}
count('Rocket activation');

// ---- 2b. horizontal thrust: facing supplies the direction, dry $0010 / water $0002, cap 7.0 ----
function simulateThrust(water, n) {   // $4097/$402A written out independently: delta doubles below |vx| 128, the cap tests the high byte
    let v = 0; const out = [];
    for (let i = 0; i < n; i++) { const d = ((Math.abs(v) + 128) >> 8) === 0 ? (water ? 4 : 32) : (water ? 2 : 16); v += d; if ((v >> 8) >= 7) v = 0x700; out.push(v); }
    return out;
}
{
    const p = rocket(1000, 800, {timer: 5000}); const k = p.chaosCore; const got = [];
    for (let i = 0; i < 140; i++) { host.frame({}); got.push(k.vx); }              // NO horizontal input: the facing direction thrusts
    eq(got, simulateThrust(false, 140), 'dry: +$0010 per update (doubled below |vx| 128), no input needed');
    eq([Math.max(...got), got[got.length - 1]], [0x700, 0x700], 'dry: capped at exactly 7.0 px/update');
    ok(got.every(v => v <= 0x700), 'never above the cap');
    const qL = rocket(1000, 800, {timer: 5000, left: true}); const kL = qL.chaosCore; const gotL = [];
    for (let i = 0; i < 60; i++) { host.frame({}); gotL.push(kL.vx); }
    eq(gotL, simulateThrust(false, 60).map(v => -v), 'facing left thrusts left with the mirrored (negative-high-byte) cap');
    const pw = rocket(4080, 800, {timer: 100000, water: true, left: true}); const kw = pw.chaosCore; const gw = [];
    for (let i = 0; i < 900; i++) { host.frame({}); gw.push(kw.vx); }
    eq(gw, simulateThrust(true, 900).map(v => -v), 'water: +$0002 per update (doubled below |vx| 128), thrust left from the far end of the act');
    eq(gw[gw.length - 1], -0x700, 'water: same 7.0 cap');
    // reversal: Left changes facing first, the callback then thrusts left; the facing persists after the key is released
    const pr = rocket(3000, 800, {timer: 5000}); const kr = pr.chaosCore;
    for (let i = 0; i < 30; i++) host.frame({});
    const v0 = kr.vx; ok(v0 > 0 && (kr.player_flags & 16) === 0, 'flying right');
    host.frame({left: true});
    ok((kr.player_flags & 16) !== 0 && kr.vx < v0, 'Left: facing flips and the thrust reverses at once');
    const v1 = kr.vx; for (let i = 0; i < 10; i++) host.frame({}); ok(kr.vx < v1 - 100 && (kr.player_flags & 16) !== 0, 'released: facing (and thrust) stay left');
    ok(pr.image_xscale === -1, 'presentation follows the canonical facing bit, not the stale velocity');
    for (let i = 0; i < 160; i++) host.frame({}); ok(kr.vx === -0x700, 'accelerates through zero to the left cap');
    host.frame({right: true}); ok((kr.player_flags & 16) === 0, 'Right alone clears the mirrored bit');
    host.frame({left: true, right: true}); ok((kr.player_flags & 16) !== 0, 'Left wins when both are held ($48A7)');
    // water/dry tables are the ROM rows (cross-check with the Research CSV)
    const csv = fs.existsSync(path.join(root, '..', 'sonic-chaos-reference-work', 'data', 'movement-tables.csv')) ? fs.readFileSync(path.join(root, '..', 'sonic-chaos-reference-work', 'data', 'movement-tables.csv'), 'utf8') : null;
    if (csv) {
        const row = (t, s) => csv.split(/\r?\n/).map(l => l.split(',')).find(r => r[0] === t && r[1].toUpperCase() === s.toString(16).toUpperCase().padStart(2, '0'));
        for (const s of [17, 18]) {
            eq([g.chaosMovementTables[0][s][0], g.chaosMovementTables[0][s][1]], [Number(row('dry_nonnegative', s)[3]), Number(row('dry_nonnegative', s)[4])], `state $${s.toString(16)} dry acceleration row = ROM`);
            eq([g.chaosMovementTables[3][s][0], g.chaosMovementTables[3][s][1]], [Number(row('water_nonnegative', s)[3]), Number(row('water_nonnegative', s)[4])], `state $${s.toString(16)} water acceleration row = ROM`);
        }
    }
}
count('Rocket horizontal');

// ---- 2c. vertical control: Research sweep (original routine), high-byte clamps, neutral oscillation, viewport clamp ----
{
    const rows = FOOT.rocket_shoes.movement.vertical_sweep.rows; eq(rows.length, 21, 'Research vertical sweep');
    const mk = (vy, held) => { const k = c.SCR_cc_new(200, 100); level(1); emptyWorld(); Object.assign(k, {state: 17, next: 17, move: 1, state11_active: true, state11_camera_y: 0, maximum: 0x700, vy, held}); c.SCR_cc_tick(k); return k; };
    for (const r of rows) eq(mk(r.before, r.input === 'up' ? 1 : (r.input === 'down' ? 2 : 0)).vy, r.after, `vertical ${r.input} ${r.before} -> ${r.after}`);
    // the high-byte clamp: -$0300 is kept, -$0340 clamps; +$02C0 is kept, +$0300 clamps (the old POC clamped at > $0300)
    eq(mk(-0x2C0, 1).vy, -0x300, 'Up to -$0300 is not clamped'); eq(mk(-0x300, 1).vy, -0x400, 'Up beyond -$0300 clamps to -$0400');
    eq(mk(0x2C0, 2).vy, 0x400, 'Down reaching +$0300 clamps to +$0400 (signed high byte >= 3)'); eq(mk(0x280, 2).vy, 0x2C0, 'Down below +$0300 is kept');
    eq(mk(0, 3).vy, -0x40, 'Up has priority over Down');
    // neutral oscillation: fractional speeds cross zero, there is no clamp to zero
    let v = 0x10; const seq = []; for (let i = 0; i < 6; i++) { v = mk(v, 0).vy; seq.push(v); }
    eq(seq, [-0x10, 0x10, -0x10, 0x10, -0x10, 0x10], 'neutral: +/-$20 chosen by the signed high byte oscillates around zero');
    eq(mk(0x1F, 0).vy, -1, 'positive fraction crosses zero'); eq(mk(-1, 0).vy, 31, 'negative fraction crosses zero');
    // pure Up from rest: -$40 per update, clamp after the high byte reaches -4 (12 updates)
    const up = []; let vv = 0; for (let i = 0; i < 14; i++) { vv = mk(vv, 1).vy; up.push(vv); }
    eq(up, [-64, -128, -192, -256, -320, -384, -448, -512, -576, -640, -704, -768, -1024, -1024], 'Up from rest: -$40 per update, +/-4.0 clamp');
    const dn = []; vv = 0; for (let i = 0; i < 14; i++) { vv = mk(vv, 2).vy; dn.push(vv); }
    eq(dn, [64, 128, 192, 256, 320, 384, 448, 512, 576, 640, 704, 1024, 1024, 1024], 'Down from rest: +$40 per update, +/-4.0 clamp (high byte 3 clamps)');
    // viewport clamp (Research camera sweep): screen Y < 24 -> +25, >= 192 -> +191, speed zero
    const cam = 1000;
    for (const r of FOOT.rocket_shoes.camera.vertical_clamp.rows) {
        const k = c.SCR_cc_new(200, cam + r.screen_y); Object.assign(k, {state: 17, next: 17, move: 1, state11_active: true, state11_camera_y: cam, maximum: 0x700, vy: 0x80});
        c.SCR_cc_tick(k);
        const clamped = r.screen_y < 24 || r.screen_y >= 192;
        if (clamped) eq([k.yu, k.vy], [r.world_y * 256, 0], `screen ${r.screen_y}: clamped to world ${r.world_y}`);
        else eq([Math.floor(k.yu / 256), k.vy !== 0], [r.world_y, true], `screen ${r.screen_y}: not clamped`);
    }
    eq(strip(rd('scripts/SCR_chaos_core/SCR_chaos_core.gml')).includes('cp_screen_y < 24'), true, 'threshold <24 in the shipped source');
    // gravity is bypassed: a long free flight with no input never accumulates downward speed
    const p = rocket(1000, 800, {timer: 5000}); let maxvy = 0;
    for (let i = 0; i < 200; i++) { host.frame({}); maxvy = Math.max(maxvy, Math.abs(p.chaosCore.vy)); }
    ok(maxvy <= 32, 'ordinary gravity is bypassed (neutral flight stays within the +/-$20 oscillation)');
    eq(p.chaosCore.state, 17, 'state $11 persists');
}
count('Rocket vertical');

// ---- 2d. duration: 300 decrements, expiry through $463C, music restore ----
{
    const p = rocket(1000, 800, {timer: 0}); const k = p.chaosCore;
    level(1); emptyWorld(); const q = host.newPlayer(1000, 800, {state: 14, move: 1});
    // enter through the real reward path so the 300 is the shipped constant
    q.chaosCore.reward_queue = 8; g.chaosPowerCode = 0; g.chaosPowerTimer = 0; host.frame({});
    const kq = q.chaosCore; timers.length = 0; eq(g.chaosPowerTimer, 300, 'reward writes 300');
    let n = 0; while (kq.next === 17 && n < 400) { host.frame({}); n++; }
    eq(timers.length, 301, '300 full callbacks + the exit callback');
    eq(timers.slice(0, 300).map(r => r[0]), Array.from({length: 300}, (_, i) => 300 - i), 'callbacks enter with timers 300..1');
    eq(timers.slice(0, 300).every(r => r[1] === true), true, 'all of them keep $11');
    eq([timers[300][0], timers[300][1]], [0, false], 'the 301st callback enters with zero');
    eq([kq.next, kq.vy, kq.move & 1, g.chaosPowerCode, g.chaosPowerTimer], [14, 256, 1, 0, 0], 'expiry: requested $0E, Y speed +1.0, airborne, selector cleared');
    eq([g.chaosLastSoundRequest, g.chaosMusicRestoreRequested], [0x81, true], 'level music restored on the exit callback');
    // Research expiry fixture rows
    const ex = FOOT.rocket_shoes.duration.fixtures.expiry;
    eq(ex.map(r => [r.timer_entering_callback, r.requested_state]), [[1, '0x11'], [0, '0x0E']], 'fixture shape'); ok(ex[1].vy === 256 && ex[1].flags === '0x01' && ex[1].sound_or_music_request === '0x81', 'fixture: exit row');
    // the exit callback still moves and collides
    const e = rocket(1000, 800, {timer: 0, vx: 0x300}); const x0 = e.chaosCore.xu; host.frame({}); ok(e.chaosCore.xu > x0, 'the exit callback still moved the player');
    // ordinary terrain collision does not expire it
    const f = rocket(1000, 700, {timer: 300, cells: [[31, 25, SOLID], [32, 25, SOLID], [30, 25, SOLID]]});
    for (let i = 0; i < 60; i++) host.frame({down: true}); eq(f.chaosCore.state, 17, 'landing/terrain contact does not end the Rocket');
    // no seconds-based timer exists
    ok(!/\b(alarm|seconds)\b/.test(strip(rd('scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml')).match(/function SCR_chaos_power_tick[\s\S]*?\n}\n/)[0]), 'no wall-clock timer');
}
count('Rocket duration');

// ---- 2e. terrain: floor tail (anchor up 2, Y speed 0), walls, never through a solid ----
{
    const top = 25 * 32;                                         // block row 25: surface Y 800
    const cells = []; for (let cx = 20; cx <= 44; cx++) cells.push([cx, 25, SOLID]);
    const p = rocket(1000, top - 60, {cells, timer: 5000}); const k = p.chaosCore;
    let landed = -1, minGap = 99;
    for (let i = 0; i < 70; i++) {                                // stays over the 25-cell floor strip
        host.frame({down: true});
        const feet = Math.floor(k.yu / 256) + 18; minGap = Math.min(minGap, top - feet);
        if (landed < 0 && (k.contacts & 2) !== 0) landed = i;
    }
    ok(landed > 0, 'the Rocket meets the floor'); ok(minGap >= -5, 'never deeper than one update of 4.0 px fall (the shared floor handler projects on the update after first contact)');
    // the update of first contact, replayed: projection to anchor top-18, then the tail lifts it two pixels and zeroes Y speed
    const q = rocket(1000, top - 40, {cells, timer: 5000, vy: 0x400}); const kq = q.chaosCore;
    let hit = false;
    for (let i = 0; i < 20 && !hit; i++) { host.frame({down: true}); if ((kq.contacts & 2) !== 0) hit = true; }
    ok(hit, 'floor contact'); eq([Math.floor(kq.yu / 256), kq.vy, kq.bg & 2], [top - 20, 0, 0], 'floor tail: anchor = surface - 18 - 2, Y speed 0, floor flag cleared');
    eq(kq.state, 17, 'still state $11'); ok((kq.player_flags & 16) === 0, 'facing unchanged');
    // wall: a solid column to the right stops the thrust (shared side collision)
    const wall = []; for (let cy = 20; cy <= 29; cy++) wall.push([35, cy, SOLID]);
    const r = rocket(900, 700, {cells: wall, timer: 5000}); const kr = r.chaosCore;
    for (let i = 0; i < 400; i++) host.frame({});
    ok(Math.floor(kr.xu / 256) <= 35 * 32 - 9, 'a wall is solid: Sonic stops at the side probe'); eq(kr.vx <= 0x700 && kr.state, 17, 'wall contact does not end the Rocket');
}
count('Rocket terrain');

// ---- 2f. rings: type $09, ordinary terrain rings, lost/recoverable rings ----
{
    // ring manager Step_2 for MGHZ2 (real type-$09 records, real terrain rings), player in state $11 / $12
    for (const state of [17, 18]) {
        level(2); const rm = host.newInstance('OBJ_chaos_ring_manager', 0, 0);
        const rec = rm.chaosType09Records[0]; eq(rm.chaosType09Records.length, 6, 'MGHZ2 owns 6 type-$09 rings');
        for (const [dx, dy, want] of FOOT.rocket_shoes.rings.fixtures.type_09.filter(r => r.state === `0x${state.toString(16)}`).map(r => [r.dx, r.dy, r.collected])) {
            level(2); emptyWorld(); const m = host.newInstance('OBJ_chaos_ring_manager', 0, 0);
            const rr = m.chaosType09Records[0]; g.ring = 0;
            const pl = host.newPlayer(rr[1] + dx, rr[2] + dy, {state, move: 1}); pl.chaosCore.next = state;
            host.runEvent(m, 'objects/OBJ_chaos_ring_manager/Step_2.gml');
            eq([m.chaosType09Collected[0], g.ring], [want, want ? 1 : 0], `type $09 in state $${state.toString(16)}: dx ${dx} dy ${dy}`);
        }
        // state independence (source): neither collection path of Step_2 mentions a player state or a power-up
        const st2 = strip(rd('objects/OBJ_chaos_ring_manager/Step_2.gml'));
        ok(!/chaosPower|\.state\b|state11|\bnext\b/.test(st2), 'ring manager collection reads no player state / power-up');
    }
    // ordinary terrain rings: random sweep against the independent model (Y-8 even / Y+2 odd of the update's FINAL anchor and shadow counter)
    for (const state of [17, 18]) {
        let collected = 0, trials = 0;
        for (let dy = -14; dy <= 8; dy++) for (let dx = -3; dx <= 3; dx += 3) {
            level(1); emptyWorld(); const m = host.newInstance('OBJ_chaos_ring_manager', 0, 0);
            m.chaosRingRecords = [[0, 328, 328, 0x40, 10 * mapW() + 10, 0, 'terrain']]; m.chaosRingQuadIndex = c.chaos_terrain_ring_index(m.chaosRingRecords); m.chaosRingActive = [true];
            g.ring = 0; const pl = host.newPlayer(328 + dx, 336 + dy, {state, move: 1}); pl.chaosCore.next = state;
            host.frame({}); host.runEvent(m, 'objects/OBJ_chaos_ring_manager/Step_2.gml');
            const k = pl.chaosCore, ay = Math.floor(k.yu / 256), ax = Math.floor(k.xu / 256), parity = k.anim.t & 1;
            const probeY = Math.max(0, ay + (parity ? 2 : -8));
            const inQuad = ax >> 4 === 328 >> 4 && probeY >> 4 === 328 >> 4 && ax >> 5 === 10 && probeY >> 5 === 10;
            eq([k.ring_probe_valid, g.ring], [true, inQuad ? 1 : 0], `terrain ring probe state $${state.toString(16)} anchor (${ax},${ay}) parity ${parity}`);
            collected += g.ring; trials++;
        }
        ok(collected > 0 && collected < trials, 'both collecting and non-collecting anchors exist in the sweep');
    }
    eq(c.chaos_ring_probe_eligible(17) && c.chaos_ring_probe_eligible(18), true, 'states $11/$12 are in the 26-state probe list');
    eq([34, 32, 19, 12].map(c.chaos_ring_probe_eligible), [false, false, false, false], 'loop/twist/act-clear states are not');
    // lost (type $06) rings: state-independent pickup through the shared counter
    for (const state of [17, 18]) {
        level(1); emptyWorld(); g.ring = 0;
        const pl = host.newPlayer(2000, 600, {state, move: 1}); const k = pl.chaosCore; k.next = state;
        w.cam.x = 2000 - 128; w.cam.y = 600 - 96;                       // the scatter is only alive inside the lifetime window
        const emitted = c.chaos_lr_emit(25, 2000, 616);                       // 3 rings at the player (anchor Y-16 spawn)
        eq(emitted, 3, 'three lost rings'); const ring0 = c.chaos_lr_list()[0];
        let picked = 0;
        for (let u = 0; u < 40 && picked === 0; u++) {
            ring0.xu = 2000 * 256; ring0.yu = 600 * 256; ring0.vx = 0; ring0.vy = 0;     // hold the ring at the anchor: the lockout (16 updates) is what delays the pickup
            picked += c.SCR_chaos_lost_rings_phase(true, k);
            if (picked) eq(u, 17, `lost ring in state $${state.toString(16)}: first pickup test on pass 17 (pass 0 = spawn, 16 locked)`);
        }
        ok(picked >= 1 && g.ring >= 1, 'recoverable ring collected through the shared ring counter');
    }
}
count('Rocket / Spring rings');

// ---- 2g. Rocket damage: rings retained, no ordinary death selection, the ordinary hurt path unchanged ----
{
    function hurt(state, rings, via, o = {}) {
        level(1); emptyWorld(via === 'spike' ? [30, 31, 32, 33].map(cx => [cx, 25, 0x3C]) : []); g.ring = rings; g.powerShield = !!o.shield; g.chaosPowerCode = state === 17 ? 4 : 0; g.chaosPowerTimer = state === 17 ? 200 : 0;
        const pl = host.newPlayer(via === 'spike' ? 1000 : 1500, via === 'spike' ? 740 : 800, {state, move: state === 17 ? 0 : 1}); const k = pl.chaosCore; k.next = state;
        if (state === 17) { k.state11_active = true; k.reward_queue = 8; }
        let result;
        if (via === 'request') { k.stage_request = 255; host.frame({}); host.frame({}); }
        else if (via === 'spike') { for (let i = 0; i < 40 && !(k.state === 30 || k.next === 30); i++) host.frame({down: true}); }   // flies into a floor spike (surface 5, block $3C): the terrain pass calls $48F7 directly
        else if (via === 'legacy') { c.SCR_chaos_apply_hazard_damage(pl); host.frame({}); }
        return {pl, k, dead: !!pl.dead, rings: g.ring, scatter: c.chaos_lr_list().length, events: w.events.slice()};
    }
    for (const rings of [0, 1, 10, 47]) for (const via of ['request', 'spike', 'legacy']) {
        const h = hurt(17, rings, via);
        eq([h.dead, h.rings, h.scatter], [false, rings, 0], `Rocket + ${via}, ${rings} rings: rings retained, no scatter, no death (also with zero rings)`);
        eq([h.k.state === 30 || h.k.next === 30, (h.k.move & 193) === 193 || via === 'legacy', g.chaosPowerCode, h.k.reward_queue], [true, true, 0, 0], 'hurt state $1E, selector cleared, queue cleared');
        eq([g.chaosLastSoundRequest === 0xC3 || h.k.hurt_rocket === false, g.chaosMusicRestoreRequested], [true, true], 'sound $C3 / level music restore');
    }
    { const h = hurt(17, 5, 'request', {shield: true}); eq(g.powerShield, true, 'a POC shield is not consumed by the Rocket branch'); eq(h.rings, 5, 'rings kept with the shield too'); }
    // the fixture rows (original routine): entry values of the hurt
    for (const r of FOOT.rocket_shoes.duration.fixtures.damage) eq([r.rings_before, r.rings_after, r.requested_state, r.selector, r.queued_rewards, r.vy, r.flags, r.sound], [r.rings_before, r.rings_before, '0x1E', '0x00', '0x00', -1024, '0xC1', '0xC3'], 'fixture: damage keeps the rings');
    { // the core entry itself ($48F7 -> $4942): Rocket branch values
      const k = c.SCR_cc_new(1000, 800); Object.assign(k, {state: 17, next: 17, move: 0, rings: 47, shield: true, reward_queue: 8});
      c.SCR_cc_hurt_rom(k);
      eq([k.hurt_rocket, k.hurt_death, k.hurt_scatter, k.hurt_rings_lost, k.hurt_shield, k.rings, k.reward_queue], [true, false, 0, 0, false, 47, 0], 'Rocket branch: rings, shield and queue handling');
      eq([k.next, k.vy, k.vx, k.invuln, k.move & 193, k.hurt_pending], [30, -1024, -256, 120, 193, true], 'then the shared $4942 hurt: state $1E, vy -4.0, vx -1.0, invulnerability 120, +$03 |= $C1');
      const z = c.SCR_cc_new(1000, 800); Object.assign(z, {state: 17, next: 17, rings: 0}); c.SCR_cc_hurt_rom(z); eq([z.hurt_death, z.next], [false, 30], 'zero rings: no death selection ($1F)');
      const n = c.SCR_cc_new(1000, 800); Object.assign(n, {state: 14, next: 14, rings: 0}); c.SCR_cc_hurt_rom(n); eq([n.hurt_death, n.next, n.vy], [true, 31, -1280], 'control: the same hurt in state $0E is the ordinary death');
      const m = c.SCR_cc_new(1000, 800); Object.assign(m, {state: 14, next: 14, rings: 47, shield: false}); c.SCR_cc_hurt_rom(m); eq([m.hurt_scatter, m.rings, m.hurt_rocket], [5, 0, false], 'control: ordinary ring loss unchanged'); }
    // ordinary (non-Rocket) hurt keeps the recovered scatter / death paths: regression of the lost-ring package
    { const h = hurt(14, 47, 'request'); eq([h.dead, h.rings, h.scatter], [false, 0, 5], 'ordinary hurt: rings lost into 5 collectable rings'); }
    { const h = hurt(14, 0, 'request'); eq(h.dead, true, 'ordinary hurt with zero rings: death'); }
    { const h = hurt(14, 12, 'legacy'); eq([h.dead, h.rings, h.scatter], [false, 0, 2], 'legacy hazard: scatter'); }
    // damage while NOT in state $11 never touches the shared selector/timer (Spring Shoes with a stale Rocket timer)
    { level(1); emptyWorld(); g.ring = 10; g.chaosPowerCode = 4; g.chaosPowerTimer = 150; const pl = host.newPlayer(1500, 800, {state: 18, move: 1}); pl.chaosCore.next = 18; pl.chaosCore.stage_request = 255;
      host.frame({}); host.frame({}); eq([g.chaosPowerCode, g.ring, c.chaos_lr_list().length > 0], [4, 0, true], 'state $12 hurt is ordinary: rings lost, the old selector untouched'); }
}
count('Rocket damage');

// ---- 2h. state $11 is not attacking; monitors / $21 / invincibility read the stored bit ----
{
    const p = rocket(1312, 560, {timer: 5000}); const k = p.chaosCore;
    for (const inp of [{}, {down: true}, {up: true}, {right: true}, {jumpPress: true, jump: true}]) for (let i = 0; i < 20; i++) {
        host.frame(inp); eq([k.state, k.move & 2, g.chaosAttackPosture, p.chaosAttack], [17, 0, false, false], 'state $11 never turns the attack bit on (not from velocity, not from airborne)');
    }
    // monitor: a descending Rocket Sonic does not break it
    level(1); emptyWorld(); const q = rocket(1312, 600, {timer: 5000, vy: 0x400}); const mon = host.newInstance('OBJ_chaos_object_10', 1312, 660); c.chaos_type10_configure(mon, 2);
    Object.assign(mon, {chaosActive: true, chaosAsleep: false, chaosWoken: true, chaosScanTick: 1, chaosInitialFillDone: true, chaosState: 2}); mon.stepPath = 'objects/OBJ_chaos_object_10/Step_0.gml'; w.badniks.push(mon);
    for (let i = 0; i < 60; i++) host.frame({down: true});
    eq(mon.chaosConsumed, false, 'Rocket Sonic cannot break a monitor');
    // the stored bit, when set from elsewhere (e.g. invincibility), is published unchanged during $11
    q.chaosCore.move |= 2; host.frame({}); eq([g.chaosAttackPosture, q.chaosCore.state], [true, 17], 'a set attack bit is published, the state does not suppress it');
    // $21: top stomp bounces, side/low contact damages the Rocket Sonic
    for (const [label, dy, dx, want] of [['top', -10, 0, 'stomp'], ['side', 0, 12, 'hurt'], ['low', 20, 4, 'hurt']]) {
        level(1); w.follow = false; emptyWorld(); g.ring = 5; g.chaosPowerCode = 4; g.chaosPowerTimer = 200;
        const pl = host.newPlayer(1500 + dx, 800 + dy, {state: 17, move: 0}); const kk = pl.chaosCore; c.SCR_cc_state11_enter(kk); kk.state = 17; kk.next = 17; kk.vx = 0; kk.vy = -48 + (dy < 0 ? 0 : 0);
        const o = host.newInstance('OBJ_chaos_object_21', 1500, 800); c.chaos_type21_configure(o, 4, 0x10);
        Object.assign(o, {chaosActive: true, chaosAsleep: false, chaosWoken: true, chaosScanTick: 1, chaosInitialFillDone: true, chaosInitDelay: 0, chaosState: 5, chaosVX: 0, chaosVY: 0, chaosXU: 1500 * 256, chaosYU: 800 * 256, chaosOriginX: 1540, chaosLeftBound: 1100});
        const saved = c.SCR_chaos_object_floor_project; c.SCR_chaos_object_floor_project = (x, y) => ({grounded: true, y}); o.stepPath = 'objects/OBJ_chaos_object_21/Step_0.gml'; w.badniks.push(o);
        w.cam.x = 1372; w.cam.y = 704; for (let i = 0; i < 3; i++) host.frame({}); c.SCR_chaos_object_floor_project = saved;
        if (want === 'stomp') eq([kk.next, o.destroyed], [11, undefined], '$21 top stomp works for a Rocket Sonic');
        else eq([o.destroyed, g.ring], [undefined, 5], `$21 ${label} contact does not defeat a non-attacking Rocket Sonic`);
        if (want === 'hurt') eq([g.chaosPowerCode, kk.state === 30 || kk.next === 30], [0, true], '$21 side/low contact hurts (and ends) the Rocket without ring loss');
    }
}
count('Rocket attack posture / interaction');


// ======================================================================================================================================
// 3. SPRING SHOES (mapped type $2F parameter $00, owner $D3A4, player state $12)
// ======================================================================================================================================
const TOP = 25 * 32;                                                       // block row 25: floor surface Y 800
const floorCells = (c0 = 20, c1 = 44) => { const o = []; for (let cx = c0; cx <= c1; cx++) o.push([cx, 25, SOLID]); return o; };
function ownerObj(x, y) {
    const o = host.newInstance('OBJ_chaos_object_2F', x, y);
    Object.assign(o, {chaosActive: true, chaosAsleep: false, chaosWoken: true, chaosScanTick: 1, chaosInitialFillDone: true, chaosState: 1});
    o.stepPath = 'objects/OBJ_chaos_object_2F/Step_0.gml'; w.badniks.push(o); return o;
}
/// Sonic already in state $12 over the floor strip with an attached owner (the owner object runs its shipped Step event every frame).
function shoes(x, y, o = {}) {
    level(o.act || 1); emptyWorld(o.cells || floorCells());
    const p = host.newPlayer(x, y, {state: 18, move: o.move ?? 1, vx: o.vx || 0, vy: o.vy || 0});
    const k = p.chaosCore; k.next = 18; if (o.water) k.water = 1; k.maximum = o.maximum ?? 1024;
    const ow = ownerObj(x, y + 16); ow.chaosState = 3; ow.chaosFrame = 3; ow.chaosAnimTick = 0; p.chaosShoeOwner = ow;
    return {p, k, ow};
}

// ---- 3a. placements and spawn ----
{
    const want = {1: [[1552, 238]], 2: [[3760, 494], [2592, 174]]};
    for (const act of [1, 2]) {
        level(act); c.chaos_level_spawn_objects();
        const made = w.badniks.filter(o => o.object_index === host.ids.OBJ_chaos_object_2F);
        eq(made.map(o => [o.x, o.y]).sort(), want[act].slice().sort(), `mghz${act}: canonical $2F placements`);
        eq(made.every(o => o.chaosParameter === 0 && o.sprite_index === host.ids.SPR_chaos_mghz_spring_shoes), true, 'parameter $00, approved MGHZ resource');
        const rec = CENSUS.acts[`mghz${act}`].records.filter(r => r.type_id === '0x2F'); eq(rec.length, want[act].length, 'census count'); eq(rec.every(r => r.aux0 === '0xAC' && r.aux1 === '0xAC'), true, 'art base $AC');
        eq(made.length, g.chaosSpawnedByType[0x2f], 'spawn counter');
    }
    const spr = JSON.parse(rd('sprites/SPR_chaos_mghz_spring_shoes/SPR_chaos_mghz_spring_shoes.yy')); eq(spr.frames.length, 4, 'mapping frames 1..4');
    // rocket monitors: MGHZ1 (1312,110) and MGHZ2 (48,878), parameter 4, now instantiated
    for (const [act, x, y] of [[1, 1312, 110], [2, 48, 878]]) { level(act); c.chaos_level_spawn_objects(); const m = w.badniks.find(o => o.object_index === host.ids.OBJ_chaos_object_10 && o.x === x && o.y === y); ok(m && m.chaosParameter === 4 && m.sprite_index === host.ids.SPR_chaos_mghz_monitor_04, `Rocket monitor ${x},${y}`); }
    // the canonical test route in one place: monitor (1312,110), shoes (1552,238), $21 (1744,238) are all present in MGHZ1
    level(1); c.chaos_level_spawn_objects();
    const near = [[0x10, 1312, 110], [0x2f, 1552, 238], [0x21, 1744, 238]].map(([t, x, y]) => w.badniks.some(o => o.x === x && o.y === y && o.chaosPlacementIndex !== undefined));
    eq(near, [true, true, true], 'MGHZ1 route X ~1300..1760: Rocket monitor, Spring Shoes and a $21 spawn from their canonical records');
}
count('Spring Shoes placements');

// ---- 3b. pickup: the Research attachment sweep, owner pointer, no selector / timer, attack inheritance ----
function pickup(dy, attacking) {
    level(1); w.follow = false; emptyWorld();
    const ox = 1000, oy = 700;
    const p = host.newPlayer(ox, oy + dy, {state: attacking ? 10 : 14, move: attacking ? 3 : 1, vy: -48});    // vy -48 + gravity: the anchor stays where it was placed
    const ow = ownerObj(ox, oy); p.chaosShoeOwner = noone_(); w.cam.x = ox - 128; w.cam.y = oy - 96;
    host.frame({});
    return {p, ow, k: p.chaosCore};
}
const noone_ = () => -4;
{
    const rows = FOOT.spring_shoes.pickup.attachment_sweep.rows; eq(rows.length, 10, 'Research attachment sweep');
    for (const r of rows) {
        const s = pickup(r.dy, r.attack_before);
        const attached = r.requested_player_state === '0x12';
        eq([s.k.next === 18, s.ow.chaosRequest === 3, s.p.chaosShoeOwner === s.ow], [attached, attached, attached], `dy ${r.dy} attack ${r.attack_before}: attach = ${attached}`);
        eq((s.k.move & 2) !== 0, r.attack_after, `dy ${r.dy}: attack bit inherited unchanged (${r.attack_after})`);
        eq([g.chaosPowerCode, g.chaosPowerTimer, s.k.reward_queue], [0, 0, 0], 'no selector $D532 and no timer');
        eq(s.ow.chaosState === 3 || s.ow.chaosState === 1, true, 'object state 1 -> 3 request');
    }
    // not offered while rising, nor while already attached
    { const s = pickup(-14, false); const q = pickup(-14, false); }
    { level(1); w.follow = false; emptyWorld(); const p = host.newPlayer(1000, 686, {state: 14, move: 1, vy: -600}); const ow = ownerObj(1000, 700); w.cam.x = 872; w.cam.y = 604; host.frame({}); eq([p.chaosCore.next, ow.chaosRequest], [14, 0], 'a rising Sonic (negative Y speed) passes through the object'); }
    { const {p, k, ow} = shoes(1000, 600); const ow2 = ownerObj(1000, 584); host.frame({}); eq(ow2.chaosRequest, 0, 'already attached (state $12): a second object offers nothing'); ok(p.chaosShoeOwner === ow, 'owner pointer unchanged'); }
    // hurt Sonic is not offered it ($6328 reports no contact while +$03 bit 6 is set)
    { level(1); w.follow = false; emptyWorld(); const p = host.newPlayer(1000, 686, {state: 14, move: 1 | 64, vy: -48}); const ow = ownerObj(1000, 700); w.cam.x = 872; w.cam.y = 604; host.frame({}); eq(ow.chaosRequest, 0, 'hurt: no contact'); }
    // bottom / side contacts are solid and never a pickup; a grounded attacking side contact stands Sonic up 16 px away
    { level(1); w.follow = false; emptyWorld(floorCells()); const ow = ownerObj(1000, 784); const p = host.newPlayer(1018, 782, {state: 9, move: 2, vx: -300, bg: 2, contacts: 2, previous: 0x81}); p.chaosCore.vy = 0; w.cam.x = 872; w.cam.y = 688;
      host.frame({}); eq(p.chaosCore.next === 18, false, 'a side contact is not a pickup'); eq([p.chaosCore.next, p.chaosCore.vx], [1, 0], 'grounded attacker: stand request, X speed zero'); eq(Math.floor(p.chaosCore.xu / 256), 1016, 'placed 16 px to the object side (right side: +16)'); }
    // sprite frames: 1/2 alternate every 8 updates while offered
    { level(1); w.follow = false; emptyWorld(); const ow = ownerObj(1000, 700); ow.chaosAnimTick = -1; w.cam.x = 872; w.cam.y = 604; const fr = []; for (let i = 0; i < 40; i++) { host.runEvent(ow, 'objects/OBJ_chaos_object_2F/Step_0.gml'); fr.push(ow.chaosFrame); }
      eq(new Set(fr), new Set([1, 2]), 'frames 1 and 2'); eq(fr.slice(0, 9).join(''), '111111111'.slice(0, 8) + '2', 'first record: 8 updates of frame 1, then frame 2'); eq(fr[16] === 1 && fr[24] === 2, true, '8-update records alternate'); }
}
count('Spring Shoes pickup');

// ---- 3c. no timer, ordinary gravity, ordinary horizontal control, foot probe ----
{
    // gravity: +$0030 dry / +$0018 water, terminals +7 / +4 (shared state table: state $12 uses the default row)
    const grav = (water) => { const {p, k} = shoes(1000, 100, {cells: [], water}); k.vy = 0; const out = []; for (let i = 0; i < 50; i++) { host.frame({}); out.push(k.vy); } return out; };
    const sim = (g1, term, n) => { let v = 0; const o = []; for (let i = 0; i < n; i++) { v += g1; if (v >> 8 >= (term >> 8)) v = term; o.push(v); } return o; };
    eq(grav(false), sim(48, 1792, 50), 'dry: +$0030 per update to +7.0'); eq(grav(true).slice(0, 50), sim(24, 1024, 50), 'water: +$0018 per update to +4.0');
    // ordinary horizontal control: the same state-table rows as the Rocket, no forced direction
    const run = (inp, n, vx0) => { const {p, k} = shoes(1000, 100, {cells: [], vx: vx0 || 0, maximum: 1024}); k.vy = -2000; const out = []; for (let i = 0; i < n; i++) { host.frame(inp); out.push(k.vx); } return {out, k}; };
    const acc = []; let v = 0; for (let i = 0; i < 40; i++) { v += ((Math.abs(v) + 128) >> 8) === 0 ? 32 : 16; if ((v >> 8) >= 4) v = 1024; acc.push(v); }
    eq(run({right: true}, 40).out, acc, 'Right: +$0010 (doubled under 128) to the ordinary maximum (4.0 here)');
    eq(run({left: true}, 40).out, acc.map(x => -x), 'Left mirrors it');
    eq(run({}, 20).out.every(x => x === 0), true, 'no input: no forced thrust (unlike the Rocket)');
    const fr = run({}, 12, 500).out; ok(fr[0] < 500 && fr[0] > 400 && fr[11] < fr[0], 'neutral friction decelerates');
    { const csv = path.join(root, '..', 'sonic-chaos-reference-work', 'data', 'movement-tables.csv'); if (fs.existsSync(csv)) { const r = fs.readFileSync(csv, 'utf8').split(/\r?\n/).map(l => l.split(',')).find(x => x[0] === 'no_direction' && x[1] === '12'); eq([g.chaosMovementTables[2][18][0], g.chaosMovementTables[2][18][1]], [Number(r[3]), Number(r[4])], 'state $12 neutral friction row = ROM row'); } }
    eq(strip(rd('scripts/SCR_chaos_core/SCR_chaos_core.gml')).includes('cp_c.state == 18 ? 8'), true, 'foot probe +8 for state $12 is retained in the shared floor probe');
    // no timer / selector: 900 frames of repeated bounces never leave the state
    { const {p, k} = shoes(1000, 740, {cells: floorCells(0, 120), vx: 0}); let n18 = 0; for (let i = 0; i < 900; i++) { host.frame({}); if (k.state === 18) n18++; }
      eq([n18, g.chaosPowerCode, g.chaosPowerTimer, g.chaosLastSoundRequest !== 0x85], [900, 0, 0, true], 'no duration: 900 updates, no selector, no timer, no expiry'); }
    ok(!/chaosPower|state18_timer|\balarm\b/.test(strip(rd('scripts/SCR_chaos_core/SCR_chaos_core.gml')).match(/function SCR_cc_state18_tick[\s\S]*?\n}\n/)[0]), 'state $12 callback has no timer');
}
count('Spring Shoes physics');

// ---- 3d. floor relaunch -7.5: repeated, independent of incoming speed, attack inherited, no sound/velocity drift ----
{
    for (const attack of [false, true]) {
        const {p, k, ow} = shoes(1000, 700, {cells: floorCells(0, 120), move: attack ? 3 : 1}); const tops = [], landVy = [], sounds = [];
        let prevVy = 0;
        for (let i = 0; i < 900; i++) {
            host.frame({});
            if (k.shoe_bounced) { landVy.push(k.vy); tops.push(Math.floor(k.yu / 256)); sounds.push(k.sound);
                eq([k.vy, k.bg & 2, k.move & 1, (k.move & 2) !== 0, k.next, k.owner_event, ow.chaosState, ow.chaosAnimTick, ow.chaosFrame], [-1920, 0, 1, attack, 18, 3, 3, 0, 3], `bounce ${landVy.length}: -7.5, floor flag cleared, airborne, attack ${attack} preserved, owner restarted in state 3 (frame 3) in the same update`); }
            prevVy = k.vy;
        }
        ok(landVy.length >= 8, 'repeated bounces'); eq(new Set(landVy), new Set([-1920]), 'every bounce is exactly -7.5');
        eq(new Set(tops.slice(2)).size, 1, 'every landing at the same height (no energy gain or loss)'); eq(new Set(sounds), new Set([2]), 'sound request on every bounce');
        eq(k.state, 18, 'still attached');
    }
    // independent of the incoming speed: slow touch-down and a fast one relaunch identically
    for (const vy0 of [0, 200, 900, 1792]) { const {k} = shoes(1000, TOP - 30, {vy: vy0, cells: floorCells()}); let got = null; for (let i = 0; i < 40 && got === null; i++) { host.frame({}); if (k.shoe_bounced) got = k.vy; } eq(got, -1920, `incoming vy ${vy0}`); }
    // owner positioning and animation: X = player X, Y = player Y + 16 (frame 3) / + 11 (frame 4); frame 3 for 12 owner updates after each bounce
    { const {p, k, ow} = shoes(1000, 700, {cells: floorCells(0, 120)}); const rec = []; let sinceBounce = -1;
      for (let i = 0; i < 120; i++) { const frameAtPositioning = ow.chaosFrame; host.frame({}); rec.push([ow.x, ow.y, Math.floor(k.xu / 256), Math.floor(k.yu / 256), frameAtPositioning, ow.chaosState]); }   // $3BA8 reads the frame the owner showed BEFORE this update's object phase
      for (const [ox, oy, px, py, fr] of rec) eq([ox, oy], [px, py + (fr === 3 ? 16 : 11)], 'owner anchor follows the player'); ok(rec.some(r => r[4] === 3) && rec.some(r => r[4] === 4), 'both attached frames are used'); }
}
count('Spring Shoes relaunch');

// ---- 3e. manual jump detaches and returns to ordinary jump behaviour ----
{
    for (const water of [false, true]) {
        const {p, k, ow} = shoes(1000, 700, {cells: floorCells(0, 120), water}); for (let i = 0; i < 6; i++) host.frame({});
        host.frame({jump: true, jumpPress: true});
        eq([k.next, k.vy < 0, k.move & 3, k.owner_event], [10, true, 3, 5], 'jump: state $0A, airborne+attack (ordinary jump)');
        ok(Math.abs(k.vy + (water ? 832 : 1088)) <= 48 + 24, `ordinary jump speed ${water ? '-3.25 water' : '-4.25 dry'} (this update's gravity applies)`);
        host.frame({}); eq([ow.chaosState, k.state], [5, 10], 'owner is falling away, Sonic in the ordinary jump state');
        eq(p.chaosShoeOwner, noone_(), 'owner pointer cleared (the update after the state change)');
        // landing never relaunches again
        for (let i = 0; i < 200; i++) { host.frame({}); ok(k.state !== 18, 'never returns to $12'); }
    }
    // jump pressed in the very update that touches the floor: the jump wins (the button test precedes the floor test)
    { const {p, k} = shoes(1000, TOP - 40, {vy: 600}); let done = false; for (let i = 0; i < 20 && !done; i++) { host.frame({jump: true, jumpPress: true}); if (k.state !== 18) done = true; } ok(done && k.next === 10, 'jump replaces the state on the first update with the button'); }
}
count('Spring Shoes manual jump');

// ---- 3f. springs: mapped $26 is INERT for state $12; terrain springs replace the state (Research spring-shoes-presentation-audit 3.3) ----
function springScenario(kind, withShoes) {
    level(1); w.follow = true;
    const cells = floorCells(0, 120); let spr = null;
    if (kind === 'terrain') cells.push(...[30, 31, 32, 33].map(cx => [cx, 25, 0x30]));       // MGHZ upright spring blocks
    emptyWorld(cells);
    const p = host.newPlayer(1000, TOP - 60, {state: withShoes ? 18 : 14, move: 1, vy: 0}); const k = p.chaosCore; if (withShoes) k.next = 18;
    let ow = null; if (withShoes) { ow = ownerObj(1000, TOP - 44); ow.chaosState = 3; ow.chaosFrame = 3; p.chaosShoeOwner = ow; }
    if (kind === 'strong' || kind === 'weak') {
        // record height chosen so the window holds the ordinary standing anchor (782) or, for the wearer, the +8-probe anchor (774..775): the most favourable case for a launch
        spr = {chaosState: 7, chaosParameter: kind === 'strong' ? 0 : 1, chaosLayoutY: withShoes ? TOP - 7 : TOP, chaosBaseX: 1000, chaosBaseY: TOP, chaosOffset: 0, chaosDrawX: 1000, chaosTimer: 0, chaosSpan: 0, chaosRestState: 7, x: 1000, y: TOP};
    }
    const rec = []; let fired = false;
    for (let i = 0; i < 160; i++) {
        host.frame({}); if (spr) { c.SCR_chaos_object_spring_step(spr); if (spr.chaosState !== 7) fired = true; }
        rec.push({vy: k.vy, next: k.next, move: k.move, d448: k.d448, st: k.state, ptr: p.chaosShoeOwner});
        if (kind === 'terrain' && k.next === 11) break;
        if (!withShoes && fired) break;
    }
    return {k, p, ow, rec: rec[rec.length - 1], n: rec.length, spr, fired, all: rec};
}
{
    for (const kind of ['strong', 'weak']) {
        const b = springScenario(kind, false); ok(b.fired && b.rec.next === 11, `${kind}: control - the same spring launches an ordinary Sonic`);
        const a = springScenario(kind, true);
        eq(a.fired, false, `${kind} mapped $26 over Spring Shoes: no launch`);
        eq(a.all.every(r => r.next === 18 && r.st === 18), true, `${kind}: Sonic stays in state $12 for 160 updates (the shoes keep bouncing)`);
        eq(a.all.some(r => r.vy === -1888 || r.vy === -1280), false, 'no mapped-spring speed ever appears'); ok(a.ow.chaosState !== 5, 'the shoes are not detached');
    }
    { // terrain upright spring: requests $0B, replaces the state, the shoes detach through the ordinary rule
        const b = springScenario('terrain', false), a = springScenario('terrain', true);
        eq([a.rec.vy, a.rec.next, a.rec.move & 2, a.rec.move & 1], [-1920, 11, 0, 1], 'terrain upright spring over Spring Shoes: -7.5, state $0B, attack cleared');
        eq([a.rec.vy, a.rec.next, a.rec.move], [b.rec.vy, b.rec.next, b.rec.move], 'identical to the ordinary Sonic result (no stacking)');
        host.frame({}); eq(a.k.state, 11, 'next update runs $0B'); eq(a.p.chaosShoeOwner, noone_(), 'owner released'); host.frame({}); ok(a.ow.chaosState === 5, 'shoes detached (owner state 5)');
    }
    { const k = c.SCR_cc_new(1000, 700); Object.assign(k, {state: 18, next: 18, move: 1, bg: 2, zone: 3, vy: 100}); c.SCR_cc_spring(k, 20, 0x36); eq([k.next, k.vy, k.move & 3], [28, -1408, 3], 'diagonal TERRAIN spring (MGHZ -5.5) requests $1C and attacks: the state replacement is the detach');
      const h2 = c.SCR_cc_new(1000, 700); Object.assign(h2, {state: 18, next: 18, move: 1}); c.SCR_cc_spring(h2, 1, 0); eq([h2.next, h2.vx, h2.move & 2], [9, 1536, 2], 'horizontal terrain spring: X speed +6.0, state 9'); }
    { const k = c.SCR_cc_new(1000, 700); Object.assign(k, {state: 17, next: 17, move: 1, bg: 2, vy: 100}); c.SCR_cc_spring(k, 9, 0x30); eq([k.next, k.vy], [17, 100], 'terrain springs reject state $11 (control)'); }
    ok(!rd('scripts/SCR_chaos_spring/SCR_chaos_spring.gml').split('\n').filter(l => !l.trim().startsWith('//')).join('\n').toLowerCase().includes('diagonal'), 'no mapped diagonal spring exists: diagonal springs are terrain (kind 20, blocks $36/$38)');
}
count('Spring Shoes vs springs');

// ---- 3g. owner cleanup whenever $12 is replaced; side-wall branch; damage ----
function cleanup(how) {
    const o = {cells: floorCells(0, 120)};
    if (how === 'wall') o.cells = floorCells(0, 120).concat([[33, 24, SOLID], [33, 23, SOLID]]);          // a wall to the right of Sonic's path
    const s = shoes(1000, 700, Object.assign({vx: how === 'wall' ? 600 : 0}, o)); const {p, k, ow} = s;
    g.ring = 10; const log = [];
    for (let i = 0; i < 400 && k.state === 18; i++) {
        if (how === 'hurt' && i === 30) k.stage_request = 255;
        if (how === 'rocket' && i === 30) k.reward_queue = 8;
        host.frame(how === 'wall' ? {right: true} : (how === 'jump' && i === 30 ? {jump: true, jumpPress: true} : {}));
    }
    for (let i = 0; i < 6; i++) host.frame({});
    return Object.assign(s, {log});
}
{
    for (const how of ['jump', 'hurt', 'rocket', 'wall']) {
        const s = cleanup(how); const {p, k, ow} = s;
        ok(k.state !== 18 && k.next !== 18, `${how}: state $12 replaced`); eq(p.chaosShoeOwner, noone_(), `${how}: owner pointer cleared`);
        eq(ow.chaosState, 5, `${how}: owner object in state 5 (falling)`);
        // falling: Y speed +1.5 on its first update, then +0.5 per update
        const y0 = ow.y, vy0 = ow.chaosVY; host.frame({}); eq(ow.chaosVY, vy0 + 0x80, `${how}: +0.5 gravity`); ok(ow.y > y0, 'moves down');
        if (how === 'hurt') eq([g.ring, c.chaos_lr_list().length > 0], [0, true], 'ordinary hurt: rings lost');
        if (how === 'rocket') eq([k.state, g.chaosPowerCode, g.chaosPowerTimer > 0], [17, 4, true], 'Rocket pickup replaces $12 and runs its own timer');
        if (how === 'wall') eq([k.state === 30 || k.next === 30, k.move & 192, g.ring, c.chaos_lr_list().length], [true, 0, 10, 0], 'side-wall branch: hurt MOVEMENT only - no damage flags, no ring loss ($494F)');
    }
    // the owner's first falling update sets +1.5
    { const s = cleanup('jump'); const ow = s.ow; ow.chaosState = 5; ow.chaosAnimTick = 0; ow.chaosRequest = 5; host.runEvent(ow, 'objects/OBJ_chaos_object_2F/Step_0.gml'); eq(ow.chaosVY, 0x180, 'state 5 first record: Y speed +1.5'); }
    // removal beyond the lifetime window; the record respawns from its placement when approached again
    { const s = cleanup('jump'); const ow = s.ow; w.follow = false; w.cam.x = 0; w.cam.y = 0; for (let i = 0; i < 4; i++) host.runEvent(ow, 'objects/OBJ_chaos_object_2F/Step_0.gml'); eq(ow.chaosActive, false, 'removed by the lifetime routine'); }
    // Rocket pickup while attached to Spring Shoes with a pending selector: independent concepts
    { const {p, k, ow} = shoes(1000, 700, {cells: floorCells(0, 120)}); g.chaosPowerCode = 4; g.chaosPowerTimer = 150; for (let i = 0; i < 5; i++) host.frame({}); eq([k.state, g.chaosPowerCode, g.chaosPowerTimer], [18, 4, 145], 'Spring Shoes ignore a running selector/timer; the timer keeps its own decrement'); }
}
count('Spring Shoes owner cleanup');

// ---- 3h. spring-shoes player presentation is the single spring pose; attack posture only from the stored bit ----
{
    const {p, k} = shoes(1000, 700, {cells: floorCells(0, 120), move: 1}); const att = [];
    for (let i = 0; i < 80; i++) { host.frame({}); att.push([g.chaosAttackPosture, k.vy < 0]); }
    ok(att.some(a => a[1]) && att.some(a => !a[1]), 'rising and falling frames occur'); eq(att.every(a => a[0] === false), true, 'rising/falling alone never makes the shoes attack');
    const q = shoes(1000, 700, {cells: floorCells(0, 120), move: 3}); const att2 = []; for (let i = 0; i < 80; i++) { host.frame({}); att2.push(g.chaosAttackPosture); } eq(att2.every(a => a === true), true, 'an inherited attack bit stays published through every bounce');
    const src = strip(rd('scripts/SCR_chaos_core/SCR_chaos_core.gml')).match(/function SCR_cc_state18_tick[\s\S]*?\n}\n/)[0];
    ok(!/move\s*(\|=|&=)\s*[^;]*\b2\b/.test(src.replace(/cp_c\.move\s*\|=\s*1;|cp_c\.move\s*&=\s*~1;/g, '')), 'state $12 callback never writes the attack bit');
}
count('Spring Shoes attack posture');


// ---- 3i. M2.2: sign wake converts a REQUESTED $12 to $0E (Research B1-B5); no pre-relaunch floor adapter, no timer ----
function signScenario(width, signScreenX) {
    const {p, k, ow} = shoes(1000, 600, {cells: floorCells(0, 120)}); w.cam.w = width;
    const camX = 800, signX = camX + signScreenX;
    const sign = host.newInstance('OBJ_chaos_object_18', signX, 640); sign.stepPath = 'objects/OBJ_chaos_object_18/Step_0.gml'; w.badniks.push(sign);
    w.follow = false; w.cam.x = camX; w.cam.y = 500;
    return {p, k, ow, sign};
}
{
    // threshold: converted for screen X <= 287, not for 288+ (256 view); EDGE(RIGHT,+32) = viewWidth + 32 on a wide view
    for (const [width, edgeX] of [[256, 288], [348, 380], [640, 672]]) {
        for (const [dx, want] of [[-1, true], [0, false], [1, false], [-40, true]]) {
            const s = signScenario(width, edgeX + dx);
            host.frame({});
            eq([s.k.state, s.k.next === 14, s.k.next === 18], [18, want, !want], `width ${width}: sign at screen X ${edgeX + dx}: requested $12 ${want ? 'becomes $0E' : 'stays $12'}`);
        }
    }
    // the full chain at 256 and 640: wake -> next update leaves $12 -> owner detaches -> $19 child -> $20 -> act-clear flag
    for (const width of [256, 640]) {
        const s = signScenario(width, width + 60); const {p, k, ow, sign} = s;
        for (let i = 0; i < 6; i++) host.frame({});
        eq([k.state, ow.chaosState, g.chaosPowerTimer], [18, 3, 0], `width ${width}: sign outside the wake band: shoes untouched, no timer`);
        w.cam.x += 60;                                                 // the sign scrolls into the band (screen X < edge + 32)
        host.frame({});
        eq(k.next, 14, 'sign wake: requested $12 -> $0E'); host.frame({});
        eq(k.state, 14, 'next player update leaves $12');
        host.frame({}); host.frame({}); eq(ow.chaosState, 5, 'owner falls (state 5) through the ordinary $8BC3 rule');
        ok(p.chaosShoeOwner === noone_(), 'adapter pointer released');
        ok(!sign.chaosSign.contact, 'the wake itself is not a contact');
        w.follow = true;                                              // normal camera again so the fall is not a pit death
        const child = host.newInstance('OBJ_chaos_object_19', sign.x, sign.y); child.stepPath = 'objects/OBJ_chaos_object_19/Step_0.gml'; w.badniks.push(child); child.chaosChild.age = 200;
        let to20 = false; for (let i = 0; i < 900 && !to20; i++) { host.frame({}); to20 = k.state === 32; }
        ok(to20, `width ${width}: ordinary chain reaches state $20 after the conversion`);
        w.follow = false; w.cam.x = Math.floor(k.xu / 256) - 100; w.cam.y = Math.floor(k.yu / 256) - 96; let clear = false; for (let i = 0; i < 600 && !clear; i++) { host.frame({}); clear = !!k.act_clear; }
        ok(clear, 'act-clear flag (OBJ_chaos_controls then calls chaos_act_complete: results progression)');
    }
    { // already-awake sign + shoes picked up afterwards: nothing converts again and the child's floor wait stalls (Research B6): no escape is invented
        const s = signScenario(256, 100); const {p, k, ow, sign} = s; sign.chaosWoke = true;
        const child = host.newInstance('OBJ_chaos_object_19', sign.x, sign.y); child.stepPath = 'objects/OBJ_chaos_object_19/Step_0.gml'; w.badniks.push(child); child.chaosChild.age = 200;
        for (let i = 0; i < 500; i++) host.frame({});
        eq([k.state, k.next], [18, 18], 'already-awake sign: the shoes stay and $20 is never requested (the canonical narrow stall is preserved)');
    }
    { const kk = c.SCR_cc_new(0, 0); kk.next = 18; eq([c.chaos_footwear_wake_convert(kk), kk.next], [true, 14], 'helper converts $12 -> $0E'); const q = c.SCR_cc_new(0, 0); q.next = 17; eq([c.chaos_footwear_wake_convert(q), q.next], [false, 17], 'other states untouched');
      ok(rd('scripts/SCR_chaos_boss/SCR_chaos_boss.gml').includes('chaos_footwear_wake_convert(cp_c)'), 'boss $50 creation calls it'); }
    ok(!/shoe_bounced|shoe_prev_vy/.test(rd('objects/OBJ_chaos_object_19/Step_0.gml') + rd('scripts/SCR_chaos_spring/SCR_chaos_spring.gml')), 'both pre-relaunch adapters are gone');
}
count('Spring Shoes sign wake');

// ---- 3j. M2.3: GameMaker's "variable not set before reading it" semantics; chaosBoxContacts lifecycle ----
function strictPlayer(p) {                                    // reading a property that was never assigned throws, exactly like GameMaker
    const s = new Proxy(p, {get: (t, k) => { if (typeof k === 'string' && !(k in t) && !['then', 'toJSON', 'dead', 'destroyed'].includes(k))   throw new Error(`Variable OBJ_player_char.${k} not set before reading it.`); return t[k]; }});
    s.id = s; w.player = s; return s;
}
{
    level(1); w.follow = false; emptyWorld();
    const real = host.newPlayer(1000, 686, {state: 14, move: 1, vy: -48});          // the real lifecycle: SCR_chaos_player_init + SCR_chaos_core_attach, no test seeding
    ok('chaosBoxContacts' in real && real.chaosBoxContacts === 0, 'the accumulator exists after player init / core attach (initialized to 0)');
    const p = strictPlayer(real); const ow = ownerObj(1000, 700); w.cam.x = 872; w.cam.y = 604;
    host.frame({});                                          // first eligible update: the shoe attaches through the strict player
    eq([p.chaosCore.next, p.chaosShoeOwner === ow], [18, true], 'first update touching $2F attaches on a strict (GameMaker-like) player');
    eq(p.chaosBoxContacts, 32, 'the staged floor contact waits for the next merge');
    host.frame({}); eq(p.chaosBoxContacts, 0, 'consumed and cleared by the adapter: no stale bits');
    // a player that only had the core attached lazily by an object (no player_init, the object-first order) also has it
    level(1); emptyWorld(); const bare = {x: 1000, y: 700, hspeed: 0, vspeed: 0, object_index: host.ids.OBJ_player_char, image_xscale: 1, image_angle: 0, alarm: []}; bare.id = bare; w.player = bare;
    c.SCR_chaos_core_attach(bare); eq(bare.chaosBoxContacts, 0, 'core attach alone creates it');
    // every write site: monitors, $2F side contacts, loop frames never leave bits behind
    { level(1); w.follow = false; emptyWorld(floorCells()); const pl = host.newPlayer(1000, 780, {state: 5, move: 0, bg: 2, contacts: 2, previous: 0x81}); strictPlayer(pl);
      const mon = host.newInstance('OBJ_chaos_object_10', 1022, 788); c.chaos_type10_configure(mon, 2); Object.assign(mon, {chaosActive: true, chaosAsleep: false, chaosWoken: true, chaosScanTick: 1, chaosInitialFillDone: true, chaosState: 2}); mon.stepPath = 'objects/OBJ_chaos_object_10/Step_0.gml'; w.badniks.push(mon);
      w.cam.x = 872; w.cam.y = 700; for (let i = 0; i < 6; i++) { host.frame({right: true}); ok(pl.chaosBoxContacts === 0 || pl.chaosBoxContacts === 64 || pl.chaosBoxContacts === 128 || pl.chaosBoxContacts === 32, 'only defined contact bits'); } }
    { const src = rd('scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml'); ok(!src.includes('variable_instance_exists(cp_p,"chaosBoxContacts")'), 'no existence fallback around the accumulator');
      const reads = ['objects/OBJ_chaos_object_10/Step_0.gml', 'objects/OBJ_chaos_object_2F/Step_0.gml'].map(f => rd(f)).join(' ').split('cp_p.chaosBoxContacts = cp_p.chaosBoxContacts | 32;').join(''); ok(!reads.includes('= cp_p.chaosBoxContacts'), 'objects only write the accumulator (the 2F OR is its own staged bit, guaranteed by init)'); }
}
count('chaosBoxContacts lifecycle');

console.log(`MGHZ M2 $21 sections: ${checks} assertions`, JSON.stringify(section));
module.exports = {checks: () => checks};
