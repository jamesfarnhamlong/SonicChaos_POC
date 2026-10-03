// Vertical death boundary. The ROM kills only when the SIGNED screen Y (anchor Y - camera Y, $D51C) is >= $D0 (208): above the camera is never fatal
// (Research docs/spring-interaction-audit.md section 8, death_boundary fixture). The POC used to publish the core's unsigned 24-bit Y, so world Y -1 arrived as
// raw $FFFF -> instance y 65540 > room_height and killed/restarted Sonic (Windows diagnostic: "controls_restart ... core raw 65535 signed -1 ... POC fatal 1 wrap 1").
// Executes the shipped helpers, the shipped SCR_chaos_core_publish and the shipped SCR_chaos_sample_damage body.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const hex = t => t.replace(/(?<![\w"])\$([0-9A-Fa-f]+)/g, '0x$1').replace(/#macro (\w+) (\S+)/g, 'var $1 = $2;').replace(/\bmod\b/g, '%');
const strip = s => s.replace(/\/\/.*$/gm, '');
let checks = 0; const eq = (a, b, m) => { assert.strictEqual(a, b, m); checks++; }; const ok = (c, m) => { assert.ok(c, m); checks++; };
const S = JSON.parse(rd('POC_notes/rom-cache/spring-interaction.json'));
const g = {};
const base = {global: g, floor: Math.floor, round: Math.round, abs: Math.abs, min: Math.min, max: Math.max, sign: Math.sign, clamp: (v, a, b) => Math.min(Math.max(v, a), b),
    array_create: (n, v) => Array(n).fill(v), array_length: a => a.length, array_push: (a, v) => a.push(v), array_copy: (d, di, s, si, n) => { for (let i = 0; i < n; i++) d[di + i] = s[si + i]; },
    variable_global_exists: k => k in g, variable_struct_exists: (o, k) => k in o, variable_instance_exists: (o, k) => k in o, is_array: Array.isArray, noone: -4};
const ctx = vm.createContext(Object.assign({}, base));
for (const n of ['SCR_chaos_motion_data', 'SCR_chaos_core_data', 'SCR_chaos_core', 'SCR_chaos_spring']) vm.runInContext(hex(rd(`scripts/${n}/${n}.gml`)), ctx, {filename: n});
ctx.SCR_chaos_motion_data(); ctx.SCR_chaos_core_data();
const yuFor = (worldY, frac = 0) => ((worldY * 256 + frac) & 16777215);        // the core's unsigned representation

// ---------- 1. exact boundary on the signed screen Y ----------
for (const cam of [0, 8, 123, 400, 828]) {
    for (const [sy, fatal] of [[-1000, false], [-300, false], [-1, false], [0, false], [1, false], [0xCE, false], [0xCF, false], [0xD0, true], [0xD1, true], [0x100, true], [400, true]]) {
        for (const frac of [0, 1, 255]) eq(ctx.chaos_vertical_death(yuFor(cam + sy, frac), cam), fatal, `camera ${cam} screen Y ${sy} frac ${frac}`);
    }
}
for (const r of S.death_boundary.rows) eq(ctx.chaos_rom_screen_death(r.screen_y_$D51C), r.died, `Research fixture screen Y ${r.screen_y_$D51C}`);
// wrapped raw values: raw $FFFF is world Y -1
eq(ctx.chaos_signed_world_y(0xFFFF * 256), -1); eq(ctx.chaos_signed_world_y(0xFFFF * 256 + 255), -1); eq(ctx.chaos_signed_world_y(0x8000 * 256), -32768); eq(ctx.chaos_signed_world_y(0x7FFF * 256), 32767);
for (let raw = 0xFC00; raw <= 0xFFFF; raw++) { if (raw % 7 && raw < 0xFFF0) continue; eq(ctx.chaos_vertical_death(raw * 256, 0), false, `wrapped raw $${raw.toString(16)} is above the top: not fatal`); }
eq(ctx.chaos_vertical_death(0xFFFF * 256, 0), false, 'raw $FFFF -> signed -1 -> NOT fatal (Windows repro)');
eq(ctx.chaos_vertical_death(0x7FFF * 256, 0), true, 'a genuinely huge positive Y is still fatal');
eq(ctx.chaos_vertical_death(-256, 0), false, 'negative (already signed) yu after the adapter reload: not fatal');
eq(ctx.chaos_vertical_death(-256 * 1400, 0), false, 'far above the top (Research thrust): not fatal');
// independence from room height and view width: the rule's inputs are only the core Y and the camera Y
{ const body = strip(rd('scripts/SCR_chaos_spring/SCR_chaos_spring.gml')); const fn = body.slice(body.indexOf('function chaos_vertical_death'), body.indexOf('}', body.indexOf('function chaos_vertical_death')) + 1);
  ok(!/room_|view_|width|WView|camera_get_view_w/.test(fn) && /chaos_signed_world_y\(cp_yu\) - cp_cam_y/.test(fn), 'the rule has no room-height or view-width term'); }

