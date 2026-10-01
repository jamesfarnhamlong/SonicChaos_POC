// Executes the shipped act-table helpers (chaos_acts / clamp / step / progress) with stub room ids.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'scripts/SCR_chaos_level/SCR_chaos_level.gml'), 'utf8');
const start = src.indexOf('function chaos_acts()');
const ctx = vm.createContext({ROM_chaos_thz1: 'thz1', ROM_chaos_thz2: 'thz2', clamp: (v, a, b) => Math.min(Math.max(v, a), b),
    max: Math.max, array_length: a => a.length});
const acts = src.slice(start).replace(/\bmod\b/g, '%');
vm.runInContext(acts.slice(0, acts.indexOf('/// 1-based chaos_acts() index')), ctx);
const count = ctx.chaos_act_count();
assert.strictEqual(count, 2);
assert.deepStrictEqual([1, 2].map(i => ctx.chaos_act_entry(i).room), ['thz1', 'thz2']);
// nothing resolves outside the table
for (const code of [-5, 0, 1, 2, 3, 99]) {
    const clamped = ctx.chaos_act_clamp(code);
    assert.ok(clamped >= 1 && clamped <= count);
    assert.ok(ctx.chaos_act_entry(code).room);
}
assert.strictEqual(ctx.chaos_act_clamp(3), 2); assert.strictEqual(ctx.chaos_act_clamp(0), 1);
// Up/Down wrap
assert.strictEqual(ctx.chaos_act_step(1, 1), 2); assert.strictEqual(ctx.chaos_act_step(2, 1), 1);
assert.strictEqual(ctx.chaos_act_step(1, -1), 2); assert.strictEqual(ctx.chaos_act_step(3, 1), 1);
// progression: monotonic, clamped to the last entry
assert.strictEqual(ctx.chaos_act_progress(1, 1), 2);
assert.strictEqual(ctx.chaos_act_progress(2, 2), 2, 'finishing the last act stays on the last act');
assert.strictEqual(ctx.chaos_act_progress(2, 1), 2, 'replaying an earlier act never lowers progress');
assert.strictEqual(ctx.chaos_act_progress(7, 1), 2, 'stale out-of-table save clamps');
console.log('LEVEL SELECT ACT TABLE CHECKS PASSED');
