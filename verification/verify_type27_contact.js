// Type $27 (flying bee) contact GEOMETRY. Executes the shipped chaos_type27_contact (SCR_chaos_box_contact) and the shipped OBJ_chaos_object_27 Step event.
// Ground truth: Research collision-geometry audit, mirrored in POC_notes/rom-cache/object-27-contact.json (original callbacks $89AC/$89DF/$8A06 driving
// $6328: Sonic 8x24 vs object 9x14 -> dx -17..+17, dy -14..+24 inclusive). If the Research checkout is next to this repo the mirror is cross-checked
// against Research's own cache. Contact OUTCOME: attack (bit 1) converts to $0F; since the attack-posture migration every overlap also raises $D520 (staged) so $48BC hurts a non-attacking Sonic / rebounds an attacking one next update.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const hex = t => t.replace(/(?<![\w"])\$([0-9A-Fa-f]+)/g, '0x$1').replace(/#macro (\w+) (\S+)/g, 'var $1 = $2;').replace(/\bmod\b/g, '%');
const strip = s => s.replace(/\/\/.*$/gm, '');
let checks = 0; const eq = (a, b, m) => { assert.strictEqual(a, b, m); checks++; }; const ok = (c, m) => { assert.ok(c, m); checks++; };

// ---------- ground truth from the Research cache ----------
const cache = JSON.parse(rd('POC_notes/rom-cache/object-27-contact.json'));
const research = path.resolve(root, '..', 'sonic-chaos-reference-work', 'data', 'rom-cache', 'collision-geometry.json');
if (fs.existsSync(research)) {
    const r = JSON.parse(fs.readFileSync(research, 'utf8'));
    assert.deepStrictEqual(cache.rows, r.callback_sweeps.rows.filter(x => x.type === '0x27'), 'mirror equals Research collision-geometry.json');
    assert.deepStrictEqual(cache.object_extents, r.helper_matrix.types['0x27'].extents_by_state); checks += 2;
    console.log('cross-checked against', research);
}
ok(cache.rows.length >= 2 && cache.rows.every(r => r.rectangular && r.cells === r.cells_matching_formula && r.cells_only_in_callback === 0 && r.cells_only_in_formula === 0), 'ROM callback sweeps are exactly rectangular');
const [DX0, DX1] = cache.rows[0].contact_dx, [DY0, DY1] = cache.rows[0].contact_dy;
ok(cache.rows.every(r => r.contact_dx[0] === DX0 && r.contact_dx[1] === DX1 && r.contact_dy[0] === DY0 && r.contact_dy[1] === DY1), 'every active state has the same box');
eq(DX0, -17); eq(DX1, 17); eq(DY0, -14); eq(DY1, 24);
for (const st of ['1', '2', '3']) assert.deepStrictEqual(cache.object_extents[st], [[9, 14]]); checks += 3;

// ---------- the shipped helper ----------
const base = vm.createContext({floor: Math.floor});
vm.runInContext(hex(rd('scripts/SCR_chaos_box_contact/SCR_chaos_box_contact.gml')), base);
ok(/chaos_type27_contact[^]*?8, 24, 9, 14\) != 0/.test(rd('scripts/SCR_chaos_box_contact/SCR_chaos_box_contact.gml')), 'extents are Sonic 8x24 vs object 9x14');
const touch = (dx, dy, ox = 1152, oy = 640) => base.chaos_type27_contact(ox + dx, oy + dy, ox, oy);   // dx/dy = player anchor - object anchor
for (const [ox, oy] of [[1152, 640], [3504, 224], [37, 9], [8000, 300]]) {
    for (const s of [1, -1]) {
        eq(touch(s * 16, 0, ox, oy), true, `|dx|=16 (${s})`); eq(touch(s * 17, 0, ox, oy), true, `|dx|=17 (${s})`); eq(touch(s * 18, 0, ox, oy), false, `|dx|=18 (${s})`);
        eq(touch(s * 17, -14, ox, oy), true, 'corner'); eq(touch(s * 17, 24, ox, oy), true, 'corner'); eq(touch(s * 18, 24, ox, oy), false, 'outside corner');
    }
    eq(touch(0, -13, ox, oy), true, 'dy=-13'); eq(touch(0, -14, ox, oy), true, 'dy=-14'); eq(touch(0, -15, ox, oy), false, 'dy=-15');
    eq(touch(0, 23, ox, oy), true, 'dy=+23'); eq(touch(0, 24, ox, oy), true, 'dy=+24'); eq(touch(0, 25, ox, oy), false, 'dy=+25');
}
let cells = 0;
for (let dx = -40; dx <= 40; dx++) for (let dy = -40; dy <= 40; dy++) { eq(touch(dx, dy), dx >= DX0 && dx <= DX1 && dy >= DY0 && dy <= DY1, `grid ${dx},${dy}`); cells++; }

