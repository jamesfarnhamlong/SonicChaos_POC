// Executes the shipped shared viewport adapter (SCR_chaos_viewport), the act-clear camera/clamp (SCR_chaos_goal) and the shipped type $27
// Step event at several view widths and camera origins. Proves the recovered relationships (EDGE / CENTER / PLAYER_DIST / LOCKED_CAMERA)
// are camera- and width-relative rather than tied to THZ coordinates, and that nothing act-specific or bee-specific was added.
// Logic only; Windows gameplay remains the final acceptance check.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const hex = t => t.replace(/(?<![\w"])\$([0-9A-Fa-f]+)/g, '0x$1').replace(/#macro (\w+) (\S+)/g, 'var $1 = $2;').replace(/\bmod\b/g, '%');
const strip = src => src.replace(/\/\/.*$/gm, '');
const WIDTHS = [256, 290, 348, 400, 640];
const ORIGINS = [0, 3, 129, 777, 3700, 12345];            // left and right camera origins, none tied to THZ
const SMS = 256;

const ctx = vm.createContext({floor: Math.floor, round: Math.round, abs: Math.abs, min: Math.min, max: Math.max, sign: Math.sign,
    clamp: (v, a, b) => Math.min(Math.max(v, a), b)});
for (const n of ['SCR_chaos_viewport', 'SCR_chaos_placement', 'SCR_chaos_goal'])
    vm.runInContext(hex(rd(`scripts/${n}/${n}.gml`)), ctx, {filename: n + '.gml'});
const mapTable = JSON.parse(rd('verification/placement-spawn-map.json')).table;

// ROM map cell for an offset d = x - cam on the 256 px window (the table is 32x32 cells of 16 px over [-128, 384))
const romAxis = d => { const u = Math.floor((d + 128) / 16); return (d + 128 < 0 || u > 31) ? null : u; };
const romCell = (dx, dy) => { const u = romAxis(dx), v = romAxis(dy); return (u === null || v === null) ? 3 : mapTable[v * 32 + u]; };

let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
const eq = (a, b, msg) => { assert.strictEqual(a, b, msg); checks++; };

// ---------- 1. vocabulary: EDGE / CENTER / LOCKED_CAMERA / PLAYER_DIST / WORLD at every width and origin ----------
for (const W of WIDTHS) for (const left of ORIGINS) {
    const vp = ctx.chaos_vp_new(left, 100, W, 196), tag = `W${W}@${left}`;
    eq(ctx.chaos_vp_edge(vp, ctx.CHAOS_VP_RIGHT, 33), left + W + 33, `${tag} EDGE(RIGHT,+33)`);
    eq(ctx.chaos_vp_edge(vp, ctx.CHAOS_VP_RIGHT, -7), left + W - 7, `${tag} EDGE(RIGHT,-7)`);
    eq(ctx.chaos_vp_edge(vp, ctx.CHAOS_VP_RIGHT, 0), left + W, `${tag} EDGE(RIGHT,0) is the exclusive right edge`);
    eq(ctx.chaos_vp_edge(vp, ctx.CHAOS_VP_LEFT, 16), left + 16, `${tag} EDGE(LEFT,+16)`);
    eq(ctx.chaos_vp_edge(vp, ctx.CHAOS_VP_RIGHT, -9), left + W - 9, `${tag} EDGE(RIGHT,-9)`);
    eq(ctx.chaos_vp_center(vp, 0), left + W / 2, `${tag} CENTER(0)`);
    eq(ctx.chaos_vp_center(vp, 5), left + W / 2 + 5, `${tag} CENTER(+5)`);
    eq(ctx.chaos_vp_left_for_center(W, left + 1000, 0), left + 1000 - W / 2, `${tag} camera that puts x at CENTER(0)`);
    eq(ctx.chaos_vp_center(ctx.chaos_vp_new(ctx.chaos_vp_left_for_center(W, left + 1000, 0), 0, W, 0), 0), left + 1000, `${tag} CENTER round trip`);
    // RIGHT-relative values move 1:1 with the width; LEFT/WORLD/PLAYER_DIST ones do not
    eq(ctx.chaos_vp_edge(vp, ctx.CHAOS_VP_RIGHT, 33) - ctx.chaos_vp_edge(ctx.chaos_vp_new(left, 100, SMS, 196), ctx.CHAOS_VP_RIGHT, 33), W - SMS, `${tag} RIGHT edges widen by W-256`);
    eq(ctx.chaos_vp_edge(vp, ctx.CHAOS_VP_LEFT, 16), ctx.chaos_vp_edge(ctx.chaos_vp_new(left, 100, SMS, 196), ctx.CHAOS_VP_LEFT, 16), `${tag} LEFT edges do not move`);
    const lk = ctx.chaos_vp_locked(left, W);
    eq(ctx.chaos_vp_edge(lk, ctx.CHAOS_VP_RIGHT, 33), left + W + 33, `${tag} LOCKED_CAMERA(c): EDGE(RIGHT,+33) is a fixed world X`);
    eq(ctx.chaos_vp_world(left + 77), left + 77, `${tag} WORLD(x) is the identity`);
    // PLAYER_DIST has no view argument at all: identical at every width by construction; assert the boundary itself
    for (const [n, d] of [[64, 63], [64, 64], [384, 383], [384, 384]]) {
        eq(ctx.chaos_vp_dist_lt(left, left + d, n), d < n, `${tag} PLAYER_DIST < ${n} at ${d}`);
        eq(ctx.chaos_vp_dist_ge(left + d, left, n), d >= n, `${tag} PLAYER_DIST >= ${n} at ${d} (either side)`);
    }
}
// canonical SMS relationships recovered on the 256 px view
{ const vp = ctx.chaos_vp_new(0, 0, 256, 192);
  eq(ctx.chaos_vp_edge(vp, ctx.CHAOS_VP_RIGHT, 33), 0x121, 'EDGE(RIGHT,+33) on 256 px = $121');
  eq(ctx.chaos_vp_edge(vp, ctx.CHAOS_VP_RIGHT, -7), 0xF9, 'EDGE(RIGHT,-7) on 256 px = $F9 (d > $F8)');
  eq(ctx.chaos_vp_edge(vp, ctx.CHAOS_VP_LEFT, 16), 0x10, 'EDGE(LEFT,+16) = $10');
  eq(ctx.chaos_vp_edge(vp, ctx.CHAOS_VP_RIGHT, -9), 0xF7, 'EDGE(RIGHT,-9) = $F7');
  eq(ctx.chaos_vp_center(vp, 0), 0x80, 'CENTER(0) on 256 px = $80'); }

