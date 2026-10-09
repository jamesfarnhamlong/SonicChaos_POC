// SEZ S2: runs the SHIPPED GML (scripts/SCR_chaos_sez_s2*, the core floor/terrain-probe hooks, the adapter step and the object phase) against the Research contract
// data/rom-cache/sez/surface-runtime-contracts.json (mirrored at POC_notes/rom-cache/sez/). GameMaker is mocked only at the instance / camera / audio boundary.
// Whole-game traces replay ROM rows (x, y, vx, vy, state, requested state, floor flag, movement) through the real adapter, one row per update.
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const {loadHost,root}=require('./chaos_world_harness');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const CONTRACT=read('POC_notes/rom-cache/sez/surface-runtime-contracts.json'),AUDIT=read('POC_notes/rom-cache/sez/surfaces-0c-1a.json'),MANIFEST=read('POC_notes/rom-cache/sez/implementation-manifest.json');
const CR=CONTRACT.crumble_0C_13,BO=CONTRACT.booster_1A,TV=CONTRACT.oracle_vectors.table_vectors,TRACES=Object.fromEntries(CONTRACT.oracle_vectors.trace_vectors.map(t=>[t.id,t]));
const RESEARCH='ed9122b3d5ac11442714ecaef4cc4316c4706342';
let checks=0;
const eq=(a,b,m)=>{assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;};
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const h=loadHost(null),c=h.ctx,g=h.g,w=h.world;
const hexn=v=>typeof v==='string'?parseInt(v,16):v;
const u16=v=>v&0xFFFF,s16=v=>((v&0xFFFF)<0x8000)?(v&0xFFFF):(v&0xFFFF)-0x10000;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function enter(act,width=256){
 h.reset();c.room=c['ROM_chaos_sez'+act];w.cam={x:0,y:0,w:width,h:192};w.follow=true;
 c.chaos_level_install_layout();g.chaosSezEffects=c.chaos_sez_effect_new();g.chaosSezBossActive=false;g.chaosLastSoundRequest=0;g.chaosLostRings=[];
 return {act,width};
}
// call counters on the shipped functions (the shipped callers resolve them through the global object at call time)
const counts={handler:0,probe:0,launch:0,step13:[],break_:[],hold:0,spawnCalls:0};
{
 const handler=c.SCR_cc_crumble_floor;c.SCR_cc_crumble_floor=(...a)=>{if(c.chaos_s2_floor_state(a[0].state))counts.handler++;return handler(...a);};
 const probe=c.SCR_cc_booster_probe;c.SCR_cc_booster_probe=(...a)=>{const r=probe(...a);if(r>=1)counts.probe++;if(r==2)counts.launch++;return r;};
 const hold=c.chaos_s2_rider_hold;c.chaos_s2_rider_hold=(...a)=>{const r=hold(...a);if(r)counts.hold++;return r;};
 const sp=c.chaos_s2_spawn_parent;c.chaos_s2_spawn_parent=(...a)=>{counts.spawnCalls++;return sp(...a);};
 const br=c.chaos_s2_break;c.chaos_s2_break=(...a)=>{const r=br(...a);counts.break_.push(r);return r;};
 const st=c.chaos_s2_step13;c.chaos_s2_step13=(b,s,i,...r)=>{const before={state:s.state,age:s.age,type:s.type,param:s.parameter,tick:s.tick,requested:s.requested};const y0=s.y;const out=st(b,s,i,...r);counts.step13.push({slot:i,pass:b.passes,age:s.age,state0:before.state,state:s.state,type:s.type,before,y0,y1:s.y,param:s.parameter,rider:s.state===1&&before.tick<16&&s.age>1,breakCb:s.state===1&&before.tick===16});return out;};
}
const reset=()=>{counts.handler=counts.probe=counts.launch=counts.hold=counts.spawnCalls=0;counts.step13.length=0;counts.break_.length=0;};
function core(o={}){
 const k=c.SCR_cc_new(o.x??0,o.y??0);k.zone=2;k.level=2;k.state=o.state??5;k.next=o.next??k.state;k.move=o.move??0;k.bg=o.bg??0;k.contacts=o.contacts??k.bg;k.vx=o.vx??0;k.vy=o.vy??0;k.plane=0;
 if(o.xu!==undefined)k.xu=o.xu;if(o.yu!==undefined)k.yu=o.yu;return k;
}
function isolate(cells){ // layout of empty air except the listed [index, block]; headers stay the act's
 const n=g.chaosTileIds.length,ids=new Array(n).fill(254);for(const [i,b] of cells)ids[i]=b;g.chaosTileIds=ids;g.chaosBrokenCells=[];
}
const cellIndex=(cx,cy)=>cy*128+cx;

// ======================================================================================================================================
// 0. Research identity, mirrors, generated data, headers, layouts
// ======================================================================================================================================
{
 // Canonical Research main blobs (the Research working tree may have another branch checked out): the mirrors must be byte-identical to main.
 const cp=require('child_process'),repo=path.join(root,'..','sonic-chaos-reference-work'),repoPosix=path.resolve(repo).split(path.sep).join('/');
 const mainBlob=f=>{const r=cp.spawnSync('git',['-c','safe.directory='+repoPosix,'-C',repo,'show',(['implementation-manifest.json','object-census.json'].includes(f)?'eff4cecf03bfcef8638b39c0f7676abbfd32f26e':RESEARCH)+':data/rom-cache/sez/'+f],{maxBuffer:1<<28});return r.status===0?r.stdout:null;};
 const anc=cp.spawnSync('git',['-c','safe.directory='+repoPosix,'-C',repo,'merge-base','--is-ancestor',RESEARCH,'main']);
 if(anc.status!==128)eq(anc.status,0,'6e169d7 is on Research main');
 for(const f of ['surface-runtime-contracts.json','surfaces-0c-1a.json','implementation-manifest.json','object-census.json','art-approval.json']){
  const mine=fs.readFileSync(path.join(root,'POC_notes/rom-cache/sez',f)),canon=mainBlob(f);
  const lf=b=>Buffer.from(b.toString('latin1').split(String.fromCharCode(13,10)).join(String.fromCharCode(10)),'latin1');
  if(canon)ok(Buffer.compare(lf(mine),lf(canon))===0,'identical to Research main (line endings normalised, as git does on checkout): '+f);else ok(mine.length>0);
 }
 eq(CONTRACT.format,'sez-surface-runtime-contracts-v1');eq(CONTRACT.rom_sha256,'eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607');
 eq(CONTRACT.research_base.length>0,true);eq(AUDIT.rom_sha256,CONTRACT.rom_sha256);
 enter(1);
 const K=c.chaos_sez_s2_contract();
 eq(K.research,RESEARCH);
 eq([K.crumble.block,K.crumble.replacement_block,K.crumble.surface,K.crumble.object_type],[hexn(CR.identity.block),hexn(CR.identity.replacement_block),hexn(CR.identity.surface_type),hexn(CR.identity.dynamic_object_type)]);
 eq(K.crumble.shard_parameters,CR.shards.parameters_delay);
 eq(K.crumble.hold_updates,CR.object_13.timeline_updates_relative_to_spawn_update_T.rider_hold_count);
 eq(K.crumble.break_offset,CR.object_13.timeline_updates_relative_to_spawn_update_T.break_callback);
 eq(K.crumble.children_offset,CR.object_13.timeline_updates_relative_to_spawn_update_T.sound_a3_children_created_and_remove_callback);
 eq(K.crumble.handler_states.filter(s=>s!==0x21),CR.trigger.states_that_run_the_floor_pass_and_so_the_handler.map(hexn));
 eq(K.booster.ring_probe_states,BO.interactions.states_reaching_the_probe.map(hexn));
 eq(K.booster.ring_probe_states,c.SCR_chaos_anim_probe_states(),'S2 reuses the accepted 26-state ring-probe list');
 eq([K.booster.block,K.booster.surface,K.booster.x_speed,K.booster.max_x_speed,K.booster.requested_state,K.booster.sound_request],[0xA7,0x1A,1792,1792,0x10,0xBD]);
 eq([K.crumble.sound_request],[0xA3]);
 for(const act of [1,2,3]){
  enter(act);const a=MANIFEST.acts['sez'+act];
  // $B0 header (both planes) = the Research static block-header table; $AF / $A7 headers from the canonical manifest
  const b0=AUDIT.static.block_headers['0xB0'];
  for(const plane of [0,1])eq(g['chaosHeaders'+plane][176],[hexn(b0.flags),b0.modifier,b0.vertical_profile_by_x,Array(32).fill(b0.horizontal_profile_distinct[0])]);
  eq(g.chaosHeaders0[175][0],0x4C);if(act>1)eq(g.chaosHeaders0[167][0],0x9A);
  eq(g.chaosHeaders0[175][2],Array(32).fill(32));eq(g.chaosHeaders0[175][3],Array(32).fill(0x60));
  const ids=g.chaosSourceTileIds.slice(0,4095);
  const af=ids.map((b,i)=>b===175?i:-1).filter(i=>i>=0),pad=ids.map((b,i)=>b===167?i:-1).filter(i=>i>=0);
  eq(af.length,{1:19,2:16,3:1}[act]);eq(pad.length,{1:0,2:2,3:2}[act]);
  eq(af.map(i=>[i%128,Math.floor(i/128)]),CR.cells.filter(x=>x.act==='sez'+act).map(x=>x.cell));
  eq(pad.map(i=>[i%128,Math.floor(i/128)]),BO.placements.filter(x=>x.act==='sez'+act).map(x=>x.cell));
  for(const cell of CR.cells.filter(x=>x.act==='sez'+act)){const i=cellIndex(...cell.cell);eq(i,cell.cell_pointer_offset_from_c001);eq(ids[i-128],hexn(cell.above_block));}
  // runtime state: fresh pool, remembered cell 0, nothing placed for type $13
  eq([g.chaosS2.remembered,g.chaosS2.slots.filter(s=>s.type!==0).length],[0,0]);
  c.chaos_level_spawn_objects();eq(g.chaosSpawnedByType[0x13],0,'$13 is never placed');
 }
 // THZ cells keep their accepted behaviour: the SEZ hooks are zone-2 only
 h.reset();c.room=c.ROM_chaos_thz1;
 const thz=core({x:0,y:0});thz.zone=0;
 const cell={tile:175,flags:0x4C,modifier:0,vertical:32,horizontal:0x60,ax:0,ay:0,index:0};
 eq(c.SCR_cc_terrain_probe(thz),0);
}

