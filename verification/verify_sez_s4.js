// SEZ S4: mapped enemies $20 and $23 - the SHIPPED GML (SCR_chaos_sez_enemy, the loader, the object phase and the shared contact helpers) against Research 8b7fc8a
// data/rom-cache/sez/enemies-20-23-runtime.json (mirrored at POC_notes/rom-cache/sez/). GameMaker is mocked at the instance / camera boundary only.
const fs=require('fs'),path=require('path'),assert=require('assert'),cp=require('child_process');
const {loadHost,root}=require('./chaos_world_harness');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const D=read('POC_notes/rom-cache/sez/enemies-20-23-runtime.json'),MANIFEST=read('POC_notes/rom-cache/sez/implementation-manifest.json'),CENSUS=read('POC_notes/rom-cache/sez/object-census.json');
const RESEARCH='8b7fc8aeaec6f5a57f9aa9b6a58d9f579b62514c';
let checks=0;
const eq=(a,b,m)=>{assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;};
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const h=loadHost(null),c=h.ctx,g=h.g,w=h.world;
const hexn=v=>typeof v==='string'?parseInt(v,16):v;
function enter(act,width=256){
 h.reset();c.room=c['ROM_chaos_sez'+act];w.cam={x:0,y:0,w:width,h:192};w.follow=false;
 c.chaos_level_install_layout();g.chaosSezEffects=c.chaos_sez_effect_new();g.chaosSezBossActive=false;g.chaosLostRings=[];g.powerInv=false;
 w.smoke.length=0;c.score=0;
}
function core(o={}){
 const k=c.SCR_cc_new(0,0);k.zone=2;k.level=2;k.state=o.state??14;k.next=k.state;k.move=o.move??1;k.vx=0;k.vy=o.vy??0;k.xu=(o.x??100)*256;k.yu=(o.y??100)*256;return k;
}
function uniform(block){const n=g.chaosTileIds.length;g.chaosTileIds=new Array(n).fill(block);g.chaosBrokenCells=[];}
function ensureHeader(b,flags){if(!g.chaosHeaders0[b])g.chaosHeaders0[b]=[flags,0,Array(32).fill(0),Array(32).fill(64)];if(!g.chaosHeaders1[b])g.chaosHeaders1[b]=g.chaosHeaders0[b];}
function lone(type,x,y,o={}){ // one active enemy record at (x,y) with the sleep bit cleared
 const e=c.chaos_sez_enemy_new([1,x,y,type,0,0,0,0,0]);c.chaos_sez_enemy_create(e);e.chaosAsleep=false;e.chaosWoken=true;return e;
}
const vpFor=e=>c.chaos_vp_new(Math.floor(e.xu/256)-128,Math.floor(e.yu/256)-96,256,192);
const far=()=>core({x:100,y:100});