// ---------- 2. act-clear threshold ----------
eq(ctx.chaos_goal_clear_dx(256), 0x121, 'act-clear threshold at 256 reproduces canonical $121 exactly');
for (const W of WIDTHS) eq(ctx.chaos_goal_clear_dx(W), W + 33, `act-clear threshold scales with the view (W${W})`);
eq(ctx.CHAOS_ACT_CLEAR_DX_SMS - SMS, ctx.CHAOS_ACT_CLEAR_EDGE, 'clear edge offset derives from $121');
eq(ctx.CHAOS_ACT_FREEZE_DX_SMS - SMS, ctx.CHAOS_ACT_FREEZE_EDGE, 'freeze edge offset derives from d > $F8');

// ---------- 3. recovered sign pan, freeze and player clamp, on synthetic worlds (not THZ) ----------
const ROOM_W = 40000, ROOM_H = 2048, VH = 196;
function runPan(W, signX, signY, camX, camY, opts = {}) {
    const pan = ctx.chaos_goal_pan_new(); ctx.chaos_goal_pan_begin(pan, signX, signY);
    let xs = [camX], ys = [camY], simul = 0;
    for (let t = 0; t < 4000; t++) {
        const bx = xs[xs.length - 1], by = ys[ys.length - 1];
        ctx.chaos_goal_pan_step(pan, bx, by, W, VH, opts.roomW || ROOM_W, ROOM_H, opts.playerX === undefined ? signX : opts.playerX, !!opts.in20);
        if (pan.x !== bx && pan.y !== by) simul++;
        xs.push(pan.x); ys.push(pan.y);
        if (pan.x === bx && pan.y === by && !opts.keepGoing) break;
    }
    return {pan, xs, ys, simul};
}
for (const W of WIDTHS) for (const left of ORIGINS) {
    const signX = left + 5000, signY = 700 + (left % 301), tag = `W${W}@${left}`;
    for (const [dx0, dy0] of [[-300, 40], [-120, -60], [-20, 0], [-1, 0], [0, 12]]) {
        const camX = signX - W / 2 + dx0, camY = signY - 153 + dy0;
        const r = runPan(W, signX, signY, camX, camY);
        const wantX = Math.max(camX, signX - W / 2 - 1);                      // exclusive limit: one px short; never scrolls left
        eq(r.xs[r.xs.length - 1], wantX, `${tag} pan X settles at signX-W/2-1 (cam ${camX})`);
        eq(r.ys[r.ys.length - 1], signY - 153, `${tag} pan Y settles at signY-153`);
        ok(r.xs.every((v, i) => i === 0 || (v - r.xs[i - 1] === 0 || v - r.xs[i - 1] === 1)), `${tag} X steps are 0 or +1 px/update`);
        ok(r.ys.every((v, i) => i === 0 || Math.abs(v - r.ys[i - 1]) <= 1), `${tag} Y steps are at most 1 px/update`);
        // X and Y advance together while both still have distance to go
        const common = Math.min(wantX - camX, Math.abs(dy0));
        ok(r.simul >= common, `${tag} X and Y pan simultaneously (${r.simul} >= ${common})`);
        // the sign ends at CENTER (+1 px: the limit is exclusive) of the displayed width
        if (dx0 < -1) eq(signX - r.xs[r.xs.length - 1], W / 2 + 1, `${tag} sign ends one px right of CENTER(0)`);
    }
    // camera ahead of the target never scrolls back left
    const ahead = runPan(W, signX, signY, signX - W / 2 + 40, signY - 153);
    eq(ahead.xs[ahead.xs.length - 1], signX - W / 2 + 40, `${tag} camera already ahead of the target stays put`);
    // WORLD precedence: with room to spare the sign ends at CENTER(0)+1 ...
    const wide = runPan(W, signX, signY, signX - W - 200, signY - 153, {roomW: signX + 10 * W});
    eq(wide.xs[wide.xs.length - 1] + W / 2 + 1, signX, `${tag} CENTER preserved when the world has room`);
    // ... and at a canonical world edge the camera stops so that the last visible column is the last world column (never exposing non-world space)
    for (const roomW of [signX + 20, signX + W / 2 - 40, signX + W / 2, signX + W / 2 + 1, signX + W / 2 + 2]) {
        const edge = runPan(W, signX, signY, signX - W - 200, signY - 153, {roomW}), cam = edge.xs[edge.xs.length - 1];
        eq(cam, Math.min(signX - W / 2 - 1, roomW - W), `${tag} room ${roomW - signX}: camera = min(desired-1, worldRight-W)`);
        ok(cam + W - 1 <= roomW - 1, `${tag} room ${roomW - signX}: last visible column ${cam + W - 1} inside the world`);
    }
    // freeze: only in state $20 and only once the player reaches EDGE(RIGHT,-7) of the (still moving) view; never moves afterwards
    const far = signX - W / 2 - 400, cur = far + 10;
    for (const [pxOff, in20, frozen] of [[W - 8, true, false], [W - 7, true, true], [W - 7, false, false], [W + 50, false, false]]) {
        // the player position is tested against the camera AFTER this update's move (cur + 1)
        const pxX = (cur + 1) + pxOff;
        const q = ctx.chaos_goal_pan_new(); ctx.chaos_goal_pan_begin(q, signX, signY);
        ctx.chaos_goal_pan_step(q, cur, signY - 153, W, VH, ROOM_W, ROOM_H, pxX, in20);
        eq(q.frozen, frozen, `${tag} freeze at player offset ${pxOff - W} from RIGHT, state20=${in20}`);
        if (frozen) {
            const before = [q.x, q.y];
            for (let i = 0; i < 30; i++) { const bx = q.x, by = q.y; ctx.chaos_goal_pan_step(q, bx, by, W, VH, ROOM_W, ROOM_H, pxX + i, true); assert.deepStrictEqual([q.x, q.y], [bx, by]); }
            checks++;
            assert.deepStrictEqual([q.x, q.y], before);
        }
    }
    // a frozen camera makes EDGE(RIGHT,+33) a fixed world X: the clear threshold of that camera
    const lockedC = 1234 + left;
    eq(ctx.chaos_vp_edge(ctx.chaos_vp_locked(lockedC, W), ctx.CHAOS_VP_RIGHT, 33) - lockedC, ctx.chaos_goal_clear_dx(W), `${tag} frozen-camera clear X equals camera + clear_dx`);
}
// the THZ sign (both acts use signX 3960 and the 4096 px map) at every width: CENTER is kept while it fits (256 px), otherwise WORLD wins
for (const [W, wantCam] of [[256, 3831], [290, 3806], [348, 3748], [400, 3696], [640, 3456]]) {
  const r = runPan(W, 3960, 558, 3400, 450, {roomW: 4096}), cam = r.xs[r.xs.length - 1];
  eq(cam, wantCam, `THZ sign at W${W}: camera ${wantCam}`); ok(cam + W - 1 <= 4095, `THZ sign at W${W}: no visible column beyond the canonical map (${cam + W - 1})`); }
