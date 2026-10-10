const fs=require('fs'),vm=require('vm'),assert=require('assert'),{loadHost,hex,root}=require('./chaos_world_harness');
let checks=0;const eq=(a,b,m)=>{assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;},yes=(a,m)=>{assert(a,m);checks++;};
const h=loadHost(),c=h.ctx,w=h.world,g=h.g,bounds=require('./aqz-p4/5a-visible-bounds.json');const report={widths:[],jumps:[],projectiles:[],intro:[]};
for(const W of [256,348,640]){
 const vp=c.chaos_vp_new(1727,78,W,W===348?196:192);
 eq([c.chaos_goal_clamp_player(vp,0,-1).xu/256-1727,c.chaos_goal_clamp_player(vp,9999999,1).xu/256-1727],[16,W-9],'full-width shared player envelope');
 for(let x=16;x<=W-9;x++)eq(c.chaos_goal_clamp_player(vp,(1727+x)*256,256).hit,false,'no interior wall');
 for(let sx=-128;sx<=W+128;sx++)for(let vx of [-160,0,160]){
  const canonical=(vx<0&&(sx&255)<48)||(vx>=0&&(sx&255)>=208);
  eq(c.chaos_59_patrol_stop({sx,vx,xu:(1727+sx)*256,view_dx:0},vp),W===256?canonical:(vx<0&&sx<48)||(vx>=0&&sx>=W+122),'explicit patrol targets / no wide byte wrap');
 }
 report.widths.push({width:W,player:[16,W-9],route_limits:[47,W===256?208:W+122]});
}
// Full source slot scripts while a one-pixel pan finishes. Entry translation is fixed once.
for(const W of [256,348,640])for(const start of [1444,1540,1696,1727]){
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
for(const W of [256,348,640])for(const routeStart of [0,1,2])for(const side of [-1,1])for(const dist of [28,40,64,96])for(const hold of [1,14,240]){
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
for(const W of [256,348,640]){
 const safe=[],rows=[];
 for(let x=16;x<=W-9;x++){
  const {b,s,p}=setup(W,x);let body=0,missile=0,frames=0,trace=[];
  const combat=c.chaos_59_combat_contact,damage=c.chaos_59_damage_contact;
  c.chaos_59_combat_contact=function(b,s,k,p,v){const bits=combat(b,s,k,p,v);if(bits){body++;if(trace.length<2)trace.push({u:b.tick,state:s.state,frame:s.frame,bossX:c.chaos_59_view_x(s)-1727,bossY:c.chaos_59_y(s),playerX:k.xu/256-1727,playerY:k.yu/256,bits});}return bits;};
  c.chaos_59_damage_contact=function(s,k,p){const bits=damage(s,k,p);if(s.type===93){eq(s.vx,-576,'unchanged real missile VX');if(bits)missile++;}return bits;};
  for(;frames<2400&&!p.dead;frames++)h.frame({});
  c.chaos_59_combat_contact=combat;c.chaos_59_damage_contact=damage;
  eq(s.hp,10,'waiting never damages boss');if(!p.dead)safe.push(x);
  rows.push({x,frames,dead:!!p.dead,body,missile,first:trace});
 }
 const expected=W===256?[16,17,18,...Array.from({length:11},(_,i)=>237+i)]:[16,17,18];
 eq(safe,expected,'ordinary stationary player has only canonical-like tiny edge refuge');
 report.camping.push({width:W,safe,rows});report.floor.push({width:W,left_safe:safe.filter(x=>x<47),right_safe:safe.filter(x=>x>W-48),ordinary_player:true});
 console.log('ordinary floor sweep',W,'safe',safe);
}
// Isolate missile contribution while retaining actual player motion/hurt and
// natural scripts/allocations. Suppress ONLY boss-body overlap at that helper;
// this is separate from the ordinary camping acceptance sweep above.
for(const W of [348,640])for(const x of (W===348?Array.from({length:103},(_,i)=>237+i):[237,300,348,400,500,600,631])){
 const {b,s,p}=setup(W,x),shots=[];let hits=0,frames=0;
 const combat=c.chaos_59_combat_contact,damage=c.chaos_59_damage_contact,alloc=c.chaos_59_alloc;
 c.chaos_59_combat_contact=function(b,s,k,p,v){const flags=k.move;k.move|=64;const bits=combat(b,s,k,p,v);k.move=flags;return bits;};
 c.chaos_59_damage_contact=function(s,k,p){const bits=damage(s,k,p);if(s.type===93){eq(s.vx,-576,'canonical missile speed');if(bits)hits++;}return bits;};
 c.chaos_59_alloc=function(b,pool,t,param,x,y,d){const out=alloc(b,pool,t,param,x,y,d);if(t===93&&out>=0)shots.push({u:b.tick,x:x-1727,y});return out;};
 for(;frames<2400&&!p.dead;frames++)h.frame({});
 c.chaos_59_combat_contact=combat;c.chaos_59_damage_contact=damage;c.chaos_59_alloc=alloc;
 yes(hits>0&&p.dead,'real naturally allocated missiles contest added right-side floor space');
 report.projectiles.push({width:W,target:x,frames,hits,shots});
}
for(const W of [256,348,640]){
 const {p}=setup(W,16);g.chaosS2.slots[7]=c.chaos_s2_slot();
 for(let u=0;u<500;u++)h.frame({right:true});eq(Math.floor(p.chaosCore.xu/256)-1727,W-9,'actual movement reaches right edge');
 for(let u=0;u<500;u++)h.frame({left:true});eq(Math.floor(p.chaosCore.xu/256)-1727,16,'actual movement reaches left edge');
}
report.checkpoints=[];
for(const W of [348,640])for(const start of [47,W+122])for(const target of [19,47,129,236,237,W-48,W-20,W-9]){
 const {s,p}=setup(W,target);s.xu=(1727+start)*256;s.sx=start;s.yu=239*256;
 let frames=0;for(;frames<2400&&!p.dead;frames++)h.frame({});
 yes(p.dead,'waiting remains threatened after a previous left/right approach');
 report.checkpoints.push({width:W,bossStart:start,target,frames,dead:!!p.dead});
}
for(const W of [256,348,640]){
 setup(W,129);const vp=c.chaos_vp_current(),b=c.chaos_59_new();
 for(const sx of [16,47,129,208,236,237,W-48,W+122])for(const target of [16,129,236,237,W-9])for(const type of [89,90]){
  const s=c.chaos_59_slot(type,0,1727+sx,238,0),k=c.SCR_cc_new(1727+target,238);
  c.chaos_59_face(s,k,160);let expected=sx<target?160:-160;
  if(W>256&&type===89&&target>236)expected=sx<=Math.min(target+170,W+122)?160:-160;
  eq(s.vx,expected,'canonical face / explicit firing approach');
 }
 for(const source of [31,32,96,114,116,117])for(const y of [77,159,334]){
  const s=c.chaos_59_slot(93,0,1727+W+source,y,0);s.state=1;
  c.chaos_59_lifecycle(b,s,vp);
  if(W>256&&source>=32&&source<=114&&y===159)eq([s.type,s.asleep,s.entry_pending],[93,false,true],'bounded right-source retention');
  else yes(!s.entry_pending,'no retention outside the source/vertical band');
 }
 if(W>256){
  const s=c.chaos_59_slot(93,0,1727+W+114,159,0),pool={slots:Array.from({length:19},()=>c.chaos_s2_slot())},k=c.SCR_cc_new(1727+W-9,238);
  s.state=1;s.frame=24;s.ex=4;s.ey=16;c.chaos_59_callback(b,pool,s,0xAEE9,k,true,vp);c.chaos_59_lifecycle(b,s,vp);
  let entered=false;
  for(let u=0;u<250&&s.type===93;u++){c.chaos_59_callback(b,pool,s,0xAF1E,k,false,vp);c.chaos_59_lifecycle(b,s,vp);if(!s.entry_pending)entered=true;}
  yes(entered,'entry hold releases');yes(s.type!==93,'canonical post-entry sleep/deletion resumes');
 }
}
fs.mkdirSync(root+'/build/aqz-p4-e',{recursive:true});fs.writeFileSync(root+'/build/aqz-p4-e/jump-contact-inputs.json',JSON.stringify(contactOracle));
fs.writeFileSync(root+'/build/aqz-p4-e/viewport-results.json',JSON.stringify({assertions:checks,...report},null,2));console.log({checks,jumps:report.jumps.length,camping:report.camping.map(f=>({width:f.width,safe:f.safe})),projectile_targets:report.projectiles.length});
