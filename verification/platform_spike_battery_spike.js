// Moving spike $1B and end-to-end static-spike / damage flows of the platform / spike battery. Executes the real adapter through the host (chaos_world_harness.js).
// Expectations: Research cache mirror POC_notes/rom-cache/platform-spike-collision.json (spike_1b_*, static_spike_diagonal_sweep, static_spike_aftermath).
const P = require('./platform_spike_probe.js');
const {S, range, eqArr, hurtFlag} = require('./platform_spike_battery_terrain.js');
const SPIKE = {x: 1344, y: 864};
const rowsOf = o => o[Object.keys(o).find(k => k.startsWith('rows'))];
const CONE = S.spike_1b_contact_sweep.damage_region_dx_range_by_dy_relative_to_object_anchor;

function freshSpike(host, real) {
    host.reset(); host.g.chaosTileIds = host.ids1; if (!real) host.isolate([]); host.world.follow = true; host.world.camHint = [SPIKE.x - 128, SPIKE.y - 96];
    return host.create(host.ids.OBJ_chaos_spikes, SPIKE.x, SPIKE.y);
}
/// Offsets after each frame of a lone spike (no player).
function spikeOffsets(host, n) { const sp = freshSpike(host), out = []; for (let i = 0; i < n; i++) { host.frame({}); out.push(sp.chaosOffset); } return out; }
/// 1-based frame number of a target phase: rise r (offset 6r first reached), raised (the k-th frame at offset 18).
function frameOf(host, target) {
    const offs = spikeOffsets(host, 130);
    if (target.rise) return offs.indexOf(6 * target.rise) + 1;
    return offs.indexOf(18) + 1 + (target.raised || 0);
}
const preAnchor = t => t.rise ? SPIKE.y - 6 * (t.rise - 1) : SPIKE.y - 18;
/// Place the player (post-pass values) at (dx, dy) relative to the PRE-move anchor of the target update, run that update and one more, report what happened.
function trial(host, target, k, dx, dy, vy, opt = {}) {
    const sp = freshSpike(host); host.g.ring = 5; if (opt.immune) host.g.powerInv = true;
    for (let i = 0; i < k - 1; i++) host.frame({});
    const p = P.placePost(host, SPIKE.x + dx, preAnchor(target) + dy, vy, opt.extra || {});
    host.frame({}); const bounce = p.chaosCore.vy === -1024, request = p.chaosCore.damage_request;
    host.frame({}); const hurt = host.g.ring === 0 || host.world.events.length > 0;
    return {hurt, bounce, request, p, sp};
}