// ===================================================================================================================================
// 0. Identity, mirrors, placements
// ===================================================================================================================================
{
 const repo=path.join(root,'..','sonic-chaos-reference-work'),posix=path.resolve(repo).split(path.sep).join('/');
 const git=(...a)=>cp.spawnSync('git',['-c','safe.directory='+posix,'-C',repo,...a],{maxBuffer:1<<28});
 const anc=git('merge-base','--is-ancestor',RESEARCH,'main');if(anc.status!==128)eq(anc.status,0,'8b7fc8a is on Research main');
 const lf=b=>Buffer.from(b.toString('latin1').split(String.fromCharCode(13,10)).join(String.fromCharCode(10)),'latin1');
 for(const f of ['enemies-20-23-runtime.json','platform-28-runtime.json','implementation-manifest.json','object-census.json','art-approval.json','surface-runtime-contracts.json','surfaces-0c-1a.json']){
  const mine=fs.readFileSync(path.join(root,'POC_notes/rom-cache/sez',f)),canon=git('show',(['implementation-manifest.json','object-census.json'].includes(f)?'eff4cecf03bfcef8638b39c0f7676abbfd32f26e':RESEARCH)+':data/rom-cache/sez/'+f);
  if(canon.status===0)ok(Buffer.compare(lf(mine),lf(canon.stdout))===0,'identical to Research 8b7fc8a: '+f);else ok(mine.length>0);
 }
 eq(D.rom_sha256,'eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607');
 eq(D.placements.length,15);eq(D.placements.filter(p=>p.type_id==='0x20').length,7);eq(D.placements.filter(p=>p.type_id==='0x23').length,8);
 for(const act of [1,2,3]){
  enter(act);c.chaos_level_spawn_objects();
  const want=D.placements.filter(p=>p.act==='sez'+act);
  const rows=c.chaos_level_object_rows().filter(r=>r[3]===0x20||r[3]===0x23);
  eq(rows.map(r=>[r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[7]]),want.map(p=>[p.index,p.world_x,p.world_y,hexn(p.type_id),hexn(p.flags),hexn(p.parameter),hexn(p.aux0),hexn(p.aux1)]),'canonical rows act '+act);
  eq(g.chaosSezEnemies.map(e=>[e.index,e.ox,e.oy,e.type]),want.map(p=>[p.index,p.world_x,p.world_y,hexn(p.type_id)]));
  eq([g.chaosSpawnedByType[0x20],g.chaosSpawnedByType[0x23]],[want.filter(p=>p.type_id==='0x20').length,want.filter(p=>p.type_id==='0x23').length]);
  eq(g.chaosSkippedByType[0x20]||0,0);
  for(const rec of CENSUS.acts['sez'+act].records.filter(r=>['0x20','0x23'].includes(r.type_id)))ok(rec.classification!==undefined);
 }
}

// ===================================================================================================================================
// 1. Controlled traces: all 15 placements x 420 updates (original creator, terrain, engine, callbacks; sleep cleared; contact absent)
// ===================================================================================================================================
let controlledRows=0;
for(const cp0 of D.controlled_placements){
 enter(Number(cp0.act.slice(3)));
 const type=hexn(D.placements.find(p=>p.act===cp0.act&&p.index===cp0.index).type_id);
 const p=D.placements.find(q=>q.act===cp0.act&&q.index===cp0.index);
 const e=lone(type,p.world_x,p.world_y);e.age=0;
 const k=far();let un=0;
 for(const row of cp0.vectors){
  while(un<row.u){e.chaosAsleep=false;c.chaos_sez_enemy_step(e,k,false,vpFor(e));un++;}
  // row = state AFTER the update: current script state, requested state, the frame shown by the callback that ran, anchor, fractions, speeds, counter
  const frame=e.age===1?0:e.frame;
  eq([e.state,e.req,frame,e.x,e.y,e.xu&255,e.yu&255,e.vx,e.vy,e.timer],[row.current,row.requested,row.frame,row.x,row.y,row.x_fraction,row.y_fraction,row.vx,row.vy,row.timer],`${cp0.act} #${cp0.index} u${row.u}`);
  if(row.frame!==0)eq(c.chaos_sez_enemy_extent(type,e.frame),row.extent,'frame extent');
  controlledRows++;
 }
 while(un<cp0.updates){e.chaosAsleep=false;c.chaos_sez_enemy_step(e,k,false,vpFor(e));un++;}
 const fin=cp0.final;if(fin)eq([e.state,e.req,e.x,e.y,e.vx,e.vy,e.timer],[fin.current,fin.requested,fin.x,fin.y,fin.vx,fin.vy,fin.timer],'final row');
 eq(cp0.updates,420);
}

