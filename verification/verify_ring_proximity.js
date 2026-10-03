// Type $09 placed-ring collection geometry ($617E): strict anchor proximity abs(dx) < 12 AND abs(dy) < 12. Executes the shipped helper and the shipped
// ring-manager Step_2 event against the real THZ1/THZ2 $09 records. Ground truth: Research object-09.json controlled original-routine fixtures,
// mirrored in POC_notes/rom-cache/object-09-proximity.json (cross-checked against Research when it sits next to this repo).
// Layout (terrain) rings are a DIFFERENT source population in the ROM ($753E terrain top probe, not a proximity box) and are asserted unchanged here.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert'), cp = require('child_process');
const root = path.resolve(__dirname, '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const hex = t => t.replace(/(?<![\w"])\$([0-9A-Fa-f]+)/g, '0x$1').replace(/#macro (\w+) (\S+)/g, 'var $1 = $2;').replace(/\bmod\b/g, '%');
const strip = s => s.replace(/\/\/.*$/gm, '');
let checks = 0; const eq = (a, b, m) => { assert.strictEqual(a, b, m); checks++; }; const ok = (c, m) => { assert.ok(c, m); checks++; };

// ---------- ground truth ----------
const cache = JSON.parse(rd('POC_notes/rom-cache/object-09-proximity.json'));
const research = path.resolve(root, '..', 'sonic-chaos-reference-work', 'data', 'rom-cache', 'thz1', 'object-09.json');
if (fs.existsSync(research)) { const r = JSON.parse(fs.readFileSync(research, 'utf8'));
    assert.deepStrictEqual(cache.overlap_boundaries, r.controlled_original_routine_fixtures.overlap_boundaries); assert.deepStrictEqual(cache.interaction, r.interaction); checks += 2;
    console.log('cross-checked against', research); }
const base = vm.createContext({abs: Math.abs, floor: Math.floor});
vm.runInContext(hex(rd('scripts/SCR_chaos_box_contact/SCR_chaos_box_contact.gml')), base);
for (const f of cache.overlap_boundaries) eq(base.chaos_ring_proximity(1000 + f.dx, 500 + f.dy, 1000, 500), f.collected, `ROM fixture dx=${f.dx} dy=${f.dy}`);

// ---------- boundaries (both signs, all combinations) ----------
const hit = (dx, dy, rx = 1000, ry = 500) => base.chaos_ring_proximity(rx + dx, ry + dy, rx, ry);
for (const s of [1, -1]) {
    for (const d of [0, 10, 11]) { eq(hit(s * d, 0), true, `dx=${s * d}`); eq(hit(0, s * d), true, `dy=${s * d}`); }
    for (const d of [12, 13, 40]) { eq(hit(s * d, 0), false, `dx=${s * d}`); eq(hit(0, s * d), false, `dy=${s * d}`); }
    for (const t of [1, -1]) { eq(hit(s * 11, t * 11), true, 'corner 11,11'); eq(hit(s * 12, t * 11), false, '12,11'); eq(hit(s * 11, t * 12), false, '11,12'); eq(hit(s * 12, t * 12), false, '12,12'); }
}
let area = 0;
for (let dx = -16; dx <= 16; dx++) for (let dy = -16; dy <= 16; dy++) { const want = Math.abs(dx) <= 11 && Math.abs(dy) <= 11; eq(hit(dx, dy), want, `grid ${dx},${dy}`); if (want) area++; }
eq(area, 23 * 23, 'effective area is exactly 23 x 23');
for (const [rx, ry] of [[0, 0], [37, 9], [8000, 1000], [3124, 548]]) { eq(hit(11, -11, rx, ry), true); eq(hit(12, 0, rx, ry), false); }

// ---------- the shipped ring-manager Step_2 against real records ----------
const level = rd('scripts/SCR_chaos_level_thz2_data/SCR_chaos_level_thz2_data.gml');
const dataCtx = vm.createContext({array_create: (n, v) => Array(n).fill(v)});
vm.runInContext(hex(rd('scripts/SCR_chaos_type09_data/SCR_chaos_type09_data.gml')), dataCtx);
const thz1Records = dataCtx.SCR_chaos_type09_data();
const thz2fn = level.slice(level.indexOf('function SCR_chaos_thz2_type09()'), level.indexOf('function SCR_chaos_thz2_type09_hash'));
vm.runInContext(hex(thz2fn), dataCtx); const thz2Records = dataCtx.SCR_chaos_thz2_type09();
eq(thz1Records.length, 24); ok(thz2Records.length > 0 && thz2Records.every(r => r.length >= 5), 'THZ2 $09 records parsed');
const stepSrc = hex(rd('objects/OBJ_chaos_ring_manager/Step_2.gml')).replace(/\bexit;/g, 'return;');
function world(records, W, bbox, gmOffset) {
    const w = {ring: 0, stars: 0};
    w.player = {x: 0, y: 0, bbox_left: bbox[0], bbox_right: bbox[1], bbox_top: bbox[2], bbox_bottom: bbox[3], object_index: 'char'};
    w.core = {xu: 0, yu: 0}; w.player.chaosCore = w.core;
    w.mgr = {chaosRingSourceCount: 0, chaosRingRecords: [], chaosRingActive: [], chaosType09SourceCount: records.length, chaosType09Records: records,
        chaosType09Collected: records.map(() => false), chaosType09State: records.map(r => r[3] === 0 ? 1 : 3), chaosType09SparkleTimer: records.map(() => 0), chaosRingGlobalFrame: 0};
    w.ctx = vm.createContext({global: {ring: 0, music: 0}, floor: Math.floor, abs: Math.abs, max: Math.max, chaos_in_level: () => true, instance_exists: o => o === 1 || o === w.player, instance_find: () => w.player,
        OBJ_player: 1, OBJ_player_char: 'char', OBJ_player_char_spin: 'spin', variable_instance_exists: (o, k) => k in o, variable_struct_exists: (o, k) => k in o, SCR_chaos_core_attach: () => {}, instance_create: () => { w.stars++; },
        audio_is_playing: () => false, audio_stop_sound: () => {}, audio_play_sound: () => {}, SFX_ring: 0, OBJ_ring_stars: 0, camera_get_view_width: () => W});
    vm.runInContext(hex(rd('scripts/SCR_chaos_box_contact/SCR_chaos_box_contact.gml')), w.ctx);
    w.ctx.b = w.mgr; w.script = new vm.Script(`(function(){ with (b) { ${stepSrc} } })()`);
    w.place = (ax, ay) => { w.core.xu = ax * 256 + 77; w.core.yu = ay * 256 + 200; w.player.x = ax + gmOffset[0]; w.player.y = ay + gmOffset[1]; };   // GM instance position deliberately differs from the anchor
    w.step = () => w.script.runInContext(w.ctx);
    return w;
}
const BOXES = {tiny: [0, 1, 0, 1], normal: [-9, 9, -18, 18], huge: [-400, 400, -400, 400], far: [5000, 5100, 5000, 5100]};
let runs = 0;
for (const [recName, records] of [['THZ1', thz1Records], ['THZ2', thz2Records]]) for (const W of [256, 290, 348, 400, 640]) for (const [bn, bbox] of Object.entries(BOXES)) for (const gm of [[0, 0], [0, 18], [-30, 7]]) {
    for (const ri of [0, 7, records.length - 1]) {
        const rec = records[ri];
        for (const [dx, dy] of [[0, 0], [11, 0], [-11, 0], [0, 11], [0, -11], [11, 11], [-11, -11], [11, -11], [12, 0], [-12, 0], [0, 12], [0, -12], [12, 12], [13, 5], [5, 13], [20, 20]]) {
            const w = world(records, W, bbox, gm); w.mgr.chaosRingGlobalFrame = 0;          // even frame: both parameters testable
            w.place(rec[1] + dx, rec[2] + dy); w.step();
            const inside = Math.abs(dx) < 12 && Math.abs(dy) < 12;
            eq(w.mgr.chaosType09Collected[ri], inside, `${recName} W${W} mask ${bn} gm${gm} ring ${ri} (${dx},${dy})`);
            // one collection only: a second and third update over the ring adds nothing
            w.step(); w.step(); const expectedTotal = w.mgr.chaosType09Collected.filter(Boolean).length;
            eq(w.ctx.global.ring, expectedTotal, 'each ring is counted exactly once'); runs++;
        }
    }
}
// hidden parameter $01 only tests on even global frames; visible parameter $00 on every frame
{ const hiddenIdx = thz1Records.findIndex(r => r[3] === 1), visibleIdx = thz1Records.findIndex(r => r[3] === 0);
  const wH = world(thz1Records, 348, BOXES.normal, [0, 0]); wH.mgr.chaosRingGlobalFrame = 1; wH.place(thz1Records[hiddenIdx][1], thz1Records[hiddenIdx][2]); wH.step();
  eq(wH.mgr.chaosType09Collected[hiddenIdx], false, 'hidden ring is not tested on an odd frame'); wH.step(); eq(wH.mgr.chaosType09Collected[hiddenIdx], true, 'hidden ring collected on the next (even) frame');
  const wV = world(thz1Records, 348, BOXES.normal, [0, 0]); wV.mgr.chaosRingGlobalFrame = 1; wV.place(thz1Records[visibleIdx][1], thz1Records[visibleIdx][2]); wV.step();
  eq(wV.mgr.chaosType09Collected[visibleIdx], true, 'visible ring is tested on every frame'); eq(wV.mgr.chaosType09State[visibleIdx], 2, 'visible ring enters the sparkle state'); }
// rolling / jumping / spring state is not an input: the step reads only the anchors (static) and the result above is identical for every mask shape

// ---------- static guarantees ----------
const step = strip(rd('objects/OBJ_chaos_ring_manager/Step_2.gml'));
const t09 = step.slice(step.indexOf('var cp_have_anchor'));
ok(!/bbox_|place_meeting|sprite_|mask_index|cp_player\.x|cp_player\.y|camera_get_view|chaos_vp_|render_offset/.test(t09), '$09 collection reads no mask, GM position, view or render data');
ok(/chaos_ring_proximity\(cp_anchor_x,cp_anchor_y,cp_t09_record\[1\],cp_t09_record\[2\]\)/.test(t09) && /floor\(cp_player\.chaosCore\.xu\/256\)/.test(t09), '$09 uses the ROM anchors');
ok(/cp_t09_parameter == 1 && \(chaosRingGlobalFrame mod 2\) != 0/.test(t09), '$09 hidden-frame parity unchanged');
// terrain (layout) rings are a different ROM population and are deliberately unchanged
const terr = step.slice(0, step.indexOf('var cp_have_anchor'));
ok(/chaos_terrain_ring_at\(/.test(terr) && !/bbox_/.test(terr), 'terrain rings use the separate $753E point probe (verify_terrain_ring_probe.js), not this proximity test');
// canonical placements unchanged
const dirty = cp.spawnSync('git', ['diff', '--quiet', 'HEAD', '--', 'scripts/SCR_chaos_type09_data', 'scripts/SCR_chaos_ring_data', 'scripts/SCR_chaos_level_thz2_data'], {cwd: root}).status;
eq(dirty, 0, 'accepted ring placements and data unchanged');
const oldDraw=cp.spawnSync('git',['show','HEAD:objects/OBJ_chaos_ring_manager/Draw_0.gml'],{cwd:root}).stdout.toString().replace(/\r\n/g,'\n');
// The GPZ VRAM clock now supplies its canonical bounded four-frame selector;
// verify_gpz_presentation.js checks that clock and unchanged THZ timing directly.
// Normalize only this authorized selection change; lock all draw coordinates,
// type-$09 normal/sparkle selection and the rest of the accepted presentation.
const draw=rd('objects/OBJ_chaos_ring_manager/Draw_0.gml').replace('chaos_is_gpz() ? SPR_chaos_gpz_terrain_ring : SPR_ring','SPR_ring').replace('chaos_is_gpz() ? SPR_chaos_gpz_ring : SPR_chaos_object_09','SPR_chaos_object_09').replace('var cp_frame = floor(chaosRingFrame);','var cp_frame = floor(chaosRingFrame) mod max(1,sprite_get_number(SPR_ring));').replace(/\r\n/g,'\n');
eq(draw,oldDraw,'accepted draw coordinates and type-$09 animation unchanged outside GPZ terrain resource/selector integration');
console.log(`RING PROXIMITY CHECKS PASSED (${checks} assertions, ${runs} Step_2 runs, THZ1+THZ2 records, widths 256/290/348/400/640, 4 mask shapes, 3 GM offsets)`);