// ---------- the shipped Step event ----------
const stepSrc = rd('objects/OBJ_chaos_object_27/Step_0.gml');
const body = hex(stepSrc).replace('chaosAnimTick div 2', 'Math.floor(chaosAnimTick / 2)').replace(/\bexit;/g, 'return;');
function makeWorld(W, bbox) {
    const w = {camX: 0, camY: 0, camW: W, destroyed: false, damage: 0};
    w.player = {x: 0, y: 0, bbox_left: bbox[0], bbox_right: bbox[1], bbox_top: bbox[2], bbox_bottom: bbox[3], object_index: 'char'};
    w.core = {get xu() { return w.player.x * 256; }, get yu() { return w.player.y * 256; }, move: 0, stage_contact: 0, stage_nib: 0, stage_request: 0};
    Object.defineProperty(w.player, 'chaosCore', {value: w.core});
    w.ctx = vm.createContext({global: {playerJump: false, playerSpinDash: false, playerSuper: false, powerInv: false}, floor: Math.floor, round: Math.round, abs: Math.abs,
        min: Math.min, max: Math.max, view_camera: [0], camera_get_view_x: () => w.camX, camera_get_view_y: () => w.camY, camera_get_view_width: () => w.camW,
        camera_get_view_height: () => 196, instance_find: () => w.player, instance_exists: o => o === w.player, OBJ_player: 1, OBJ_player_char_spin: 'spin',
        variable_instance_exists: (o, k) => k in o, SCR_chaos_core_attach: () => {}, SCR_chaos_enemy_score_100_bytes: () => {}, instance_destroy: () => { w.destroyed = true; },
        SCR_chaos_apply_hazard_damage: () => { w.damage++; }, chaos_render_offset_x: () => 999, chaos_render_offset_y: () => 999});
    for (const n of ['SCR_chaos_viewport', 'SCR_chaos_placement', 'SCR_chaos_box_contact', 'SCR_chaos_attack']) vm.runInContext(hex(rd(`scripts/${n}/${n}.gml`)), w.ctx);
    return w;
}
// one awake state-1 update with the player placed at (dx, dy) from the bee's pre-move anchor; returns {contact, moved, destroyed, damage}
function oneUpdate(W, bbox, dx, dy, attack, ox = 1152, oy = 640, renderOffset = 0) {
    const w = makeWorld(W, bbox);
    w.box = {x: ox, y: oy, chaosOriginX: ox, chaosOriginY: oy, chaosActive: true, chaosAsleep: false, chaosWoken: true, chaosAge: 5, chaosScanTick: 1, chaosInitialFillDone: true,
        chaosState: 1, chaosVX: -0x0280, chaosVY: 0, chaosCounter: 0, chaosOscTick: 0, chaosAnimTick: 0, chaosSilentDestroy: false, chaosXU: ox * 256, chaosYU: oy * 256,
        image_index: 0, visible: true, renderOffset};
    w.ctx.b = w.box; w.ctx.id = w.box;
    w.camX = ox - Math.floor(W / 2); w.camY = oy - 100;                    // bee in the middle of the view: awake at every width
    w.player.x = ox + dx; w.player.y = oy + dy;
    if (attack) w.core.move = 2;                      // canonical attack posture: +$03 bit 1 (global.playerJump is NOT consulted)
    vm.runInContext(`(function(){ with (b) { ${body} } })()`, w.ctx);
    return {moved: w.box.chaosXU !== ox * 256, destroyed: w.destroyed, damage: w.damage, staged: w.core.stage_contact, state: w.box.chaosState, x: w.box.x, y: w.box.y};
}
const sweep = [];
for (let dx = -20; dx <= 20; dx++) for (let dy = -17; dy <= 27; dy++) sweep.push([dx, dy]);
const BOXES = {tiny: [0, 1, 0, 1], normal: [-9, 9, -18, 18], huge: [-400, 400, -400, 400], offset: [5000, 5100, 5000, 5100]};   // GameMaker mask bounds are irrelevant
for (const W of [256, 290, 348, 400, 640]) for (const [name, bbox] of Object.entries(BOXES)) {
    for (const [dx, dy] of sweep) {
        const inside = dx >= DX0 && dx <= DX1 && dy >= DY0 && dy <= DY1;
        const r = oneUpdate(W, bbox, dx, dy, false);
        eq(!r.moved, inside, `W${W} mask ${name} (${dx},${dy}): ordinary contact stalls movement exactly inside the ROM box`);
        eq(r.destroyed, false, 'ordinary contact never destroys'); eq(r.damage, 0, 'no sample-engine damage call'); eq(r.staged, inside ? 1 : 0, 'overlap raises $D520 (staged): $48BC hurts the non-attacking player next update');
        const a = oneUpdate(W, bbox, dx, dy, true);
        eq(a.destroyed, inside, `W${W} mask ${name} (${dx},${dy}): attack contact converts exactly inside the ROM box`); eq(a.damage, 0, 'attack contact is not a damage call');
    }
}
// render adapter / presentation offsets never move the contact box
for (const ro of [0, 18, -64, 300]) for (const [dx, dy] of [[17, 0], [18, 0], [0, -14], [0, -15], [0, 24], [0, 25]]) {
    const r = oneUpdate(348, BOXES.normal, dx, dy, false, 1152, 640, ro), inside = dx >= DX0 && dx <= DX1 && dy >= DY0 && dy <= DY1;
    eq(!r.moved, inside, `render offset ${ro}: box unchanged at (${dx},${dy})`);
}
// canonical anchor never moves during contact
{ const r = oneUpdate(348, BOXES.normal, 0, 0, false); eq(r.x, 1152); eq(r.y, 640); eq(r.state, 1); }
// movement before the test is NOT applied: the box is tested against the pre-move anchor (contact at dx=17 stalls; dx=18 moves 2.5 px first)
{ const r = oneUpdate(348, BOXES.normal, 18, 0, false); eq(r.moved, true); eq(r.x, 1152 - 2.5); }

