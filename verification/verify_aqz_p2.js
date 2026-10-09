// Execute shipping GML against pinned A3 original-Z80 callback snapshots.
const fs=require('fs'),path=require('path'),assert=require('assert');
const {loadHost,root}=require('./chaos_world_harness');
const D=JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache/aqz/platform-3f-runtime.json')));
const G=JSON.parse(fs.readFileSync(path.join(root,'POC_notes/rom-cache/aqz/platform-3f-game-checks.json')));
const h=loadHost(),c=h.ctx,g=h.g,w=h.world;let checks=0,rows=0;
const eq=(a,b,m)=>{assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;};
function enter(act=1){h.reset();c.room=c['ROM_chaos_aqz'+act];c.chaos_level_install_layout();w.cam={x:0,y:0,w:256,h:192};w.follow=false;g.chaosConsumedPlatforms=[];}
function core(x,y,vy=1792){const k=c.SCR_cc_new(x,y);Object.assign(k,{zone:4,level:1,state:14,next:14,vy,vx:0,move:129,support:0});return k;}
function platform(rec){return c.chaos_spawn_type3f([rec.index,rec.world_x,rec.world_y,63,0,parseInt(rec.parameter,16),128,parseInt(rec.aux1,16)]);}
function call(o,k){c.chaos_platform3f_script(o);return c.chaos_platform3f_callback(o,k,true);}
function active(rec){const o=platform(rec),k=core(rec.world_x,rec.world_y-60);o.chaosLive=true;o.chaosAsleep=false;call(o,k);call(o,k);return [o,k];}
function compare(o,k,e,label){
 const got={state:o.chaosMode,requested:o.chaosRequestedMode,x:o.chaosX,y:o.chaosY,vy:o.chaosVY,vx:o.chaosVX,timer:o.chaosDelay,fall:o.chaosPhase,sag:o.chaosSag,sag_return:o.chaosSagReturning?255:0,owner:k.support!==0,px:Math.floor(k.xu/256),py:Math.floor(k.yu/256),pvx:k.vx,pvy:k.vy};
 for(const [key,v] of Object.entries(got))eq(v,key==='owner'?e.owner!==0:e[key],`${label} ${key}`);
 eq(o.chaosYU&255,e.fractions[1],label+' Y fraction');rows++;
}
// All natural $83/$86 routine snapshots, including every delay/turn boundary.
for(const v of D.variants){
 enter();const rec=D.creators.find(x=>x.placement.parameter===v.parameter).placement;const [o,k]=active(rec);
 for(const e of v.rows){k.xu=o.chaosX*256;k.yu=(o.chaosY-(e.update===1?14:60))*256;call(o,k);compare(o,k,e,v.parameter+' '+e.update);}
}
// Complete awake and asleep state14 route, same script record transitions.
for(const sleep of [false,true]){
 enter(2);const rec=D.creators[2].placement,[o,k]=active(rec);k.yu=(o.chaosY-14)*256;c.chaos_platform3f_callback(o,k,true);eq(o.chaosRequestedMode,14);o.chaosWeight=false;o.chaosAsleep=sleep;
 for(const e of D.route[sleep?'asleep':'awake']){
  k.xu=o.chaosX*256;k.yu=(o.chaosY-60)*256;call(o,k);
  compare(o,k,e,'route '+sleep+' '+e.update);eq(o.chaosCounter,e.counter,'record counter');
 }
}
// State13 predicate sweep from the ROM, independent of type/parameter naming.
for(const v of D.gate_vectors){
 enter(2);const [o,k]=active(D.creators[2].placement);o.chaosSavedMode=(v.param&63)+1;o.chaosAsleep=!!v.sleep;k.zone=v.zone;o.chaosAct=v.act;k.vy=v.vy;k.yu=(o.chaosY+v.dy)*256;
 c.chaos_platform3f_callback(o,k,true);eq(o.chaosRequestedMode,v.requested,'state13 gate');eq(k.support,0,'gate cannot claim support');
}
// Exact original post-movement geometry/velocity/owner snapshots.
enter(2);
for(const v of D.callback_support){
 const [o,k]=active(D.creators[2].placement);o.chaosWeight=false;o.chaosCallback=v.callback;o.chaosVX=0;o.chaosVY=v.callback===0x86a1?v.platform_vy:0;
 k.xu=(o.chaosX+v.dx)*256;k.yu=(o.chaosY+v.dy)*256;k.vy=v.player_vy;k.support=v.owner_in===9?o.chaosOwnerId:v.owner_in;
 c.chaos_platform3f_callback(o,k,true);eq(k.support===o.chaosOwnerId?9:k.support,v.owner_out,'callback owner');eq(Math.floor(k.yu/256),v.player_y,'callback projection');
}
// Natural placements from the real loader, with original scheduler phase order.
for(const act of [1,2,3]){
 enter(act);c.chaos_level_spawn_objects();eq(w.platforms.filter(o=>o.chaosType3f).length,act===1?2:act===2?1:0);
 for(const t of [60,61,89])eq(g.chaosSpawnedByType[t]||0,0,'P3/P4 remain absent');
}
// Supplemental original-ROM controls for interrupted sag and staged flags.
const EXTRA=JSON.parse(fs.readFileSync(path.join(root,'verification/aqz-p2/extra-rom-controls.json')));
for(const group of EXTRA.groups){
 enter(group.placement.act+1);const [o,k]=active(group.placement);
 for(const [i,row] of group.rows.entries()){
  const v=row.input;k.xu=(v.x&65535)*256;k.yu=(v.y&65535)*256;k.vx=v.vx;k.vy=v.vy;k.box_ready=0;
  call(o,k);compare(o,k,row.output,group.placement.parameter+' supplemental '+i);
  eq(k.box_ready,row.output.d521,'D521');
 }
}
// Closed rectangle trigger, top classification and state-$0F extents; any
// qualifying side/bottom/rising contact must still move on this callback.
enter();
for(const state of [14,15])for(let dx=-26;dx<=26;dx++)for(let dy=-18;dy<=26;dy++)for(const vy of [-1,0,256]){
 const [o,k]=active(D.creators[0].placement);k.state=state;k.vy=vy;k.xu=(o.chaosX+dx)*256;k.yu=(o.chaosY+dy)*256;k.support=0;
 const ex=state===15?25:24,trigger=Math.abs(dx)<=ex&&dy>=-16&&dy<=24;
 call(o,k);eq(o.chaosX,D.creators[0].placement.world_x+(trigger?1:0),'trigger rectangle');
}
// Full strict removal boundaries at SMS and widescreen; marking does not skip
// this callback's move. Released occupancy gets fresh counters/origin on reload.
for(const width of [256,348,640])for(const v of D.boundaries.filter(v=>'distance' in v)){
 enter();const [o,k]=active(D.creators[0].placement);o.chaosLatch=1;
 k.xu=(o.chaosX+(v.axis==='x'?v.distance:0))*256;k.yu=((o.chaosY+(v.axis==='y'?v.distance:0))&65535)*256;
 const xb=o.chaosX;c.chaos_platform3f_phase(o,k,true,{left:0,top:0,w:width,h:192});eq(o.chaosLive,v.type===63,'PLAYER_DIST '+width);eq(o.chaosX,xb+1,'marked callback still moves');
}
// Falling sign-only gate (not the relative-speed gate) from original snapshots.
for(const v of D.boundaries.filter(v=>v.fall_sign_only_gate)){
 enter(v.parameter==='0x8B'?2:1);const rec=D.creators.find(x=>x.placement.parameter===v.parameter).placement,[o,k]=active(rec);
 o.chaosCallback=0x8719;o.chaosPhase=255;o.chaosVY=512;o.chaosWeight=false;k.vy=0;k.yu=(o.chaosY-14)*256;
 c.chaos_platform3f_callback(o,k,true);eq([o.chaosVY,k.support!==0,Math.floor(k.yu/256)],[560,true,v.fall_sign_only_gate.py]);
}
// Prior asleep flag, rather than the new lifecycle cell, selects the callback.
// A triggered fall spends its token on the FOLLOWING sleeping callback; idle
// sleep only returns, and ordinary generic deletion releases after cleanup.
for(const param of ['0x83','0x8B']){
 enter(param==='0x8B'?2:1);const rec=D.creators.find(x=>x.placement.parameter===param).placement,[o,k]=active(rec);
 o.chaosOccupied=true;const pool=c.chaos_s2_state(),slot=7,s=c.chaos_s2_slot();s.type=63;s.platform3f=o;pool.slots[slot]=s;
 o.chaosSlot=slot;o.chaosPhase=128;o.chaosCallback=0x8719;o.chaosMode=param==='0x83'?4:14;o.chaosRequestedMode=o.chaosMode;o.chaosScriptMode=o.chaosMode;
 o.chaosCounter=100;o.chaosDelay=80;
 const vp={left:o.chaosX-320,top:o.chaosY-100,w:256,h:192};k.yu=(o.chaosY-60)*256;
 c.chaos_platform3f_visit(s,pool,slot,k,true,vp);eq([o.chaosDelay,o.chaosAsleep,o.chaosLive],[79,true,true]);
 c.chaos_platform3f_visit(s,pool,slot,k,true,vp);eq([o.chaosConsumed,o.chaosToken,o.chaosRuntimeParameter,s.type],[true,0,128,254]);
 c.chaos_platform3f_visit(s,pool,slot,k,true,vp);eq(s.type,255);
 c.chaos_platform3f_visit(s,pool,slot,k,true,vp);eq([pool.slots[slot].type,o.chaosOccupied],[0,true]);
 c.chaos_platform3f_scan(o,pool,vp);eq(o.chaosLive,false,'spent placement cannot recreate');
}
// Pool exhaustion is silent and preserves the unallocated placement, then
// first-free slot allocation and ordinary release/recreation are deterministic.
enter();{
 const o=platform(D.creators[1].placement),pool=c.chaos_s2_state(),vp={left:o.chaosX-320,top:o.chaosY-100,w:256,h:192},k=core(o.chaosX,o.chaosY-60);
 for(let i=7;i<18;i++)pool.slots[i].type=1;c.chaos_platform3f_scan(o,pool,vp);eq([o.chaosLive,o.chaosOccupied],[false,false]);
 pool.slots[9].type=0;c.chaos_platform3f_scan(o,pool,vp);eq([o.chaosSlot,o.chaosLive,o.chaosOccupied],[9,true,true]);
 const s=pool.slots[9];c.chaos_platform3f_visit(s,pool,9,k,true,vp);c.chaos_platform3f_visit(s,pool,9,k,true,vp);
 const far={left:o.chaosX+1000,top:o.chaosY-100,w:256,h:192};c.chaos_platform3f_visit(s,pool,9,k,true,far);eq(s.type,254);
 c.chaos_platform3f_visit(s,pool,9,k,true,far);c.chaos_platform3f_visit(s,pool,9,k,true,far);eq(o.chaosOccupied,false);
 c.chaos_platform3f_scan(o,pool,vp);eq([o.chaosLive,o.chaosMode,o.chaosPhase,o.chaosSag,o.chaosX,o.chaosY],[true,0,0,0,o.chaosPlacementX,o.chaosPlacementY]);
}
// No direct water/terrain dependency: every active route and falling callback
// yields identical outputs across water flags/lines and blocked/empty maps.
for(const wet of [false,true]){
 enter(2);const [o,k]=active(D.creators[2].placement);k.yu=(o.chaosY-14)*256;call(o,k);o.chaosWeight=false;
 const snapshots=[];g.chaosTileIds.fill(wet?255:254);g.chaosAqzEnv.line=wet?0:10000;k.water=wet?255:0;
 for(let u=1;u<=730;u++){k.xu=o.chaosX*256;k.yu=(o.chaosY-60)*256;call(o,k);snapshots.push([o.chaosX,o.chaosY,o.chaosYU&255,o.chaosMode,o.chaosVY,o.chaosPhase,o.chaosDelay]);}
 if(!wet)g.dryRoute=snapshots;else eq(snapshots,routeDry,'no water or terrain clamp');
 if(!wet)var routeDry=snapshots;
}
// Real adapter/player -> pool -> placement scan -> publication, without
// substituting the player phase. Remove terrain only to isolate the platform.
// Each shipping h.frame must execute exactly one callback for a live platform.
for(const [act,recordIndex] of [[1,0],[1,1],[2,2]]){
 enter(act);c.chaos_level_spawn_objects();g.chaosTileIds.fill(254);
 const rec=D.creators[recordIndex].placement,o=w.platforms.find(q=>q.chaosPlacementIndex===rec.index);
 const p=h.newPlayer(rec.world_x,rec.world_y-14,{state:14,move:129});p.chaosCore.invuln=1e9;
 let sawOwner=false,firstMove=-1,firstActive=-1;
 for(let u=0;u<40;u++){
  w.cam={x:rec.world_x-128,y:rec.world_y-100,w:640,h:192};
  const before=o.chaosX;h.frame({});
  if(o.chaosMode===(act===1?7:14)&&firstActive<0)firstActive=u;
  if(o.chaosX!==before){if(firstMove<0)firstMove=u;eq(o.chaosX-before,1,'one callback movement per real player update');}
  if(p.chaosCore.support===o.chaosOwnerId){sawOwner=true;eq(p.chaosSupport===o,true,'published support reference');eq(p.x,Math.floor(p.chaosCore.xu/256),'published X');}
 }
 eq(sawOwner,true,'real player acquires platform');
 if(recordIndex!==1)eq(firstMove,firstActive,'first active moving callback carries immediately');
 else {eq(o.chaosMode,4);eq(o.chaosPhase,128);eq(o.chaosDelay>0&&o.chaosDelay<80,true,'real state4 trigger and countdown');}
}
let naturalRows=0;
for(const p of G.placements)for(const [mode,trace] of Object.entries(p.traces)){
 enter(p.placement.act+1);const o=platform(p.placement),k=core(o.chaosX,o.chaosY-60,0);
 for(const r of trace){
  const offset=mode==='rider'?14:60;
  let x=o.chaosLive?o.chaosX:p.placement.world_x,y=o.chaosLive?o.chaosY:p.placement.world_y;
  if(mode==='delete_recreate'){x=p.placement.world_x+(r.u>=25&&r.u<=48?1000:0);y=p.placement.world_y;}
  k.xu=x*256;k.yu=(y-offset)*256;k.vy=mode==='rider'?1792:0;k.vx=0;k.zone=4;k.level=p.placement.act;
  // Whole-game hooks precede the player slot. For non-carried rows the ROM
  // player/terrain result is an INPUT to this object-scheduler replay (not a
  // claim that this test executes the original player CPU/terrain routines).
  if(!r.d3c0){k.xu=r.x*256;k.yu=r.y*256;}k.vy=r.vy;
  w.cam={x:mode==='delete_recreate'?x-(r.u>=49&&r.u<=72?320:100):r.d174,y:mode==='delete_recreate'?y-100:r.d176,w:256,h:192};
  // Original refresh/loader phase is supplied as an input; the P1 fixed-refresh
  // adapter does not emulate variable Z80 instruction/IRQ timing.
  g.chaosAqzEnv.d2e2=r.ev.includes('creator')?0:1;
  if(r.ev.includes('objects')){c.chaos_aqz_pass_begin();c.chaos_s2_phase(k,true);c.chaos_aqz_mapped_scan();}
  eq(o.chaosLive,r.o.length>0,`${p.placement.parameter} ${mode} ${r.u} live`);
  if(r.o.length){const e=r.o[0];
   for(const [key,v] of Object.entries({x:o.chaosX,y:o.chaosY,state:o.chaosMode,req:o.chaosRequestedMode,frame:o.chaosFrame,dur:o.chaosCounter,vx:o.chaosVX,vy:o.chaosVY,fall:o.chaosPhase,sag:o.chaosSag,timer:o.chaosDelay,token:o.chaosToken}))
    eq(v,e[key],`${p.placement.parameter} ${mode} ${r.u} ${key}`);
   eq(o.chaosAsleep,!!(e.f4&64),'prior asleep and post lifecycle');
  }
  eq(o.chaosOccupied?63:0,r.occupancy,'placement occupancy');
  eq(k.support!==0,r.d3c0!==0,'natural support owner');
  eq(Math.floor(k.xu/256),r.x,'natural player X');eq(Math.floor(k.yu/256),r.y,`${p.placement.parameter} ${mode} ${r.u} natural player Y`);naturalRows++;
 }
}
const out={status:'PASS',assertions:checks,callback_rows:rows,natural_rows:naturalRows,research:'89641f8093e62401cd81f94e6ac889422f600472',oracle_research_base:D.research_base};fs.mkdirSync(path.join(root,'build/aqz-p2'),{recursive:true});fs.writeFileSync(path.join(root,'build/aqz-p2/runtime-results.json'),JSON.stringify(out,null,2)+'\n');console.log(out);
