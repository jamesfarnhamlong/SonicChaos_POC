// Deterministic capture of the Spring Shoes presentation over complete bounce cycles through the shipped GML (harness), compared with Research
// data/rom-cache/spring-shoes-presentation.json (traces.mghz1_plain, emulated original, MGHZ1 shoes (1552,238), Sonic released at (1552,200) with vy +1.0, no input).
// Per update: update number, player state/requested state/frame, player X/Y/vy/facing, shoe state/frame/timer/X/Y. Writes verification/mghz-m2/spring-shoes-presentation-capture.json
const fs = require('fs'), path = require('path'), assert = require('assert');
const {loadHost, root} = require('./chaos_world_harness.js');
const R = JSON.parse(fs.readFileSync(path.join(root, 'POC_notes/rom-cache/spring-shoes-presentation.json'), 'utf8')).part_a_presentation.traces.mghz1_plain;
const h = loadHost(null), c = h.ctx, g = h.g, w = h.world;
c.room = c.ROM_chaos_mghz1; c.chaos_level_install_layout(); g.chaosMghzEffects = c.chaos_mghz_effect_new(); h.reset(); w.cam.w = 256; w.cam.h = 192; w.follow = false;
g.player = 1;
const p = h.newPlayer(R.start.x, R.start.y, {state: 14, move: 1, vy: R.start.vy});
const k = p.chaosCore;
// The Research trace gives integer Y only; the original's sub-pixel start phase is unknown, so the start fraction is a capture input (96/256 reproduces the integer rows within +-1).
p.y += 96 / 256; p.chaosCoreLastY = p.y; k.yu = Math.round((p.y - p.chaosAnchorOffset) * 256);
// the shoes come from the canonical placement through the shipped loader (record 12 of MGHZ1)
c.chaos_level_spawn_objects();
const shoe = w.badniks.find(o => o.object_index === h.ids.OBJ_chaos_object_2F && o.x === 1552 && o.y === 238);
assert(shoe, 'canonical $2F record present');
w.badniks.splice(0, w.badniks.length, shoe);
// the emulated original created the object at update 3-4 and its first 8-update frame-1 record was already running at update 5: start the POC record at the same phase
Object.assign(shoe, {x: 1552, y: 238, chaosActive: true, chaosAsleep: false, chaosWoken: true, chaosScanTick: 1, chaosInitialFillDone: true, chaosState: 1, chaosAnimTick: -4});                       // only the shoe; every other object would just add noise to the trace
w.cam.x = 1552 - 128; w.cam.y = 200 - 96;
const rows = [], N = 300;
for (let u = 1; u <= N; u++) {
    const frameAtCall = shoe.chaosFrame;
    h.frame({});
    rows.push({u, state: k.state, req: k.next, pframe: k.state === 18 ? 11 : null, x: Math.floor(k.xu / 256), y: Math.floor(k.yu / 256), vy: k.vy, facing: (k.player_flags & 16) ? 1 : 0,
        shoe: {state: shoe.chaosState, frame: shoe.chaosFrame, tick: shoe.chaosAnimTick, x: shoe.x, y: shoe.y, active: !!shoe.chaosActive}, frameAtCall});
}
const first12 = rows.find(r => r.state === 18).u;
const contacts = []; for (let i = 1; i < rows.length; i++) if (rows[i].vy === -1920 && rows[i - 1].vy !== -1920 && rows[i].state === 18) contacts.push(rows[i].u);
const offset = R.state_12_first_update - first12;                    // POC update index -> original update index (the POC object is created in the first call; the original ran 3 updates of setup)
const runs = []; for (const r of rows) { if (!r.shoe.active) continue; const l = runs[runs.length - 1]; if (l && l.state === r.shoe.state && l.frame === r.shoe.frame) l.last = r.u; else runs.push({state: r.shoe.state, frame: r.shoe.frame, first: r.u, last: r.u}); }
const res = {first_state12_update_poc: first12, research_first_state12_update: R.state_12_first_update, update_offset: offset, contacts_poc: contacts, contacts_research: R.contact_updates,
    periods_poc: contacts.slice(1).map((v, i) => v - contacts[i]), periods_research: R.bounce_period_updates,
    shoe_runs_poc: runs.filter(r => r.state === 3 || r.state === 4 || r.state === 1).map(r => ({state: r.state, frame: r.frame, length: r.last - r.first + 1, first_research_u: r.first + offset})), shoe_runs_research: R.shoe_frame_runs.filter(r => [1, 3, 4].includes(r.state)).map(r => ({state: r.state, frame: r.frame, length: r.length, first: r.first_u})),
    player_frame_values: [...new Set(rows.filter(r => r.state === 18).map(r => r.pframe))], offsets_y: {}, mismatches: []};