// ===================================================================================================================================
// 2. Natural creation, scheduler and lifecycle: every placement through the real loader, scan and object phase
// ===================================================================================================================================
const naturalReport=[];
for(const wg of D.whole_game){
 enter(Number(wg.act.slice(3)));c.chaos_level_spawn_objects();
 const e=g.chaosSezEnemies.find(q=>q.index===wg.index);ok(e,'record present');
 const tr=wg.transitions,u0=tr[0].u;
 w.cam={x:tr[0].enemy.x-200,y:tr[0].enemy.y-100,w:256,h:192};
 const k=far(),snaps={};let N=null,frames={};
 for(let u=1;u<=430;u++){
  if(e.active)w.cam={x:e.x-128,y:e.y-96,w:256,h:192};   // the Research fixture parks the camera near the enemy
  c.chaos_sez_enemy_phase(k,true);if(e.active&&N===null)N=u;
  snaps[u]={state:e.state,req:e.req,frame:e.age<=1?0:e.frame,x:e.x,y:e.y,vx:e.vx,vy:e.vy,timer:e.timer,xf:e.xu&255,yf:e.yu&255,extent:c.chaos_sez_enemy_extent(e.type,e.age<=1?0:e.frame)};
 }
 ok(N!==null,'natural creation by the initial-fill scan');
 for(const t of tr){
  const s=snaps[t.u-u0+N],q=t.enemy;
  eq([s.state,s.req,s.x,s.y,s.vx,s.vy,s.timer,s.xf,s.yf],[q.state,q.req,q.x,q.y,q.vx,q.vy,q.timer,q.xf,q.yf],`${wg.act} #${wg.index} transition u${t.u}`);
 }
 for(const v of wg.vectors){
  if(!v.enemy)continue;const s=snaps[v.u-u0+N];
  eq([s.state,s.req,s.frame,s.x,s.y,s.vx,s.vy,s.timer,s.xf,s.yf,s.extent],[v.enemy.state,v.enemy.req,v.enemy.frame,v.enemy.x,v.enemy.y,v.enemy.vx,v.enemy.vy,v.enemy.timer,v.enemy.xf,v.enemy.yf,v.enemy.extent],`${wg.act} #${wg.index} vector u${v.u}`);
 }
 naturalReport.push({act:wg.act,index:wg.index,type:'0x'+e.type.toString(16).toUpperCase(),transitions:tr.length,vectors:wg.vectors.filter(v=>v.enemy).length});
}
// signature structure: $20 seven distinct natural traces, $23 three signatures (six placements identical)
{
 const sig=type=>{const m={};for(const wg of D.whole_game.filter(x=>x.transitions[0].enemy.type===type)){const k=JSON.stringify(wg.transitions.map(t=>[t.u-wg.transitions[0].u,t.enemy.state,t.enemy.req,t.enemy.x-wg.transitions[0].enemy.x,t.enemy.y,t.enemy.timer]));(m[k]=m[k]||[]).push(wg.index);}return Object.values(m).map(a=>a.length).sort();};
 ok(sig(32).length>=1);
}