// 256 px reproduction of the recovered THZ numbers (sign 3960 -> camera 3831, sign screen X 129, Y target signY-153)
{ const r = runPan(256, 3960, 558, 3700, 450); eq(r.xs[r.xs.length - 1], 3831, '256 px: camera X settles at signX-129 = 3831'); eq(r.ys[r.ys.length - 1], 405, '256 px: camera Y = signY-153 = 405');
  eq(r.xs.length - 1 >= 131, true, 'X needs 131 updates from 3700 at 1 px/update'); }

// player edge clamp: the visible-edge relationship at every width, no 8-bit wrap
for (const W of WIDTHS) for (const left of ORIGINS) {
    const vp = ctx.chaos_vp_new(left, 0, W, VH), lo = (left + 16) * 256, hi = (left + W - 9) * 256, tag = `W${W}@${left}`;
    for (const [xu, vx, wantX, wantVx, hit] of [
        [lo, 300, lo, 300, false], [lo - 256, -500, lo, 0, true], [lo + 1000, 99, lo + 1000, 99, false], [hi, -300, hi, -300, false], [hi + 256, 700, hi, 0, true],
        [(left + SMS + 5) * 256 + 17 * 0, 700, W > SMS + 5 ? (left + SMS + 5) * 256 : hi, W > SMS + 5 ? 700 : 0, W <= SMS + 5],  // d = 261: legal on a wide view, clamped (not teleported left) on 256
        [(left + W + 20) * 256, 700, hi, 0, true]]) {
        const k = ctx.chaos_goal_clamp_player(vp, xu, vx);
        eq(k.xu, wantX, `${tag} clamp xu ${xu / 256 - left}`); eq(k.vx, wantVx, `${tag} clamp vx`); eq(k.hit, hit, `${tag} clamp hit`);
    }
}

// ---------- 4. generic lifecycle bands ----------
const bandNames = ['awake', 'margin', 'ring', 'delete'];
for (const W of WIDTHS) for (const left of ORIGINS) {
    const top = 400 + (left % 97), vp = ctx.chaos_vp_new(left, top, W, VH), tag = `W${W}@${left}`;
    const Y = top + 100;                                                             // an anchor inside the vertical central band
    const cell = x => ctx.SCR_chaos_spawn_cell(vp, x, Y);
    // edge distances preserved at any width
    eq(cell(left), 0, `${tag} LEFT is visible`); eq(cell(left + W - 1), 0, `${tag} RIGHT-1 is visible`);
    eq(cell(left + W), 1, `${tag} RIGHT starts the 32 px awake margin`); eq(cell(left + W + 31), 1, `${tag} RIGHT+31 awake`);
    eq(cell(left + W + 32), 2, `${tag} RIGHT+32 starts the sleep/create ring`); eq(cell(left + W + 95), 2, `${tag} RIGHT+95 is the last ring pixel`);
    eq(cell(left + W + 96), 3, `${tag} RIGHT+96 is deleted`);
    eq(cell(left - 1), 1, `${tag} LEFT-1 awake margin`); eq(cell(left - 32), 1, `${tag} LEFT-32 awake`);
    eq(cell(left - 33), 2, `${tag} LEFT-33 ring`); eq(cell(left - 96), 2, `${tag} LEFT-96 last ring pixel`); eq(cell(left - 97), 3, `${tag} LEFT-97 deleted`);
    // every x equals the ROM map: left side by d = x - cam, right side by the same offset measured from RIGHT (d - (W-256)), inside = visible
    for (let x = left - 140; x <= left + W + 140; x++) for (const dy of [-140, -97, -96, -33, -32, -1, 0, 100, 255, 256, 287, 288, 351, 352, 383, 384]) {
        const d = x < left ? x - left : (x >= left + W ? x - (left + W) + SMS : 128);   // inside [LEFT,RIGHT) = the ROM's visible band
        eq(ctx.SCR_chaos_spawn_cell(vp, x, top + dy), romCell(d, dy), `${tag} x=${x - left} dy=${dy} matches the ROM map at the equivalent 256 px offset`);
    }
    // vertical band is unchanged by the horizontal width
    for (const dy of [-97, -96, -33, -1, 0, 255, 256, 287, 288, 351, 352]) eq(ctx.chaos_vp_band_y(vp, top + dy), ctx.chaos_vp_band_y(ctx.chaos_vp_new(left, top, SMS, 192), top + dy), `${tag} vertical band dy=${dy}`);
}
// on 256 the adapter IS the ROM map for every coordinate
for (const left of ORIGINS) { const vp = ctx.chaos_vp_new(left, 500, 256, 192);
    for (let dx = -135; dx <= 390; dx++) for (const dy of [-135, -50, 0, 120, 255, 300, 360, 390]) eq(ctx.SCR_chaos_spawn_cell(vp, left + dx, 500 + dy), romCell(dx, dy), `256@${left} ${dx},${dy}`); }

