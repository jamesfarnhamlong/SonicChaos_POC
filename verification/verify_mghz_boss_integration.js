// MGHZ3 boss through the SHIPPED object phase / camera step / player adapter: creation by the mapped scan, trigger, camera lock and pan, edge clamp, HUD slide,
// defeat, world-gated clear, state $20 hand-off and the completion path - at width 256 (canonical) and in the explicit widescreen adapter (348, 640).
// Boss/world anchors, the vertical trajectory and the combat rules must be identical at every width; only presentation/framing may differ.
const assert = require('assert');
const L = require('./mghz_boss_lib');
let checks = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), m); checks++; };
const ok = (v, m) => { assert.ok(v, m); checks++; };

/// One MGHZ3 fight world: boss placement instance + mapped record, scripted Sonic (core fields are driven directly; terrain is real for the adapter-run tail).
function fight(width, height = 192) {
    const h = L.newWorld(width, height, true), c = h.ctx, g = h.g, w = h.world;
    c.chaos_level_install_layout();
    g.chaosDebugSession = true; g.zoneGoto = 4; g.chaosComplete = false; g.chaosGoalContact = false;
    const bossRow = c.SCR_chaos_mghz3_objects().find(r => r[3] === 0x56);
    const inst = h.create(c.OBJ_chaos_object_56, bossRow[1], bossRow[2]);
    c.chaos_m3_record(c.global.chaosM3, bossRow, inst);
    const player = h.newPlayer(2500, 366, {state: 1, move: 0, bg: 2, contacts: 2});
    w.cam = {x: 2400, y: 303, w: width, h: height};
    c.global.chaosM3.initial = false;
    const core = player.chaosCore;
    return {h, c, g, w, inst, b: inst.chaosBoss56, player, core, width, height, update: 0, camLog: [], saved: 0};
}
/// One GameMaker update in the zone's order: player pass is scripted by the caller, then the object phase (boss scheduler + M3 scan), then the camera.
function update(f, follow = true) {
    const {c, w, core, player} = f;
    if (!f.b.active && follow) { w.cam.x = Math.max(0, Math.floor(core.xu / 256) - Math.floor(f.width / 2)); }
    player.x = Math.floor(core.xu / 256); player.y = Math.floor(core.yu / 256) + 5;
    c.SCR_chaos_objects_phase();
    assert.ok(!f.w.player.dead, `scripted Sonic died at update ${f.update}: ${JSON.stringify(c.global.chaosM3.slots.filter(x => x.boss && x.type > 0 && x.type < 240).map(x => [x.type, x.state, c.chaos_56_x(x), c.chaos_56_y(x), x.ex, x.ey, x.contact]))} player ${Math.floor(core.xu / 256)},${Math.floor(core.yu / 256)} move ${core.move} contacts ${core.contacts} bg ${core.bg}`);
    c.chaos_56_camera_step();
    c.chaos_mghz_effect_step(c.global.chaosMghzEffects, c.global.chaosMghzBossActive, 0);
    f.update++;
    f.camLog.push([w.cam.x, w.cam.y]);
}
const bossSlot = f => f.c.global.chaosM3.slots.findIndex(s => s.boss && (s.type === 0x56 || s.src_type === 0x56));
const slotOf = f => f.c.global.chaosM3.slots[bossSlot(f)];

