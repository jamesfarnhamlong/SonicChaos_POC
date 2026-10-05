// Paired ordinary-Sonic trace: runs the SAME input script through the shipped GML of a given tree root (accepted M1.1 base vs current M2) and prints a row per update:
// world X/Y, state/requested state, X/Y speed, move/bg/contact flags, foot block/modifier/surface kind. Usage: node trace_mghz_slope.js <treeRoot> <act> <startX> <startY> <frames> [jumpEvery]
const path = require('path');
const root = path.resolve(process.argv[2]);
const {loadHost} = require(path.join(root, 'verification/chaos_world_harness.js'));
const [act, sx, sy, n, jump, left] = process.argv.slice(3).map(Number);
const h = loadHost(null);
// loadHost(null) reads the harness' own tree (its __dirname root), which is the tree being traced
const c = h.ctx, g = h.g, w = h.world;
c.room = c[`ROM_chaos_mghz${act}`]; c.chaos_level_install_layout(); g.chaosMghzEffects = c.chaos_mghz_effect_new(); h.reset(); w.cam.w = 256;
const p = h.newPlayer(sx, sy, {state: 14, move: 1});
const k = p.chaosCore, rows = [];
for (let i = 0; i < n; i++) {
    g.chaosMghzEffects.frame++;
    h.frame({right: !left, left: !!left, jump: !!jump && i % jump < 3, jumpPress: !!jump && i % jump === 0});
    rows.push([i, Math.floor(k.xu / 256), (k.yu / 256).toFixed(2), k.state, k.next, k.vx, k.vy, k.move, k.bg, k.contacts, k.tile, k.modifier, k.previous, k.angle, k.special, k.anim ? k.anim.cur : -1, k.anim ? k.anim.t : -1].join(','));
}
console.log(rows.join('\n'));