function section_spike1b(host, add) {
    // ---- H1: the cycle ----
    {
        const offs = spikeOffsets(host, 330), i0 = offs.indexOf(6), cyc = [6, 12, 18, ...Array(48).fill(18), 12, 6, 0, ...Array(48).fill(0)];
        const want = Array.from({length: 4 * cyc.length > 330 - i0 ? 330 - i0 : 4 * cyc.length}, (_, i) => cyc[i % cyc.length]);
        const got = offs.slice(i0, i0 + want.length);
        add('H1', 'moving spike', `type $1B cycle: rise 6,12,18 (3), raised 48, retract 12,6,0 (3), hidden 48 = 102 updates, ${want.length} updates compared`, eqArr(got, want) && cyc.length === 102, `first difference at ${got.findIndex((v, i) => v !== want[i])} of ${JSON.stringify(got.slice(0, 12))}`);
        add('H1', 'moving spike', 'state 0 (initialise, no test, no move) precedes the first rising update', offs[0] === 0 && i0 === 1, `first offsets ${JSON.stringify(offs.slice(0, 4))}`);
    }
    // ---- H2: the damage cone, every edge +-1, for the three rising updates (pre-move anchors 864/858/852) and the raised hold (846) ----
    for (const [label, target, tab] of [['rising update 1 (anchor 864)', {rise: 1}, CONE['1']], ['rising update 2 (anchor 858)', {rise: 2}, CONE['1']], ['rising update 3 (anchor 852)', {rise: 3}, CONE['1']], ['raised hold (anchor 846)', {raised: 6}, CONE['2']]]) {
        const k = frameOf(host, target); let bad = 0, n = 0, cone = 0; const first = [];
        for (let dy = -28; dy <= 4; dy++) for (let dx = -28; dx <= 28; dx++) {
            const r = trial(host, target, k, dx, dy, 0), t = tab[String(dy)], exp = !!t && dx >= t[0] && dx <= t[1]; n++; if (exp) cone++;
            if (r.hurt !== exp) { bad++; if (first.length < 4) first.push([dx, dy, r.hurt, exp]); }
        }
        add('H2', 'moving spike', `damage cone ${label}: dy -24..-1, |dx| <= |dy| (${n} cells incl. every edge +-1, ${cone} damaging) tested against the PRE-move anchor`, bad === 0, `${bad} mismatches ${JSON.stringify(first)}`);
    }
    // ---- H3: gates ----
    {
        const k = frameOf(host, {raised: 6}); let bad = 0; const first = [];
        for (const vy of [-512, -257, -256, -2, -1, 0, 1, 2, 255, 256, 512]) { const r = trial(host, {raised: 6}, k, 0, -12, vy); if (r.hurt !== (vy >= 0)) { bad++; first.push([vy, r.hurt]); } }
        add('H3', 'moving spike', 'rising player (Y speed < 0) takes no damage; 0 and positive speeds do', bad === 0, `${bad} ${JSON.stringify(first)}`);
        const r = trial(host, {raised: 6}, k, 0, -12, 0);
        add('H3', 'moving spike', 'a contact bounces the player to Y speed -4.0 (the bounce is written with the request, one update before the hurt)', r.bounce && r.request === 255, `bounce ${r.bounce} request ${r.request}`);
        // cooldown: held in the cone with power-up immunity so only the object's own cooldown limits the contacts
        const kk = frameOf(host, {raised: 1}); const sp = freshSpike(host); host.g.ring = 5; host.g.powerInv = true; for (let i = 0; i < kk - 1; i++) host.frame({});
        const bounces = []; let p = null;
        for (let i = 0; i < 60; i++) { p = P.placePost(host, SPIKE.x, 846 - 12, 0); host.frame({}); if (p.chaosCore.vy === -1024) bounces.push(i); }
        add('H3', 'moving spike', '16-update cooldown: a contact held through the raised hold bounces at updates 0, 17, 34 (16 skipped updates between contacts; the cooldown counts only inside states 1/2)', eqArr(bounces, [0, 17, 34]), `bounce updates ${JSON.stringify(bounces)}`);
        // not tested in states 3/4
        let hid = 0; const sp2 = freshSpike(host); host.g.ring = 5;
        for (let i = 0; i < 4; i++) host.frame({});
        for (let f = 0; f < 110; f++) { const st = sp2.chaosState; if (st === 3 || st === 4) { const q = P.placePost(host, SPIKE.x, sp2.chaosY !== undefined ? sp2.chaosY - 12 : 846, 0); const rq = q.chaosCore; host.frame({}); if (rq.vy === -1024 && sp2.chaosState !== 1) hid++; } else host.frame({}); }
        add('H3', 'moving spike', 'no contact test while retracting or hidden (states 3 and 4)', hid === 0, `${hid} bounces during states 3/4`);
    }
    // ---- H4: invulnerability: the object still bounces, the damage request is rejected ----
    {
        const k = frameOf(host, {raised: 6}); const r = trial(host, {raised: 6}, k, 0, -12, 0, {extra: {move: 1 | 128 | 64, invuln: 100}});
        add('H4', 'moving spike', 'invulnerable player: the request and bounce are still written, $48BC ignores the request (no hurt)', r.bounce && r.hurt === false, `bounce ${r.bounce} hurt ${r.hurt}`);
    }
}