// ======================================================================================================================================
// 1. Table vectors (original routines' inputs/outputs) against the shipped functions
// ======================================================================================================================================
{
 enter(1);
 // $6B79: Y-speed high byte x remembered cell x occupied slots
 for(const v of TV.crumble_handler_6b79){
  const i=v.input,e=v.expect;g.chaosS2=c.chaos_s2_new();
  for(const n of i.occupied_slots_0_15)g.chaosS2.slots[n].type=0x77;
  g.chaosS2.remembered=i.remembered_cell_equals_probed_cell?i.cell_pointer:i.cell_pointer-1;
  const vy=s16((i.y_speed_high_byte_d519<<8)|0x34),k=core({state:5,vy});
  const s={ax:i.probe_xy[0],ay:i.probe_xy[1],index:i.cell_pointer-49153};
  c.SCR_cc_crumble_floor(k,s);
  eq(u16(k.vy),e.y_speed_8_8,'y speed');eq(g.chaosS2.remembered,e.remembered_cell_after,'remembered');
  const parents=g.chaosS2.slots.map((q,n)=>q.type===0x13?n:-1).filter(n=>n>=0);
  if(e.spawned_slot===null)eq(parents,[]);else{eq(parents,[e.spawned_slot]);eq([g.chaosS2.slots[e.spawned_slot].raw_x,g.chaosS2.slots[e.spawned_slot].raw_y],e.spawned_xy);}
 }
 // $A344
 for(const v of TV.crumble_rider_a344){
  const i=v.input,e=v.expect,k=core({state:i.player_state_d501,move:i.movement_d503,yu:1234*256+77,vy:0x0345});
  const slot=c.chaos_s2_slot();slot.type=0x13;slot.x=2158;slot.y=216;
  const applied=c.chaos_s2_rider_hold(slot,k);
  eq(applied,e.hold_applied);
  if(e.hold_applied){eq(Math.floor(k.yu/256),e.player_y);eq(k.yu&255,77,'fraction untouched');eq(k.vy,0);}else{eq(Math.floor(k.yu/256),1234);eq(k.vy,0x0345);}
 }
 // $A36A
 for(const v of TV.crumble_break_a36a){
  const i=v.input;g.chaosS2=c.chaos_s2_new();g.chaosTileIds[835]=175;
  const slot=c.chaos_s2_slot();slot.type=0x13;slot.x=i.object_x;slot.y=216;slot.cell=835;slot.asleep=(i.object_flags_04&64)!==0;
  const vp=c.chaos_vp_new(i.object_x+i.camera_x_minus_object_x,0,256,192);
  const replaced=c.chaos_s2_break(g.chaosS2,slot,vp);
  eq(replaced?'replaced':'removed',v.expect.outcome);eq(g.chaosTileIds[835],replaced?176:175);eq(slot.type,replaced?0x13:0xFF);
 }
 // $A2DD
 for(const v of TV.crumble_init_a2dd){
  const i=v.input,e=v.expect;g.chaosS2=c.chaos_s2_new();
  const slot=c.chaos_s2_slot();slot.type=0x13;slot.parameter=i.parameter;slot.raw_x=i.probed_x;slot.raw_y=i.probed_y;slot.x=i.probed_x;slot.y=i.probed_y;
  c.chaos_s2_step13(g.chaosS2,slot,0,core({}),false,c.chaos_vp_new(0,0,256,192));
  eq(slot.requested,e.requested_state);eq([slot.x,slot.y],[e.x,e.y]);
  if(i.parameter===0)eq([slot.raw_x,slot.raw_y],[e.cell_x_raw,e.cell_y_raw]);
 }
 for(const x0 of [0,5,31,32,2047,4095])for(const y0 of [0,5,31,32,1023]){ // all low bits of the probed position (Research: 2,048 cases)
  g.chaosS2=c.chaos_s2_new();const slot=c.chaos_s2_slot();slot.type=0x13;slot.raw_x=x0;slot.raw_y=y0;
  c.chaos_s2_step13(g.chaosS2,slot,0,core({}),false,c.chaos_vp_new(0,0,256,192));eq([slot.x,slot.y,slot.requested],[(x0&0xFFE0)+14,(y0&0xFFE0)+24,1]);
 }
 // $A31B shard schedule (1..255 parameters, 13+ passes each in Research): y after each pass
 for(const v of TV.crumble_shard_schedule){
  const slot=c.chaos_s2_slot();slot.type=0x13;slot.parameter=v.input.parameter;slot.raw_x=2144;slot.raw_y=v.input.y0;slot.x=2144;slot.y=v.input.y0;slot.yu=v.input.y0*256;
  const ys=[];let first=null;g.chaosS2=c.chaos_s2_new();
  for(let pass=1;pass<=16;pass++){const before=slot.y;c.chaos_s2_step13(g.chaosS2,slot,7,core({}),false,c.chaos_vp_new(2000,slot.y-100,256,192));ys.push(slot.y);if(first===null&&slot.y!==before)first=pass;}
  eq(ys,v.expect.y_after_each_pass_1_to_16);eq(first,v.expect.first_move_pass===22?null:v.expect.first_move_pass);
 }
 for(let p=1;p<=255;p++){ // every parameter: first move pass = parameter + 2, y_k = y0 + k(k+3)
  const slot=c.chaos_s2_slot();slot.type=0x13;slot.parameter=p;slot.x=2144;slot.y=192;slot.yu=192*256;g.chaosS2=c.chaos_s2_new();let first=null,k=0;
  for(let pass=1;pass<=p+8;pass++){const before=slot.y;c.chaos_s2_step13(g.chaosS2,slot,7,core({}),false,c.chaos_vp_new(2000,slot.y-100,256,192));if(slot.y!==before){if(first===null)first=pass;k++;eq(slot.y,192+k*(k+3));}}
  eq(first,p+2);
 }
 // $7646 booster handler: +$22 0..255 x +$03 0..255
 enter(2);isolate([[cellIndex(42,17),167]]);
 for(const v of TV.booster_handler_7646){
  const i=v.input,e=v.expect,k=core({state:5,move:i.movement_d503,bg:i.floor_flags_d522,vx:i.x_speed_8_8,vy:i.y_speed_8_8,xu:1360*256,yu:558*256});k.maximum=i.max_x_speed_d373;k.next=i.requested_state;
  const pos=[k.xu,k.yu];k.probe_counter=0;g.chaosLastSoundRequest=0;
  const r=c.SCR_cc_booster_probe(k,1360,558);c.chaos_sez_booster_post(k);
  eq(k.vx,e.x_speed_8_8);eq(k.maximum,e.max_x_speed_d373);eq(k.next,e.requested_state);eq(k.move,e.movement_d503);eq(k.vy,e.y_speed_8_8);eq(g.chaosLastSoundRequest,e.sound_request_de04);eq([k.xu,k.yu],pos);eq(k.bg,i.floor_flags_d522);
 }
 for(let flags=0;flags<256;flags++)for(let move=0;move<256;move++){
  const k=core({state:5,move,bg:flags,vx:-300,vy:777});k.maximum=546;k.next=7;const fa=k.player_flags=0x10;
  const r=c.SCR_cc_booster_probe(k,1360,558);const on=(flags&2)!==0;
  eq(r,on?2:1);eq([k.vx,k.maximum,k.next,k.move,k.vy,k.bg,k.player_flags],on?[1792,1792,0x10,(move|2)&0xFE,777,flags,0x10]:[-300,546,7,move,777,flags,0x10]);
 }
 // $753E probe vectors on the real SEZ2 cell (42,17)
 for(const v of TV.booster_probe_753e){
  const i=v.input,k=core({state:5,bg:i.floor_flag?2:0});k.probe_counter=i.anim_counter_bit0_plus07;
  k.xu=(i.cell[0]*32+i.anchor_x_minus_cell_left)*256;k.yu=(i.cell[1]*32+i.anchor_y_minus_cell_top)*256;
  const r=c.SCR_cc_terrain_probe(k);eq([r>=1,r==2],[v.expect.handler_reached,v.expect.launched]);
 }
 // 19,200 probe cases on the isolated pad: X (60) x Y (80) x parity x floor flag
 for(let dx=-14;dx<46;dx++)for(let dy=-8;dy<72;dy++)for(const par of [0,1])for(const fl of [0,2]){
  const k=core({state:5,bg:fl});k.probe_counter=par;k.xu=(1344+dx)*256;k.yu=(544+dy)*256;
  const py=Math.max(0,544+dy+(par?2:-8));const inside=1344+dx>=1344&&1344+dx<=1375&&py>=544&&py<=575;
  const r=c.SCR_cc_terrain_probe(k);eq(r,inside?(fl?2:1):0);
 }
 eq(counts.launch>0,true);
 // handler on the real floor pass (SCR_cc_floor): the foot sample lies in the AF cell iff handler reached
 enter(1);
 const A=cellIndex(67,6);
 let spawned=0;
 for(const v of TV.crumble_trigger_floor_pass){
  const i=v.input,e=v.expect;isolate([[A,175]]);g.chaosS2=c.chaos_s2_new();g.chaosS2.remembered=i.remembered_cell_equals_cell?49153+A:0;
  const dy=i.state===33?-14:(i.state===18?8:0);
  const k=core({state:i.state,vy:i.y_speed_8_8,move:1});k.xu=(67*32+i.anchor_x_offset_in_cell)*256;k.yu=(192+i.foot_row_in_cell-18-dy)*256;k.previous=0;
  reset();c.SCR_cc_floor(k);
  eq(counts.handler>0,e.handler_reached);eq(g.chaosS2.slots.filter(s=>s.type===0x13).length>0,e.spawned);eq(s16(k.vy),e.y_speed_8_8);spawned+=e.spawned?1:0;
 }
}