// ---------- static guarantees ----------
const code = strip(stepSrc);
ok(!/bbox_|place_meeting|collision_|sprite_get|mask_index|sprite_width|sprite_height|render_offset/.test(code), 'type $27 gameplay contact reads no sprite/mask/render data');
ok(/chaos_type27_resolve\(cp_p\.chaosCore,floor\(x\),floor\(y\),global\.powerInv\)/.test(code) && /floor\(cp_c\.xu \/ 256\), floor\(cp_c\.yu \/ 256\), cp_ox, cp_oy, 8, 24, 9, 14/.test(rd('scripts/SCR_chaos_attack/SCR_chaos_attack.gml')), 'contact is the ROM box on fixed integer anchors');
ok(!/hazard_damage|chaosDamage|SCR_chaos_apply/.test(code), 'no ordinary badnik damage path');
ok(/chaos_vp_dist_lt\(floor\(x\),floor\(cp_p\.x\),64\)/.test(code) && /chaos_vp_dist_ge\(floor\(x\),floor\(cp_p\.x\),384\)/.test(code), '64 trigger and PLAYER_DIST(384) unchanged');
ok(rd('objects/OBJ_chaos_object_27/Draw_0.gml').includes('chaos_render_offset_x($27)'), '+18 render adapter untouched (Draw only)');
console.log(`TYPE 27 CONTACT CHECKS PASSED (${checks} assertions, ${cells} grid cells, widths 256/290/348/400/640, 4 mask shapes)`);
