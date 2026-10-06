// Shared helpers for the SEZ3 boss ($54 / $55) verification: loads the SHIPPED GML through the world harness and exposes Research-lab style fixtures
// (boss slot 7 = D700, HUD slot 0 = D540, camera [2900,462], limits [0,3840,8,784]) plus snapshot functions that map the live script slots onto the
// Research cache row format (data/rom-cache/sez/boss-54-runtime.json, mirrored at POC_notes/rom-cache/sez/).
const fs = require('fs'), path = require('path');
const {loadHost, root} = require('./chaos_world_harness');
const cacheDir = path.join(root, 'POC_notes/rom-cache/sez');
const load = n => JSON.parse(fs.readFileSync(path.join(cacheDir, n)));
const RUNTIME = load('boss-54-runtime.json'), FULLGAME = load('boss-54-fullgame.json'), MANIFEST = load('implementation-manifest.json');
const SLOT0 = 0xD540, S = 0xD700;
const bcd = n => (Math.floor(n / 10) << 4) | (n % 10);

let SHARED = null;
/// One compiled host is reused (compiling every shipped script per case would dominate the sweeps); all state a case can touch is reset here.
function newWorld(width = 256, height = 192, fresh = false) {
    const h = fresh || !SHARED ? loadHost() : SHARED;
    if (!fresh) SHARED = h;
    const c = h.ctx, g = c.global;
    h.reset();
    c.room = c.ROM_chaos_sez3;
    h.world.roomWidth = 4096; h.world.roomHeight = 1024; h.world.follow = false;
    h.world.cam = {x: 2900, y: 462, w: width, h: height};
    g.chaosS2 = c.chaos_s2_new(); g.chaosSez54 = c.chaos_54_new(); g.chaosSezBossActive = false;
    g.chaosSezEffects = c.chaos_sez_effect_new(); g.chaosLostRings = []; g.chaosLastSoundRequest = 0; g.chaosBossNextAct = -4; g.chaosHudSlide = 0; g.chaosCrushDeathPhase = 0;
    g.minutes = 0; g.seconds = 0; g.ring = 0; g.chaosFinishTime = 0;
    return h;
}
const flags4 = s => (s.bit0 ? 1 : 0) | (s.keep ? 2 : 0) | (s.asleep ? 64 : 0);
const isBoss = s => s.type === 0x54 || (s.type === 0x0F && s.src_type === 0x54);
/// Same fields as Research's Lab.snap() slot rows (types 0 and >= $F0 are not listed). Bytes the POC models under another name: +$34/+$35 (HUD pointer / cooldown / defeat flag),
/// the $34 puff's seed (+$34) and remaining count (+$1E).
function slotRow(c, s, i) {
    return {slot: SLOT0 + i * 64, type: s.type, state: s.state, requested: s.requested, frame: s.frame, duration: s.timer,
        x: c.chaos_54_x(s), y: c.chaos_54_y(s), fx: s.xu & 255, fy: s.yu & 255, vx: s.vx, vy: s.vy, extent: [s.ex, s.ey], flags3: 0, flags4: flags4(s),
        hp: isBoss(s) ? s.hp : 0, cooldown: isBoss(s) ? s.cooldown : (s.type === 0x34 ? s.seed : 0), defeated: isBoss(s) ? s.defeated : 0, drop: isBoss(s) ? s.drop : 0,
        counter: isBoss(s) ? s.counter : (s.type === 0x34 ? s.remaining : 0), token: s.token, parameter: s.parameter};
}
function snapSlots(L) {
    const out = [];
    L.pool.slots.forEach((s, i) => { if (s.boss && s.type !== 0 && s.type < 0xF0) out.push(slotRow(L.c, s, i)); });
    return out;
}
function playerRow(L) {
    const c = L.c, p = L.core;
    return {x: Math.floor(p.xu / 256), y: Math.floor(p.yu / 256), vx: p.vx, vy: p.vy, state: p.state, requested: p.next, flags: p.move, floor: p.contacts & 2,
        damage: p.stage_request, owner: p.stage_contact ? 1 : 0, contact: p.stage_nib, sound: c.global.chaosLastSoundRequest, rings: bcd(p.rings)};
}
function snap(L) {
    return {slots: snapSlots(L), player: playerRow(L), camera: [L.vp.left, L.vp.top], limits: [L.b.camera_left, L.b.camera_right, 8, L.b.camera_bottom], pan: [L.b.pan_x, L.b.pan_y],
        boss_active: L.c.global.chaosSezBossActive ? 3 : 0, timer_running: 0};
}
/// Research Lab(): creator rig with the boss in slot 7 at its canonical world anchor (3200,622), synthetic token 25, creator flags (asleep), camera [2900,462], limits [0,3840,8,784],
/// Sonic parked at (200,0) in state 5. The Lab never runs the renderer, so the cached screen bytes stay 0 unless a case writes them.
function lab(opts = {}) {
    const width = opts.width || 256, h = newWorld(width), c = h.ctx, b = c.global.chaosSez54, pool = c.global.chaosS2;
    b.latch_clear = false; b.screen_pass = false; b.random_byte = 0;
    const core = c.SCR_cc_new(200, 0); core.state = core.next = 5; core.move = 0; core.rings = 0;
    const s = c.chaos_54_slot(0x54, 0, 3200, 622, 25); s.asleep = true; s.woken = false; pool.slots[7] = s;
    const vp = {left: opts.left === undefined ? 2900 : opts.left, top: 462, w: width, h: 192};
    b.viewport_w = width; b.camera_x = vp.left; b.camera_y = vp.top;
    const L = {h, c, g: c.global, b, pool, s, core, vp, present: true};
    L.call = (pc, slot = L.s) => c.chaos_54_callback(b, pool, slot, pc, core, L.present, L.vp);
    L.step = t => { b.d12f = t & 255; core.stage_nib = 0; /* D521 holds only the contact of the current scheduler pass (the Research rows read 0 the update after a contact) */ c.chaos_54_tick(b, pool, L.vp, core, L.present); };
    L.position = (x, y) => { core.xu = x * 256; core.yu = y * 256; };
    return L;
}
/// Research prepare(): a type-84 slot at (3100,580) in state/request 7 (frame/extents from the mapping), Sonic at (3100+dx, 580+dy) with the given flags, then the A3D8 contact helper.
function prepare(L, o = {}) {
    const a = Object.assign({dx: 0, dy: -48, attack: 2, frame: 1, cooldown: 0, hp: 8, hurt: 0, inv: 0, ex: 8, vy: 256, floor: 0, terrain: 0, power: 0, drop: 0, state: 7}, o);
    const c = L.c, s = c.chaos_54_slot(0x54, 0, 3100, 580, 0), e = c.chaos_54_extent(0x54, a.frame), p = L.core;
    s.state = s.requested = a.state; s.hp = a.hp; s.cooldown = a.cooldown; s.drop = a.drop; s.frame = a.frame; s.ex = e[0]; s.ey = e[1]; s.keep = true;
    L.pool.slots[7] = s; L.s = s;
    p.xu = (3100 + a.dx) * 256; p.yu = (580 + a.dy) * 256; p.vx = 384; p.vy = a.vy; p.move = a.attack | a.hurt | a.inv; p.state = a.ex === 9 ? 15 : 5; p.next = 5;
    p.bg = a.terrain; p.contacts = a.floor; p.rings = 47; p.immune = a.power === 6;
    p.stage_contact = 0; p.stage_nib = 0; p.stage_request = 0; p.contact = 0; p.damage_request = 0;
    c.global.chaosLastSoundRequest = 0; L.b.flash = [];
    return a;
}
function contact(L, o) {
    prepare(L, o);
    const bits = L.c.chaos_54_combat_contact(L.b, L.s, L.core, true, L.vp);
    return {bits, hp: L.s.hp, cooldown: L.s.cooldown, defeated: L.s.defeated, requested: L.s.requested, player: playerRow(L)};
}
/// Research mghz56_runtime.overlap_model + sez54_runtime.projected (SMS minimum-penetration classification and the $5FA0 targets).
function overlapModel(dx, dy, ex, ox, oy) {
    if (Math.abs(dx) > ex + ox || dy < -oy || dy > 24) return 0;
    return ex + ox - Math.abs(dx) >= (dy < 0 ? oy + dy : 24 - dy) ? (dy < 0 ? 1 : 2) : (dx < 0 ? 8 : 4);
}
function projected(dx, dy, bit, ex, ox, oy, terrain = 0, camera = 2900) {
    let x = 3100 + dx, y = 580 + dy;
    if (bit === 1 && !(terrain & 1)) y = 580 - oy;
    if (bit === 2 && !(terrain & 2)) y = 604;
    if (bit === 8 && !(terrain & 8) && camera + 32 < x) x = 3100 - ox - ex;
    if (bit === 4 && !(terrain & 4) && x <= camera + 224) x = 3100 + ox + ex;
    return [x, y];
}
module.exports = {RUNTIME, FULLGAME, MANIFEST, newWorld, lab, prepare, contact, snap, snapSlots, slotRow, playerRow, overlapModel, projected, flags4, bcd, SLOT0, S, load, loadHost, root, isBoss};
