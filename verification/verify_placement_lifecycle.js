// Executes the shipped SCR_chaos_spawn_cell against the ROM spawn map, and the shipped OBJ_chaos_object_27 Step event through
// full placement lifecycles (creation, trigger, movement, removal, recreation rules) with stubbed GameMaker state.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const hex = t => t.replace(/(?<![\w"])\$([0-9A-Fa-f]+)/g, '0x$1');
const macros = t => t.replace(/#macro (\w+) (\S+)/g, 'var $1 = $2;').replace(/\bmod\b/g, '%');
// the spawn cell is the shared viewport adapter's lifecycle band (SCR_chaos_viewport) applied to the real view
const placementSrc = macros(fs.readFileSync(path.join(root, 'scripts/SCR_chaos_viewport/SCR_chaos_viewport.gml'), 'utf8')) + String.fromCharCode(10) +
    macros(fs.readFileSync(path.join(root, 'scripts/SCR_chaos_placement/SCR_chaos_placement.gml'), 'utf8'));
const map = JSON.parse(fs.readFileSync(path.join(__dirname, 'placement-spawn-map.json'), 'utf8'));
const base = vm.createContext({floor: Math.floor, abs: Math.abs, min: Math.min, max: Math.max});
vm.runInContext(placementSrc, base);
// --- spawn map equals the ROM for every cell (and outside the window) on the 256 px view, for several camera origins -------
for (const [camX, camY] of [[0, 0], [1000, 520], [3831, 405], [12345, 777]]) {
    const vp256 = base.chaos_vp_new(camX, camY, 256, 192);
    for (let cy = 0; cy < 32; cy++) for (let cx = 0; cx < 32; cx++) {
        const romValue = map.table[cy * 32 + cx];
        for (const [ox, oy] of [[0, 0], [15, 15], [7, 3]]) {
            assert.strictEqual(base.SCR_chaos_spawn_cell(vp256, camX - 128 + cx * 16 + ox, camY - 128 + cy * 16 + oy), romValue, `cell ${cx},${cy} cam ${camX},${camY}`);
        }
    }
    for (const [x, y] of [[-129, 0], [0, -129], [384, 0], [0, 384], [-1000, 5], [4000, 5]]) assert.strictEqual(base.SCR_chaos_spawn_cell(vp256, camX + x, camY + y), 3);
}
// --- lifecycle simulation ---------------------------------------------------------------------------------------------
const stepSrc = fs.readFileSync(path.join(root, 'objects/OBJ_chaos_object_27/Step_0.gml'), 'utf8');
const body = hex(stepSrc).replace('chaosAnimTick div 2', 'Math.floor(chaosAnimTick / 2)').replace(/\bexit;/g, 'return;').replace(/\bmod\b/g, '%');
function makeWorld(originX, originY) {
    const w = {frame: 0, camX: 0, camY: 0, camW: 256, destroyed: false, activations: 0, trace: []};
    w.player = {x: 0, y: 5000, bbox_left: 0, bbox_right: 0, bbox_top: 0, bbox_bottom: 0, object_index: 'char'};
    Object.defineProperty(w.player, 'chaosCore', {value: {get xu() { return w.player.x * 256; }, get yu() { return w.player.y * 256; }}});
    w.ctx = vm.createContext({global: {playerJump: false, playerSpinDash: false, playerSuper: false, powerInv: false},
        floor: Math.floor, round: Math.round, abs: Math.abs, min: Math.min, max: Math.max, view_camera: [0], camera_get_view_x: () => w.camX, camera_get_view_y: () => w.camY,
        camera_get_view_width: () => w.camW, camera_get_view_height: () => 196,
        instance_find: () => w.player, instance_exists: o => o === w.player, OBJ_player: 1, OBJ_player_char_spin: 'spin', variable_instance_exists: (o, k) => k in o, SCR_chaos_core_attach: () => {},
        SCR_chaos_enemy_score_100_bytes: () => {}, instance_destroy: () => { w.destroyed = true; }});
    vm.runInContext(placementSrc, w.ctx); vm.runInContext(macros(fs.readFileSync(path.join(root, 'scripts/SCR_chaos_box_contact/SCR_chaos_box_contact.gml'), 'utf8')), w.ctx);
    w.box = {x: originX, y: originY, chaosOriginX: originX, chaosOriginY: originY, chaosActive: false, chaosAsleep: true, chaosAge: 0, chaosScanTick: 0,
             chaosInitialFillDone: false, chaosState: 0, chaosVX: 0, chaosVY: 0, chaosCounter: 0, chaosOscTick: 0, chaosAnimTick: 0, chaosSilentDestroy: false,
             chaosXU: originX * 256, chaosYU: originY * 256, image_index: 0, visible: false};
    w.ctx.box = box => box; w.ctx.b = w.box; w.ctx.id = w.box;
    w.step = () => {
        const was = w.box.chaosActive;
        vm.runInContext(`(function(){ with (b) { ${body} } })()`, w.ctx);
        if (!was && w.box.chaosActive) w.activations++;
        w.frame++;
    };
    return w;
}
const ORIGIN = [1152, 640];
// A. Sonic stays beside the placement (camera fixed, placement in an interior cell): exactly one full cycle, never a respawn.
{
    const w = makeWorld(...ORIGIN); w.camX = 1000; w.camY = 520; w.player.x = 1100; w.player.bbox_left = 1091; w.player.bbox_right = 1109; w.player.bbox_top = 700; w.player.bbox_bottom = 740;
    let triggerAt = -1, state3At = -1, removedAt = -1, wokeAt = -1;
    for (let i = 0; i < 3000; i++) {
        w.step();
        if (triggerAt < 0 && w.box.chaosState === 2) triggerAt = w.frame;
        if (state3At < 0 && w.box.chaosState === 3) state3At = w.frame;
        if (wokeAt < 0 && w.box.visible) wokeAt = w.frame;
        if (removedAt < 0 && state3At > 0 && !w.box.chaosActive) removedAt = w.frame;
    }
    assert.strictEqual(w.activations, 1, 'the placement is created exactly once while Sonic stays put');
    assert.ok(triggerAt > 0 && state3At > triggerAt && removedAt > state3At, 'trigger -> state 3 -> removal all happen');
    assert.strictEqual(state3At - triggerAt, 129, 'state 2 lasts 129 callbacks (counter $80 underflows on callback 129)');
    assert.strictEqual(w.box.chaosActive, false, 'ends removed, occupancy released');
    // no respawn for the remaining ~2800 frames although the placement is unoccupied
    assert.ok(w.frame - removedAt > 2500);
    // vertical drift is subtle: 3/256 px net (signed 8.8 accumulation)
}
// B. Leaving and re-entering: removal pre-trigger outside the window, recreation only via the outer ring.
{
    const w = makeWorld(...ORIGIN); w.camX = 1000; w.camY = 520; w.player.x = 3000; w.player.bbox_left = w.player.bbox_right = 3000; w.player.bbox_top = w.player.bbox_bottom = 640;
    for (let i = 0; i < 12; i++) w.step();
    assert.strictEqual(w.activations, 1, 'created during the initial fill (interior cell)');
    assert.strictEqual(w.box.chaosActive, true);
    w.camX = 5000; for (let i = 0; i < 12; i++) w.step();   // scrolled far away -> cell 3 -> $FE cleanup
    assert.strictEqual(w.box.chaosActive, false, 'pre-trigger object removed when it leaves the accepted window');
    w.camX = 1000; for (let i = 0; i < 40; i++) w.step();   // camera jumps back: placement is an INTERIOR cell -> not recreated
    assert.strictEqual(w.activations, 1, 'interior cells do not create after the initial fill');
    w.camX = 1152 - 300; for (let i = 0; i < 12; i++) w.step(); // placement now at relX 300 = outer ring (cell 2) -> created, asleep
    assert.strictEqual(w.activations, 2, 'recreated when the placement enters the outer ring');
    assert.strictEqual(w.box.chaosAsleep, true); assert.strictEqual(w.box.visible, false, 'created sleeping, not displayed');
    w.camX = 1152 - 200; for (let i = 0; i < 12; i++) w.step(); // relX 200 -> interior: awake
    assert.strictEqual(w.box.visible, true, 'wakes when it reaches the interior');
}
// C. Placement first seen in the outer ring at level start is created (cell 2 always creates); one first seen in cell 3 is not.
{
    const w = makeWorld(...ORIGIN); w.camX = 1152 - 320; w.camY = 520; w.player.x = 9000; w.player.bbox_left = w.player.bbox_right = 9000;
    for (let i = 0; i < 8; i++) w.step(); assert.strictEqual(w.activations, 1);
    const far = makeWorld(...ORIGIN); far.camX = 1152 - 500; far.camY = 520; far.player.x = 9000;
    for (let i = 0; i < 40; i++) far.step(); assert.strictEqual(far.activations, 0, 'cell 3 never creates');
}
// D. A defeated object detaches its token: it is destroyed and the placement never returns in this level session.
{
    const w = makeWorld(...ORIGIN); w.camX = 1000; w.camY = 520; w.player.x = 1140; w.player.y = 640; w.player.bbox_left = 1085; w.player.bbox_right = 1170; w.player.bbox_top = 620; w.player.bbox_bottom = 660;
    w.ctx.global.playerJump = true;
    for (let i = 0; i < 40 && !w.destroyed; i++) w.step();
    assert.strictEqual(w.destroyed, true, 'attack contact destroys the instance (token detached)');
}
console.log('PLACEMENT LIFECYCLE CHECKS PASSED');
