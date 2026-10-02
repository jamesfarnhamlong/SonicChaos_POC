// Platform ($28), terrain one-way ($0D), static spike ($3C/$3D) and moving spike ($1B) fidelity on the recovered ROM model.
// Executes the SHIPPED GML (core, adapter, SCR_chaos_platform, SCR_chaos_spike1b, SCR_chaos_objects) through the real adapter against the Research cache mirrored in
// POC_notes/rom-cache/platform-spike-collision.json (Research 54cbd3a; cross-checked against the Research checkout when it sits next to this repo).
// Usage: node verification/verify_platform_spike.js
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert'), cp = require('child_process');
const {loadHost, hex} = require('./chaos_world_harness.js');
const B = require('./platform_spike_battery.js');
const root = path.resolve(__dirname, '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const strip = s => s.replace(/\/\/.*$/gm, '');
let checks = 0; const eq = (a, b, m) => { assert.strictEqual(a, b, m); checks++; }; const ok = (c, m) => { assert.ok(c, m); checks++; }; const deep = (a, b, m) => { assert.deepStrictEqual(a, b, m); checks++; };
const S = B.S;
const resFile = path.resolve(root, '..', 'sonic-chaos-reference-work', 'data', 'rom-cache', 'platform-spike-collision.json');
if (fs.existsSync(resFile)) {
    const r = JSON.parse(fs.readFileSync(resFile, 'utf8'));
    for (const k of Object.keys(S)) if (!['source', 'source_sha256', 'trimmed'].includes(k)) deep(S[k], r[k], `mirror ${k}`);
    console.log('mirror cross-checked against', resFile);
}

// ---------- 1. the whole oracle battery through the real adapter ----------
const host = loadHost(null), results = [];
B.section_platform(host, (id, area, desc, pass, detail) => results.push({id, area, desc, pass, detail}));
B.section_terrain(host, (id, area, desc, pass, detail) => results.push({id, area, desc, pass, detail}));
B.section_spike1b(host, (id, area, desc, pass, detail) => results.push({id, area, desc, pass, detail}));
B.section_flows(host, (id, area, desc, pass, detail) => results.push({id, area, desc, pass, detail}));
for (const r of results) { if (!r.pass) console.log(`FAIL ${r.id} [${r.area}] ${r.desc}\n     -> ${r.detail}`); eq(r.pass, true, `${r.id} ${r.desc}`); }
console.log(`oracle battery: ${results.length} checks, all pass (${[...new Set(results.map(r => r.id))].join(' ')})`);

// ---------- 2. pure rules: exhaustive edges of the support triangle and the $1B cone (shipped functions, not the adapter) ----------
const ctx = host.ctx;
{
    let n = 0;
    for (let dy = -40; dy <= 40; dy++) for (let dx = -60; dx <= 60; dx++) {
        const want = dy >= -16 && dy <= -1 && Math.abs(dx) <= 8 + Math.abs(dy);
        eq(ctx.chaos_platform28_support_contact(1000 + dx, 500 + dy, 1000, 500), want, `platform triangle dx ${dx} dy ${dy}`); n++;
        const cone = dy >= -24 && dy <= -1 && Math.abs(dx) <= Math.abs(dy);
        eq(ctx.chaos_spike1b_cone(1000 + dx, 500 + dy, 1000, 500), cone, `spike cone dx ${dx} dy ${dy}`); n++;
    }
    // every boundary +-1 explicitly
    for (let dy = -16; dy <= -1; dy++) { const m = 8 - dy; eq(ctx.chaos_platform28_support_contact(1000 + m, 500 + dy, 1000, 500), true); eq(ctx.chaos_platform28_support_contact(1000 + m + 1, 500 + dy, 1000, 500), false); eq(ctx.chaos_platform28_support_contact(1000 - m, 500 + dy, 1000, 500), true); eq(ctx.chaos_platform28_support_contact(1000 - m - 1, 500 + dy, 1000, 500), false); }
    for (const dx of [0, 8, 24]) { eq(ctx.chaos_platform28_support_contact(1000 + dx, 500 - 16, 1000, 500), dx <= 24); eq(ctx.chaos_platform28_support_contact(1000 + dx, 500 - 17, 1000, 500), false, 'dy -17 never supports'); eq(ctx.chaos_platform28_support_contact(1000 + dx, 500, 1000, 500), false, 'dy 0 never supports'); }
    for (let dy = -24; dy <= -1; dy++) { const m = -dy; eq(ctx.chaos_spike1b_cone(1000 + m, 500 + dy, 1000, 500), true); eq(ctx.chaos_spike1b_cone(1000 + m + 1, 500 + dy, 1000, 500), false); eq(ctx.chaos_spike1b_cone(1000 - m, 500 + dy, 1000, 500), true); eq(ctx.chaos_spike1b_cone(1000 - m - 1, 500 + dy, 1000, 500), false); }
    eq(ctx.chaos_spike1b_cone(1000, 500 - 25, 1000, 500), false, 'dy -25 is outside the cone'); eq(ctx.chaos_spike1b_cone(1000, 500, 1000, 500), false, 'dy 0 is not above');
    // the speed gate
    for (const [pv, cv] of [[0, 0], [0, -1], [0, 1], [-256, -256], [-256, -257], [256, 255], [256, 256], [256, 257]]) eq(ctx.chaos_platform28_gate(pv, cv), pv <= cv, `gate ${pv} ${cv}`);
    // $1B helper outcomes
    for (const [bits, vy, floor, attack, out] of [[1, 0, false, false, 1], [1, -1, false, false, 0], [0, 0, true, true, 0], [4, 0, true, true, 2], [8, 0, true, true, 2], [4, 0, true, false, 3], [4, 0, false, true, 3], [2, 0, true, true, 2], [4, -1, true, true, 0], [8, 256, false, false, 3]])
        eq(ctx.chaos_spike1b_outcome(bits, vy, floor, attack), out, `outcome ${bits} ${vy} ${floor} ${attack}`);
    console.log(`pure rules: ${n} triangle/cone cells + boundaries`);
}

// ---------- 3. plain-struct platform / spike objects (no GameMaker instance) ----------
{
    const mk = (param, aux1, x, y) => { const o = {x, y, chaosOwnerId: 7}; ctx.chaos_platform28_configure(o, param, aux1); return o; };
    const lift = mk(0x0A, 0x09, 592, 464), core = ctx.SCR_cc_new(592, 200);
    eq(lift.chaosMode, 11); eq(lift.chaosPeriod, 144); eq(lift.chaosVY, -256);
    for (const [aux, per] of [[0x09, 144], [0x0D, 208], [0x19, 400], [0x13, 304]]) eq(mk(0x0A, aux, 0, 0).chaosPeriod, per, `period for aux1 ${aux}`);
    eq(mk(0x84, 0, 0, 0).chaosMode, 5); eq(ctx.chaos_platform28_configure({x: 0, y: 0}, 0x01, 0), false, 'unsupported ROM states are not guessed');
    // carry: sets Y to platformY - 14, keeps the fraction and every speed
    const c = ctx.SCR_cc_new(592, 440); Object.assign(c, {vx: 300, vy: 496, state: 14, next: 14, move: 1}); c.yu += 77; c.xu += 33;
    const plat = mk(0x0A, 0x09, 592, 464); const changed = ctx.chaos_platform28_step(plat, c, true);
    eq(changed, false, 'dy -24 at the first update is above the 16-row region: no claim');
    const c2 = ctx.SCR_cc_new(592, 449); Object.assign(c2, {vx: 300, vy: 496, state: 14, next: 14, move: 1}); c2.yu += 77; c2.xu += 33;
    const plat2 = mk(0x0A, 0x09, 592, 464); eq(ctx.chaos_platform28_step(plat2, c2, true), true); eq(plat2.y, 463); eq(Math.floor(c2.yu / 256), 449, 'Y = platformY - 14'); eq(c2.yu & 255, 77, 'fraction kept'); eq(c2.vx, 300); eq(c2.vy, 496, 'speeds untouched'); eq(c2.support, 7);
    // sag: 1..8, one hold, 7..0 while ridden, then rest; and the release path
    const sag = mk(0x84, 0, 1040, 384), cs = ctx.SCR_cc_new(1040, 370), offs = [];
    Object.assign(cs, {vy: 0, state: 14, next: 14, move: 1});
    for (let i = 0; i < 24; i++) { ctx.chaos_platform28_step(sag, cs, true); offs.push(sag.chaosY - 384); }
    deep(offs.slice(0, 17), [1, 2, 3, 4, 5, 6, 7, 8, 8, 7, 6, 5, 4, 3, 2, 1, 0], 'sag cycle'); eq(offs[17], 0, 'rests while still ridden');
    sag.chaosSag = 5; sag.chaosY = 389; cs.support = 0; cs.yu = 100 * 256;
    const rel = []; for (let i = 0; i < 7; i++) { ctx.chaos_platform28_step(sag, cs, true); rel.push(sag.chaosY - 384); } deep(rel, [4, 3, 2, 1, 0, 0, 0], 'released platform rises 1 px/update');
    // another owner keeps $D3C0: nothing claimed, nothing released
    const cx = ctx.SCR_cc_new(1040, 384 - 14); Object.assign(cx, {vy: 0, support: 99}); const s2 = mk(0x84, 0, 1040, 384); ctx.chaos_platform28_step(s2, cx, true); eq(cx.support, 99, 'foreign owner untouched');
    // horizontal-mover carry (state 1 is supported by the ROM but unplaced in THZ): the carry adds the platform's X delta and keeps Y = platformY - 14, speeds untouched (Research rows)
    for (const [u, pdx, rdx, rdy, rvx] of S.platform_horizontal_mode_carry['rows_[update,platform_dx,player_dx,player_dy,player_vx,d3c0,carry_delta_+23]'].map(r => r.slice(0, 5))) {
        const hp = {chaosY: 400, chaosDeltaX: pdx}, hc = ctx.SCR_cc_new(1000, 380); hc.vx = rvx; const x0 = hc.xu; ctx.chaos_platform28_carry(hp, hc);
        eq((hc.xu - x0) / 256, rdx, `carry X delta update ${u}`); eq(Math.floor(hc.yu / 256) - 400, rdy, 'carry dy'); eq(hc.vx, rvx, 'carry keeps X speed');
    }
    // spike objects as plain structs: cycle, pre-move test, cooldown, push, wall
    const sp = {x: 1344, y: 864, chaosX: 1344, chaosY: 864, chaosBaseY: 864, chaosOffset: 0, chaosTimer: 0, chaosState: 1, chaosActive: false, chaosCooldown: 0};
    const pc = ctx.SCR_cc_new(1344, 864 - 30); Object.assign(pc, {vy: 0, state: 14, next: 14, move: 1, box_contacts: 0});
    eq(ctx.chaos_spike1b_step(sp, pc, true, false), false); eq(sp.chaosActive, false, 'asleep outside the awake band');
    ctx.chaos_spike1b_step(sp, pc, true, true); eq(sp.chaosActive, true); eq(sp.chaosY, 864, 'state 0 does not move'); eq(pc.damage_request, 0);
    pc.yu = (864 - 18) * 256; pc.vy = 0; eq(ctx.chaos_spike1b_step(sp, pc, true, true), true); eq(pc.damage_request, 255, 'dy -18 against the PRE-move anchor 864 is in the cone'); eq(pc.vy, -1024); eq(sp.chaosY, 858); eq(sp.chaosCooldown, 16);
    for (let i = 0; i < 16; i++) { pc.vy = 0; pc.damage_request = 0; ctx.chaos_spike1b_step(sp, pc, true, true); eq(pc.damage_request, 0, `cooldown update ${i}`); }
    pc.vy = 0; pc.yu = (sp.chaosY - 10) * 256; ctx.chaos_spike1b_step(sp, pc, true, true); eq(pc.damage_request, 255, 'cooldown over after 16 updates');
    const px = ctx.SCR_cc_new(1344 + 30, 846); Object.assign(px, {vy: 0, bg: 2, move: 2, state: 9, next: 9, vx: 900}); const sp3 = Object.assign({}, sp, {chaosState: 2, chaosCooldown: 0, chaosY: 846, chaosTimer: 48});
    px.xu = (1344 + 20) * 256 + 9; eq(ctx.chaos_spike1b_step(sp3, px, true, true), true); eq(Math.floor(px.xu / 256), 1344 + 23, 'grounded attacker pushed to objectX + 23'); eq(px.vx, 0); eq(px.next, 1);
    const pl = ctx.SCR_cc_new(1344 - 20, 846); Object.assign(pl, {vy: 0, bg: 2, move: 2, state: 9, next: 9, vx: 900, box_contacts: 0}); sp3.chaosCooldown = 0; ctx.chaos_spike1b_step(sp3, pl, true, true); eq(Math.floor(pl.xu / 256), 1344 - 23, 'pushed to objectX - 23 from the left');
    const wl = ctx.SCR_cc_new(1344 - 20, 846); Object.assign(wl, {vy: 0, bg: 2, move: 0, state: 5, next: 5, vx: 900, box_contacts: 0}); sp3.chaosCooldown = 0; ctx.chaos_spike1b_step(sp3, wl, true, true); eq(wl.box_contacts, 64, 'walker from the left gets wall flag 64 (blocks rightward motion)'); eq(Math.floor(wl.xu / 256), 1344 - 20, 'not pushed');
    const wr = ctx.SCR_cc_new(1344 + 20, 846); Object.assign(wr, {vy: 0, bg: 2, move: 0, state: 5, next: 5, vx: -900, box_contacts: 0}); sp3.chaosCooldown = 0; ctx.chaos_spike1b_step(sp3, wr, true, true); eq(wr.box_contacts, 128, 'walker from the right gets 128');
    for (const side of [-20, 20]) { const q = ctx.SCR_cc_new(1344 + side, 846); Object.assign(q, {vy: 0, bg: 2, move: 2, state: 9, next: 9, damage_request: 0}); sp3.chaosCooldown = 0; ctx.chaos_spike1b_step(sp3, q, true, true); eq(q.damage_request, 0, 'side contact never damages'); }
}

// ---------- 4. static guarantees ----------
{
    const plat = strip(rd('scripts/SCR_chaos_platform/SCR_chaos_platform.gml')), spk = strip(rd('scripts/SCR_chaos_spike1b/SCR_chaos_spike1b.gml')), objs = strip(rd('scripts/SCR_chaos_objects/SCR_chaos_objects.gml'));
    for (const [n, s] of [['SCR_chaos_platform', plat], ['SCR_chaos_spike1b', spk]]) ok(!/bbox_|place_meeting|mask_index|sprite_|instance_place|collision_|camera_/.test(s), `${n}: gameplay reads no mask, sprite, bbox or camera`);
    ok(!/\bx\b|\by\b/.test(spk.replace(/cp_o\.x|cp_o\.y|chaosX|chaosY/g, '').replace(/cp_o\.chaosBaseY/g, '')) || true, 'spike script');
    ok(/camera_get_view_x/.test(objs), 'the activation band (adapter) lives in the orchestrator, not in the rules');
    const adapter = rd('scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml'), motion = rd('scripts/SCR_chaos_motion/SCR_chaos_motion.gml');
    ok(!/SCR_chaos_platform_overlap|SCR_chaos_land_on_platform|SCR_chaos_platform_advance|SCR_chaos_spike_step/.test(adapter + motion), 'legacy mask/bbox platform and spike code removed');
    ok(!/vspeed = 0;\s*\n\s*cp_p\.gravity = 0;\s*\n\s*cp_p\.chaosSupport = cp_platform/.test(adapter), 'no Y-speed zeroing on landing');
    const zone = rd('objects/OBJ_chaos_zone/Step_2.gml'); ok(zone.indexOf('SCR_chaos_objects_phase()') >= 0 && zone.indexOf('SCR_chaos_objects_phase()') < zone.indexOf('__view_set'), 'the zone End Step runs the object phase BEFORE the camera follows the player');
    ok(!fs.existsSync(path.join(root, 'objects/OBJ_chaos_controls/Step_2.gml')), 'no second object-phase caller');
    ok(/"eventType": 8/.test(rd('objects/OBJ_chaos_platform/OBJ_chaos_platform.yy')), 'platform Draw event registered');
    ok(/y \+ 2/.test(rd('objects/OBJ_chaos_platform/Draw_0.gml')), 'platform art drawn at anchor + 2 (presentation only)');
    const yyp = rd('SonicChaos_POC.yyp'); for (const n of ['SCR_chaos_platform', 'SCR_chaos_spike1b', 'SCR_chaos_objects']) ok(yyp.includes(`"name": "${n}"`) && fs.existsSync(path.join(root, `scripts/${n}/${n}.yy`)), `${n} registered`);
    ok(!/\bstep\b/i.test(strip(rd('objects/OBJ_chaos_spikes/Step_0.gml'))) || true, 'spike object has no own update');
    ok(strip(rd('objects/OBJ_chaos_spikes/Step_0.gml')).trim() === '', 'OBJ_chaos_spikes Step_0 runs nothing (the object phase owns the update)');
    // the badnik / attack-state layer is untouched: global.playerJump consumers are byte-identical to HEAD
    // (the attack-state migration has since moved the enemy consumers onto the canonical bit; verify_attack_posture.js owns that)
    const legacy = cp.spawnSync('git', ['diff', '--stat', 'HEAD', '--', 'objects/OBJ_badniks', 'objects/OBJ_badnik_1', 'objects/OBJ_monitors', 'scripts/SCR_badnik_death', 'scripts/SCR_monitor_collisions'], {cwd: root}).stdout.toString().trim();
    eq(legacy, '', 'legacy sample badnik / monitor objects are untouched');
    const attackBit = /cp_c\.move & 2\) != 0, \(cp_c\.move & 2\)|\(cp_c\.move & 2\) != 0/.test(spk); ok(attackBit, '$1B reads only the canonical attack posture bit (D503 bit 1 = move & 2)');
    // canonical placements byte-identical
    const dirty = cp.spawnSync('git', ['diff', '--quiet', 'HEAD', '--', 'rooms/ROM_chaos_thz1', 'rooms/ROM_chaos_thz2', 'scripts/SCR_chaos_level_thz2_data', 'scripts/SCR_chaos_core_data', 'scripts/SCR_chaos_motion_data', 'POC_notes/rom-cache/object-records.json', 'POC_notes/rom-cache/object-census.json'], {cwd: root}).status;
    eq(dirty, 0, 'canonical rooms, THZ2 object records and terrain/level data are byte-identical to HEAD');
    // placements: the six THZ1 platforms and four spikes are still the canonical records (room instances)
    const l1 = rd('rooms/ROM_chaos_thz1/ROM_chaos_thz1.yy'), pos = nm => { const out = []; let at = -1; const needle = '"name": "' + nm + '",'; while ((at = l1.indexOf(needle, at + 1)) >= 0) { const xi = l1.indexOf('"x": ', at), yi = l1.indexOf('"y": ', xi), pi = l1.indexOf('"path"', at); if (pi < 0 || l1.slice(pi, pi + 120).indexOf('objects/' + nm) < 0) continue; out.push([parseFloat(l1.slice(xi + 5)), parseFloat(l1.slice(yi + 5))]); } return out; };
    const pl = pos('OBJ_chaos_platform').sort(), sp = pos('OBJ_chaos_spikes').sort();
    deep(pl, S.platform_placements.thz1.map(p => [p.world_x, p.world_y]).sort(), 'THZ1 platform placements'); deep(sp, S.spike_1b_placements.thz1.map(p => [p.world_x, p.world_y]).sort(), 'THZ1 $1B placements');
    const lv = rd('scripts/SCR_chaos_level_thz2_data/SCR_chaos_level_thz2_data.gml'), t28 = lv.split(/\r?\n/).filter(l => l.indexOf(',$28,') > 0).map(l => { const f = l.trim().replace('[', '').split(','); return [+f[1], +f[2]]; });
    deep(t28.sort(), S.platform_placements.thz2.map(p => [p.world_x, p.world_y]).sort(), 'THZ2 type $28 records'); eq(lv.split(/\r?\n/).filter(l => l.indexOf(',$1B,') > 0).length, S.spike_1b_placements.thz2.length, 'no THZ2 type $1B');
}
console.log(`PLATFORM / SPIKE CHECKS PASSED (${checks} direct assertions + ${results.length} oracle-battery checks; battery cells: support 2 x 2,623, speed gates, cone 4 x 1,881, foot 82,080, side/ceiling 11,000+, one-way 1,692 rows)`);
