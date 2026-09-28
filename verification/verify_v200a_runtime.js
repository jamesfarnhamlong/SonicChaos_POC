// Diagnostic POC 20.0A: exercise the shipped left-face $47 side path.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({global:{},floor:Math.floor,round:Math.round,abs:Math.abs,
    min:Math.min,max:Math.max,array_create:(n,v)=>Array(n).fill(v),is_array:Array.isArray});
for(const n of ['SCR_chaos_motion_data','SCR_chaos_core_data','SCR_chaos_core'])
    vm.runInContext(fs.readFileSync(path.join(root,'scripts',n,n+'.gml'),'utf8'),ctx,{filename:n+'.gml'});
ctx.SCR_chaos_motion_data();ctx.SCR_chaos_core_data();

// Rolling right into the left face of the first canonical block at 3328,256.
// Anchor y=270 places the side probe in its lower solid half.
const c=ctx.SCR_cc_new(3318,270);
Object.assign(c,{state:9,next:9,move:2,vx:512,vy:0,contacts:0,bg:0,held:8,
    terrain_response_index:-1,terrain_response_contacts:0,terrain_response_vy:0});
ctx.SCR_cc_shared(c);
const detected={index:c.break47_index,contacts:c.terrain_response_contacts,
    contact_right:c.debug_contact_right,x:c.xu/256,bg:c.bg,tile:c.debug_terrain_block_id,
    response:c.debug_terrain_response};
if (detected.index < 0) console.log(JSON.stringify({failed_trace:detected,state:c.state,next:c.next,
    move:c.move,vx:c.vx,vy:c.vy,contacts:c.contacts,previous:c.previous},null,2));
assert.strictEqual(detected.index,8*128+104);
assert.strictEqual(detected.contact_right,true,'right-hand sensor must record the block left face');
assert.strictEqual(detected.response,2,'post-sensor response must run');
assert.strictEqual(ctx.global.chaosTileIds[detected.index],0x46);
assert.strictEqual(c.break47_index,detected.index);
assert.strictEqual(c.vx,508); // post-input velocity is preserved by the response
assert.strictEqual(c.vy,-1088);
console.log(JSON.stringify({build:'POC20-A TASK09',left_side_trace:detected,
    response:{tile:ctx.global.chaosTileIds[detected.index],break_index:c.break47_index,
        vx:c.vx,vy:c.vy,state:c.state}},null,2));