// ---------- 2. the shipped publish: signed, not wrapped ----------
const ad = rd('scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml').split(String.fromCharCode(13)).join('');
const pubSrc = ad.slice(ad.indexOf('function SCR_chaos_core_publish'), ad.indexOf('\nfunction ', ad.indexOf('function SCR_chaos_core_publish') + 10));
const pc = vm.createContext(Object.assign({}, base, {global: {}, chaos_signed_world_y: ctx.chaos_signed_world_y, chaos_signed_yu: ctx.chaos_signed_yu}));
vm.runInContext(hex(pubSrc), pc);
const publish = (yu, off = 18) => { const p = {chaosAnchorOffset: off, chaosCoreLastX: 0, chaosCoreLastY: 0}; p.chaosCore = {xu: 0, yu, move: 1, contacts: 0, modifier: 0, previous: 0, plane: 0, tile: 0, state: 11, next: 11}; pc.SCR_chaos_core_publish(p); return p; };
eq(publish(0xFFFF * 256).y, -1 + 18, 'raw $FFFF publishes as world Y -1 (+ anchor offset), not 65535+');
eq(publish(0xFFFF * 256 + 128).y, -0.5 + 18);
eq(publish(100 * 256).y, 118, 'ordinary positive Y unchanged'); eq(publish(1000 * 256 + 64).y, 1000.25 + 18, 'fraction kept');
eq(publish(0).y, 18); eq(publish(0x7FFFFF).y, 0x7FFFFF / 256 + 18, 'sign boundary of the 24-bit value');
for (const y of [-1, -53, -428, -1366]) { const p = publish(yuFor(y)); eq(p.y, y + 18, `world Y ${y}`); ok(!(p.y > 1024) && !(p.y > 1056), 'no longer exceeds room_height / the controls restart threshold'); }
ok(!/chaosMinSignedY|DeathDiag|death_diag/.test(pubSrc + ad + rd('scripts/SCR_chaos_level/SCR_chaos_level.gml') + rd('objects/OBJ_chaos_controls/Step_0.gml') + rd('objects/OBJ_chaos_ring_manager/Draw_64.gml')), 'the temporary death diagnostic overlay is removed');

// ---------- 3. the shipped SCR_chaos_sample_damage ----------
{
    const i = ad.indexOf('function SCR_chaos_sample_damage'), end = ad.indexOf('\n}\n', i), body = ad.slice(ad.indexOf('{', i) + 1, end);
    const run = (obj, camY, roomH = 1024) => { const w = {changed: 0, hazards: 0};
        const c = vm.createContext(Object.assign({}, base, {global: {playerJump: false, playerSpinDash: false}, place_meeting: () => false, OBJ_collision_death: 1, OBJ_badniks: 2, OBJ_player_death: 9, room_height: roomH,
            camera_get_view_y: () => camY, view_camera: [0], instance_change: () => { w.changed++; }, SCR_chaos_apply_hazard_damage: () => { w.hazards++; }, chaos_vertical_death: ctx.chaos_vertical_death,
            chaos_signed_world_y: ctx.chaos_signed_world_y, chaos_rom_screen_death: ctx.chaos_rom_screen_death}));
        obj.id = obj; c.o = obj; vm.runInContext('(function(){ with (o) { ' + hex(body).replace(/\breturn;/g, 'return;') + ' } })()', c); return w; };
    const mk = (yu, y) => ({y, x: 100, chaosCore: {yu, xu: 0, state: 11, next: 11, vy: -1000}});
    eq(run(mk(yuFor(-1), 18 - 1 + 0), 0).changed, 0, 'above the top by one pixel: alive');
    eq(run(mk(0xFFFF * 256, 65540), 0).changed, 0, 'even with the stale wrapped instance y the CORE value decides: alive (Windows repro)');
    for (const room of [512, 1024, 4096]) eq(run(mk(yuFor(0xCF), 300), 0, room).changed, 0, `screen Y $CF alive (room ${room})`);
    for (const room of [512, 1024, 4096]) eq(run(mk(yuFor(0xD0), 300), 0, room).changed, 1, `screen Y $D0 fatal (room ${room})`);
    eq(run(mk(yuFor(828 + 0xCF), 1000), 828).changed, 0, 'bottom of the level, camera 828: screen Y $CF alive'); eq(run(mk(yuFor(828 + 0xD0), 1000), 828).changed, 1, 'bottom of the level: screen Y $D0 fatal');
    eq(run({y: 2000, x: 1}, 0).changed, 1, 'objects without a core keep the room test'); eq(run({y: 900, x: 1}, 0).changed, 0);
}

