// Execute the shipped Task-06 core paths against the reviewed reference cache.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({global:{},floor:Math.floor,round:Math.round,abs:Math.abs,
    min:Math.min,max:Math.max,array_create:(n,v)=>Array(n).fill(v),is_array:Array.isArray});
for(const n of ['SCR_chaos_motion_data','SCR_chaos_core_data','SCR_chaos_core'])
    vm.runInContext(fs.readFileSync(path.join(root,'scripts',n,n+'.gml'),'utf8'),ctx,{filename:n+'.gml'});
ctx.SCR_chaos_motion_data();ctx.SCR_chaos_core_data();
const cache=JSON.parse(fs.readFileSync(path.join(root,'POC_notes','rom-cache','windows-discrepancies.json'),'utf8'));
assert.strictEqual(cache.rom_sha256,'eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607');

// Empty terrain isolates state-$11 control while executing the real shared path.
const savedTiles=ctx.global.chaosTileIds;
ctx.global.chaosTileIds=Array(4095).fill(0);
const entry=ctx.SCR_cc_new(200,100);
Object.assign(entry,{vx:321,vy:-654,maximum:1024,next:9,move:66});
ctx.SCR_cc_state11_enter(entry);
assert.deepStrictEqual([entry.vx,entry.vy,entry.maximum,entry.next,entry.move,
    entry.state11_frame],[0,0,0x700,0x11,0,0x38]);
function state11(v={}){
    return Object.assign(ctx.SCR_cc_new(200,100),{state:17,next:17,move:1,
        state11_active:true,state11_camera_y:0,maximum:0x700},v);
}
function tick(v){const c=state11(v);ctx.SCR_cc_tick(c);return c;}
assert.strictEqual(tick({held:0,vy:0x100}).vy,0xE0);
assert.strictEqual(tick({held:0,vy:-0x100}).vy,-0xE0);
assert.strictEqual(tick({held:1,vy:0}).vy,-0x40);
assert.strictEqual(tick({held:2,vy:0}).vy,0x40);
assert.strictEqual(tick({held:1,vy:-0x300}).vy,-0x400);
assert.strictEqual(tick({held:2,vy:0x300}).vy,0x400);
const left=tick({held:4,vx:0}),right=tick({held:8,vx:0});
assert(left.vx<0 && right.vx>0,'state $11 must retain shared horizontal input');
assert(Math.abs(left.vx)<=0x700 && Math.abs(right.vx)<=0x700);
const action=tick({pressed:16,held:16});
assert.strictEqual(action.next,17,'action must not enter ordinary jump/roll');
const top=tick({yu:23*256,vy:0});
assert.strictEqual(top.yu,25*256);assert.strictEqual(top.vy,0);
const bottom=tick({yu:192*256,vy:0});
assert.strictEqual(bottom.yu,191*256);assert.strictEqual(bottom.vy,0);
const expired=state11({state11_active:false,vy:0});ctx.SCR_cc_tick(expired);
assert.strictEqual(expired.next,14);assert.strictEqual(expired.vy,0x100);
assert.strictEqual(expired.move&1,1);
const animation=state11({vy:0});const frames=[];
for(let i=0;i<24;i++){ctx.SCR_cc_tick(animation);frames.push(animation.state11_frame);}
assert.deepStrictEqual(frames,[...Array(8).fill(0x38),...Array(4).fill(0x39),
    ...Array(8).fill(0x3A),...Array(4).fill(0x39)]);
ctx.global.chaosTileIds=savedTiles;

// All four block-$3D cells use extent 0 above the local-Y 16 split and
// extent 32 below it. Exercise both horizontal edges through actual GML.
const cells=[1504,1536,2208,2240],ys=[14,15,16,17],xs=[0,1,30,31];
let spikeCases=0;
for(const cellX of cells)for(const localY of ys)for(const localX of xs){
    const s=ctx.SCR_cc_lookup(cellX+localX,832+localY,0);
    assert.strictEqual(s.tile,0x3D);assert.strictEqual(s.flags,0x85);
    assert.strictEqual(s.vertical,16);
    assert.strictEqual(s.horizontal,localY<16?0x40:0x60);
    for(const rightSide of [false,true]){
        const c=ctx.SCR_cc_new(cellX+localX,832+localY);
        const projected=ctx.SCR_cc_project_side(c,s,rightSide);
        assert.strictEqual(projected,localY>=16);
        spikeCases++;
    }
}
let floor=ctx.SCR_cc_new(1504,830);
Object.assign(floor,{state:5,next:5,previous:0x85,bg:0,player_flags:0});
ctx.SCR_cc_floor(floor);assert.strictEqual(floor.yu/256,830); // anchor => feet at Y 848
assert.strictEqual(floor.bg&2,2);assert.strictEqual(floor.hazard,1);
let sideOnly=ctx.SCR_cc_new(1504,820);
Object.assign(sideOnly,{state:5,next:5,previous:0,bg:0,player_flags:0});
const sideSample=ctx.SCR_cc_lookup(1504,848,0);
ctx.SCR_cc_project_side(sideOnly,sideSample,true);
assert.strictEqual(sideOnly.hazard,0,'side projection alone must not request damage');

const report={rom_sha256:cache.rom_sha256,state_11:{entry_verified:true,entry_timer:300,vertical_cases:6,
    shared_horizontal:true,action_suppressed:true,viewport_bounds:true,
    expiry_state:14,expiry_vy_8_8:0x100,animation_frames:frames},
    static_spikes:{cells:cells.length,profile_projection_cases:spikeCases,
        upper_half_side_solid:false,lower_half_side_solid:true,floor_hazard:true}};
fs.writeFileSync(path.join(__dirname,'task06-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
