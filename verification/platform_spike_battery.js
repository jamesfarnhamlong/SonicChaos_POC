// One battery of ROM-oracle checks for type $28 platforms, terrain one-way / static spikes and type $1B moving spikes. Every expectation is taken from the Research cache mirrored in
// POC_notes/rom-cache/platform-spike-collision.json (Research 54cbd3a, docs/platform-spike-collision-audit.md); the code under test is whatever the host loaded
// (the accepted checkpoint 7799c34 for the old-POC replay, or the working tree for the verifier), executed through the real adapter / core.
//   battery(host, add)  with  add(id, area, description, pass, detail)
const fs = require('fs'), path = require('path');
const P = require('./platform_spike_probe.js');
const root = path.resolve(__dirname, '..');
const S = JSON.parse(fs.readFileSync(path.join(root, 'POC_notes/rom-cache/platform-spike-collision.json'), 'utf8'));
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
const eqArr = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const sagRow = P.SAGS.thz1_3;

function section_platform(host, add) {
    // ---- A1: support region (triangle) for the sag platform (state 5, pre-sag Y) and the lift (state 11, post-move Y), against the cache tables ----
    for (const [label, row, tab] of [['state 5 (sag)', sagRow, S.platform_support.state_5.support_region_dx_range_by_dy_at_vy_plus_1_0], ['state 11 (lift, relative to the pre-move anchor)', P.LIFTS.thz1_1, S.platform_support.state_11.support_region_dx_range_by_dy_at_vy_plus_1_0]]) {
        const cells = P.supportRegion(host, row, 256); let bad = 0, sup = 0; const first = [];
        for (const [dx, dy, s] of cells) {
            const t = tab[String(dy)], exp = !!t && dx >= t[0] && dx <= t[1];
            if (s) sup++; if (s !== exp) { bad++; if (first.length < 4) first.push([dx, dy, s, exp]); }
        }
        add('A1', 'platform', `support region ${label}: ${cells.length} cells (dx -30..30, dy -30..12) = every edge +-1 against the cache triangle table`, bad === 0, `${bad} mismatches, ${sup} supported cells, first ${JSON.stringify(first)}`);
    }
    // ---- A2: relative-speed gate platformYSpeed <= playerYSpeed ----
    for (const [label, mk, platVy] of [['stationary sag platform (0)', () => P.mkPlatform(host, sagRow), 0], ['lift moving up (-1.0)', () => P.mkPlatform(host, P.LIFTS.thz1_1), -256]]) {
        let bad = 0, n = 0; const firstBad = [];
        for (let vy = -320; vy <= 320; vy += 1) {
            if (vy % 16 !== 0 && Math.abs(vy - platVy) > 3) continue;                  // every value within +-3 of the threshold, a coarse sweep elsewhere
            P.fresh(host); const plat = mk();
            const p = P.placePost(host, plat.x, plat.y + platVy / 256 - 14, vy);                  // dy -14 against the platform Y the contact test sees (post-move for the lift)
            host.frame({}); const got = P.ownerOf(host, p, plat), exp = vy >= platVy;
            n++; if (got !== exp) { bad++; if (firstBad.length < 4) firstBad.push([vy, got, exp]); }
        }
        add('A2', 'platform', `speed gate on the ${label}: supported iff player vy >= platform vy (${n} signed speeds, +-3 around the threshold)`, bad === 0, `${bad} mismatches ${JSON.stringify(firstBad)}`);
    }
    {   // descending lift: platform +1.0
        let bad = 0, n = 0; const firstBad = [];
        for (const vy of [-256, 0, 200, 254, 255, 256, 257, 258, 300, 512]) {
            P.fresh(host); const plat = P.mkPlatform(host, P.LIFTS.thz1_1); P.advance(host, 150);   // past the first reversal: now moving down
            const y0 = plat.y; host.frame({}); const dir = plat.y - y0; P.fresh(host); const plat2 = P.mkPlatform(host, P.LIFTS.thz1_1); P.advance(host, 150);
            const p = P.placePost(host, plat2.x, plat2.y + dir - 14, vy); host.frame({}); const got = P.ownerOf(host, p, plat2), exp = dir > 0 ? vy >= 256 : vy >= -256;
            n++; if (got !== exp) { bad++; firstBad.push([vy, dir, got, exp]); }
        }
        add('A2', 'platform', `speed gate on the descending lift (+1.0): supported iff player vy >= 256 (${n} speeds)`, bad === 0, `${bad} mismatches ${JSON.stringify(firstBad)}`);
    }

    // ---- B: landing, retained speed, carry, update order ----
    {
        const r = P.landFromAbove(host, sagRow, {frames: 60, vy: 0});
        const claim = r.trace.findIndex(t => t.supported);
        const st = r.trace.slice(claim);
        add('B1', 'platform', 'standing rider sits at platformY - 14 on every update after the claim (sag platform, sinking and returning)', st.length > 12 && st.every(t => t.dy === -14), `dy values ${JSON.stringify([...new Set(st.map(t => t.dy))])}`);
        const vyClaim = r.trace[claim].vy, standing = r.trace.slice(claim + 1);
        add('B2', 'platform', 'landing does not zero the Y speed: one more gravity step (+48) after the claim, then the speed is retained while standing', standing.length > 10 && standing.every(t => t.vy === vyClaim + 48) && vyClaim + 48 > 0, `claim vy ${vyClaim}, standing vy ${JSON.stringify([...new Set(standing.map(t => t.vy))])}`);
        const landed = r.trace.findIndex(t => t.move === 0);
        add('B3', 'platform', 'claim in update N, landing (airborne bit cleared) registered by the player pass of N+1 (Research landing sequence)', claim >= 0 && landed === claim + 1, `claim index ${claim}, landed index ${landed}`);
        const sag = r.trace.slice(claim, claim + 17).map(t => t.platY - 384);
        const expSag = S.platform_emulated.sag_while_standing.platform_y_offset_by_update.slice(6, 23).map((v, i) => v);
        add('B4', 'platform', 'sag cycle relative to the claim: 1 2 3 4 5 6 7 8 8 7 6 5 4 3 2 1 0 (platform Y offset)', eqArr(sag, expSag), `got ${JSON.stringify(sag)} want ${JSON.stringify(expSag)}`);
    }
    {   // lift landing against the Research rows: start from the row-2 state, platform about to move up
        const rows = S.platform_emulated.land_on_rising_lift.rows;      // [frame, x, y, vx, vy, cur_state, d503, d523, d3c0, platform_y]
        P.fresh(host); const plat = P.mkPlatform(host, P.LIFTS.thz1_1); const r2 = rows[2];
        const p = host.newPlayer(r2[1], r2[2], {state: r2[5], move: r2[6] & 3, vy: r2[4]});
        const got = [];
        for (let f = 3; f <= 11; f++) { host.frame({}); const [x, y] = P.anchor(p); got.push([f, y, p.chaosCore.vy, p.chaosCore.state, P.ownerOf(host, p, plat) ? 9 : 0, plat.y]); }
        const want = rows.slice(3).map(r => [r[0], r[2], r[4], r[5], r[8], r[9]]);
        let bad = 0; const d = [];
        got.forEach((g, i) => { if (!eqArr(g, want[i])) { bad++; if (d.length < 3) d.push([g, want[i]]); } });
        add('B5', 'platform', 'landing on the rising THZ1 lift reproduces the emulated original rows frame by frame (Y, Y speed, state, owner, platform Y)', bad === 0, `${bad}/${got.length} rows differ ${JSON.stringify(d)}`);
    }
    {   // order: player pass first, then the object (platform Y at the entry of the player's step equals its Y at the end of the previous update)
        P.fresh(host); const plat = P.mkPlatform(host, P.LIFTS.thz1_1); const p = host.newPlayer(plat.x + 100, plat.y - 200, {state: 14, move: 1});
        const orig = host.ctx.SCR_chaos_adapter_step, entry = [], end = []; host.ctx.SCR_chaos_adapter_step = pp => { entry.push(plat.y); return orig(pp); };
        for (let i = 0; i < 12; i++) { host.frame({}); end.push(plat.y); } host.ctx.SCR_chaos_adapter_step = orig;
        const pre = [464, ...end.slice(0, -1)];
        add('B6', 'platform', 'update order: the platform has NOT moved when the player pass starts (player -> object -> move -> contact -> carry)', eqArr(entry, pre), `entry ${JSON.stringify(entry.slice(0, 6))} previous-end ${JSON.stringify(pre.slice(0, 6))}`);
    }
    {   // walking with and against the lift's motion: the rider stays at -14 while supported, X is purely the player's own motion
        for (const [label, dirKey, startX] of [['walking right', 'right', -10], ['walking left', 'left', 10]]) {
            const r = P.landFromAbove(host, P.LIFTS.thz1_1, {frames: 70, startDy: -30, dx: startX}); const p = r.p, plat = r.plat; const rows = [];
            for (let i = 0; i < 12; i++) { host.frame({[dirKey]: true}); rows.push([P.anchor(p)[1] - plat.y, P.ownerOf(host, p, plat), P.anchor(p)[0], p.chaosCore.vx]); }
            add('B13', 'platform', `${label} on the rising lift: Y = platformY - 14 while supported; X advances only by the player's own speed (no platform X carry in THZ)`, rows.every(rw => rw[1] ? rw[0] === -14 : true) && rows.some(rw => rw[1]) && rows[11][2] !== rows[0][2], JSON.stringify(rows.slice(0, 4)));
        }
    }
    {   // lift carry + reversal ride-through
        const r = P.landFromAbove(host, P.LIFTS.thz1_1, {frames: 330, startDy: -40});
        const claim = r.trace.findIndex(t => t.supported), st = r.trace.slice(claim);
        add('B7', 'platform', 'lift rider: Y = platformY - 14 on every update, X unchanged, X speed untouched, support continuous through both reversals (330 updates)', st.every(t => t.dy === -14 && t.supported && t.x === r.trace[0].x && t.vx === 0), `${st.length} updates, dy ${JSON.stringify([...new Set(st.map(t => t.dy))])}`);
        const vys = [...new Set(st.slice(2).map(t => t.vy))];
        add('B8', 'platform', 'lift rider keeps its landing Y speed through the whole ride (no zeroing)', vys.length === 1 && vys[0] > 0, `Y speeds ${JSON.stringify(vys)}`);
        const ys = r.trace.map(t => t.platY), top = Math.min(...ys);
        add('B9', 'platform', 'THZ1 lift #1 turns at 464-144 = 320 and comes back (period 144)', top === 320 && ys.indexOf(320) > 0 && ys[ys.indexOf(320) + 1] === 321, `top ${top}`);
    }
    {   // retained Y speed zero at the reversal: support lost on the reversal update, reclaimed one update later (Research rows 125..134)
        const rows = S.platform_emulated.supported_with_retained_vy_zero.rows_around_loss;           // frames 125..134
        const r = P.landFromAbove(host, P.LIFTS.thz1_1, {frames: 0, startDy: -40});
        P.fresh(host); const plat = P.mkPlatform(host, P.LIFTS.thz1_1); const p = host.newPlayer(plat.x, plat.y - 40, {state: 14, move: 1});
        let guard = 0; while (!(P.ownerOf(host, p, plat) && p.chaosCore.move === 0) && guard++ < 200) host.frame({});
        let cur = 0; while (plat.y > 322 && cur++ < 400) { host.frame({}); p.chaosCore.vy = 0; }       // ride up with the retained Y speed forced to zero (Research row 125 state)
        let g2 = 0; while (plat.y !== 321 && g2++ < 600) host.frame({}); p.chaosCore.vy = 0;
        const got = []; for (let f = 126; f <= 134; f++) { host.frame({}); got.push([f, P.anchor(p)[1] - plat.y, p.chaosCore.vy, P.ownerOf(host, p, plat)]); }
        const want = rows.slice(1).map(r => [r[0], r[2] - r[9], r[4], r[8] !== 0]);
        let bad = 0; const d = []; got.forEach((g, i) => { if (!eqArr(g, want[i])) { bad++; if (d.length < 3) d.push([g, want[i]]); } });
        add('B10', 'platform', 'rider with retained Y speed 0 at the reversal: support lost on the reversal update, reclaimed next (Research rows 126..134: offset, Y speed, owner)', bad === 0, `${bad}/${got.length} rows differ ${JSON.stringify(d)}`);
    }
    {   // step-off right / left against the cache rows (fraction search recovers the unknown sub-pixel)
        for (const [dir, key] of [[1, 'step_off_right'], [-1, 'step_off_left']]) {
            const E = S.platform_emulated[key], rows = E.rows_around_release;                         // [frame, x, y, vx, vy, cur, d503, d523, d3c0, platform_y]
            const start = rows[0], after = rows.slice(1, 10); let okFr = -1, detail = '';
            for (let fr = 0; fr < 256 && okFr < 0; fr++) {
                const r = P.landFromAbove(host, sagRow, {frames: 45, startDy: -40}); const p = r.p, plat = r.plat;
                p.chaosCore.xu = start[1] * 256 + fr; p.chaosCore.vx = start[3]; p.chaosCore.state = p.chaosCore.next = start[5]; p.x = (start[1] * 256 + fr) / 256; p.chaosCoreLastX = p.x;
                const got = []; for (let i = 0; i < after.length; i++) { host.frame({[dir > 0 ? 'right' : 'left']: true}); got.push([P.anchor(p)[0], p.chaosCore.vx, P.ownerOf(host, p, plat) ? 9 : 0]); }
                const want = after.map(r => [r[1], r[3], r[8]]);
                if (got.every((g, i) => eqArr(g, want[i]))) okFr = fr; else if (fr === 0) detail = JSON.stringify([got.slice(0, 4), want.slice(0, 4)]);
            }
            add('B11', 'platform', `step off the ${dir > 0 ? 'right' : 'left'} edge: X, X speed and support per update match the emulated rows (support ends at dx ${E.dx_when_released}; last supported dx ${E.dx_at_last_supported})`, okFr >= 0, okFr >= 0 ? `matched with sub-pixel ${okFr}` : `no sub-pixel reproduces the rows; fr0 ${detail}`);
        }
    }
    {   // jump detach
        const r = P.landFromAbove(host, sagRow, {frames: 45, startDy: -40}); const p = r.p, plat = r.plat; const y0 = P.anchor(p)[1];
        host.frame({jump: true, jumpPress: true}); const first = {vy: p.chaosCore.vy, y: P.anchor(p)[1], owner: P.ownerOf(host, p, plat)};
        const vys = []; for (let i = 0; i < 8; i++) { host.frame({}); vys.push(p.chaosCore.vy); }
        const J = S.platform_emulated.jump_off_sag.rows;       // rows 3..11: vy -1088, -1040 ... ; support lost the jump update
        add('B12', 'platform', 'jump: vy -4.25 set in the player pass, support released in the SAME update (no carry), Y moved 1 px up, vy follows -1040 -992 ... (Research rows 3..11)', first.vy === J[3][4] && first.owner === false && y0 - first.y === 1 && eqArr(vys, J.slice(4, 12).map(r => r[4])), `first ${JSON.stringify(first)} vys ${JSON.stringify(vys)} want ${JSON.stringify(J.slice(4, 12).map(r => r[4]))}`);
    }
    // ---- C: top-only, jump-through ----
    {
        const scen = [['rising from below, attacking (jump)', 1040, 417, 0, -1616, 10, 3], ['rising from below, spring pose (not attacking)', 1040, 417, 0, -1616, 11, 1], ['running through at platform height (attacking, 4 px/update)', 974, 392, 1024, 48, 10, 3], ['walking through at platform height', 960, 370, 512, 0, 5, 0]];
        for (const [label, x, y, vx, vy, state, move] of scen) {
            const run = withPlatform => {
                P.fresh(host); let plat = null; if (withPlatform) plat = P.mkPlatform(host, sagRow);
                const p = host.newPlayer(x, y, {state, move, vx, vy}); const tr = [];
                for (let i = 0; i < 26; i++) { host.frame(vx > 0 && move === 0 ? {right: true} : {}); tr.push([P.anchor(p)[0], P.anchor(p)[1], p.chaosCore.vx, p.chaosCore.vy, p.chaosCore.state, withPlatform ? (P.ownerOf(host, p, plat) ? 1 : 0) : 0]); }
                return tr;
            };
            const a = run(true), b = run(false);
            add('C1', 'platform', `top-only: ${label}: the platform changes nothing (trajectory identical to the run without it, never supports)`, a.every((r, i) => eqArr(r, b[i])) , `first difference ${JSON.stringify(a.find((r, i) => !eqArr(r, b[i])) || null)} vs ${JSON.stringify(b[a.findIndex((r, i) => !eqArr(r, b[i]))] || null)}`);
        }
    }
    // ---- D: variants: THZ1 / THZ2 lifts and spawn ----
    for (const [k, row] of Object.entries(P.LIFTS)) {
        P.fresh(host); const plat = P.mkPlatform(host, row); const per = row[7] * 16, ys = [];
        if (!plat) { add('D1', 'platform', `${k}: spawned`, false, 'chaos_spawn_type28 returned noone'); continue; }
        for (let i = 0; i < per * 2 + 3; i++) { host.frame({}); ys.push(plat.y); }
        const exp = ys.map((_, i) => { const t = i + 1, ph = (t - 1) % (2 * per) + 1; return row[2] + (ph <= per ? -ph : -(2 * per - ph)); });
        add('D1', 'platform', `${k} (${row[1]},${row[2]}): 1 px/update, first leg up, reversal every ${per} updates, extreme ${row[2] - per}; whole 2 periods + 3`, eqArr(ys, exp), `top ${Math.min(...ys)} first ${ys.slice(0, 3)} turn ${JSON.stringify(ys.slice(per - 1, per + 2))}`);
    }
}
Object.assign(module.exports, {S, range, eqArr, sagRow, section_platform}, require('./platform_spike_battery_terrain.js'), require('./platform_spike_battery_spike.js'));
