// Canonical attack posture and THZ badnik contact (Research docs/player-attack-badnik-audit.md, 28485aa; POC_notes/rom-cache/player-attack-badnik.json).
// Executes the SHIPPED GML: core damage gate ($48BC), SCR_chaos_attack, the real type $21 / $27 Step events and the real adapter through verification/chaos_world_harness.js.
// Usage: node verification/verify_attack_posture.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const {loadHost} = require('./chaos_world_harness.js');
const root = path.resolve(__dirname, '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const strip = s => s.replace(/\/\/.*$/gm, '');
let checks = 0; const eq = (a, b, m) => { assert.strictEqual(a, b, m); checks++; }; const ok = (c, m) => { assert.ok(c, m); checks++; }; const deep = (a, b, m) => { assert.deepStrictEqual(a, b, m); checks++; };
const A = JSON.parse(rd('POC_notes/rom-cache/player-attack-badnik.json'));
const resFile = path.resolve(root, '..', 'sonic-chaos-reference-work', 'data', 'rom-cache', 'player-attack-badnik.json');
if (fs.existsSync(resFile)) { const r = JSON.parse(fs.readFileSync(resFile, 'utf8')); for (const k of Object.keys(A)) if (!['source', 'source_sha256', 'trimmed'].includes(k)) deep(A[k], r[k], `mirror ${k}`); console.log('mirror cross-checked against', resFile); }
const host = loadHost(null), ctx = host.ctx, g = host.g;

// ---------- 1. posture predicates ----------
{
    const c = ctx.SCR_cc_new(0, 0);
    for (let move = 0; move < 256; move++) { c.move = move; eq(ctx.chaos_attack_posture(c), (move & 2) !== 0, `posture ${move}`); eq(ctx.chaos_attack_or_invincible(c, true), true); eq(ctx.chaos_attack_or_invincible(c, false), (move & 2) !== 0); }
    // $5F3D gate table: converts iff overlap and (D532 == 6 or bit 1)
    for (const [d532, v] of Object.entries(A.gate_5f3d.by_d532)) for (const b1 of [false, true]) { c.move = b1 ? 2 : 0; eq(ctx.chaos_attack_or_invincible(c, parseInt(d532, 16) === 6), v[b1 ? 'converts_when_bit1_set' : 'converts_when_bit1_clear'][0], `5F3D ${d532} ${b1}`); }
}

// ---------- 2. resolvers against the Research regions ----------
const NIB = {1: 16, 2: 32, 4: 64, 8: 128};     // cache nibble ($D521 >> 4) -> D521 bit value
{
    const T = A.type27_sweep, conds = {standing_or_walking: [0, false], airborne_only_bit0: [1, false], attack_bit1_grounded: [2, false], jump_bits01: [3, false], invincible_D532_6: [0, true], invincible_and_bit1: [2, true]};
    let cells = 0;
    for (const [name, [move, inv]] of Object.entries(conds)) {
        const want = T.per_condition[name].cells_converted > 0;
        for (let dx = -25; dx <= 25; dx++) for (let dy = -22; dy <= 32; dy++) {
            const c = ctx.SCR_cc_new(1000 + dx, 500 + dy); c.move = move; c.stage_contact = 0;
            const r = ctx.chaos_type27_resolve(c, 1000, 500, inv), inBox = dx >= -17 && dx <= 17 && dy >= -14 && dy <= 24;
            eq(r !== 0, inBox, `$27 box ${dx},${dy}`); eq(r === 2, inBox && want, `$27 convert ${name} ${dx},${dy}`); eq(c.stage_contact, inBox ? 1 : 0, '$D520 staged on every overlap'); cells++;
            if (inBox) { const reg = Object.entries(T.D521_high_nibble_regions_after_callback).filter(([, v]) => dx >= v.dx_range[0] && dx <= v.dx_range[1] && dy >= v.dy_range[0] && dy <= v.dy_range[1]);
                ok(reg.some(([n]) => NIB[parseInt(n, 16)] === c.stage_nib), `$27 nibble ${dx},${dy}`); }
        }
    }
    const T21 = A.type21_sweep.per_condition, c21 = {standing_or_walking: [0, false], airborne_only_bit0: [1, false], attack_bit1_grounded: [2, false], jump_bits01: [3, false], invincible_D532_6: [0, true], invincible_and_bit1: [2, true]};
    for (const [name, [move, inv]] of Object.entries(c21)) {
        const want = T21[name];
        for (let dx = -22; dx <= 22; dx++) for (let dy = -30; dy <= 28; dy++) {
            const c = ctx.SCR_cc_new(1000 + dx, 500 + dy); c.move = move; const r = ctx.chaos_type21_resolve(c, 1000, 500, inv), inBox = Math.abs(dx) <= 19 && dy >= -26 && dy <= 24;
            const exp = !inBox ? 0 : dy <= -4 ? 1 : (want.converted.cells > 0 ? 2 : 3);
            eq(r, exp, `$21 ${name} ${dx},${dy}`); eq(c.stage_request, exp === 3 ? 255 : 0); cells++;
        }
        eq(want.stomp_bounce.dy[1], -4); eq(want.stomp_bounce.dy[0], -26);
    }
    // hurt / dying player: $6328 reports no contact at all
    const h = ctx.SCR_cc_new(1000, 500); h.move = 64 | 2; eq(ctx.chaos_type27_resolve(h, 1000, 500, false), 0); eq(ctx.chaos_type21_resolve(h, 1000, 500, false), 0);
    console.log(`resolvers: ${cells} grid cells`);
}

// ---------- 3. $48BC against an independent statement of the Research priority list (6,144-case input space) ----------
{
    const model = (m) => {                                    // returns [outcome, vy]
        if (m.move & 128) return ['inv', m.vy];                    // countdown only
        if (m.move & 64) return ['none', m.vy];
        if (m.immune) return ['none', m.vy];
        const hv = m.rings === 0 ? -1280 : -1024;                  // $48F7: death $FB00, hurt $FC00
        if (m.req) return ['hurt', hv];
        if (!m.contact) return ['none', m.vy];
        if (m.move & 2) { if (m.nib & 16) return ['none', m.state === 9 ? m.vy : 128]; if (m.nib & 32) return ['none', -768]; return ['none', m.vy]; }
        return ['hurt', hv];
    };
    let n = 0;
    for (const move of [0, 1, 2, 3, 64, 65, 66, 128, 129, 130, 192, 193, 194, 195]) for (const immune of [false, true]) for (const contact of [0, 1]) for (const req of [0, 255]) for (const nib of [0, 16, 32, 64, 128]) for (const state of [5, 9]) for (const rings of [0, 5]) {
        const c = ctx.SCR_cc_new(0, 0); Object.assign(c, {move, immune, contact, contact_nib: nib, damage_request: req, state, next: state, vy: 333, rings, invuln: 5});
        const hurt = ctx.SCR_cc_damage_gate(c), want = model({move, immune, contact, nib, req, state, vy: 333, rings});
        eq(hurt ? 'hurt' : 'none', want[0] === 'inv' ? 'none' : want[0], `gate ${move} ${immune} ${contact} ${req} ${nib} ${state}`);
        eq(c.vy, want[1], `gate vy ${move} ${immune} ${contact} ${req} ${nib} ${state}`); n++;
    }
    // rebound details: above clears the floor flag and sets airborne; the attack bit persists; state unchanged
    const c = ctx.SCR_cc_new(0, 0); Object.assign(c, {move: 2, contact: 1, contact_nib: 32, vy: 900, bg: 2, contacts: 2, state: 10, next: 10}); ctx.SCR_cc_damage_gate(c);
    eq(c.vy, -768); eq(c.bg & 2, 0); eq(c.move & 3, 3); eq(c.state, 10);
    console.log(`$48BC: ${n} combinations`);
}

// ---------- 4. attack-bit lifetime through the real core (Research attack matrix) ----------
{
    g.chaosTileIds = host.ids1; g.chaosBrokenCells = [];
    const bit = c => (c.move & 2) !== 0;
    const run = (c, n, held = {}) => { const out = []; for (let i = 0; i < n; i++) { c.held = (held.right ? 8 : 0) | (held.down ? 2 : 0); c.pressed = held.jump && i === 0 ? 16 : 0; ctx.SCR_cc_tick(c); out.push([c.state, c.move & 3, bit(c)]); } return out; };
    const mk = (state, extra = {}) => { const c = ctx.SCR_cc_new(1312, 846); Object.assign(c, {state, next: state, bg: 2, contacts: 2, previous: 0x81, move: 0, maximum: 1024}, extra); return c; };
    for (const [name, st, vx] of [['standing', 1, 0], ['walking', 5, 400], ['running', 6, 1100]]) { const c = mk(st, {vx}); const t = run(c, 8, {right: vx > 0}); ok(t.every(r => !r[2]), `${name}: not attacking`); }
    // ordinary jump: bit 1 set at launch, kept through ascent, apex and descent until landing; airborne throughout
    { const c = mk(5, {vx: 300}); const t = run(c, 1, {jump: true, right: true}); let all = t, landed = -1;
      for (let i = 0; i < 120 && landed < 0; i++) { const r = run(c, 1, {right: true})[0]; all.push(r); if ((c.move & 1) === 0) landed = i; }
      const air = all.slice(0, all.findIndex(r => (r[1] & 1) === 0 && all.indexOf(r) > 0) );
      ok(landed > 30 && all.slice(0, landed - 1).every(r => r[2] && (r[1] & 1)), 'jump ascending / apex / descending: bit 1 set on every airborne update (vy -1088 .. positive)'); ok(!bit(c), 'cleared at landing'); }
    // upright spring $0B clears bit 1 and stays clear through apex and the fall ($0E)
    { const c = mk(5); ctx.SCR_cc_spring(c, 9, 0x30); ok(c.next === 11 && !bit(c) && (c.move & 1), 'upright spring: airborne, attack clear');
      const t = run(c, 160); ok(t.some(r => r[0] === 14) && t.slice(0, 120).every(r => !r[2] || r[1] === 0), 'spring flight and the $0E fall never attack'); }
    // ledge / apex fall $0E from a jump state keeps nothing; from walking clears
    { const c = mk(5, {move: 3}); ctx.SCR_cc_fall(c); ok(!bit(c) && c.next === 14, '$0E fall clears bit 1'); const j = mk(10, {move: 3, bg: 0, contacts: 0}); ctx.SCR_cc_fall(j); ok(bit(j), 'a fall request in state $0A is ignored ($463C): the jump stays attacking'); }
    // diagonal spring $1C attacks; horizontal spring (state 9) attacks; rolling
    { const c = mk(5); ctx.SCR_cc_spring(c, 20, 0x36); ok(c.next === 28 && bit(c), 'diagonal spring: attacking'); const h = mk(5); ctx.SCR_cc_spring(h, 1, 0); ok(h.next === 9 && bit(h), 'horizontal spring: rolling, attacking'); const r = mk(5, {vx: 900}); r.held = 2; ctx.SCR_cc_roll(r); ok(bit(r) && r.next === 9, 'rolling attacks'); }
}

// ---------- 5. contact scenarios through the real adapter and the shipped Step events ----------
const SPOT = [1312, 846];                                    // flat ground of the act-1 layout (the moving-spike walk replays use it)
function scenario(kind, o) {
    host.reset(); g.chaosTileIds = host.ids1; g.ring = 5; g.powerInv = !!o.inv; g.playerJump = o.legacyJump === undefined ? false : o.legacyJump;
    const grounded = !!o.grounded, vy = o.vy === undefined ? 0 : o.vy, gr = (o.state === 11) ? 24 : 48;
    const py = grounded ? SPOT[1] : (o.py ?? 800);
    const p = host.newPlayer(SPOT[0], py, grounded ? {state: o.state, move: o.move, bg: 2, contacts: 2, previous: 0x81, vx: o.vx || 0} : {state: o.state, move: o.move, vy: vy - gr, vx: o.vx || 0});
    if (!grounded) { p.chaosCore.yu = py * 256 - vy; p.y = p.chaosCore.yu / 256 + p.chaosAnchorOffset; p.chaosCoreLastY = p.y; }
    if (o.next) p.chaosCore.next = o.next;
    if (o.keep) Object.assign(p.chaosCore, o.keep);
    const obj = host.newInstance(kind === 27 ? 'OBJ_chaos_object_27' : 'OBJ_chaos_object_21', SPOT[0] + (o.dx || 0), py - (o.dy || 0));
    Object.assign(obj, {chaosActive: true, chaosAsleep: false, chaosWoken: true, chaosAge: 5, chaosScanTick: 1, chaosInitialFillDone: true});
    if (kind === 27) Object.assign(obj, {chaosState: 1, chaosVX: -0x280, chaosVY: 0, chaosXU: obj.x * 256, chaosYU: obj.y * 256});
    else Object.assign(obj, {chaosState: 3, chaosVX: -0x80, chaosVY: 0, chaosParameter: 0, chaosLeftBound: obj.x - 400, chaosOriginX: obj.x + 40, chaosOriginY: obj.y, chaosXU: obj.x * 256, chaosYU: obj.y * 256});
    // Contact-only matrix: supply a supported object pose; airborne floor-loss is checked elsewhere.
    const savedFloor=host.ctx.SCR_chaos_object_floor_project;
    if(kind===21)host.ctx.SCR_chaos_object_floor_project=(x,y)=>({grounded:true,y});
    obj.stepPath = `objects/OBJ_chaos_object_${kind}/Step_0.gml`; host.world.badniks.push(obj);
    host.world.camHint = null; const rec = [];
    for (let i = 0; i < 3; i++) { host.frame({}); rec.push({vy: p.chaosCore.vy, next: p.chaosCore.next, move: p.chaosCore.move, ring: g.ring, destroyed: !!obj.destroyed, dead: !!p.dead, req: p.chaosCore.damage_request, contact: p.chaosCore.contact}); }
    host.ctx.SCR_chaos_object_floor_project=savedFloor;
    return {p, obj, rec};
}
{
    // $27 relative offsets: dy = playerY - objectY (so the bee is at py - dy): above = -14..-1, below = +7..+24
    const att = {jump: {state: 10, move: 3, vy: -300, label: 'jump ascending'}, apex: {state: 10, move: 3, vy: 0, label: 'jump apex'}, desc: {state: 10, move: 3, vy: 400, label: 'jump descending'},
                 roll: {grounded: true, state: 9, move: 2, vx: 600, label: 'rolling (on the ground)'}, diag: {state: 28, move: 3, vy: -300, label: 'diagonal spring $1C'}};
    const non = {spring: {state: 11, move: 1, vy: 100, label: 'upright spring $0B'}, fall: {state: 14, move: 1, vy: 100, label: 'falling $0E'}, fallup: {state: 14, move: 1, vy: -200, label: '$0E rising'}};
    // grounded
    for (const [label, st, mv, vx] of [['standing', 1, 0, 0], ['walking', 5, 0, 300], ['running', 6, 0, 1100]]) {
        const s = scenario(27, {grounded: true, state: st, move: mv, vx, dx: 6, dy: 0, legacyJump: true});          // legacy predicate true: must not matter
        ok(!s.rec[0].destroyed && s.rec[0].ring === 5, `${label} into $27: overlap update leaves the bee and Sonic unharmed`); ok(s.rec[1].ring === 0 || s.rec[1].dead, `${label} into $27: hurt in the FOLLOWING player update ($48BC via $D520)`); ok(!s.rec[1].destroyed, `${label}: bee survives`);
    }
    const sr = scenario(27, {grounded: true, state: 9, move: 2, bg: 2, vx: 900, dx: 6, dy: 0, legacyJump: false});
    ok(sr.rec[0].destroyed && sr.rec[2].ring === 5, 'rolling (grounded, bit 1) defeats the bee, no damage, even with global.playerJump false');
    for (const [k, a] of Object.entries(att)) {
        for (const [dir, dy, vyExp] of [['above', -8, -768], ['below', 15, 128], ['side', 0, null]]) {
            const s = scenario(27, Object.assign({}, a, {dx: 4, dy, legacyJump: false}));
            const defeated = s.rec[0].destroyed; ok(defeated, `${a.label} ${dir}: bee defeated`);
            const vyBefore = null; ok(s.rec[1].ring === 5 && !s.rec[1].dead, `${a.label} ${dir}: no damage`);
            if (dir === 'above') eq(s.rec[1].vy, -768, `${a.label} above: Y speed -3.0 applied in the following update`);
            if (dir === 'below') { if (a.state === 9) ok(s.rec[1].vy !== 128, 'state 9: no +0.5'); else eq(s.rec[1].vy, 128, `${a.label} below: +0.5`); }
            if (dir === 'side') ok(s.rec[1].vy !== -768 && s.rec[1].vy !== 128, `${a.label} side: no rebound`);
        }
    }
    // THE WINDOWS BEE BUG: airborne but not attacking (upright spring $0B, falling $0E) must not defeat the bee merely because Sonic is airborne
    for (const [k, a] of Object.entries(non)) for (const [dir, dy] of [['above', -8], ['side', 0], ['below', 15]]) {
        const s = scenario(27, Object.assign({}, a, {dx: 4, dy, legacyJump: true}));      // global.playerJump deliberately TRUE
        ok(!s.rec[0].destroyed && !s.rec[1].destroyed, `${a.label} ${dir}: bee NOT defeated although Sonic is airborne (playerJump true)`);
        ok(s.rec[0].ring === 5 && (s.rec[1].ring === 0 || s.rec[1].dead), `${a.label} ${dir}: Sonic is hurt in the next update (emulated original: rings -> 0)`);
    }
    // invincibility D532 == 6: any state converts, no damage, no rebound
    for (const st of [{state: 14, move: 1, vy: 100}, {state: 5, move: 0, grounded: true, vx: 300}]) {
        const s = scenario(27, Object.assign({}, st, {inv: true, dx: 4, dy: -8, legacyJump: false}));
        ok(s.rec[0].destroyed && s.rec[2].ring === 5 && !s.rec[1].dead, 'invincible: converted, not hurt'); ok(s.rec[1].vy !== -768 || st.grounded, 'invincible: $48BC clears the contact before any rebound');
    }
    // one-update timing: nothing happens to the player in the overlap update; the gate runs in the next
    { const s = scenario(27, {state: 14, move: 1, vy: 100, dx: 4, dy: -8}); ok(s.rec[0].ring === 5 && s.rec[0].contact === 1 && s.rec[1].ring === 0 && s.rec[1].contact === 0, 'overlap in update n raises $D520 after the player pass, $48BC consumes it in update n+1'); }
}
{
    // type $21
    const stomp = (o) => scenario(21, Object.assign({dx: 3, dy: -12}, o));
    for (const [label, o] of [['walking', {grounded: false, state: 14, move: 1, vy: 300}], ['jump', {state: 10, move: 3, vy: 300}], ['upright spring', {state: 11, move: 1, vy: 300}], ['rolling', {state: 9, move: 2, vy: 300}]]) {
        const s = stomp(Object.assign({legacyJump: false}, o)); ok(!s.rec[0].destroyed, `${label}: $21 survives the top stomp`);
        eq(s.rec[0].vy, -1728, `${label}: stomp bounce -6.75`); eq(s.rec[0].next, 11, `${label}: state $0B`); eq(s.rec[0].move & 2, 0, `${label}: attack posture cleared by the stomp`); eq(s.rec[2].ring, 5, `${label}: no damage`);
    }
    // the stomp does not set the legacy attack predicate
    { const s = stomp({state: 10, move: 3, vy: 300, legacyJump: false}); eq(host.g.chaosAttackPosture, false, 'after the stomp Sonic is not attacking'); }
    // side / low contact
    for (const [label, o] of [['jump', {state: 10, move: 3, vy: 0}], ['rolling', {state: 9, move: 2, vy: 0}], ['diagonal $1C', {state: 28, move: 3, vy: -300}]]) {
        const s = scenario(21, Object.assign({dx: 4, dy: 0, legacyJump: false}, o)); ok(s.rec[0].destroyed, `${label} side: $21 defeated`); eq(s.rec[1].ring, 5, `${label}: no damage`); ok(s.rec[1].vy !== -768 && s.rec[1].vy >= o.vy, `${label}: no rebound`);
    }
    for (const [label, o] of [['standing', {grounded: true, state: 1, move: 0}], ['walking', {grounded: true, state: 5, move: 0, vx: 300}], ['upright spring flight $0B', {state: 11, move: 1, vy: 0}], ['falling $0E', {state: 14, move: 1, vy: 0}]]) {
        const s = scenario(21, Object.assign({dx: 4, dy: 0, legacyJump: true}, o)); ok(!s.rec[0].destroyed && !s.rec[1].destroyed, `${label} side: $21 survives (playerJump true is irrelevant)`);
        ok(s.rec[0].ring === 5 && (s.rec[1].ring === 0 || s.rec[1].dead), `${label}: hurt in the following update`);
    }
    { const s = scenario(21, {state: 14, move: 1, vy: 0, dx: 4, dy: 0, inv: true}); ok(s.rec[0].destroyed && s.rec[2].ring === 5, 'invincible side contact defeats $21'); }
}

// ---------- 6. consumers: no enemy decision reads global.playerJump ----------
{
    const code = f => strip(rd(f));
    for (const f of ['objects/OBJ_chaos_object_27/Step_0.gml', 'objects/OBJ_chaos_object_21/Step_0.gml', 'objects/OBJ_chaos_object_10/Step_0.gml', 'scripts/SCR_chaos_attack/SCR_chaos_attack.gml'])
        ok(!/playerJump|playerSpinDash|playerSuper|OBJ_player_char_spin/.test(code(f)), `${f}: no legacy attack predicate`);
    ok(!/SCR_physics_jump_objects/.test(code('objects/OBJ_chaos_object_21/Step_0.gml')), '$21 defeat no longer calls SCR_physics_jump_objects');
    const ad = code('scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml'), top = ad.slice(ad.indexOf('function SCR_chaos_type21_top_bounce'), ad.indexOf('function SCR_chaos_enemy_score_100_bytes'));
    ok(!/playerJump\s*=\s*true/.test(top) && /playerJumpSpring\s*=\s*true/.test(top), 'the stomp keeps spring-flight physics but sets no attack predicate');
    ok(/chaos_attack_posture\(cp_c\)/.test(code('objects/OBJ_chaos_object_10/Step_0.gml')) && !/powerInv/.test(code('objects/OBJ_chaos_object_10/Step_0.gml')), 'monitor: attack bit only, no invincibility override');
    ok(/chaos_ordinary_enemy_resolve\(cp_p\.chaosCore,floor\(x\),floor\(y\),global\.powerInv,chaosEnemyEX,chaosEnemyEY\)/.test(code('objects/OBJ_chaos_object_27/Step_0.gml')), '$27 uses the canonical resolver with D532 == 6 as powerInv');
    ok(/chaos_attack_or_invincible\(chaosCore,global\.powerInv\)/.test(ad) && !/place_meeting\(x,y,OBJ_badniks\)[^\n]*playerJump/.test(ad), 'sample badnik contact keys on the canonical bit and the shared request path');
    ok(!/SCR_chaos_apply_hazard_damage/.test(code('objects/OBJ_chaos_object_21/Step_0.gml') + code('objects/OBJ_chaos_object_27/Step_0.gml')), 'enemy contact uses the shared $48BC path, not the legacy hazard function');
    ok(/global\.playerJump\s*=\s*!cp_state11/.test(ad), 'global.playerJump keeps its airborne/physics definition for genuine airborne consumers');
    ok(/global\.playerJump == false/.test(rd('objects/OBJ_chaos_controls/Step_0.gml')), 'checkpoint gate (airborne consumer) keeps playerJump');
    const phys = cp => cp; for (const f of ['scripts/SCR_physics_speed/SCR_physics_speed.gml', 'scripts/SCR_physics_ramp/SCR_physics_ramp.gml', 'scripts/SCR_physics_ramp_spin/SCR_physics_ramp_spin.gml'])
        eq(require('child_process').spawnSync('git', ['diff', '--quiet', 'HEAD', '--', f], {cwd: root}).status, 0, `${f} (airborne/physics consumer) untouched`);
}
console.log(`ATTACK POSTURE CHECKS PASSED (${checks} assertions)`);
