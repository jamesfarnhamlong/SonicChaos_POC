const fs=require('fs'),assert=require('assert');let checks=0;const yes=(v,m)=>{assert(v,m);checks++};
const {loadHost}=require('./chaos_world_harness'); const h=loadHost(),c=h.ctx,g=h.g,w=h.world;
function run(W,x){h.reset();c.room=c.ROM_chaos_aqz3;w.roomWidth=2560;w.roomHeight=512;w.follow=false;w.cam={x:1727,y:78,w:W,h:196};c.chaos_level_install_layout();const b=c.chaos_59_new(),s=c.chaos_59_slot(89,0,1856,141,1);g.chaosAqz59=b;Object.assign(b,{active:true,camera_mode:3,pan_x:1728,pan_y:78});Object.assign(s,{state:14,requested:14,counter:16,keep:true,frame:10,ex:20,ey:32});g.chaosS2.slots[7]=s;const k=c.SCR_cc_new(1727+x,238);k.state=1;k.move=0;k.bg=2;k.contacts=2;const vp=c.chaos_vp_current();c.chaos_59_salvo_begin(s,k,vp);let hits=[],launch=[],allocations=[],old=c.chaos_59_damage_contact,cb=c.chaos_59_callback,alloc=c.chaos_59_alloc;c.chaos_59_alloc=function(b,p,t,pa,x,y,d){const slot=alloc(b,p,t,pa,x,y,d);if(t===92)allocations.push([b.tick,pa,x,y,slot]);return slot;};c.chaos_59_damage_contact=function(a,k,p){let z=old(a,k,p);if(a.type===92&&z)hits.push([b.tick,a.parameter,c.chaos_59_x(a)-1727,c.chaos_59_y(a)]);return z;};c.chaos_59_callback=function(b,p,a,pc,k,pr,v){cb(b,p,a,pc,k,pr,v);if(a.type===92&&pc===0xADBE&&a.requested===5)launch.push([b.tick,a.parameter,a.salvo_target-1727,a.salvo_bias]);};for(let u=0;u<1100;u++){k.move=0;k.hurt_request=0;c.chaos_59_tick(b,g.chaosS2,vp,k,true);}c.chaos_59_damage_contact=old;c.chaos_59_callback=cb;c.chaos_59_alloc=alloc;return {x,hits,launch,allocations,state:s.state,counter:s.counter};}