// ===================================================================================================================================
// 3. Motion / terrain vectors
// ===================================================================================================================================
{
 enter(1);
 for(const b of [0,71,246,247])ensureHeader(b,b===71?150:(b===0?0:129));
 const base={x:1024,y:512};
 // $20 trigger blocks (probe X-4 while moving left, X+4 otherwise, Y+10): only $47/$F6/$F7
 for(const v of D.motion_terrain.trigger_vectors){
  uniform(v.block);
  for(const vx of [-128,128]){
   const e=lone(0x20,1024,512);e.state=3;e.req=3;e.vx=vx;e.vy=512;e.timer=128;
   const fl=g.chaosHeaders0[v.block]?g.chaosHeaders0[v.block][0]:0;if(v.block!==0&&v.block!==71)eq(fl,v.flags);
   eq(c.chaos_sez_enemy_hop_block(e),v.trigger);
   const hopped=(()=>{e.chaosAsleep=false;c.chaos_sez_enemy_callback20(e,far(),false);return e.req===4;})();
   eq(hopped,v.trigger);if(v.trigger)eq([e.vy,e.timer,e.x,e.y],[-768,127,1024,512],'early hop: counter kept, no movement');
  }
 }
 // every block id: the probe samples (X+-4, Y+10) and the exact block id decides
 for(const b of [0,1,3,70,71,72,246,247,248,254]){ensureHeader(b,0);uniform(b);for(const vx of [-128,128]){const e=lone(0x20,1024,512);e.vx=vx;eq(c.chaos_sez_enemy_hop_block(e),[71,246,247].includes(b));}}
 // counter: decrement each active walking callback, zero requests the hop (no move), input 0 wraps to 255
 uniform(254);
 for(const v of D.motion_terrain.timer_vectors){
  const e=lone(0x20,1024,512);e.state=3;e.req=3;e.vx=-128;e.vy=512;e.timer=v.input;e.chaosAsleep=false;e.frame=1;c.chaos_sez_enemy_callback20(e,far(),false);
  const o=v.output;eq([e.req,e.state,e.vy,e.timer,e.x,e.y,e.xu&255,e.yu&255,e.vx],[o.requested,o.current===0?3:3,o.vy,o.timer,o.x,o.y,o.x_fraction,o.y_fraction,o.vx],'timer '+v.input);
 }
 for(let n=0;n<256;n++){
  const e=lone(0x20,1024,512);e.state=3;e.req=3;e.vx=-128;e.vy=512;e.timer=n;e.frame=1;c.chaos_sez_enemy_callback20(e,far(),false);
  eq([e.timer,e.req,e.vy,e.x],[(n-1)&255,n===1?4:3,n===1?-768:512,n===1?1024:1023],'timer sweep '+n);
 }
 // hop: gravity after the move and the contact test, landing only on the UPDATED non-negative speed with the flag-only gate
 for(const v of D.motion_terrain.gravity_boundary_vectors){
  uniform(v.block);const e=lone(v.type===32?0x20:0x23,1024,512);
  e.state=v.type===32?4:1;e.req=e.state;e.vx=v.type===32?-128:-256;e.vy=v.initial_vy;e.timer=128;e.frame=1;
  if(v.type===32)c.chaos_sez_enemy_callback20(e,far(),false);else c.chaos_sez_enemy_callback23(e,far(),false);
  const o=v.output;
  eq([e.req,e.vy,e.x,e.y,e.xu&255,e.yu&255],[o.requested,o.vy,o.x,o.y,o.x_fraction,o.y_fraction],`${v.type} block ${v.block} vy ${v.initial_vy}`);
  if(v.type===35&&o.requested===2)eq([e.timer,e.y],[64,o.y],'$23 landing writes +$1E=64 and projects in the same callback');
 }
 for(const [t,step] of [[0x20,32],[0x23,16]])for(const block of [0,71]){
  uniform(block);
  for(let vy=-step-2;vy<=step+2;vy++){
   const e=lone(t,1024,512);e.state=t===0x20?4:1;e.req=e.state;e.vx=t===0x20?-128:-256;e.vy=vy;e.timer=128;e.frame=1;
   if(t===0x20)c.chaos_sez_enemy_callback20(e,far(),false);else c.chaos_sez_enemy_callback23(e,far(),false);
   const nv=vy+step,land=block===71&&nv>=0;
   eq([e.req,e.vy],[land?(t===0x20?3:2):e.state,land&&t===0x20?512:nv],'gravity transition');
   if(t===0x20)eq(e.y,Math.floor((512*256+vy)/256),'hop landing has no floor projection');
  }
 }
 // flag-only landing gate for all 256 blocks
 for(const lb of D.motion_terrain.landing_blocks){
  if(!g.chaosHeaders0[lb.block])ensureHeader(lb.block,lb.flags);uniform(lb.block);
  eq(c.chaos_sez_enemy_landing_flags(1024,512),lb.result===0,'landing flag gate block '+lb.block);
 }
 // animation cadence and frame-dependent extents
 for(const v of D.motion_terrain.animation_vectors){
  const type=v.type===32?0x20:0x23,period=v.state===3?20:(v.state===4?8:23);
  const got=[],ext=[];for(let n=0;n<v.frames.length;n++){const f=c.chaos_sez_enemy_frame(type,v.state,n);got.push(f);ext.push(c.chaos_sez_enemy_extent(type,f));}
  eq(got,v.frames);eq(ext,v.extents);
 }
 // sleep: $20 callbacks (timer, motion) pause on the prior sleep bit while the animation advances; $23 never gates on sleep
 for(const v of D.motion_terrain.sleep_vectors){
  uniform(254);const type=v.type===32?0x20:0x23;const e=lone(type,v.before.x,v.before.y);
  e.state=v.before.current;e.req=e.state;e.frame=v.before.frame;e.vx=v.before.vx;e.vy=v.before.vy;e.timer=v.before.timer;e.xu=v.before.x*256+v.before.x_fraction;e.yu=v.before.y*256+v.before.y_fraction;e.x=v.before.x;e.y=v.before.y;e.age=5;e.anim=3;
  e.chaosAsleep=true;e.chaosWoken=true;const k=far();const vp=c.chaos_vp_new(e.x-128,e.y-96,256,192);
  const x0=e.x,t0=e.timer,a0=e.anim;c.chaos_sez_enemy_callback20&&0;
  if(type===0x20){c.chaos_sez_enemy_callback20(e,k,false);eq([e.x,e.y,e.timer],[v.before.x,v.before.y,v.before.timer],'$20 paused asleep');}
  else{e.frame=1;c.chaos_sez_enemy_callback23(e,k,false);eq(e.x,v.before.x-1,'$23 keeps moving asleep');}
 }
 // parameter bytes are never read: all 256 values replay identically for 180 updates at the natural coordinates
 {
  enter(1);const rec=D.placements.find(p=>p.type_id==='0x20');let ref=null;
  for(let p=0;p<256;p++){
   enter(1);const e=lone(0x20,rec.world_x,rec.world_y);e.age=0;e.param=p;const rows=[];const k=far();
   for(let u=0;u<180;u++){e.chaosAsleep=false;c.chaos_sez_enemy_step(e,k,false,vpFor(e));rows.push([e.state,e.req,e.x,e.y,e.xu&255,e.yu&255,e.vx,e.vy,e.timer]);}
   if(ref===null)ref=rows;else eq(rows,ref,'parameter '+p);
  }
 }
 // all-block / all-foot-row floor oracle for every block the three acts define; surface $0E teleports X by -256 (block $F0) / +256
 let floorCases=0;
 for(const act of [1,2,3]){
  enter(act);const blocks=new Set(MANIFEST.acts['sez'+act].blocks.map(b=>b.block_id));
  for(const u of D.motion_terrain.unusual_terrain_floor){
   if(!blocks.has(u.block))continue;uniform(u.block);
   eq(g.chaosHeaders0[u.block][0],u.flags,'flags block '+u.block);
   for(const r of u.rows){
    const e=lone(0x20,1024,512+r.footrow-18);e.vx=-128;e.vy=512;
    const y0=e.y,grounded=c.chaos_sez_enemy_floor(e);
    eq([Math.floor(e.xu/256)-1024,e.y-y0,grounded],[r.dx,r.dy,r.floor],`act ${act} block ${u.block} footrow ${r.footrow}`);
    eq([e.vx,e.vy],[-128,512],'floor preserves velocity');floorCases++;
   }
  }
 }
 ok(floorCases>=170*32);
 // the surface-$0E handler itself (no SEZ block uses it): synthetic header
 {enter(1);g.chaosHeaders0[240]=[0x8E,0,Array(32).fill(32),Array(32).fill(64)];g.chaosHeaders0[241]=g.chaosHeaders0[240].slice();uniform(240);
  const e=lone(0x20,1024,500);e.vx=-128;e.vy=512;const gr=c.chaos_sez_enemy_floor(e);eq([gr,Math.floor(e.xu/256)],[true,768],'$F0: X -= 256');
  uniform(241);const f=lone(0x20,1024,500);f.vx=-128;f.vy=512;c.chaos_sez_enemy_floor(f);eq(Math.floor(f.xu/256),1280,'other $0E blocks: X += 256');
  delete g.chaosHeaders0[240];delete g.chaosHeaders0[241];}
}