// follow offsets relative to each contact: shoe Y - player Y
for (const cu of contacts) for (let d = -2; d <= 13; d++) { const r = rows.find(x => x.u === cu + d); if (r && r.state === 18) { const off = r.shoe.y - r.y; (res.offsets_y[d] ||= new Set()).add(off); } }
res.offsets_y = Object.fromEntries(Object.entries(res.offsets_y).map(([d, s]) => [d, [...s]]));
// ---- comparisons against Research ----
const chk = (cond, msg) => { if (!cond) res.mismatches.push(msg); };
chk(JSON.stringify(res.periods_poc) === JSON.stringify(R.bounce_period_updates.slice(0, res.periods_poc.length)), 'bounce period');
chk(contacts.slice(0, 4).map(u => u + offset).join() === R.contact_updates.join(), `contact updates (poc+offset ${contacts.slice(0, 4).map(u => u + offset)} vs ${R.contact_updates})`);
const rr = R.shoe_frame_runs.filter(r => r.state === 3 || r.state === 4);
const pr = runs.filter(r => r.state === 3 || r.state === 4);
for (let i = 0; i < Math.min(rr.length, pr.length, 6); i++) chk(rr[i].state === pr[i].state && rr[i].length === pr[i].last - pr[i].first + 1 && rr[i].first_u === pr[i].first + offset, `shoe run ${i}: research ${JSON.stringify(rr[i])} vs poc ${JSON.stringify(pr[i])} (+offset ${offset})`);
chk(res.player_frame_values.length === 1 && res.player_frame_values[0] === 11, 'Sonic single frame $0B');
chk(rows.every(r => r.shoe.frame !== undefined), 'frames present');
// registration: +16 for the 12 updates after each contact (C+1..C+12), 11 otherwise (Research follow_offsets; one-update lag)
for (const [d, vals] of Object.entries(res.offsets_y)) { const want = (+d >= 1 && +d <= 12) ? 16 : 11; chk(vals.length === 1 && vals[0] === want, `follow offset at C+${d}: ${vals} want ${want}`); }
chk(rows.filter(r => r.state === 18).every(r => r.shoe.x === r.x), 'shoe X = Sonic X every update');
// per-update comparison of Sonic Y / Y speed / shoe frame with the Research rows that are provided
const rowsRes = [].concat(R.rows_first_pickup, R.rows_second_bounce_window);
let cmp = 0, bad = 0;
for (const rw of rowsRes) { const r = rows.find(x => x.u + offset === rw.u); if (!r) continue; cmp++; const ok = Math.abs(r.y - rw.y) <= 1 && r.vy === rw.vy && (rw.cur === 18 ? r.state === 18 : true) && r.shoe.frame === rw.shoe.frame && r.shoe.state === rw.shoe.state; if (!ok) { bad++; if (res.mismatches.length < 12) res.mismatches.push(`row u=${rw.u}: research y${rw.y} vy${rw.vy} shoe ${rw.shoe.state}/${rw.shoe.frame} vs poc y${r.y} vy${r.vy} shoe ${r.shoe.state}/${r.shoe.frame}`); } }
res.rows_compared = cmp; res.rows_mismatching = bad;
res.sample_rows = rows.slice(first12 - 2, first12 + 16);
fs.mkdirSync(path.join(root, 'verification/mghz-m2'), {recursive: true});
fs.writeFileSync(path.join(root, 'verification/mghz-m2/spring-shoes-presentation-capture.json'), JSON.stringify(res, null, 1) + '\n');
console.log(JSON.stringify({offset, contacts: res.contacts_poc, periods: res.periods_poc, rows_compared: cmp, rows_mismatching: bad, mismatches: res.mismatches.slice(0, 10)}, null, 1));
process.exit(res.mismatches.length ? 1 : 0);
