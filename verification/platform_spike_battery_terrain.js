// Terrain part of the platform / spike battery: one-way block $0D, static spikes $3C/$3D (type 5), hurt consequences ($48F7) and the invulnerability gate ($48BC).
// Pure core (SCR_cc_*) on the real act layouts; expectations from the Research cache mirror (see platform_spike_battery.js).
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const S = JSON.parse(fs.readFileSync(path.join(root, 'POC_notes/rom-cache/platform-spike-collision.json'), 'utf8'));
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
const eqArr = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const PREV = {none_00: 0x00, solid_81: 0x81, spike_85: 0x85, oneway_41: 0x41};
const VY = {'rising_-1.0': -256, zero: 0, 'descending_+1.0': 256, 'fast_+7.0': 1792, '+1.0': 256, '+2.0': 512, '+4.0': 1024, '+7.0': 1792};
const inRects = (rects, x, y) => rects.some(([x0, x1, y0, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
function newCore(host, x, y, o = {}) {
    const c = host.ctx.SCR_cc_new(x, y); Object.assign(c, {state: 5, next: 5, move: 0, bg: 0, contacts: 0, previous: 0, vy: 0, vx: 0, rings: 5}, o); return c;
}
const hurtFlag = c => c.hurt_pending === true || c.hazard === 1;

function section_terrain(host, add) {
    const g = host.g, ctx = host.ctx;
    g.chaosTileIds = host.ids1; g.chaosBrokenCells = [];
    // ---- E1: foot probe table (static spikes $3D, THZ1 pair) ----
    {
        let bad = 0, n = 0; const first = [];
        for (const [key, v] of Object.entries(S.terrain_foot_sweep.results)) {
            const m = /^prev_(\w+)\|floor_(\d)\|vy_(.+)$/.exec(key), prev = PREV[m[1]], floor = +m[2], vy = VY[m[3]], rects = v['damaging_cells_[x0,x1,foot_row_y0,y1]'];
            for (let x = 1498; x <= 1573; x++) for (let row = 826; row <= 870; row++) {
                const c = newCore(host, x, row - 18, {previous: prev, bg: floor ? 2 : 0, contacts: floor ? 2 : 0, vy, move: floor ? 0 : 1, state: floor ? 5 : 14, next: floor ? 5 : 14});
                ctx.SCR_cc_floor(c); const hit = hurtFlag(c), exp = inRects(rects, x, row); n++;
                if (hit !== exp) { bad++; if (first.length < 4) first.push([key, x, row, hit, exp]); }
            }
        }
        add('E1', 'static spike', `foot probe $6ACE: previous surface x floor flag x Y speed table, ${n} cells (24 combinations, edges +-1 around the 64x32 pair) vs Research`, bad === 0, `${bad} mismatches ${JSON.stringify(first)}`);
    }
    // ---- E2: side probes (right / left separately, the other probe over empty terrain) and the ceiling probe ----
    {
        const keep = [[47, 26], [48, 26]], R = S.terrain_side_ceiling_sweep;      // spike cells only (rows 832..863); the ground block rows below are ordinary terrain
        const sideCases = (xs, rects) => {
            let bad = 0, n = 0; const first = [];
            host.isolate(keep);
            for (const x of range(xs[0], xs[1])) for (let row = 832; row <= 863; row++) {
                const c = newCore(host, x, row - 6, {state: 14, next: 14, move: 1, vy: 0}); const x0 = c.xu; ctx.SCR_cc_sides(c);
                const exp = inRects(rects.filter(r => r[3] <= 863), x, row), got = c.xu !== x0; n++;
                if (got !== exp || hurtFlag(c)) { bad++; if (first.length < 4) first.push([x, row, got, exp]); }
            }
            return [bad, n, first];
        };
        const [b1, n1, f1] = sideCases([1480, 1512], R['right_probe_changes_x_[x0,x1,probe_row_y0,y1]']);
        add('E2', 'static spike', `right side probe (X+9, Y+6): pushes exactly for probe rows 16..31 of the cell and the ground rows below (${n1} cells), never damages`, b1 === 0, `${b1} mismatches ${JSON.stringify(f1)}`);
        const [b2, n2, f2] = sideCases([1559, 1576], R['left_probe_changes_x_[x0,x1,probe_row_y0,y1]']);
        add('E2', 'static spike', `left side probe (X-9, Y+6): same, mirrored (${n2} cells), never damages`, b2 === 0, `${b2} mismatches ${JSON.stringify(f2)}`);
        let bad = 0, nn = 0;
        for (let x = 1498; x <= 1573; x++) for (let y = 820; y <= 880; y++) for (const vy of [-256, -1]) {
            const c = newCore(host, x, y, {state: 14, next: 14, move: 1, vy}); const y0 = c.yu; ctx.SCR_cc_ceiling(c); nn++;
            if (c.yu !== y0 || hurtFlag(c)) bad++;
        }
        add('E2', 'static spike', `ceiling probe (X, Y-6) over the pair: no push, no damage in THZ (${nn} cells, rising)`, bad === 0, `${bad} changed`);
        host.isolate(keep);
        const dm = newCore(host, 1500, 850, {state: 14, next: 30, move: 1}); const x0 = dm.xu; ctx.SCR_cc_sides(dm);
        const nm = newCore(host, 1500, 850, {state: 14, next: 14, move: 1}); const x1 = nm.xu; ctx.SCR_cc_sides(nm);
        add('E2', 'static spike', 'requested hurt state ($1E) returns from the type-5 side handler without pushing (the same position is pushed when no hurt is requested)', dm.xu === x0 && nm.xu !== x1, `hurt-requested moved ${dm.xu - x0}, normal moved ${nm.xu - x1}`);
        g.chaosTileIds = host.ids1;
    }
    // ---- E3: $3C is the same floor hazard / wall as $3D (THZ2 cells) ----
    {
        const t2 = host.ids2, cells = S.static_spike_terrain.cells.thz2; let bad = 0, n = 0; const first = [];
        for (const cell of cells) {
            const [cx, cy] = cell.cell; const iso = t2.map(() => 254); iso[cy * 128 + cx] = t2[cy * 128 + cx]; g.chaosTileIds = iso;
            const X0 = cx * 32, Y0 = cy * 32;
            for (let dx = 0; dx <= 31; dx++) for (let r = 0; r <= 31; r++) {
                const c = newCore(host, X0 + dx, Y0 + r - 18, {previous: 0x85, bg: 2, contacts: 2, vy: 0, move: 0}); ctx.SCR_cc_floor(c); n++;
                if (!hurtFlag(c)) { bad++; if (first.length < 4) first.push([cell.block, 'foot', dx, r]); }
                // right probe lands on column dx of the cell (the left probe is 18 px further left, over empty terrain when dx < 18 ... use dx >= 0 with the cell isolated: both probes may see it,
                // so only the wall decision of the right probe at X0+dx-9 is compared)
                const s = newCore(host, X0 + dx - 9, Y0 + r - 6, {state: 14, next: 14, move: 1}); const sx = s.xu; ctx.SCR_cc_sides(s); n++;
                const wall = r >= 16 && dx > 0, moved = s.xu !== sx;          // the right probe pushes Sonic left by the column's offset inside the cell: no visible move at column 0
                if (moved !== wall) { bad++; if (first.length < 4) first.push([cell.block, 'side', dx, r, moved, wall]); }
            }
        }
        g.chaosTileIds = host.ids1;
        add('E3', 'static spike', `THZ2 type-5 cells (${cells.map(c => c.block).join(',')}): grounded foot hurts over the whole cell, side probe walls rows 16..31 only (${n} cases)`, bad === 0, `${bad} mismatches ${JSON.stringify(first)}`);
    }
    // ---- E4: the rising band ----
    {
        g.chaosTileIds = host.ids1;
        const B = S.static_spike_rising_band; let bad = 0; const first = [];
        for (const [label, v] of [['rising_-1.0', -256], ['level_0', 0], ['descending_+1.0', 256]]) {
            const E = B.by_vertical_speed[label], dmg = [], push = [];
            for (let y = 818; y <= 851; y++) {
                const c = newCore(host, 1512, y, {state: 14, next: 14, move: 1, vy: v, previous: 0x85, bg: 0, contacts: 0}); const x0 = c.xu;
                ctx.SCR_cc_floor(c); ctx.SCR_cc_sides(c); ctx.SCR_cc_ceiling(c); ctx.SCR_cc_merge(c);
                if (hurtFlag(c)) dmg.push(y); if (c.xu !== x0) push.push(y);
            }
            const toSet = rs => new Set(rs.flatMap(([a, b]) => range(a, b)));
            const wantD = toSet(E.damaged_anchor_y), wantP = toSet(E.pushed_by_wall_anchor_y);
            const okD = dmg.length === wantD.size && dmg.every(y => wantD.has(y)), okP = push.length === wantP.size && push.every(y => wantP.has(y));
            if (!okD || !okP) { bad++; first.push([label, dmg.length ? [dmg[0], dmg[dmg.length - 1]] : [], push.length ? [push[0], push[push.length - 1]] : []]); }
        }
        add('E4', 'static spike', 'rising band: Y speed < 0 at anchor Y 830..841 is neither projected, damaged nor pushed; 842..851 pushed by the wall; level/descending damaged 830..845 (foot / sides / ceiling order)', bad === 0, `${bad} speeds differ ${JSON.stringify(first)}`);
    }
    // ---- F: one-way terrain block $0D ----
    {
        const [wx, wy] = S.terrain_one_way_platform.cell_world;
        g.chaosTileIds = host.ids1; let bad = 0, n = 0, combos = 0; const first = [];
        for (const [key, v] of Object.entries(S.terrain_one_way_platform.results)) {
            const m = /^prev_(\w+)\|floor_(\d)\|vy_(.+)$/.exec(key), prev = PREV[m[1]], floor = +m[2], vy = VY[m[3]], want = new Set((v.projected_foot_rows_relative_to_cell_top || []).flatMap(([a, b]) => range(a, b)));
            for (let r = -6; r <= 40; r++) {
                const c = newCore(host, wx + 16, wy + r - 18, {previous: prev, bg: floor ? 2 : 0, contacts: floor ? 2 : 0, vy, move: floor ? 0 : 1, state: floor ? 5 : 14, next: floor ? 5 : 14});
                const y0 = c.yu; ctx.SCR_cc_floor(c); const got = c.yu !== y0; n++;
                if (got !== want.has(r)) { bad++; if (first.length < 4) first.push([key, r, got]); }
            }
            combos++;
        }
        add('F1', 'terrain one-way', `block $0D (flags $41): foot-row projection per previous surface x floor flag x Y speed (${combos} combinations, ${n} rows) = Research; skipped while rising`, bad === 0, `${bad} mismatches ${JSON.stringify(first)}`);
        let sc = 0, cc = 0;
        for (let x = wx - 12; x <= wx + 44; x++) for (let r = -2; r <= 33; r++) {
            const s = newCore(host, x, wy + r - 6, {state: 14, next: 14, move: 1}); const sx = s.xu; ctx.SCR_cc_sides(s); if (s.xu !== sx) sc++;
            const k = newCore(host, x, wy + r + 6, {state: 14, next: 14, move: 1, vy: -256}); const ky = k.yu; ctx.SCR_cc_ceiling(k); if (k.yu !== ky) cc++;
        }
        add('F2', 'terrain one-way', 'block $0D: no side push and no ceiling push (jump-through, run-through)', sc === 0 && cc === 0, `side pushes ${sc}, ceiling pushes ${cc}`);
    }
    // ---- G: hurt consequences ($48F7) and the invulnerability gate ($48BC) ----
    if (!ctx.SCR_cc_hurt_rom) {                      // the accepted checkpoint: only the sample-engine hurt (SCR_cc_hurt_enter); measured against the same Research rows
        let bad = 0; const first = [];
        for (const [name, e] of Object.entries(S.hurt_consequences.rows)) {
            if (!/^rings_(5_airborne|1)$/.test(name) && name !== 'rings_5_left_wall_bit3_in_d523') continue;
            const c = newCore(host, 100, 100, {rings: 5, move: 1, contacts: name.includes('left_wall') ? 8 : 0, state: 14, next: 14, vx: 0}); ctx.SCR_cc_hurt_enter(c);
            const got = [c.vx, c.vy, c.hurt_ticks, c.move & 0xC1], want = [e.vx, e.vy, 'until landing', parseInt(e.d503, 16)];
            if (got[0] !== want[0] || got[1] !== want[1] || (c.move & 0xC1) !== want[3]) { bad++; if (first.length < 3) first.push([name, got, want]); }
        }
        add('G1', 'damage', 'hurt entry: X speed (wall-dependent -1.0 / +1.0), Y speed -4.0, +$03 |= $C1 (invulnerable / airborne), control lock until landing', bad === 0, `${bad} rows differ ${JSON.stringify(first)}; old: facing-based vx, 30-update lock, adapter blink 90`);
        add('G2', 'damage', 'invulnerability: 120-update counter cleared on the 121st gate call', false, 'no $48BC gate in the old POC (global blink timer 90 updates)');
        return;
    }
    {
        let bad = 0; const first = [];
        for (const [name, e] of Object.entries(S.hurt_consequences.rows)) {
            if (name === 'rings_5_state_11') continue;                  // the numeric reward pose takes its own branch (existing POC state-$11 path)
            const rings = name === 'rings_0_death' ? 0 : +(/^rings_(\d+)/.exec(name)[1]);
            const c = newCore(host, 100, 100, {rings, move: 1, bg: name.includes('ceiling') ? 1 : 0, contacts: name.includes('left_wall') ? 8 : 0, state: 14, next: 14, vx: 0});
            ctx.SCR_cc_hurt_rom(c);
            const reqWant = parseInt(e.requested_state, 16), death = reqWant === 0x1F;
            const got = {next: c.next, vx: c.vx, vy: c.vy, inv: c.invuln, rings: death ? 0 : c.rings, scatter: c.hurt_scatter, floor: (c.bg & 2) !== 0, flags: c.move & 0xC1};
            const want = {next: reqWant, vx: death ? 0 : e.vx, vy: e.vy, inv: death ? 0 : e.invulnerability_timer_d3b1, rings: e.rings_after, scatter: e.scatter_objects_type_06, floor: e.floor_flag_after, flags: parseInt(e.d503, 16) & 0xC1};
            if (JSON.stringify(got) !== JSON.stringify(want)) { bad++; if (first.length < 3) first.push([name, got, want]); }
        }
        add('G1', 'damage', 'hurt entry $48F7: state, speeds, ring loss, scatter count (cap 7), invulnerability 120, +$03 |= $C1, left-wall / ceiling variants vs Research rows', bad === 0, `${bad} rows differ ${JSON.stringify(first)}`);
        const c = newCore(host, 100, 100, {rings: 5, move: 1}); ctx.SCR_cc_hurt_rom(c); const trace = []; let calls = 0;
        while ((c.move & 128) !== 0 && calls < 400) { ctx.SCR_cc_damage_gate(c); calls++; if (trace.length < 6) trace.push(c.invuln); }
        add('G2', 'damage', 'invulnerability: counter 119..0 once per gate call, bits cleared on the 121st call (Research trace)', calls === S.invulnerability_countdown.damage_gate_updates_until_bits_clear && eqArr(trace, S.invulnerability_countdown.timer_trace_first_6), `calls ${calls} trace ${JSON.stringify(trace)}`);
        const d = newCore(host, 100, 100, {rings: 5, move: 1}); ctx.SCR_cc_hurt_rom(d); d.hurt_pending = false; d.damage_request = 255; const k1 = ctx.SCR_cc_damage_gate(d);
        const kept = d.damage_request; for (let i = 0; i < 119; i++) { d.damage_request = 255; ctx.SCR_cc_damage_gate(d); }       // calls 2..120: counter 119 -> 0
        const before = (d.move & 128) !== 0 && d.invuln === 0; d.damage_request = 255; ctx.SCR_cc_damage_gate(d);                   // call 121 clears
        add('G3', 'damage', 'while invulnerable a request is ignored and kept; when the bits clear the pending request is discarded (no hurt)', k1 === false && kept === 255 && before && (d.move & 128) === 0 && d.damage_request === 0 && d.hurt_pending === false, `kept ${kept} bits-after ${d.move & 192} request ${d.damage_request}`);
        const e1 = newCore(host, 100, 100, {rings: 5, move: 1, damage_request: 255}); const h1 = ctx.SCR_cc_damage_gate(e1);
        add('G4', 'damage', 'a request reaches $48F7 when not invulnerable: hurt requested, request consumed', h1 === true && e1.next === 30 && e1.damage_request === 0 && e1.invuln === 120, `h ${h1} next ${e1.next}`);
    }
}
module.exports = {section_terrain, newCore, S, range, eqArr, inRects, hurtFlag};