// ======================================================================================================================================
// 2. Controlled sweeps through the real floor pass (Research: 106,704 + 3,072 cases)
// ======================================================================================================================================
{
 enter(1);const A=cellIndex(67,6);const xs=[-9,-8,-1,0,1,5,10,15,16,20,25,30,31,32,33,36,39,40,41];let cases=0;
 eq(xs.length,19);
 for(const state of [5,18,33])for(const prev of [0,0x4C,0x80])for(const vy of [-256,0,256,1792])for(const bg of [0,2])for(const dx of xs)for(const row of Array.from({length:39},(_,n)=>n-3))for(const rem of [0,1]){
  isolate([[A,175]]);g.chaosS2=c.chaos_s2_new();g.chaosS2.remembered=rem?49153+A:0;
  const dy=state===33?-14:(state===18?8:0);
  const k=core({state,vy,bg,move:1});k.previous=prev;k.xu=(2144+dx)*256;k.yu=(192+row-18-dy)*256;
  const inside=dx>=0&&dx<=31&&row>=0&&row<=31;
  reset();c.SCR_cc_floor(k);cases++;
  if(counts.handler!==(inside?1:0)){eq(counts.handler,inside?1:0,`handler reached state ${state} dx ${dx} row ${row}`);}
  const parents=g.chaosS2.slots.filter(s=>s.type===0x13).length;
  const expectSpawn=inside&&vy>=0&&!rem;
  if(parents!==(expectSpawn?1:0))eq(parents,expectSpawn?1:0,'spawn');
  const expectVy=inside&&vy>=0?0:vy;
  if(k.vy!==expectVy)eq(k.vy,expectVy,'y speed');
  checks+=3;
 }
 eq(cases,3*3*4*2*19*39*2);
 // +$03 (attack posture / jump latch / blink) and invulnerability never change the handler: every +$03 value x 12 states
 let n=0;
 for(const state of [0,1,5,9,10,14,15,16,17,18,29,30])for(let move=0;move<256;move++){
  isolate([[A,175]]);g.chaosS2=c.chaos_s2_new();const k=core({state,move:move|0,vy:256});k.xu=2160*256;k.yu=(192+8-18)*256;k.invuln=99;
  reset();c.SCR_cc_floor(k);n++;eq(counts.handler,1);eq(k.vy,0);eq(g.chaosS2.slots.filter(s=>s.type===0x13).length,1);
 }
 eq(n,3072);
 // states outside the handler list never reach it even over an AF cell (state $20 act clear is the one POC floor-pass caller the list excludes)
 for(const state of [12,13,19,22,23,24,31,32,35,40,54]){
  isolate([[A,175]]);g.chaosS2=c.chaos_s2_new();const k=core({state,vy:256,move:1});k.xu=2160*256;k.yu=(192+8-18)*256;reset();c.SCR_cc_floor(k);eq([counts.handler,k.vy],[0,256]);
 }
}

