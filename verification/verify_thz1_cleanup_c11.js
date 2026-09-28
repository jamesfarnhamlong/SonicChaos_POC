// Minimal runtime lifecycle check for THZ1 Cleanup C1.1.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const ctx = vm.createContext({global:{}, array_create:(n,v)=>Array(n).fill(v),
    array_length:a=>a.length,
    array_copy:(dst,di,src,si,n)=>{for(let i=0;i<n;i++)dst[di+i]=src[si+i];}});
vm.runInContext(fs.readFileSync(path.join(root,'scripts','SCR_chaos_motion_data',
    'SCR_chaos_motion_data.gml'),'utf8'),ctx);

ctx.SCR_chaos_motion_data();
assert.notStrictEqual(ctx.global.chaosSourceTileIds,ctx.global.chaosTileIds);
for (let slot=0;slot<4;slot++) assert.strictEqual(ctx.global.chaosTileIds[1128+slot],71);
ctx.global.chaosTileIds[1129]=70;
assert.strictEqual(ctx.global.chaosSourceTileIds[1129],71);
ctx.SCR_chaos_motion_data();
assert.notStrictEqual(ctx.global.chaosSourceTileIds,ctx.global.chaosTileIds);
for (let slot=0;slot<4;slot++) assert.strictEqual(ctx.global.chaosTileIds[1128+slot],71);

const draw=fs.readFileSync(path.join(root,'objects','OBJ_chaos_terrain_3','Draw_0.gml'),'utf8');
const adapter=fs.readFileSync(path.join(root,'scripts','SCR_chaos_adapter','SCR_chaos_adapter.gml'),'utf8');
const controls=fs.readFileSync(path.join(root,'objects','OBJ_chaos_controls','Create_0.gml'),'utf8');
assert(draw.includes('global.chaosTileIds[1128+cp_block47] == 70'));
assert(adapter.includes('global.chaosTileIds[1128+cp_slot] = 70'));
assert(!draw.includes('chaosBlock47Broken'));
assert(!adapter.includes('chaosBlock47Broken'));
assert(!controls.includes('1128+cp_block47'));
console.log('THZ1 Cleanup C1.1 terrain lifecycle checks passed');
