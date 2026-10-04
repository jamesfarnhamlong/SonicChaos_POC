// Focused trace: vertical retirement of lost rings above the camera top. Canonical: anchor Y >= camY-32 stays; camY-96 <= Y < camY-32 is deferred (deleted on the NEXT update); Y < camY-96 deleted at once.
const {loadHost} = require('./chaos_world_harness.js');
const h = loadHost(null), ctx = h.ctx, g = h.g, cam = h.world.cam;
g.chaosTileIds = Array(4095).fill(0); g.chaosBeyondMapOpen = false;
const camY = 500, camX = 872;
for (const w of [256, 640]) for (const [token, hurtScreenY] of [[0, 20], [1, 20], [0, 60], [3, 10]]) {
  cam.x = camX; cam.y = camY; cam.w = w; cam.h = 192;
  const r = ctx.chaos_lr_new(token, camX + w / 2, camY + hurtScreenY), rows = []; let end = null, maxUp = 1e9;
  for (let u = 0; u < 400 && !end; u++) {
    const ev = ctx.chaos_lr_step(r, false, 0, 0, ctx.chaos_vp_current()); const y = ctx.chaos_lr_pixel_y(r), rel = y - camY;
    maxUp = Math.min(maxUp, rel); rows.push([u, rel, r.bit6, r.alive]);
    if (!r.alive) end = [ev, u, rel];
  }
  // independent expectation from the canonical rule: first update whose rel < -32 sets the flag (alive); the following update deletes (or rel < -96 deletes at once)
  let exp = null, flagged = false;
  const r2 = ctx.chaos_lr_new(token, camX + w / 2, camY + hurtScreenY);
  const rel2 = []; for (let u = 0; u < 400; u++) { ctx.chaos_lr_step(r2, false, 0, 0, ctx.chaos_vp_current()); rel2.push(ctx.chaos_lr_pixel_y(r2) - camY); if (!r2.alive) break; }
  for (let u = 1; u < rel2.length + 1 && !exp; u++) { const rel = rel2[u]; if (flagged) { exp = ['offscreen_bit6', u]; break; } if (rel < -96) { exp = ['offscreen_delete', u]; break; } if (rel < -32) flagged = true; }
  const firstBelow32 = rows.find(x => x[1] < -32), firstVisibleTopCross = rows.find(x => x[1] < 0);
  console.log(`w=${w} token ${token} hurt at screen y ${hurtScreenY}: crosses camera top at u=${firstVisibleTopCross?.[0]} (still alive: ${firstVisibleTopCross?.[3]}); first rel<-32 at u=${firstBelow32?.[0]} (rel ${firstBelow32?.[1]}); removed ${JSON.stringify(end)} min rel ${maxUp}; expected ${JSON.stringify(exp)}`);
  if (JSON.stringify([end[0], end[1]]) !== JSON.stringify(exp)) { console.log('MISMATCH'); process.exit(1); }
  if (!(maxUp < -32)) { console.log('never left the band?'); }
}
console.log('canonical vertical boundary confirmed');