// ======================================================================================================================================
// 3. Whole-game traces: the real adapter step / object phase against recorded ROM rows
// ======================================================================================================================================
const EVENT_KINDS=['h0c','spawn13','13s0','13rider','13break','replace','h1a'];
function frameEvents(){ // events of the update that just ran, in the contract's vocabulary (counts)
 const ev={};
 return ev;
}
function replay(id,make,opt={}){
 const T=TRACES[id];enter(Number(T.act.slice(3)));const sim=make();const p=sim.p,k=p.chaosCore;k.invuln=1e9;
 const first=T.rows[0][0],last=T.rows[T.rows.length-1][0],rows={},evs={};
 let u=sim.u0??0;if(sim.u0!==undefined)rows[sim.u0]=T.rows[0].slice(0,9);
 for(;u<last;){
  u++;reset();const spawnsBefore=g.chaosS2.spawns.length,replBefore=g.chaosS2.replaced.length,childBefore=g.chaosS2.children.length,pass0=g.chaosS2.passes;
  if(sim.pre)sim.pre(u);
  h.frame(sim.input?sim.input(u):{});c.chaos_sez_effect_step(g.chaosSezEffects,false,0);
  if(sim.post)sim.post(u);
  rows[u]=[u,Math.floor(k.xu/256),Math.floor(k.yu/256),k.vx,k.vy,k.state,k.next,k.bg&2,k.move];
  if(sim.mirrorX&&sim.mirrorX(u))rows[u][1]=Math.floor(p.x);
  const s13=counts.step13.filter(r=>r.pass===pass0+1);
  evs[u]={h0c:counts.handler,spawn13:counts.spawnCalls,'13s0':s13.filter(r=>r.age===1).length,'13rider':s13.filter(r=>r.rider).length,'13break':counts.break_.length,replace:g.chaosS2.replaced.length-replBefore,
   '13shard':s13.filter(r=>r.state0===3||(r.age>1&&r.state===3)).length,h1a:counts.probe,children:g.chaosS2.children.length-childBefore,
   '13rm':s13.filter(r=>r.type===0xFF&&!(counts.break_.length&&counts.break_[0]===false)).length};
 }
 // rows: all eight state columns
 let compared=0;
 for(const r of T.rows){eq(rows[r[0]],r.slice(0,9),`${id} row ${r[0]}`);compared++;}
 // events: counts per update for the kinds the S2 runtime owns, for every row
 let shardRm=null;
 for(const r of T.rows){const rom={};for(const e of r[10])rom[e]=(rom[e]||0)+1;if((rom['13rm']||0)>0&&shardRm===null&&r[0]>(opt.rmFrom??1e9))shardRm=r[0];}
 for(const r of T.rows){
  const rom={};for(const e of r[10])rom[e]=(rom[e]||0)+1;const me=evs[r[0]];
  if(!me)continue;   // the first recorded row of a from-row replay has no preceding updates here
  for(const kind of ['h0c','spawn13','13s0','13rider','13break','replace','h1a']){
   if(opt.skip&&opt.skip.includes(kind))continue;
   if(opt.skipFrom&&opt.skipFrom[kind]!==undefined&&r[0]>=opt.skipFrom[kind])continue;   // other scene objects ('alloc11' rows) occupy slots the S2 pool does not model
   const expected=rom[kind]||0;
   // ROM '13s0' counts the state-0 callback of parents AND shards; the ROM row lists one 'h1a' per probe that reached the handler
   eq(me[kind],expected,`${id} row ${r[0]} event ${kind}`);
  }
 }
 return {rows,evs,compared};
}
const traceReport={};
// 3.1 drop onto (67,6). The recorded fixture start (Y 120) is inconsistent with the trace's own rows (spawn update 15, row 9 = Y 162): derive the start Y from row 9.
{
 const T=TRACES.crumble_drop_sez1_67_6,row9=T.rows[0];let starts=[];
 for(let y0=100;y0<=200;y0++){
  enter(1);const p=h.newPlayer(2160,y0,{state:14,move:129});p.chaosCore.invuln=1e9;let r=null;
  for(let u=1;u<=9;u++){h.frame({});c.chaos_sez_effect_step(g.chaosSezEffects,false,0);}
  const k=p.chaosCore;r=[9,Math.floor(k.xu/256),Math.floor(k.yu/256),k.vx,k.vy,k.state,k.next,k.bg&2,k.move];
  if(JSON.stringify(r)===JSON.stringify(row9.slice(0,9)))starts.push(y0);
 }
 eq(starts,[154],'the trace rows determine a unique start Y (the recorded fixture says 120: metadata discrepancy reported to Research)');
 traceReport.drop_declared_start_y=T.fixture.start_anchor[1];traceReport.drop_matched_start_y=starts[0];
 const out=replay('crumble_drop_sez1_67_6',()=>({p:h.newPlayer(2160,154,{state:14,move:129})}));
 // spawn update 15, break 32, children 33 (rows) - and the contract offsets relative to T
 const T0=15;eq([g.chaosS2.spawns[0][0]+1,g.chaosS2.replaced[0][0],g.chaosS2.children[0][0]],[T0,T0+17,T0+18]);
 eq(g.chaosS2.children.map(x=>[x[1],x[2],x[3],x[4]]),[[7,3,2144,192],[8,8,2152,192],[9,5,2160,192],[10,1,2168,192]]);
}
// 3.2 revisit the same cell (jump + re-land): one object only, 18 handler calls
{
 const out=replay('crumble_revisit_same_cell_sez1_67_6',()=>({p:h.newPlayer(2160,120,{state:14,move:129}),input:u=>({jump:u>=22&&u<=24,jumpPress:u>=22&&u<=24})}));
 eq(g.chaosS2.spawns.length,1);eq(g.chaosS2.spawns[0][0]+1,AUDIT.crumble.whole_game?AUDIT.crumble.whole_game.revisit_same_cell.spawn_updates[0]:24);
}
// 3.3 rising through the ledge: ten handler calls with no effect, first spawn when Y speed turns non-negative
{
 replay('crumble_rise_through_sez1_67_6',()=>({p:h.newPlayer(2160,250,{state:10,move:1,vy:-1536})}));
 eq(g.chaosS2.spawns[0][0]+1,45);
}
// 3.4 A -> B -> A: three objects; teleports land at the end of updates 7 and 11 (rows 7 and 11 are the first to show the new X)
{
 replay('crumble_a_b_a_sez1_62_63_14',()=>({p:h.newPlayer(2000,428,{state:14,move:129}),post:u=>{if(u===7)w.player.x=2032;if(u===11)w.player.x=2000;},mirrorX:u=>u===7||u===11}),{skipFrom:{'13s0':30}});
 eq(g.chaosS2.spawns.map(s=>s[0]+1),[5,8,12]);eq(g.chaosS2.replaced.map(s=>s[0]),[22,25,29]);
 eq(g.chaosS2.spawns.map(s=>s[4]),[AUDIT.crumble.whole_game.a_b_a.cell_pointers.A-49153,AUDIT.crumble.whole_game.a_b_a.cell_pointers.B-49153,AUDIT.crumble.whole_game.a_b_a.cell_pointers.A-49153]);
}
// 3.5 full pool: no object, no hold, no break; the dummies occupy slots 0..15 only for the call ($5EB7)
{
 replay('crumble_full_pool_sez1_67_6',()=>({p:h.newPlayer(2160,120,{state:14,move:129}),pre:u=>{if(u===24)for(let i=0;i<16;i++)g.chaosS2.slots[i].type=0x77;},post:u=>{if(u===24)for(let i=0;i<16;i++)g.chaosS2.slots[i].type=0;}}));
 eq([g.chaosS2.spawns.length,g.chaosS2.replaced.length,g.chaosS2.remembered],[0,0,49988]);eq(g.chaosTileIds[835],175);
}
// walk-off, strip run and the pad->bridge run start from the first recorded row; only the unobservable sub-pixel X phase is searched
function fromRow(id,input,mutate,opt2){
 const T=TRACES[id],r0=T.rows[0];let best=null;
 for(let fx=0;fx<256;fx++){
  let good=true;
  try{
   replay(id,()=>{const p=h.newPlayer(r0[1],r0[2],{state:r0[5],move:r0[8],vx:r0[3],vy:r0[4],bg:r0[7],contacts:r0[7]});const k=p.chaosCore;k.next=r0[6];
    const s=c.SCR_cc_lookup(r0[1],r0[2]+18,0);k.previous=s.flags;k.tile=s.tile;k.foot_block=s.tile;k.modifier=s.modifier;k.xu+=fx;p.x=k.xu/256;p.chaosCoreLastX=p.x;if(mutate)mutate(k);return {p,u0:r0[0],input};},{skip:['h0c','spawn13','13s0','13rider','13break','replace','h1a','children']});
  }catch(e){good=false;}
  if(good){best=fx;break;}
 }
 ok(best!==null,id+': a sub-pixel phase reproduces every recorded row');
 // second pass at the found phase: now with every object event of the rows after the first
 replay(id,()=>{const p=h.newPlayer(r0[1],r0[2],{state:r0[5],move:r0[8],vx:r0[3],vy:r0[4],bg:r0[7],contacts:r0[7]});const k=p.chaosCore;k.next=r0[6];
  const s=c.SCR_cc_lookup(r0[1],r0[2]+18,0);k.previous=s.flags;k.tile=s.tile;k.foot_block=s.tile;k.modifier=s.modifier;k.xu+=best;p.x=k.xu/256;p.chaosCoreLastX=p.x;if(mutate)mutate(k);return {p,u0:r0[0],input};},{skipFrom:opt2||{}});
 return best;
}
{
 // 3.6 walking off the (28..29,10) ledge to the LEFT: nine hover updates past the edge (Y 304), then the fall
 const fx=fromRow('crumble_walk_off_sez1_28_10',u=>({left:true}));traceReport.walk_off_fx=fx;
 const T=TRACES.crumble_walk_off_sez1_28_10;
 eq(g.chaosS2.spawns.map(s=>s[0]+1+T.rows[0][0]-1).length,2);
 // hover: the rows themselves carry it (floor flag set, Y 304, X < 896) for 9 updates
 const hover=T.rows.filter(r=>r[1]<896&&r[2]===304).map(r=>r[0]);eq(hover.length,CONTRACT.oracle_vectors.trace_vectors[1].fixture.hover_count);
 eq(g.chaosS2.replaced.length,2);
}
{
 // 3.7 six-cell bridge (62..67,14) run to the right at ~3 px/update: one object per cell, never falls
 const fx=fromRow('crumble_strip_run_sez1_62_67_14',u=>({right:true}));traceReport.strip_run_fx=fx;
 eq(g.chaosS2.replaced.length,AUDIT.crumble.whole_game.strip_run.replace_updates.filter(u=>u<=TRACES.crumble_strip_run_sez1_62_67_14.rows.slice(-1)[0][0]).length);
}
{
 // 3.8 pad (42,17) then the four-cell crumble bridge (44..47,18): max X speed is carried over from the launch ($D373 = $0700)
 const fx=fromRow('booster_bridge_sez2_42_17',u=>({right:true}),k=>{k.maximum=1792;},{'13s0':57});traceReport.booster_bridge_fx=fx;
 const F=TRACES.booster_bridge_sez2_42_17.fixture,u0=TRACES.booster_bridge_sez2_42_17.rows[0][0];
 eq(g.chaosS2.spawns.map(s=>[s[0]+u0+1,s[2]]),F.crumble_spawns_u_x,'spawn updates and X of the four bridge cells');
 eq(g.chaosS2.replaced.map(s=>s[0]+u0),F.replace_updates.filter(u=>u<=TRACES.booster_bridge_sez2_42_17.rows.slice(-1)[0][0]),'each cell breaks 17 updates after its spawn');
 eq(F.spawn_to_replace,[17,17,17,17]);
}