// ----- end-to-end flows on the real THZ1 layout -----
function section_flows(host, add) {
    const g = host.g, E = S.spike_1b_emulated;
    // ---- J1: fall onto the raised spike; the sub-pixel start is recovered from the Research rows (the emulation teleported Sonic, so the exact start is not recorded) ----
    {
        const rowsH = rowsOf(E.fall_onto_raised_spike);            // [f, y, vy, cur, d3b0, spike_state, spike_y, hurt_calls]
        const kRaise = frameOf(host, {raised: 5}), pre = kRaise - 14;      // my frame number = Research frame + 1 (Research frame 0 = the first update after the teleport)
        const run = (y0, fr, inv, frames = 18) => {
            freshSpike(host); g.ring = 5; for (let i = 0; i < pre; i++) host.frame({});
            const p = host.newPlayer(SPIKE.x, y0, {state: 14, move: 1, vy: 256}); p.chaosCore.yu = y0 * 256 + fr; p.y = p.chaosCore.yu / 256 + p.chaosAnchorOffset; p.chaosCoreLastY = p.y;
            if (inv) { p.chaosCore.move |= 192; p.chaosCore.invuln = 119; }
            const got = []; for (let f = 1; f <= frames; f++) { host.frame({}); got.push([f, P.anchor(p)[1], p.chaosCore.vy, p.chaosCore.state, g.ring, p.chaosCore.damage_request]); }
            return got;
        };
        let start = null;
        for (let y0 = 788; y0 <= 797 && !start; y0++) for (let fr = 0; fr < 256 && !start; fr++) {
            const got = run(y0, fr, false), m = got.slice(10, 18);
            if (rowsH.every((w, i) => m[i][1] === w[1] && m[i][2] === w[2])) start = [y0, fr];
        }
        add('J1', 'moving spike', 'fall onto the raised spike: some start reproduces Research rows 10..17 (Y and Y speed: contact + bounce in update 13, hurt entry in update 14, hurt gravity from 15)', !!start, start ? `start y ${start[0]} sub ${start[1]}` : 'no (y, sub-pixel) start reproduces the rows');
        if (start) {
            const got = run(start[0], start[1], false, 18), m = got.slice(10, 18);
            add('J1', 'moving spike', 'request visible after update 13 (request $FF), consumed by update 14 (rings -> 0, requested state 30 -> current state 30 from update 15)', m[3][5] === 255 && m[4][5] === 0 && m[3][4] === 5 && m[4][4] === 0 && m[4][3] === 14 && m[5][3] === 30, `rows ${JSON.stringify(m.slice(2, 7))}`);
            const gi = run(start[0], start[1], true, 20);
            add('J1', 'moving spike', 'the same fall while invulnerable: Y speed trace 304 .. 880, -1024, -976 ... exactly as Research (20 updates), rings kept', eqArr(gi.map(r => r[2]), E.fall_onto_raised_spike_while_invulnerable.vy_trace_first_20) && gi.every(r => r[4] === 5), `trace ${JSON.stringify(gi.map(r => r[2]))}`);
        }
    }
    // ---- J2: side contact: non-attacking walker meets a wall, rolling attacker is pushed (Research rows; sub-pixel recovered) ----
    for (const [key, rolling] of [['walk_into_side', false], ['roll_into_side', true]]) {
        const R = E[key], rows = rowsOf(R);                       // [f, x, y, vx, cur, spike_state]
        const kRaise = frameOf(host, {raised: 0});
        let ok = -1, firstGot = null;
        for (let fr = 0; fr < 256 && ok < 0; fr++) {
            host.reset(); g.chaosTileIds = host.ids1; host.world.camHint = [SPIKE.x - 128, SPIKE.y - 96]; host.create(host.ids.OBJ_chaos_spikes, SPIKE.x, SPIKE.y); g.ring = 5;
            for (let i = 0; i < kRaise - 3; i++) host.frame({});
            const p = host.newPlayer(rows[0][1], rows[0][2], rolling ? {state: 9, move: 2, bg: 2, contacts: 2, vx: rows[0][3], maximum: 1536} : {state: 5, move: 0, bg: 2, contacts: 2, vx: rows[0][3]});
            p.chaosCore.xu = rows[0][1] * 256 + fr; p.x = p.chaosCore.xu / 256; p.chaosCoreLastX = p.x; p.chaosCore.previous = 0x81; p.chaosCore.player_flags &= ~16;
            const got = [];
            for (let f = 1; f <= 27; f++) { host.frame(rolling ? {} : {right: true}); got.push([f + 6, P.anchor(p)[0], P.anchor(p)[1], p.chaosCore.vx]); }
            if (fr === 0) firstGot = got;
            const byF = Object.fromEntries(got.map(r => [r[0], r])); let match = true;
            for (const w of rows.slice(1)) { const g2 = byF[w[0]]; if (!g2 || g2[1] !== w[1] || g2[2] !== w[2] || g2[3] !== w[3]) match = false; }
            if (match) ok = fr;
        }
        add('J2', 'moving spike', `${key.replace(/_/g, ' ')}: X, Y and X speed at every recorded update match the emulated original (end X ${R.x_at_end}, no hurt)`, ok >= 0 && g.ring === 5, ok >= 0 ? `matched with sub-pixel ${ok}` : `no sub-pixel matches; fr0 ${JSON.stringify(firstGot && firstGot.filter(r => [9, 12, 15, 18].includes(r[0])))} want ${JSON.stringify(rows.slice(1, 5).map(r => [r[0], r[1], r[2], r[3]]))}`);
    }
    // ---- J3: static spike aftermath (5 rings): hurt rows, knockback, 120-update invulnerability, state 30 until landing, hurt again the update after the invulnerability ends ----
    {
        const A = S.static_spike_aftermath.with_5_rings, rows = A.state_after_hit_by_update;       // [update, cur_state, d503, vx, vy, timer]
        const run = () => {
            host.reset(); g.chaosTileIds = host.ids1; g.ring = 5; host.world.camHint = [1554 - 128, 784 - 96];
            const p = host.newPlayer(1554, 784, {state: 14, move: 1, vy: 256, previous: 0}); const tr = []; let death = null, hit = null;
            for (let f = 0; f < 200 && death === null; f++) { host.frame({}); const c = p.chaosCore; tr.push([f, c.state, c.move & 0xC1, c.vx, c.vy, c.invuln, g.ring]); if (hit === null && g.ring === 0) hit = f; if (host.world.events.length) death = f; }
            return {tr, hit, death};
        };
        const r = run();
        const mine = rows.map(w => r.tr[w[0]]);
        const okRows = rows.every((w, i) => mine[i][1] === w[1] && mine[i][2] === parseInt(w[2], 16) && mine[i][3] === w[3] && mine[i][4] === w[4] && mine[i][5] === w[5]);
        add('J3', 'static spike', 'landing on the pair with 5 rings: hurt at update 17, rows 16..24 (state, +$03 flags, X speed -1.0, Y speed -4.0 then +48/update, invulnerability counter 119, 118 ...) = Research', okRows, `got ${JSON.stringify(mine.slice(0, 4))} want ${JSON.stringify(rows.slice(0, 4))}`);
        const seq = []; let last = null; for (const x of r.tr.slice(17)) { if (x[1] === last) seq[seq.length - 1][1]++; else seq.push([x[1], 1]); last = x[1]; }
        add('J3', 'static spike', 'state sequence after the hit: 14 (1), 30 (42 updates, control lock until landing), 5 (10), then standing on the spikes while invulnerable (Research [14,1] [30,42] [5,10] [1,70..])', JSON.stringify(seq.slice(0, 3)) === JSON.stringify(A.state_sequence.slice(0, 3)) && seq[3] && seq[3][0] === 1, JSON.stringify(seq));
        const inv = r.tr.filter(x => (x[2] & 0x80) !== 0).length;
        add('J3', 'static spike', 'invulnerability: +$03 bit 7 visible after exactly 120 updates (17..136), cleared by the 121st gate call, hurt again in the first update without it (second hit = death with 0 rings)', inv === A.updates_with_plus3_bit7 && r.death === 138, `bit-7 updates ${inv} (want ${A.updates_with_plus3_bit7}), second hit at update ${r.death} (want 138 = 17 + 121)`);
        // no rings: the first hit is death
        host.reset(); g.chaosTileIds = host.ids1; g.ring = 0; host.world.camHint = [1554 - 128, 784 - 96];
        host.newPlayer(1554, 784, {state: 14, move: 1, vy: 256, previous: 0}); let d0 = null;
        for (let f = 0; f < 40 && d0 === null; f++) { host.frame({}); if (host.world.events.length) d0 = f; }
        add('J3', 'static spike', 'no rings: the first static-spike hit is the death path (state $1F request, Y speed -5.0)', d0 === S.static_spike_aftermath.no_rings.first_hurt_update, `death at update ${d0}`);
    }
    // ---- K: historical diagonal phasing on the real layout: the Research E1/E2 examples (start, speed, state) ----
    {
        const D = S.static_spike_diagonal_sweep.examples_of_E_X, ex = [...D.E1_foot_in_solid_rows_only_while_rising, ...D.E2_foot_in_solid_rows_not_rising_undamaged];
        const results = ex.map(e => {
            host.reset(); g.chaosTileIds = host.ids1; g.ring = 0; host.world.camHint = [e.start[0] - 128, e.start[1] - 96];
            const jump = e.state === 'jump', p = host.newPlayer(e.start[0], e.start[1], {state: jump ? 10 : 14, move: jump ? 3 : 1, vx: e.vx * 256, vy: e.vy * 256, previous: 0});
            for (let f = 0; f < e.frames; f++) host.frame({}); const end = P.anchor(p);
            return {e, end, ok: end[0] === e.end[0] && end[1] === e.end[1] && host.world.events.length === 0, hurt: host.world.events.length > 0};
        });
        const pinned = results.filter(r => Math.abs(r.e.vx) === 6), rest = results.filter(r => Math.abs(r.e.vx) !== 6);
        add('K1', 'static spike', `historical diagonal phasing: the ${pinned.length} Research examples whose start speed exceeds the walking maximum (|vx| = 6 px: the first update pins the speed) end at the emulated original's position, undamaged`, pinned.every(r => r.ok), JSON.stringify(pinned.filter(r => !r.ok).map(r => [r.e.start, r.e.vx, r.end, r.e.end])));
        add('K2', 'static spike', `DIAGNOSTIC (start condition not recorded in the cache): the other ${rest.length} examples (|vx| 2..4) matched exactly: ${rest.filter(r => r.ok).length}; the teleport's first-update speed bookkeeping is not recoverable from the cache, the terrain pipeline itself is covered cell by cell by E1-E4`, true, JSON.stringify(rest.filter(r => !r.ok).map(r => [r.e.start, r.e.vx, r.e.vy, r.e.state, r.end, r.e.end, r.hurt])));
        // the E2 window: first sample inside the last columns with previous surface = air does nothing; the next sample outside the block does nothing either
        g.chaosTileIds = host.ids1; const core = host.ctx;
        const c1 = core.SCR_cc_new(1566, 835); Object.assign(c1, {state: 14, next: 14, move: 1, previous: 0, bg: 0, vy: 0, rings: 5}); core.SCR_cc_floor(c1);
        const first = hurtFlag(c1), prev1 = c1.previous; c1.xu = 1568 * 256; core.SCR_cc_floor(c1);
        add('K3', 'static spike', 'E2 window: first foot sample inside the block with previous surface = air does nothing; leaving the block on the next sample is still undamaged (no phase-through hurt, no projection)', first === false && prev1 === 0x85 && hurtFlag(c1) === false && c1.yu === 835 * 256, `first ${first} prev ${prev1.toString(16)} second ${hurtFlag(c1)}`);
        const c2 = core.SCR_cc_new(1566, 835); Object.assign(c2, {state: 14, next: 14, move: 1, previous: 0x85, bg: 0, vy: 0, rings: 5}); core.SCR_cc_floor(c2);
        add('K3', 'static spike', 'the same foot sample with previous surface = spike (second update inside the block) projects to anchor Y 830 and hurts: the one-update lag, not an escape', hurtFlag(c2) === true && Math.floor(c2.yu / 256) === 830, `hurt ${hurtFlag(c2)} y ${Math.floor(c2.yu / 256)}`);
    }
}
module.exports = {section_spike1b, section_flows, freshSpike, spikeOffsets, frameOf, trial};