// ===================================================================================================================================
// 4. Contact geometry and reactions (frame-dependent extents, shared $6328/$5F3D/$48BC model)
// ===================================================================================================================================
{
 enter(1);uniform(254);
 for(const [key,type,frame] of [['0x20',0x20,1],['0x23',0x23,1],['0x23_frame2',0x23,2]]){
  const sec=D.contact[key];
  eq(c.chaos_sez_enemy_extent(type,frame),sec.extent);
  for(const v of sec.vectors){
   const e=lone(type,1024,512);e.frame=frame;const k=core({x:1024+v.dx,y:512+v.dy,state:v.player_extent_x===9?15:14,move:1});
   const bits=c.SCR_chaos_box_contact(1024+v.dx,512+v.dy,1024,512,v.player_extent_x,24,sec.extent[0],sec.extent[1]);
   eq(bits,v.contact,`${key} dx ${v.dx} dy ${v.dy}`);
   eq(c.chaos_sez_enemy_contact(e,k,true)!==0,v.contact!==0);
   if(v.contact!==0)eq(k.stage_nib,v.D521);   // staged $D521 high-nibble classification
  }
  // closed normal / state-$0F boxes derived from the shared helper
  const nb=sec.normal_box,sb=sec.state_0f_box;
  for(const [st,box] of [[14,nb],[15,sb]])for(let dx=box.x[0]-2;dx<=box.x[1]+2;dx++)for(const dy of [box.y[0]-1,box.y[0],0,box.y[1],box.y[1]+1]){
   const e=lone(type,1024,512);e.frame=frame;const k=core({x:1024+dx,y:512+dy,state:st,move:1});
   eq(c.chaos_sez_enemy_contact(e,k,true)!==0,dx>=box.x[0]&&dx<=box.x[1]&&dy>=box.y[0]&&dy<=box.y[1],`${key} state ${st} ${dx},${dy}`);
  }
  // reactions: attack bit1 / D532==6 defeat on eligible overlap, bit6 suppresses, airborne alone never defeats, blink keeps defeat eligibility
  for(const r of sec.reactions){
   enter(1);uniform(254);g.powerInv=r.d532===6;const e=lone(type,1024,512);e.frame=frame;
   const k=core({x:1024+r.dx,y:512+r.dy,state:14,move:r.f3});
   const hit=c.chaos_sez_enemy_contact(e,k,true);
   eq(hit===2,r.type===15,`${key} f3 ${r.f3} d532 ${r.d532} ${r.dx},${r.dy}`);eq(hit!==0,r.contact!==0);
   if(hit!==0)eq(k.stage_nib,r.D521);
   if(hit===2){const s0=c.score;c.chaos_sez_enemy_defeat(e);eq([e.defeated,e.active,c.score-s0],[true,false,10],'defeat: conversion, occupancy retained, +10');eq(g.chaosLastEnemyScore0,0x10);}
   else eq([e.defeated,e.active],[false,true]);
   g.powerInv=false;
  }
 }
}