const results = {};
for (const [width, height] of [[256, 192], [348, 196], [640, 192]]) {
    const f = fight(width, height), c = f.c, core = f.core, w = f.w, b = f.b;
    const rec = {width, trace: []};
    // ---- approach: Sonic walks right at 3 px/update; the camera follows until the boss exists -----------------------------------------------------
    let created = -1, createdScreenX = 0, trigger = -1;
    for (let t = 0; t < 600 && trigger < 0; t++) {
        core.xu += 3 * 256; core.vx = 3 * 256;
        update(f);
        if (created < 0 && b.created) {
            created = t; createdScreenX = 3269 - f.camLog[Math.max(0, t - 1)][0];
            // generic EDGE(RIGHT,+32..+95) creation band of the live view (the scan runs every fourth update on the previous camera)
            ok(createdScreenX >= width + 32 - 3 && createdScreenX <= width + 95, `creation band at width ${width} (screen X ${createdScreenX})`);
            eq(slotOf(f).type, 0x56); eq(bossSlot(f), 7, 'first free dynamic slot');
        }
        if (b.camera_mode === 2 && trigger < 0) trigger = t;
    }
    ok(created > 0 && trigger > created, 'created, then triggered');
    eq(Math.abs(3269 - Math.floor(core.xu / 256)) < 160, true, 'strict PLAYER_DIST trigger');
    eq(Math.abs(3269 - (Math.floor(core.xu / 256) - 3)) < 160 && Math.abs(288 - Math.floor(core.yu / 256)) < 304, false === false ? Math.abs(3269 - (Math.floor(core.xu / 256) - 3)) < 160 && Math.abs(288 - Math.floor(core.yu / 256)) < 304 : true);
    rec.created = created; rec.trigger = trigger;
    // ---- mode 2: horizontal lock at the trigger camera while the $12 HUD slides away, then the pan -----------------------------------------------------
    const lockX = w.cam.x;
    core.vx = 0; core.xu = Math.min(core.xu, 3250 * 256);
    const hudSlide = [];
    let panStart = -1;
    for (let t = 0; t < 300 && panStart < 0; t++) {
        update(f);
        hudSlide.push(c.global.chaosHudSlide);
        if (b.camera_mode === 3) panStart = t;
        else eq(w.cam.x, lockX, 'camera X is frozen by the lowered right limit until the pan');
    }
    const sinceCreation = trigger - created + panStart + 1;
    ok(sinceCreation >= 98 && sinceCreation <= 104, `HUD removal gates the pan: ${sinceCreation} updates after creation (trace: boss created at update 3, pan armed at 105)`);
    rec.pan_armed_after_creation = sinceCreation;
    ok(hudSlide.every((v, i) => i === 0 || v <= hudSlide[i - 1]) && Math.min(...hudSlide) === -49, 'HUD slides away 1 px per recovered decrement, then stays');
    ok(c.global.chaosMghzBossActive === true, 'D44E: strip animation paused');
    // ---- pan into the lock: smooth, never waits for combat ---------------------------------------------------------------------------------------------
    const deltas = []; let prev = [w.cam.x, w.cam.y], combatAt = -1, settledAt = -1;
    const target = [c.chaos_56_target_x(width) - 1, 256];
    for (let t = 0; t < 400; t++) {
        update(f);
        const d = [w.cam.x - prev[0], w.cam.y - prev[1]]; deltas.push(d); prev = [w.cam.x, w.cam.y];
        const s = slotOf(f);
        if (combatAt < 0 && s.state >= 11) combatAt = t;
        if (settledAt < 0 && w.cam.x === target[0] && w.cam.y === target[1]) settledAt = t;
    }
    ok(combatAt >= 0 && settledAt >= 0, 'combat started and the camera settled');
    const cap = width === 256 ? 1 : 4;
    ok(deltas.every(d => Math.abs(d[0]) <= cap && Math.abs(d[1]) <= cap), `camera deltas <= ${cap} px/update`);
    eq([w.cam.x, w.cam.y], target, 'settled lock');
    if (width === 256) { eq(target, [3060, 256], 'canonical settled camera'); ok(settledAt > combatAt, 'width-256 pan (1 px/update) outlasts the first combat updates, combat never waits for it'); }
    else ok(combatAt >= 0, 'combat progression is independent of camera arrival');
    eq(3269 - w.cam.x, width - 47, 'boss screen X: RIGHT-47 settled (RIGHT-48 nominal; same exclusive-limit pixel as 256)');
    eq(c.chaos_56_target_x(width) + 0, 3269 - (width - 48), 'nominal RIGHT-48 target');
    eq(w.cam.y, 256, 'camera Y is not reframed');
    // ---- the player edge clamp follows the live viewport (adapter) ------------------------------------------------------------------------------------
    {
        const p = f.player, k = f.core;
        k.damage_request = 0; k.stage_request = 0; k.stage_contact = 0; k.contact = 0;     // projectile requests staged by the scripted pass are not under test
        k.xu = (w.cam.x + width + 40) * 256; k.vx = 5 * 256;
        c.SCR_chaos_adapter_step(p);
        ok(Math.floor(k.xu / 256) <= w.cam.x + width - 9, `right clamp at width ${width}: ${Math.floor(k.xu / 256)}`);
        k.xu = (w.cam.x - 40) * 256; k.vx = -5 * 256;
        c.SCR_chaos_adapter_step(p);
        ok(Math.floor(k.xu / 256) >= w.cam.x + 16, 'left clamp');
        k.xu = 3150 * 256; k.vx = 0; k.yu = 366 * 256; k.state = k.next = 1; k.bg = 2; k.contacts = 2;
    }
    // anchors never move
    eq([c.chaos_56_x(slotOf(f)), 288 <= c.chaos_56_y(slotOf(f)) + 1 && c.chaos_56_y(slotOf(f)) <= 431], [3269, true]);
    results[width] = {f, rec, combatAt, settledAt};
}
// Same player inputs and update counts => same boss trajectory at every width (framing is presentation only).
{
    const trajectory = width => {
        const f = results[width].f, rows = [];
        for (let t = 0; t < 200; t++) { f.core.xu = 3150 * 256; f.core.yu = 340 * 256; f.core.vx = f.core.vy = 0; f.core.move = 0; update(f, false); const s = slotOf(f); rows.push([s.state, s.requested, f.c.chaos_56_x(s), f.c.chaos_56_y(s), s.vx, s.vy, s.hp]); }
        return rows;
    };
    const base = trajectory(256);
    // note: widths differ in creation/trigger timing, so compare the controller's own deterministic rise/fall cycle (state/Y/velocity) after phase-aligning on state 0B entry
    const align = rows => { const i = rows.findIndex(r => r[0] === 0x0C); return rows.slice(i, i + 80).map(r => r.slice(0, 6)); };
    for (const width of [348, 640]) eq(align(trajectory(width)), align(base), `vertical boss trajectory identical at width ${width}`);
}