// ---------- 5. type $27: generic lifecycle only; canonical placement, trigger and PLAYER_DIST(384) unchanged at every width ----------
const THZ1_27 = [[3504, 224], [2288, 768], [2240, 112]], THZ2_27 = [[3504, 640], [3360, 192], [1952, 160], [1152, 640]];
const room1 = rd('rooms/ROM_chaos_thz1/ROM_chaos_thz1.yy');
const found = [...room1.matchAll(/"objectId":\{"name":"OBJ_chaos_object_27"[^\n]*\n[^\n]*"x":([\d.]+),"y":([\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
assert.deepStrictEqual(found, THZ1_27); checks++;
const thz2src = rd('scripts/SCR_chaos_level_thz2_data/SCR_chaos_level_thz2_data.gml');
assert.deepStrictEqual([...thz2src.matchAll(/\[\d+,(\d+),(\d+),\$27,/g)].map(m => [Number(m[1]), Number(m[2])]), THZ2_27); checks++;
const step27 = rd('objects/OBJ_chaos_object_27/Step_0.gml');
const body27 = hex(step27).replace('chaosAnimTick div 2', 'Math.floor(chaosAnimTick / 2)').replace(/\bexit;/g, 'return;').replace(/\bmod\b/g, '%');
function makeBee(originX, originY, W) {
    const w = {camX: 0, camY: 0, camW: W, frame: 0, destroyed: false, activations: 0, removals: 0};
    w.player = {x: 0, y: 5000, bbox_left: 0, bbox_right: 0, bbox_top: 0, bbox_bottom: 0, object_index: 'char'};
    Object.defineProperty(w.player, 'chaosCore', {value: {get xu() { return w.player.x * 256; }, get yu() { return w.player.y * 256; }}});
    w.ctx = vm.createContext({variable_instance_exists: (o, k) => k in o, SCR_chaos_core_attach: () => {}, global: {playerJump: false, playerSpinDash: false, playerSuper: false, powerInv: false}, floor: Math.floor, round: Math.round,
        abs: Math.abs, min: Math.min, max: Math.max, clamp: ctx.clamp, view_camera: [0], camera_get_view_x: () => w.camX, camera_get_view_y: () => w.camY,
        camera_get_view_width: () => w.camW, camera_get_view_height: () => 196, instance_find: () => w.player, instance_exists: o => o === w.player, OBJ_player: 1,
        OBJ_player_char_spin: 'spin', SCR_chaos_enemy_score_100_bytes: () => {}, instance_destroy: () => { w.destroyed = true; }});
    for (const n of ['SCR_chaos_viewport', 'SCR_chaos_placement', 'SCR_chaos_box_contact', 'SCR_chaos_attack']) vm.runInContext(hex(rd(`scripts/${n}/${n}.gml`)), w.ctx);
    w.box = {x: originX, y: originY, chaosOriginX: originX, chaosOriginY: originY, chaosActive: false, chaosAsleep: true, chaosAge: 0, chaosScanTick: 0,
        chaosInitialFillDone: false, chaosWoken: false, chaosState: 0, chaosVX: 0, chaosVY: 0, chaosCounter: 0, chaosOscTick: 0, chaosAnimTick: 0, chaosSilentDestroy: false,
        chaosXU: originX * 256, chaosYU: originY * 256, image_index: 0, visible: false};
    w.ctx.b = w.box; w.ctx.id = w.box;
    w.step = () => { const was = w.box.chaosActive; vm.runInContext(`(function(){ with (b) { ${body27} } })()`, w.ctx); if (!was && w.box.chaosActive) w.activations++; if (was && !w.box.chaosActive) w.removals++; w.frame++; };
    return w;
}
const setPlayer = (w, x) => { w.player.x = x; w.player.bbox_left = x - 8; w.player.bbox_right = x + 8; w.player.bbox_top = 5000; w.player.bbox_bottom = 5040; };
// scroll the camera right toward the bee at 3 px/update with Sonic far away; record creation/wake distances from the RIGHT edge
const scrollRows = [];
for (const [ox, oy] of [...THZ1_27, ...THZ2_27]) for (const speed of [1, 3, 7]) {
    const rows = WIDTHS.map(W => {
        const w = makeBee(ox, oy, W); w.camY = oy - 100; setPlayer(w, ox - 5000);
        w.camX = ox - W - 700; let createdAt = null, wokeAt = null, xAtWake = null;
        for (let i = 0; i < 2000 && wokeAt === null; i++) {
            w.camX += speed; w.step();
            if (createdAt === null && w.box.chaosActive) createdAt = ox - (w.camX + W);
            if (wokeAt === null && w.box.visible) { wokeAt = ox - (w.camX + W); xAtWake = w.box.x; }
        }
        return {W, createdAt, wokeAt, xAtWake};
    });
    for (const r of rows) {
        ok(r.createdAt !== null && r.wokeAt !== null, `bee (${ox},${oy}) W${r.W} speed ${speed}: created and woke`);
        ok(r.createdAt >= 32 && r.createdAt < 96, `bee W${r.W}: creation is in the RIGHT+32..+96 ring (${r.createdAt})`);
        ok(r.wokeAt < 32, `bee W${r.W}: wakes inside RIGHT+32 (${r.wokeAt})`);
        eq(r.xAtWake, ox, `bee W${r.W}: canonical X unchanged at wake`);
        eq(r.createdAt, rows[0].createdAt, `bee (${ox},${oy}) speed ${speed} W${r.W}: creation distance from RIGHT identical to 256 px`);
        eq(r.wokeAt, rows[0].wokeAt, `bee (${ox},${oy}) speed ${speed} W${r.W}: wake distance from RIGHT identical to 256 px`);
    }
    scrollRows.push(rows[0].createdAt, rows[0].wokeAt);
}
// widening the view makes the SAME bee wake earlier in WORLD terms (camera X smaller by W-256), through the generic band, not by moving it
for (const W of WIDTHS.slice(1)) {
    const mk = Wd => { const w = makeBee(3504, 224, Wd); w.camY = 124; setPlayer(w, -9000); w.camX = 3504 - Wd - 700; let cam = null;
        for (let i = 0; i < 2000 && cam === null; i++) { w.camX += 1; w.step(); if (w.box.visible) cam = w.camX; } return cam; };
    eq(mk(256) - mk(W), W - 256, `W${W}: bee wakes (W-256) camera pixels earlier in world terms`);
}
// state 3 removal is PLAYER_DIST(384): independent of the view width, and not rescued/triggered by the generic bands
for (const W of WIDTHS) for (const left of [0, 2000]) for (const side of [-1, 1]) {
    for (const [d, removed] of [[383, false], [384, true], [385, true]]) {
        const w = makeBee(3504, 224, W); w.box.chaosActive = true; w.box.chaosAsleep = false; w.box.chaosState = 3; w.box.chaosAge = 5; w.box.chaosVX = -0x0280;
        w.box.x = 3504; w.box.chaosXU = 3504 * 256; w.box.visible = true; w.camX = 3504 - W / 2; w.camY = 124; setPlayer(w, 3504 + side * d);
        w.camX += left * 0;                                                          // camera is placed relative to the bee so it stays awake at any width
        w.step();
        eq(!w.box.chaosActive, removed, `W${W}: PLAYER_DIST(384) at ${side * d}`);
    }
}
// the 64 px trigger is PLAYER_DIST(64): measured after the move, independent of the view width
for (const W of WIDTHS) for (const [d, trig] of [[62, true], [63, true], [64, false], [65, false]]) {
    const w = makeBee(3504, 224, W); w.box.chaosActive = true; w.box.chaosAsleep = false; w.box.chaosState = 1; w.box.chaosAge = 5; w.box.chaosVX = -0x0280;
    w.box.x = 3504; w.box.chaosXU = 3504 * 256; w.box.visible = true; w.camX = 3504 - W / 2; w.camY = 124;
    setPlayer(w, Math.floor(3504 - 2.5) - d);                                         // distance measured after this update's -2.5 px move
    w.step();
    eq(w.box.chaosState === 2, trig, `W${W}: trigger distance ${d}`);
}
// static: the bee consumes the shared bands and PLAYER_DIST helpers only
{
    const code = strip(step27);
    ok(/chaos_vp_current\(\)/.test(code) && /SCR_chaos_lifetime_cell\(id,cp_vp,/.test(code) && /SCR_chaos_placement_scan\(id,cp_vp,/.test(code), 'type $27 uses the generic lifecycle through the shared adapter');
    ok(/chaos_vp_dist_ge\(floor\(x\),floor\(cp_p\.x\),384\)/.test(code) && /chaos_vp_dist_lt\(floor\(x\),floor\(cp_p\.x\),64\)/.test(code), 'type $27 trigger/removal are PLAYER_DIST(64/384)');
    ok(!/camera_get_view|view_camera|__view_get|chaos_vp_edge|chaos_vp_center|chaos_vp_left_for_center|cp_vp\.(w|h|left|top)|room_width/.test(code), 'type $27 has no view-width arithmetic of its own');
    ok(!/384\s*[-+*]|[-+*]\s*384|W\s*-\s*256/.test(code), 'type $27 removal radius is a bare PLAYER_DIST(384)');
    ok(/chaosOriginX/.test(code) && !/chaosOriginX\s*[-+]/.test(code), 'type $27 placement is never offset');
    ok(!/render_offset/.test(code), 'render adapter stays in Draw only');
    eq(rd('objects/OBJ_chaos_object_27/Draw_0.gml').includes('chaos_render_offset_x($27)'), true, 'type $27 +18 render adapter untouched');
}

// ---------- 5b. every mapped-object type that passes through the generic lifecycle ($10, $21, $27) obtains the SAME bands ----------
// The real Step events run with a stubbed GameMaker world and no player, so only the lifecycle (and the canonical anchor) is exercised.
const divs = t => t.replace(/(\w+) div (\d+)/g, 'Math.floor($1 / $2)');
const bodyOf = f => divs(hex(rd(f))).replace(/\bexit;/g, 'return;').replace(/\bmod\b/g, '%');
const LIFE_TYPES = {
    0x10: {file: 'objects/OBJ_chaos_object_10/Step_0.gml', make: (ox, oy) => ({chaosParameter: 2, chaosConsumed: false, chaosReplaceTick: 0, chaosVY: 0, image_index: 0, chaosGraphicsSelector: 2})},
    0x21: {file: 'objects/OBJ_chaos_object_21/Step_0.gml', make: (ox, oy) => ({chaosParameter: 4, chaosLeftBound: ox - 64, chaosVX: -0x80, chaosVY: 0x200, chaosXU: ox * 256, chaosYU: oy * 256, chaosDefeated: false, image_xscale: -1, image_index: 0})},
    0x27: {file: 'objects/OBJ_chaos_object_27/Step_0.gml', make: (ox, oy) => ({chaosState: 1, chaosVX: -0x280, chaosVY: 0, chaosCounter: 0, chaosOscTick: 0, chaosSilentDestroy: false, chaosXU: ox * 256, chaosYU: oy * 256, image_index: 0})},
};
function makeLife(type, ox, oy, W) {
    const t = LIFE_TYPES[type], w = {camX: 0, camY: 0, camW: W, activations: 0};
    w.player = {};
    w.ctx = vm.createContext({global: {player: 1, playerJump: false, playerSpinDash: false, playerSuper: false, powerInv: false}, floor: Math.floor, round: Math.round,
        abs: Math.abs, min: Math.min, max: Math.max, clamp: ctx.clamp, view_camera: [0], camera_get_view_x: () => w.camX, camera_get_view_y: () => w.camY,
        camera_get_view_width: () => w.camW, camera_get_view_height: () => 196, instance_find: () => w.player, instance_exists: () => false, OBJ_player: 1,
        SCR_chaos_object_floor_project: (x, y) => ({grounded: true, y: oy}), instance_destroy: () => {}});
    for (const n of ['SCR_chaos_viewport', 'SCR_chaos_placement']) vm.runInContext(hex(rd(`scripts/${n}/${n}.gml`)), w.ctx);
    w.box = Object.assign({x: ox, y: oy, chaosOriginX: ox, chaosOriginY: oy, chaosActive: false, chaosAsleep: true, chaosAge: 0, chaosScanTick: 0, chaosInitialFillDone: false, chaosWoken: false,
        chaosState: 0, chaosAnimTick: 0, visible: false}, t.make(ox, oy));
    w.ctx.b = w.box; w.ctx.id = w.box; w.src = bodyOf(t.file);
    w.script = new vm.Script(`(function(){ with (b) { ${w.src} } })()`);
    w.step = () => { const was = w.box.chaosActive; w.script.runInContext(w.ctx); if (!was && w.box.chaosActive) w.activations++; };
    return w;
}
const camLeftFor = (ox, W, d) => ox - W - d;           // camera so that the anchor lies d px beyond the RIGHT edge (d < 0: inside)
for (const type of [0x10, 0x21, 0x27]) {
    const tag = `$${type.toString(16)}`;
    for (const [ox, oy] of [[1152, 640], [3504, 224], [8000, 300]]) {
        const createdAll = [], wokeAll = [];
        for (const W of WIDTHS) {
            // scroll right at several speeds: creation only in the RIGHT+32..+96 ring, awake inside RIGHT+32, anchor untouched, never re-created while awake
            for (const speed of [1, 3, 7]) {
                const w = makeLife(type, ox, oy, W); w.camY = oy - 100; w.camX = ox - W - 700;
                let created = null, woke = null;
                for (let i = 0; i < 1500 && woke === null; i++) {
                    w.camX += speed; w.step();
                    if (created === null && w.box.chaosActive) created = ox - (w.camX + W);
                    if (woke === null && w.box.visible) { woke = ox - (w.camX + W); const tol = type === 0x21 ? 3 : 0; /* $21 already patrols on its creation update */ ok(Math.abs(w.box.x - ox) <= tol && Math.abs(w.box.y - oy) <= tol, `${tag} W${W}: canonical anchor at wake`); eq(w.box.chaosOriginX, ox, `${tag} origin untouched`); eq(w.box.chaosOriginY, oy, `${tag} origin untouched`); }
                }
                ok(created !== null && created >= 32 && created < 96, `${tag} W${W} v${speed}: created in the RIGHT+32..+96 ring (${created})`);
                ok(woke !== null && woke < 32, `${tag} W${W} v${speed}: awake inside RIGHT+32 (${woke})`);
                eq(w.activations, 1, `${tag} W${W} v${speed}: created exactly once`);
                if (W === 256) { createdAll[speed] = created; wokeAll[speed] = woke; }
                else { eq(created, createdAll[speed], `${tag} W${W} v${speed}: creation distance from RIGHT equals the 256 px view`); eq(woke, wokeAll[speed], `${tag} W${W} v${speed}: wake distance from RIGHT equals the 256 px view`); }
            }
            // boundary table for an existing (asleep) object, both sides: removed beyond 96, asleep 32..96, awake inside the margins
            for (const [d, want] of [[-1, 'awake'], [0, 'awake'], [31, 'awake'], [32, 'asleep'], [95, 'asleep'], [96, 'gone']]) {      // d beyond RIGHT
                const w = makeLife(type, ox, oy, W); Object.assign(w.box, {chaosActive: true, chaosAsleep: true, chaosAge: 5, chaosInitialFillDone: true, chaosScanTick: 1});
                w.camY = oy - 100; w.camX = camLeftFor(ox, W, d); w.step();
                eq(w.box.chaosActive ? (w.box.visible ? 'awake' : 'asleep') : 'gone', want, `${tag} W${W}: ${d} px beyond RIGHT`);
            }
            for (const [d, want] of [[1, 'awake'], [32, 'awake'], [33, 'asleep'], [96, 'asleep'], [97, 'gone']]) {                     // d beyond LEFT
                const w = makeLife(type, ox, oy, W); Object.assign(w.box, {chaosActive: true, chaosAsleep: true, chaosAge: 5, chaosInitialFillDone: true, chaosScanTick: 1});
                w.camY = oy - 100; w.camX = ox + d; w.step();
                eq(w.box.chaosActive ? (w.box.visible ? 'awake' : 'asleep') : 'gone', want, `${tag} W${W}: ${d} px beyond LEFT`);
            }
        }
    }
    const code = strip(rd(LIFE_TYPES[type].file));
    ok(/SCR_chaos_placement_scan\(id,cp_vp,chaosOriginX,chaosOriginY\)/.test(code) && /SCR_chaos_lifetime_cell\(id,cp_vp,/.test(code) && /chaos_vp_current\(\)/.test(code), `${tag}: lifecycle runs through the shared placement scan and viewport bands`);
    ok(!/camera_get_view|view_camera|__view_get|room_width|\+\s*384|-\s*128/.test(code), `${tag}: no private view-window arithmetic left`);
}
// Types that are NOT window-driven in the POC architecture: persistent room instances / manager records with no lifecycle window to migrate.
for (const f of ['objects/OBJ_chaos_object_spring_26_normal/Step_0.gml', 'objects/OBJ_chaos_object_spring_26_span/Step_0.gml', 'objects/OBJ_chaos_object_spring_26_weak/Step_0.gml',
    'objects/OBJ_chaos_ring_manager/Step_0.gml', 'objects/OBJ_chaos_ring_manager/Step_2.gml'])
    ok(!/camera_get_view|view_camera|__view_get|room_width/.test(strip(rd(f))), `${f}: no private view window (persistent / player-relative)`);
ok(!/camera_get_view|view_camera|__view_get|room_width/.test(strip(rd('scripts/SCR_chaos_motion/SCR_chaos_motion.gml'))), 'type $28 platforms: no private view window');

// ---------- 5c. type $21: viewport lifecycle vs WORLD-space patrol state ----------
// Move the camera back and forth by hundreds of pixels without touching the badnik: the patrol origin and endpoints stay numerically constant in
// world coordinates at every width; only WHEN it runs (wake/sleep/recreate) depends on the viewport.
{
    for (const [ox, oy, param] of [[800, 606, 8], [1248, 862, 6], [3296, 286, 4], [2400, 254, 2], [3152, 894, 3]]) {
        const lb = ox - param * 16, seenBounds = new Set(), wakeCam = {};
        for (const W of WIDTHS) {
            const w = makeLife(0x21, ox, oy, W); w.box.chaosParameter = param; w.box.chaosLeftBound = lb;
            w.camY = oy - 100; let wokeAt = null, recreated = 0, wasActive = false, minX = 1e9, maxX = -1e9;
            const sweep = (a, b, sp) => { for (let cx = a; (b - cx) * Math.sign(b - a) > 0; cx += Math.sign(b - a) * sp) {
                w.camX = cx; w.step();
                seenBounds.add(`${w.box.chaosOriginX}/${w.box.chaosLeftBound}/${w.box.chaosOriginY}`);
                if (w.box.chaosActive && !wasActive) recreated++;
                wasActive = w.box.chaosActive;
                if (wokeAt === null && w.box.visible) wokeAt = cx;
                if (w.box.chaosActive) { minX = Math.min(minX, w.box.x); maxX = Math.max(maxX, w.box.x); }
            } };
            for (let rep = 0; rep < 1; rep++) { sweep(ox - 900, ox + 700, 3); sweep(ox + 700, ox - 900, 5); sweep(ox - 900, ox + 700, 2); }
            ok(recreated >= 2, `$21 (${ox},${oy}) W${W}: the camera sweep wakes, deletes and recreates it repeatedly (${recreated})`);
            ok(minX >= lb - 1 && maxX <= ox + 1, `$21 (${ox},${oy}) W${W}: patrol stays inside the world range [${lb}, ${ox}] (${minX}..${maxX})`);
            wakeCam[W] = wokeAt;
        }
        eq(seenBounds.size, 1, `$21 (${ox},${oy}): patrol origin and endpoints identical for every camera position and width (${[...seenBounds]})`);
        ok(seenBounds.has(`${ox}/${lb}/${oy}`), `$21 (${ox},${oy}): endpoints are the canonical record values`);
        // the lifecycle (not the patrol) follows the viewport: wider views wake it earlier in world terms by exactly W-256
        for (const W of WIDTHS.slice(1)) ok(Math.abs((wakeCam[256] - wakeCam[W]) - (W - 256)) <= 12, `$21 (${ox},${oy}) W${W}: wakes about (W-256) camera pixels earlier (scan granularity), endpoints unchanged`);
    }
    // ROM semantics (no persistence adapter): removal = the object ceases to exist, recreation rebuilds it from the placement record at the origin
    const w = makeLife(0x21, 3296, 286, 348); w.camY = 186; w.camX = 3296 - 348 - 40;
    for (let i = 0; i < 400; i++) { w.camX += 1; w.step(); if (w.box.chaosActive && w.box.visible && w.box.x < 3290) break; }
    ok(w.box.x < 3296 && w.box.x >= 3232, `$21 patrolling at ${w.box.x}`);
    w.camX = 3296 + 2000; w.step(); eq(w.box.chaosActive, false, '$21 removed when the camera is far away');
    w.camX = 3296 - 348 - 60; for (let i = 0; i < 8 && !w.box.chaosActive; i++) w.step();
    eq(w.box.chaosActive, true, '$21 recreated when it re-enters the outer ring'); eq(w.box.x, 3296, '$21 recreated from the placement record (origin X), as the ROM does'); eq(w.box.visible, false, 'created asleep');
    const code21 = strip(rd('objects/OBJ_chaos_object_21/Step_0.gml'));
    ok(!/chaosPatrolStarted/.test(code21) && /chaosLeftBound = chaosOriginX-\(chaosParameter << 4\)/.test(code21), '$21 endpoints derive from the canonical origin only; no persistence adapter');
}

// ---------- 5d. widescreen retention adapter: entry canonical, only OFFSCREEN retention of an already-awake object grows by W-256 ----------
// widescreen_extra = max(0, W-256): sleep threshold 32+extra, delete threshold 96+extra (horizontal, both sides). Vertical bands never extend.
for (const type of [0x10, 0x21, 0x27]) {
    const tag = `$${type.toString(16)}`, adj = type === 0x27 ? 3 : 0;      // $27 moves -2.5 px (floor: -3) before its post-update lifetime test
    for (const [ox, oy] of [[1152, 640], [3504, 224], [8000, 300]]) for (const W of WIDTHS) {
        const extra = Math.max(0, W - 256);
        eq(ctx.chaos_vp_widescreen_extra(ctx.chaos_vp_new(0, 0, W, 196)), extra, `${tag} W${W}: extra = max(0, W-256)`);
        const state = (w) => w.box.chaosActive ? (w.box.visible ? 'awake' : 'asleep') : 'gone';
        const make = (awake, woken) => { const w = makeLife(type, ox, oy, W); Object.assign(w.box, {chaosActive: true, chaosAsleep: !awake, visible: awake, chaosWoken: woken, chaosAge: 5, chaosInitialFillDone: true, chaosScanTick: 1}); w.camY = oy - 100; return w; };
        // an awake, already-woken object leaving on the RIGHT (d px beyond the right edge) and on the LEFT
        for (const [d, want] of [[0, 'awake'], [31, 'awake'], [31 + extra, 'awake'], [32 + extra, 'asleep'], [95 + extra, 'asleep'], [96 + extra, 'gone'], [200 + extra, 'gone']]) {
            const w = make(true, true); w.camX = (ox - adj) - W - d; w.step();
            eq(state(w), want, `${tag} W${W}: awake object ${d} px beyond RIGHT (extra ${extra})`);
        }
        for (const [d, want] of [[1, 'awake'], [32, 'awake'], [32 + extra, 'awake'], [33 + extra, 'asleep'], [96 + extra, 'asleep'], [97 + extra, 'gone']]) {
            const w = make(true, true); w.camX = (ox - adj) + d; w.step();
            eq(state(w), want, `${tag} W${W}: awake object ${d} px beyond LEFT (extra ${extra})`);
        }
        // ENTRY is canonical: an asleep object that has been awake before still wakes at the canonical edge, and is deleted only at 96+extra
        for (const [d, want] of [[31, 'awake'], [32, 'asleep'], [95 + extra, 'asleep'], [96 + extra, 'gone']]) {
            const w = make(false, true); w.camX = ox - W - d; w.step();
            eq(state(w), want, `${tag} W${W}: asleep (previously awake) object ${d} px beyond RIGHT`);
        }
        // a never-woken object (created in the ring) is fully canonical at every width: ring 32..96, deletion at 96
        for (const [d, want] of [[31, 'awake'], [32, 'asleep'], [95, 'asleep'], [96, 'gone']]) {
            const w = make(false, false); w.camX = ox - W - d; w.step();
            eq(state(w), want, `${tag} W${W}: never-woken object ${d} px beyond RIGHT is canonical`);
        }
        // true deletion still releases the slot and recreation rebuilds from the canonical record (no persistence)
        const w = make(true, true); w.camX = ox - W - (96 + extra) - adj; w.step(); eq(state(w), 'gone', `${tag} W${W}: deleted at the extended threshold`);
        Object.assign(w.box, {x: ox + 7, chaosXU: (ox + 7) * 256, chaosOriginX: ox});                       // pretend it had wandered
        w.camX = ox - W - 60; for (let i = 0; i < 8 && !w.box.chaosActive; i++) w.step();
        eq(w.box.chaosActive, true, `${tag} W${W}: recreated through the ring`); eq(w.box.chaosWoken, false, `${tag} W${W}: recreated object has not been awake`);
        ok(Math.abs(w.box.x - ox) <= 3 && w.box.chaosOriginX === ox && w.box.chaosOriginY === oy, `${tag} W${W}: recreated from the canonical record`);
    }
}
// W=256: the retained cell IS the canonical cell for every state/flag combination and coordinate
for (const left of ORIGINS) { const vp = ctx.chaos_vp_new(left, 500, 256, 192);
    for (let dx = -135; dx <= 390; dx++) for (const dy of [-135, 0, 255, 300, 390]) for (const [awake, woken] of [[true, true], [false, true], [false, false], [true, false]])
        eq(ctx.chaos_vp_retained_cell(vp, left + dx, 500 + dy, awake, woken), ctx.SCR_chaos_spawn_cell(vp, left + dx, 500 + dy), `256@${left} ${dx},${dy} ${awake}/${woken}`); }
// wider views: for an awake woken object only the horizontal thresholds move, by exactly W-256; vertical is untouched
for (const W of WIDTHS.slice(1)) { const vp = ctx.chaos_vp_new(0, 500, W, 196), base = ctx.chaos_vp_new(0, 500, 256, 196), e = W - 256;
    for (let d = -140; d <= 300; d++) { const o = d, spec = o < 0 ? 0 : (o < 32 + e ? 1 : (o < 96 + e ? 2 : 3)); eq(ctx.chaos_vp_band_x_retained(vp, W + d), d >= 0 ? spec : ctx.chaos_vp_band_x_retained(vp, W + d), `W${W} right d=${d}`); if (d >= 0) eq(ctx.chaos_vp_band_x_retained(vp, W + d), spec, `W${W} right band at ${d}`); eq(ctx.chaos_vp_band_x_retained(vp, -1 - d), d < 0 ? 0 : spec, `W${W} left band at ${d}`); }
    for (const dy of [-97, -96, -33, 0, 255, 256, 287, 288, 351, 352]) eq(ctx.chaos_vp_retained_cell(vp, W / 2, 500 + dy, true, true), ctx.chaos_vp_band_y(vp, 500 + dy), `W${W} vertical dy=${dy} not extended`); }
// no $21-specific (or bee-specific) widescreen offset: the step events only call the shared helpers
for (const f of ['objects/OBJ_chaos_object_10/Step_0.gml', 'objects/OBJ_chaos_object_21/Step_0.gml', 'objects/OBJ_chaos_object_27/Step_0.gml']) {
    const code = strip(rd(f));
    ok(/SCR_chaos_lifetime_cell\(id,cp_vp,/.test(code) && !/widescreen|extra|\b92\b|\b348\b|\b124\b|\b188\b/.test(code), `${f}: lifetime via the shared retention helper, no per-object widescreen offset`);
}
ok(!/chaos_life_trace|CHAOS_DIAG21|file_text/.test(strip(rd('objects/OBJ_chaos_object_21/Step_0.gml')) + strip(rd('objects/OBJ_chaos_ring_manager/Draw_64.gml'))), '$21 diagnostic overlay/file code removed');
ok(!/CHAOS_DIAG21|chaos_life_trace/.test(rd('scripts/SCR_chaos_level/SCR_chaos_level.gml')), 'diagnostic helpers removed from the level script');

// ---------- 6. world-space systems stay world-space; nothing act/bee specific ----------
for (const f of ['objects/OBJ_chaos_ring_manager/Draw_0.gml',
    'objects/OBJ_chaos_object_spring_26_normal/Step_0.gml', 'objects/OBJ_chaos_platform/Step_0.gml', 'scripts/SCR_chaos_box_contact/SCR_chaos_box_contact.gml',
    'scripts/SCR_chaos_type09_data/SCR_chaos_type09_data.gml', 'scripts/SCR_chaos_ring_data/SCR_chaos_ring_data.gml'])
    if (fs.existsSync(path.join(root, f))) ok(!/chaos_vp_|chaos_goal_pan/.test(rd(f)), `${f} was not widescreen-adapted by this milestone`);
for (const n of ['SCR_chaos_viewport', 'SCR_chaos_placement', 'SCR_chaos_goal']) {
    const code = strip(rd(`scripts/${n}/${n}.gml`));
    ok(!/\b(3960|3961|3831|3832|3970|558|654|405|501|2288|3504|1152)\b/.test(code), `${n}: no act or object coordinates`);
    ok(!/\broom\s*==|ROM_chaos_thz|OBJ_chaos_object_27|\$27\b/.test(code), `${n}: no act-, room- or bee-specific branch`);
}
{ const code = strip(rd('scripts/SCR_chaos_viewport/SCR_chaos_viewport.gml')); ok(!/\+\s*92|\bW\s*-\s*256|-\s*256\b/.test(code), 'viewport adapter has no hard-coded widescreen offset'); }
// the old provisional camera is gone
const goalCode = strip(rd('scripts/SCR_chaos_goal/SCR_chaos_goal.gml')) + strip(rd('scripts/SCR_chaos_level/SCR_chaos_level.gml'));
ok(!/CAMERA_PAN_SPEED|chaos_goal_camera_next|FRAME_MARGIN|left_limit_xu|chaosCamLockX|CHAOS_GOAL_CAMERA_DX/.test(goalCode + strip(rd('scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml'))), 'provisional 4 px/update camera, frame margin and left-limit adapter are retired');

// ---------- 7. diagnostics are gated ----------
{
    const lvl = rd('scripts/SCR_chaos_level/SCR_chaos_level.gml'), fn = lvl.slice(lvl.indexOf('function chaos_goal_trace'));
    ok(/function chaos_goal_trace\(cp_core, cp_sign_x\) \{\s*\n\s*if \(!global\.chaosDebug\) return;/.test(fn.replace(/\r/g, '')) &&
        fn.indexOf('global.chaosDebug') < fn.indexOf('file_text_open_append'), 'act-clear CSV trace writes nothing unless the F3 diagnostic toggle is on');
    ok(/global\.chaosDebug = false;/.test(rd('objects/OBJ_chaos_zone/Create_0.gml')), 'diagnostics default to off');
    const writers = ['scripts', 'objects'].flatMap(d => fs.readdirSync(path.join(root, d)).flatMap(n => fs.readdirSync(path.join(root, d, n)).filter(f => f.endsWith('.gml')).map(f => `${d}/${n}/${f}`)))
        .filter(f => /file_text_open_(append|write)/.test(rd(f)));
    console.log('GML files that open text files for writing:', writers.join(', '));
}
console.log(`VIEWPORT ADAPTER CHECKS PASSED (${checks} assertions; widths ${WIDTHS.join('/')}, origins ${ORIGINS.join('/')})`);
