// Executes the shipped JS-compatible GML functions against ROM-generated fixtures.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({global:{},floor:Math.floor,round:Math.round,abs:Math.abs,
    min:Math.min,max:Math.max,array_create:(n,v)=>Array(n).fill(v),is_array:Array.isArray});
for(const n of ['SCR_chaos_motion_data','SCR_chaos_core_data','SCR_chaos_core'])
    vm.runInContext(fs.readFileSync(path.join(root,'scripts',n,n+'.gml'),'utf8'),ctx,{filename:n+'.gml'});
ctx.SCR_chaos_motion_data();ctx.SCR_chaos_core_data();
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'twist-fixtures.json'),'utf8'));
function core(v){return Object.assign(ctx.SCR_cc_new(200,200),v);}
function check(c,e,label){for(const [k,v] of Object.entries(e))assert.strictEqual(c[k],v,`${label}: ${k}; actual ${c[k]}, expected ${v}`);}
for(const f of data.dispatch){
    const c=core(f.initial);ctx.SCR_cc_twist_handler(c,f.handler);ctx.SCR_cc_twist_vector(c);
    check(c,f.expected,`variant ${f.variant} tile $${f.tile.toString(16)}`);
}
for(let i=0;i<data.entry.length;i++){
    const f=data.entry[i],c=core(f.initial);ctx.SCR_cc_twist_enter(c,f.initial.tile);
    check(c,f.expected,`entry ${i} ${JSON.stringify(f.initial)}`);
}
// The special state's explicit exit must request rolling without ordinary gravity/input.
const savedIds=ctx.global.chaosTileIds,savedHeaders=ctx.global.chaosHeaders0;
ctx.global.chaosTileIds=Array(4095).fill(0);ctx.global.chaosHeaders0[0]=[0,0,Array(32).fill(0),Array(32).fill(0)];
let c=core({state:34,next:34,angle:64,magnitude:96,vx:768,move:0});ctx.SCR_cc_tick(c);
assert.strictEqual(c.next,9);assert.strictEqual(c.angle,0);assert.strictEqual(c.magnitude,0);
assert.strictEqual(c.vx,768,'exit must not run ordinary horizontal movement');
ctx.global.chaosTileIds=savedIds;ctx.global.chaosHeaders0=savedHeaders;
function traverse(x,y,vx,held){
    const c=core({xu:x*256,yu:y*256,state:5,next:5,vx:vx,move:0,bg:2,contacts:2,previous:0x97,held:held});
    let entered=false;
    for(let tick=0;tick<300;tick++){
        ctx.SCR_cc_tick(c);entered=entered||c.state==34||c.next==34;
        if(entered&&c.next!=34)return {c,tick};
    }
    throw new Error(`twist traversal failed from ${x},${y} at ${vx}`);
}
const right=traverse(3060,538,1024,8),left=traverse(3340,520,-1024,4);
assert(right.c.xu/256>3350&&right.c.next==9,'rightward strip exit');
assert(left.c.xu/256<3080&&left.c.next==9,'leftward strip exit');
const report={rom_sha256:data.rom_sha256,actual_gml_executed:true,dispatch_entries:data.dispatch.length,
    entry_boundary_cases:data.entry.length,both_directions:true,
    traversal_updates:{right:right.tick+1,left:left.tick+1},rolling_exit:true,game_maker_compiled:false};
fs.writeFileSync(path.join(__dirname,'twist-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