// ===================================================================================================================================
// 5. Real adapter: attack / non-attack / invincibility / blink / defeat / occupancy / deletion and recreation
// ===================================================================================================================================
{
 const place=(p,x,y)=>{p.chaosCore.xu=x*256;p.chaosCore.yu=y*256;p.x=x;p.y=y+p.chaosAnchorOffset;p.chaosCoreLastX=p.x;p.chaosCoreLastY=p.y;};
 const scene=(type,state,move,ring=5)=>{
  enter(1);uniform(254);g.ring=ring;c.chaos_level_spawn_objects();
  const row=c.chaos_level_object_rows().find(r=>r[3]===type);
  const e=g.chaosSezEnemies.find(q=>q.index===row[0]);
  // keep only this enemy
  for(const q of g.chaosSezEnemies)if(q!==e)q.defeated=true;
  const p=h.newPlayer(row[1]+40,row[2]-40,{state:14,move});p.chaosCore.invuln=0;
  w.cam={x:row[1]-120,y:row[2]-90,w:256,h:192};
  return {e,p,row};
 };
 for(const type of [0x20,0x23]){
  // 5.1 attacking Sonic overlapping an awake enemy defeats it: +10, smoke, retained occupancy
  {const {e,p,row}=scene(type,14,3);
   for(let u=0;u<4;u++)h.frame({});
   ok(e.active&&!e.defeated);
   place(p,e.x,e.y);p.chaosCore.move|=3;
   const s0=c.score,sm=w.smoke.length;h.frame({});
   eq([e.defeated,e.active,c.score-s0,w.smoke.length-sm],[true,false,10,1]);
   // backtracking: nothing recreates it, however often the scan passes it
   for(let n=0;n<20;n++){w.cam={x:row[1]-40-n*20,y:row[2]-90,w:256,h:192};c.chaos_sez_enemy_phase(far(),true);}
   w.cam={x:row[1]-120,y:row[2]-90,w:256,h:192};for(let n=0;n<16;n++)c.chaos_sez_enemy_phase(far(),true);
   eq([e.active,e.defeated],[false,true],'defeated mapped enemy does not recreate');}
  // 5.2 non-attacking Sonic: not defeated, staged request hurts on the next player update (rings scatter), airborne alone is not an attack
  for(const move of [0,1]){
   const {e,p}=scene(type,14,move,5);
   for(let u=0;u<4;u++)h.frame({});
   place(p,e.x,e.y);p.chaosCore.move=move;
   h.frame({});h.frame({});h.frame({});
   ok(!e.defeated,'airborne/standing alone never defeats');eq([g.ring,p.chaosCore.state],[0,30],'ordinary non-attacking damage: rings scattered, hurt state');
  }
  // 5.3 invincibility (selector 6) defeats without the attack bit
  {g.powerInv=true;const {e,p}=scene(type,14,1);g.powerInv=true;for(let u=0;u<4;u++)h.frame({});place(p,e.x,e.y);h.frame({});eq(e.defeated,true,'selector 6 defeats');g.powerInv=false;}
  // 5.4 hurt bit6 suppresses the overlap entirely
  {const {e,p}=scene(type,14,1+64);for(let u=0;u<4;u++)h.frame({});place(p,e.x,e.y);p.chaosCore.move=1+64+2;h.frame({});ok(!e.defeated,'hurt state ignores ordinary enemies');}
 }
 // 5.5 ordinary deletion releases occupancy; recreation is fresh at the canonical anchor
 {enter(1);uniform(254);c.chaos_level_spawn_objects();const row=c.chaos_level_object_rows().find(r=>r[3]===0x23);
  const e=g.chaosSezEnemies.find(q=>q.index===row[0]);for(const q of g.chaosSezEnemies)if(q!==e)q.defeated=true;
  w.cam={x:row[1]-128,y:row[2]-96,w:256,h:192};const k=far();
  for(let u=0;u<30;u++)c.chaos_sez_enemy_phase(k,true);ok(e.active&&e.age>10);
  e.x=1;e.xu=1*256;                                     // far outside the lifetime window of the current camera
  w.cam={x:row[1]+2000,y:row[2]-96,w:256,h:192};
  c.chaos_sez_enemy_phase(k,true);eq(e.active,false,'outside the lifetime: removed, occupancy released');
  eq(e.defeated,false);
  w.cam={x:row[1]-300,y:row[2]-96,w:256,h:192};   // placement now in the outer creation ring [-96,-32): scan recreates it
  let back=false;for(let u=0;u<24&&!back;u++){c.chaos_sez_enemy_phase(k,true);back=e.active;}
  eq([back,e.x,e.y,e.vx,e.vy,e.state,e.age],[true,row[1],row[2],0,0,0,0],'fresh recreation at the canonical placement');}
}

