// Executes the shipped OBJ_chaos_object_10 Step event (contact section) with stubbed GameMaker state, for every reward variant.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const hex = t => t.replace(/(?<![\w"])\$([0-9A-Fa-f]+)/g, '0x$1');
const step = fs.readFileSync(path.join(root, 'objects/OBJ_chaos_object_10/Step_0.gml'), 'utf8');
const body = hex(step.slice(step.indexOf('var cp_p = instance_find'))).replace(/\bexit;/g, 'return;');
const contactSrc = fs.readFileSync(path.join(root, 'scripts/SCR_chaos_box_contact/SCR_chaos_box_contact.gml'), 'utf8');
function scenario(param, opts) {
    const rewards = [];
    const player = {x: 0, y: 0, chaosAnchorOffset: 0, object_index: opts.spin ? 'spin' : 'char', chaosBoxContacts: 0,
        chaosCore: {xu: opts.px * 256, yu: opts.py * 256, vx: opts.vx || 0, vy: opts.vy === undefined ? 1792 : opts.vy,
                    state: opts.state || 9, next: opts.next || opts.state || 9, contacts: 0}};
    const ctx = vm.createContext({global: {playerJump: !!opts.jump, playerSpinDash: false}, floor: Math.floor,
        instance_find: () => player, instance_exists: () => true, OBJ_player: 1, OBJ_player_char_spin: 'spin',
        SCR_chaos_core_attach: () => {}, variable_instance_exists: (o, k) => k in o, SCR_chaos_type10_reward: (p) => rewards.push(p), SCR_chaos_enemy_score_100_bytes: () => {},
        SPR_chaos_object_0F: 'spr0f'});
    vm.runInContext(contactSrc, ctx);
    const box = {x: 500, y: 500, chaosParameter: param, chaosState: 2, chaosVY: 0, chaosConsumed: false, chaosActive: true,
                 chaosReplaceTick: 0, sprite_index: 'x', image_index: 0, visible: true};
    ctx.box = box; ctx.player = player;
    vm.runInContext(`(function(){ with (box) { ${body} } })()`, ctx);
    return {box, player, rewards};
}
const VARIANTS = [2, 3, 4, 6];  // every reward variant must produce identical physical outcomes
for (const p of VARIANTS) {
    // rolling side impact from the right / left, level with the box's lower half (the reported case)
    for (const [px, py] of [[517, 506], [483, 506], [517, 500], [483, 492]]) {
        const r = scenario(p, {px, py, spin: true, state: 9, vy: 1792});
        assert.strictEqual(r.box.chaosConsumed, true, `param ${p} side ${px},${py} breaks`);
        assert.strictEqual(r.box.chaosState, 2, 'box must not jump on a side hit');
        assert.deepStrictEqual(r.rewards, [p], 'reward runs once, after the break decision');
        assert.strictEqual(r.player.chaosCore.xu / 256, px > 500 ? 518 : 482, 'Sonic is pushed out, never through');
        assert.strictEqual(r.player.chaosCore.vy, 1792, 'rolling (state 9) keeps its Y velocity');
    }
    // non-attacking side contact: solid, no break, no box motion
    const w = scenario(p, {px: 512, py: 500, spin: false, jump: false, state: 5});
    assert.strictEqual(w.box.chaosConsumed, false); assert.strictEqual(w.box.chaosState, 2); assert.deepStrictEqual(w.rewards, []);
    assert.strictEqual(w.player.chaosCore.xu / 256, 518, 'non-attacking Sonic is blocked, not phased through');
    assert.strictEqual(w.player.chaosBoxContacts, 128, 'blocked-leftwards flag for the next update');
    // top attack
    const t = scenario(p, {px: 500, py: 490, spin: true, jump: true, state: 10, vy: 512});
    assert.strictEqual(t.box.chaosConsumed, true); assert.strictEqual(t.player.chaosCore.vy, -1024, 'top break bounce');
    // bottom attack bounces the box, never breaks it
    const b = scenario(p, {px: 500, py: 512, spin: true, state: 10, vy: -512});
    assert.strictEqual(b.box.chaosConsumed, false); assert.strictEqual(b.box.chaosState, 3); assert.strictEqual(b.box.chaosVY, -512);
    assert.strictEqual(b.player.chaosCore.vy, 512);
    // side hit while moving upward: no break (Y velocity must be downward)
    const u = scenario(p, {px: 517, py: 500, spin: true, state: 9, vy: -256});
    assert.strictEqual(u.box.chaosConsumed, false);
    // rejected requested states on top contact
    const j = scenario(p, {px: 500, py: 490, spin: true, jump: true, state: 10, next: 0x0F, vy: 512});
    assert.strictEqual(j.box.chaosConsumed, false);
}
console.log('TYPE-10 STEP EVENT CHECKS PASSED (variants ' + VARIANTS.join(',') + ')');