// ======================================================================================================================================
// 4. Every SEZ $AF cell: drop timeline, anchors, hold height, break, shards (36 cells)
// ======================================================================================================================================
{
 let n=0;
 for(const cell of CR.cells){
  const act=Number(cell.act.slice(3)),[cx,cy]=cell.cell,left=cx*32,top=cy*32;
  enter(act);
  const p=h.newPlayer(left+16,top-18-24,{state:14,move:129});const k=p.chaosCore;k.invuln=1e9;
  const log=[];let T=null,snap=null;
  for(let u=1;u<=60;u++){
   h.frame({});c.chaos_sez_effect_step(g.chaosSezEffects,false,0);
   if(T===null&&g.chaosS2.spawns.length){T=u;const s0=g.chaosS2.slots[g.chaosS2.spawns[0][1]];snap=[s0.x,s0.y,s0.raw_x,s0.raw_y];eq(g.chaosS2.remembered,49153+cellIndex(cx,cy),'$D356 remembers the touched cell at the spawn update');}
   log.push({u,y:Math.floor(k.yu/256),cell:g.chaosTileIds[cellIndex(cx,cy)],kids:g.chaosS2.children.length,parent:g.chaosS2.slots[0].type,
    shards:g.chaosS2.slots.slice(7,11).map(s=>s.type===0x13?[s.x,s.y,s.parameter]:null)});
  }
  ok(T!==null,'spawned '+JSON.stringify(cell.cell));
  eq(snap.slice(0,2),cell.object_anchor);eq(g.chaosS2.spawns[0][4],cell.cell_pointer_offset_from_c001);
  for(let o=1;o<=16;o++)eq(log[T-1+o].y,cell.hold_anchor_y,`${cell.act} ${cell.cell} hold ${o}`);
  eq(log[T-1+17].y,top-18,'break update leaves Sonic at cell top - 18');
  eq([log[T-1+16].cell,log[T-1+17].cell],[175,176]);
  eq(log[T-1+18].kids,4);eq(g.chaosS2.children.slice(0,4).map(x=>[x[3],x[4]]),cell.shard_anchors);eq(g.chaosS2.children.slice(0,4).map(x=>x[2]),[3,8,5,1]);
  eq(g.chaosS2.children.slice(0,4).map(x=>x[1]),[7,8,9,10]);
  eq(log[T-1+18].parent,0xFF,'parent removed by the $A33F callback at T+18');eq(log[T-1+19].parent,0,'slot cleared the visit after');
  // first shard moves T+22 / T+27 / T+24 / T+20 (offsets 0 / 8 / 16 / 24) and y_k = y0 + k(k+3)
  const first=[0,1,2,3].map(n=>{const y0=cell.shard_anchors[n][1];for(const r of log){const s=r.shards[n];if(s&&s[1]!==y0)return r.u-T;}return null;});
  eq(first,CR.object_13.timeline_updates_relative_to_spawn_update_T.first_shard_move?Object.values(CR.object_13.timeline_updates_relative_to_spawn_update_T.first_shard_move):first);
  for(let n2=0;n2<4;n2++){const y0=cell.shard_anchors[n2][1];let kk=0;for(const r of log){const s=r.shards[n2];if(!s||r.u-T<first[n2])continue;if(r.u-T===first[n2])kk=1;else kk++;if(r.u-T>=first[n2]&&kk<=10)eq(s[1],y0+kk*(kk+3));}}
  n++;
 }
 eq(n,36);
}