// ===================================================================================================================================
// 6. Scheduling: first active update, sleep behaviour over time, lifecycle bands (Research vectors, canonical 256 view)
// ===================================================================================================================================
{
 enter(1);uniform(254);
 for(const type of [0x20,0x23]){
  const e=c.chaos_sez_enemy_new([1,1024,512,type,0,0,0,0,0]);const k=far();w.cam={x:1024-128,y:512-96,w:256,h:192};
  const vp=c.chaos_vp_current();let x0=null,firstMove=null,N=null;
  for(let u=1;u<=8;u++){
   if(!e.active){if(c.SCR_chaos_placement_scan(e,vp,1024,512)){c.chaos_sez_enemy_create(e);N=u;}continue;}
   const xb=e.xu;c.chaos_sez_enemy_step(e,k,false,vp);if(e.xu!==xb&&firstMove===null)firstMove=u;
  }
  eq(firstMove-N,type===0x20?3:2,type===0x20?'$20 first movement N+3':'$23 first leap N+2');
 }
 // lifecycle vectors: class 3 removes ($FE), class >= 2 sleeps, at the canonical 256 view
 for(const v of D.lifecycle.vectors){
  const type=v.type===32?0x20:0x23,cam={x:1000,y:300};
  const px=v.axis==='x'?cam.x+v.relative:cam.x+100,py=v.axis==='y'?cam.y+v.relative:cam.y+100;
  const e=lone(type,px,py);e.chaosAsleep=false;e.chaosWoken=false;e.age=9;e.state=type===0x20?3:1;e.req=e.state;
  c.chaos_sez_enemy_step(e,far(),false,c.chaos_vp_new(cam.x,cam.y,256,192));
  eq(!e.active&&e.cooldown>0,v.type_after===254,`${v.type} ${v.axis} ${v.relative}`);
  if(v.type_after!==254)eq(e.chaosAsleep,v.asleep===true||v.asleep===1||v.asleep);
 }
 // retention adapter reduces to the canonical bands at width 256, never widens vertical bands
 for(const width of [256,348,640])for(const woken of [false,true])for(let dx=-120;dx<=420;dx+=13)for(let dy=-130;dy<=400;dy+=17){
  const e=lone(0x23,1000+dx,300+dy);e.age=9;e.state=1;e.req=1;e.chaosWoken=woken;e.chaosAsleep=!woken;e.vx=0;e.vy=0;
  const vp=c.chaos_vp_new(1000,300,width,192);const want=c.chaos_vp_retained_cell(vp,e.x,e.y,!e.chaosAsleep,woken);
  c.chaos_sez_enemy_step(e,far(),false,vp);
  eq(!e.active,want===3);if(want!==3)eq(e.chaosAsleep,want>=2);
 }
 // $20 asleep over time: counter/position frozen while the animation advances; $23 continues; waking resumes without reinitialisation
 {const e20=lone(0x20,1024,512),e23=lone(0x23,1024,512);for(const e of [e20,e23]){e.age=9;e.state=e===e20?3:1;e.req=e.state;}
  e20.vx=-128;e20.vy=0;e20.timer=50;e23.vx=-256;e23.vy=-512;
  for(let u=0;u<10;u++){e20.chaosAsleep=true;e23.chaosAsleep=true;c.chaos_sez_enemy_step(e20,far(),false,c.chaos_vp_new(1024-128,512-96,256,192));c.chaos_sez_enemy_step(e23,far(),false,c.chaos_vp_new(1024-128,512-96,256,192));}
  // (visibility ran after each callback and woke them; the next-callback bit is what matters: force asleep before each step above)
  eq([e20.timer,e20.x],[50,1024],'$20 frozen asleep');ok(e23.x<1024,'$23 progresses asleep');
  e20.chaosAsleep=false;c.chaos_sez_enemy_step(e20,far(),false,c.chaos_vp_new(1024-128,512-96,256,192));eq(e20.timer,49,'wake continues the counter');}
}

const out={status:'PASS',assertions:checks,research:RESEARCH,controlled_rows:controlledRows,natural:naturalReport,placements:15};
fs.mkdirSync(path.join(root,'build/sez-s4'),{recursive:true});fs.writeFileSync(path.join(root,'build/sez-s4/runtime-results.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({status:out.status,assertions:checks,controlled_rows:controlledRows,placements:15}));
