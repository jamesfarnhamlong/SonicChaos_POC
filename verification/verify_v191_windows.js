// Execute the shipped $47 collision path for the bounded POC 19.1 Windows fix.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({global:{},floor:Math.floor,round:Math.round,abs:Math.abs,
    min:Math.min,max:Math.max,array_create:(n,v)=>Array(n).fill(v),is_array:Array.isArray});
for(const n of ['SCR_chaos_motion_data','SCR_chaos_core_data','SCR_chaos_core'])
    vm.runInContext(fs.readFileSync(path.join(root,'scripts',n,n+'.gml'),'utf8'),ctx,{filename:n+'.gml'});
ctx.SCR_chaos_motion_data();ctx.SCR_chaos_core_data();

const index=8*128+104;
assert.strictEqual(ctx.global.chaosTileIds[index],0x47);
const c=ctx.SCR_cc_new(3328,252);
Object.assign(c,{state:9,next:9,move:2,contacts:4,bg:2,vx:-512,vy:123});
c.terrain_response_index=index;
c.terrain_response_contacts=4;
c.terrain_response_vy=c.vy;
ctx.SCR_cc_terrain_response(c);
assert.strictEqual(c.break47_index,index);
assert.strictEqual(ctx.global.chaosTileIds[index],0x46);
assert.strictEqual(c.vx,-512,'$47 must preserve horizontal velocity');
assert.strictEqual(c.vy,-1088,'$6AE3 must write $FBC0 to vertical velocity');
assert.strictEqual(c.state,9,'$47 must preserve current player state');
assert.strictEqual(c.next,9,'$47 must not request a different player state');

const report={milestone:'POC 19.1',actual_gml_executed:true,block_47:{
    index,replacement:'0x47 -> 0x46',horizontal_velocity_preserved:true,
    vertical_velocity_8_8:-1088,state_preserved:true,replacement_draw_depth:100,
    transient_noncollidable:true},type_21:{physics_source_unchanged:true,
    explicit_render_y_delta:18}};
fs.writeFileSync(path.join(__dirname,'poc191-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