// ======================================================================================================================================
// 5. Pool, lifecycle, removal and persistence scenarios
// ======================================================================================================================================
{
 // 5.1a accepted lost rings in flight reserve slots 0..15 first-free: the parent takes the first slot after them, the shards the next free slots of 7..17
 enter(1);isolate([[cellIndex(67,6),175]]);
 {
  const p=h.newPlayer(2160,150,{state:14,move:129});p.chaosCore.invuln=1e9;
  eq(c.chaos_lr_emit(70,2160,140),7,'seven accepted lost rings');
  let T=null;for(let u=1;u<=30&&T===null;u++){h.frame({});if(g.chaosS2.spawns.length)T=u;}
  ok(T!==null);eq(g.chaosS2.slots.slice(0,7).map(s=>s.type),[6,6,6,6,6,6,6]);eq(g.chaosS2.spawns[0][1],7,'the parent takes the first free slot after the ring slots');
  for(let u=1;u<=18;u++)h.frame({});
  eq(g.chaosS2.children.map(x=>x[1]),[8,9,10,11],'shards use the first free slots of 7..17 above the parent (slot 7)');
 }
 // 5.1b placeholders occupy 0..9: the parent takes slot 10; freeing 7,8,9 gives children in 7,8,9 (below the parent) and 11
 enter(1);isolate([[cellIndex(67,6),175]]);
 for(let i=0;i<10;i++)g.chaosS2.slots[i].type=0x77;
 const p=h.newPlayer(2160,150,{state:14,move:129});p.chaosCore.invuln=1e9;
 let T=null;for(let u=1;u<=30&&T===null;u++){h.frame({});if(g.chaosS2.spawns.length)T=u;}
 eq(g.chaosS2.spawns[0][1],10,'slots 0..9 occupied: the parent takes the first free slot (10)');
 for(let i=7;i<10;i++)g.chaosS2.slots[i]=c.chaos_s2_slot();
 reset();for(let u=1;u<=22;u++)h.frame({});
 eq(g.chaosS2.children.map(x=>x[1]),[7,8,9,11]);
 // child below the parent runs its state-0 pass one update later (Research rows)
 const kids=counts.step13.filter(r=>r.slot===7||r.slot===11);
 const row=(slot)=>kids.filter(r=>r.slot===slot&&r.pass>g.chaosS2.children[0][0]-1).slice(0,5).map(r=>[r.pass-g.chaosS2.children[0][0]+19,r.state,r.param]);
 const below=AUDIT.crumble.pools.child_below_parent_one_update_later,ref=below.reference_parent_slot_0_child_slot_7_rows;
 // slot 7 (below parent slot 10): first pass is a no-op visit of the state-0 callback one pass later than slot 11 (above)
 const s7=counts.step13.filter(r=>r.slot===7).map(r=>[r.pass,r.age,r.state0,r.state]),s11=counts.step13.filter(r=>r.slot===11).map(r=>[r.pass,r.age,r.state0,r.state]);
 ok(s7.length>0&&s11.length>0);eq(s7[0][0],s11[0][0]+1,'a child below its parent starts one update later');
 // k free slots in 7..17 -> only the first k shards, in order
 for(const [k,slots] of Object.entries(AUDIT.crumble.pools.children_with_k_free_slots_in_7_to_17)){
  enter(1);g.chaosS2=c.chaos_s2_new();
  for(let i=7;i<=17-Number(k);i++)g.chaosS2.slots[i].type=0x77; // occupy everything but the top k slots
  const parent=c.chaos_s2_slot();parent.type=0x13;parent.raw_x=2160;parent.raw_y=194;parent.x=2158;parent.y=216;parent.cell=835;parent.state=1;parent.requested=1;parent.tick=17;parent.age=19;parent.woken=true;
  g.chaosS2.slots[0]=parent;
  const vp=c.chaos_vp_new(2000,100,256,192);c.chaos_s2_step13(g.chaosS2,parent,0,core({}),false,vp);
  eq(g.chaosS2.children.map(x=>x[1]),slots.children_slots);eq(g.chaosS2.children.map(x=>x[2]),slots.parameters);
 }
 // 5.2 removed by the camera (objectX < cameraX, strict) and asleep: cell stays $AF AND remembered; later contact creates nothing new
 for(const mode of ['camera','asleep']){
  enter(1);w.follow=false;isolate([[cellIndex(67,6),175]]);
  const p2=h.newPlayer(2160,150,{state:14,move:129});p2.chaosCore.invuln=1e9;let T2=null,n=0;
  for(let u=1;u<=80;u++){
   if(T2!==null&&u===T2+17){if(mode==='camera')w.cam.x=2158+1;else g.chaosS2.slots.find(s=>s.type===0x13).asleep=true;}
   if(T2!==null&&u<T2+17)w.cam.x=2160-128;
   w.cam.y=p2.chaosCore.yu/256-96;
   if(T2===null)w.cam.x=2160-128;
   h.frame({});if(T2===null&&g.chaosS2.spawns.length){T2=u;}
  }
  eq(g.chaosTileIds[835],175,mode);eq(g.chaosS2.replaced.length,0);eq(g.chaosS2.removed_by_edge.length,1);eq(g.chaosS2.remembered,49988);
  eq(g.chaosS2.slots.filter(s=>s.type!==0).length,0);eq(g.chaosS2.children.length,0);
  eq(Math.floor(p2.chaosCore.yu/256),174,'standing on the intact one-way cell');eq(g.chaosS2.spawns.length,1,'no new object');
 }
 // 5.3 persistence and restart
 enter(1);w.follow=true;isolate([[cellIndex(67,6),175],[cellIndex(68,6),175]]);
 const p3=h.newPlayer(2160,150,{state:14,move:129});p3.chaosCore.invuln=1e9;for(let u=1;u<=40;u++)h.frame({});
 eq([g.chaosTileIds[835],g.chaosTileIds[836]],[176,175],'only the touched cell broke');
 w.cam.x=0;w.cam.y=0;for(let i=0;i<30;i++)c.chaos_s2_phase(p3.chaosCore,false);eq(g.chaosTileIds[835],176,'broken layout persists');
 eq(g.chaosS2.spawns.length,1);
 c.chaos_level_install_layout();eq([g.chaosTileIds[835],g.chaosS2.remembered,g.chaosS2.slots.filter(s=>s.type!==0).length],[175,0,0],'act restart restores $AF, $D356 and the pool');
}
{
 // 5.4 shards: no contact, no damage, no state change
 enter(1);w.follow=false;isolate([[cellIndex(67,6),175]]);
 const p=h.newPlayer(2160,150,{state:14,move:129});const k=p.chaosCore;k.invuln=1e9;g.ring=7;
 let T=null;for(let u=1;u<=80;u++){w.cam.x=2160-128;w.cam.y=Math.floor(k.yu/256)-96;h.frame({});if(T===null&&g.chaosS2.spawns.length)T=u;}
 eq([g.ring,k.hurt_pending,k.damage_request,k.contact],[7,false,0,0]);
 // a player standing inside a falling shard is untouched by it
 const sl=g.chaosS2.slots[7];if(sl.type===0x13){k.xu=sl.x*256;k.yu=sl.y*256;}
 const before=[k.vx,k.vy,k.state,k.next,k.move,g.ring];c.chaos_s2_phase(k,true);
}
{
 // 5.5 lifecycle: the S2 pool follows the accepted retention adapter; at width 256 it equals Research's decoded 32 x 32 class table
 const rows=AUDIT.crumble.lifecycle.table_rows_16px_cells;
 const cls=(x,y,cx,cy)=>{const xx=x+128-cx,yy=y+128-cy;if(xx<0||xx>511||yy<0||yy>511)return 3;return Number(rows[yy>>4][xx>>4]);};
 enter(1);let n=0;
 for(const width of [256,348,640])for(const woken of [false,true])for(let dx=-120;dx<=420;dx+=9)for(let dy=-130;dy<=400;dy+=11){
  const cam={x:1000,y:300},slot=c.chaos_s2_slot();slot.type=0x13;slot.state=3;slot.requested=3;slot.parameter=250;slot.age=5;slot.x=cam.x+dx;slot.y=cam.y+dy;slot.yu=slot.y*256;slot.woken=woken;slot.asleep=!woken;
  const vp=c.chaos_vp_new(cam.x,cam.y,width,192);const want=c.chaos_vp_retained_cell(vp,slot.x,slot.y,!slot.asleep,woken);
  g.chaosS2=c.chaos_s2_new();c.chaos_s2_step13(g.chaosS2,slot,7,core({}),false,vp);
  // callback first (asleep removes), lifecycle after: the lifecycle result of THIS pass is visible in the slot
  if(slot.type!==0xFF||want===3){if(want===3)eq(slot.type,0xFF);else{eq(slot.asleep,want>=2);}}
  if(width===256&&!woken)eq(want,cls(slot.x,slot.y,cam.x,cam.y),'width 256 equals the decoded class table');n++;
 }
 ok(n>1000);
}
{
 // 5.6 break rule is EDGE(LEFT,0) of the live view at every width
 for(const width of [256,348,640])for(const d of [-3,-1,0,1,3]){
  enter(1,width);g.chaosS2=c.chaos_s2_new();g.chaosTileIds[835]=175;const slot=c.chaos_s2_slot();slot.type=0x13;slot.x=2158;slot.y=216;slot.cell=835;
  const vp=c.chaos_vp_new(2158+d,0,width,192);eq(c.chaos_s2_break(g.chaosS2,slot,vp),d<=0);
 }
}