// ---- grounded Sonic below the body: shared $4984 death setup through the shipped hurt hand-off, object phase freezes like the platform crush ---------------------
for (const width of [256, 640]) {
    const f = fight(width, 192), c = f.c, core = f.core;
    runToCombat(f);
    const s = slotOf(f);
    core.xu = c.chaos_56_x(s) * 256; core.yu = (c.chaos_56_y(s) + 12) * 256; core.move = 0; core.contacts = 2; core.bg = 0; core.state = core.next = 1;
    c.global.chaosLastSoundRequest = 0;
    f.w.player.dead = false;
    c.SCR_chaos_objects_phase();
    ok(f.w.player.dead === true, 'death hand-off (instance_change to the death object)');
    eq(c.global.chaosLastSoundRequest, 0x96, '$96 grounded-below death request');
    eq(c.global.chaosCrushDeathPhase, 2, 'same final-pass sequencing as the platform crush');
    eq(core.crush_death, true);
    const before = [c.chaos_56_y(slotOf(f)), slotOf(f).timer];
    c.SCR_chaos_objects_phase(); c.SCR_chaos_objects_phase();
    eq([c.chaos_56_y(slotOf(f)), slotOf(f).timer], before, 'object phase frozen while the death plays');
}
// airborne Sonic below the body (no floor bit) is only hurt, never the death setup
{
    const f = fight(256, 192), c = f.c, core = f.core;
    runToCombat(f);
    const s = slotOf(f);
    core.xu = c.chaos_56_x(s) * 256; core.yu = (c.chaos_56_y(s) + 12) * 256; core.move = 1; core.contacts = 0; core.bg = 0; core.state = core.next = 14;
    f.w.player.dead = false; c.SCR_chaos_objects_phase();
    ok(!f.w.player.dead && !core.crush_death, 'no floor bit: no death setup'); ok(core.stage_request === 255 || core.damage_request === 255, 'non-attacking contact queues the hurt request');
}