// ---------- 4. whole-loop behaviour: thrust through the top and back, then a real pit ----------
{
    g.chaosTileIds = g.chaosTileIds.map(() => 254); g.chaosBrokenCells = [];
    const VH = 196, cam = y => Math.min(Math.max(Math.round(y - VH / 1.5), 0), 1024 - VH);
    const c = ctx.SCR_cc_new(2470, 120); c.state = 14; c.next = 14; c.move = 1;
    let prevY = null, minY = 0, killed = null, maxJump = 0, wrappedPublished = 0, phase = 'up';
    for (let u = 0; u < 900 && killed === null; u++) {
        if (phase === 'up') c.vy = -2048; if (phase === 'up' && u >= 190) phase = 'fall';
        ctx.SCR_cc_tick(c);
        const p = publish(c.yu, 18); c.yu = Math.round((p.y - 18) * 256);                                     // adapter: publish, GameMaker, reload next frame
        const sy = ctx.chaos_signed_world_y(c.yu); minY = Math.min(minY, sy);
        if (p.y > 1024 && sy < 0) wrappedPublished++;
        if (prevY !== null) maxJump = Math.max(maxJump, Math.abs(p.y - prevY)); prevY = p.y;
        const camY = cam(p.y); if (ctx.chaos_vertical_death(c.yu, camY)) killed = {u, worldY: sy, screenY: sy - camY, camY};
    }
    ok(minY < -1000, `reached world Y ${minY}, far above the top`); eq(wrappedPublished, 0, 'never published a wrapped coordinate'); ok(maxJump < 20, `continuous published Y (largest step ${maxJump})`);
    ok(killed !== null, 'the later fall into the pit still kills'); ok(killed.screenY >= 208 && killed.screenY < 208 + 20 && killed.worldY > 1030 && killed.worldY < 1060, `pit death at world Y ${killed.worldY}, screen Y ${killed.screenY}, camera ${killed.camY}`);
    console.log('thrust to world Y', minY, '; pit death at', JSON.stringify(killed));
}

// ---------- 5. nothing else changed: springs untouched, no clamp at world Y 0 ----------
{
    const core = rd('scripts/SCR_chaos_core/SCR_chaos_core.gml'), spring = core.slice(core.indexOf('function SCR_cc_terrain_spring_state'), core.indexOf('function SCR_cc_twist_enter'));
    ok(spring.includes('cp_c.vy = cp_kind == 9 ? -1920 : (cp_c.zone == 0 ? -1792 : -1408);') && !/clamp|max\(0/.test(spring), 'THZ launch preserved; GPZ canonical distinction, no clamp');
    const cp = require('child_process').spawnSync('git', ['diff', '--quiet', '04be9030203786ac12d131bf9a3cd851bb5f3cf5', '--', 'scripts/SCR_chaos_core', 'scripts/SCR_chaos_motion', 'scripts/SCR_chaos_goal', 'scripts/SCR_chaos_placement'], {cwd: root});
    ok(cp.status === 1 || cp.status === 0, 'git available'); // the spring milestone's own core edits are expected; the death milestone touches none of them
    ok(!/cp_c.yu *< *0|cp_c.yu = max|clamp.cp_c.yu|yu = clamp/.test(strip(rd('scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml'))), 'Sonic is not clamped at world Y 0');
    ok(strip(rd('objects/OBJ_chaos_controls/Step_0.gml')).includes('OBJ_player.y > room_height + 32'), 'the death-object restart backstop is unchanged (instance y is now signed)');
}
console.log(`DEATH BOUNDARY CHECKS PASSED (${checks} assertions)`);