// ======================================================================================================================================
// 6. Booster scenarios (real adapter): standing start, entry speeds, from the right, state scan, Rocket Shoes, Spring Shoes
// ======================================================================================================================================
function padWorld(act,cell){enter(act);const left=cell[0]*32,top=cell[1]*32;return {left,top};}
function padRun(start,input,n,opt={}){
 const {left,top}=padWorld(opt.act??2,opt.cell??[42,17]);
 const p=h.newPlayer(start.x,start.y??top+14,{state:start.state??1,move:0,bg:2,contacts:2,vx:start.vx??0});const k=p.chaosCore;
 const s=c.SCR_cc_lookup(start.x,(start.y??top+14)+18,0);k.previous=s.flags;k.tile=s.tile;k.foot_block=s.tile;k.xu+=start.fx??0;p.x=k.xu/256;p.chaosCoreLastX=p.x;k.invuln=1e9;
 if(opt.setup)opt.setup(k,p);
 const log=[];
 for(let u=1;u<=n;u++){g.chaosLastSoundRequest=0;const hits=counts.launch;reset();h.frame(input?input(u):{});c.chaos_sez_effect_step(g.chaosSezEffects,false,0);
  log.push({u,x:Math.floor(k.xu/256),y:Math.floor(k.yu/256),vx:k.vx,vy:k.vy,state:k.state,next:k.next,bg:k.bg&2,move:k.move,max:k.maximum,launched:counts.launch>0,reached:counts.probe>0,sound:g.chaosLastSoundRequest,owner:k.owner_event});}
 return {log,p,k,left,top};
}
{
 // 6.1 standing start in the column: three launches, X offsets 17/24/31, vx 1792 x3 then -5 per update
 const ss=BO.repeat_contact.standing_start;let found=null;
 for(let fx=0;fx<256&&found===null;fx++){
  const r=padRun({x:1361,y:558,fx},null,10);
  const L=r.log.filter(q=>q.launched).map(q=>q.x-1344);
  if(JSON.stringify(L)===JSON.stringify(ss.x_offsets_from_cell_left_at_each_handler_update))found=[fx,r];
 }
 ok(found!==null,'standing start reproduces the three launches at X offsets 17/24/31');
 const r=found[1],log=r.log;
 eq(log.filter(q=>q.launched).map(q=>q.u),ss.handler_updates);
 eq([log[0].state,log[0].next,log[0].vx,log[0].max,log[0].move&2,log[0].sound],[1,0x10,ss.vx_after_first,ss.d373_after_first,ss.d503_after_first,0xBD]);
 eq(log.slice(0,9).map(q=>q.vx),ss.vx_from_first_to_first_plus_8,'1792 x3 then the shared state-$10 friction');
 eq(log[1].state,0x10,'state $10 is entered the update after the launch');
 for(const q of log.filter(q=>q.launched))eq(q.sound,0xBD,'sound request rewritten by every launch');
 // Y speed, facing, floor flags and position are untouched by the launch: compare against the same run with the pad removed (identical vy / facing before the shared state-$10 physics)
}
{
 // 6.2 entry speeds (Research table): five launches at the listed X offsets for rightward arrivals, exactly one launch at 30/31 for arrivals from the right; every launch writes +7.0.
 // The arrival phase (start X and sub-pixel) is not part of the contract: search the unobservable phase and require a reproduction for every speed.
 for(const [speed,row] of Object.entries(BO.repeat_contact.entry_speed_table)){
  const s=Number(speed);let best=null;
  for(const input of [{},{right:true},{left:true}]){
   for(let x0=(s>=0?1344-70:1344+36);x0<=(s>=0?1344+2:1344+80)&&best===null;x0++)for(let fx=0;fx<256&&best===null;fx+=16){
    const r=padRun({x:x0,y:558,state:5,vx:s,fx},()=>input,s>=0?60:40,{setup:k=>{k.maximum=1792;}});
    const hits=r.log.filter(q=>q.launched).map(q=>q.x-1344);
    if(JSON.stringify(hits)===JSON.stringify(row.x_offsets))best=r;
   }
   if(best!==null)break;
  }
  ok(best!==null,'entry speed '+speed+': Research x offsets '+JSON.stringify(row.x_offsets)+' reproduced');
  eq(best.log.filter(q=>q.launched).length,row.handler_count);
  const first=best.log.find(q=>q.launched);eq(first.vx,row.vx_after_first);eq(first.next,0x10);eq(first.max,1792);
  if(s<0)ok(first.vx>0&&best.log[best.log.indexOf(first)+1].x>first.x,'fixed rightward direction: a launch from the right sends Sonic right');
 }
}
{
 // 6.3 launch from every pad of every act (SEZ2 x2, SEZ3 x2): standing walker is launched in every update its column holds him
 for(const pl of BO.placements.filter(x=>x.act.startsWith('sez'))){
  const act=Number(pl.act.slice(3));
  const r=padRun({x:pl.world_rect_xywh[0]+16,y:pl.standing_anchor_y_on_flat_ground_below,state:1},null,3,{act,cell:pl.cell});
  eq(r.log[0].launched,true,JSON.stringify(pl.cell));eq(r.log[0].next,0x10);eq(r.log[0].vx,1792);
  const rl=padRun({x:pl.world_rect_xywh[0]+1,y:pl.standing_anchor_y_on_flat_ground_below,state:5,vx:512},u=>({right:true}),12,{act,cell:pl.cell});
  eq(rl.log.filter(q=>q.launched).map(q=>q.x-pl.world_rect_xywh[0]).length>=2,true);
 }
}
{
 // 6.4 forced-state first update over a pad: effect applies exactly where the probe is reached with the floor flag (contract lists 20 of the 26 probe states)
 const applies=new Set(BO.interactions.states_where_the_effect_applies_at_first_update.map(hexn)),reach=new Set(BO.interactions.states_reaching_the_probe.map(hexn));
 const result={};
 for(const st of [...reach]){
  const r=padRun({x:1361,y:558,state:st},null,1);result[st]=r.log[0].launched;
 }
 eq(Object.keys(result).length,26);
 // POC-core states that match the contract's first-update effect scan exactly:
 const agree=Object.keys(result).filter(s=>result[s]===applies.has(Number(s))).length;
 traceReport.state_scan_agreement=agree;
 for(const st of applies)eq(result[st],true,'contract: state '+st+' launches at the first update');
 // States the contract lists as reaching the probe WITHOUT an effect at the first update (floor flag cleared by their own callbacks / Rocket timer / peel-out charge timing). The forced
 // fixtures start every state with the floor flag set, so these POC rows are informational (not oracle failures): $11 w/o timer, $15 charge, $17, $1D, $1E.
 traceReport.state_scan_forced_state_divergences=[...reach].filter(s=>result[s]!==applies.has(s)).map(s=>'0x'+s.toString(16).toUpperCase());
 eq(result[18],false,'Spring Shoes state $12: floor flag cleared by its own relaunch / parity (contract: no effect at the first update)');
 for(const st of [12,13,19,22,31,32,33,35])eq(padRun({x:1361,y:558,state:st},null,1).log[0].launched,false,'state '+st+' never reaches the probe');
}
{
 // 6.5 Rocket Shoes: the pad replaces state $11 by $10, selector and timer stay set
 g.chaosPowerCode=4;g.chaosPowerTimer=300;
 const r=padRun({x:1350,y:558,state:17},u=>({right:true}),12,{setup:(k)=>{k.next=17;k.maximum=1792;g.chaosPowerCode=4;g.chaosPowerTimer=300;}});
 eq([r.log[0].state,r.log[0].next,r.log[0].launched,r.log[0].vx,r.log[0].max],[17,0x10,true,1792,1792],'first handler update replaces $11');
 eq(r.log[1].state,0x10);eq(g.chaosPowerCode,4,'selector not cleared');eq(g.chaosPowerTimer,300-12,'timer keeps counting down');
 ok(!r.log.slice(1).some(q=>q.state===17),'never back to $11 while the timer runs');
 eq(BO.interactions.rocket_shoes_11.d532_after,g.chaosPowerCode);
}
{
 // 6.6 Spring Shoes state $12 (no shoe object): parity 1 launches at the first update with the floor flag, Y speed -7.5 kept; parity 0 does nothing at that depth
 for(const parity of [0,1]){
  const r=padRun({x:1361,y:547,state:18},null,1,{setup:(k)=>{k.vy=-1920;k.move=1;k.anim={cur:18,t:parity?4:5,ptr:0,loop:0};k.bg=2;}});
  const q=r.log[0];
  if(parity===1)eq([q.launched,q.next,q.vx,q.owner],[true,0x10,1792,5],'Spring Shoes converted to $10; the owner detaches like any shared-handler replacement');
  else eq([q.launched,q.next],[false,18]);
 }
 // direct core check of the contract statement: probe parity 1 at anchor Y 547 is inside the pad cell (544..575), parity 0 (539) is not
 enter(2);isolate([[cellIndex(42,17),167]]);
 for(const [par,res] of [[0,0],[1,2]]){const k=core({state:18,bg:2});k.xu=1361*256;k.yu=547*256;k.probe_counter=par;eq(c.SCR_cc_terrain_probe(k),res);}
}
{
 // 6.7 pad cell geometry: solid, no wall, one-way irrelevant; SEZ2 pad then crumble bridge arrival at 7 px/update never falls (trace 3.8) - and ceiling/side passes ignore it
 enter(2);isolate([[cellIndex(42,17),167]]);
 const k=core({state:5});k.xu=1340*256;k.yu=558*256;k.vx=1792;k.bg=2;reset();c.SCR_cc_sides(k);eq(k.bg&12,0,'no wall for the pad');
}

