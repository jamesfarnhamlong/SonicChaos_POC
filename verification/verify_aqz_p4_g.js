const fs=require('fs'),vm=require('vm'),assert=require('assert'),{loadHost,hex,root}=require('./chaos_world_harness');
let checks=0;const eq=(a,b,m)=>{assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;},yes=(a,m)=>{assert(a,m);checks++;};
const h=loadHost(),c=h.ctx,w=h.world,g=h.g,bounds=require('./aqz-p4/5a-visible-bounds.json');const report={widths:[],jumps:[],projectiles:[],intro:[]};
for(const W of [256,348]){
 const vp=c.chaos_vp_new(1727,78,W,W===348?196:192);
 eq([c.chaos_goal_clamp_player(vp,0,-1).xu/256-1727,c.chaos_goal_clamp_player(vp,9999999,1).xu/256-1727],[16,W-9],'full-width shared player envelope');
 for(let x=16;x<=W-9;x++)eq(c.chaos_goal_clamp_player(vp,(1727+x)*256,256).hit,false,'no interior wall');
 for(let sx=-128;sx<=W+128;sx++)for(let vx of [-160,0,160]){
  const canonical=(vx<0&&(sx&255)<48)||(vx>=0&&(sx&255)>=208);
  eq(c.chaos_59_patrol_stop({sx,vx,xu:(1727+sx)*256,view_dx:0},vp),W===256?canonical:(vx<0&&sx<45)||(vx>=0&&sx>=311),'explicit patrol targets / no wide byte wrap');
 }
 report.widths.push({width:W,player:[16,W-9],route_limits:[47,W===256?208:311]});
}
// Full source slot scripts while a one-pixel pan finishes. Entry translation is fixed once.
for(const W of [256,348])for(const start of [1444,1540,1696,1727]){
 h.reset();c.room=c.ROM_chaos_aqz3;w.roomWidth=2560;w.roomHeight=512;w.follow=false;w.cam={x:start,y:138,w:W,h:W===348?196:192};c.chaos_level_install_layout();
 let b=c.chaos_59_new(),pool={slots:Array.from({length:19},()=>c.chaos_s2_slot())},k=c.SCR_cc_new(0,238);k.move=64;g.chaosAqz59=b;Object.assign(b,{active:true,camera_mode:3,pan_x:1728,pan_y:78,camera_owned:true});
 h.newPlayer(1743,238,{state:1,move:0,bg:2});let first=[],settled=-1,translations={},source=[];
 for(let u=0;u<1000;u++){
  if(u<384&&u%64===0)pool.slots[8+u/64]=c.chaos_59_slot(90,0,1856,238,0);
  let vp=c.chaos_vp_current();
  for(let i=8;i<14;i++){
   let s=pool.slots[i];if(!s.type)continue;c.chaos_59_visit(b,pool,i,k,true,vp);
   if(translations[i]===undefined){translations[i]=s.view_dx;eq(c.chaos_59_x(s),2048,'canonical child initializer WORLD anchor');}else eq(s.view_dx,translations[i],'no live translation/rebase');
   source.push([u,i,s.xu,s.yu,s.vx,s.vy,s.state,s.requested,s.counter]);
  }
  c.chaos_59_camera_step();vp=c.chaos_vp_current();
  if(settled<0&&vp.left===1727&&vp.top===78)settled=u;
  for(let i=8;i<14;i++){
   let s=pool.slots[i];if(!s.type||!s.frame||s.asleep||(W>256&&!b.intro_ready)||first.some(f=>f.slot===i))continue;
   let [min,max]=bounds[s.frame],sx=c.chaos_59_view_x(s)-vp.left;
   if(sx+min<W&&sx+max>=0){first.push({slot:i,u,camera:vp.left,left:sx+min});if(W>256){yes(u>=settled+16,'stable camera pause before first visibility');eq(vp.left,1727,'entry only after settled camera');eq(sx+min,W-1,'first opaque column enters at extreme right');}}
  }
 }
 eq(first.length,6,'all six children enter');
 const key='source'+start;if(W===256)global[key]=source;else eq(source,global[key],'source timing and trajectory identical at both widths');
 report.intro.push({width:W,start,settled,translation:translations,first});
 // Fixed wide camera throughout the real $20 run-off, no wall or moved world.
 const boss=c.chaos_59_slot(89,0,1856,238,1);boss.limit_right=2304;k.contacts=2;
 c.chaos_59_viewport_callback(b,pool,boss,0x81BD,k,true,c.chaos_vp_current());
 eq([k.next,boss.type,boss.parameter],[32,15,0],'canonical clear sequencing');
 if(W===256)eq(b.camera_right,2304,'canonical right limit');
 else {
  const p=w.player,core=p.chaosCore;core.state=core.next=32;core.move=0;core.xu=1856*256;core.yu=238*256;p.x=1856;p.y=243;p.chaosCoreLastX=p.x;p.chaosCoreLastY=p.y;
  for(let u=0;u<180;u++){h.frame({});c.chaos_59_camera_step();eq([w.cam.x,w.cam.y],[1727,78],'wide clear camera stationary');yes(w.cam.x<=2560-W,'no beyond-world view');if(core.act_clear)break;}
  yes(core.act_clear,'existing state20 clears');yes(core.xu/256>=1727+W+33,'full EDGE(RIGHT,+33) run');
 }
}
const contactOracle=[];let captureContact=false;
const contactCore=c.chaos_59_combat_contact;
c.chaos_59_combat_contact=function(b,s,k,present,vp){
 const before={s:JSON.parse(JSON.stringify(s)),k:JSON.parse(JSON.stringify(k)),present};
 const bits=contactCore(b,s,k,present,vp);
 if(captureContact)contactOracle.push({before,after:{hp:s.hp,cooldown:s.cooldown,vx:k.vx,vy:k.vy,next:k.next}});
 return bits;
};
// Honest one-button jump episodes through shipped player physics and slot scheduler.
for(const W of [256,348])for(const routeStart of [0,1,2])for(const side of [-1,1])for(const dist of [28,40,64,96])for(const hold of [1,14,240]){
 h.reset();c.room=c.ROM_chaos_aqz3;w.roomWidth=2560;w.roomHeight=512;w.follow=false;w.cam={x:1727,y:78,w:W,h:W===348?196:192};c.chaos_level_install_layout();
 const b=c.chaos_59_new();g.chaosAqz59=b;Object.assign(b,{active:true,camera_mode:3,pan_x:1728,pan_y:78,camera_left:1727,camera_right:1728});
 const bossStart=[47,129,W-48][routeStart],origin=1727+bossStart;
 const s=c.chaos_59_slot(89,0,origin,238,1);Object.assign(s,{state:9,requested:9,frame:2,ex:20,ey:64,hp:10,counter:255,keep:true,sx:bossStart,vx:side===-1?-160:160,vy:-1536});g.chaosS2.slots[7]=s;
 captureContact=W===256;
 const p=h.newPlayer(Math.max(1727+16,Math.min(1727+W-9,origin+side*dist)),238,{state:5,move:0,bg:2,contacts:2,vx:-side*768});let events=[],hits=0;
 for(let u=0;u<240;u++){
  let hp=s.hp,cd=s.cooldown;h.frame({left:side===1,right:side===-1,jump:u<hold,jumpPress:u===0});let k=p.chaosCore;
  if(hp!==s.hp){hits++;eq(s.cooldown,16,'canonical hit cooldown');eq(s.hp,(hp-1)&255,'single HP decrement');}
  if(hp!==s.hp||cd!==s.cooldown)events.push([u,hp,s.hp,cd,s.cooldown,k.xu-origin*256,k.yu,k.state,k.next,s.state,s.requested]);
  if(u>1&&!(k.move&1))break;
 }
 yes(hits<=1,'unpinned jump cannot drain boss');
 const key=JSON.stringify([routeStart,side,dist,hold]);if(W===256)global[key]=events;
 report.jumps.push({width:W,bossStart,routeStart,side,dist,hold,hits,transitions:events});
}
captureContact=false;
function setup(W,target){
 h.reset();c.room=c.ROM_chaos_aqz3;w.roomWidth=2560;w.roomHeight=512;w.follow=false;w.cam={x:1727,y:78,w:W,h:W===348?196:192};c.chaos_level_install_layout();
 const b=c.chaos_59_new();g.chaosAqz59=b;Object.assign(b,{active:true,camera_mode:3,pan_x:1728,pan_y:78,camera_left:1727,camera_right:1728});
 const s=c.chaos_59_slot(89,0,1856,238,1);Object.assign(s,{state:17,requested:17,frame:2,ex:20,ey:64,hp:10,counter:0,keep:true,sx:129});g.chaosS2.slots[7]=s;
 return {b,s,p:h.newPlayer(1727+target,238,{state:5,move:0,bg:2,contacts:2})};
}
report.camping=[];report.floor=[];report.projectiles=[];
for(const W of [256,348]){
 const safe=[],rows=[];
 for(let x=16;x<=W-9;x++){
  const {b,s,p}=setup(W,x);let body=0,missile=0,frames=0,trace=[];
  const combat=c.chaos_59_combat_contact,damage=c.chaos_59_damage_contact;
  c.chaos_59_combat_contact=function(b,s,k,p,v){const bits=combat(b,s,k,p,v);if(bits){body++;if(trace.length<2)trace.push({u:b.tick,state:s.state,frame:s.frame,bossX:c.chaos_59_view_x(s)-1727,bossY:c.chaos_59_y(s),playerX:k.xu/256-1727,playerY:k.yu/256,bits});}return bits;};
  c.chaos_59_damage_contact=function(s,k,p){const bits=damage(s,k,p);if(s.type===93){eq(Math.abs(s.vx),576,'unchanged real missile VX');if(bits)missile++;}return bits;};
  for(;frames<2400&&!p.dead;frames++)h.frame({});
  c.chaos_59_combat_contact=combat;c.chaos_59_damage_contact=damage;
  eq(s.hp,10,'waiting never damages boss');if(!p.dead)safe.push(x);
  rows.push({x,frames,dead:!!p.dead,body,missile,first:trace});
 }
 const expected=W===256?[16,17,18,...Array.from({length:11},(_,i)=>237+i)]:[];
 eq(safe,expected,'ordinary stationary player has only canonical-like tiny edge refuge');
 report.camping.push({width:W,safe,rows});report.floor.push({width:W,left_safe:safe.filter(x=>x<47),right_safe:safe.filter(x=>x>W-48),ordinary_player:true});
 console.log('ordinary floor sweep',W,'safe',safe);
}
// Isolate missile contribution while retaining actual player motion/hurt and
// natural scripts/allocations. Suppress ONLY boss-body overlap at that helper;
// this is separate from the ordinary camping acceptance sweep above.
for(const W of [348])for(const x of Array.from({length:324},(_,i)=>16+i)){
 const {b,s,p}=setup(W,x),shots=[];let hits=0,frames=0;
 const combat=c.chaos_59_combat_contact,damage=c.chaos_59_damage_contact,alloc=c.chaos_59_alloc;
 c.chaos_59_combat_contact=function(b,s,k,p,v){const flags=k.move;k.move|=64;const bits=combat(b,s,k,p,v);k.move=flags;return bits;};
 c.chaos_59_damage_contact=function(s,k,p){const bits=damage(s,k,p);if(s.type===93){eq(Math.abs(s.vx),576,'canonical missile speed');if(bits)hits++;}return bits;};
 c.chaos_59_alloc=function(b,pool,t,param,x,y,d){const out=alloc(b,pool,t,param,x,y,d);if(t===93&&out>=0)shots.push({u:b.tick,x:x-1727,y});return out;};
 for(;frames<2400&&!p.dead;frames++)h.frame({});
 c.chaos_59_combat_contact=combat;c.chaos_59_damage_contact=damage;c.chaos_59_alloc=alloc;
 yes(hits>0&&p.dead,'real naturally allocated missiles contest added right-side floor space');
 report.projectiles.push({width:W,target:x,frames,hits,shots});
}
for(const W of [256,348]){
 const {p}=setup(W,16);g.chaosS2.slots[7]=c.chaos_s2_slot();
 for(let u=0;u<500;u++)h.frame({right:true});eq(Math.floor(p.chaosCore.xu/256)-1727,W-9,'actual movement reaches right edge');
 for(let u=0;u<500;u++)h.frame({left:true});eq(Math.floor(p.chaosCore.xu/256)-1727,16,'actual movement reaches left edge');
}
report.checkpoints=[];
for(const W of [348])for(const start of [44,311])for(const target of [16,19,47,129,236,237,311,339]){
 const {s,p}=setup(W,target);s.xu=(1727+start)*256;s.sx=start;s.yu=239*256;
 let frames=0;for(;frames<2400&&!p.dead;frames++)h.frame({});
 yes(p.dead,'waiting remains threatened after either previous approach');
 report.checkpoints.push({width:W,bossStart:start,target,frames,dead:!!p.dead});
}
// Per-update descending body helper trace, with ordinary standing player physics.
// No projectile help and no artificially pinned player. Only delete shots to isolate body.
report.descending=[];
for(const W of [256,348])for(const target of [16,19,W-20,W-9]){
 const {b,s,p}=setup(W,target),rows=[];let min=999,max=-999,contact=0,descendingContact=0;
 const combat=c.chaos_59_combat_contact;
 c.chaos_59_combat_contact=function(b,s,k,present,vp){
  const before={u:b.tick,state:s.state,frame:s.frame,x:s.xu/256-1727,y:s.yu/256,vx:s.vx/256,vy:s.vy/256,playerX:k.xu/256-1727,playerY:k.yu/256,flags:k.move};
  const bits=combat(b,s,k,present,vp);
  if(s.vy>0&&(s.state===9||s.state===10||s.state===20)) {rows.push({...before,bits});if(bits)descendingContact++;}
  if(bits)contact++;return bits;
 };
 for(let u=0;u<1100&&!p.dead;u++){
  for(let i=8;i<18;i++)if(g.chaosS2.slots[i].type===93)g.chaosS2.slots[i]=c.chaos_s2_slot();
  h.frame({});min=Math.min(min,c.chaos_59_x(s)-1727);max=Math.max(max,c.chaos_59_x(s)-1727);
 }
 c.chaos_59_combat_contact=combat;
 if(W===348){yes(descendingContact>0,'actual descending contact at both literal and useful edges');yes(min>=43&&max<=312,'boss remains engaged and visible');}
 report.descending.push({width:W,target,min,max,contact,descendingContact,dead:!!p.dead,rows});
}
// Canonical script launch geometry, source/player at spawn and floor crossing.
report.launches=[];
for(const W of [256,348]){
 const {b,s,p}=setup(W,W-9),launches=[];
 const alloc=c.chaos_59_alloc,combat=c.chaos_59_combat_contact,cb=c.chaos_59_callback;
 c.chaos_59_combat_contact=function(b,s,k,present,vp){let old=k.move;k.move|=64;let bits=combat(b,s,k,present,vp);k.move=old;return bits;};
 c.chaos_59_alloc=function(b,pool,t,param,x,y,d){let slot=alloc(b,pool,t,param,x,y,d);if(t===93&&slot>=0)launches.push({slot,update:b.tick,state:s.state,frame:s.frame,record:s.diag_record,bossX:c.chaos_59_x(s)-1727,bossY:c.chaos_59_y(s),playerX:p.chaosCore.xu/256-1727,playerY:p.chaosCore.yu/256,spawnX:x-1727,spawnY:y});return slot;};
 c.chaos_59_callback=function(b,pool,shot,pc,k,present,vp){
  const result=cb(b,pool,shot,pc,k,present,vp);
  if(shot.type===93&&pc===0xAEE9){
   let row=launches.findLast(r=>r.slot===c.chaos_59_slot_index(pool,shot)&&r.vx===undefined);
   row.selector=shot.cooldown;row.vx=shot.vx/256;row.vy=shot.vy/256;
   let temp=JSON.parse(JSON.stringify(shot));
   for(let u=1;u<=100;u++){cb(b,pool,temp,0xAF1E,k,false,vp);if(c.chaos_59_y(temp)>=214){row.firstFloor={move:u,x:temp.xu/256-1727,y:temp.yu/256,vy:temp.vy/256};break;}}
   eq([row.state,row.frame],[10,3],'canonical firing state/frame preserved');eq(Math.abs(row.vx),2.25,'base X speed magnitude preserved');
   eq(row.vx,W===348&&row.playerX>row.spawnX?2.25:-2.25,'real allocation-time aim');
   eq([row.spawnX-row.bossX,row.spawnY-row.bossY],[-8,-32],'attached canonical launch offset');
   eq([row.selector,row.firstFloor.move],[1,60],'canonical selector and floor-intersection time');
  }
  return result;
 };
 for(let u=0;u<1100;u++)h.frame({});c.chaos_59_alloc=alloc;c.chaos_59_combat_contact=combat;c.chaos_59_callback=cb;
 yes(launches.length>=5,'multiple natural launches');
 if(W===348)yes(launches.some(r=>Math.abs(r.firstFloor.x-(W-9))<=12),'on-screen attached right-edge floor intersection');
 report.launches.push({width:W,launches});
}
// Full vertical arc and callback schedule agree despite scaled X travel.
report.arcs=[];
for(const W of [256,348]){
 setup(W,339);const vp=c.chaos_vp_current(),s=c.chaos_59_slot(89,0,1856,238,0),b=c.chaos_59_new(),k=c.SCR_cc_new(2000,238),pool=g.chaosS2;
 s.state=9;s.frame=2;s.ex=20;s.ey=64;s.vx=c.chaos_59_jump_speed(160,W);s.vy=-1536;s.sx=129;
 const rows=[];for(let u=0;u<66;u++){c.chaos_59_callback(b,pool,s,0xAA6C,k,false,vp);rows.push([s.yu,s.vy,s.requested]);s.sx=c.chaos_59_x(s)-1727;if(s.requested===17)break;}
 if(W===256)global.arc256=rows;else eq(rows,global.arc256,'identical vertical arc and callback count');
 report.arcs.push({width:W,moves:rows.length,deltaX:s.xu/256-1856,speed:c.chaos_59_jump_speed(160,W)/256,rows});
}
// No additional hop/state/callback: remove contact consequences solely for
// this clock oracle, then compare 4000 complete updates at both widths.
report.phaseClock=[];
for(const W of [256,348]){
 const {b,s,p}=setup(W,W-9),rows=[];let jumps=0;
 const combat=c.chaos_59_combat_contact,damage=c.chaos_59_damage_contact,cb=c.chaos_59_callback;
 c.chaos_59_combat_contact=function(b,s,k,present,vp){let move=k.move;k.move|=64;let r=combat(b,s,k,present,vp);k.move=move;return r;};
 c.chaos_59_damage_contact=()=>0;
 c.chaos_59_callback=function(b,pool,s,pc,k,present,vp){if(s.type===89&&pc===0xAA4D)jumps++;return cb(b,pool,s,pc,k,present,vp);};
 for(let u=0;u<4000;u++){h.frame({});rows.push([s.state,s.requested,s.frame,s.timer,s.pc,s.callback,s.counter,s.yu,s.vy]);}
 c.chaos_59_combat_contact=combat;c.chaos_59_damage_contact=damage;c.chaos_59_callback=cb;
 if(W===256)global.phase256={rows,jumps};else {eq(rows,global.phase256.rows,'identical vertical/state/script clock across4000 updates');eq(jumps,global.phase256.jumps,'no extra jump initialization');}
 report.phaseClock.push({width:W,jumps,updates:rows.length});
}
// Direction is chosen at allocation, survives a player side switch before init,
// and never retargets during flight. Vertical selector and magnitude remain ROM.
for(const W of [256,348])for(const side of [-1,1]){
 const {b,s,p}=setup(W,129),pool=g.chaosS2,vp=c.chaos_vp_current(),k=p.chaosCore;
 s.xu=(1727+174)*256;s.yu=191*256;k.xu=(1727+174-8+side*80)*256;
 c.chaos_59_script_alloc(b,pool,s,[0,4,93,-8,-32,0],k,true,vp);
 const shot=pool.slots[b.last_spawn];eq([c.chaos_59_x(shot),c.chaos_59_y(shot)],[1727+166,159],'attached allocation');
 k.xu=(1727+174-8-side*80)*256;c.chaos_59_callback(b,pool,shot,0xAEE9,k,true,vp);
 const expected=W===348?side*576:-576;eq(shot.vx,expected,'allocation-time aim survives crossing before init');
 for(let u=0;u<100;u++){k.xu=(1727+(u%2?16:339))*256;c.chaos_59_callback(b,pool,shot,0xAF1E,k,false,vp);eq(shot.vx,expected,'no homing or speed change');}
}
// Exact fixed-point side boundary at the canonical integer launcher.
for(const offset of [-1,0,1]){
 const {b,s,p}=setup(348,129),pool=g.chaosS2,vp=c.chaos_vp_current(),k=p.chaosCore;
 s.xu=1900*256;s.yu=191*256;k.xu=1892*256+offset;
 c.chaos_59_script_alloc(b,pool,s,[0,4,93,-8,-32,0],k,true,vp);
 eq(pool.slots[b.last_spawn].wide_launch_vx,offset>0?576:-576,'strict side boundary uses current fixed-point X');
}
// Render the same recovered resource/composition; only right-going348 flips.
report.draw=[];
for(const W of [256,348])for(const vx of [-576,576]){
 const {b,s,p}=setup(W,129),pool=g.chaosS2;pool.slots[7]=c.chaos_s2_slot();
 const shot=c.chaos_59_slot(93,0,1900,159,0);Object.assign(shot,{frame:24,vx});pool.slots[8]=shot;b.viewport_w=W;
 let calls=[];c.draw_sprite=(...args)=>calls.push(['normal',...args]);c.draw_sprite_ext=(...args)=>calls.push(['extended',...args]);c.c_white=16777215;
 c.chaos_59_draw();eq(calls.length,1,'one existing composition rendered');eq(calls[0][1],c.SPR_chaos_aqz_boss_5d,'no new artwork');
 eq(calls[0].slice(3,5),[1900,159],'draw registration remains attached anchor');eq(calls[0][0],W===348&&vx>0?'extended':'normal','mirror only rightgoing348');
 if(W===348&&vx>0)eq(calls[0].slice(5,7),[-1,1],'horizontal composition mirror only');
 report.draw.push({width:W,vx,call:calls[0]});
}
fs.mkdirSync(root+'/build/aqz-p4-g',{recursive:true});fs.writeFileSync(root+'/build/aqz-p4-g/jump-contact-inputs.json',JSON.stringify(contactOracle));
fs.writeFileSync(root+'/build/aqz-p4-g/viewport-results.json',JSON.stringify({assertions:checks,...report},null,2));console.log({checks,jumps:report.jumps.length,camping:report.camping.map(f=>({width:f.width,safe:f.safe})),projectile_targets:report.projectiles.length});