const report={rows:[],actualPlayer:[]};
for(let x=16;x<=339;x++){
 const r=run(348,x);for(let cycle=0;cycle<3;cycle++)yes(r.hits.some(a=>a[0]>=65+342*cycle&&a[0]<65+342*(cycle+1)),`parked X${x} threatened in upper cycle${cycle}`);
 const real=r.launch.filter(a=>a[0]===65&&a[1]<6);yes(real.length===6,'six real paths plus unchanged parameter6 sentinel');
 yes(new Set(real.map(a=>a[2])).size===6,'distinct targets');yes(real[0][2]>=16&&real[5][2]<=339,'clamped 256px window');
 report.rows.push({x,firstHit:r.hits[0],window:[real[0][2],real[5][2]],allocations:r.allocations.slice(0,7)});
}
for(const W of [256,348]){
 const r=run(W,176);report['clock'+W]={alloc:r.allocations,launch:r.launch.map(a=>a.slice(0,2))};
}
yes(JSON.stringify(report.clock256)===JSON.stringify(report.clock348),'allocation timing, parameter order, repeating state cadence unchanged');
for(const W of [256,348])for(let param=0;param<7;param++){
 const vp=c.chaos_vp_new(1727,78,W,196),pool={slots:Array.from({length:19},()=>c.chaos_s2_slot())},b=c.chaos_59_new(),k=c.SCR_cc_new(1743,238),parent=c.chaos_59_slot(89,0,1856,141,0);pool.slots[7]=parent;parent.field23=255;c.chaos_59_salvo_begin(parent,k,vp);
 k.xu=(1727+339)*256; // moving before delayed re-entry must not move the selected band
 const a=c.chaos_59_slot(92,param,1856,109,0);a.saved_request=128;c.chaos_59_callback(b,pool,a,0xADBE,k,true,vp);
 if(W===348&&param<6){const floor=JSON.parse(JSON.stringify(a));floor.cooldown=4;let n=0;for(;n<1024&&floor.yu<238*256;n++)c.chaos_59_callback(b,pool,floor,0xAE3B,k,false,vp);yes(Math.abs(floor.xu/256-floor.salvo_target)<1,'derived floor target reached with subpixel rounding error');}
 const copy=JSON.parse(JSON.stringify(a));k.xu=(1727+339)*256;
 for(let u=0;u<200;u++){c.chaos_59_callback(b,pool,a,0xAE3B,k,false,vp);k.xu=1743*256;c.chaos_59_callback(b,pool,copy,0xAE3B,k,false,vp);k.xu=(1727+339)*256;yes(JSON.stringify([a.xu,a.yu,a.vx,a.vy,a.angle])===JSON.stringify([copy.xu,copy.yu,copy.vx,copy.vy,copy.angle]),'launched shot never retargets');}
 if(W===348&&param<6)yes(a.salvo_target===1727+16+[0,56,112,152,192,256][param],'salvo window independent of player movement after beginning');
}
// Same seven vertical curves, delays, angle cadence and completion requests.
for(let param=0;param<7;param++){
 const states=[];
 for(const W of [256,348]){
  const vp=c.chaos_vp_new(1727,78,W,196),pool={slots:Array.from({length:19},()=>c.chaos_s2_slot())},b=c.chaos_59_new(),k=c.SCR_cc_new(1743,238),a=c.chaos_59_slot(92,param,1856,109,0),parent=c.chaos_59_slot(89,0,1856,141,0);pool.slots[7]=parent;parent.field23=255;a.saved_request=128;c.chaos_59_salvo_begin(parent,k,vp);c.chaos_59_callback(b,pool,a,0xADBE,k,false,vp);const rows=[];
  for(let u=0;u<320;u++){c.chaos_59_callback(b,pool,a,u<=c.chaos_59_parameters()[param][4]?0xAE27:0xAE3B,k,false,vp);rows.push([a.yu,a.vy,a.angle,a.field38,a.requested]);}
  states.push(rows);
 }
 yes(JSON.stringify(states[0])===JSON.stringify(states[1]),'vertical timing/angle/requests preserved for every parameter including6');
}
// Ordinary stationary player, shipped core/terrain/object scheduler and real hurt.
for(const x of [16,48,80,112,176,240,272,304,339]){
 h.reset();c.room=c.ROM_chaos_aqz3;w.roomWidth=2560;w.roomHeight=512;w.follow=false;w.cam={x:1727,y:78,w:348,h:196};c.chaos_level_install_layout();
 const b=c.chaos_59_new(),s=c.chaos_59_slot(89,0,1856,141,1);g.chaosAqz59=b;Object.assign(b,{active:true,camera_mode:3,pan_x:1728,pan_y:78});Object.assign(s,{state:14,requested:14,counter:16,keep:true,frame:10,ex:20,ey:32});g.chaosS2.slots[7]=s;
 const p=h.newPlayer(1727+x,238,{state:1,move:0,bg:2,contacts:2});c.chaos_59_salvo_begin(s,p.chaosCore,c.chaos_vp_current());let u=0;for(;u<700&&!p.dead;u++)h.frame({});yes(p.dead,'no-input ordinary player threatened by real upper phase');report.actualPlayer.push({x,deathUpdate:u});
}
report.assertions=checks;report.status='PASS';fs.mkdirSync('build/aqz-p4-h',{recursive:true});fs.writeFileSync('build/aqz-p4-h/salvo-results.json',JSON.stringify(report,null,2));console.log({checks,stationaryPositions:324,cycles:3,ordinaryPlayers:9});