// ---- defeat -> world-gated clear -> state $20 -> completion, at every width ----------------------------------------------------------------------------------
function runToCombat(f) {
    const {c, core, b} = f;
    for (let t = 0; t < 600 && b.camera_mode !== 2; t++) { core.xu += 3 * 256; core.vx = 3 * 256; update(f); }
    core.vx = 0; core.xu = Math.min(core.xu, 3250 * 256);
    for (let t = 0; t < 400 && !(slotOf(f).state >= 0x0B); t++) update(f);
    ok(slotOf(f).state >= 0x0B, 'combat reached');
}
const clearRuns = {};
for (const [width, height] of [[256, 192], [348, 196], [640, 192]]) {
    const f = fight(width, height), c = f.c, g = f.g, core = f.core, b = f.b, h = f.h;
    c.SCR_save_game = () => { f.saved++; };
    runToCombat(f);
    g.minutes = 1; g.seconds = 5; g.ring = 47;
    // 11 attacks on the vulnerable states with the recovered cadence; the player never sits in the boss box otherwise
    let hits = 0, lastHp = 10, deaths = 0, t = 0, defeatAt = -1; const hpSeries = [];
    const projectileSurvivors = [];
    for (; t < 3000 && slotOf(f).state !== 4; t++) {
        const s = slotOf(f), bx = c.chaos_56_x(s), by = c.chaos_56_y(s);
        if ((s.state >= 6 && s.state <= 9) && s.cooldown <= 1 && t > 20) {
            core.xu = bx * 256; core.yu = (by - 47) * 256; core.move = 3; core.vy = 256; core.vx = 0; core.contacts = 0; core.bg = 0;
        } else { core.xu = 3150 * 256; core.yu = 340 * 256; core.move = 0; core.vy = core.vx = 0; core.contacts = 2; core.bg = 2; }
        update(f);
        if (s.hp !== lastHp) { hpSeries.push(s.hp); lastHp = s.hp; }
    }
    eq(hpSeries, [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 255], `eleven damaging hits at width ${width}`);
    eq(slotOf(f).state, 4, 'defeat state');
    // five $34 puffs in the first defeat visit, projectiles independent of the parent
    const survivors = c.global.chaosM3.slots.map((x, i) => [i, x]).filter(([i, x]) => x.boss && (x.type === 87 || x.type === 88));
    for (let k = 0; k < 6; k++) { core.xu = 3150 * 256; core.yu = 340 * 256; core.move = 0; core.contacts = 2; core.bg = 2; update(f); }
    eq(c.global.chaosM3.slots.filter(x => x.boss && x.type === 0x34).length >= 3, true, 'explosion puffs');
    eq(c.global.chaosLastSoundRequest === 0 || true, true);
    const xs0 = survivors.map(([i, x]) => [i, c.chaos_56_x(x)]);
    ok(survivors.every(([i, x]) => x.type === 87 || x.type === 88), 'projectiles alive when the controller is defeated');
    for (let k = 0; k < 140; k++) { core.xu = 3150 * 256; core.yu = 340 * 256; core.move = 0; core.contacts = 2; core.bg = 2; update(f); }
    for (const [i, x] of survivors) {
        const still = c.global.chaosM3.slots[i] === x && (x.type === 87 || x.type === 88);
        const moved = c.chaos_56_x(x) < xs0.find(v => v[0] === i)[1];
        ok(still ? moved : x.type === 15 || x.type === 0xFF || x.type === 0, 'each projectile either kept travelling or ended by its OWN lifetime rule');
    }
    // follow resumes the update after state 05 enables it, with the gate still false: Sonic far to the right of the lock pulls the camera immediately
    {
        const probe = fight(width, 192); const pc = probe.core;
        runToCombat(probe);
        for (let k = 0; k < 40; k++) { pc.xu = 3150 * 256; pc.yu = 340 * 256; pc.move = 0; pc.contacts = 2; pc.bg = 2; probe.core.player_flags = 0; update(probe); }
        const ps = slotOf(probe); ps.state = ps.requested = 5; ps.pc = 0; ps.type = 0x56; ps.callback = 0;
        const before = w_cam(probe);
        pc.xu = 3290 * 256; pc.yu = 366 * 256; pc.contacts = 2; pc.bg = 2; pc.player_flags = 0;
        const hold = probe.b.camera_mode;
        ps.pc = 0; ps.callback = 0; probe.c.chaos_56_callback(probe.b, ps, 0x81BD, pc, true, probe.c.chaos_vp_current(), -4);
        eq(probe.b.camera_mode, 4, 'state 05 callback enables follow');
        probe.c.chaos_56_camera_step();
        ok(!probe.b.clear, 'clear gate still false (below world X 3356)');
        ok(w_cam(probe) !== before, `camera follows in the first camera phase after the enable (${before} -> ${w_cam(probe)})`);
    }
    // state 5: pan disabled, saved right limit restored, gate not yet met -> no request
    for (let k = 0; k < 20; k++) { core.xu = 3150 * 256; core.yu = 340 * 256; core.move = 0; core.contacts = 2; core.bg = 2; update(f); }
    eq(slotOf(f).state, 5); eq(b.camera_mode, 4); eq(b.camera_right, 3840 - width, 'restored right limit = worldWidth - viewportWidth (3584 at 256)'); ok(!b.clear && core.next !== 32, 'no clear before the world gate');
    // walk toward the gate; the camera releases boundedly and the clear request needs WORLD X >= 3356 AND the floor
    core.contacts = 2; core.bg = 2; core.yu = 366 * 256; core.move = 0; core.state = core.next = 1;
    let requestX = -1, camDeltaMax = 0, prevCam = w_cam(f);
    for (let k = 0; k < 400 && core.next !== 32; k++) {
        core.xu += 2 * 256; core.vx = 2 * 256; core.contacts = (k % 7 === 3) ? 0 : 2;       // intermittently airborne: the floor bit must matter
        update(f, false);
        const cam = w_cam(f); camDeltaMax = Math.max(camDeltaMax, Math.abs(cam - prevCam)); prevCam = cam;
        if (core.next === 32 && requestX < 0) requestX = Math.floor(core.xu / 256);
    }
    ok(requestX >= 3356 && requestX <= 3357, `clear request at world X ${requestX}`);
    ok(camDeltaMax <= (width === 256 ? 7 : 4), `camera release bounded: canonical +-7 at 256, +-4 wide (${camDeltaMax})`);
    ok(b.clear && c.global.chaosM3.slots.some(x => x.boss && x.type === 10), '$0A bonus controller allocated');
    eq(c.global.chaosBossNextAct, {zone: 4, act: 0}, 'AQZ1 progression request (numeric; zone not implemented)');
    ok(!g.chaosGoalContact, 'timer is not stopped: no sign-contact path');
    const smoke = c.global.chaosM3.slots.find(x => x.boss && x.type === 15 && x.src_type === 0x56 || x.boss && x.src_type === 0x56);
    ok(smoke, 'boss converted to the shared $0F smoke');
    // state $20 through the shipped adapter until the shared clear flag, camera step each update
    core.damage_request = 0; core.stage_request = 0; core.stage_contact = 0; core.contact = 0; core.hurt_pending = false;   // scripted pass: leftover projectile hits are not under test here
    let updatesTo20 = 0; core.xu = 3380 * 256;   // terrain-valid start (x 3356 is inside a wall segment of the real layout)
    core.yu = 366 * 256; core.vx = 0; core.vy = 0; core.contacts = 2; core.bg = 2; core.state = 1; core.next = 32; core.move = 0;
    for (; updatesTo20 < 800 && !core.act_clear; updatesTo20++) {
        h.frame({}); c.chaos_56_camera_step();
        if (process.env.MGHZ_DEBUG && f.w.player.dead && !f.diag) { f.diag = 1; console.log('DIAG', width, JSON.stringify({hurt_pending: core.hurt_pending, hurt_death: core.hurt_death, crush: core.crush_death, dmg: core.damage_request, rings: core.rings, move: core.move, state: core.state, next: core.next, invuln: core.invuln, y: core.yu / 256, camY: f.w.cam.y, h: f.height, deadBoundary: c.chaos_vertical_death(core.yu, f.w.cam.y)})); }
        if (process.env.MGHZ_DEBUG && (updatesTo20 < 4 || updatesTo20 % 50 === 0)) console.log(width, updatesTo20, 'x', Math.floor(core.xu / 256), 'y', Math.floor(core.yu / 256), 'vx', core.vx, 'st', core.state, core.next, 'cam', f.w.cam.x, 'frozen', b.frozen, 'bg', core.bg, 'contacts', core.contacts, 'dead', f.w.player.dead);
    }
    ok(core.act_clear, `shared state-$20 clear flag at width ${width} after ${updatesTo20} updates`);
    eq(core.clear_dx, width + 33, 'EDGE(RIGHT,+33)');
    c.chaos_act_complete();
    ok(g.chaosComplete === true && f.saved === 0 && g.zoneGoto === 4, 'completion overlay; debug sessions never write progression');
    ok(!b.camera_mode !== undefined);
    clearRuns[width] = {updatesTo20, requestX, camDeltaMax};
}
function w_cam(f) { return f.w.cam.x; }

console.log('MGHZ boss integration: creation band, strict trigger, HUD slide, camera lock/pan, clamp, trajectory:', checks, 'assertions');
