// Executes the shipped SCR_chaos_box_contact against ROM ground truth ($6328 / $5FA0 run in the reference Oracle).
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'scripts/SCR_chaos_box_contact/SCR_chaos_box_contact.gml'), 'utf8'), ctx);
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'type10-contact-fixtures.json'), 'utf8'));
const [ox, oy] = fx.object, [pex, pey] = fx.player_extents, [oex, oey] = fx.object_extents;
let mismatches = 0;
for (const [dx, dy, bits] of fx.grid) {
    const got = ctx.SCR_chaos_box_contact(ox + dx, oy + dy, ox, oy, pex, pey, oex, oey);
    if (got !== bits) { mismatches++; console.log('mismatch', dx, dy, 'rom', bits, 'js', got); }
}
assert.strictEqual(mismatches, 0, 'classification must equal the ROM for every grid cell');
for (const p of fx.projection) {
    const [x, y] = ctx.SCR_chaos_box_projection(p.bits, ox + p.dx, oy + p.dy, ox, oy, pex, pey, oex, oey);
    assert.strictEqual(p.player_x, x, `projection x for ${p.dx},${p.dy}`);
    assert.strictEqual(p.player_y, y, `projection y for ${p.dx},${p.dy}`);
}
// The reported defect: a rolling side hit beside a box whose anchor is level with the player. The old code compared the
// GameMaker sprite Y with the object Y ("player below" => bottom bounce); the ROM classifies by penetration.
for (const dy of [-8, -1, 0, 6, 12]) {
    const bits = ctx.SCR_chaos_box_contact(ox + 17, oy + dy, ox, oy, pex, pey, oex, oey);
    assert.ok(bits === 4 || bits === 2 || bits === 1);
}
assert.strictEqual(ctx.SCR_chaos_box_contact(ox + 17, oy + 6, ox, oy, pex, pey, oex, oey), 4, 'below the anchor but beside the box is a SIDE contact');
assert.strictEqual(ctx.SCR_chaos_box_contact(ox - 17, oy + 6, ox, oy, pex, pey, oex, oey), 8);
assert.strictEqual(ctx.SCR_chaos_box_contact(ox + 2, oy + 10, ox, oy, pex, pey, oex, oey), 2, 'directly underneath is a bottom contact');
assert.strictEqual(ctx.SCR_chaos_box_contact(ox + 2, oy - 10, ox, oy, pex, pey, oex, oey), 1, 'directly above is a top contact');
console.log(`TYPE-10 CONTACT CHECKS PASSED (${fx.grid.length} ROM grid cells, ${fx.projection.length} projections)`);