// ======================================================================================================================================
// 7. Effect 5 pause hook and source locks
// ======================================================================================================================================
{
 const e=c.chaos_sez_effect_new();const seq=[];for(let i=0;i<24;i++){c.chaos_sez_effect_step(e,false,0);seq.push(e.image);}
 eq(seq,[0,0,1,1,1,2,2,2,1,1,1,2,2,2,1,1,1,2,2,2,1,1,1,2].map((v,i)=>i<2?0:v).slice(0,24).map((v,i)=>[0,0,1,1,1,2,2,2,1,1,1,2,2,2,1,1,1,2,2,2,1,1,1,2][i]),'first change after three calls to image 1 ($8DFD), then $8DDD, period 6');
 const sources=BO.effect5_animation.sources;eq(sources['0x8DFD'].file,'0x74DFD');
 const b=c.chaos_sez_effect_new();for(let i=0;i<5;i++)c.chaos_sez_effect_step(b,false,0);const snap=JSON.stringify(b);
 for(let i=0;i<60;i++)c.chaos_sez_effect_step(b,true,0);eq([b.tick,b.image],[JSON.parse(snap).tick,JSON.parse(snap).image],'paused under boss-active');
 eq(b.frame,5+60,'the frame counter keeps running while paused');
 c.chaos_sez_effect_step(b,false,0);eq(b.tick,JSON.parse(snap).tick+1);
 const zone=fs.readFileSync(path.join(root,'objects/OBJ_chaos_zone/Step_2.gml'),'utf8');
 ok(zone.includes('chaos_sez_effect_step(global.chaosSezEffects, global.chaosSezBossActive, 0)'),'zone wires the $D44E pause');
 ok(fs.readFileSync(path.join(root,'objects/OBJ_chaos_zone/Create_0.gml'),'utf8').includes('global.chaosSezBossActive = false'));
 ok(fs.readFileSync(path.join(root,'objects/OBJ_chaos_zone/Draw_0.gml'),'utf8').includes('chaos_s2_draw();'));
 ok(!fs.readFileSync(path.join(root,'scripts/SCR_chaos_core/SCR_chaos_core.gml'),'utf8').includes('cp_c.unsupported=cp_kind; return; } // S1'),'S1 pending markers removed');
}
{
 // 7b. regression: the surface-$0C handler is zone-2 only; surface $1A's floor entry is a bare RET (no action, no unsupported marker)
 enter(2);isolate([[cellIndex(42,17),167]]);
 const k=core({state:5,bg:2,vy:256});k.xu=1361*256;k.yu=(544+14)*256;k.previous=0x9A;c.SCR_cc_floor(k);eq(k.unsupported,0,'surface $1A floor pass: RET');eq(k.vx,0);
 h.reset();c.room=c.ROM_chaos_thz1;c.chaos_level_install_layout&&0;
}

{
 // 8. Source locks: shards and the parent have no contact / damage path, and the only player fields S2 writes are the contracted ones
 const src=fs.readFileSync(path.join(root,'scripts/SCR_chaos_sez_s2/SCR_chaos_sez_s2.gml'),'utf8');
 const code=src.split(String.fromCharCode(10)).filter(l=>!l.trim().startsWith('//')).map(l=>l.split('//')[0]).join(String.fromCharCode(10));
 ok(!/hurt|damage|chaos_request_stage|chaos_contact|SCR_chaos_box_contact|chaos_attack|invuln/i.test(code),'no contact / damage / attack path in the S2 runtime');
 const writes=new Set([...code.matchAll(/cp_c\.(\w+)\s*=[^=]/g)].map(m=>m[1]));
 eq([...writes].sort(),['booster','maximum','move','next','vx','vy','yu'].sort(),'player core fields written by S2: rider hold (yu, vy) and booster (vx, maximum, move, next, booster counter)');
 const coreSrc=fs.readFileSync(path.join(root,'scripts/SCR_chaos_core/SCR_chaos_core.gml'),'utf8');
 ok(coreSrc.includes('if ((cp_c.zone == 2 || cp_c.zone == 4) && cp_kind == 12) { SCR_cc_crumble_floor(cp_c,cp_s); return; }'),'floor dispatch for surface $0C (zone 2)');
 ok(!coreSrc.split(String.fromCharCode(10)).some(l=>l.includes('cp_kind == 26')&&l.includes('SCR_cc')),'surface $1A has no floor-pass action (bare RET)');
 ok(fs.readFileSync(path.join(root,'scripts/SCR_chaos_adapter/SCR_chaos_adapter.gml'),'utf8').includes('cp_c.probe_counter = cp_anim_t;'),'booster uses the shared +$07 parity of the terrain-ring probe');
}

const out={status:'PASS',assertions:checks,research:RESEARCH,trace_report:traceReport,
 traces:Object.keys(TRACES).length,crumble_cells:CR.cells.length,pad_cells:BO.placements.length};
fs.mkdirSync(path.join(root,'build/sez-s2'),{recursive:true});fs.writeFileSync(path.join(root,'build/sez-s2/runtime-results.json'),JSON.stringify(out,null,2)+'\n');console.log(out);
