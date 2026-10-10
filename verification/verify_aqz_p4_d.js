const fs=require('fs'),vm=require('vm'),assert=require('assert'),{loadHost,hex,root}=require('./chaos_world_harness');
let checks=0;const eq=(a,b,m)=>{assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;},yes=(a,m)=>{assert(a,m);checks++;};
const h=loadHost(),c=h.ctx,w=h.world,g=h.g,bounds=require('./aqz-p4/5a-visible-bounds.json');const report={widths:[],jumps:[],projectiles:[],intro:[]};
for(const W of [256,348,640]){
 const vp=c.chaos_vp_new(1727,78,W,W===348?196:192);
 eq([c.chaos_goal_clamp_player(vp,0,-1).xu/256-1727,c.chaos_goal_clamp_player(vp,9999999,1).xu/256-1727],[16,W-9],'full-width shared player envelope');
 for(let x=16;x<=W-9;x++)eq(c.chaos_goal_clamp_player(vp,(1727+x)*256,256).hit,false,'no interior wall');
 for(let sx=-128;sx<=W+128;sx++)for(let vx of [-160,0,160]){
  const canonical=(vx<0&&(sx&255)<48)||(vx>=0&&(sx&255)>=208);
  eq(c.chaos_59_patrol_stop({sx,vx},vp),W===256?canonical:(vx<0&&sx<48)||(vx>=0&&sx>=W-48),'explicit patrol targets / no wide byte wrap');
 }
 report.widths.push({width:W,player:[16,W-9],boss_anchor:[47,W-48],boss_body_contact:[19,W-20]});
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
 const key=JSON.stringify([routeStart,side,dist,hold]);if(W===256)global[key]=events;else eq(events,global[key],'wide jump contact/cooldown trace equals canonical-width trace');
 report.jumps.push({width:W,bossStart,routeStart,side,dist,hold,hits,transitions:events});
}
// Actual scripts, callback ordering, renderer cache and allocator. Probe only
// at real combat/forced-hurt helper calls at Sonic's floor anchor Y238.
report.floor=[];report.camping=[];
const minmax=xs=>xs.length?[Math.min(...xs),Math.max(...xs)]:null;
function fight(W,target,ticks,allTargets){
 const vp=c.chaos_vp_new(1727,78,W,W===348?196:192),b=c.chaos_59_new(),pool={slots:Array.from({length:19},()=>c.chaos_s2_slot())},s=c.chaos_59_slot(89,0,1856,238,1),k=c.SCR_cc_new(1727+target,238);
 Object.assign(s,{state:9,requested:9,frame:2,ex:20,ey:64,hp:10,keep:true,sx:129,counter:255});pool.slots[7]=s;k.move=64;
 const targets=allTargets?Array.from({length:W-24},(_,i)=>16+i):[target];
 const probes=targets.map(x=>c.SCR_cc_new(1727+x,238));
 const body=new Set(),rangedBody=new Set(),missiles=new Set(),anchors=new Set(),rows=[],sources=[],missileRows=[];
 const combat=c.chaos_59_combat_contact,damage=c.chaos_59_damage_contact;
 c.chaos_59_combat_contact=function(b,s,k,p,v){
  const hits=probes.filter(q=>c.chaos_59_bits(s,q)).map(q=>q.xu/256-1727);
  for(const x of hits){body.add(x);if(s.state===10)rangedBody.add(x);}
  anchors.add(c.chaos_59_x(s)-1727);
  if(allTargets)rows.push({u:b.tick,state:s.state,frame:s.frame,xu:s.xu,yu:s.yu,vx:s.vx,vy:s.vy,extent:[s.ex,s.ey],floor_hits:hits});
  return combat(b,s,k,p,v);
 };
 c.chaos_59_damage_contact=function(s,k,p){
  if(s.type===93){
   const hits=probes.filter(q=>c.chaos_59_bits(s,q)).map(q=>q.xu/256-1727);
   for(const x of hits)missiles.add(x);
   if(allTargets)missileRows.push({u:b.tick,xu:s.xu,yu:s.yu,vx:s.vx,vy:s.vy,floor_hits:hits});
   eq(s.vx,-576,'canonical missile VX throughout trajectory');
  }
  return damage(s,k,p);
 };
 for(let u=0;u<ticks;u++){
  b.tick=u;b.random_byte=(u*73+19)&255;
  for(let i=7;i<18;i++){
   const t=pool.slots[i];if(!t.type)continue;
   c.chaos_59_visit(b,pool,i,k,true,vp);
   if(t.type===93&&t.callback===0xAEE9&&allTargets)sources.push({u,x:c.chaos_59_x(t)-1727,y:c.chaos_59_y(t),vx:t.vx,vy:t.vy});
   if(t.type===93){const x=c.chaos_59_x(t),y=c.chaos_59_y(t);if(x>=vp.left&&x<vp.left+W&&y>=vp.top&&y<vp.top+256)yes(!t.asleep,'projectile retained inside visible active viewport');}
  }
  for(const t of pool.slots)if(t.boss59&&!t.asleep)t.sx=c.chaos_59_view_x(t)-1727;
 }
 c.chaos_59_combat_contact=combat;c.chaos_59_damage_contact=damage;
 return {body:[...body].sort((a,b)=>a-b),rangedBody:[...rangedBody].sort((a,b)=>a-b),missiles:[...missiles].sort((a,b)=>a-b),anchors:[...anchors],rows,sources,missileRows};
}
captureContact=false;
report.terrainFloor=[];
for(const W of [256,348])for(const x of new Set([16,W-9,47,W-48,...Array.from({length:Math.floor((W-25)/16)+1},(_,i)=>16+i*16)])){
 h.reset();c.room=c.ROM_chaos_aqz3;w.roomWidth=2560;w.roomHeight=512;w.follow=false;w.cam={x:1727,y:78,w:W,h:W===348?196:192};c.chaos_level_install_layout();g.chaosAqz59=c.chaos_59_new();g.chaosAqz59.active=true;
 const p=h.newPlayer(1727+x,200,{state:14,move:1});for(let u=0;u<90;u++)h.frame({});
 eq(Math.floor(p.chaosCore.yu/256),238,'shipped terrain/player physics confirms floor contact Y');yes((p.chaosCore.bg&2)!==0,'natural floor support');report.terrainFloor.push({width:W,x,yu:p.chaosCore.yu,floor:!!(p.chaosCore.bg&2)});
}
for(const W of [256,348,640]){
 let bodies=new Set(),ranged=new Set(),missiles=new Set(),anchors=new Set(),traces=[];
 for(const side of [16,W-9]){
  const f=fight(W,side,2000,true);for(const x of f.body)bodies.add(x);for(const x of f.rangedBody)ranged.add(x);for(const x of f.missiles)missiles.add(x);for(const x of f.anchors)anchors.add(x);traces.push({target:side,...f});
 }
 eq(minmax([...anchors]),[47,W-48],'real script patrol extrema');
 eq(minmax([...bodies]),[19,W-20],'actual floor-Y body threat');
 eq(minmax([...ranged]),[19,W-20],'actual ranged-phase floor-Y body threat');
 eq(minmax([...missiles]),[16,W-179],'canonical missiles gain widened source range');
 for(let x=19;x<=W-20;x++)yes(bodies.has(x)&&ranged.has(x),'continuous body/ranged-phase floor coverage');
 for(let x=16;x<=W-20;x++)yes(ranged.has(x)||missiles.has(x),'combined ranged phase has no large permanent strip');
 report.floor.push({width:W,floor_y:238,body:minmax([...bodies]),ranged_body:minmax([...ranged]),missile:minmax([...missiles]),left_body_refuge:3,right_body_refuge:11,traces});
}
for(const W of [256,348]){
 const safe=[],rangedSafe=[],rows=[];
 for(let x=16;x<=W-9;x++){
  const f=fight(W,x,1800,false),threat=f.body.includes(x)||f.missiles.includes(x),ranged=f.rangedBody.includes(x)||f.missiles.includes(x);
  if(!threat)safe.push(x);if(!ranged)rangedSafe.push(x);
  rows.push({x,body:f.body.includes(x),rangedBody:f.rangedBody.includes(x),missile:f.missiles.includes(x)});
 }
 const expected=[16,17,18,...Array.from({length:11},(_,i)=>W-19+i)];eq(safe,expected,'exhaustive stationary campers retain only canonical edge refuges');eq(rangedSafe,expected,'ranged phase threatens stationary campers outside canonical refuges');
 report.camping.push({width:W,ticks:1800,safe,rangedSafe,rows});
}
fs.mkdirSync(root+'/build/aqz-p4-d',{recursive:true});fs.writeFileSync(root+'/build/aqz-p4-d/jump-contact-inputs.json',JSON.stringify(contactOracle));
fs.writeFileSync(root+'/build/aqz-p4-d/viewport-results.json',JSON.stringify({assertions:checks,...report},null,2));console.log({checks,jumps:report.jumps.length,floor:report.floor.map(f=>({width:f.width,body:f.body,missile:f.missile})),camping:report.camping.map(f=>({width:f.width,safe:f.safe}))});
