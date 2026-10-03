const assert=require('assert'),fs=require('fs'),path=require('path');
const {loadHost,root}=require('./chaos_world_harness');
const h=loadHost(null),c=h.ctx;
let checks=0;
for(const move of [2,3,0x82,0x83])for(const bg of [0,2])for(const contacts of [0,2,6,10])for(const vy of [-1792,-672,0,864,1792])for(const [dx,dy] of [[-28,0],[28,0],[0,24]]){
 const b=c.chaos_boss_new(),p=c.SCR_cc_new(1936+dx,238+dy);
 Object.assign(p,{state:9,next:9,move,bg,contacts,vy,vx:979});
 assert.equal(c.chaos_boss_contact(b,p,true),3);
 assert.deepStrictEqual([p.move,p.bg,p.contacts,p.state,p.next],[move,bg,contacts,9,27]);
 assert.equal(p.vy,dy===24?1536:-vy);assert.equal(p.vx,dx===0?979:dx<0?-1536:1536);checks++;
}
// Full next player movement/terrain update of a grounded roll: negate +7,
// preserve floor, then +7 override projects back to the arena floor.
c.room=c.ROM_chaos_thz3;c.chaos_level_install_layout();
for(const move of [2,3]){
 const b=c.chaos_boss_new();b.xu=1897*256;
 const p=c.SCR_cc_new(1869,238);Object.assign(p,{state:9,next:9,move,bg:move===2?2:0,contacts:move===2?2:0,vy:1792,vx:979,previous:0x81});
 c.chaos_boss_contact(b,p,true);assert.equal(p.vy,-1792);
 c.SCR_cc_tick(p);
 if(move===2){assert.equal(p.yu/256,238);assert.equal(p.vy,1792);assert(p.bg&2);}
 else {assert(p.yu/256<238);assert.equal(p.vy,-1756);}
 checks++;
}
for(const move of [0,2,3,0x41,0x81]){
 const b=c.chaos_boss_new(),p=c.SCR_cc_new(1936,190);Object.assign(p,{move,bg:2,contacts:2,vy:48});
 assert.equal(c.chaos_boss_contact(b,p,true),2);assert.equal(b.hp,8);
 assert.deepStrictEqual([p.vy,p.next,p.move,p.bg,p.contacts],[-1024,11,(move|1)&~2,0,0]);checks++;
}
const o=h.newInstance('OBJ_chaos_object_27',512,200);
assert.equal(o.image_xscale,1);
console.log('THZ CLOSURE PASS: '+checks+' grounded/airborne/side/below/top contacts; bee draw scale 1');
